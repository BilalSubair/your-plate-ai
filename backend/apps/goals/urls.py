from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('cravings', views.CravingViewSet, basename='craving')

urlpatterns = [
    path('nutrition/', views.NutritionGoalView.as_view(), name='nutrition-goal'),
    path('', include(router.urls)),
]
