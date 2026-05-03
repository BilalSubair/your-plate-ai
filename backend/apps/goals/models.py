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

    GOAL_CHOICES = [
        ('weight_loss', 'Weight Loss'),
        ('weight_gain', 'Weight Gain'),
        ('recomposition', 'Body Recomposition'),
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
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female')], null=True, blank=True)
    primary_goal = models.CharField(max_length=20, choices=GOAL_CHOICES, null=True, blank=True)
    profile_picture = models.TextField(null=True, blank=True)
    maintenance_calories = models.FloatField(null=True, blank=True)
    last_model_trained = models.DateTimeField(null=True, blank=True)
    daily_cheat_allowance = models.IntegerField(default=0)
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
        indexes = [
            models.Index(fields=['user', '-logged_at']),
        ]

    def __str__(self):
        return f"{self.craving} ({self.intensity}/10)"

class DailyTracking(models.Model):
    MOOD_CHOICES = [
        ('great', 'Great'),
        ('good', 'Good'),
        ('okay', 'Okay'),
        ('low', 'Low'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_tracking')
    date = models.DateField(auto_now_add=True)
    water_ml = models.IntegerField(default=0)
    steps = models.IntegerField(default=0)
    sleep_hours = models.FloatField(default=0.0)
    mood = models.CharField(max_length=10, choices=MOOD_CHOICES, null=True, blank=True)
    active_calories = models.IntegerField(default=0)
    weight_kg = models.FloatField(null=True, blank=True)
    cheat_calories_consumed = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Tracking for {self.user.username} on {self.date}"

class DailyLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ml_daily_logs')
    date = models.DateField()
    calories = models.FloatField()
    weight = models.FloatField()
    steps = models.IntegerField(null=True, blank=True)
    workout_minutes = models.IntegerField(null=True, blank=True)
    protein_grams = models.FloatField(null=True, blank=True)
    sleep_hours = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"DailyLog for {self.user.username} on {self.date} ({self.weight}kg, {self.calories}kcal)"
