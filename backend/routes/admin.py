from flask import Blueprint, request, jsonify
from database.models import get_db_connection
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/approvals/pending', methods=['GET'])
def get_pending_approvals():
    conn = get_db_connection()
    vehicles = conn.execute('SELECT * FROM vehicles WHERE is_approved = 0').fetchall()
    conn.close()
    return jsonify({
        'status': 'success',
        'data': [dict(v) for v in vehicles]
    })

@admin_bp.route('/vehicles/approved', methods=['GET'])
def get_approved_vehicles():
    conn = get_db_connection()
    vehicles = conn.execute('SELECT * FROM vehicles WHERE is_approved = 1').fetchall()
    conn.close()
    return jsonify({
        'status': 'success',
        'data': [dict(v) for v in vehicles]
    })

@admin_bp.route('/vehicle/approve', methods=['POST'])
def approve_vehicle():
    data = request.get_json()
    vehicle_id = data.get('vehicle_id')
    action = data.get('action') # 'approve' or 'reject'
    reason = data.get('reason', '')
    
    if not vehicle_id or action not in ['approve', 'reject']:
        return jsonify({'status': 'error', 'message': 'Invalid request'}), 400
        
    status = 1 if action == 'approve' else -1
    conn = get_db_connection()
    conn.execute('UPDATE vehicles SET is_approved = ?, rejection_reason = ? WHERE vehicle_id = ?',
                (status, reason, vehicle_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': f'Vehicle {action}d successfully'})

@admin_bp.route('/vehicle/<int:vehicle_id>', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    conn = get_db_connection()
    # Check if vehicle exists
    vehicle = conn.execute('SELECT vehicle_number FROM vehicles WHERE vehicle_id = ?', (vehicle_id,)).fetchone()
    if not vehicle:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Vehicle not found'}), 404
        
    # Delete the vehicle
    conn.execute('DELETE FROM vehicles WHERE vehicle_id = ?', (vehicle_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'message': f'Vehicle {vehicle["vehicle_number"]} removed successfully'})

@admin_bp.route('/settings', methods=['GET', 'POST'])
def manage_settings():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.get_json()
        for key, value in data.items():
            conn.execute('UPDATE settings SET setting_value = ? WHERE setting_key = ?', (str(value), key))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success', 'message': 'Settings updated'})
    
    settings = conn.execute('SELECT * FROM settings').fetchall()
    conn.close()
    return jsonify({
        'status': 'success',
        'data': {s['setting_key']: s['setting_value'] for s in settings}
    })

@admin_bp.route('/users', methods=['GET'])
def get_all_users():
    conn = get_db_connection()
    users = conn.execute('SELECT * FROM users').fetchall()
    conn.close()
    return jsonify({
        'status': 'success',
        'data': [dict(u) for u in users]
    })
