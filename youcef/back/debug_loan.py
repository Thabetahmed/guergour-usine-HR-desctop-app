"""
Quick debug script to test the loan creation
"""
from app import create_app
from models import db, Worker, Loan
import traceback

def test_loan_creation():
    app = create_app()
    
    with app.app_context():
        try:
            # Test database connection
            print("Testing database connection...")
            workers = Worker.query.all()
            print(f"Found {len(workers)} workers")
            
            if workers:
                worker = workers[0]
                print(f"Testing with worker: {worker.name} (ID: {worker.id})")
                
                # Try to create a loan
                print("Creating test loan...")
                loan = Loan(
                    worker_id=worker.id,
                    total_amount=5000.0,
                    reason="Test loan"
                )
                
                print(f"Loan object created: {loan}")
                print(f"Remaining balance: {loan.remaining_balance}")
                
                # Try to save to database
                db.session.add(loan)
                db.session.commit()
                
                print("✅ Loan created successfully!")
                print(f"Loan ID: {loan.id}")
                
            else:
                print("❌ No workers found in database")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            print("Full traceback:")
            traceback.print_exc()

if __name__ == "__main__":
    test_loan_creation()
