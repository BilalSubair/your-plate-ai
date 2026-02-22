from rest_framework import viewsets, generics
from rest_framework.response import Response
from .models import NutritionGoal, CravingEntry
from .serializers import NutritionGoalSerializer, CravingEntrySerializer


class NutritionGoalView(generics.RetrieveUpdateAPIView):
    serializer_class = NutritionGoalSerializer

    def get_object(self):
        obj, _ = NutritionGoal.objects.get_or_create(user=self.request.user)
        return obj

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)


class CravingViewSet(viewsets.ModelViewSet):
    serializer_class = CravingEntrySerializer
    search_fields = ['craving']

    def get_queryset(self):
        return CravingEntry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
