from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('cravings', views.CravingViewSet, basename='craving')

urlpatterns = [
    path('nutrition/', views.NutritionGoalView.as_view(), name='nutrition-goal'),
    path('tracking/today/', views.DailyTrackingView.as_view(), name='daily-tracking-today'),
    path('tracking/history/', views.DailyTrackingHistoryView.as_view(), name='daily-tracking-history'),
    path('insight/generate/', views.AIGoalsInsightView.as_view(), name='ai-goals-insight'),
    path('plan/generate/', views.GenerateMealPlanView.as_view(), name='generate-meal-plan'),
    path('cravings_bank/', views.CravingsBankView.as_view(), name='cravings-bank'),
    path('predict-crash/', views.PredictCrashView.as_view(), name='predict-crash'),
    path('', include(router.urls)),
]
