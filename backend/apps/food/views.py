from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from .models import FoodEntry, FavoriteFood
from .serializers import FoodEntrySerializer, FavoriteFoodSerializer


class FoodEntryViewSet(viewsets.ModelViewSet):
    serializer_class = FoodEntrySerializer
    filterset_fields = ['meal_type']
    search_fields = ['name']
    ordering_fields = ['logged_at', 'calories']

    def get_queryset(self):
        qs = FoodEntry.objects.filter(user=self.request.user)
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(logged_at__date=date)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        days = int(request.query_params.get('days', 7))
        since = timezone.now() - timedelta(days=days)
        summary = (
            FoodEntry.objects
            .filter(user=request.user, logged_at__gte=since)
            .annotate(date=TruncDate('logged_at'))
            .values('date')
            .annotate(
                total_calories=Sum('calories'),
                total_protein=Sum('protein'),
                total_carbs=Sum('carbs'),
                total_fat=Sum('fat'),
                entry_count=Count('id'),
            )
            .order_by('date')
        )
        return Response(summary)

    @action(detail=False, methods=['get'])
    def today(self, request):
        entries = FoodEntry.objects.filter(
            user=request.user,
            logged_at__date=timezone.now().date()
        )
        serializer = self.get_serializer(entries, many=True)
        return Response(serializer.data)


class FavoriteFoodViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteFoodSerializer
    search_fields = ['name']

    def get_queryset(self):
        return FavoriteFood.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
