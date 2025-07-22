# Factory Management Backend - Complete Setup

### Backend Structure:
```
back/
├── app.py              # Main Flask application
├── models.py           # Database models (Group, Worker, WorkSession, Advance)  
├── config.py           # Configuration (database, admin PIN)
├── requirements.txt    # Dependencies
├── factory.db          # SQLite database
├── init_db.py          # Database initialization script
└── test_models.py      # Testing script
```

### ✅ Features Implemented:

#### **Authentication:**
- ✅ Admin PIN protection (default: 1234)
- ✅ Simple header-based authentication

#### **🆕 Group Management:**
- ✅ `GET /api/groups` - List all active groups
- ✅ `POST /api/groups` - Create new group (requires admin PIN)
- ✅ `PUT /api/groups/<id>` - Update group (requires admin PIN)
- ✅ `DELETE /api/groups/<id>` - Delete group (requires admin PIN)
- ✅ `GET /api/groups/<id>/workers` - Get workers in specific group
- ✅ `POST /api/groups/<id>/add_worker` - Add worker to group (requires admin PIN)
- ✅ `POST /api/groups/<id>/remove_worker` - Remove worker from group (requires admin PIN)

#### **Enhanced Worker Management:**
- ✅ `GET /api/workers` - List all active workers (with group info)
- ✅ `POST /api/workers` - Add new worker with birthday & group (requires admin PIN)
- ✅ `PUT /api/workers/<id>` - Update worker with birthday & group (requires admin PIN)
- ✅ `DELETE /api/workers/<id>` - Deactivate worker (requires admin PIN)

#### **Clock In/Out System:**
- ✅ `POST /api/clock-in` - Worker clock in (prevents double clock-in)
- ✅ `POST /api/clock-out` - Worker clock out (calculates hours)
- ✅ `GET /api/sessions` - View work sessions
- ✅ `GET /api/sessions/<worker_id>` - Worker-specific sessions

#### **Advance Payments:**
- ✅ `GET /api/advances` - List all advances
- ✅ `POST /api/advances` - Give advance to worker (requires admin PIN)
- ✅ `PUT /api/advances/<id>/payback` - Mark advance as paid back

#### **Payment Calculations:**
- ✅ `GET /api/payments/summary` - Complete payroll summary
- ✅ Proportional salary calculation (salary × hours_worked ÷ 160)
- ✅ Hire date-based monthly cycles
- ✅ Advance deductions from earned salary
- ✅ Individual worker payment cycles

## 🚀 Running the Backend

### Start the Server:
```bash
cd back
python app.py
```

### Server Details:
- **URL:** http://127.0.0.1:5000
- **Admin PIN:** 1234
- **Database:** SQLite (factory.db)

## 📋 API Testing Examples

### Test API Status:

**Using curl:**
```bash
curl http://127.0.0.1:5000/api/test
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/test"
```

### Get All Workers:

**Using curl:**
```bash
curl http://127.0.0.1:5000/api/workers
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/workers"
```

### Clock In a Worker:

**Using curl:**
```bash
curl -X POST http://127.0.0.1:5000/api/clock-in \
  -H "Content-Type: application/json" \
  -d '{"worker_code": "W001"}'
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/clock-in" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"worker_code": "W003"}'
```

### Add New Worker (with admin PIN and new fields):

**Using curl (Linux/Mac):**
```bash
curl -X POST http://127.0.0.1:5000/api/workers \
  -H "Content-Type: application/json" \
  -H "X-Admin-Pin: 1234" \
  -d '{
    "code": "W003",
    "name": "youcef ferfour", 
    "position": "Technician",
    "salary": 60000,
    "hire_date": "2024-07-15",
    "birthday": "1995-03-20",
    "phone": "0555555555",
    "group_id": 1
  }'
```

**Using PowerShell (Windows):**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/workers" -Method POST -Headers @{"Content-Type"="application/json"; "X-Admin-Pin"="1234"} -Body '{"code": "W005", "name": "ahmed thabet mazouz", "position": "Technician", "salary": 60000, "hire_date": "2024-07-15", "birthday": "1990-12-10", "phone": "0555555555", "group_id": 1}'
```

## 🆕 Group Management API Examples

### Get All Groups:

**Using curl:**
```bash
curl http://127.0.0.1:5000/api/groups
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/groups"
```

### Create New Group:

**Using curl:**
```bash
curl -X POST http://127.0.0.1:5000/api/groups \
  -H "Content-Type: application/json" \
  -H "X-Admin-Pin: 1234" \
  -d '{
    "name": "Production Team Alpha",
    "team_leader_id": 1
  }'
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/groups" -Method POST -Headers @{"Content-Type"="application/json"; "X-Admin-Pin"="1234"} -Body '{"name": "Quality Control Team", "team_leader_id": 2}'
```

### Update Group:

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/groups/1" -Method PUT -Headers @{"Content-Type"="application/json"; "X-Admin-Pin"="1234"} -Body '{"name": "Production Team Beta", "team_leader_id": 3}'
```

