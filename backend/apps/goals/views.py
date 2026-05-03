import json
import traceback
from datetime import timedelta
from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db.models import Sum

from apps.food.ai_utils import get_groq_client
from apps.food.models import FoodEntry
from services.metabolism_model import compute_maintenance_calories
from .models import NutritionGoal, CravingEntry, DailyTracking
from .serializers import NutritionGoalSerializer, CravingEntrySerializer, DailyTrackingSerializer
from .ml_predict_crash import predict_crash_time


class NutritionGoalView(generics.RetrieveUpdateAPIView):
    serializer_class = NutritionGoalSerializer

    def get_object(self):
        obj, _ = NutritionGoal.objects.get_or_create(user=self.request.user)
        return obj

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)


class CravingViewSet(viewsets.ModelViewSet):
    serializer_class = CravingEntrySerializer
    search_fields = ['craving']

    def get_queryset(self):
        return CravingEntry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DailyTrackingView(generics.RetrieveUpdateAPIView):
    serializer_class = DailyTrackingSerializer

    def get_object(self):
        today = timezone.now().date()
        obj, _ = DailyTracking.objects.get_or_create(user=self.request.user, date=today)
        return obj

    def perform_update(self, serializer):
        instance = serializer.save(user=self.request.user)
        # If weight is updated, sync it to the user's permanent NutritionGoal
        if instance.weight_kg is not None:
            goal, _ = NutritionGoal.objects.get_or_create(user=self.request.user)
            goal.current_weight = instance.weight_kg
            goal.save(update_fields=['current_weight'])

