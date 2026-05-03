class NutritionLookup:
    def __init__(self):
        # Mock macro database per 100g
        self.macro_db = {
            "apple": {"calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2},
            "banana": {"calories": 89, "protein": 1.1, "carbs": 23, "fat": 0.3},
            "orange": {"calories": 47, "protein": 0.9, "carbs": 12, "fat": 0.1},
            "broccoli": {"calories": 34, "protein": 2.8, "carbs": 6.6, "fat": 0.4},
            "carrot": {"calories": 41, "protein": 0.9, "carbs": 9.6, "fat": 0.2},
            "pizza": {"calories": 266, "protein": 11, "carbs": 33, "fat": 10},
            "donut": {"calories": 452, "protein": 4.9, "carbs": 51, "fat": 25},
            "cake": {"calories": 371, "protein": 5.3, "carbs": 53, "fat": 15},
            "sandwich": {"calories": 252, "protein": 12, "carbs": 32, "fat": 8},
            "hot dog": {"calories": 290, "protein": 10, "carbs": 4.2, "fat": 26},
            "rice": {"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3},
            "curry": {"calories": 150, "protein": 14, "carbs": 8, "fat": 7},
            "chapati": {"calories": 297, "protein": 10, "carbs": 46, "fat": 8},
            "default": {"calories": 100, "protein": 5, "carbs": 10, "fat": 5}
        }
        
    def get_nutrition(self, class_name, weight_grams):
        """
        Maps a food class name and weight in grams to its nutritional values.
        """
        macros = self.macro_db.get(class_name.lower(), self.macro_db["default"])
        
        multiplier = weight_grams / 100.0
        
        return {
            "calories": round(macros["calories"] * multiplier),
            "protein": round(macros["protein"] * multiplier, 1),
            "carbs": round(macros["carbs"] * multiplier, 1),
            "fat": round(macros["fat"] * multiplier, 1)
        }