### Get Workers in Specific Group:

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/groups/1/workers"
```

### Add Worker to Group:

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/groups/1/add_worker" -Method POST -Headers @{"Content-Type"="application/json"; "X-Admin-Pin"="1234"} -Body '{"worker_id": 3}'
```

### Remove Worker from Group:

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/groups/1/remove_worker" -Method POST -Headers @{"Content-Type"="application/json"; "X-Admin-Pin"="1234"} -Body '{"worker_id": 3}'
```

### Delete Group:

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/groups/1" -Method DELETE -Headers @{"Content-Type"="application/json"; "X-Admin-Pin"="1234"}
```

### Get Payment Summary:

**Using curl:**
```bash
curl http://127.0.0.1:5000/api/payments/summary
```

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/payments/summary"
```

### Clock Out a Worker:

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/clock-out" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"worker_code": "W003"}'
```

### Give Advance Payment:

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/advances" -Method POST -Headers @{"Content-Type"="application/json"; "X-Admin-Pin"="1234"} -Body '{"worker_id": 1, "amount": 500, "reason": "Emergency"}'
```

### Get All Work Sessions:

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/sessions"
```

### Get All Advances:

**Using PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/advances"
```

## 🔧 Key Features

### **🆕 Team Organization System:**
- ✅ **Custom group names** (user-defined, not tied to team leader names)
- ✅ **Team leader assignment** (one per group, also regular workers)
- ✅ **Worker group membership** (each worker belongs to one group)
- ✅ **Group-based views** and filtering capabilities
- ✅ **Automatic status management** (team leader flags, group assignments)

### **🆕 Enhanced Worker Profiles:**
- ✅ **Birthday tracking** for each worker
- ✅ **Group membership** display and management
- ✅ **Team leader status** indication
- ✅ **Extended worker information** with group context

### **Smart Clock System:**
- ❌ **Prevents double clock-in** on same day
- ✅ **Automatic hours calculation** when clocking out
- ✅ **Worker validation** by code

### **New Payment System:**
- ✅ **Proportional salary calculation** (salary × hours_worked ÷ 160)
- ✅ **Individual monthly cycles** based on hire dates
- ✅ **Advance tracking** with proper deductions
- ✅ **Clear payment status** indicators
- ✅ **Detailed cycle information** (start, end, days remaining)

### **Payment Status Types:**
- `"completed_no_advances"` - Worked 160+ hours, no advances
- `"completed_with_advances"` - Worked 160+ hours, has advances
- `"incomplete_no_advances"` - Less than 160 hours, no advances
- `"incomplete_with_advances"` - Less than 160 hours, has advances
- `"debt_exceeds_earnings"` - Advances exceed earned salary

### **Admin Security:**
- 🔐 **PIN protection** for sensitive operations
- ✅ **Worker management** requires authentication
- ✅ **Advance approvals** require authentication

## 📊 Payment Calculation Examples

### **Example 1: Full Month Completed**
```
Worker: Ahmed Ali
Hire Date: 15th of each month
Hours Worked: 160+ hours
Salary: 60,000 DA
Advances: 5,000 DA
Final Payment: 55,000 DA (60,000 - 5,000)
```

### **Example 2: Partial Month**
```
Worker: Sara Mohamed
Hire Date: 1st of each month
Hours Worked: 100 hours
Salary: 45,000 DA
Earned Salary: 28,125 DA (45,000 × 100/160)
Advances: 10,000 DA
Final Payment: 18,125 DA (28,125 - 10,000)
```

### **Example 3: Debt Situation**
```
Worker: Youcef Ferfour
Hours Worked: 20 hours
Salary: 60,000 DA
Earned Salary: 7,500 DA (60,000 × 20/160)
Advances: 15,000 DA
Final Payment: 0 DA
Remaining Debt: 7,500 DA (15,000 - 7,500)
```

## � Group Management Examples

### **Example 1: Production Team**
```
Group: Production Team Alpha
Team Leader: Ahmed Ali (Worker ID: 1)
Members: 5 workers
Status: Active
Created: 2025-07-22
```

### **Example 2: Quality Control Team**
```
Group: Quality Control Team
Team Leader: Sara Mohamed (Worker ID: 3)
Members: 3 workers
Status: Active
Created: 2025-07-22
```

### **Group Structure:**
```
📊 Factory Organization:
├── Production Team Alpha (Leader: Ahmed Ali)
│   ├── Worker: Youcef Ferfour
│   ├── Worker: Mohamed Saidi
│   └── Worker: Fatima Benaissa
├── Quality Control Team (Leader: Sara Mohamed)
│   ├── Worker: Karim Ouali
│   └── Worker: Aicha Hamdi
└── Maintenance Team (Leader: Hassan Bencheikh)
    ├── Worker: Omar Tebboune
    └── Worker: Nawal Zerrouki
