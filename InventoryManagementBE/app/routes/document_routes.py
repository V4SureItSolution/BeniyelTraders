from flask import Blueprint, request, jsonify
from app.models.document import Document
from app import db
from datetime import datetime, date, timedelta
import os

document_bp = Blueprint("document_bp", __name__)

# File upload configuration path for deletion
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(os.path.dirname(BASE_DIR), 'uploads')

# ------------------ GET ALL DOCUMENTS ------------------
@document_bp.route("/documents", methods=["GET"])
def get_documents():
    try:
        doc_type = request.args.get('document_type')
        query = Document.query
        
        if doc_type:
            query = query.filter(Document.document_type == doc_type)
            
        documents = query.order_by(Document.created_at.desc()).all()
        return jsonify({
            "success": True,
            "documents": [d.to_dict() for d in documents]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ GET EXPIRY ALERTS ------------------
@document_bp.route("/documents/alerts", methods=["GET"])
def get_expiry_alerts():
    try:
        # Get all documents that have an expiry date
        docs = Document.query.filter(Document.expiry_date.isnot(None)).all()
        
        today = date.today()
        warning_limit = today + timedelta(days=30)
        
        expired = []
        expiring_soon = []
        
        for doc in docs:
            exp_date = doc.expiry_date
            if exp_date < today:
                expired.append({
                    "id": doc.id,
                    "name": doc.name,
                    "document_type": doc.document_type,
                    "expiry_date": exp_date.isoformat(),
                    "file_path": doc.file_path,
                    "days_expired": (today - exp_date).days
                })
            elif exp_date <= warning_limit:
                expiring_soon.append({
                    "id": doc.id,
                    "name": doc.name,
                    "document_type": doc.document_type,
                    "expiry_date": exp_date.isoformat(),
                    "file_path": doc.file_path,
                    "days_left": (exp_date - today).days
                })
                
        return jsonify({
            "success": True,
            "alerts": {
                "expired": expired,
                "expiring_soon": expiring_soon,
                "total_alerts": len(expired) + len(expiring_soon)
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ CREATE DOCUMENT RECORD ------------------
@document_bp.route("/documents", methods=["POST"])
def create_document():
    try:
        data = request.get_json()
        if not data or not data.get('name') or not data.get('document_type') or not data.get('file_path'):
            return jsonify({"success": False, "error": "Name, document type and file path are required"}), 400
            
        expiry_date = None
        if data.get('expiry_date'):
            expiry_date = datetime.strptime(data['expiry_date'], "%Y-%m-%d").date()
            
        document = Document(
            name=data['name'].strip(),
            document_type=data['document_type'].strip(),
            year=data.get('year', '').strip() if data.get('year') else None,
            expiry_date=expiry_date,
            file_path=data['file_path'].strip()
        )
        
        db.session.add(document)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Document registered successfully",
            "document": document.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400

# ------------------ DELETE DOCUMENT RECORD ------------------
@document_bp.route("/documents/<int:document_id>", methods=["DELETE"])
def delete_document(document_id):
    try:
        document = Document.query.get_or_404(document_id)
        
        # Optionally delete physical file
        file_path = document.file_path
        if file_path:
            filename = file_path.split('/')[-1] if '/' in file_path else file_path
            full_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(full_path) and os.path.isfile(full_path):
                try:
                    os.remove(full_path)
                    print(f"🗑️ Deleted physical file: {full_path}")
                except Exception as file_err:
                    print(f"⚠️ Error deleting physical file {full_path}: {str(file_err)}")
                    
        db.session.delete(document)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Document deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400
