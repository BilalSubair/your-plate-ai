import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.goals.models import DailyLog
from datetime import timedelta
from django.utils import timezone
import random

User = get_user_model()
today = timezone.now().date()

for user in User.objects.all():
    DailyLog.objects.filter(user=user).delete()
    
    base_weight = 80.0
    for i in range(30):
        date = today - timedelta(days=29-i)
        cals = random.uniform(2000, 3200)
        surplus = cals - 2600
        weight_change = surplus / 7700.0
        if i == 15:
            weight_change += 2.0 
            
        base_weight += weight_change
        
        steps = 8000 if random.random() > 0.2 else None
        sleep = 7.5 if random.random() > 0.2 else None
        
        DailyLog.objects.create(
            user=user,
            date=date,
            calories=cals,
            weight=base_weight,
            steps=steps,
            sleep_hours=sleep,
            workout_minutes=45,
            protein_grams=150
        )
print("Populated 30 days of ML test data for ALL users.")
