from django.contrib import admin
from .models import NutritionGoal, CravingEntry

@admin.register(NutritionGoal)
class NutritionGoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'daily_calories', 'activity_level')

@admin.register(CravingEntry)
class CravingEntryAdmin(admin.ModelAdmin):
    list_display = ('craving', 'user', 'intensity', 'resisted', 'logged_at')
