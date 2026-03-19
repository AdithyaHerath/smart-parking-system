# Database Schema Documentation

## Entity Relationship Overview

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   USERS     │         │ ENTRY_EXIT_LOGS  │         │  VEHICLES   │
├─────────────┤         ├──────────────────┤         ├─────────────┤
│ user_id (PK)│────┐    │ log_id (PK)      │    ┌────│vehicle_id   │
│ username    │    │    │ vehicle_number   │────┤    │vehicle_num  │
│ email       │    │    │ slot_number      │    │    │owner_name   │
│ password    │    │    │ entry_time       │    │    │owner_phone  │
│ full_name   │    │    │ exit_time        │    │    │vehicle_type │
│ role        │    │    │ duration_minutes │    │    │wallet_bal   │
│ is_active   │    │    │ parking_fee      │    │    │registered_at│
│ created_at  │    │    │ wallet_bal_before│    │    │last_visit   │
│ last_login  │    │    │ wallet_bal_after │    │    └─────────────┘
└─────────────┘    │    │ status           │    │
                   │    │ created_by (FK)  │────┘
                   │    │ notes            │
                   │    └──────────────────┘
                   │              │
                   └──────────────┘
                                  │
                                  │
                         ┌────────┴────────┐
                         │     SLOTS       │
                         ├─────────────────┤
                         │ slot_id (PK)    │
                         │ slot_number     │
                         │ slot_type       │
                         │ is_occupied     │
                         │ current_vehicle │
                         │ entry_time      │
                         │ floor_level     │
                         │ is_active       │
                         └─────────────────┘
```

## Table Details

### 1. USERS
**Purpose**: System users (parking attendants, admins)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | INTEGER | PRIMARY KEY | Unique user identifier |
| username | TEXT | UNIQUE, NOT NULL | Login username |
| email | TEXT | UNIQUE, NOT NULL | User email |
| password_hash | TEXT | NOT NULL | Hashed password |
| full_name | TEXT | | Full name of user |
| role | TEXT | DEFAULT 'attendant' | User role (admin/attendant) |
| is_active | INTEGER | DEFAULT 1 | Active status (0/1) |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Account creation time |
| last_login | TEXT | | Last login timestamp |

---

### 2. VEHICLES
**Purpose**: Registered vehicles with wallet balance

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| vehicle_id | INTEGER | PRIMARY KEY | Unique vehicle identifier |
| vehicle_number | TEXT | UNIQUE, NOT NULL | Vehicle registration number |
| owner_name | TEXT | NOT NULL | Vehicle owner name |
| owner_phone | TEXT | | Owner contact number |
| vehicle_type | TEXT | DEFAULT 'car' | Type (car/bike/truck) |
| wallet_balance | REAL | DEFAULT 100.0 | Current wallet balance |
| registered_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Registration time |
| last_visit | TEXT | | Last parking visit time |

---

### 3. SLOTS
**Purpose**: Parking slot inventory

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| slot_id | INTEGER | PRIMARY KEY | Unique slot identifier |
| slot_number | TEXT | UNIQUE, NOT NULL | Slot number (e.g., A01) |
| slot_type | TEXT | DEFAULT 'regular' | Slot type (regular/vip) |
| is_occupied | INTEGER | DEFAULT 0 | Occupancy status (0/1) |
| current_vehicle_number | TEXT | | Currently parked vehicle |
| entry_time | TEXT | | Entry time of current vehicle |
| floor_level | TEXT | DEFAULT 'Ground' | Floor location |
| is_active | INTEGER | DEFAULT 1 | Slot active status (0/1) |

---

### 4. ENTRY_EXIT_LOGS
**Purpose**: Complete transaction history for all parking events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| log_id | INTEGER | PRIMARY KEY | Unique log identifier |
| vehicle_number | TEXT | NOT NULL | Vehicle registration number |
| slot_number | TEXT | NOT NULL | Assigned slot number |
| entry_time | TEXT | NOT NULL | Entry timestamp |
| exit_time | TEXT | | Exit timestamp (NULL if active) |
| duration_minutes | INTEGER | | Parking duration in minutes |
| parking_fee | REAL | DEFAULT 0.0 | Calculated parking fee |
| wallet_balance_before | REAL | | Wallet balance before exit |
| wallet_balance_after | REAL | | Wallet balance after deduction |
| status | TEXT | DEFAULT 'active' | Status (active/completed) |
| created_by_user_id | INTEGER | FOREIGN KEY | User who created entry |
| notes | TEXT | | Additional notes |

---

## Relationships

1. **USERS → ENTRY_EXIT_LOGS**: One-to-Many
   - One user can create multiple parking entries
   - Foreign Key: `created_by_user_id` references `users.user_id`

2. **VEHICLES → ENTRY_EXIT_LOGS**: One-to-Many
   - One vehicle can have multiple parking sessions
   - Linked by: `vehicle_number`

3. **SLOTS → ENTRY_EXIT_LOGS**: One-to-Many
   - One slot can have multiple parking sessions over time
   - Linked by: `slot_number`

---

## Indexes (Recommended for Production)

```sql
-- Speed up vehicle lookups
CREATE INDEX idx_vehicles_number ON vehicles(vehicle_number);

-- Speed up slot searches
CREATE INDEX idx_slots_occupied ON slots(is_occupied, is_active);

-- Speed up log queries
CREATE INDEX idx_logs_vehicle ON entry_exit_logs(vehicle_number);
CREATE INDEX idx_logs_status ON entry_exit_logs(status);
CREATE INDEX idx_logs_entry_time ON entry_exit_logs(entry_time);
```

---

## Sample Queries

### Get all active parking sessions
```sql
SELECT 
    e.vehicle_number,
    e.slot_number,
    e.entry_time,
    v.owner_name,
    v.wallet_balance
FROM entry_exit_logs e
JOIN vehicles v ON e.vehicle_number = v.vehicle_number
WHERE e.status = 'active'
ORDER BY e.entry_time DESC;
```

### Get available slots by floor
```sql
SELECT 
    floor_level,
    COUNT(*) as total_slots,
    SUM(CASE WHEN is_occupied = 0 THEN 1 ELSE 0 END) as available_slots
FROM slots
WHERE is_active = 1
GROUP BY floor_level;
```

### Get revenue summary
```sql
SELECT 
    DATE(exit_time) as date,
    COUNT(*) as total_exits,
    SUM(parking_fee) as total_revenue
FROM entry_exit_logs
WHERE status = 'completed'
GROUP BY DATE(exit_time)
ORDER BY date DESC;
```

### Get top customers
```sql
SELECT 
    v.vehicle_number,
    v.owner_name,
    COUNT(e.log_id) as total_visits,
    SUM(e.parking_fee) as total_spent
FROM vehicles v
JOIN entry_exit_logs e ON v.vehicle_number = e.vehicle_number
WHERE e.status = 'completed'
GROUP BY v.vehicle_number
ORDER BY total_visits DESC
LIMIT 10;
```
