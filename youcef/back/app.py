from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from models import db, Group, Worker, WorkSession, Advance, Loan, LoanPayment
from config import Config
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    
    # Configure CORS properly
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5000", "http://127.0.0.1:5000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "X-Admin-Pin"]
        }
    })
    
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
    
    # GROUP MANAGEMENT
    
    @app.route('/api/groups', methods=['GET'])
    def get_groups():
        groups = Group.query.filter_by(is_active=True).all()
        return jsonify([group.to_dict() for group in groups])
    
    @app.route('/api/groups', methods=['POST'])
    def create_group():
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        data = request.json
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Group name is required'}), 400
        
        # Check if group name already exists
        if Group.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Group name already exists'}), 400
        
        # Validate team leader if provided
        team_leader_id = data.get('team_leader_id')
        if team_leader_id:
            team_leader = Worker.query.get(team_leader_id)
            if not team_leader or not team_leader.is_active:
                return jsonify({'error': 'Invalid team leader'}), 400
            
            # Check if worker is already a team leader
            if Group.query.filter_by(team_leader_id=team_leader_id, is_active=True).first():
                return jsonify({'error': 'Worker is already a team leader of another group'}), 400
        
        group = Group(
            name=data['name'],
            team_leader_id=team_leader_id
        )
        
        db.session.add(group)
        
        # Update team leader status if provided
        if team_leader_id:
            team_leader = Worker.query.get(team_leader_id)
            team_leader.is_team_leader = True
            team_leader.group_id = group.id
        
        db.session.commit()
        
        return jsonify({'message': 'Group created successfully', 'group': group.to_dict()}), 201
    
    @app.route('/api/groups/<int:group_id>', methods=['PUT'])
    def update_group(group_id):
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        group = Group.query.get_or_404(group_id)
        data = request.json
        
        # Update group name if provided
        if 'name' in data and data['name'] != group.name:
            # Check if new name already exists
            if Group.query.filter_by(name=data['name']).first():
                return jsonify({'error': 'Group name already exists'}), 400
            group.name = data['name']
        
        # Update team leader if provided
        if 'team_leader_id' in data:
            new_leader_id = data['team_leader_id']
            old_leader_id = group.team_leader_id
            
            # Remove old team leader status
            if old_leader_id:
                old_leader = Worker.query.get(old_leader_id)
                if old_leader:
                    old_leader.is_team_leader = False
            
            # Set new team leader
            if new_leader_id:
                new_leader = Worker.query.get(new_leader_id)
                if not new_leader or not new_leader.is_active:
                    return jsonify({'error': 'Invalid team leader'}), 400
                
                # Check if worker is already a team leader
                existing_group = Group.query.filter_by(team_leader_id=new_leader_id, is_active=True).first()
                if existing_group and existing_group.id != group_id:
                    return jsonify({'error': 'Worker is already a team leader of another group'}), 400
                
                new_leader.is_team_leader = True
                new_leader.group_id = group.id
            
            group.team_leader_id = new_leader_id
        
        db.session.commit()
        return jsonify({'message': 'Group updated successfully', 'group': group.to_dict()})
    
    @app.route('/api/groups/<int:group_id>', methods=['DELETE'])
    def delete_group(group_id):
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        group = Group.query.get_or_404(group_id)
        
        # Remove team leader status
        if group.team_leader_id:
            team_leader = Worker.query.get(group.team_leader_id)
            if team_leader:
                team_leader.is_team_leader = False
        
        # Remove group assignment from all workers
        for worker in group.workers:
            worker.group_id = None
        
        # Deactivate group
        group.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Group deleted successfully'})
    
    @app.route('/api/groups/<int:group_id>/workers', methods=['GET'])
    def get_group_workers(group_id):
        group = Group.query.get_or_404(group_id)
        workers = Worker.query.filter_by(group_id=group_id, is_active=True).all()
        return jsonify([worker.to_dict() for worker in workers])
    
    @app.route('/api/groups/<int:group_id>/add_worker', methods=['POST'])
    def add_worker_to_group(group_id):
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        group = Group.query.get_or_404(group_id)
        data = request.json
        worker_id = data.get('worker_id')
        
        if not worker_id:
            return jsonify({'error': 'Worker ID is required'}), 400
        
        worker = Worker.query.get(worker_id)
        if not worker or not worker.is_active:
            return jsonify({'error': 'Worker not found'}), 404
        
        # Remove worker from previous group if any
        if worker.group_id:
            return jsonify({'error': 'Worker is already assigned to a group'}), 400
        
        worker.group_id = group_id
        db.session.commit()
        
        return jsonify({'message': 'Worker added to group successfully'})
    
    @app.route('/api/groups/<int:group_id>/remove_worker', methods=['POST'])
    def remove_worker_from_group(group_id):
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        data = request.json
        worker_id = data.get('worker_id')
        
        if not worker_id:
            return jsonify({'error': 'Worker ID is required'}), 400
        
        worker = Worker.query.get(worker_id)
        if not worker:
            return jsonify({'error': 'Worker not found'}), 404
        
        if worker.group_id != group_id:
            return jsonify({'error': 'Worker is not in this group'}), 400
        
        # If worker is team leader, remove team leader status
        if worker.is_team_leader:
            worker.is_team_leader = False
            group = Group.query.get(group_id)
            group.team_leader_id = None
        
        worker.group_id = None
        db.session.commit()
        
        return jsonify({'message': 'Worker removed from group successfully'})
    
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
        
        # Parse birthday if provided
        birthday = None
        if data.get('birthday'):
            try:
                birthday = datetime.strptime(data['birthday'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid birthday format. Use YYYY-MM-DD'}), 400
        
        # Validate group if provided
        group_id = data.get('group_id')
        if group_id:
            group = Group.query.get(group_id)
            if not group or not group.is_active:
                return jsonify({'error': 'Invalid group'}), 400
        
        hire_date = datetime.strptime(data['hire_date'], '%Y-%m-%d').date()
        today = date.today()
        # Calculate next_payment
        if hire_date == today:
            # If hire_date is today, next_payment is one month from today
            next_payment = hire_date + relativedelta(months=1)
        else:
            # If hire_date is in the past, next_payment is the same day as hire_date in the current or next month
            if today.day <= hire_date.day:
                # This month
                try:
                    next_payment = date(today.year, today.month, hire_date.day)
                except ValueError:
                    # Handle months with fewer days (e.g., Feb 30)
                    next_payment = (date(today.year, today.month, 1) + relativedelta(months=1, days=-1))
            else:
                # Next month
                next_month = today + relativedelta(months=1)
                try:
                    next_payment = date(next_month.year, next_month.month, hire_date.day)
                except ValueError:
                    next_payment = (date(next_month.year, next_month.month, 1) + relativedelta(months=1, days=-1))
        
        worker = Worker(
            code=data['code'],
            name=data['name'],
            phone=data.get('phone'),
            position=data['position'],
            salary=data['salary'],
            hire_date=hire_date,
            next_payment=next_payment,
            birthday=birthday,
            group_id=group_id,
            is_team_leader=data.get('is_team_leader', False)
        )
        
        db.session.add(worker)
        db.session.commit()
        
        return jsonify({'message': 'Worker added successfully', 'worker': worker.to_dict()}), 201
    
    @app.route('/api/workers/<int:worker_id>', methods=['GET'])
    def get_worker(worker_id):
        worker = Worker.query.get_or_404(worker_id)
        return jsonify(worker.to_dict())
    
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
        
        # Update birthday if provided
        if 'birthday' in data:
            if data['birthday']:
                try:
                    worker.birthday = datetime.strptime(data['birthday'], '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({'error': 'Invalid birthday format. Use YYYY-MM-DD'}), 400
            else:
                worker.birthday = None
        
        # Update group if provided
        if 'group_id' in data:
            group_id = data['group_id']
            if group_id:
                group = Group.query.get(group_id)
                if not group or not group.is_active:
                    return jsonify({'error': 'Invalid group'}), 400
            worker.group_id = group_id
        
        # Update next_payment if provided (for salary payment processing)
        if 'next_payment' in data:
            if data['next_payment']:
                try:
                    new_next_payment = datetime.strptime(data['next_payment'], '%Y-%m-%d').date()
                    # If we're updating next_payment, mark all unpaid advances as paid
                    unpaid_advances = Advance.query.filter_by(
                        worker_id=worker_id,
                        is_paid_back=False
                    ).all()
                    
                    for advance in unpaid_advances:
                        advance.is_paid_back = True
                    
                    worker.next_payment = new_next_payment
                    
                except ValueError:
                    return jsonify({'error': 'Invalid next_payment format. Use YYYY-MM-DD'}), 400
            else:
                worker.next_payment = None
        
        db.session.commit()
        
        # Prepare response message
        message = 'Worker updated successfully'
        if 'next_payment' in data and data['next_payment']:
            marked_advances_count = len([a for a in Advance.query.filter_by(worker_id=worker_id, is_paid_back=True).all()])
            message += f'. Salary paid and {marked_advances_count} advances marked as paid back.'
        
        return jsonify({'message': message, 'worker': worker.to_dict()})
    
    @app.route('/api/workers/<int:worker_id>', methods=['DELETE'])
    def delete_worker(worker_id):
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        worker = Worker.query.get_or_404(worker_id)
        
        # Store original code for the response
        original_code = worker.code
        
        try:
            # HARD DELETE: Actually remove the worker from database
            # First, remove related data to avoid foreign key constraints
            
            # Delete work sessions
            WorkSession.query.filter_by(worker_id=worker_id).delete()
            
            # Delete advances
            Advance.query.filter_by(worker_id=worker_id).delete()
            
            # Delete loans and their payments
            loans = Loan.query.filter_by(worker_id=worker_id).all()
            for loan in loans:
                LoanPayment.query.filter_by(loan_id=loan.id).delete()
            Loan.query.filter_by(worker_id=worker_id).delete()
            
            # Remove worker from group leadership if they are a team leader
            if worker.is_team_leader:
                groups = Group.query.filter_by(team_leader_id=worker_id).all()
                for group in groups:
                    group.team_leader_id = None
            
            # Remove worker from any group
            if worker.group_id:
                worker.group_id = None
            
            # Finally, delete the worker
            db.session.delete(worker)
            db.session.commit()
            
            return jsonify({
                'message': f'Worker {original_code} permanently deleted',
                'note': 'Worker code is now available for immediate reuse'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to delete worker: {str(e)}'}), 500
    
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
        amount = data.get('amount')
        
        # Validate worker
        worker = Worker.query.get_or_404(worker_id)
        if not worker.is_active:
            return jsonify({'error': 'Worker is not active'}), 400
        
        # Validate amount
        if not amount or amount <= 0:
            return jsonify({'error': 'Invalid advance amount'}), 400
        
        # Calculate total unpaid advances for this worker
        unpaid_advances = Advance.query.filter_by(
            worker_id=worker_id,
            is_paid_back=False
        ).all()
        total_unpaid_advances = sum(advance.amount for advance in unpaid_advances)
        
        # Check if new advance + existing unpaid advances would exceed salary
        if (total_unpaid_advances + amount) > worker.salary:
            return jsonify({
                'error': f'Total unpaid advances ({total_unpaid_advances + amount} DA) would exceed worker salary ({worker.salary} DA). Current unpaid: {total_unpaid_advances} DA'
            }), 400
        
        advance = Advance(
            worker_id=worker_id,
            amount=amount,
            reason=data.get('reason'),
            date_given=date.today()
        )
        
        db.session.add(advance)
        db.session.commit()
        
        return jsonify({
            'message': f'Advance of {advance.amount} DA given to {worker.name}',
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
    
    # LOAN MANAGEMENT (DOUYOUN)
    
    @app.route('/api/loans', methods=['GET'])
    def get_loans():
        loans = Loan.query.order_by(Loan.date_given.desc()).all()
        return jsonify([loan.to_dict() for loan in loans])
    
    @app.route('/api/loans', methods=['POST'])
    def create_loan():
        try:
            if not check_admin_pin():
                return jsonify({'error': 'Invalid admin PIN'}), 401
            
            data = request.json
            worker_id = data.get('worker_id')
            
            # Validate worker
            worker = Worker.query.get_or_404(worker_id)
            if not worker.is_active:
                return jsonify({'error': 'Worker is not active'}), 400
            
            # Validate amount
            amount = data.get('amount')
            if not amount or amount <= 0:
                return jsonify({'error': 'Invalid loan amount'}), 400
            
            # Create loan with proper initialization
            loan = Loan(
                worker_id=worker_id,
                total_amount=float(amount),
                reason=data.get('reason')
            )
            
            # Manually set the date since we're using date.today()
            loan.date_given = date.today()
            
            db.session.add(loan)
            db.session.commit()
            
            return jsonify({
                'message': f'Loan of {loan.total_amount} DA given to {worker.name}',
                'loan': loan.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Error creating loan: {str(e)}")
            return jsonify({'error': f'Internal server error: {str(e)}'}), 500
    
    @app.route('/api/loans/<int:worker_id>/worker', methods=['GET'])
    def get_worker_loans(worker_id):
        loans = Loan.query.filter_by(worker_id=worker_id).order_by(Loan.date_given.desc()).all()
        return jsonify([loan.to_dict() for loan in loans])
    
    @app.route('/api/loans/<int:loan_id>/payments', methods=['GET'])
    def get_loan_payments(loan_id):
        loan = Loan.query.get_or_404(loan_id)
        payments = LoanPayment.query.filter_by(loan_id=loan_id).order_by(LoanPayment.payment_date.desc()).all()
        return jsonify({
            'loan': loan.to_dict(),
            'payments': [payment.to_dict() for payment in payments]
        })
    
    @app.route('/api/loans/<int:loan_id>/payment', methods=['POST'])
    def add_loan_payment(loan_id):
        if not check_admin_pin():
            return jsonify({'error': 'Invalid admin PIN'}), 401
        
        loan = Loan.query.get_or_404(loan_id)
        data = request.json
        
        payment_amount = data.get('payment_amount')
        if not payment_amount or payment_amount <= 0:
            return jsonify({'error': 'Invalid payment amount'}), 400
        
        if payment_amount > loan.remaining_balance:
            return jsonify({'error': 'Payment amount exceeds remaining balance'}), 400
        
        # Create payment record
        payment = LoanPayment(
            loan_id=loan_id,
            payment_amount=payment_amount,
            payment_date=date.today(),
            notes=data.get('notes')
        )
        
        # Update loan balance
        loan.amount_paid_back += payment_amount
        loan.remaining_balance -= payment_amount
        
        # Mark as fully paid if balance is zero
        if loan.remaining_balance <= 0.01:  # Account for floating point precision
            loan.remaining_balance = 0
            loan.is_fully_paid = True
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            'message': f'Payment of {payment_amount} DA recorded successfully',
            'payment': payment.to_dict(),
            'updated_loan': loan.to_dict()
        }), 201
    
    # PAYMENT CALCULATIONS
    
    @app.route('/api/payments/summary', methods=['GET'])
    def payment_summary():
        from sqlalchemy import extract, and_
        today = date.today()
        current_year = today.year
        current_month = today.month
        next_month = (today.replace(day=28) + relativedelta(days=4)).replace(day=1)

        workers = Worker.query.filter_by(is_active=True).all()
        summary = []
        total_earned_payroll = 0
        total_advances_given = 0
        total_final_payments = 0

        # New monthly fields
        total_loans_this_month = 0
        total_advances_this_month = 0
        total_paid_to_workers_this_month = 0
        total_loans_given = 0  # All time total loans

        # Get all advances and loans for this month
        advances_this_month = Advance.query.filter(
            extract('year', Advance.date_given) == current_year,
            extract('month', Advance.date_given) == current_month
        ).all()
        loans_this_month = Loan.query.filter(
            extract('year', Loan.date_given) == current_year,
            extract('month', Loan.date_given) == current_month
        ).all()
        
        # Calculate totals
        total_advances_this_month = sum(a.amount for a in advances_this_month)
        total_loans_this_month = sum(l.total_amount for l in loans_this_month)
        
        # Calculate all-time total loans
        all_loans = Loan.query.all()
        total_loans_given = sum(l.total_amount for l in all_loans)

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

            # Calculate unpaid advances (old logic)
            unpaid_advances = Advance.query.filter_by(
                worker_id=worker.id,
                is_paid_back=False
            ).all()
            total_advances = sum(advance.amount for advance in unpaid_advances)

            # Calculate advances for this month for this worker
            advances_for_worker_this_month = [a for a in advances_this_month if a.worker_id == worker.id]
            advances_this_worker_month = sum(a.amount for a in advances_for_worker_this_month)

            # Fixed monthly salary calculation (attendance tracked but not affecting pay)
            required_hours = 160  # Still tracked for attendance monitoring
            earned_salary = worker.salary  # Always full salary regardless of hours
            completion_percentage = round((total_hours / required_hours) * 100, 1) if required_hours > 0 else 100

            # Calculate final payment (old logic)
            final_payment = max(0, earned_salary - total_advances)
            remaining_debt = max(0, total_advances - earned_salary)

            # Determine payment status (based on advances only, not hours)
            if total_advances == 0:
                payment_status = "full_salary_no_advances"
            elif total_advances <= earned_salary:
                payment_status = "full_salary_with_advances"
            else:
                payment_status = "full_salary_excess_advances"

            # --- NEW: Check if worker is paid this month ---
            # A worker is considered paid if their next_payment is in the next month
            is_paid_this_month = False
            if worker.next_payment:
                # next_payment is a date object
                np = worker.next_payment
                # If next_payment is in the next month (relative to today)
                if np.year == next_month.year and np.month == next_month.month:
                    is_paid_this_month = True
            
            # Calculate actual payment amount according to new logic
            if is_paid_this_month:
                # Check if this is the hire month (don't count salary if hired this month)
                hire_month = worker.hire_date.month
                hire_year = worker.hire_date.year
                
                if current_month == hire_month and current_year == hire_year:
                    # Hire month - don't count salary payment, only advances
                    amount_paid = 0
                else:
                    # Not hire month - calculate actual payment
                    # Get all advances since previous payment day (not just this month)
                    # This is the actual amount company paid on payment day
                    prev_payment_date = np - relativedelta(months=1)
                    advances_since_last_payment = Advance.query.filter(
                        Advance.worker_id == worker.id,
                        Advance.date_given >= prev_payment_date,
                        Advance.date_given < np
                    ).all()
                    total_advances_since_last_payment = sum(a.amount for a in advances_since_last_payment)
                    amount_paid = max(0, earned_salary - total_advances_since_last_payment)
                
                total_paid_to_workers_this_month += amount_paid

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
                    'remaining_debt': round(remaining_debt, 2),
                    'advances_this_month': round(advances_this_worker_month, 2),
                },
                'payment_status': payment_status,
                'unpaid_advances_count': len(unpaid_advances),
                'is_paid_this_month': is_paid_this_month
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
                'total_workers': len(summary),
                # New fields:
                'total_loans_this_month': round(total_loans_this_month, 2),
                'total_advances_this_month': round(total_advances_this_month, 2),
                'total_paid_to_workers_this_month': round(total_paid_to_workers_this_month, 2),
                'total_loans_given': round(total_loans_given, 2)  # All time total loans
            },
            'system_info': {
                'required_hours_per_month': 160,
                'payment_formula': 'Fixed monthly salary (hours tracked for attendance only)',
                'cycle_calculation': 'Based on individual hire dates (e.g., 15th to 15th)',
                'advance_policy': 'Advances deducted from monthly salary',
                'attendance_tracking': 'Clock in/out maintained for monitoring purposes'
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
