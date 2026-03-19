from flask import Blueprint, request, jsonify
from database.models import get_db_connection
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    
    if not all([username, email, password]):
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
        
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, email, password, full_name, 'user'))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Username or email already exists'}), 400
        
    conn.close()
    return jsonify({'status': 'success', 'message': 'User registered successfully'}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not all([username, password]):
        return jsonify({'status': 'error', 'message': 'Missing credentials'}), 400
        
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ? AND password_hash = ?', 
                      (username, password)).fetchone()
    
    if user:
        user_dict = dict(user)
        del user_dict['password_hash']
        
        # Update last login
        conn.execute('UPDATE users SET last_login = ? WHERE user_id = ?', 
                    (datetime.now().isoformat(), user['user_id']))
        conn.commit()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'user': user_dict
        }), 200
    else:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Invalid username or password'}), 401
