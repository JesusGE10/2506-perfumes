from app.main import app

for route in app.routes:
    # Some routes don't have a path attribute (like Mount objects) but most do
    if hasattr(route, "path"):
        print(route.path)
    else:
        print("Other:", route)
