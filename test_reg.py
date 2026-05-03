import urllib.request
import urllib.error
import json

def test(data):
    req = urllib.request.Request("http://localhost:8000/api/auth/register/", json.dumps(data).encode(), {"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        print("Success for", data)
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Error {len(body)} chars - {body}")

# test taken username
test({"username": "newuser123", "email": "valid@email.com", "password": "password123!"})
# test invalid email
test({"username": "newuser999", "email": "invalidemail", "password": "password123!"})
# test short password
test({"username": "newuser888", "email": "valid2@email.com", "password": "short"})
# test spaces in username
test({"username": "new user", "email": "valid3@email.com", "password": "password123!"})

