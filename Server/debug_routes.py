from main import app
import json

print("\n--- Registered Routes ---")
for route in app.routes:
    if hasattr(route, "path"):
        print(f"{route.path} [{','.join(route.methods)}]")
    else:
        print(route)
print("-------------------------\n")
