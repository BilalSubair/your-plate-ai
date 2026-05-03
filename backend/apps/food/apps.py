from django.apps import AppConfig
import threading

class FoodConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.food'
