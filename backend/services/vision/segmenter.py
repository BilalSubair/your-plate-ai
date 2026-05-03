from ultralytics import YOLO

class FoodSegmenter:
    def __init__(self, model_path="yolov8n-seg.pt"):
        # Auto-downloads yolov8n-seg.pt if not present
        self.model = YOLO(model_path)
        
    def segment(self, image_path_or_array):
        """
        Segments food items in the image.
        Returns masks and their corresponding class labels and pixel counts.
        """
        # Lower confidence and refine NMS (IoU) to allow more object detections
        results = self.model(
            image_path_or_array,
            conf=0.15,          # Lower confidence threshold (default is ~0.25)
            iou=0.45,           # IoU threshold for NMS
            retina_masks=True,  # High resolution masks
            classes=[46, 47, 48, 49, 50, 51, 52, 53, 54, 55] # Filter ONLY to food-related COCO classes
        )
        segmented_items = []
        
        for r in results:
            boxes = r.boxes
            masks = r.masks
            names = r.names
            
            if masks is not None:
                for box, mask in zip(boxes, masks):
                    cls_id = int(box.cls[0])
                    class_name = names[cls_id]
                    confidence = float(box.conf[0])
                    
                    # YOLO masks are typically low-res (e.g., 160x160)
                    # We need to reshape/resize them to the original image dimensions
                    # mask.data is a tensor of shape [1, H, W]
                    import cv2
                    import numpy as np
                    
                    # Original image shape from results
                    orig_shape = r.orig_shape # (H, W)
                    
                    # Convert mask tensor to numpy
                    mask_np = mask.data.cpu().numpy()[0]
                    
                    # Resize map to original image dimensions using nearest neighbor interpolation
                    mask_resized = cv2.resize(mask_np, (orig_shape[1], orig_shape[0]), interpolation=cv2.INTER_NEAREST)
                    
                    # Get the indices where mask is 1 (food pixels)
                    # Returns tuple of (y_indices, x_indices)
                    mask_indices = np.where(mask_resized > 0.5)
                    
                    segmented_items.append({
                        "class_name": class_name,
                        "confidence": confidence,
                        "mask_indices": mask_indices,
                        "box": box.xyxy[0].tolist(),
                    })
                    
        return segmented_items
