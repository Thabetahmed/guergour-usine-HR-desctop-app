"""
Simple restart script for debugging
"""
import subprocess
import sys
import time

def main():
    print("🔄 Restarting the system...")
    
    # Step 1: Create tables
    print("1️⃣ Creating database tables...")
    try:
        from app import create_app
        from models import db, Loan, LoanPayment
        
        app = create_app()
        with app.app_context():
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Test loan creation
            print("2️⃣ Testing loan model...")
            test_loan = Loan(worker_id=1, total_amount=1000.0, reason="Test")
            print(f"✅ Test loan created: {test_loan.total_amount} DA")
            print(f"✅ Remaining balance: {test_loan.remaining_balance} DA")
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return
    
    print("\n🚀 Now start the servers:")
    print("   Backend:  python app.py")
    print("   Frontend: python -m http.server 8080 (in front folder)")
    print("   Browser:  http://localhost:8080")

if __name__ == "__main__":
    main()
