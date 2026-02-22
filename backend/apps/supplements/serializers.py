from rest_framework import serializers
from .models import Supplement, SupplementReview


class SupplementReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = SupplementReview
        fields = ('id', 'supplement', 'user', 'username', 'rating', 'comment', 'created_at')
        read_only_fields = ('user', 'created_at')


class SupplementSerializer(serializers.ModelSerializer):
    reviews = SupplementReviewSerializer(many=True, read_only=True)
    avg_rating = serializers.FloatField(read_only=True)

    class Meta:
        model = Supplement
        fields = '__all__'
