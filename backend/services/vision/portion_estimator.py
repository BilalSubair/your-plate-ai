import numpy as np

class PortionEstimator:
    def __init__(self, reference_diameter_cm=26.0):
        # Default standard dinner plate diameter is ~26 cm
        self.reference_diameter_cm = reference_diameter_cm
        
        # Approximate densities in g/cm^3
        self.food_densities = {
            "apple": 0.8,
            "banana": 0.9,
            "orange": 0.9,
            "broccoli": 0.4,
            "carrot": 0.6,
            "pizza": 0.7,
            "donut": 0.5,
            "cake": 0.5,
            "sandwich": 0.6,
            "hot dog": 0.8,
            "rice": 0.85,
            "curry": 1.05,
            "vegetables": 0.6,
            "chapati": 0.8,
            # Fallback
            "default": 0.8
        }
        
    def estimate_weight(self, mask_indices, depth_map):
        """
        Estimates the weight/volume of a food item by calculating a 
        volumetric integral using the MiDaS relative depth map.
        
        mask_indices: Tuple of (y_coords, x_coords) representing the mask pixels.
        depth_map: 2D numpy array (0-255) where higher values = closer.
        """
        if depth_map is None or len(mask_indices[0]) == 0:
            # Fallback to a basic pixel count ratio if no depth map is available
            pixel_area = len(mask_indices[0]) if isinstance(mask_indices, tuple) else mask_indices
            return pixel_area / 500.0
            
        # MiDaS provides inverse relative depth. Higher numbers = closer to camera.
        # We need to approximate volume. 
        # A simple model: Volume = Sum of (Base Area * Normalized Depth Height)
        # Convert depth from [0-255] to a pseudo-height ratio [0.0 - 1.0]
        mask_depths = depth_map[mask_indices]
        
        # Avoid division by zero and normalize depth to a meaningful scale.
        # We assume the lowest depth value in the whole image is the background ('table')
        background_depth = max(1, depth_map.min()) 
        
        # Calculate pseudo-volume: sum of relative heights of all pixels in the mask
        # We subtract background to isolate the object's thickness
        pseudo_heights = np.maximum(0, (mask_depths - background_depth) / 255.0)
        
        # Sum the heights to get a dense volume integral
        pseudo_volume = np.sum(pseudo_heights)
        
        # Apply a scale factor to map this pseudo-volume to approximate cm^3
        # This calibration factor (e.g., 2.5) would normally be tuned against real ground-truth weights
        calibrated_volume_cm3 = pseudo_volume * 1.8 
        
        # Ensure we don't return 0 for flat items
        return max(calibrated_volume_cm3, len(mask_indices[0]) / 800.0)
        
    def get_grams(self, class_name, mask_indices, depth_map):
        volume_cm3 = self.estimate_weight(mask_indices, depth_map)
        
        # Get density based on class name
        density = self.food_densities.get(class_name.lower(), self.food_densities["default"])
        
        weight_grams = volume_cm3 * density
        
        # Return a reasonable bounded value (e.g. at least 10g, max 1000g)
        return max(10, min(1000, round(weight_grams)))
