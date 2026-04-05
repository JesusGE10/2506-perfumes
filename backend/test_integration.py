import httpx

r = httpx.post("http://localhost:8001/api/v1/auth/login", json={"email": "admin@perfumes2506.com", "password": "admin"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Test orders summary specifically
resp = httpx.get("http://localhost:8001/api/v1/admin/orders/summary", headers=headers, timeout=15)
print("Status:", resp.status_code)
print("Body:", resp.text)

# Test top-products
resp2 = httpx.get("http://localhost:8001/api/v1/admin/metrics/top-products", headers=headers, timeout=15)
print("\ntop-products status:", resp2.status_code)
print("Body:", resp2.text[:500])

# Test abandoned carts
resp3 = httpx.get("http://localhost:8001/api/v1/admin/metrics/abandoned-carts", headers=headers, timeout=15)
print("\nabandoned-carts status:", resp3.status_code)
print("Body:", resp3.text[:200])
