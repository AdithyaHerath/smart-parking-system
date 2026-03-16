# ESP32 Emulator - Quick Start

## 🚀 Setup (One-time)

```bash
cd esp32-emulator
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## ▶️ Running

### Step 1: Start Backend Server

```bash
# Terminal 1
cd backend
source venv/bin/activate
python app.py
```

Wait for: `Running on http://127.0.0.1:5001`

### Step 2: Start Gate Controller

```bash
# Terminal 2
cd esp32-emulator
source venv/bin/activate
python gate_controller.py
```

### Step 3: Choose Mode

**Option 1 - Interactive (Recommended for testing):**
```
Enter choice (1 or 2): 1

> KA01AB1234        # Enter plate number
> random            # Generate random plate
> status            # Show hardware status
> quit              # Exit
```

**Option 2 - Automatic (Demo mode):**
```
Enter choice (1 or 2): 2

# Watches random cars arrive automatically
# Press Ctrl+C to stop
```

## 📝 Example Session

```
> KA01AB1234
🚗 VEHICLE DETECTED
📤 Sending to backend: KA01AB1234
✅ APPROVED
   Assigned Slot: A01
🎉 Gate Open
⏱️  Keeping gate open for 5 seconds...
🚪 Closing gate...
✓ Gate CLOSED

> KA01AB1234
🚗 VEHICLE DETECTED
📤 Sending to backend: KA01AB1234
❌ DENIED
   Reason: Vehicle is already parked
🚫 Gate Closed

> random
🚗 VEHICLE DETECTED
📤 Sending to backend: TN05XY9876
✅ APPROVED
   Assigned Slot: A02
🎉 Gate Open
```

## 🎯 What It Does

1. **Simulates car detection** at entry gate
2. **Sends plate number** to backend API
3. **Waits for approval** from backend
4. **Opens gate** if approved (5 seconds)
5. **Closes gate** automatically
6. **Shows LED status** (Green/Red/Yellow)

## 🐛 Troubleshooting

**"Cannot connect to backend"**
→ Start backend server first (see Step 1)

**"Connection refused"**
→ Check backend is on port 5001

**Want to change settings?**
→ Edit `gate_controller.py`:
```python
BACKEND_URL = "http://localhost:5001/api"
GATE_OPEN_DURATION = 5  # seconds
```
