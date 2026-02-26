from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('entries', views.FoodEntryViewSet, basename='food-entry')
router.register('favorites', views.FavoriteFoodViewSet, basename='favorite-food')

urlpatterns = [
    path('fatsecret/search/', views.FatSecretSearchView.as_view(), name='fatsecret-search'),
    path('analyze-ingredients/', views.AnalyzeIngredientsView.as_view(), name='analyze-ingredients'),
    path('', include(router.urls)),
]
