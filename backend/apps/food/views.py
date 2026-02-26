from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from datetime import timedelta
import requests
import re
from rest_framework.exceptions import ValidationError
from .models import FoodEntry, FavoriteFood
from .serializers import FoodEntrySerializer, FavoriteFoodSerializer
from .ai_utils import decode_and_validate_image, extract_text_with_vision, clean_ingredients_text, classify_with_groq


class FoodEntryViewSet(viewsets.ModelViewSet):
    serializer_class = FoodEntrySerializer
    filterset_fields = ['meal_type']
    search_fields = ['name']
    ordering_fields = ['logged_at', 'calories']

    def get_queryset(self):
        qs = FoodEntry.objects.filter(user=self.request.user)
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
        entries = FoodEntry.objects.filter(
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

class FatSecretSearchView(APIView):
    def get(self, request):
        query = request.query_params.get('q')
        if not query:
            return Response({"error": "Query parameter 'q' is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        token = cache.get('fatsecret_token')
        if not token:
            client_id = settings.FATSECRET_CLIENT_ID
            client_secret = settings.FATSECRET_CLIENT_SECRET
            
            if not client_id or not client_secret:
                return Response({"error": "FatSecret credentials not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            auth_response = requests.post(
                "https://oauth.fatsecret.com/connect/token",
                data={"grant_type": "client_credentials", "scope": "basic"},
                auth=(client_id, client_secret)
            )
            if not auth_response.ok:
                return Response({"error": "FatSecret Auth failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            token_data = auth_response.json()
            token = token_data.get('access_token')
            expires_in = token_data.get('expires_in', 3600)
            cache.set('fatsecret_token', token, timeout=expires_in - 60)
            
        search_params = {
            "method": "foods.search",
            "search_expression": query,
            "format": "json",
            "max_results": 10
        }
        
        search_response = requests.get(
            "https://platform.fatsecret.com/rest/server.api",
            params=search_params,
            headers={"Authorization": f"Bearer {token}"}
        )
        if not search_response.ok:
            return Response({"error": "FatSecret Search failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        data = search_response.json()
        foods_data = data.get('foods', {}).get('food', [])
        if isinstance(foods_data, dict):
            foods_data = [foods_data]
            
        results = []
        for f in foods_data:
            desc = f.get('food_description', '')
            cal_match = re.search(r'Calories:\s*([\d\.]+)kcal', desc)
            fat_match = re.search(r'Fat:\s*([\d\.]+)g', desc)
            carb_match = re.search(r'Carbs:\s*([\d\.]+)g', desc)
            prot_match = re.search(r'Protein:\s*([\d\.]+)g', desc)
            
            calories = float(cal_match.group(1)) if cal_match else 0
            fat = float(fat_match.group(1)) if fat_match else 0
            carbs = float(carb_match.group(1)) if carb_match else 0
            protein = float(prot_match.group(1)) if prot_match else 0
            
            results.append({
                "id": f.get('food_id'),
                "name": f.get('food_name'),
                "brand": f.get('brand_name', ''),
                "description": desc,
                "calories": calories,
                "protein": protein,
                "carbs": carbs,
                "fat": fat,
            })
            
        return Response(results)

class AnalyzeIngredientsView(APIView):
    def post(self, request):
        image_base64 = request.data.get('imageBase64')
        
        if not image_base64:
            return Response({"error": "Missing imageBase64 in request body."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 1. Decode and Validate image
            image_bytes = decode_and_validate_image(image_base64)
            
            # 2. Extract Text with Google Vision
            raw_text = extract_text_with_vision(image_bytes)
            
            if not raw_text.strip():
                return Response({"error": "No text detected in the image. Please try a clearer photo."}, status=status.HTTP_400_BAD_REQUEST)
                
            # 3. Clean Text
            cleaned_text = clean_ingredients_text(raw_text)
            
            # 4. Classify with Groq
            ingredients = classify_with_groq(cleaned_text)
            
            return Response(ingredients)
            
        except ValidationError as ve:
            return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Return 500 for external API failures or unexpected server errors
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
