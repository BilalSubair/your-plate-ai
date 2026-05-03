import os
import base64
import json
from groq import Groq
from django.conf import settings
from rest_framework.exceptions import ValidationError

def get_groq_client():
    from django.conf import settings
    api_key = getattr(settings, "GROQ_API_KEY", None)
    if not api_key:
        return None
        
    return Groq(api_key=api_key)

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
        
        # Validate size (< 10MB)
        if len(image_bytes) > 10 * 1024 * 1024:
            raise ValidationError("Image file too large. Please upload an image smaller than 10MB.")
            
        return image_bytes
    except Exception as e:
        raise ValidationError(f"Failed to decode image: {str(e)}")

def resize_image_if_needed(image_bytes: bytes, max_size=(800, 800)) -> str:
    """
    Resizes the image to a reasonable size for AI vision and returns a base64 string.
    This significantly reduces latency and OpenAI/Groq processing time.
    """
    import io
    from PIL import Image
    
    img = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB if necessary (Alpha channel can cause issues)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
        
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG", quality=85)
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/jpeg;base64,{img_str}"



def classify_with_groq(ingredients_text: str) -> dict:
    """
    Sends the cleaned ingredients text to Groq Llama3 to classify.
    Forces JSON output wrapped in a master object.
    """
    groq_client = get_groq_client()
    if not groq_client:
        raise ValueError("Groq API Key is not configured on the server.")
        
    if not ingredients_text:
        return {"ingredients": [], "healthScore": 5}

    system_prompt = (
        "You are a strict nutrition analysis assistant. You will be given OCR text from a food or supplement label. "
        "Your job is to identify only the actual consumable ingredients from the text, and classify each one into exactly three categories: "
        "'healthy', 'neutral', or 'harmful' based on general medical and nutritional consensus. "
        "Do not hallucinate ingredients. Only classify what is explicitly found in the provided text. Ignore marketing jargon. \n\n"
        "You MUST return ONLY a JSON object containing exactly two root properties:\n"
        "1. 'healthScore': A single integer from 1 to 10 rating the overall healthiness of the product based on these ingredients.\n"
        "2. 'ingredients': A JSON array of objects. Each object must have exactly these keys:\n"
        "   - 'name': (string) The name of the ingredient.\n"
        "   - 'healthImpact': (string) Exactly one of 'healthy', 'neutral', or 'harmful'.\n"
        "   - 'reason': (string) A short, 1-sentence scientific reason for this classification."
    )

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the extracted label text:\n\n{ingredients_text}"}
            ],
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"},
            timeout=15.0
        )
        
        response_content = completion.choices[0].message.content
        parsed = json.loads(response_content)
        
        # Ensure the required keys exist, return a safe fallback if the LLM deviated
        if isinstance(parsed, dict) and "ingredients" in parsed and "healthScore" in parsed:
            return parsed
            
        return {"ingredients": [], "healthScore": 5}
        
    except Exception as e:
        raise Exception(f"Failed to analyze ingredients with Groq: {str(e)}")

def analyze_plate_with_groq_vision(image_base64: str) -> dict:
    """
    Uses Groq Vision (Llama 3.2 11B) to detect food and estimate nutrition.
    This is used as a fallback/alternative to OpenAI.
    """
    groq_client = get_groq_client()
    if not groq_client:
        raise ValidationError("Groq API Key move to .env or .env.local to enable fallback scanning.")

    system_prompt = (
        "You are an Elite Research Nutritionist and Visual Food Intelligence Expert. "
        "Your task is to provide extremely precise and accurate nutritional analysis of the provided plate image. "
        "Follow these rigorous guidelines:\n\n"
        "1. **Identification**: Identify every distinct food item with scientific precision.\n"
        "2. **Volumetric Estimation**: Estimate the volume of each item in milliliters, then convert to weight (grams) using known food density constants. "
        "Reference official USDA and FSSAI (for Indian cuisine) nutritional databases for density and macro-ratios.\n"
        "3. **Precision Check**: Ensure the sum of individual food macros matches the 'total_nutrition' object exactly.\n\n"
        "Return ONLY a raw JSON object matching this schema EXACTLY: "
        "{\"foods\": [{\"name\": \"Specific Name\", \"grams\": number, \"nutrition\": {\"calories\": number, \"protein\": number, \"fat\": number, \"carbs\": number}}], "
        "\"total_nutrition\": {\"calories\": number, \"protein\": number, \"fat\": number, \"carbs\": number}}"
    )

    try:
        # Llama 4 Scout (17B) is the current Groq standard for high-performance vision
        completion = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": system_prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": image_base64}
                        }
                    ]
                }
            ],
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )
        
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        raise Exception(f"Groq Vision error: {str(e)}")
