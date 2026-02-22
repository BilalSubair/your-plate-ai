from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('entries', views.FoodEntryViewSet, basename='food-entry')
router.register('favorites', views.FavoriteFoodViewSet, basename='favorite-food')

urlpatterns = [
    path('', include(router.urls)),
]
