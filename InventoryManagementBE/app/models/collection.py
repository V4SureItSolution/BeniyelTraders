from app import db
from datetime import datetime

class Collection(db.Model):
    __tablename__ = "collections"

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), nullable=False)  # references bill_number or invoice_number
    invoice_type = db.Column(db.String(50), nullable=False)  # 'bill', 'invoice', or 'hotel_invoice'
    customer_name = db.Column(db.String(100), nullable=True)
    customer_phone = db.Column(db.String(20), nullable=True)
    
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    amount_collected = db.Column(db.Float, nullable=False, default=0.0)
    outstanding_amount = db.Column(db.Float, nullable=False, default=0.0)
    
    collection_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    payment_mode = db.Column(db.String(50), nullable=True)  # Cash, UPI, Card, Cheque
    notes = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "invoice_type": self.invoice_type,
            "customer_name": self.customer_name or "",
            "customer_phone": self.customer_phone or "",
            "total_amount": self.total_amount,
            "amount_collected": self.amount_collected,
            "outstanding_amount": self.outstanding_amount,
            "collection_date": self.collection_date.isoformat() if self.collection_date else None,
            "payment_mode": self.payment_mode or "",
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
