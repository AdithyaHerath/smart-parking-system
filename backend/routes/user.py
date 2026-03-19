from flask import Blueprint, request, jsonify
from database.models import get_db_connection
from datetime import datetime

user_bp = Blueprint('user', __name__)

@user_bp.route('/dashboard/<int:user_id>', methods=['GET'])
def get_dashboard(user_id):
    conn = get_db_connection()
    # Get user wallet balance sum across all vehicles
    total_balance = conn.execute('SELECT SUM(wallet_balance) FROM vehicles WHERE user_id = ?', (user_id,)).fetchone()[0] or 0.0
    
    # Get vehicle counts
    vehicle_count = conn.execute('SELECT COUNT(*) FROM vehicles WHERE user_id = ?', (user_id,)).fetchone()[0]
    
    # Recent logs
    logs = conn.execute('''
        SELECT e.* FROM entry_exit_logs e
        JOIN vehicles v ON e.vehicle_number = v.vehicle_number
        WHERE v.user_id = ?
        ORDER BY e.entry_time DESC LIMIT 5
    ''', (user_id,)).fetchall()
    
    conn.close()
    return jsonify({
        'status': 'success',
        'data': {
            'total_balance': total_balance,
            'vehicle_count': vehicle_count,
            'recent_logs': [dict(log) for log in logs]
        }
    })

@user_bp.route('/vehicle/register', methods=['POST'])
def register_vehicle():
    data = request.get_json()
    user_id = data.get('user_id')
    vehicle_number = data.get('vehicle_number', '').upper().strip()
    owner_name = data.get('owner_name')
    vehicle_type = data.get('vehicle_type', 'car')
    
    if not all([user_id, vehicle_number, owner_name]):
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
    conn = get_db_connection()
    existing_vehicle = conn.execute('SELECT * FROM vehicles WHERE vehicle_number = ?', (vehicle_number,)).fetchone()
    
    if existing_vehicle:
        if existing_vehicle['is_approved'] == -1:
            # Allow re-registration if it was rejected: Reset to pending
            conn.execute('''
                UPDATE vehicles 
                SET owner_name = ?, vehicle_type = ?, is_approved = 0, rejection_reason = NULL 
                WHERE vehicle_number = ?
            ''', (owner_name, vehicle_type, vehicle_number))
            conn.commit()
            conn.close()
            return jsonify({'status': 'success', 'message': 'Registration re-submitted for approval'}), 200
        else:
            conn.close()
            return jsonify({'status': 'error', 'message': 'Vehicle already registered (Approved or Pending)'}), 400

    try:
        conn.execute('''
            INSERT INTO vehicles (vehicle_number, owner_name, vehicle_type, user_id, is_approved)
            VALUES (?, ?, ?, ?, ?)
        ''', (vehicle_number, owner_name, vehicle_type, user_id, 0)) # Default: Pending
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({'status': 'error', 'message': f'Error: {str(e)}'}), 400
        
    conn.close()
    return jsonify({'status': 'success', 'message': 'Vehicle registration submitted for approval'}), 201

@user_bp.route('/vehicles/<int:user_id>', methods=['GET'])
def get_user_vehicles(user_id):
    conn = get_db_connection()
    vehicles = conn.execute('SELECT * FROM vehicles WHERE user_id = ?', (user_id,)).fetchall()
    conn.close()
    return jsonify({
        'status': 'success',
        'data': [dict(v) for v in vehicles]
    })

@user_bp.route('/wallet/topup', methods=['POST'])
def topup_wallet():
    data = request.get_json()
    vehicle_number = data.get('vehicle_number')
    amount = data.get('amount')
    
    if not all([vehicle_number, amount]):
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
    amount = float(amount)
    conn = get_db_connection()
    vehicle = conn.execute('SELECT wallet_balance FROM vehicles WHERE vehicle_number = ?', (vehicle_number,)).fetchone()
    
    if not vehicle:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Vehicle not found'}), 404
        
    new_balance = vehicle['wallet_balance'] + amount
    conn.execute('UPDATE vehicles SET wallet_balance = ? WHERE vehicle_number = ?', (new_balance, vehicle_number))
    
    # Log transaction
    conn.execute('''
        INSERT INTO transaction_logs (vehicle_number, transaction_type, amount, balance_after, notes)
        VALUES (?, 'CREDIT', ?, ?, ?)
    ''', (vehicle_number, amount, new_balance, 'User top-up'))
    
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'new_balance': new_balance})
