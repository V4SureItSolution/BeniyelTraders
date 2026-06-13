from app import db
from datetime import datetime

class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    title = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)  # e.g., Rent, Utilities, Salaries, Food, Travel, Miscellaneous
    amount = db.Column(db.Float, nullable=False)
    payment_mode = db.Column(db.String(50), nullable=False)  # Cash, UPI, Card, Net Banking
    notes = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.isoformat() if self.date else None,
            "title": self.title,
            "category": self.category,
            "amount": self.amount,
            "payment_mode": self.payment_mode,
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
