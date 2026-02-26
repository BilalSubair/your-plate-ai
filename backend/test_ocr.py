import os
import requests
import base64

os.environ['GRPC_DNS_RESOLVER'] = 'native'

blank_png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
data_uri = f"data:image/png;base64,{blank_png_base64}"

try:
    auth_response = requests.post(
        'http://localhost:8000/api/auth/token/',
        json={'username': 'testuser2', 'password': 'testpassword123'}
    )
    
    token = auth_response.json()['access']

    response = requests.post(
        'http://localhost:8000/api/food/analyze-ingredients/',
        headers={'Authorization': f'Bearer {token}'},
        json={'imageBase64': data_uri}
    )
    print("Status:", response.status_code)
    print("Response:", response.text)

except Exception as e:
    print("Test script failed:", e)
