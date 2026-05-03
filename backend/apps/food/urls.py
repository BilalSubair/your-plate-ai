from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('entries', views.FoodEntryViewSet, basename='food-entry')
router.register('favorites', views.FavoriteFoodViewSet, basename='favorite-food')

urlpatterns = [
    path('search/', views.EdamamSearchView.as_view(), name='food-search'),
    path('recipes/search/', views.EdamamRecipeSearchView.as_view(), name='recipe-search'),
    path('meal-planner/', views.EdamamMealPlannerView.as_view(), name='meal-planner'),
    path('analyze-ingredients/', views.AnalyzeIngredientsView.as_view(), name='analyze-ingredients'),
    path('budget-meals/', views.BudgetMealsView.as_view(), name='budget-meals'),
    path('grocery-optimizer/', views.GroceryOptimizerView.as_view(), name='grocery-optimizer'),
    path('analyze-plate/', views.AnalyzePlateView.as_view(), name='analyze-plate'),
    path('quick-nutrition-lookup/', views.QuickNutritionView.as_view(), name='quick-nutrition-lookup'),
    path('ai-coach/', views.AICoachView.as_view(), name='ai-coach'),
    path('menu-sniper/', views.MenuSniperView.as_view(), name='menu-sniper'),
    path('', include(router.urls)),
]
