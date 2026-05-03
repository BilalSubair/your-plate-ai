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
            # Initialize OCR globally, language 'en'. 
            # Note: The user is on a Mac. We MUST STRICTLY set enable_mkldnn=False, otherwise the Intel extension emulation
            # chokes the Apple Silicon CPU, causing 40s+ delays. Restricting threads to 6 stops efficiency-core thrashing.
            _ocr_instance = PaddleOCR(use_angle_cls=False, lang='en', enable_mkldnn=False, cpu_threads=6)
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
        from PIL import ImageOps
        # Load via Pillow to handle multiple formats cleanly
        pil_image = Image.open(BytesIO(image_bytes))
        # Fix EXIF orientation (crucial for smartphone portrait photos)
        pil_image = ImageOps.exif_transpose(pil_image)
        pil_image = pil_image.convert('RGB')
        
        # Convert Pillow to OpenCV format (RGB to BGR)
        cv_image = np.array(pil_image)
        cv_image = cv_image[:, :, ::-1].copy()

        # Resize to standard OCR dimensions (max 900px) which is the absolute floor for 70B AI reconstruction fidelity
        h, w = cv_image.shape[:2]
        max_dim = 900
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            cv_image = cv2.resize(cv_image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

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
    
    # Handle PaddleX v3.0+ dictionary format
    for res_item in result:
        if isinstance(res_item, dict) and 'rec_texts' in res_item:
            detected_lines.extend(res_item['rec_texts'])
            
    # Handle legacy PaddleOCR list of tuples format
    if not detected_lines and len(result) > 0 and isinstance(result[0], list):
        for line in result[0]:
            if len(line) > 1 and isinstance(line[1], tuple):
                detected_lines.append(line[1][0])
                
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
