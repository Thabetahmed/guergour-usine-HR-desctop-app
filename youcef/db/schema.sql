-- Factory Management System - SQLite Schema (Simplified)
-- This creates a lightweight database for factory worker management

-- Workers table - core employee information
CREATE TABLE workers (
    id INTEGER PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    position TEXT NOT NULL,
    salary REAL NOT NULL,
    hire_date DATE NOT NULL,
    next_payment DATE,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Work sessions - clock in/out tracking
CREATE TABLE work_sessions (
    id INTEGER PRIMARY KEY,
    worker_id INTEGER NOT NULL,
    clock_in TEXT NOT NULL,
    clock_out TEXT,
    hours_worked REAL,
    date DATE NOT NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- Advances - money given before payday
CREATE TABLE advances (
    id INTEGER PRIMARY KEY,
    worker_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    reason TEXT,
    date_given DATE NOT NULL,
    is_paid_back INTEGER DEFAULT 0,
    FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- Create indexes for better performance
CREATE INDEX idx_workers_code ON workers(code);
CREATE INDEX idx_sessions_worker ON work_sessions(worker_id);
CREATE INDEX idx_sessions_date ON work_sessions(date);
CREATE INDEX idx_advances_worker ON advances(worker_id);

-- Insert sample data
INSERT INTO workers (code, name, phone, position, salary, hire_date) VALUES
('W001', 'Ahmed Ali', '123-456-7890', 'Factory Worker', 2500.00, '2024-01-15'),
('W002', 'Sara Mohamed', '098-765-4321', 'Supervisor', 3500.00, '2024-02-01');
