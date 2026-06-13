from app import db
from datetime import datetime

class Buyer(db.Model):
    __tablename__ = "buyers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    email = db.Column(db.String(100), nullable=True)
    gstin = db.Column(db.String(50), nullable=True)
    address = db.Column(db.Text, nullable=True)
    
    # Buyer-specific fields
    company_name = db.Column(db.String(150), nullable=True)
    pan = db.Column(db.String(50), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    payment_terms = db.Column(db.String(100), nullable=True)  # e.g., Net 30, COD
    credit_limit = db.Column(db.Float, default=0.0)
    shipping_address = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone or "",
            "email": self.email or "",
            "gstin": self.gstin or "",
            "address": self.address or "",
            "company_name": self.company_name or "",
            "pan": self.pan or "",
            "state": self.state or "",
            "payment_terms": self.payment_terms or "",
            "credit_limit": self.credit_limit or 0.0,
            "shipping_address": self.shipping_address or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
