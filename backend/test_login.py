import httpx

r = httpx.post(
    "http://localhost:8001/api/v1/auth/login",
    json={"email": "admin@perfumes2506.com", "password": "admin"}
)
print("Status:", r.status_code)
print("Body:", r.text)
