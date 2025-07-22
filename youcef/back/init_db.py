#!/usr/bin/env python3
"""
Database initialization script
Creates all tables with the new schema including Groups and updated Workers table
"""

from app import create_app
from models import db

def init_database():
    app = create_app()
    
    with app.app_context():
        # Drop all existing tables and create new ones
        db.drop_all()
        db.create_all()
        
        print("✅ Database initialized successfully!")
        print("📊 Tables created:")
        print("  - groups")
        print("  - workers (with birthday, group_id, is_team_leader)")
        print("  - work_sessions")
        print("  - advances")

if __name__ == '__main__':
    init_database()