class AIGoalsInsightView(APIView):
    def post(self, request):
        consumed = request.data.get('consumed', {})
        goals = request.data.get('goals', {})
        tracking = request.data.get('tracking', {})
        
        client = get_groq_client()
        if not client:
            return Response({"error": "AI features not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        system_prompt = f"""You are an enthusiastic AI nutrition coach. 
Analyze the user's progress today:
- Consumed: {json.dumps(consumed)}
- Goals: {json.dumps(goals)}
- Tracking: {json.dumps(tracking)}

Write 1 short encouraging sentence (max 100 characters) analyzing their state.
Provide a second sentence with a specific, actionable tip.
Include a relevant, highly-specific recipe search query (e.g. "protein shake" or "high fiber snack").

Return EXACTLY a JSON object with this schema:
{{
  "insight": "Your encouraging analysis and actionable tip...",
  "suggestion_query": "short specific action/search term"
}}"""

        try:
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Return the JSON object now."}
                ],
                temperature=0.7,
                max_tokens=200,
                response_format={"type": "json_object"}
            )
            
            result = completion.choices[0].message.content
            return Response(json.loads(result), status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class CalculateMaintenanceView(APIView):
    def post(self, request):
        result = compute_maintenance_calories(request.user)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)


class DailyTrackingHistoryView(APIView):
    def get(self, request):
        days = int(request.GET.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        history = DailyTracking.objects.filter(
            user=request.user, 
            date__gte=start_date
        ).order_by('date')
        
        serializer = DailyTrackingSerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GenerateMealPlanView(APIView):
    """
    Generates a personalized Smart Meal Plan using Groq AI based on the user's
    nutrition goals, tracking context (what they've eaten today), and dietary preferences.
    """
    def post(self, request):
        dietary_preferences = request.data.get('dietary_preferences', 'None')
        
        # 1. Gather User Context
        try:
            goal = NutritionGoal.objects.get(user=request.user)
        except NutritionGoal.DoesNotExist:
            return Response({"error": "Nutrition goals not set"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            today = timezone.now().date()
            tracking = DailyTracking.objects.get(user=request.user, date=today)
        except DailyTracking.DoesNotExist:
            tracking = None
            
        # 2. Compute "Remaining" Macros
        totals = FoodEntry.objects.filter(user=request.user, logged_at__date=today).aggregate(
            t_cal=Sum('calories'),
            t_pro=Sum('protein'),
            t_carb=Sum('carbs'),
            t_fat=Sum('fat')
        )
        
        c_consumed = totals['t_cal'] or 0
        p_consumed = totals['t_pro'] or 0
        carbs_consumed = totals['t_carb'] or 0
        f_consumed = totals['t_fat'] or 0
        
        c_remaining = max(100, goal.daily_calories - c_consumed)
        p_remaining = max(10, goal.protein_grams - p_consumed)
        carbs_remaining = max(10, goal.carbs_grams - carbs_consumed)
        f_remaining = max(5, goal.fat_grams - f_consumed)

        # 3. Construct the AI Prompt
        client = get_groq_client()
        if not client:
            return Response({"error": "AI features not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        system_prompt = f"""You are a world-class AI nutritionist. The user needs a custom daily meal plan.
        
User Profile:
- Primary Goal: {goal.get_primary_goal_display() or 'Maintain Health'}
- Dietary Preferences / Restrictions: {dietary_preferences}

Calculated Remaining Targets for the rest of today:
- Calories: {c_remaining} kcal
- Protein: {p_remaining}g
- Carbohydrates: {carbs_remaining}g
- Fat: {f_remaining}g

Please generate a structured and delicious meal plan (Breakfast, Lunch, Dinner, Snacks) that STRICTLY adheres to these remaining nutritional targets. 
CRITICAL: You MUST prioritize South Indian and Indian foods cuisine in your recommendations whenever possible.
If the user has already eaten most of their calories, suggest extremely light or zero-calorie meals.

You must output ONLY a raw JSON object with this exact schema:
{{
  "plan": [
    {{
      "meal_type": "Breakfast" | "Lunch" | "Dinner" | "Snack",
      "name": "Creative meal name",
      "description": "Short appetizing description.",
      "recipe": "Step by step preparation instructions.",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0
    }}
  ],
  "summary": "1 sentence encouraging summary of how this fits their goals."
}}"""

        try:
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Generate the JSON meal plan."}
                ],
                temperature=0.7,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )
            
            result = completion.choices[0].message.content
            return Response(json.loads(result), status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Failed to generate meal plan: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CravingsBankView(APIView):
    def get(self, request):
        goal, _ = NutritionGoal.objects.get_or_create(user=request.user)
        
        days = 30
        start_date = timezone.now().date() - timedelta(days=days)
        
        trackings = DailyTracking.objects.filter(
            user=request.user, 
            date__gte=start_date
        )
        
        active_days = trackings.count()
        if active_days == 0:
            active_days = 1
            
            
        total_allowance = active_days * goal.daily_cheat_allowance
        
        total_consumed = trackings.aggregate(total=Sum('cheat_calories_consumed'))['total'] or 0
        
        banked_calories = total_allowance - total_consumed
        
        return Response({
            "daily_allowance": goal.daily_cheat_allowance,
            "banked_calories": banked_calories,
            "total_consumed_30d": total_consumed
        }, status=status.HTTP_200_OK)

    def post(self, request):
        calories = int(request.data.get('calories', 0))
        if calories <= 0:
            return Response({"error": "Invalid calories"}, status=status.HTTP_400_BAD_REQUEST)
            
        today = timezone.now().date()
        tracking, _ = DailyTracking.objects.get_or_create(user=request.user, date=today)
        tracking.cheat_calories_consumed += calories
        tracking.save(update_fields=['cheat_calories_consumed'])
        
        name = request.data.get('name', 'Cheat Meal')
        CravingEntry.objects.create(
            user=request.user,
            craving=name,
            intensity=10,
            resisted=False
        )
        
        return Response({"status": "success", "consumed": calories}, status=status.HTTP_200_OK)



class PredictCrashView(APIView):
    def get(self, request):
        today = timezone.now().date()
        try:
            tracking = DailyTracking.objects.get(user=request.user, date=today)
            sleep = tracking.sleep_hours
            active_cal = tracking.active_calories
        except DailyTracking.DoesNotExist:
            sleep = 7.0
            active_cal = 0
            
        totals = FoodEntry.objects.filter(user=request.user, logged_at__date=today).aggregate(
            t_cal=Sum('calories'),
            t_pro=Sum('protein'),
            t_carb=Sum('carbs')
        )
        
        carbs = totals['t_carb'] or 0
        protein = totals['t_pro'] or 0
        
        minutes_to_crash = predict_crash_time(sleep, active_cal, carbs, protein)
        
        if minutes_to_crash < 120 and carbs > 40:
            crash_time = timezone.now() + timedelta(minutes=minutes_to_crash)
            time_str = crash_time.strftime("%I:%M %p")
            msg = f"Energy crash predicted around {time_str} based on your high-carb intake and sleep patterns. Recommendation: Eat a handful of almonds or an apple right now to stabilize your blood sugar."
            return Response({"risk": "high", "message": msg, "minutes": minutes_to_crash}, status=status.HTTP_200_OK)
        
        return Response({"risk": "low", "message": "Your energy levels look stable right now.", "minutes": minutes_to_crash}, status=status.HTTP_200_OK)
