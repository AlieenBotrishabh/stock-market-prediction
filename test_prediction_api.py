import requests
import json

try:
    response = requests.get('http://localhost:5000/api/predict/TCS', timeout=10)
    print("Status Code:", response.status_code)
    print("Response:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