```

## �🎯 Next Steps

1. ✅ **Backend Complete** - All APIs working perfectly
2. ✅ **Database Schema** - SQLite setup and tested with Groups
3. ✅ **Group Management** - Team organization system implemented
4. ✅ **Enhanced Worker Profiles** - Birthday and group features added
5. ✅ **Payment Logic** - New proportional system implemented
6. 🔄 **Frontend Development** - Electron desktop interface with group management
7. 🔄 **Auto-start Integration** - Flask launches with Electron

## 🛠️ Current Status

- ✅ **Flask server running** on http://127.0.0.1:5000
- ✅ **All API endpoints tested and functional**
- ✅ **Group management system fully operational**
- ✅ **Enhanced worker profiles with birthday & group support**
- ✅ **SQLite database connected and working**
- ✅ **Models and relationships validated**
- ✅ **New payment system implemented**
- ✅ **PIN authentication working**
- ✅ **Auto-refresh ready for frontend**

**The backend is 100% complete with Group management and ready for frontend integration!** 🚀

## 🔍 API Response Examples

### **Payment Summary Response:**
```json
{
  "workers": [
    {
      "worker": { "id": 1, "name": "Ahmed Ali", "salary": 60000 },
      "cycle_info": {
        "cycle_start": "2025-07-15",
        "cycle_end": "2025-08-14",
        "days_remaining": 27
      },
      "work_progress": {
        "hours_worked": 100.5,
        "required_hours": 160,
        "hours_remaining": 59.5,
        "completion_percentage": 62.8
      },
      "salary_calculation": {
        "monthly_salary": 60000,
        "earned_salary": 37687.5,
        "advances_taken": 5000,
        "final_payment": 32687.5,
        "remaining_debt": 0
      },
      "payment_status": "incomplete_with_advances"
    }
  ],
  "totals": {
    "total_earned_payroll": 37687.5,
    "total_advances_given": 5000,
    "total_final_payments": 32687.5,
    "total_workers": 1
  },
  "system_info": {
    "required_hours_per_month": 160,
    "payment_formula": "salary × (hours_worked ÷ 160)",
    "cycle_calculation": "Based on individual hire dates",
    "advance_policy": "Advances deducted from earned salary"
  }
}
```

### **🆕 Groups Response:**
```json
[
  {
    "id": 1,
    "name": "Production Team Alpha",
    "team_leader_id": 1,
    "team_leader_name": "Ahmed Ali",
    "workers_count": 3,
    "created_at": "2025-07-22T00:30:00",
    "is_active": true
  },
  {
    "id": 2,
    "name": "Quality Control Team",
    "team_leader_id": 3,
    "team_leader_name": "Sara Mohamed",
    "workers_count": 2,
    "created_at": "2025-07-22T00:35:00",
    "is_active": true
  }
]
```

### **🆕 Enhanced Worker Response:**
```json
{
  "id": 1,
  "code": "W001",
  "name": "Ahmed Ali",
  "phone": "0555123456",
  "position": "Team Leader",
  "salary": 60000,
  "hire_date": "2024-07-15",
  "birthday": "1985-03-10",
  "is_active": true,
  "is_team_leader": true,
  "group_id": 1,
  "group_name": "Production Team Alpha",
  "created_at": "2025-07-22T00:20:00"
}
```

### **🆕 Group Workers Response:**
```json
[
  {
    "id": 1,
    "name": "Ahmed Ali",
    "position": "Team Leader",
    "is_team_leader": true,
    "birthday": "1985-03-10",
    "group_name": "Production Team Alpha"
  },
  {
    "id": 2,
    "name": "Youcef Ferfour",
    "position": "Technician",
    "is_team_leader": false,
    "birthday": "1995-03-20",
    "group_name": "Production Team Alpha"
  },
  {
    "id": 4,
    "name": "Mohamed Saidi",
    "position": "Operator",
    "is_team_leader": false,
    "birthday": "1992-08-15",
    "group_name": "Production Team Alpha"
  }
]
```
