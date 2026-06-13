from app import db
from datetime import datetime

class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    document_type = db.Column(db.String(100), nullable=False)  # GST File, Food Licence File, IT Returns File, MSME Certificate File, Shop Rental Agreement File
    year = db.Column(db.String(50), nullable=True)  # Used for IT Returns year-wise upload (e.g. 2024-2025)
    expiry_date = db.Column(db.Date, nullable=True)  # Expiry date for alerts
    file_path = db.Column(db.String(255), nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "document_type": self.document_type,
            "year": self.year or "",
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "file_path": self.file_path,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
