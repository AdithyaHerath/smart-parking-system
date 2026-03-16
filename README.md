# 🚗 Smart Parking System

Complete smart parking management system with automatic license plate recognition, Flask backend API, and SQLite database.

## 📁 Project Structure

```
parking-system/
├── backend/              # Flask REST API with SQLite
│   ├── app.py           # Main Flask application
│   ├── database/        # Database models and SQLite DB
│   ├── requirements.txt # Python dependencies
│   ├── README.md        # API documentation
│   ├── QUICKSTART.md    # Quick setup guide
│   └── DATABASE_SCHEMA.md # Database schema docs
│
├── anpr/                # License Plate Reader (OCR)
│   ├── anpr_system.py  # Main ANPR script
│   ├── requirements.txt # Python dependencies
│   ├── README.md        # ANPR documentation
│   └── QUICKSTART.md    # Quick setup guide
│
├── esp32-emulator/      # ESP32 Gate Controller Emulator
│   ├── gate_controller.py # Main emulator script
│   ├── requirements.txt # Python dependencies
│   ├── README.md        # Emulator documentation
│   └── QUICKSTART.md    # Quick setup guide
│
└── frontend/            # Web Dashboard
    ├── index.html       # Main dashboard UI
    ├── styles.css       # Premium dark theme styling
    ├── script.js        # Frontend logic (Fetch API)
    └── README.md        # Frontend documentation
```

## 🎯 Features

### Backend API
- ✅ Vehicle entry/exit management
- ✅ Automatic slot assignment
- ✅ Wallet-based payment system
- ✅ Parking fee calculation
- ✅ Transaction history
- ✅ SQLite database with 4 tables (Users, Vehicles, Slots, EntryExitLogs)

### ANPR (License Plate Reader)
- ✅ Webcam integration
- ✅ OCR text extraction (Tesseract)
- ✅ Image preprocessing
- ✅ Plate validation
- ✅ Backend API integration

### ESP32 Gate Controller Emulator
- ✅ Car detection simulation
- ✅ Sends plate data to backend
- ✅ Waits for approval response
- ✅ Gate control (open/close)
- ✅ LED status indicators
- ✅ Interactive and automatic modes

### Web Dashboard
- ✅ Real-time slot monitoring
- ✅ Wallet balance checker
- ✅ Parking history lookup
- ✅ Premium dark mode UI
- ✅ Dynamic updates via Fetch API

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend runs on: `http://localhost:5001`

### 2. ANPR Setup

**Install Tesseract:**
```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr
```

**Install Python dependencies:**
```bash
cd anpr
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Update Tesseract path in `anpr_system.py` (line 20):**
```python
pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'
```

**Run ANPR:**
```bash
python anpr_system.py
```

### 3. ESP32 Emulator Setup

```bash
cd esp32-emulator
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python gate_controller.py
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/vehicle/entry` | Vehicle entry |
| POST | `/api/vehicle/exit` | Vehicle exit |
| GET | `/api/slots` | Get all slots |
| GET | `/api/wallet/<vehicle>` | Get wallet balance |
| POST | `/api/wallet/topup` | Top up wallet |
| GET | `/api/history/<vehicle>` | Get parking history |

## 🗄️ Database Schema

### Tables
1. **Users** - System users (admins, attendants)
2. **Vehicles** - Registered vehicles with wallet
3. **Slots** - Parking slot inventory (15 slots)
4. **EntryExitLogs** - Complete transaction history

### Default Data
- **Slots**: 10 regular (A01-A10) + 5 VIP (B01-B05)
- **Wallet**: Rs.100 default balance
- **Parking Fee**: Rs.10/hour (minimum 1 hour)
- **Admin User**: username=`admin`, password=`admin123`

## 🎮 Usage Flow

### Automated Entry (with ANPR)

```
1. Vehicle arrives at entry gate
2. ANPR camera captures license plate
3. OCR extracts plate number
4. System sends to backend API
5. Backend assigns available slot
6. Gate opens, displays slot number
```

### Manual Entry (API)

```bash
curl -X POST http://localhost:5001/api/vehicle/entry \
  -H "Content-Type: application/json" \
  -d '{"vehicle_number": "KA01AB1234", "owner_name": "John Doe"}'
```

### Vehicle Exit

```bash
curl -X POST http://localhost:5001/api/vehicle/exit \
  -H "Content-Type: application/json" \
  -d '{"vehicle_number": "KA01AB1234"}'
```

## 🧪 Testing

### Test Full System
1. Start backend: `cd backend && python app.py`
2. Start ANPR: `cd anpr && python anpr_system.py`
3. Position plate in front of camera
4. Press SPACE to capture

## 📊 System Architecture

```
┌─────────────────┐      ┌────────────────────┐
│   ANPR Camera   │      │   ESP32 Emulator   │
│ (Webcam + OCR)  │      │ (Gate Controller)  │
└────────┬────────┘      └─────────┬──────────┘
         │ Plate Number            │ Plate Data
         ↓                         ↓
┌──────────────────────────────────────────────┐
│                Flask Backend                 │
│                 Port: 5001                   │
└───────────────────────┬──────────────────────┘
                        │
                        ↓
┌──────────────────────────────────────────────┐
│              SQLite Database                 │
│  - Users, Vehicles, Slots, Logs              │
└──────────────────────────────────────────────┘
```

## 📝 Configuration

### Backend (`backend/app.py`)
```python
PARKING_FEE_PER_HOUR = 10.0  # Fee per hour
app.run(port=5001)           # Server port
```

### ANPR (`anpr/anpr_system.py`)
```python
BACKEND_URL = "http://localhost:5001/api"  # Backend URL
CAMERA_INDEX = 0                            # Webcam index
pytesseract.pytesseract.tesseract_cmd = '/path/to/tesseract'
```

## 🐛 Troubleshooting

### Backend Issues
- **Port 5000 in use**: App uses port 5001 (macOS AirPlay conflict)
- **Database errors**: Delete `backend/database/parking.db` and restart
- **Import errors**: Activate virtual environment

### ANPR Issues
- **Tesseract not found**: Install Tesseract OCR
- **Cannot open webcam**: Check camera permissions
- **No plate detected**: Improve lighting, positioning
- **Connection refused**: Start backend server first

## 📚 Documentation

- **Backend API**: See `backend/README.md`
- **Database Schema**: See `backend/DATABASE_SCHEMA.md`
- **ANPR Guide**: See `anpr/README.md`
- **Quick Start**: See respective `QUICKSTART.md` files

## 🔮 Future Enhancements

- [ ] Web-based admin dashboard
- [ ] Mobile app for users
- [ ] Payment gateway integration
- [ ] Email/SMS notifications
- [ ] Advanced plate detection (YOLO)
- [ ] Multi-camera support
- [ ] Reporting and analytics
- [ ] Cloud database option

## 📄 License

This project is for educational purposes.

## 👨‍💻 Tech Stack

- **Backend**: Flask, SQLite
- **ANPR**: OpenCV, Tesseract OCR
- **Language**: Python 3.x
- **Database**: SQLite3

---

**Made with ❤️ for Smart Parking Management**
