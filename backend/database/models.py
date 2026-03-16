"""
Database models for the Smart Parking System
Uses SQLite for simplicity

Tables:
1. Users - System users (parking attendants, admins)
2. Vehicles - Registered vehicles with wallet
3. Slots - Parking slot inventory
4. EntryExitLogs - Complete entry/exit transaction history
"""

import sqlite3
from datetime import datetime
import os

# Database file path
DB_PATH = os.environ.get('DATABASE_URL') or os.environ.get('DB_PATH') or os.path.join(os.path.dirname(__file__), 'parking.db')

def get_db_connection():
    """Create and return a database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def init_db():
    """Initialize the database with required tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # ==================== TABLE 1: USERS ====================
    # Stores system users (parking attendants, admins, etc.)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'attendant',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login TEXT
        )
    ''')
    
    # ==================== TABLE 2: VEHICLES ====================
    # Stores vehicle information, wallet balance, and user association
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vehicles (
            vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_number TEXT UNIQUE NOT NULL,
            owner_name TEXT NOT NULL,
            owner_phone TEXT,
            vehicle_type TEXT DEFAULT 'car',
            wallet_balance REAL DEFAULT 100.0,
            registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_visit TEXT,
            user_id INTEGER,
            is_approved INTEGER DEFAULT 0,  -- 0: Pending, 1: Approved, -1: Rejected
            rejection_reason TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    ''')
    
    # ==================== TABLE 3: SLOTS ====================
    # Parking slot inventory with real-time status
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS slots (
            slot_id INTEGER PRIMARY KEY AUTOINCREMENT,
            slot_number TEXT UNIQUE NOT NULL,
            slot_type TEXT DEFAULT 'regular',
            is_occupied INTEGER DEFAULT 0,
            current_vehicle_number TEXT,
            entry_time TEXT,
            floor_level TEXT DEFAULT 'Ground',
            is_active INTEGER DEFAULT 1
        )
    ''')
    
    # ==================== TABLE 4: ENTRY_EXIT_LOGS ====================
    # Complete transaction history for all entry/exit events
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS entry_exit_logs (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_number TEXT NOT NULL,
            slot_number TEXT NOT NULL,
            entry_time TEXT NOT NULL,
            exit_time TEXT,
            duration_minutes INTEGER,
            parking_fee REAL DEFAULT 0.0,
            wallet_balance_before REAL,
            wallet_balance_after REAL,
            status TEXT DEFAULT 'active',
            created_by_user_id INTEGER,
            notes TEXT,
            FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
        )
    ''')

    # ==================== TABLE 5: TRANSACTION_LOGS ====================
    # Log all wallet transactions (Top-ups and Fee payments)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transaction_logs (
            transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_number TEXT NOT NULL,
            transaction_type TEXT NOT NULL,  -- 'CREDIT' (Top-up) or 'DEBIT' (Fee)
            amount REAL NOT NULL,
            balance_after REAL NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            reference_id INTEGER,            -- Links to entry_exit_logs.log_id if DEBIT
            notes TEXT
        )
    ''')

    # ==================== TABLE 6: SETTINGS ====================
    # System-wide configuration settings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL,
            description TEXT
        )
    ''')
    
    conn.commit()
    
    # ==================== INITIALIZE DEFAULT DATA ====================
    
    # Initialize settings if empty
    cursor.execute('SELECT COUNT(*) FROM settings')
    if cursor.fetchone()[0] == 0:
        print("Initializing system settings...")
        default_settings = [
            ('parking_fee_per_hour', '10.0', 'Hourly parking rate in local currency'),
            ('min_wallet_balance', '50.0', 'Minimum wallet balance required for entry')
        ]
        cursor.executemany('INSERT INTO settings VALUES (?, ?, ?)', default_settings)
        conn.commit()

    # Initialize parking slots if table is empty
    cursor.execute('SELECT COUNT(*) FROM slots')
    if cursor.fetchone()[0] == 0:
        print("Creating default parking slots...")
        
        # Ground floor: 10 regular slots
        for i in range(1, 11):
            cursor.execute(
                'INSERT INTO slots (slot_number, slot_type, floor_level) VALUES (?, ?, ?)',
                (f'A{i:02d}', 'regular', 'Ground')
            )
        
        # First floor: 5 VIP slots
        for i in range(1, 6):
            cursor.execute(
                'INSERT INTO slots (slot_number, slot_type, floor_level) VALUES (?, ?, ?)',
                (f'B{i:02d}', 'vip', 'First')
            )
        
        conn.commit()
        print("✓ Created 15 parking slots (10 regular + 5 VIP)")
    
    # Initialize default admin user if table is empty
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        print("Creating default admin user...")
        # Note: In production, use proper password hashing (bcrypt, etc.)
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES (?, ?, ?, ?, ?)
        ''', ('admin', 'admin@parking.com', 'admin123', 'System Administrator', 'admin'))
        conn.commit()
        print("✓ Created default admin user (username: admin, password: admin123)")
    
    conn.close()
    print(f"✓ Database initialized successfully at {DB_PATH}")

def update_schema():
    """Update existing schema with new columns if they don't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Add columns to vehicles table if they don't exist
    try:
        cursor.execute('ALTER TABLE vehicles ADD COLUMN user_id INTEGER')
        print("Added user_id to vehicles table")
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    try:
        cursor.execute('ALTER TABLE vehicles ADD COLUMN is_approved INTEGER DEFAULT 0')
        print("Added is_approved to vehicles table")
    except sqlite3.OperationalError:
        pass
        
    try:
        cursor.execute('ALTER TABLE vehicles ADD COLUMN rejection_reason TEXT')
        print("Added rejection_reason to vehicles table")
    except sqlite3.OperationalError:
        pass
        
    conn.commit()
    conn.close()

# Initialize database when module is imported
init_db()
update_schema()
