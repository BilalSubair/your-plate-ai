from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from services.metabolism_model import compute_maintenance_calories

User = get_user_model()

class Command(BaseCommand):
    help = 'Executes the Scikit-learn multiple linear regression model across all eligible users to compute personalized maintenance calories.'

    def handle(self, *args, **kwargs):
        users = User.objects.all()
        success_count = 0
        error_count = 0
        self.stdout.write(self.style.NOTICE(f"Initiating Adaptive ML Maintenance Engine for {users.count()} users..."))

        for user in users:
            result = compute_maintenance_calories(user)
            if result.get("status") == "success":
                self.stdout.write(self.style.SUCCESS(f"User {user.username}: {result['maintenance_calories']} kcal (n={result['data_points_used']})"))
                success_count += 1
            else:
                self.stdout.write(self.style.WARNING(f"User {user.username}: {result.get('message', 'Unknown Error')}"))
                error_count += 1

        self.stdout.write(self.style.SUCCESS(f"ML Pipeline Completed. Solved {success_count} regressions, {error_count} skipped/failed."))
