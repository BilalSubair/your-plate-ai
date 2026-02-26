from rest_framework import serializers
from .models import NutritionGoal, CravingEntry, DailyTracking


class NutritionGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionGoal
        fields = '__all__'
        read_only_fields = ('user', 'updated_at')


class CravingEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = CravingEntry
        fields = '__all__'
        read_only_fields = ('user', 'logged_at')


class DailyTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTracking
        fields = '__all__'
        read_only_fields = ('user', 'date', 'last_updated')
