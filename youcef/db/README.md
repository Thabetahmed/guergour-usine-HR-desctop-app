# Factory Management System - SQLite Database

## Simple Setup (No Installation Required!)

### What You Need:
- Just Python (SQLite is built-in)

---

## Quick Start

### Create the Database:
```bash
# Navigate to project folder
cd youcef

# Create SQLite database from schema
python -c "
import sqlite3
with open('db/schema.sql', 'r') as f:
    schema = f.read()
conn = sqlite3.connect('db/factory.db')
conn.executescript(schema)
conn.close()
print('Database created successfully!')
"
```

### Verify Database:

# Check if database was created

run the test_db.py file

## Database Details

### Connection String for Flask:
```python
'sqlite:///db/factory.db'
```

### Tables Created:
- **workers** - Employee information (simplified)
- **work_sessions** - Clock in/out times
- **advances** - Money given before payday

### Key Features:
- ✅ **Zero installation** - SQLite is built into Python
- ✅ **Single file database** - easy backup (just copy `factory.db`)
- ✅ **Perfect for single machine** factory setup
- ✅ **Fast and reliable** for thousands of workers
- ✅ **Simple structure** - only essential features

---

## Sample Data Included:
- 2 test workers: Ahmed Ali (W001) and Sara Mohamed (W002)
- Ready to test immediately

---

## Usage:
1. Run the create command above
2. Database file `factory.db` will be created in `db/` folder
3. Your Flask backend can connect immediately
4. No services to start or manage!

---

## Backup:
Just copy the `factory.db` file - that's your entire database!
