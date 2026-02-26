import cv2
import numpy as np
from PIL import Image
from io import BytesIO
import logging
import re

# Initialize global logger
logger = logging.getLogger(__name__)

# Lazy initialization for PaddleOCR to avoid slowing down import and only loading if used
_ocr_instance = None

def get_ocr_instance():
    global _ocr_instance
    if _ocr_instance is None:
        try:
            from paddleocr import PaddleOCR
            # Initialize OCR globally, language 'en', enable angle classification to prevent vertical garble on rotated photos
            _ocr_instance = PaddleOCR(use_angle_cls=True, lang='en')
            logging.getLogger('ppocr').setLevel(logging.ERROR)
        except ImportError as e:
            logger.error("Failed to import PaddleOCR. Ensure it is installed in requirements.txt")
            raise Exception("OCR System unavailable.") from e
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}")
            raise Exception("Failed to initialize local OCR engine.") from e
    return _ocr_instance

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Converts raw image bytes to a BGR OpenCV array suitable for PaddleOCR 3.4.
    """
    try:
        # Load via Pillow to handle multiple formats cleanly
        pil_image = Image.open(BytesIO(image_bytes)).convert('RGB')
        
        # Convert Pillow to OpenCV format (RGB to BGR)
        cv_image = np.array(pil_image)
        cv_image = cv_image[:, :, ::-1].copy()

        # Return 3-channel BGR as required by PaddleOCR
        return cv_image
    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        raise ValueError("Failed to process image for OCR.") from e

def extract_text_with_paddle(image_bytes: bytes) -> str:
    """
    Processes the image bytes with OpenCV and sends it to the 
    local PaddleOCR instance, grouping detected lines into a continuous string.
    """
    processed_img = preprocess_image(image_bytes)
    ocr = get_ocr_instance()
    
    # Run OCR inference
    result = ocr.ocr(processed_img)
    
    if not result or not result[0]:
        return ""

    # Extract all text blocks into a single string
    detected_lines = []
    for line in result[0]:
        # line = [[box_points], (text, confidence)]
        text = line[1][0]
        detected_lines.append(text)
        
    return "\n".join(detected_lines)

def clean_ingredients_text(ocr_text: str) -> str:
    """
    Attempts to strip away marketing fluff by finding the word "Ingredients"
    and returning everything after it.
    """
    # Normalize spanning
    text = ocr_text.replace('\n', ' ')
    
    # Try to find "ingredients:" or similar (ignoring case)
    match = re.search(r'ingredients?[:\s]+(.*)', text, re.IGNORECASE)
    
    if match:
        cleaned_text = match.group(1).strip()
    else:
        # If no explicit "ingredients" keyword found, just return the whole string
        cleaned_text = text.strip()
        
    return cleaned_text
