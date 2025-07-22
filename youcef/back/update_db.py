"""
Database Update Script for Loan System
Adds new Loan and LoanPayment tables while preserving existing data
"""

from app import create_app
from models import db, Group, Worker, WorkSession, Advance, Loan, LoanPayment
import os

def update_database():
    app = create_app()
    
    with app.app_context():
        print("📊 Updating database with new loan system...")
        
        # Create new tables (will skip existing ones)
        db.create_all()
        
        print("✅ Database updated successfully!")
        print("📋 Current tables:")
        
        # Verify tables exist
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        
        for table in sorted(tables):
            print(f"   - {table}")
        
        print("\n🎯 New Features Added:")
        print("   - Loans table (for Douyoun)")
        print("   - Loan Payments table (for tracking payments)")
        print("   - Worker relationships updated")
        
        print("\n🔧 API Endpoints Available:")
        print("   - GET /api/loans - List all loans")
        print("   - POST /api/loans - Create new loan")
        print("   - GET /api/loans/{worker_id}/worker - Get worker's loans")
        print("   - POST /api/loans/{loan_id}/payment - Add loan payment")
        print("   - GET /api/loans/{loan_id}/payments - Get loan payment history")
        
        print("\n💡 Business Rules:")
        print("   - Massarif (Advances): Limited to worker salary")
        print("   - Douyoun (Loans): No limit, any amount allowed")
        print("   - Both require admin PIN authorization")

if __name__ == '__main__':
    update_database()
