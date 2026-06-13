# app/routes/hr_routes.py
# Handles Employee Attendance and Salary management (admin-side)

from flask import Blueprint, request, jsonify
from app import db
from app.models.employee import Employee
from app.models.employee_attendance import EmployeeAttendance
from datetime import datetime, date, timedelta
import traceback
import calendar

hr_bp = Blueprint('hr', __name__, url_prefix='/api/hr')


# ──────────────────────────────────────────────
#  ATTENDANCE ROUTES
# ──────────────────────────────────────────────

@hr_bp.route('/attendance/date', methods=['GET'])
def get_attendance_for_date():
    """
    Return attendance records for a given date.
    Auto-marks ALL active employees as 'present' if no record exists yet.
    Query param: date (YYYY-MM-DD), defaults to today.
    """
    try:
        date_str = request.args.get('date', date.today().isoformat())
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({'error': 'Invalid date format, use YYYY-MM-DD'}), 400

        employees = Employee.query.order_by(Employee.full_name).all()

        result = []
        for emp in employees:
            record = EmployeeAttendance.query.filter_by(
                employee_id=emp.id, date=target_date
            ).first()

            if record is None:
                # Auto-mark as present only for today and past dates
                if target_date <= date.today():
                    record = EmployeeAttendance(
                        employee_id=emp.id,
                        date=target_date,
                        status='present',
                        marked_by='system'
                    )
                    db.session.add(record)

            if record:
                result.append({
                    'attendance_id': record.id,
                    'employee_id': emp.id,
                    'employee_code': emp.employee_id,
                    'employee_name': emp.full_name,
                    'department': emp.department or '',
                    'designation': emp.designation or '',
                    'salary_per_day': round(emp.salary_per_day or 0, 2),
                    'date': target_date.isoformat(),
                    'status': record.status,
                    'notes': record.notes or '',
                })
            else:
                result.append({
                    'attendance_id': None,
                    'employee_id': emp.id,
                    'employee_code': emp.employee_id,
                    'employee_name': emp.full_name,
                    'department': emp.department or '',
                    'designation': emp.designation or '',
                    'salary_per_day': round(emp.salary_per_day or 0, 2),
                    'date': target_date.isoformat(),
                    'status': 'present',
                    'notes': '',
                })

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

        return jsonify({'date': target_date.isoformat(), 'records': result}), 200

    except Exception as e:
        db.session.rollback()
        print(f'get_attendance_for_date error: {e}')
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch attendance'}), 500


