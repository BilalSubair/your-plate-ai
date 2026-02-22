from rest_framework import serializers
from .models import NutritionGoal, CravingEntry


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
