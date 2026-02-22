from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Supplement, SupplementReview
from .serializers import SupplementSerializer, SupplementReviewSerializer


class SupplementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Supplement.objects.all()
    serializer_class = SupplementSerializer
    search_fields = ['name', 'category', 'description']
    filterset_fields = ['category', 'evidence_level']
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def review(self, request, pk=None):
        supplement = self.get_object()
        serializer = SupplementReviewSerializer(data={**request.data, 'supplement': supplement.id})
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def reviews(self, request, pk=None):
        supplement = self.get_object()
        reviews = supplement.reviews.all()
        serializer = SupplementReviewSerializer(reviews, many=True)
        return Response(serializer.data)
