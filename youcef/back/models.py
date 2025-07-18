from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()

class Worker(db.Model):
    __tablename__ = 'workers'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.Text, unique=True, nullable=False)
    name = db.Column(db.Text, nullable=False)
    phone = db.Column(db.Text)
    position = db.Column(db.Text, nullable=False)
    salary = db.Column(db.Float, nullable=False)
    hire_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    work_sessions = db.relationship('WorkSession', backref='worker', lazy=True, cascade='all, delete-orphan')
    advances = db.relationship('Advance', backref='worker', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'phone': self.phone,
            'position': self.position,
            'salary': self.salary,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class WorkSession(db.Model):
    __tablename__ = 'work_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=False)
    clock_in = db.Column(db.DateTime, nullable=False)
    clock_out = db.Column(db.DateTime)
    hours_worked = db.Column(db.Float)
    date = db.Column(db.Date, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'worker_id': self.worker_id,
            'worker_name': self.worker.name if self.worker else None,
            'clock_in': self.clock_in.isoformat() if self.clock_in else None,
            'clock_out': self.clock_out.isoformat() if self.clock_out else None,
            'hours_worked': self.hours_worked,
            'date': self.date.isoformat() if self.date else None
        }

class Advance(db.Model):
    __tablename__ = 'advances'
    
    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.Text)
    date_given = db.Column(db.Date, nullable=False)
    is_paid_back = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'worker_id': self.worker_id,
            'worker_name': self.worker.name if self.worker else None,
            'amount': self.amount,
            'reason': self.reason,
            'date_given': self.date_given.isoformat() if self.date_given else None,
            'is_paid_back': self.is_paid_back
        }
