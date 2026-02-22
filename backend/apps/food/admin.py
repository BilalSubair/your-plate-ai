from django.contrib import admin
from .models import FoodEntry, FavoriteFood

@admin.register(FoodEntry)
class FoodEntryAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'calories', 'meal_type', 'logged_at')
    list_filter = ('meal_type', 'logged_at')
    search_fields = ('name',)

@admin.register(FavoriteFood)
class FavoriteFoodAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'calories')
