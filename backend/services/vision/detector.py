import os
from ultralytics import YOLO

class FoodDetector:
    def __init__(self, model_path="yolov8n.pt"):
        # Ultralytics will auto-download yolov8n.pt if not present in the current directory
        self.model = YOLO(model_path)
        
    def detect(self, image_path_or_array):
        """
        Detects food items in the given image.
        Returns a list of detected objects with bounding boxes, confidence, and class names.
        """
        results = self.model(image_path_or_array)
        detected_items = []
        
        for r in results:
            boxes = r.boxes
            names = r.names
            for box in boxes:
                cls_id = int(box.cls[0])
                class_name = names[cls_id]
                confidence = float(box.conf[0])
                # Skip non-food (YOLOv8 COCO has some food items like apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake)
                # In a real app, you'd use a custom-trained model for specific dishes.
                detected_items.append({
                    "class_name": class_name,
                    "confidence": confidence,
                    "box": box.xyxy[0].tolist(),  # [x1, y1, x2, y2]
                })
                
        return detected_items
