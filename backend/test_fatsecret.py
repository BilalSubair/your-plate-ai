import os
import requests
from dotenv import load_dotenv

load_dotenv()

client_id = os.environ.get('FATSECRET_CLIENT_ID')
client_secret = os.environ.get('FATSECRET_CLIENT_SECRET')

auth_response = requests.post(
    "https://oauth.fatsecret.com/connect/token",
    data={"grant_type": "client_credentials", "scope": "basic"},
    auth=(client_id, client_secret)
)

print(auth_response.status_code, auth_response.text)

token = auth_response.json().get('access_token')

search_response = requests.get(
    "https://platform.fatsecret.com/rest/server.api",
    params={"method": "foods.search", "search_expression": "Banana", "format": "json", "max_results": 2},
    headers={"Authorization": f"Bearer {token}"}
)

print(search_response.status_code, search_response.text)
