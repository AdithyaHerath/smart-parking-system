# 🚀 Quick Start Guide

## Setup (One-time)

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Server

```bash
# Make sure you're in the backend directory
cd backend

# Activate virtual environment
source venv/bin/activate

# Run the Flask server
python app.py
```

Server will start on: **http://localhost:5001**

## Testing the API

### Option 1: Use cURL
```bash
# Health check
curl http://localhost:5001/api/health

# Vehicle entry
curl -X POST http://localhost:5001/api/vehicle/entry \
  -H "Content-Type: application/json" \
  -d '{"vehicle_number": "KA01AB1234", "owner_name": "John Doe"}'

# Check slots
curl http://localhost:5001/api/slots

# Vehicle exit
curl -X POST http://localhost:5001/api/vehicle/exit \
  -H "Content-Type: application/json" \
  -d '{"vehicle_number": "KA01AB1234"}'
```

### Option 2: Use Postman or any API client
Import the endpoints from `README.md`

## Database Location

The SQLite database is automatically created at:
```
backend/database/parking.db
```

## Default Configuration

- **Parking Slots**: 15 total (10 regular + 5 VIP)
- **Parking Fee**: Rs.10 per hour (minimum 1 hour)
- **Default Wallet**: Rs.100 for new vehicles
- **Admin User**: username=`admin`, password=`admin123`

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running

## Troubleshooting

### Port 5000 already in use
The app now uses port **5001** by default (to avoid macOS AirPlay conflict)

### Database errors
Delete `backend/database/parking.db` and restart the server to recreate

### Import errors
Make sure virtual environment is activated:
```bash
source venv/bin/activate
```
