from flask import Blueprint, request, jsonify
from app.models.expense import Expense
from app import db
from datetime import datetime, date
from sqlalchemy import extract, func

expense_bp = Blueprint("expense_bp", __name__)

# ------------------ GET EXPENSES WITH FILTERS ------------------
@expense_bp.route("/expenses", methods=["GET"])
def get_expenses():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        category = request.args.get('category')
        payment_mode = request.args.get('payment_mode')
        month = request.args.get('month', type=int)  # 1-12
        year = request.args.get('year', type=int)
        
        query = Expense.query
        
        if start_date:
            query = query.filter(Expense.date >= datetime.strptime(start_date, "%Y-%m-%d").date())
        if end_date:
            query = query.filter(Expense.date <= datetime.strptime(end_date, "%Y-%m-%d").date())
        if category:
            query = query.filter(Expense.category == category)
        if payment_mode:
            query = query.filter(Expense.payment_mode == payment_mode)
        if month:
            query = query.filter(extract('month', Expense.date) == month)
        if year:
            query = query.filter(extract('year', Expense.date) == year)
            
        expenses = query.order_by(Expense.date.desc(), Expense.created_at.desc()).all()
        
        return jsonify({
            "success": True,
            "expenses": [e.to_dict() for e in expenses]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ GET EXPENSE STATISTICS ------------------
@expense_bp.route("/expenses/stats", methods=["GET"])
def get_expense_stats():
    try:
        month = request.args.get('month', datetime.utcnow().month, type=int)
        year = request.args.get('year', datetime.utcnow().year, type=int)
        
        # Monthly total
        monthly_total = db.session.query(func.sum(Expense.amount)).filter(
            extract('month', Expense.date) == month,
            extract('year', Expense.date) == year
        ).scalar() or 0.0
        
        # Daily total (today)
        today = date.today()
        daily_total = db.session.query(func.sum(Expense.amount)).filter(
            Expense.date == today
        ).scalar() or 0.0
        
        # Category breakdown for selected month/year
        category_breakdown = db.session.query(
            Expense.category,
            func.sum(Expense.amount).label('total')
        ).filter(
            extract('month', Expense.date) == month,
            extract('year', Expense.date) == year
        ).group_by(Expense.category).all()
        
        # Payment mode breakdown for selected month/year
        payment_breakdown = db.session.query(
            Expense.payment_mode,
            func.sum(Expense.amount).label('total')
        ).filter(
            extract('month', Expense.date) == month,
            extract('year', Expense.date) == year
        ).group_by(Expense.payment_mode).all()
        
        return jsonify({
            "success": True,
            "monthly_total": round(monthly_total, 2),
            "daily_total": round(daily_total, 2),
            "category_breakdown": [{"category": cb[0], "total": round(cb[1], 2)} for cb in category_breakdown],
            "payment_breakdown": [{"payment_mode": pb[0], "total": round(pb[1], 2)} for pb in payment_breakdown]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ CREATE EXPENSE ------------------
@expense_bp.route("/expenses", methods=["POST"])
def create_expense():
    try:
        data = request.get_json()
        if not data or not data.get('title') or not data.get('amount') or not data.get('category'):
            return jsonify({"success": False, "error": "Title, category and amount are required"}), 400
            
        expense_date = datetime.strptime(data.get('date'), "%Y-%m-%d").date() if data.get('date') else datetime.utcnow().date()
        
        expense = Expense(
            date=expense_date,
            title=data['title'].strip(),
            category=data['category'].strip(),
            amount=float(data['amount']),
            payment_mode=data.get('payment_mode', 'Cash').strip(),
            notes=data.get('notes', '').strip() if data.get('notes') else None
        )
        
        db.session.add(expense)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Expense logged successfully",
            "expense": expense.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ UPDATE EXPENSE ------------------
@expense_bp.route("/expenses/<int:expense_id>", methods=["PUT"])
def update_expense(expense_id):
    try:
        expense = Expense.query.get_or_404(expense_id)
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
            
        if 'title' in data:
            expense.title = data['title'].strip()
        if 'category' in data:
            expense.category = data['category'].strip()
        if 'amount' in data:
            expense.amount = float(data['amount'])
        if 'payment_mode' in data:
            expense.payment_mode = data['payment_mode'].strip()
        if 'date' in data:
            expense.date = datetime.strptime(data['date'], "%Y-%m-%d").date()
        if 'notes' in data:
            expense.notes = data['notes'].strip() if data['notes'] else None
            
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Expense details updated successfully",
            "expense": expense.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ DELETE EXPENSE ------------------
@expense_bp.route("/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    try:
        expense = Expense.query.get_or_404(expense_id)
        db.session.delete(expense)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Expense record deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400
