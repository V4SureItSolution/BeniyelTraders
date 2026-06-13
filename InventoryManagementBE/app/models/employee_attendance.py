# app/models/employee_attendance.py
from app import db
from datetime import datetime, date

class EmployeeAttendance(db.Model):
    """Employee Attendance Model - admin managed per employee"""
    __tablename__ = 'employee_attendance'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)

    # Status: present, absent, half_day, permission, paid_leave
    status = db.Column(db.String(20), nullable=False, default='present')

    notes = db.Column(db.Text, nullable=True)
    marked_by = db.Column(db.String(100), nullable=True)  # admin who marked

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    employee = db.relationship('Employee', backref='attendance_records', lazy=True)

    __table_args__ = (
        db.UniqueConstraint('employee_id', 'date', name='unique_employee_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.full_name if self.employee else '',
            'employee_code': self.employee.employee_id if self.employee else '',
            'department': self.employee.department if self.employee else '',
            'date': self.date.isoformat() if self.date else None,
            'status': self.status,
            'notes': self.notes,
            'marked_by': self.marked_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<EmployeeAttendance {self.employee_id} - {self.date} - {self.status}>'
