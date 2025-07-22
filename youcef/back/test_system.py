"""
Test script to verify everything is working
"""
import requests
import time

def test_everything():
    print("🧪 Testing the complete system...")
    
    # Test 1: Server connection
    try:
        print("1️⃣ Testing server connection...")
        response = requests.get("http://127.0.0.1:5000/api/test", timeout=5)
        if response.status_code == 200:
            print("✅ Flask backend is running!")
        else:
            print("❌ Backend not responding")
            return
    except:
        print("❌ Backend not running. Start it with: python app.py")
        return
    
    # Test 2: Workers endpoint
    print("2️⃣ Testing workers...")
    response = requests.get("http://127.0.0.1:5000/api/workers")
    workers = response.json()
    print(f"✅ Found {len(workers)} workers")
    
    # Test 3: Loan creation
    if workers:
        print("3️⃣ Testing loan creation...")
        worker = workers[0]
        loan_data = {
            "worker_id": worker['id'],
            "amount": 15000,
            "reason": "Test Douyoun System"
        }
        
        response = requests.post(
            "http://127.0.0.1:5000/api/loans",
            headers={
                "Content-Type": "application/json",
                "X-Admin-Pin": "1234"
            },
            json=loan_data
        )
        
        if response.status_code == 201:
            print("✅ Loan creation successful!")
            loan = response.json()['loan']
            print(f"   💰 Amount: {loan['total_amount']} DA")
            print(f"   💳 Balance: {loan['remaining_balance']} DA")
        else:
            print(f"❌ Loan creation failed: {response.text}")
    
    print("\n🎉 System test complete!")
    print("   🌐 Frontend: http://localhost:8080/khadama.html")
    print("   🔴 Try the Douyoun button now!")

if __name__ == "__main__":
    test_everything()
