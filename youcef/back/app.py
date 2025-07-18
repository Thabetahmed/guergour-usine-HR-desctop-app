from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from models import db, Worker, WorkSession, Advance
from config import Config
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    
    # Authentication helper
    def check_admin_pin():
        pin = request.headers.get('X-Admin-Pin') or request.json.get('admin_pin') if request.is_json else None
        return pin == Config.ADMIN_PIN
    
    # Helper function to check if worker already clocked in today
    def is_worker_clocked_in(worker_id):
        today = date.today()
        session = WorkSession.query.filter_by(
            worker_id=worker_id, 
            date=today, 
            clock_out=None
        ).first()
        return session is not None
    
    # Calculate hours worked
    def calculate_hours(clock_in, clock_out):
        if clock_in and clock_out:
            duration = clock_out - clock_in
            return round(duration.total_seconds() / 3600, 2)
        return 0

    # Calculate worker's current monthly cycle based on hire date
    def get_current_cycle_dates(hire_date):
        from datetime import datetime, date
        from dateutil.relativedelta import relativedelta
        
        today = date.today()
        hire_day = hire_date.day
        
        # Calculate current cycle start date
        if today.day >= hire_day:
            # Current month cycle
            cycle_start = date(today.year, today.month, hire_day)
        else:
            # Previous month cycle
            prev_month = today - relativedelta(months=1)
            cycle_start = date(prev_month.year, prev_month.month, hire_day)
        
        # Calculate cycle end date (day before next cycle)
        cycle_end = cycle_start + relativedelta(months=1) - relativedelta(days=1)
        
        return cycle_start, cycle_end

    # ROUTES
    
    @app.route('/api/test', methods=['GET'])
    def test():
        return jsonify({'message': 'Factory Management API is running!', 'status': 'success'})
    
    # WORKER MANAGEMENT
    
    @app.route('/api/workers', methods=['GET'])
    def get_workers():
        workers = Worker.query.filter_by(is_active=True).all()
        return jsonify([worker.to_dict() for worker in workers])
    
    @app.route('/api/workers', methods=['POST'])
    def add_worker():
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        data = request.json
        
        # Check if worker code already exists
        if Worker.query.filter_by(code=data['code']).first():
            return jsonify({'error': 'Worker code already exists'}), 400
        
        worker = Worker(
            code=data['code'],
            name=data['name'],
            phone=data.get('phone'),
            position=data['position'],
            salary=data['salary'],
            hire_date=datetime.strptime(data['hire_date'], '%Y-%m-%d').date()
        )
        
        db.session.add(worker)
        db.session.commit()
        
        return jsonify({'message': 'Worker added successfully', 'worker': worker.to_dict()}), 201
    
    @app.route('/api/workers/<int:worker_id>', methods=['PUT'])
    def update_worker(worker_id):
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        worker = Worker.query.get_or_404(worker_id)
        data = request.json
        
        worker.name = data.get('name', worker.name)
        worker.phone = data.get('phone', worker.phone)
        worker.position = data.get('position', worker.position)
        worker.salary = data.get('salary', worker.salary)
        
        db.session.commit()
        return jsonify({'message': 'Worker updated successfully', 'worker': worker.to_dict()})
    
    @app.route('/api/workers/<int:worker_id>', methods=['DELETE'])
    def delete_worker(worker_id):
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        worker = Worker.query.get_or_404(worker_id)
        worker.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Worker deactivated successfully'})
    
    # CLOCK IN/OUT SYSTEM
    
    @app.route('/api/clock-in', methods=['POST'])
    def clock_in():
        data = request.json
        worker_code = data.get('worker_code')
        
        worker = Worker.query.filter_by(code=worker_code, is_active=True).first()
        if not worker:
            return jsonify({'error': 'Worker not found'}), 404
        
        # Check if already clocked in today
        if is_worker_clocked_in(worker.id):
            return jsonify({'error': 'Worker already clocked in today'}), 400
        
        session = WorkSession(
            worker_id=worker.id,
            clock_in=datetime.now(),
            date=date.today()
        )
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'message': f'{worker.name} clocked in successfully',
            'session': session.to_dict()
        })
    
    @app.route('/api/clock-out', methods=['POST'])
    def clock_out():
        data = request.json
        worker_code = data.get('worker_code')
        
        worker = Worker.query.filter_by(code=worker_code, is_active=True).first()
        if not worker:
            return jsonify({'error': 'Worker not found'}), 404
        
        # Find today's open session
        today = date.today()
        session = WorkSession.query.filter_by(
            worker_id=worker.id,
            date=today,
            clock_out=None
        ).first()
        
        if not session:
            return jsonify({'error': 'No active clock-in session found'}), 400
        
        session.clock_out = datetime.now()
        session.hours_worked = calculate_hours(session.clock_in, session.clock_out)
        
        db.session.commit()
        
        return jsonify({
            'message': f'{worker.name} clocked out successfully',
            'session': session.to_dict()
        })
    
    @app.route('/api/sessions', methods=['GET'])
    def get_sessions():
        sessions = WorkSession.query.order_by(WorkSession.date.desc()).limit(50).all()
        return jsonify([session.to_dict() for session in sessions])
    
    @app.route('/api/sessions/<int:worker_id>', methods=['GET'])
    def get_worker_sessions(worker_id):
        sessions = WorkSession.query.filter_by(worker_id=worker_id).order_by(WorkSession.date.desc()).all()
        return jsonify([session.to_dict() for session in sessions])
    
    # ADVANCE PAYMENTS
    
    @app.route('/api/advances', methods=['GET'])
    def get_advances():
        advances = Advance.query.order_by(Advance.date_given.desc()).all()
        return jsonify([advance.to_dict() for advance in advances])
    
    @app.route('/api/advances', methods=['POST'])
    def give_advance():
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        data = request.json
        worker_id = data.get('worker_id')
        
        worker = Worker.query.get_or_404(worker_id)
        
        advance = Advance(
            worker_id=worker_id,
            amount=data['amount'],
            reason=data.get('reason'),
            date_given=date.today()
        )
        
        db.session.add(advance)
        db.session.commit()
        
        return jsonify({
            'message': f'Advance of ${advance.amount} given to {worker.name}',
            'advance': advance.to_dict()
        }), 201
    
    @app.route('/api/advances/<int:advance_id>/payback', methods=['PUT'])
    def mark_advance_paid(advance_id):
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        advance = Advance.query.get_or_404(advance_id)
        advance.is_paid_back = True
        
        db.session.commit()
        
        return jsonify({
            'message': 'Advance marked as paid back',
            'advance': advance.to_dict()
        })
    
    # PAYMENT CALCULATIONS
    
    @app.route('/api/payments/summary', methods=['GET'])
    def payment_summary():
        workers = Worker.query.filter_by(is_active=True).all()
        summary = []
        total_earned_payroll = 0
        total_advances_given = 0
        total_final_payments = 0
        
        for worker in workers:
            # Get current monthly cycle based on hire date
            cycle_start, cycle_end = get_current_cycle_dates(worker.hire_date)
            
            # Calculate total hours worked in current cycle
            sessions = WorkSession.query.filter(
                WorkSession.worker_id == worker.id,
                WorkSession.date >= cycle_start,
                WorkSession.date <= cycle_end,
                WorkSession.hours_worked.isnot(None)
            ).all()
            
            total_hours = sum(session.hours_worked for session in sessions)
            
            # Calculate unpaid advances
            unpaid_advances = Advance.query.filter_by(
                worker_id=worker.id,
                is_paid_back=False
            ).all()
            
            total_advances = sum(advance.amount for advance in unpaid_advances)
            
            # Calculate proportional salary based on hours worked
            required_hours = 160
            if total_hours >= required_hours:
                # Full salary if completed required hours
                earned_salary = worker.salary
                completion_percentage = 100
            else:
                # Proportional salary: salary * (hours_worked / 160)
                earned_salary = worker.salary * (total_hours / required_hours)
                completion_percentage = round((total_hours / required_hours) * 100, 1)
            
            # Calculate final payment
            final_payment = max(0, earned_salary - total_advances)
            remaining_debt = max(0, total_advances - earned_salary)
            
            # Determine payment status
            if total_hours >= required_hours and total_advances == 0:
                payment_status = "completed_no_advances"
            elif total_hours >= required_hours and total_advances > 0:
                payment_status = "completed_with_advances"
            elif total_hours < required_hours and total_advances == 0:
                payment_status = "incomplete_no_advances"
            elif remaining_debt > 0:
                payment_status = "debt_exceeds_earnings"
            else:
                payment_status = "incomplete_with_advances"
            
            worker_summary = {
                'worker': worker.to_dict(),
                'cycle_info': {
                    'cycle_start': cycle_start.isoformat(),
                    'cycle_end': cycle_end.isoformat(),
                    'days_remaining': (cycle_end - date.today()).days
                },
                'work_progress': {
                    'hours_worked': round(total_hours, 2),
                    'required_hours': required_hours,
                    'hours_remaining': max(0, required_hours - total_hours),
                    'completion_percentage': completion_percentage
                },
                'salary_calculation': {
                    'monthly_salary': worker.salary,
                    'earned_salary': round(earned_salary, 2),
                    'advances_taken': round(total_advances, 2),
                    'final_payment': round(final_payment, 2),
                    'remaining_debt': round(remaining_debt, 2)
                },
                'payment_status': payment_status,
                'unpaid_advances_count': len(unpaid_advances)
            }
            
            summary.append(worker_summary)
            total_earned_payroll += earned_salary
            total_advances_given += total_advances
            total_final_payments += final_payment
        
        return jsonify({
            'workers': summary,
            'totals': {
                'total_earned_payroll': round(total_earned_payroll, 2),
                'total_advances_given': round(total_advances_given, 2),
                'total_final_payments': round(total_final_payments, 2),
                'total_workers': len(summary)
            },
            'system_info': {
                'required_hours_per_month': 160,
                'payment_formula': 'salary × (hours_worked ÷ 160)',
                'cycle_calculation': 'Based on individual hire dates (e.g., 15th to 15th)',
                'advance_policy': 'Advances deducted from earned salary'
            }
        })
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    print("Factory Management API starting...")
    print(f"Database: {Config.SQLALCHEMY_DATABASE_URI}")
    print(f"Admin PIN: {Config.ADMIN_PIN}")
    print(f"Server: http://{Config.HOST}:{Config.PORT}")
    
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
