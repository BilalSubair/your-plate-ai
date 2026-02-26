from django.db import models
from django.conf import settings


class NutritionGoal(models.Model):
    ACTIVITY_CHOICES = [
        ('sedentary', 'Sedentary'),
        ('light', 'Lightly Active'),
        ('moderate', 'Moderately Active'),
        ('active', 'Very Active'),
        ('extreme', 'Extremely Active'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='nutrition_goal')
    daily_calories = models.IntegerField(default=2000)
    protein_grams = models.IntegerField(default=50)
    carbs_grams = models.IntegerField(default=250)
    fat_grams = models.IntegerField(default=65)
    fiber_grams = models.IntegerField(default=25)
    target_weight = models.FloatField(null=True, blank=True)
    current_weight = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    activity_level = models.CharField(max_length=20, choices=ACTIVITY_CHOICES, default='moderate')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Goals for {self.user.username}"


class CravingEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cravings')
    craving = models.CharField(max_length=255)
    alternative = models.CharField(max_length=255, blank=True)
    intensity = models.IntegerField(default=5, help_text='1-10 scale')
    resisted = models.BooleanField(default=False)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-logged_at']

    def __str__(self):
        return f"{self.craving} ({self.intensity}/10)"

class DailyTracking(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_tracking')
    date = models.DateField(auto_now_add=True)
    water_ml = models.IntegerField(default=0)
    steps = models.IntegerField(default=0)
    sleep_hours = models.FloatField(default=0.0)
    active_calories = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Tracking for {self.user.username} on {self.date}"
