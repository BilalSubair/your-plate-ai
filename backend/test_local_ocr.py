import os
import django
import sys
import base64
from dotenv import load_dotenv

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(dotenv_path="../.env")
print("GROQ KEY STATUS:", "LOADED" if os.environ.get("GROQ_API_KEY") else "MISSING")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.food.ocr_utils import extract_text_with_paddle, clean_ingredients_text
from apps.food.ai_utils import classify_with_groq

def test_pipeline():
    # Use the sample label if it exists
    image_path = "../label.png"
    if not os.path.exists(image_path):
        print(f"Error: Could not find {image_path}")
        return

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print("--- 1. Testing OCR Extraction ---")
    raw_text = extract_text_with_paddle(image_bytes)
    print("Raw Text Extracted:")
    print(raw_text)
    print("-" * 40)

    print("--- 2. Testing Text Cleaning ---")
    cleaned = clean_ingredients_text(raw_text)
    print("Cleaned Text:")
    print(cleaned)
    print("-" * 40)

    print("--- 3. Testing Groq Classification ---")
    result = classify_with_groq(cleaned)
    print("Groq Result (Strict JSON):")
    print(result)
    print("-" * 40)

if __name__ == "__main__":
    test_pipeline()
