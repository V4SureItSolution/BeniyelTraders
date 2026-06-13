from app import db
from datetime import datetime

class HotelInvoice(db.Model):
    __tablename__ = 'hotel_invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    
    # Hotel and Customer details
    hotel_name = db.Column(db.String(150), nullable=False)
    hotel_address = db.Column(db.Text, nullable=True)
    customer_name = db.Column(db.String(100), nullable=False)
    customer_phone = db.Column(db.String(20), nullable=True)
    
    # Link to registered buyer (optional)
    buyer_id = db.Column(db.Integer, db.ForeignKey('buyers.id'), nullable=True)
    
    # Invoice details
    invoice_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    due_date = db.Column(db.Date, nullable=False)
    
    # Financial details
    subtotal = db.Column(db.Float, default=0.0)
    discount = db.Column(db.Float, default=0.0)
    discount_type = db.Column(db.String(20), default='fixed')
    discount_rate = db.Column(db.Float, default=0.0)
    
    # Tax details
    cgst_total = db.Column(db.Float, default=0.0)
    sgst_total = db.Column(db.Float, default=0.0)
    igst_total = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, default=0.0)
    
    # Payment details
    paid_amount = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(20), default='cash')
    payment_status = db.Column(db.String(20), default='unpaid')  # unpaid, paid, partial
    payment_date = db.Column(db.DateTime, nullable=True)
    
    notes = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    items = db.relationship('HotelInvoiceItem', backref='hotel_invoice', lazy=True, cascade='all, delete-orphan')
    buyer = db.relationship('Buyer')

    def calculate_totals(self):
        """Calculate subtotal, tax totals, and final total"""
        if not self.items:
            self.items = []
        
        self.subtotal = sum(float(item.total) for item in self.items if item.total)
        
        if self.discount_type == 'percentage':
            self.discount = (self.subtotal * float(self.discount_rate)) / 100
        else:
            self.discount = min(float(self.discount_rate), self.subtotal)
        
        taxable_amount = self.subtotal - self.discount
        
        self.cgst_total = sum(float(item.cgst) for item in self.items if item.cgst)
        self.sgst_total = sum(float(item.sgst) for item in self.items if item.sgst)
        self.igst_total = sum(float(item.igst) for item in self.items if item.igst)
        
        self.total = taxable_amount + self.cgst_total + self.sgst_total + self.igst_total
        
        self.subtotal = round(self.subtotal, 2)
        self.discount = round(self.discount, 2)
        self.cgst_total = round(self.cgst_total, 2)
        self.sgst_total = round(self.sgst_total, 2)
        self.igst_total = round(self.igst_total, 2)
        self.total = round(self.total, 2)
        
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'hotel_name': self.hotel_name,
            'hotel_address': self.hotel_address or '',
            'customer_name': self.customer_name,
            'customer_phone': self.customer_phone or '',
            'buyer_id': self.buyer_id,
            'buyer_name': self.buyer.name if self.buyer else None,
            'invoice_date': self.invoice_date.isoformat() if self.invoice_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'subtotal': float(self.subtotal),
            'discount': float(self.discount),
            'discount_type': self.discount_type,
            'discount_rate': float(self.discount_rate),
            'cgst_total': float(self.cgst_total),
            'sgst_total': float(self.sgst_total),
            'igst_total': float(self.igst_total),
            'total': float(self.total),
            'paid_amount': float(self.paid_amount),
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'notes': self.notes or '',
            'items': [item.to_dict() for item in self.items],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class HotelInvoiceItem(db.Model):
    __tablename__ = 'hotel_invoice_items'
    
    id = db.Column(db.Integer, primary_key=True)
    hotel_invoice_id = db.Column(db.Integer, db.ForeignKey('hotel_invoices.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    
    product_name = db.Column(db.String(100), nullable=False)
    product_model = db.Column(db.String(50), default='')
    price = db.Column(db.Float, nullable=False, default=0.0)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    gst_rate = db.Column(db.Float, default=0.0)
    
    cgst = db.Column(db.Float, default=0.0)
    sgst = db.Column(db.Float, default=0.0)
    igst = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, nullable=False, default=0.0)
    
    # Relationship
    product = db.relationship('Product')
    
    def calculate_totals(self, is_inter_state=False):
        item_total = float(self.price) * int(self.quantity)
        self.total = round(item_total, 2)
        
        if self.gst_rate and self.gst_rate > 0:
            taxable_value = (item_total * 100) / (100 + float(self.gst_rate))
            gst_amount = item_total - taxable_value
            
            if is_inter_state:
                self.igst = round(gst_amount, 2)
                self.cgst = 0.0
                self.sgst = 0.0
            else:
                self.cgst = round(gst_amount / 2, 2)
                self.sgst = round(gst_amount / 2, 2)
                self.igst = 0.0
        else:
            self.cgst = 0.0
            self.sgst = 0.0
            self.igst = 0.0
            
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'product_model': self.product_model or '',
            'price': float(self.price),
            'quantity': int(self.quantity),
            'gst_rate': float(self.gst_rate),
            'cgst': float(self.cgst),
            'sgst': float(self.sgst),
            'igst': float(self.igst),
            'total': float(self.total)
        }
