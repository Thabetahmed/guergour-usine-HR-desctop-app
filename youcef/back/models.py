from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()

class Group(db.Model):
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, unique=True, nullable=False)
    team_leader_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    workers = db.relationship('Worker', backref='group', lazy=True, foreign_keys='Worker.group_id')
    team_leader = db.relationship('Worker', foreign_keys=[team_leader_id], post_update=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'team_leader_id': self.team_leader_id,
            'team_leader_name': self.team_leader.name if self.team_leader else None,
            'workers_count': len([w for w in self.workers if w.is_active]),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class Worker(db.Model):
    __tablename__ = 'workers'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.Text, unique=True, nullable=False)
    name = db.Column(db.Text, nullable=False)
    phone = db.Column(db.Text)
    position = db.Column(db.Text, nullable=False)
    salary = db.Column(db.Float, nullable=False)
    hire_date = db.Column(db.Date, nullable=False)
    next_payment = db.Column(db.Date, nullable=True)
    birthday = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    is_team_leader = db.Column(db.Boolean, default=False)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    work_sessions = db.relationship('WorkSession', backref='worker', lazy=True, cascade='all, delete-orphan')
    advances = db.relationship('Advance', backref='worker', lazy=True, cascade='all, delete-orphan')
    loans = db.relationship('Loan', backref='worker', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'phone': self.phone,
            'position': self.position,
            'salary': self.salary,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'next_payment': self.next_payment.isoformat() if self.next_payment else None,
            'birthday': self.birthday.isoformat() if self.birthday else None,
            'is_active': self.is_active,
            'is_team_leader': self.is_team_leader,
            'group_id': self.group_id,
            'group_name': self.group.name if self.group else None,
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

class Loan(db.Model):
    __tablename__ = 'loans'
    
    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    amount_paid_back = db.Column(db.Float, default=0.0)
    remaining_balance = db.Column(db.Float, nullable=False)
    reason = db.Column(db.Text)
    date_given = db.Column(db.Date, nullable=False)
    is_fully_paid = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    payments = db.relationship('LoanPayment', backref='loan', lazy=True, cascade='all, delete-orphan')
    
    def __init__(self, **kwargs):
        # Set remaining_balance equal to total_amount when creating
        if 'total_amount' in kwargs:
            kwargs['remaining_balance'] = kwargs['total_amount']
        super().__init__(**kwargs)
    
    def to_dict(self):
        return {
            'id': self.id,
            'worker_id': self.worker_id,
            'worker_name': self.worker.name if self.worker else None,
            'total_amount': self.total_amount,
            'amount_paid_back': self.amount_paid_back,
            'remaining_balance': self.remaining_balance,
            'reason': self.reason,
            'date_given': self.date_given.isoformat() if self.date_given else None,
            'is_fully_paid': self.is_fully_paid,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'payments_count': len(self.payments) if self.payments else 0
        }

class LoanPayment(db.Model):
    __tablename__ = 'loan_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id'), nullable=False)
    payment_amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'loan_id': self.loan_id,
            'payment_amount': self.payment_amount,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
