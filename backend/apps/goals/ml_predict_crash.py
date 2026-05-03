import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from django.conf import settings
from functools import lru_cache

MODEL_FILE = os.path.join(os.path.dirname(__file__), 'crash_model.pkl')

def train_and_save_model():
    # Synthetic dataset for (sleep_hours, steps/active_cal, carbs_consumed, protein_consumed)
    # Target: Minutes until a severe crash/craving hits after the meal. A higher number means stable energy.
    X = []
    y = []
    
    # Generate 1000 synthetic realistic samples
    for _ in range(1000):
        sleep = np.random.uniform(3.0, 10.0)
        active_cal = np.random.uniform(0, 1000)
        carbs = np.random.uniform(10, 200)
        protein = np.random.uniform(5, 100)
        
        # Base stability is 300 minutes (5 hours)
        stability_minutes = 300
        
        # Lack of sleep causes earlier crashes
        if sleep < 6.0:
            stability_minutes -= (6.0 - sleep) * 30
            
        # High carbs relative to protein causes massive crashes (sugar spike)
        carb_protein_ratio = carbs / (protein + 1)
        if carb_protein_ratio > 3.0:
            stability_minutes -= min(150, (carb_protein_ratio - 3.0) * 20)
            
        # Good protein stabilizes blood sugar
        if protein > 30:
            stability_minutes += 45
            
        # Activity after high carbs helps, but lots of baseline activity + low sleep = exhausted
        if active_cal > 500 and sleep < 5.0:
            stability_minutes -= 40
            
        # Add some random noise
        stability_minutes += np.random.normal(0, 15)
        
        # Clamp between 30 mins and 400 mins
        stability_minutes = max(30, min(400, stability_minutes))
        
        X.append([sleep, active_cal, carbs, protein])
        y.append(stability_minutes)

    model = RandomForestRegressor(n_estimators=50, max_depth=5, random_state=42)
    model.fit(X, y)
    
    # Save the model
    joblib.dump(model, MODEL_FILE)
    return model

@lru_cache(maxsize=1)
def load_model():
    if not os.path.exists(MODEL_FILE):
        return train_and_save_model()
    return joblib.load(MODEL_FILE)

def predict_crash_time(sleep_hours, active_cal, carbs, protein):
    model = load_model()
    # Ensure inputs are numbers
    sleep = float(sleep_hours or 7.0)
    act = float(active_cal or 0)
    c = float(carbs or 0)
    p = float(protein or 0)
    
    # Predict minutes until crash
    pred_minutes = model.predict([[sleep, act, c, p]])[0]
    return int(pred_minutes)
