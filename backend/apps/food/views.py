import requests
import re
import sys
import os
import json
import logging
import urllib.parse
import traceback
from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings

from .models import FoodEntry, FavoriteFood
from .serializers import FoodEntrySerializer, FavoriteFoodSerializer
from .ai_utils import decode_and_validate_image, classify_with_groq, get_groq_client
from .ocr_utils import extract_text_with_paddle, clean_ingredients_text

# Vision imports removed in favor of OpenAI LLM strategy

logger = logging.getLogger(__name__)


class FoodEntryViewSet(viewsets.ModelViewSet):
    serializer_class = FoodEntrySerializer
    filterset_fields = ['meal_type']
    search_fields = ['name']
    ordering_fields = ['logged_at', 'calories']

    def get_queryset(self):
        qs = FoodEntry.objects.select_related('user').filter(user=self.request.user)
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(logged_at__date=date)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        days = int(request.query_params.get('days', 7))
        since = timezone.now() - timedelta(days=days)
        summary = (
            FoodEntry.objects
            .filter(user=request.user, logged_at__gte=since)
            .annotate(date=TruncDate('logged_at'))
            .values('date')
            .annotate(
                total_calories=Sum('calories'),
                total_protein=Sum('protein'),
                total_carbs=Sum('carbs'),
                total_fat=Sum('fat'),
                entry_count=Count('id'),
            )
            .order_by('date')
        )
        return Response(summary)

    @action(detail=False, methods=['get'])
    def today(self, request):
        entries = FoodEntry.objects.select_related('user').filter(
            user=request.user,
            logged_at__date=timezone.now().date()
        )
        serializer = self.get_serializer(entries, many=True)
        return Response(serializer.data)


class FavoriteFoodViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteFoodSerializer
    search_fields = ['name']

    def get_queryset(self):
        return FavoriteFood.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class EdamamSearchView(APIView):
    def get(self, request):
        query = request.query_params.get('q')
        if not query:
            return Response({"error": "Query parameter 'q' is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        app_id = settings.EDAMAM_APP_ID
        app_key = settings.EDAMAM_APP_KEY
        
        if not app_id or not app_key:
            return Response({"error": "Edamam credentials not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        search_params = {
            "app_id": app_id,
            "app_key": app_key,
            "ingr": query,
            "nutrition-type": "logging"
        }
        
        cache_key = f"edamam_food_{urllib.parse.urlencode(search_params)}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        try:
            search_response = requests.get(
                "https://api.edamam.com/api/food-database/v2/parser",
                params=search_params,
                timeout=10
            )
            
            if search_response.status_code == 429:
                return Response({"error": "edamam limit exhausted"}, status=status.HTTP_429_TOO_MANY_REQUESTS)
                
            if not search_response.ok:
                return Response({"error": f"Edamam API error: {search_response.status_code}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            data = search_response.json()
            hints = data.get('hints', [])
            
            results = []
            for hint in hints:
                food = hint.get('food', {})
                nutrients = food.get('nutrients', {})
                
                results.append({
                    "id": food.get('foodId'),
                    "name": food.get('label'),
                    "brand": food.get('brand', 'Generic'),
                    "description": food.get('category', 'Food'),
                    "calories": round(nutrients.get('ENERC_KCAL', 0)),
                    "protein": round(nutrients.get('PROCNT', 0), 1),
                    "carbs": round(nutrients.get('CHOCDF', 0), 1),
                    "fat": round(nutrients.get('FAT', 0), 1),
                })
                
            cache.set(cache_key, results, timeout=60 * 60 * 24) # 24 hour cache
            return Response(results)
        except Exception as e:
            traceback.print_exc()
            return Response({"error": "Edamam search failed: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EdamamRecipeSearchView(APIView):
    """
    Proxies requests to the Edamam Recipe Search API v2.
    """
    def get(self, request):
        query = request.query_params.get('q')
        if not query:
            return Response({"error": "Query parameter 'q' is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        app_id = os.getenv('EDAMAM_RECIPE_APP_ID')
        app_key = os.getenv('EDAMAM_RECIPE_APP_KEY')
        
        if not app_id or not app_key:
            # Try falling back to the generic ID if specific one is missing
            app_id = os.getenv('EDAMAM_APP_ID')
            app_key = os.getenv('EDAMAM_APP_KEY')
            
        if not app_id or not app_key:
            return Response({"error": "Edamam Recipe credentials not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        search_params = {
            "type": "public",
            "q": query,
            "app_id": app_id,
            "app_key": app_key,
        }
        
        # Pass through other filters if provided
        for param in ['cuisineType', 'mealType', 'dishType', 'calories', 'time', 'diet', 'health']:
            val = request.query_params.get(param)
            if val:
                search_params[param] = val

        cache_key = f"edamam_recipe_{urllib.parse.urlencode(search_params)}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        try:
            response = requests.get(
                "https://api.edamam.com/api/recipes/v2",
                params=search_params,
                timeout=15
            )
            
            if response.status_code == 429:
                return Response({"error": "edamam limit exhausted"}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            if not response.ok:
                return Response({"error": f"Edamam API error: {response.status_code}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            data = response.json()
            hits = data.get('hits', [])
            
            results = []
            for hit in hits:
                recipe = hit.get('recipe', {})
                nutrients = recipe.get('totalNutrients', {})
                
                # Edamam v2 structure mapping
                results.append({
                    "id": recipe.get('uri', '').split('_')[-1], # Extract unique ID from URI
                    "name": recipe.get('label'),
                    "image": recipe.get('image'),
                    "url": recipe.get('url'),
                    "calories": round(recipe.get('calories', 0)),
                    "protein": round(nutrients.get('PROCNT', {}).get('quantity', 0), 1),
                    "carbs": round(nutrients.get('CHOCDF', {}).get('quantity', 0), 1),
                    "fat": round(nutrients.get('FAT', {}).get('quantity', 0), 1),
                    "time": f"{recipe.get('totalTime', 0)} min" if recipe.get('totalTime') else "Unknown",
                    "difficulty": "Medium", # Edamam doesn't provide difficulty, defaulting to Medium
                    "tags": recipe.get('dietLabels', []) + recipe.get('healthLabels', [])[:3],
                    "ingredientsList": recipe.get('ingredientLines', []),
                    "instructions": recipe.get('instructionLines', []), # Some plans have this, others don't
                    "yield": recipe.get('yield', 1)
                })
                
            cache.set(cache_key, results, timeout=60 * 60 * 24) # 24 hour cache
            return Response(results)
        except Exception as e:
            traceback.print_exc()
            return Response({"error": "Edamam recipe search failed: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EdamamMealPlannerView(APIView):
    """
    Proxies requests to the Edamam Meal Planner API v1.
    """
    def post(self, request):
        app_id = settings.EDAMAM_PLANNER_APP_ID
        app_key = settings.EDAMAM_PLANNER_APP_KEY
        account_id = settings.EDAMAM_PLANNER_ACCOUNT_ID
        
        if not all([app_id, app_key, account_id]):
            return Response({"error": "Edamam Meal Planner credentials not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Edamam Meal Planner requires a user identifier and a plan object
        # We'll use the user's username as the identifier
        user_id = request.user.username
        
        try:
            # First, check if there's an existing plan or create a new one
            # For simplicity, we'll implement a basic request to get/post a plan
            # Note: Meal Planner API is quite complex, this is a proxy for the 'selection' phase
            
            response = requests.post(
                f"https://api.edamam.com/api/meal-planner/v1/{app_id}/select",
                params={"app_key": app_key, "user": user_id},
                json=request.data,
                timeout=20
            )
            
            if response.status_code == 429:
                return Response({"error": "Too many requests to Edamam, try later"}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            if not response.ok:
                return Response({"error": f"Edamam API error: {response.status_code}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            return Response(response.json())
        except Exception as e:
            traceback.print_exc()
            return Response({"error": "Edamam meal planner failed: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalyzeIngredientsView(APIView):
    def post(self, request):
        image_base64 = request.data.get('imageBase64')
        
        if not image_base64:
            return Response({"error": "Missing imageBase64 in request body."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 1. Decode and Validate image
            image_bytes = decode_and_validate_image(image_base64)

            # Debug: Save the uploaded image to disk for inspection
            with open("/Users/bilalsubair/.gemini/antigravity/brain/85c4b79c-2b0a-482c-a962-30fc1f880132/latest_user_upload.png", "wb") as f:
                f.write(image_bytes)
            
            # 2. Extract Text with Local PaddleOCR
            raw_text = extract_text_with_paddle(image_bytes)
            
            logger.warning("=== PADDLE OCR RAW EXTRACT ===")
            logger.warning(repr(raw_text))
            
            if not raw_text.strip():
                return Response({"error": "No text detected in the image. Please try a clearer photo."}, status=status.HTTP_400_BAD_REQUEST)
                
            # 3. Clean Text
            cleaned_text = clean_ingredients_text(raw_text)
            
            # 4. Classify with Groq (Strict JSON output)
            ingredients_data = classify_with_groq(cleaned_text)
            
            # Return payload formatted for frontend usage
            return Response({
                "success": True,
                **ingredients_data
            })
            
        except ValidationError as ve:
            return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Return 500 for OCR failures or unexpected server errors
            traceback.print_exc()
            return Response({"error": "Failed to analyze ingredients. " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BudgetMealsView(APIView):
    """
    Finds affordable healthy meals nearby matching the user's constraints using Groq LLaMA models.
    """
    def post(self, request):
        budget = request.data.get('budget', 15.0)
        location = request.data.get('location', 'USA')
        max_calories = request.data.get('max_calories', 800)
        min_protein = request.data.get('min_protein', 20)
        dietary = request.data.get('dietary_preferences', 'None')
        
        client = get_groq_client()
        if not client:
            return Response({"error": "AI features not configured (GROQ_API_KEY missing)."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        system_prompt = f"""You are a top-tier nutrition assistant. Find 5 real-world restaurant/fast-casual menu items near {location} under ₹{budget} INR. 
Max calories: {max_calories}. Min protein: {min_protein}g. Dietary preferences: {dietary}.
Output ONLY a raw JSON object with a single key "meals" mapped to an array of objects.
Each object must have exactly these keys:
"restaurant" (string), "item" (string), "price" (number, float), "calories" (number), "protein" (number), "carbs" (number), "fat" (number), "description" (string brief)
"""
        try:
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Return the JSON object now."}
                ],
                temperature=0.2,
                max_tokens=1024,
                response_format={"type": "json_object"}
            )
            
            result_json = completion.choices[0].message.content.strip()
            
            # Extract JSON block if surrounded by markdown ticks
            json_match = re.search(r'\{.*\}', result_json, re.DOTALL)
            if json_match:
                result_json = json_match.group(0)
                
            data = json.loads(result_json)
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            traceback.print_exc()
            return Response({"error": "Failed to generate budget meals. " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class AnalyzePlateView(APIView):
    """
    Accepts an uploaded image of a plate, runs it through the YOLOv8 
    detection and MiDaS pipeline, estimates portion size and returns 
    structured nutritional JSON.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        image_base64 = request.data.get("imageBase64")
        if not image_base64:
            return Response({"error": "No image data provided"}, status=400)
            
        try:
            from .ai_utils import (
                decode_and_validate_image, 
                resize_image_if_needed,
                analyze_plate_with_groq_vision
            )
            
            # 1. Decode and Resize for performance 
            image_bytes = decode_and_validate_image(image_base64)
            optimized_base64 = resize_image_if_needed(image_bytes)
            
            # 2. Use Groq Vision (Primary Engine)
            # This is faster and avoids OpenAI quota issues during the showcase
            result = analyze_plate_with_groq_vision(optimized_base64)
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Plate Analysis Error: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GroceryOptimizerView(APIView):
    """
    Generates a highly optimized grocery list using AI as a constraint solver.
    """
    def post(self, request):
        budget = request.data.get('budget', 50.0)
        daily_calories = request.data.get('daily_calories', 2000)
        protein = request.data.get('protein', 150)
        carbs = request.data.get('carbs', 200)
        fat = request.data.get('fat', 65)
        dietary = request.data.get('dietary_preferences', 'None')
        
        client = get_groq_client()
        if not client:
            return Response({"error": "AI features not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        system_prompt = f"""You are an advanced Linear Programming Optimizer AI. 
The user wants to buy groceries for the next 7 days.
Constraints for the ENTIRE week (7 days):
- Total Weekly Budget maximum: ₹{budget} INR
- Daily Goal (average): {daily_calories} kcal, {protein}g Protein, {carbs}g Carbs, {fat}g Fat.
- Dietary preferences: {dietary}

CRITICAL: The grocery recommendations MUST be heavily biased towards Indian and South Indian cuisines first (e.g., Dals, Paneer, Rice, Roti ingredients, local spices and vegetables), and then Western staples for any remaining items.
IMPORTANT PRICING RULE: You MUST use exactly accurate current Indian market prices for 2024/2026. For example: 1kg Rice = ₹50-₹80, 1kg Toor Dal = ₹150-₹200, 1kg Chicken = ₹250-₹350, 1L Milk = ₹60-₹75, 1 dozen Eggs = ₹70-₹100, 1kg Paneer = ₹350-₹450, 1kg Onions/Tomatoes = ₹30-₹60, 1L Coconut/Olive Oil = ₹300-₹450, 1L Sunflower Oil = ₹120-₹180, 1kg Mutton = ₹800-₹1000. Do NOT hallucinate inflated Western prices converted to INR or artificially low prices for expensive items.

Find mathematically sound overlaps to hit those macros while staying strictly UNDER the ₹{budget} INR budget.
Output MUST be a valid JSON object matching this schema EXACTLY:
{{
  "total_estimated_cost": 0.0,
  "items": [
    {{"name": "Item Description (e.g. 2 kg Toor Dal)", "category": "Produce|Protein|Pantry|Dairy|Other", "estimated_price": 0.0, "macro_focus": "Carbs|Protein|Fat|Micros"}}
  ],
  "strategy_summary": "A 2-sentence explanation of the bulk-buying strategy used."
}}
"""
        try:
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Return the JSON object now."}
                ],
                temperature=0.1,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )
            
            result_json = completion.choices[0].message.content.strip()
            
            json_match = re.search(r'\{.*\}', result_json, re.DOTALL)
            if json_match:
                result_json = json_match.group(0)
                
            data = json.loads(result_json)
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            traceback.print_exc()
            return Response({"error": "Failed to generate optimized grocery list. " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MenuSniperView(APIView):
    """
    Accepts an uploaded image of a restaurant menu, extracts text via OCR fast-path,
    calculates the user's remaining daily macros, and suggests the top 3 meals
    to order that fit perfectly within their remaining goals.
    """
    def post(self, request):
        image_base64 = request.data.get('imageBase64')
        if not image_base64:
            return Response({"error": "Missing imageBase64 in request body."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from .ocr_utils import extract_text_with_paddle

            # 1. Decode Image 
            image_bytes = decode_and_validate_image(image_base64)
            
            # 2. Extract Text via Fast-Path local OCR
            raw_text = extract_text_with_paddle(image_bytes)
            if not raw_text.strip():
                return Response({"error": "No text detected in the menu image."}, status=status.HTTP_400_BAD_REQUEST)
                
            # 3. Calculate Remaining Macros
            from apps.goals.models import NutritionGoal
            from django.utils import timezone
            from django.db.models import Sum

            goal = NutritionGoal.objects.filter(user=request.user).first()
            if not goal:
                goal = NutritionGoal(daily_calories=2000, protein_grams=150, carbs_grams=200, fat_grams=65)

            today = timezone.now().date()
            consumed = FoodEntry.objects.filter(user=request.user, logged_at__date=today).aggregate(
                c=Sum('calories'), p=Sum('protein'), cb=Sum('carbs'), f=Sum('fat')
            )
            
            rem_cal = max(0, float(goal.daily_calories) - float(consumed['c'] or 0))
            rem_pro = max(0, float(goal.protein_grams) - float(consumed['p'] or 0))
            rem_carbs = max(0, float(goal.carbs_grams) - float(consumed['cb'] or 0))
            rem_fat = max(0, float(goal.fat_grams) - float(consumed['f'] or 0))
            
            # 4. Prompt Groq with the Extracted Menu Text
            client = get_groq_client()
            if not client:
                return Response({"error": "AI features not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            system_prompt = f"""You are an elite nutrition AI Menu Sniper.
The user is at a restaurant and has uploaded a picture of the menu. High-speed OCR has extracted the menu text.
Due to the nature of fast OCR, the text might be completely scattered, severely misspelled, or prices might be merged with food names. 
As an ultimate expert, intelligently reconstruct the true dish names from the scattered tokens first.

CRITICAL RULES:
1. You MUST ALWAYS return exactly 3 recommendations, no matter how strict their remaining macros are.
2. If their remaining calories are too low (e.g., they have 0 kcal left), simply pick the 3 absolute lightest/healthiest items on the entire menu (like salads, plain chicken, or clear soups) so they still have the safest options to choose from. Do NOT return an empty list.
3. Ignore weird symbols or artifacts in the OCR text.

User's REMAINING MACROS FOR TODAY:
- Calories left: {rem_cal} kcal
- Protein left: {rem_pro}g
- Carbs left: {rem_carbs}g
- Fat left: {rem_fat}g

OCR EXTRACTED MENU TEXT:
{raw_text}

Output ONLY a raw JSON object matching this schema EXACTLY:
{{
  "remaining_macros": {{"calories": {rem_cal}, "protein": {rem_pro}, "carbs": {rem_carbs}, "fat": {rem_fat}}},
  "recommendations": [
    {{
       "item_name": "Exact item from menu",
       "estimated_calories": 0,
       "estimated_protein": 0,
       "estimated_carbs": 0,
       "estimated_fat": 0,
       "price_estimate": "Formatted strictly in Indian Rupees if found, e.g. '₹250' or '₹400'",
       "reason": "1 sentence why this fits their exact remaining macros."
    }}
  ]
}}
"""
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Analyze the text and give me the JSON object."}
                ],
                temperature=0.2,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )
            
            result_json = completion.choices[0].message.content.strip()
            json_match = re.search(r'\{.*\}', result_json, re.DOTALL)
            if json_match:
                result_json = json_match.group(0)
                
            data = json.loads(result_json)
            return Response(data, status=status.HTTP_200_OK)

        except ValidationError as ve:
            return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            traceback.print_exc()
            return Response({"error": "Failed to analyze menu. " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class QuickNutritionView(APIView):
    """
    Simple endpoint for the UI to recalculate nutrition 
    after a user manually edits a food name or gram weight.
    """
    def post(self, request):
        query = request.data.get("query")
        if not query:
            return Response({"error": "Missing query"}, status=400)
            
        app_id = settings.EDAMAM_NUTRITION_APP_ID
        app_key = settings.EDAMAM_NUTRITION_APP_KEY
        
        try:
            resp = requests.get(
                "https://api.edamam.com/api/nutrition-data",
                params={"app_id": app_id, "app_key": app_key, "ingr": query},
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                cal = data.get("calories", 0)
                nutrients = data.get("totalNutrients", {})
                
                # Extract grams if possible from query (e.g. "150g Dosa")
                import re
                gram_match = re.search(r'(\d+)g', query)
                grams = int(gram_match.group(1)) if gram_match else 100

                def get_val(key):
                    val = nutrients.get(key)
                    if isinstance(val, dict):
                        return val.get("quantity", 0)
                    return 0

                nutrition = {
                    "calories": round(cal) if cal > 0 else round(grams * 1.5),
                    "protein": round(get_val("PROCNT") or 0, 1),
                    "fat": round(get_val("FAT") or 0, 1),
                    "carbs": round(get_val("CHOCDF") or 0, 1)
                }
                return Response(nutrition)
            return Response({"error": "Edamam lookup failed"}, status=500)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class AICoachView(APIView):
    """
    Multimodal Fitness & Nutrition Chatbot using Groq.
    Supports text only OR text + image analysis.
    """
    def post(self, request):
        message = request.data.get("message")
        image_base64 = request.data.get("imageBase64")
        
        if not message:
            return Response({"error": "Missing message"}, status=status.HTTP_400_BAD_REQUEST)
            
        client = get_groq_client()
        if not client:
            return Response({"error": "AI Coach not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        system_prompt = (
            "You are NutriGuide AI Coach, an elite, world-class fitness and nutrition expert. "
            "Your personality is encouraging, scientific, and highly professional. "
            "You provide actionable, data-driven advice. When an image is provided, analyze it specifically "
            "(e.g., estimating calories in food, form-checking exercises, or identifying equipment). "
            "Keep responses concise, formatted with markdown (bolding, lists), and engaging."
        )
        
        # Prepare content for Llama 3.2 Vision
        user_content = [{"type": "text", "text": message}]
        if image_base64:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": image_base64}
            })
        else:
            # Fallback to simple string for text-only to ensure max compatibility
            user_content = message
            
        
        try:
            # Use Llama 4 Scout (17B) for the ultimate AI Coach Vision experience
            target_model = "meta-llama/llama-4-scout-17b-16e-instruct" if image_base64 else "llama-3.3-70b-versatile"
            
            completion = client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.3,
                max_tokens=1024,
                timeout=20.0
            )
            
            response_text = completion.choices[0].message.content
            return Response({"response": response_text})
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

