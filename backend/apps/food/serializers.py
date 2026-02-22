from rest_framework import serializers
from .models import FoodEntry, FavoriteFood


class FoodEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodEntry
        fields = '__all__'
        read_only_fields = ('user', 'logged_at')


class FavoriteFoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavoriteFood
        fields = '__all__'
        read_only_fields = ('user', 'created_at')


class DailySummarySerializer(serializers.Serializer):
    date = serializers.DateField()
    total_calories = serializers.FloatField()
    total_protein = serializers.FloatField()
    total_carbs = serializers.FloatField()
    total_fat = serializers.FloatField()
    entry_count = serializers.IntegerField()
