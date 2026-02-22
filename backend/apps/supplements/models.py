from django.db import models
from django.conf import settings


class Supplement(models.Model):
    EVIDENCE_CHOICES = [
        ('strong', 'Strong'),
        ('moderate', 'Moderate'),
        ('limited', 'Limited'),
    ]

    name = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=100)
    description = models.TextField()
    benefits = models.JSONField(default=list)
    risks = models.JSONField(default=list)
    dosage = models.CharField(max_length=255, blank=True)
    evidence_level = models.CharField(max_length=20, choices=EVIDENCE_CHOICES, default='limited')
    interactions = models.JSONField(default=list, help_text='Drug interactions')
    image = models.ImageField(upload_to='supplement_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def avg_rating(self):
        reviews = self.reviews.all()
        if not reviews:
            return 0
        return sum(r.rating for r in reviews) / len(reviews)


class SupplementReview(models.Model):
    supplement = models.ForeignKey(Supplement, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('supplement', 'user')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.supplement.name} - {self.rating}★ by {self.user.username}"
