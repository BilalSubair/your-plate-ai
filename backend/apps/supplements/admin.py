from django.contrib import admin
from .models import Supplement, SupplementReview

@admin.register(Supplement)
class SupplementAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'evidence_level', 'avg_rating')
    list_filter = ('category', 'evidence_level')
    search_fields = ('name',)

@admin.register(SupplementReview)
class SupplementReviewAdmin(admin.ModelAdmin):
    list_display = ('supplement', 'user', 'rating', 'created_at')
