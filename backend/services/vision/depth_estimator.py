import torch
import cv2
import numpy as np

class DepthEstimator:
    def __init__(self, model_type="MiDaS_small"):
        """
        Initializes the MiDaS depth estimation model.
        model_type options: "DPT_Large", "DPT_Hybrid", "MiDaS", "MiDaS_small"
        """
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load the MiDaS model from PyTorch Hub
        self.model = torch.hub.load("intel-isl/MiDaS", model_type)
        self.model.to(self.device)
        self.model.eval()
        
        # Load the transforms
        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
        if model_type == "DPT_Large" or model_type == "DPT_Hybrid":
            self.transform = midas_transforms.dpt_transform
        else:
            self.transform = midas_transforms.small_transform
            
    def estimate_depth(self, img_array):
        """
        Estimates the relative depth map for the given BGR image array.
        Returns a 2D numpy array of the same (H, W) as the input image, 
        where higher values represent closer objects.
        """
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
        
        # Apply transforms
        input_batch = self.transform(img_rgb).to(self.device)
        
        # Predict depth
        with torch.no_grad():
            prediction = self.model(input_batch)
            
            # Resize the prediction to match the original image size
            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=img_rgb.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze()
            
        # Move to CPU and convert to numpy array
        output = prediction.cpu().numpy()
        
        # Normalize the map to 0-255 for standard processing/visualization
        # MiDaS outputs inverse depth (disparity). Higher = closer.
        depth_min = output.min()
        depth_max = output.max()
        if depth_max - depth_min > 0:
            output_normalized = (output - depth_min) / (depth_max - depth_min)
            output_normalized = (output_normalized * 255.0).astype(np.uint8)
        else:
            output_normalized = np.zeros_like(output, dtype=np.uint8)
            
        return output_normalized
