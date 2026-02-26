import os
import base64
import json
import re
from google.cloud import vision
from groq import Groq
from django.conf import settings
from rest_framework.exceptions import ValidationError

# Groq Client setup
# The API key should be in settings or environment
groq_api_key = os.environ.get("GROQ_API_KEY")
if groq_api_key:
    groq_client = Groq(api_key=groq_api_key)
else:
    groq_client = None

def decode_and_validate_image(image_base64: str) -> bytes:
    """
    Validates a base64 image data URI and decodes it.
    Rejects images larger than 1MB to prevent abuse.
    """
    if not image_base64 or not image_base64.startswith("data:image"):
        raise ValidationError("Invalid or missing image data. Must be a base64 image data URI.")

    try:
        # Split "data:image/jpeg;base64,... "
        _, base64_data = image_base64.split(",", 1)
        image_bytes = base64.b64decode(base64_data)
        
        # Validate size (< 1MB)
        if len(image_bytes) > 1 * 1024 * 1024:
            raise ValidationError("Image file too large. Please upload an image smaller than 1MB.")
            
        return image_bytes
    except Exception as e:
        raise ValidationError(f"Failed to decode image: {str(e)}")

def extract_text_with_vision(image_bytes: bytes) -> str:
    """
    Uses Google Cloud Vision API to extract text from the image bytes.
    """
    # Ensure Google Application Credentials are set
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        raise ValueError("Google Cloud Vision API credentials are not configured on the server.")

    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)

    # Perform text detection
    response = client.text_detection(image=image)
    
    if response.error.message:
        raise Exception(f"Vision API Error: {response.error.message}")

    texts = response.text_annotations
    if not texts:
        return ""

    # The first annotation contains the entire continuous text string
    return texts[0].description

def clean_ingredients_text(ocr_text: str) -> str:
    """
    Attempts to strip away marketing fluff by finding the word "Ingredients"
    and returning everything after it.
    """
    # Normalize
    text = ocr_text.replace('\n', ' ')
    
    # Try to find "ingredients:" or similar
    match = re.search(r'ingredients?[:\s]+(.*)', text, re.IGNORECASE)
    
    if match:
        cleaned_text = match.group(1).strip()
    else:
        # If no explicit "ingredients" keyword found, just return the whole text
        # letting Groq figure it out, but taking a risk on context limit.
        cleaned_text = text.strip()
        
    return cleaned_text

def classify_with_groq(ingredients_text: str) -> list:
    """
    Sends the cleaned ingredients text to Groq Llama3 to classify.
    Forces JSON output.
    """
    if not groq_client:
        raise ValueError("Groq API Key is not configured on the server.")
        
    if not ingredients_text:
        return []

    system_prompt = (
        "You are a strict nutrition analysis assistant. You will be given OCR text from a food or supplement label. "
        "Your job is to identify only the actual consumable ingredients from the text, and classify each one into exactly three categories: "
        "'healthy', 'neutral', or 'harmful' based on general medical and nutritional consensus. "
        "Do not hallucinate ingredients. Only classify what is explicitly found in the provided text. Ignore marketing jargon, "
        "manufacturer addresses, or weights. \n\n"
        "You MUST return ONLY a JSON array of objects, with no markdown, no backticks, and no conversational text. "
        "Each object must have exactly these keys:\n"
        "- 'name': (string) The name of the ingredient.\n"
        "- 'healthImpact': (string) Exactly one of 'healthy', 'neutral', or 'harmful'.\n"
        "- 'reason': (string) A short, 1-sentence scientific reason for this classification."
    )

    try:
        completion = groq_client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the extracted label text:\n\n{ingredients_text}"}
            ],
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )
        
        response_content = completion.choices[0].message.content
        
        # The prompt asks for an array, but response_format={"type": "json_object"} sometimes wraps it
        # Try to parse it out
        parsed = json.loads(response_content)
        
        # If it returned a dictionary like {"ingredients": [...]}, unwrap it
        if isinstance(parsed, dict):
            for key in parsed.keys():
                if isinstance(parsed[key], list):
                    return parsed[key]
            
            # If no list found inside, return empty (unexpected format)
            return []
            
        if isinstance(parsed, list):
            return parsed
            
        return []
        
    except Exception as e:
        raise Exception(f"Failed to analyze ingredients with Groq: {str(e)}")
