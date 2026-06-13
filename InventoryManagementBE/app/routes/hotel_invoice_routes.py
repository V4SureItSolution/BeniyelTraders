from flask import Blueprint, request, jsonify
from app import db
from app.models.hotel_invoice import HotelInvoice, HotelInvoiceItem
from app.models.product import Product
from app.models.buyer import Buyer
from datetime import datetime, timedelta
from sqlalchemy import func
import traceback

hotel_invoice_bp = Blueprint('hotel_invoice', __name__)

def generate_hotel_invoice_number():
    """Generate a unique hotel invoice number"""
    try:
        today = datetime.now()
        date_str = today.strftime('%Y%m%d')
        
        # Count invoices created today
        count = HotelInvoice.query.filter(
            func.date(HotelInvoice.created_at) == today.date()
        ).count()
        
        seq = str(count + 1).zfill(3)
        return f"HTL-{date_str}-{seq}"
    except Exception as e:
        print(f"Error generating hotel invoice number: {str(e)}")
        return f"HTL-{datetime.now().strftime('%Y%m%d%H%M%S')}"

# ------------------ GET ALL HOTEL INVOICES ------------------
@hotel_invoice_bp.route('/hotel-invoices', methods=['GET'])
def get_hotel_invoices():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        hotel_name = request.args.get('hotel_name')
        customer_name = request.args.get('customer_name')
        payment_status = request.args.get('payment_status')
        
        query = HotelInvoice.query
        
        if hotel_name:
            query = query.filter(HotelInvoice.hotel_name.ilike(f'%{hotel_name}%'))
        if customer_name:
            query = query.filter(HotelInvoice.customer_name.ilike(f'%{customer_name}%'))
        if payment_status:
            query = query.filter(HotelInvoice.payment_status == payment_status)
            
        query = query.order_by(HotelInvoice.created_at.desc())
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'items': [invoice.to_dict() for invoice in paginated.items],
            'total': paginated.total,
            'page': page,
            'per_page': per_page,
            'pages': paginated.pages
        }), 200
        
    except Exception as e:
        print(f"Error in get_hotel_invoices: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ------------------ GET SINGLE HOTEL INVOICE ------------------
@hotel_invoice_bp.route('/hotel-invoices/<int:id>', methods=['GET'])
def get_hotel_invoice(id):
    try:
        invoice = HotelInvoice.query.get(id)
        if not invoice:
            return jsonify({'success': False, 'error': 'Hotel invoice not found'}), 404
            
        return jsonify({
            'success': True,
            'invoice': invoice.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ------------------ CREATE HOTEL INVOICE ------------------
@hotel_invoice_bp.route('/hotel-invoices', methods=['POST', 'OPTIONS'])
def create_hotel_invoice():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.json
        print("Received hotel invoice data:", data)
        
        if not data.get('hotel_name'):
            return jsonify({'success': False, 'error': 'Hotel name is required'}), 400
        if not data.get('customer_name'):
            return jsonify({'success': False, 'error': 'Customer name is required'}), 400
        if not data.get('items') or len(data['items']) == 0:
            return jsonify({'success': False, 'error': 'At least one item is required'}), 400
            
        try:
            invoice_date = datetime.strptime(
                data.get('invoice_date', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d'
            ).date()
        except (ValueError, TypeError):
            invoice_date = datetime.now().date()
            
        try:
            due_date = datetime.strptime(
                data.get('due_date', (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')), '%Y-%m-%d'
            ).date()
        except (ValueError, TypeError):
            due_date = (datetime.now() + timedelta(days=30)).date()
            
        is_inter_state = data.get('is_inter_state', False)
        
        invoice = HotelInvoice(
            invoice_number=generate_hotel_invoice_number(),
            hotel_name=data['hotel_name'].strip(),
            hotel_address=data.get('hotel_address', '').strip(),
            customer_name=data['customer_name'].strip(),
            customer_phone=data.get('customer_phone', '').strip(),
            buyer_id=data.get('buyer_id'),
            invoice_date=invoice_date,
            due_date=due_date,
            discount_type=data.get('discount_type', 'fixed'),
            discount_rate=float(data.get('discount_rate', 0)),
            payment_method=data.get('payment_method', 'cash'),
            payment_status=data.get('payment_status', 'unpaid'),
            notes=data.get('notes', ''),
            paid_amount=float(data.get('paid_amount', 0))
        )
        
        db.session.add(invoice)
        db.session.flush()  # Flush to get the ID
        
        for item_data in data['items']:
            if not item_data.get('productId') and not item_data.get('product_id'):
                db.session.rollback()
                return jsonify({'success': False, 'error': 'Product ID is required for each item'}), 400
                
            prod_id = item_data.get('productId') or item_data.get('product_id')
            product = Product.query.get(prod_id)
            if not product:
                db.session.rollback()
                return jsonify({'success': False, 'error': f"Product with ID {prod_id} not found"}), 400
                
            try:
                quantity = int(item_data.get('quantity', 1))
                default_price = product.sell_price if product.sell_price else 0
                price = float(item_data.get('price', default_price))
            except (ValueError, TypeError) as e:
                db.session.rollback()
                return jsonify({'success': False, 'error': f'Invalid quantity or price format: {str(e)}'}), 400
                
            # Check stock
            if product.quantity < quantity:
                db.session.rollback()
                return jsonify({'success': False, 'error': f"Insufficient stock for {product.name}. Available: {product.quantity}"}), 400
                
            # Create Invoice Item
            item = HotelInvoiceItem(
                hotel_invoice_id=invoice.id,
                product_id=product.id,
                product_name=product.name,
                product_model=product.model or '',
                price=price,
                quantity=quantity,
                gst_rate=float(item_data.get('gst_rate') or item_data.get('gst') or 0)
            )
            item.calculate_totals(is_inter_state)
            
            # Decrease stock
            product.quantity -= quantity
            if hasattr(product, 'calculate_values'):
                product.calculate_values()
                
            db.session.add(item)
            
        invoice.calculate_totals()
        
        if invoice.payment_status == 'paid':
            invoice.payment_date = datetime.now()
            invoice.paid_amount = invoice.total
            
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Hotel invoice created successfully',
            'invoice': invoice.to_dict(),
            'invoice_number': invoice.invoice_number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating hotel invoice: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ------------------ UPDATE HOTEL INVOICE PAYMENT ------------------
@hotel_invoice_bp.route('/hotel-invoices/<int:id>/payment', methods=['PATCH'])
def update_hotel_invoice_payment(id):
    try:
        invoice = HotelInvoice.query.get(id)
        if not invoice:
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404
            
        data = request.json
        payment_status = data.get('payment_status') or data.get('paymentStatus')
        payment_method = data.get('payment_method') or data.get('paymentMethod')
        paid_amount = data.get('paid_amount') or data.get('paidAmount')
        
        if payment_status:
            invoice.payment_status = payment_status
            if payment_status == 'paid':
                invoice.payment_date = datetime.now()
                invoice.paid_amount = invoice.total
                
        if payment_method:
            invoice.payment_method = payment_method
            
        if paid_amount is not None:
            invoice.paid_amount = float(paid_amount)
            if invoice.paid_amount >= invoice.total:
                invoice.payment_status = 'paid'
                invoice.payment_date = datetime.now()
            elif invoice.paid_amount > 0:
                invoice.payment_status = 'partial'
            else:
                invoice.payment_status = 'unpaid'
                
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Payment details updated successfully',
            'invoice': invoice.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ------------------ DELETE HOTEL INVOICE ------------------
@hotel_invoice_bp.route('/hotel-invoices/<int:id>', methods=['DELETE'])
def delete_hotel_invoice(id):
    try:
        invoice = HotelInvoice.query.get(id)
        if not invoice:
            return jsonify({'success': False, 'error': 'Invoice not found'}), 404
            
        # Restore product stock
        for item in invoice.items:
            product = Product.query.get(item.product_id)
            if product:
                product.quantity += item.quantity
                if hasattr(product, 'calculate_values'):
                    product.calculate_values()
                    
        db.session.delete(invoice)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Hotel invoice deleted and stock restored successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
