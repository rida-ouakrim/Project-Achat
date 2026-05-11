import requests

BASE_URL = "http://127.0.0.1:8000/api"

def test():
    try:
        # Let's see existing catalog
        r = requests.get(f"{BASE_URL}/catalog/")
        print("Catalog before:", r.json())
        
        # Try to create a dummy supplier through catalog directly
        r = requests.post(f"{BASE_URL}/catalog/", json={
            "product_name": "TEST PRODUCT " + str(hash("time")),
            "supplier_name": "TEST SUPPLIER",
            "price": "100 MAD"
        })
        print("Create Status:", r.status_code)
        print("Create Response:", r.text)
        
        r = requests.get(f"{BASE_URL}/catalog/")
        print("Catalog after:", r.json())
    except Exception as e:
        print("Error connecting to server (is it running?):", e)

if __name__ == "__main__":
    test()
