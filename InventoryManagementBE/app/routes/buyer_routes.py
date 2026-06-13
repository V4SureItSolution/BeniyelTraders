from flask import Blueprint, request, jsonify
from app.models.buyer import Buyer
from app.models.billing import Bill
from app import db
from sqlalchemy import or_

buyer_bp = Blueprint("buyer_bp", __name__)

# ------------------ GET ALL BUYERS ------------------
@buyer_bp.route("/buyers", methods=["GET"])
def get_buyers():
    try:
        buyers = Buyer.query.order_by(Buyer.name.asc()).all()
        return jsonify({
            "success": True,
            "buyers": [b.to_dict() for b in buyers]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ SEARCH BUYERS ------------------
@buyer_bp.route("/buyers/search", methods=["GET"])
def search_buyers():
    try:
        q = request.args.get('q', '').strip()
        if not q:
            return jsonify([]), 200
        
        # Search by name, phone, email, or company name
        buyers = Buyer.query.filter(
            or_(
                Buyer.name.ilike(f'%{q}%'),
                Buyer.phone.ilike(f'%{q}%'),
                Buyer.company_name.ilike(f'%{q}%'),
                Buyer.gstin.ilike(f'%{q}%')
            )
        ).limit(10).all()
        
        return jsonify([b.to_dict() for b in buyers]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ------------------ GET CUSTOMER BY PHONE (OVERRIDE DYNAMIC OR REGISTERED) ------------------
@buyer_bp.route("/billing/customer/<string:phone_number>", methods=["GET"])
def get_customer_by_phone_override(phone_number):
    """Get customer details, checking registered buyers first, falling back to bill history"""
    try:
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
        
        # 1. Check if registered buyer exists
        registered_buyer = Buyer.query.filter_by(phone=phone_number).first()
        if registered_buyer:
            return jsonify({
                'exists': True,
                'customer': {
                    'name': registered_buyer.name,
                    'phone': registered_buyer.phone,
                    'email': registered_buyer.email or '',
                    'gst': registered_buyer.gstin or '',
                    'address': registered_buyer.address or '',
                    'type': 'regular',  # compatible with existing frontend checks
                    'is_registered': True,
                    'company_name': registered_buyer.company_name or '',
                    'pan': registered_buyer.pan or '',
                    'state': registered_buyer.state or '',
                    'payment_terms': registered_buyer.payment_terms or '',
                    'credit_limit': registered_buyer.credit_limit or 0.0,
                    'shipping_address': registered_buyer.shipping_address or ''
                }
            }), 200
            
        # 2. Fallback to existing bill history (walk-in customers)
        existing_customer = Bill.query.filter_by(customer_phone=phone_number).order_by(Bill.created_at.desc()).first()
        if existing_customer:
            return jsonify({
                'exists': True,
                'customer': {
                    'name': existing_customer.customer_name,
                    'phone': existing_customer.customer_phone,
                    'email': existing_customer.customer_email or '',
                    'gst': existing_customer.customer_gst or '',
                    'address': existing_customer.customer_address or '',
                    'type': existing_customer.customer_type or 'regular',
                    'is_registered': False
                }
            }), 200
        else:
            return jsonify({
                'exists': False,
                'customer': None
            }), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ------------------ CREATE BUYER ------------------
@buyer_bp.route("/buyers", methods=["POST"])
def create_buyer():
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({"success": False, "error": "Buyer name is required"}), 400
            
        # Check if phone number already exists in registered buyers (if phone is provided)
        phone = data.get('phone', '').strip()
        if phone:
            existing = Buyer.query.filter_by(phone=phone).first()
            if existing:
                return jsonify({"success": False, "error": "A buyer with this phone number is already registered"}), 400
                
        buyer = Buyer(
            name=data['name'].strip(),
            phone=phone if phone else None,
            email=data.get('email', '').strip() if data.get('email') else None,
            gstin=data.get('gstin', '').strip().upper() if data.get('gstin') else None,
            address=data.get('address', '').strip() if data.get('address') else None,
            company_name=data.get('company_name', '').strip() if data.get('company_name') else None,
            pan=data.get('pan', '').strip().upper() if data.get('pan') else None,
            state=data.get('state', '').strip() if data.get('state') else None,
            payment_terms=data.get('payment_terms', '').strip() if data.get('payment_terms') else None,
            credit_limit=float(data.get('credit_limit', 0.0)) if data.get('credit_limit') else 0.0,
            shipping_address=data.get('shipping_address', '').strip() if data.get('shipping_address') else None
        )
        
        db.session.add(buyer)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Buyer registered successfully",
            "buyer": buyer.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ UPDATE BUYER ------------------
@buyer_bp.route("/buyers/<int:buyer_id>", methods=["PUT"])
def update_buyer(buyer_id):
    try:
        buyer = Buyer.query.get_or_404(buyer_id)
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
            
        # Check unique phone
        phone = data.get('phone', '').strip()
        if phone and phone != buyer.phone:
            existing = Buyer.query.filter_by(phone=phone).first()
            if existing:
                return jsonify({"success": False, "error": "A buyer with this phone number is already registered"}), 400
        
        if 'name' in data:
            buyer.name = data['name'].strip()
        if 'phone' in data:
            buyer.phone = phone if phone else None
        if 'email' in data:
            buyer.email = data['email'].strip() if data['email'] else None
        if 'gstin' in data:
            buyer.gstin = data['gstin'].strip().upper() if data['gstin'] else None
        if 'address' in data:
            buyer.address = data['address'].strip() if data['address'] else None
        if 'company_name' in data:
            buyer.company_name = data['company_name'].strip() if data['company_name'] else None
        if 'pan' in data:
            buyer.pan = data['pan'].strip().upper() if data['pan'] else None
        if 'state' in data:
            buyer.state = data['state'].strip() if data['state'] else None
        if 'payment_terms' in data:
            buyer.payment_terms = data['payment_terms'].strip() if data['payment_terms'] else None
        if 'credit_limit' in data:
            buyer.credit_limit = float(data['credit_limit'])
        if 'shipping_address' in data:
            buyer.shipping_address = data['shipping_address'].strip() if data['shipping_address'] else None
            
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Buyer details updated successfully",
            "buyer": buyer.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ DELETE BUYER ------------------
@buyer_bp.route("/buyers/<int:buyer_id>", methods=["DELETE"])
def delete_buyer(buyer_id):
    try:
        buyer = Buyer.query.get_or_404(buyer_id)
        db.session.delete(buyer)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Buyer deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400
