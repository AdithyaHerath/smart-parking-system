"""
Smart Parking System - Flask Backend
Simple REST API for parking management with wallet system
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the backend directory to the path
sys.path.append(os.path.dirname(__file__))

from database.models import get_db_connection

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Register Blueprints
from routes.auth import auth_bp
from routes.user import user_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(user_bp, url_prefix='/api/user')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

# ==================== HELPER FUNCTIONS ====================

def get_setting(key, default=None):
    """Retrieve a setting from the database"""
    conn = get_db_connection()
    setting = conn.execute('SELECT setting_value FROM settings WHERE setting_key = ?', (key,)).fetchone()
    conn.close()
    return setting['setting_value'] if setting else default

def calculate_parking_fee(entry_time_str):
    """
    Calculate parking fee based on entry time
    """
    fee_per_hour = float(get_setting('parking_fee_per_hour', '10.0'))
    entry_time = datetime.fromisoformat(entry_time_str)
    current_time = datetime.now()
    duration_seconds = (current_time - entry_time).total_seconds()
    duration_minutes = int(duration_seconds / 60)
    duration_hours = duration_seconds / 3600
    
    # Minimum 1 hour charge
    if duration_hours < 1:
        duration_hours = 1
    
    parking_fee = round(duration_hours * fee_per_hour, 2)
    return parking_fee, duration_minutes

def find_available_slot():
    """
    Find the first available parking slot
    """
    conn = get_db_connection()
    slot = conn.execute(
        'SELECT * FROM slots WHERE is_occupied = 0 AND is_active = 1 LIMIT 1'
    ).fetchone()
    conn.close()
    
    return dict(slot) if slot else None

# ==================== API ENDPOINTS ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Smart Parking System API is running',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/vehicle/entry', methods=['POST'])
def vehicle_entry():
    """
    Handle vehicle entry to parking lot with REGISTRATION and FUNDS check
    """
    data = request.get_json()
    vehicle_number = data.get('vehicle_number', '').upper().strip()
    
    if not vehicle_number:
        return jsonify({'status': 'error', 'message': 'Vehicle number is required'}), 400
    
    conn = get_db_connection()
    
    # 1. CHECK REGISTRATION AND APPROVAL
    vehicle = conn.execute('SELECT * FROM vehicles WHERE vehicle_number = ?', (vehicle_number,)).fetchone()
    
    if not vehicle:
        conn.close()
        return jsonify({
            'status': 'error',
            'message': f'Vehicle {vehicle_number} is NOT registered in the system.'
        }), 403
        
    if vehicle['is_approved'] == 0:
        conn.close()
        return jsonify({
            'status': 'error',
            'message': f'Vehicle {vehicle_number} registration is PENDING approval.'
        }), 403
    elif vehicle['is_approved'] == -1:
        conn.close()
        return jsonify({
            'status': 'error',
            'message': f'Vehicle {vehicle_number} registration was REJECTED: {vehicle.get("rejection_reason")}'
        }), 403

    # 2. CHECK FUNDS
    min_balance = float(get_setting('min_wallet_balance', '50.0'))
    if vehicle['wallet_balance'] < min_balance:
        conn.close()
        return jsonify({
            'status': 'error',
            'message': f'Insufficient funds. Min Rs.{min_balance} required. Current: Rs.{vehicle["wallet_balance"]}'
        }), 402

    # 3. CHECK IF ALREADY PARKED
    existing_entry = conn.execute(
        'SELECT * FROM entry_exit_logs WHERE vehicle_number = ? AND status = "active"',
        (vehicle_number,)
    ).fetchone()
    
    if existing_entry:
        conn.close()
        return jsonify({
            'status': 'error',
            'message': 'Vehicle is already parked',
            'slot_number': existing_entry['slot_number']
        }), 400

    # 4. FIND AVAILABLE SLOT
    slot = find_available_slot()
    if not slot:
        conn.close()
        return jsonify({
            'status': 'error',
            'message': 'Parking lot is full'
        }), 503

    # 5. ASSIGN SLOT AND RECORD ENTRY
    entry_time = datetime.now().isoformat()
    wallet_before = vehicle['wallet_balance']
    
    conn.execute(
        'UPDATE slots SET is_occupied = 1, current_vehicle_number = ?, entry_time = ? WHERE slot_id = ?',
        (vehicle_number, entry_time, slot['slot_id'])
    )
    
    # Create entry log
    conn.execute(
        'INSERT INTO entry_exit_logs (vehicle_number, slot_number, entry_time, wallet_balance_before) VALUES (?, ?, ?, ?)',
        (vehicle_number, slot['slot_number'], entry_time, wallet_before)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'status': 'success',
        'message': 'Vehicle entry recorded',
        'data': {
            'vehicle_number': vehicle_number,
            'slot_number': slot['slot_number'],
            'entry_time': entry_time
        }
    }), 201

@app.route('/api/vehicle/exit', methods=['POST'])
def vehicle_exit():
    """
    Handle vehicle exit from parking lot
    Request body: { "vehicle_number": "ABC123" }
    """
    data = request.get_json()
    vehicle_number = data.get('vehicle_number', '').upper().strip()
    
    if not vehicle_number:
        return jsonify({
            'status': 'error',
            'message': 'Vehicle number is required'
        }), 400
    
    conn = get_db_connection()
    
    # Find active parking entry
    parking_entry = conn.execute(
        'SELECT * FROM entry_exit_logs WHERE vehicle_number = ? AND status = "active"',
        (vehicle_number,)
    ).fetchone()
    
    if not parking_entry:
        conn.close()
        return jsonify({
            'status': 'error',
            'message': 'Vehicle not found in parking lot'
        }), 404
    
    # Calculate parking fee and duration
    parking_fee, duration_minutes = calculate_parking_fee(parking_entry['entry_time'])
    
    # Get vehicle wallet balance
    vehicle = conn.execute(
        'SELECT * FROM vehicles WHERE vehicle_number = ?',
        (vehicle_number,)
    ).fetchone()
    
    if vehicle['wallet_balance'] < parking_fee:
        conn.close()
        return jsonify({
            'status': 'error',
            'message': 'Insufficient wallet balance',
            'required': parking_fee,
            'available': vehicle['wallet_balance']
        }), 400
    
    # Deduct from wallet
    new_balance = vehicle['wallet_balance'] - parking_fee
    conn.execute(
        'UPDATE vehicles SET wallet_balance = ? WHERE vehicle_number = ?',
        (new_balance, vehicle_number)
    )

    # Log wallet transaction (DEBIT)
    if parking_fee > 0:
        conn.execute(
            'INSERT INTO transaction_logs (vehicle_number, transaction_type, amount, balance_after, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?)',
            (vehicle_number, 'DEBIT', parking_fee, new_balance, parking_entry['log_id'], 'Parking Fee')
        )
    
    # Update entry/exit log
    exit_time = datetime.now().isoformat()
    conn.execute(
        'UPDATE entry_exit_logs SET exit_time = ?, duration_minutes = ?, parking_fee = ?, wallet_balance_after = ?, status = "completed" WHERE log_id = ?',
        (exit_time, duration_minutes, parking_fee, new_balance, parking_entry['log_id'])
    )
    
    # Free up the parking slot
    conn.execute(
        'UPDATE slots SET is_occupied = 0, current_vehicle_number = NULL, entry_time = NULL WHERE slot_number = ?',
        (parking_entry['slot_number'],)
    )
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'status': 'success',
        'message': 'Vehicle exit recorded',
        'data': {
            'vehicle_number': vehicle_number,
            'slot_number': parking_entry['slot_number'],
            'entry_time': parking_entry['entry_time'],
            'exit_time': exit_time,
            'duration_minutes': duration_minutes,
            'parking_fee': parking_fee,
            'wallet_balance': new_balance
        }
    })

@app.route('/api/slots', methods=['GET'])
def get_slots():
    """
    Get all parking slots with their status
    """
    conn = get_db_connection()
    slots = conn.execute('SELECT * FROM slots WHERE is_active = 1 ORDER BY slot_number').fetchall()
    conn.close()
    
    slots_list = [dict(slot) for slot in slots]
    
    return jsonify({
        'status': 'success',
        'data': slots_list,
        'total_slots': len(slots_list),
        'occupied': sum(1 for s in slots_list if s['is_occupied']),
        'available': sum(1 for s in slots_list if not s['is_occupied'])
    })

@app.route('/api/wallet/<vehicle_number>', methods=['GET'])
def get_wallet_balance(vehicle_number):
    """
    Get wallet balance for a vehicle
    """
    vehicle_number = vehicle_number.upper().strip()
    
    conn = get_db_connection()
    vehicle = conn.execute(
        'SELECT * FROM vehicles WHERE vehicle_number = ?',
        (vehicle_number,)
    ).fetchone()
    conn.close()
    
    if not vehicle:
        return jsonify({
            'status': 'error',
            'message': 'Vehicle not found'
        }), 404
    
    return jsonify({
        'status': 'success',
        'data': {
            'vehicle_number': vehicle['vehicle_number'],
            'owner_name': vehicle['owner_name'],
            'wallet_balance': vehicle['wallet_balance']
        }
    })

@app.route('/api/wallet/topup', methods=['POST'])
def wallet_topup():
    """
    Add money to vehicle wallet
    Request body: { "vehicle_number": "ABC123", "amount": 50.0 }
    """
    data = request.get_json()
    vehicle_number = data.get('vehicle_number', '').upper().strip()
    amount = data.get('amount', 0)
    
    if not vehicle_number or amount <= 0:
        return jsonify({
            'status': 'error',
            'message': 'Valid vehicle number and amount are required'
        }), 400
    
    conn = get_db_connection()
    vehicle = conn.execute(
        'SELECT * FROM vehicles WHERE vehicle_number = ?',
        (vehicle_number,)
    ).fetchone()
    
    if not vehicle:
        conn.close()
        return jsonify({
            'status': 'error',
            'message': 'Vehicle not found'
        }), 404
    
    new_balance = vehicle['wallet_balance'] + amount
    conn.execute(
        'UPDATE vehicles SET wallet_balance = ? WHERE vehicle_number = ?',
        (new_balance, vehicle_number)
    )
    
    # Log wallet transaction (CREDIT)
    conn.execute(
        'INSERT INTO transaction_logs (vehicle_number, transaction_type, amount, balance_after, notes) VALUES (?, ?, ?, ?, ?)',
        (vehicle_number, 'CREDIT', amount, new_balance, 'Wallet Top-up')
    )
    conn.commit()
    conn.close()
    
    return jsonify({
        'status': 'success',
        'message': 'Wallet topped up successfully',
        'data': {
            'vehicle_number': vehicle_number,
            'previous_balance': vehicle['wallet_balance'],
            'amount_added': amount,
            'new_balance': new_balance
        }
    })

@app.route('/api/history/<vehicle_number>', methods=['GET'])
def get_vehicle_history(vehicle_number):
    """
    Get parking history for a vehicle
    """
    vehicle_number = vehicle_number.upper().strip()
    
    conn = get_db_connection()
    history = conn.execute(
        'SELECT * FROM entry_exit_logs WHERE vehicle_number = ? ORDER BY entry_time DESC',
        (vehicle_number,)
    ).fetchall()
    conn.close()
    
    history_list = [dict(h) for h in history]
    
    return jsonify({
        'status': 'success',
        'data': history_list,
        'total_visits': len(history_list)
    })

@app.route('/api/admin/logs', methods=['GET'])
def get_admin_logs():
    """
    Get all logs (Entry/Exit OR Transactions)
    Query Params:
        type: 'entry_exit' (default) or 'transactions'
        limit: number of records (default 100)
    """
    log_type = request.args.get('type', 'entry_exit')
    limit = request.args.get('limit', 100)
    
    conn = get_db_connection()
    
    if log_type == 'transactions':
        logs = conn.execute(
            'SELECT * FROM transaction_logs ORDER BY timestamp DESC LIMIT ?',
            (limit,)
        ).fetchall()
    else:
        logs = conn.execute(
            'SELECT * FROM entry_exit_logs ORDER BY entry_time DESC LIMIT ?',
            (limit,)
        ).fetchall()
        
    conn.close()
    
    return jsonify({
        'status': 'success',
        'type': log_type,
        'count': len(logs),
        'data': [dict(log) for log in logs]
    })

# ==================== MAIN ====================

if __name__ == '__main__':
    print("=" * 50)
    print("Smart Parking System - Backend Server")
    print("=" * 50)
    print("Available endpoints:")
    print("  GET  /api/health - Health check")
    print("  POST /api/vehicle/entry - Vehicle entry")
    print("  POST /api/vehicle/exit - Vehicle exit")
    print("  GET  /api/slots - Get all parking slots")
    print("  GET  /api/wallet/<vehicle_number> - Get wallet balance")
    print("  POST /api/wallet/topup - Top up wallet")
    print("  GET  /api/history/<vehicle_number> - Get parking history")
    print("=" * 50)
    
    # Run the Flask app
    port = int(os.environ.get('PORT', 5001))
    host = os.environ.get('HOST', '0.0.0.0')
    app.run(debug=os.environ.get('FLASK_DEBUG', 'True') == 'True', host=host, port=port)
