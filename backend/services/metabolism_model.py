import pandas as pd
import numpy as np
from datetime import timedelta
from django.utils import timezone
from sklearn.linear_model import Ridge
from apps.goals.models import DailyLog, NutritionGoal

def compute_maintenance_calories(user):
    """
    Learns dynamic maintenance calories using a scikit-learn Multiple Linear Regression
    trained on historical user physical tracking variants.
    """
    
    # Retrieve last 30 days of data and arrange chronologically
    logs = DailyLog.objects.filter(user=user).order_by('-date')[:30]
    
    if len(logs) < 21:
        return {
            "status": "error",
            "message": f"Insufficient data ({len(logs)}/21 days). Please keep logging to build history."
        }

    # Transform into DataFrame for vectorized math operations
    df = pd.DataFrame(list(logs.values()))
    df = df.sort_values(by='date').reset_index(drop=True)

    # Compute differential: WeightChange = Weight(Day T) - Weight(Day T-1)
    df['weight_change'] = df['weight'].diff()
    
    # Prune first index which triggers NaN differential
    df = df.dropna(subset=['weight_change'])

    # Fill sparse optional fields using rolling averages
    avg_steps = df['steps'].mean() if not pd.isna(df['steps'].mean()) else 5000
    avg_workout = df['workout_minutes'].mean() if not pd.isna(df['workout_minutes'].mean()) else 0
    avg_protein = df['protein_grams'].mean() if not pd.isna(df['protein_grams'].mean()) else 50.0
    avg_sleep = df['sleep_hours'].mean() if not pd.isna(df['sleep_hours'].mean()) else 7.0

    df['steps'] = df['steps'].fillna(avg_steps)
    df['workout_minutes'] = df['workout_minutes'].fillna(avg_workout)
    df['protein_grams'] = df['protein_grams'].fillna(avg_protein)
    df['sleep_hours'] = df['sleep_hours'].fillna(avg_sleep)
    
    # Assure master independent variable constraints
    df = df.dropna(subset=['calories', 'weight'])
    
    if len(df) < 20: 
        return {"status": "error", "message": "Inconsistent data density after dropping uncomputable rows."}

    # Interquartile Range (IQR) filtering explicitly targeted at eliminating pure water weight swings tracking artifacts
    Q1 = df['weight_change'].quantile(0.25)
    Q3 = df['weight_change'].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    df = df[(df['weight_change'] >= lower_bound) & (df['weight_change'] <= upper_bound)]

    if len(df) < 15:
        return {"status": "error", "message": "IQR outlier boundaries dropped too much historic data."}

    # Bind Machine Learning mapping tensors
    X = df[['calories', 'steps', 'workout_minutes', 'protein_grams', 'sleep_hours']]
    y = df['weight_change']
    
    model = Ridge(alpha=1.0)
    model.fit(X, y)

    b0 = model.intercept_
    coefficients = model.coef_
    b1_cal = coefficients[0]
    b2_steps = coefficients[1]
    b3_work = coefficients[2]
    b4_prot = coefficients[3]
    b5_sleep = coefficients[4]

    # Reject Flat-Tensors: Biologically invalid algorithms yielding negative slopes for Calorie Injections
    if abs(b1_cal) < 1e-6 or b1_cal <= 0:
        return {
            "status": "error",
            "message": "Model generated an inverted metabolic slope due to inconsistent data logs."
        }

    # Algebraically Isolate calories when predicting WeightChange == 0
    maintenance_cals = -(b0 + b2_steps * avg_steps + b3_work * avg_workout + b4_prot * avg_protein + b5_sleep * avg_sleep) / b1_cal
    
    maintenance_cals = int(round(maintenance_cals))

    # Failsafe Bounds
    if maintenance_cals < 1200 or maintenance_cals > 5000:
        return {
            "status": "error",
            "message": f"Algorithmic synthesis ({maintenance_cals} kcal) exceeds safety protocols [1200, 5000]."
        }

    # Atomic Commit on Profile
    try:
        goal = NutritionGoal.objects.get(user=user)
        goal.maintenance_calories = maintenance_cals
        goal.last_model_trained = timezone.now()
        goal.save()
    except NutritionGoal.DoesNotExist:
        pass

    return {
        "status": "success",
        "maintenance_calories": maintenance_cals,
        "data_points_used": len(df),
        "model_type": "multiple_linear_regression"
    }
