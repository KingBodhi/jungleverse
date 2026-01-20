"""Check available API routes."""
import requests
import json

response = requests.get("http://127.0.0.1:8000/openapi.json")
data = response.json()

print("Desktop routes:")
for path in data.get("paths", {}).keys():
    if "desktop" in path:
        print(f"  {path}")
