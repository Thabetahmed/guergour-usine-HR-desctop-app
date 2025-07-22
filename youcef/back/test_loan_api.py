"""
Test the new loan system APIs
"""
import requests
import json

BASE_URL = "http://127.0.0.1:5000"
ADMIN_PIN = "1234"

def test_loan_endpoints():
    print("🧪 Testing Loan System APIs...")
    
    # Test basic connection
    try:
        response = requests.get(f"{BASE_URL}/api/test")
        print(f"✅ Server connection: {response.json()}")
    except Exception as e:
        print(f"❌ Server not running: {e}")
        return
    
    # Test get loans
    try:
        response = requests.get(f"{BASE_URL}/api/loans")
        print(f"✅ Get loans: {len(response.json())} loans found")
    except Exception as e:
        print(f"❌ Get loans failed: {e}")
    
    print("\n📋 Available endpoints:")
    print("   - GET /api/loans - List all loans")
    print("   - POST /api/loans - Create new loan (requires admin PIN)")
    print("   - GET /api/loans/{worker_id}/worker - Get worker's loans")
    print("   - POST /api/loans/{loan_id}/payment - Add loan payment")
    print("   - GET /api/loans/{loan_id}/payments - Get loan payment history")
    
    print("\n💡 Business Rules Implemented:")
    print("   - Massarif (Advances): Limited to worker salary")
    print("   - Douyoun (Loans): No limit, any amount allowed")
    print("   - Both require admin PIN for creation")

if __name__ == "__main__":
    test_loan_endpoints()
