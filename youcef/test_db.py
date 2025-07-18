#!/usr/bin/env python3
import sqlite3
import os

# Check if database exists
db_path = 'db/factory.db'
if os.path.exists(db_path):
    print(f"✅ Database found: {db_path}")
    
    # Connect and check tables
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print(f"📋 Tables: {[table[0] for table in tables]}")
    
    # Check workers table
    cursor.execute("SELECT COUNT(*) FROM workers")
    worker_count = cursor.fetchone()[0]
    print(f"👥 Workers in database: {worker_count}")
    
    # Show sample workers
    cursor.execute("SELECT code, name, position FROM workers LIMIT 3")
    workers = cursor.fetchall()
    print("📝 Sample workers:")
    for worker in workers:
        print(f"   - {worker[0]}: {worker[1]} ({worker[2]})")
    
    conn.close()
    print("\n🎉 Database is working perfectly!")
    
else:
    print(f"❌ Database not found: {db_path}")