@hr_bp.route('/attendance/mark', methods=['POST'])
def mark_attendance():
    """Mark or update a single employee's attendance for a date."""
    try:
        data = request.get_json()
        employee_id = data.get('employee_id')
        date_str = data.get('date', date.today().isoformat())
        status = data.get('status', 'present')
        notes = data.get('notes', '')

        if status not in ('present', 'absent', 'half_day', 'permission', 'paid_leave'):
            return jsonify({'error': 'Invalid status'}), 400

        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400

        emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({'error': 'Employee not found'}), 404

        record = EmployeeAttendance.query.filter_by(
            employee_id=employee_id, date=target_date
        ).first()

        if record:
            record.status = status
            record.notes = notes
            record.marked_by = 'admin'
            record.updated_at = datetime.utcnow()
        else:
            record = EmployeeAttendance(
                employee_id=employee_id,
                date=target_date,
                status=status,
                notes=notes,
                marked_by='admin'
            )
            db.session.add(record)

        db.session.commit()
        return jsonify({'success': True, 'record': record.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        print(f'mark_attendance error: {e}')
        return jsonify({'error': 'Failed to mark attendance'}), 500


@hr_bp.route('/attendance/bulk-mark', methods=['POST'])
def bulk_mark_attendance():
    """Save all attendance records for a given date at once."""
    try:
        data = request.get_json()
        records = data.get('records', [])

        for rec in records:
            employee_id = rec.get('employee_id')
            date_str = rec.get('date', date.today().isoformat())
            status = rec.get('status', 'present')
            notes = rec.get('notes', '')

            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                continue

            if status not in ('present', 'absent', 'half_day', 'permission', 'paid_leave'):
                status = 'present'

            existing = EmployeeAttendance.query.filter_by(
                employee_id=employee_id, date=target_date
            ).first()

            if existing:
                existing.status = status
                existing.notes = notes
                existing.marked_by = 'admin'
                existing.updated_at = datetime.utcnow()
            else:
                new_rec = EmployeeAttendance(
                    employee_id=employee_id,
                    date=target_date,
                    status=status,
                    notes=notes,
                    marked_by='admin'
                )
                db.session.add(new_rec)

        db.session.commit()
        return jsonify({'success': True, 'message': f'Saved {len(records)} records'}), 200

    except Exception as e:
        db.session.rollback()
        print(f'bulk_mark_attendance error: {e}')
        return jsonify({'error': 'Failed to save attendance'}), 500


@hr_bp.route('/attendance/employee/<int:employee_id>', methods=['GET'])
def get_employee_attendance(employee_id):
    """Get attendance history for a specific employee with optional month/year filter."""
    try:
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)

        query = EmployeeAttendance.query.filter_by(employee_id=employee_id)

        if year and month:
            start = date(year, month, 1)
            _, last_day = calendar.monthrange(year, month)
            end = date(year, month, last_day)
            query = query.filter(
                EmployeeAttendance.date >= start,
                EmployeeAttendance.date <= end
            )

        records = query.order_by(EmployeeAttendance.date.desc()).all()
        return jsonify([r.to_dict() for r in records]), 200

    except Exception as e:
        print(f'get_employee_attendance error: {e}')
        return jsonify({'error': 'Failed to fetch attendance'}), 500


# ──────────────────────────────────────────────
#  SALARY ROUTES
# ──────────────────────────────────────────────

def calculate_salary_for_employee(emp, year, month):
    """Helper: calculate salary for an employee for a given month/year."""
    _, total_days_in_month = calendar.monthrange(year, month)
    working_days = total_days_in_month  # all calendar days are working days

    start = date(year, month, 1)
    end = date(year, month, total_days_in_month)

    records = EmployeeAttendance.query.filter(
        EmployeeAttendance.employee_id == emp.id,
        EmployeeAttendance.date >= start,
        EmployeeAttendance.date <= end
    ).all()

    status_map = {r.date.isoformat(): r.status for r in records}

    present_days = 0
    absent_days = 0
    half_days = 0
    permission_days = 0
    paid_leave_days = 0
    not_marked_days = 0

    for day_num in range(1, total_days_in_month + 1):
        d = date(year, month, day_num)
        if d > date.today():
            break  # Don't count future days
        status = status_map.get(d.isoformat(), 'present')  # auto-present
        if status == 'present':
            present_days += 1
        elif status == 'absent':
            absent_days += 1
        elif status == 'half_day':
            half_days += 1
            present_days += 0.5  # half day counts as 0.5
        elif status == 'permission':
            permission_days += 1
            present_days += 1  # permission = present for salary
        elif status == 'paid_leave':
            paid_leave_days += 1
            present_days += 1  # paid leave = paid
        else:
            not_marked_days += 1
            present_days += 1

    salary_per_day = emp.salary_per_day or 0
    gross_salary = round(present_days * salary_per_day, 2)

    return {
        'employee_id': emp.id,
        'employee_code': emp.employee_id,
        'employee_name': emp.full_name,
        'department': emp.department or '',
        'designation': emp.designation or '',
        'salary_per_day': salary_per_day,
        'year': year,
        'month': month,
        'month_name': calendar.month_name[month],
        'total_days': total_days_in_month,
        'present_days': present_days,
        'absent_days': absent_days,
        'half_days': half_days,
        'permission_days': permission_days,
        'paid_leave_days': paid_leave_days,
        'gross_salary': gross_salary,
        'deduction': round(absent_days * salary_per_day, 2),
        'net_salary': gross_salary,
    }


@hr_bp.route('/salary/month', methods=['GET'])
def get_salary_for_month():
    """Get salary summary for all employees for a given month/year."""
    try:
        year = request.args.get('year', type=int, default=date.today().year)
        month = request.args.get('month', type=int, default=date.today().month)

        if not (1 <= month <= 12):
            return jsonify({'error': 'Invalid month'}), 400
        if year < 2000 or year > 2100:
            return jsonify({'error': 'Invalid year'}), 400

        employees = Employee.query.order_by(Employee.full_name).all()
        salary_data = [calculate_salary_for_employee(emp, year, month) for emp in employees]

        total_payroll = sum(s['net_salary'] for s in salary_data)
        return jsonify({
            'year': year,
            'month': month,
            'month_name': calendar.month_name[month],
            'employees': salary_data,
            'total_payroll': round(total_payroll, 2)
        }), 200

    except Exception as e:
        print(f'get_salary_for_month error: {e}')
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to calculate salary'}), 500


@hr_bp.route('/salary/employee/<int:employee_id>', methods=['GET'])
def get_employee_salary(employee_id):
    """Get salary for a specific employee for a given month/year."""
    try:
        year = request.args.get('year', type=int, default=date.today().year)
        month = request.args.get('month', type=int, default=date.today().month)

        emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({'error': 'Employee not found'}), 404

        salary = calculate_salary_for_employee(emp, year, month)
        return jsonify(salary), 200

    except Exception as e:
        print(f'get_employee_salary error: {e}')
        return jsonify({'error': 'Failed to calculate salary'}), 500


@hr_bp.route('/employees/update-salary/<int:employee_id>', methods=['PUT'])
def update_employee_salary(employee_id):
    """Update salary_per_day for an employee."""
    try:
        data = request.get_json()
        salary_per_day = data.get('salary_per_day', 0)

        emp = Employee.query.get(employee_id)
        if not emp:
            return jsonify({'error': 'Employee not found'}), 404

        emp.salary_per_day = float(salary_per_day)
        db.session.commit()
        return jsonify({'success': True, 'salary_per_day': emp.salary_per_day}), 200

    except Exception as e:
        db.session.rollback()
        print(f'update_employee_salary error: {e}')
        return jsonify({'error': 'Failed to update salary'}), 500
