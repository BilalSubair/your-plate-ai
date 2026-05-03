import time
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.food.ocr_utils import extract_text_with_paddle, get_ocr_instance
from apps.food.ai_utils import classify_with_groq
from apps.food.ocr_utils import clean_ingredients_text

with open('../label.png', 'rb') as f:
    image_bytes = f.read()

print('Warming up PaddleOCR...')
t0 = time.time()
get_ocr_instance()
t1 = time.time()
print(f'Initialization took: {t1 - t0:.2f}s')

print('Extracting text (Run 1)...')
t2 = time.time()
text1 = extract_text_with_paddle(image_bytes)
t3 = time.time()
print(f'Run 1 extraction took: {t3 - t2:.2f}s')

print('Extracting text (Run 2)...')
t4 = time.time()
text2 = extract_text_with_paddle(image_bytes)
t5 = time.time()
print(f'Run 2 extraction took: {t5 - t4:.2f}s')

print('Calling Groq API...')
cleaned = clean_ingredients_text(text1)
t6 = time.time()
classify_with_groq(cleaned)
t7 = time.time()
print(f'Groq API took: {t7 - t6:.2f}s')
