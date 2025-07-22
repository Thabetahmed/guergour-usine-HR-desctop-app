"""
Create fresh database with loan system
"""
from app import create_app
from models import db, Group, Worker, Advance, Loan, LoanPayment
from datetime import date

def create_fresh_database():
    print("🔄 Creating fresh database with loan system...")
    
    app = create_app()
    with app.app_context():
        # Create all tables
        db.create_all()
        print("✅ Database tables created successfully!")
        
        # Add some sample data
        print("📝 Adding sample data...")
        
        # Create sample group
        group1 = Group(name="Production Team Alpha")
        db.session.add(group1)
        db.session.commit()
        
        # Create sample workers
        worker1 = Worker(
            code="W001",
            name="Ahmed Ali",
            phone="0555123456",
            position="Team Leader",
            salary=60000,
            hire_date=date(2024, 7, 15),
            birthday=date(1985, 3, 10),
            is_team_leader=True,
            group_id=group1.id
        )
        
        worker2 = Worker(
            code="W002",
            name="Youcef Ferfour",
            phone="0555987654",
            position="Technician",
            salary=45000,
            hire_date=date(2024, 8, 1),
            birthday=date(1995, 3, 20),
            group_id=group1.id
        )
        
        worker3 = Worker(
            code="W003",
            name="Sara Mohamed",
            phone="0555456789",
            position="Quality Control",
            salary=50000,
            hire_date=date(2024, 6, 10),
            birthday=date(1990, 12, 5)
        )
        
        db.session.add_all([worker1, worker2, worker3])
        
        # Update group leader
        group1.team_leader_id = worker1.id
        
        db.session.commit()
        
        print("✅ Sample data added successfully!")
        print(f"   - {len([worker1, worker2, worker3])} workers created")
        print(f"   - 1 group created")
        
        # Test loan creation
        print("🧪 Testing loan system...")
        test_loan = Loan(
            worker_id=worker1.id,
            total_amount=10000.0,
            reason="Test loan for system verification"
        )
        test_loan.date_given = date.today()
        
        db.session.add(test_loan)
        db.session.commit()
        
        print("✅ Loan system test successful!")
        print(f"   - Test loan: {test_loan.total_amount} DA")
        print(f"   - Remaining balance: {test_loan.remaining_balance} DA")
        
        print("\n🎉 Fresh database created successfully!")
        print("   📊 Tables: groups, workers, work_sessions, advances, loans, loan_payments")
        print("   🔑 Admin PIN: 1234")
        print("   🚀 Ready to start Flask backend!")

if __name__ == "__main__":
    create_fresh_database()
