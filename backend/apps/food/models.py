from django.db import models
from django.conf import settings


class FoodEntry(models.Model):
    MEAL_CHOICES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='food_entries')
    name = models.CharField(max_length=255)
    calories = models.FloatField()
    protein = models.FloatField(default=0)
    carbs = models.FloatField(default=0)
    fat = models.FloatField(default=0)
    fiber = models.FloatField(default=0)
    sugar = models.FloatField(default=0)
    sodium = models.FloatField(default=0)
    serving_size = models.CharField(max_length=100, blank=True)
    servings = models.FloatField(default=1)
    meal_type = models.CharField(max_length=20, choices=MEAL_CHOICES, default='snack')
    barcode = models.CharField(max_length=50, blank=True)
    image = models.ImageField(upload_to='food_images/', blank=True, null=True)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-logged_at']
        verbose_name_plural = 'Food entries'

    def __str__(self):
        return f"{self.name} - {self.calories}kcal ({self.user.username})"


class FavoriteFood(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorite_foods')
    name = models.CharField(max_length=255)
    calories = models.FloatField()
    protein = models.FloatField(default=0)
    carbs = models.FloatField(default=0)
    fat = models.FloatField(default=0)
    barcode = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'name')

    def __str__(self):
        return f"{self.name} (fav by {self.user.username})"
