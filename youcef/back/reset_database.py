"""
Fresh Database Setup for Loan System
Deletes old database and creates new one with loan tables
"""
import os
from app import create_app
from models import db

def reset_database():
    print("🗑️ Deleting old database...")
    
    # Delete old database files
    db_files = [
        "factory.db",
        "instance/factory.db",
        "../db/factory.db"
    ]
    
    for db_file in db_files:
        if os.path.exists(db_file):
            os.remove(db_file)
            print(f"   ✅ Deleted {db_file}")
    
    print("\n🏗️ Creating fresh database with loan system...")
    
    # Create fresh database
    app = create_app()
    with app.app_context():
        db.create_all()
        print("   ✅ All tables created successfully!")
        
        # Verify tables exist
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()
        
        print(f"\n📋 Created {len(tables)} tables:")
        for table in sorted(tables):
            print(f"   - {table}")
    
    print("\n🎉 Fresh database ready!")
    print("   ✅ Massarif & Douyoun system ready to use")
    print("   ✅ Start your servers and test the loan functionality")

if __name__ == "__main__":
    reset_database()
