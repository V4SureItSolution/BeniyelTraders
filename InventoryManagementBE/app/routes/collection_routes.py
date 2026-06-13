from flask import Blueprint, request, jsonify
from app import db
from app.models.collection import Collection
from app.models.billing import Bill
from app.models.invoice import Invoice
from app.models.hotel_invoice import HotelInvoice
from datetime import datetime, date
import traceback

collection_bp = Blueprint("collection_bp", __name__)

# ------------------ GET OUTSTANDING INVOICES/BILLS ------------------
@collection_bp.route("/collections/outstanding", methods=["GET"])
def get_outstanding_invoices():
    try:
        outstanding_items = []
        
        # 1. Fetch outstanding Bills
        bills = Bill.query.filter(Bill.payment_status != 'paid').all()
        for b in bills:
            outstanding_bal = b.total - b.paid_amount
            if outstanding_bal > 0.01:  # ignore small floating differences
                outstanding_items.append({
                    "id": b.id,
                    "invoice_number": b.bill_number,
                    "invoice_type": "bill",
                    "date": b.created_at.date().isoformat() if b.created_at else None,
                    "customer_name": b.customer_name,
                    "customer_phone": b.customer_phone or "",
                    "total_amount": round(b.total, 2),
                    "paid_amount": round(b.paid_amount, 2),
                    "outstanding_amount": round(outstanding_bal, 2)
                })
                
        # 2. Fetch outstanding Invoices
        invoices = Invoice.query.filter(Invoice.payment_status != 'paid').all()
        for inv in invoices:
            outstanding_bal = inv.total - inv.paid_amount
            if outstanding_bal > 0.01:
                outstanding_items.append({
                    "id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "invoice_type": "invoice",
                    "date": inv.invoice_date.isoformat() if inv.invoice_date else None,
                    "customer_name": inv.customer_name,
                    "customer_phone": inv.customer_phone or "",
                    "total_amount": round(inv.total, 2),
                    "paid_amount": round(inv.paid_amount, 2),
                    "outstanding_amount": round(outstanding_bal, 2)
                })
                
        # 3. Fetch outstanding Hotel Invoices
        hotel_invs = HotelInvoice.query.filter(HotelInvoice.payment_status != 'paid').all()
        for h in hotel_invs:
            outstanding_bal = h.total - h.paid_amount
            if outstanding_bal > 0.01:
                outstanding_items.append({
                    "id": h.id,
                    "invoice_number": h.invoice_number,
                    "invoice_type": "hotel_invoice",
                    "date": h.invoice_date.isoformat() if h.invoice_date else None,
                    "customer_name": h.customer_name,
                    "customer_phone": h.customer_phone or "",
                    "total_amount": round(h.total, 2),
                    "paid_amount": round(h.paid_amount, 2),
                    "outstanding_amount": round(outstanding_bal, 2)
                })
                
        # Sort by date descending
        outstanding_items.sort(key=lambda x: x['date'] or '', reverse=True)
        
        return jsonify({
            "success": True,
            "outstanding": outstanding_items
        }), 200
        
    except Exception as e:
        print(f"Error getting outstanding invoices: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# ------------------ GET COLLECTION HISTORY ------------------
@collection_bp.route("/collections", methods=["GET"])
def get_collections():
    try:
        collections = Collection.query.order_by(Collection.collection_date.desc(), Collection.created_at.desc()).all()
        return jsonify({
            "success": True,
            "collections": [c.to_dict() for c in collections]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ COLLECT CASH (RECORD TRANSACTION) ------------------
@collection_bp.route("/collections", methods=["POST"])
def record_collection():
    try:
        data = request.get_json()
        if not data or not data.get('invoice_number') or not data.get('invoice_type') or not data.get('amount_collected'):
            return jsonify({"success": False, "error": "Invoice number, type and amount collected are required"}), 400
            
        inv_num = data['invoice_number'].strip()
        inv_type = data['invoice_type'].strip()
        amt_collected = float(data['amount_collected'])
        
        if amt_collected <= 0:
            return jsonify({"success": False, "error": "Collected amount must be greater than zero"}), 400
            
        # 1. Update the original invoice / bill balance
        target_obj = None
        
        if inv_type == 'bill':
            target_obj = Bill.query.filter_by(bill_number=inv_num).first()
        elif inv_type == 'invoice':
            target_obj = Invoice.query.filter_by(invoice_number=inv_num).first()
        elif inv_type == 'hotel_invoice':
            target_obj = HotelInvoice.query.filter_by(invoice_number=inv_num).first()
            
        if not target_obj:
            return jsonify({"success": False, "error": f"Invoice/Bill {inv_num} not found"}), 404
            
        # Calculate new paid amount
        old_paid = target_obj.paid_amount or 0.0
        total = target_obj.total or 0.0
        new_paid = old_paid + amt_collected
        
        if new_paid > total + 0.01:
            return jsonify({"success": False, "error": f"Collected amount exceeds outstanding balance. Outstanding: {round(total - old_paid, 2)}"}), 400
            
        target_obj.paid_amount = round(new_paid, 2)
        
        # Update payment status
        if new_paid >= total - 0.01:
            target_obj.payment_status = 'paid'
            target_obj.payment_date = datetime.now()
        else:
            target_obj.payment_status = 'partial'
            
        # 2. Record the Collection transaction log
        c_date = datetime.strptime(data.get('collection_date'), "%Y-%m-%d").date() if data.get('collection_date') else date.today()
        
        collection = Collection(
            invoice_number=inv_num,
            invoice_type=inv_type,
            customer_name=data.get('customer_name', '').strip(),
            customer_phone=data.get('customer_phone', '').strip(),
            total_amount=total,
            amount_collected=amt_collected,
            outstanding_amount=round(total - new_paid, 2),
            collection_date=c_date,
            payment_mode=data.get('payment_mode', 'Cash').strip(),
            notes=data.get('notes', '').strip() if data.get('notes') else None
        )
        
        db.session.add(collection)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Collection recorded successfully",
            "collection": collection.to_dict(),
            "new_outstanding": round(total - new_paid, 2),
            "new_payment_status": target_obj.payment_status
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error recording collection: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
