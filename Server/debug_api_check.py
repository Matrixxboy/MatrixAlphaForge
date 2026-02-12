
import urllib.request
import json

try:
    print("Fetching from http://127.0.0.1:8000/api/stock/market/summary")
    with urllib.request.urlopen("http://127.0.0.1:8000/api/stock/market/summary") as response:
        print(f"Status Code: {response.getcode()}")
        data = json.loads(response.read().decode())
        print("Response Body Structure:")
        if isinstance(data, dict):
             print("Keys:", list(data.keys()))
             if 'data' in data:
                 print("Data Type:", type(data['data']))
        else:
             print("Type:", type(data))
        
        # print full response for clarity
        print(json.dumps(data, indent=2))

except Exception as e:
    print(f"Error: {e}")
