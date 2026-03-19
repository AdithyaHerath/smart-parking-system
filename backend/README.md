# Smart Parking System - Backend API

Simple Flask backend for managing a smart parking system with SQLite database.

## 📋 Database Schema

### 1. **Users** Table
Stores system users (parking attendants, admins)
```sql
- user_id (PRIMARY KEY)
- username (UNIQUE)
- email (UNIQUE)
- password_hash
- full_name
- role (admin/attendant)
- is_active
- created_at
- last_login
```

### 2. **Vehicles** Table
Registered vehicles with wallet balance
```sql
- vehicle_id (PRIMARY KEY)
- vehicle_number (UNIQUE)
- owner_name
- owner_phone
- vehicle_type (car/bike/etc)
- wallet_balance (default: 100.0)
- registered_at
- last_visit
```

### 3. **Slots** Table
Parking slot inventory
```sql
- slot_id (PRIMARY KEY)
- slot_number (UNIQUE, e.g., A01, B05)
- slot_type (regular/vip)
- is_occupied (0/1)
- current_vehicle_number
- entry_time
- floor_level (Ground/First)
- is_active (0/1)
```

### 4. **EntryExitLogs** Table
Complete transaction history
```sql
- log_id (PRIMARY KEY)
- vehicle_number
- slot_number
- entry_time
- exit_time
- duration_minutes
- parking_fee
- wallet_balance_before
- wallet_balance_after
- status (active/completed)
- created_by_user_id (FOREIGN KEY)
- notes
```

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Server
```bash
python app.py
```

Server will start on `http://localhost:5000`

## 📡 API Endpoints

### Health Check
```http
GET /api/health
```
**Response:**
```json
{
  "status": "success",
  "message": "Smart Parking System API is running",
  "timestamp": "2026-02-06T08:45:00"
}
```

---

### Vehicle Entry
```http
POST /api/vehicle/entry
Content-Type: application/json

{
  "vehicle_number": "ABC123",
  "owner_name": "John Doe"
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Vehicle entry recorded",
  "data": {
    "vehicle_number": "ABC123",
    "slot_number": "A01",
    "entry_time": "2026-02-06T08:45:00"
  }
}
```

**Error Responses:**
- `400` - Vehicle already parked
- `400` - No parking slots available

---

### Vehicle Exit
```http
POST /api/vehicle/exit
Content-Type: application/json

{
  "vehicle_number": "ABC123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Vehicle exit recorded",
  "data": {
    "vehicle_number": "ABC123",
    "slot_number": "A01",
    "entry_time": "2026-02-06T08:45:00",
    "exit_time": "2026-02-06T10:30:00",
    "duration_minutes": 105,
    "parking_fee": 20.0,
    "wallet_balance": 80.0
  }
}
```

**Error Responses:**
- `404` - Vehicle not found in parking lot
- `400` - Insufficient wallet balance

---

### Get All Slots
```http
GET /api/slots
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "slot_id": 1,
      "slot_number": "A01",
      "slot_type": "regular",
      "is_occupied": 1,
      "current_vehicle_number": "ABC123",
      "entry_time": "2026-02-06T08:45:00",
      "floor_level": "Ground",
      "is_active": 1
    }
  ],
  "total_slots": 15,
  "occupied": 3,
  "available": 12
}
```

---

### Get Wallet Balance
```http
GET /api/wallet/ABC123
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "vehicle_number": "ABC123",
    "owner_name": "John Doe",
    "wallet_balance": 80.0
  }
}
```

---

### Top Up Wallet
```http
POST /api/wallet/topup
Content-Type: application/json

{
  "vehicle_number": "ABC123",
  "amount": 50.0
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Wallet topped up successfully",
  "data": {
    "vehicle_number": "ABC123",
    "previous_balance": 80.0,
    "amount_added": 50.0,
    "new_balance": 130.0
  }
}
```

---

### Get Vehicle History
```http
GET /api/history/ABC123
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "log_id": 1,
      "vehicle_number": "ABC123",
      "slot_number": "A01",
      "entry_time": "2026-02-06T08:45:00",
      "exit_time": "2026-02-06T10:30:00",
      "duration_minutes": 105,
      "parking_fee": 20.0,
      "wallet_balance_before": 100.0,
      "wallet_balance_after": 80.0,
      "status": "completed"
    }
  ],
  "total_visits": 1
}
```

### Admin Logs
```http
GET /api/admin/logs?type=entry_exit&limit=100
```
OR
```http
GET /api/admin/logs?type=transactions&limit=100
```

**Response:**
```json
{
  "status": "success",
  "type": "transactions",
  "data": [
    {
      "transaction_id": 1,
      "vehicle_number": "ABC123",
      "transaction_type": "DEBIT",
      "amount": 20.0,
      "balance_after": 80.0,
      "timestamp": "2026-02-06T10:30:00",
      "notes": "Parking Fee"
    }
  ],
  "count": 1
}
```

## ⚙️ Configuration

### Parking Fee
Default: **Rs.10 per hour** (minimum 1 hour charge)

Edit in `app.py`:
```python
PARKING_FEE_PER_HOUR = 10.0
```

### Default Slots
- **Ground Floor**: 10 regular slots (A01-A10)
- **First Floor**: 5 VIP slots (B01-B05)

### Default Wallet Balance
New vehicles get **Rs.100** initial balance

### Default Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@parking.com`

⚠️ **Note**: Change default credentials in production!

## 🗄️ Database Location

SQLite database is created at:
```
backend/database/parking.db
```

## 🧪 Testing with cURL

### Entry
```bash
curl -X POST http://localhost:5000/api/vehicle/entry \
  -H "Content-Type: application/json" \
  -d '{"vehicle_number": "KA01AB1234", "owner_name": "John Doe"}'
```

### Exit
```bash
curl -X POST http://localhost:5000/api/vehicle/exit \
  -H "Content-Type: application/json" \
  -d '{"vehicle_number": "KA01AB1234"}'
```

### Check Slots
```bash
curl http://localhost:5000/api/slots
```

### Check Wallet
```bash
curl http://localhost:5000/api/wallet/KA01AB1234
```

## 📝 Notes

- All vehicle numbers are automatically converted to UPPERCASE
- Parking fee is calculated based on duration (minimum 1 hour)
- Wallet balance must be sufficient for exit
- Database is auto-created on first run
- CORS is enabled for frontend integration
