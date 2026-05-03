from .detector import FoodDetector
from .segmenter import FoodSegmenter
from .depth_estimator import DepthEstimator
from .portion_estimator import PortionEstimator
from .nutrition_lookup import NutritionLookup
import cv2
import numpy as np

class VisionPipeline:
    def __init__(self):
        # Initialize the services
        # In a production environment, models should be loaded once and kept in memory
        self.detector = FoodDetector()
        self.segmenter = FoodSegmenter()
        self.depth_estimator = DepthEstimator()
        self.portion_estimator = PortionEstimator()
        self.nutrition_lookup = NutritionLookup()
        
    def analyze_plate(self, image_bytes):
        """
        Full pipeline: Takes image bytes, returns structured JSON of detected foods and macros.
        """
        # Convert bytes to cv2 image array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Invalid image provided")
            
        # 1. Segment the foods to get classes and mask indices
        # We use segmentation directly as it gives us both the bounding box (class) and the mask.
        segmented_items = self.segmenter.segment(img)
        
        # 1.5 Generate Depth Map
        # If there are items, generate a dense relative depth map of the plate
        depth_map = None
        if segmented_items:
            depth_map = self.depth_estimator.estimate_depth(img)
        
        results = []
        total_calories = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        
        for item in segmented_items:
            class_name = item["class_name"]
            mask_indices = item.get("mask_indices", None)
            
            # 2. Volumetric Portion Estimation
            # We now pass the exact pixel indices of the food mask and the depth map
            weight_grams = self.portion_estimator.get_grams(class_name, mask_indices, depth_map)
            
            # 3. Nutrition Lookup
            nutrition = self.nutrition_lookup.get_nutrition(class_name, weight_grams)
            
            results.append({
                "item": class_name,
                "confidence": round(item["confidence"], 2),
                "estimated_grams": weight_grams,
                "nutrition": nutrition
            })
            
            # Accumulate totals
            total_calories += nutrition["calories"]
            total_protein += nutrition["protein"]
            total_carbs += nutrition["carbs"]
            total_fat += nutrition["fat"]
            
        return {
            "detected_items": results,
            "total_nutrition": {
                "calories": round(total_calories),
                "protein": round(total_protein, 1),
                "carbs": round(total_carbs, 1),
                "fat": round(total_fat, 1)
            }
        }
