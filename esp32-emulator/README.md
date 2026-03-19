# ESP32 Gate Controller Emulator

Python-based emulator for ESP32 microcontroller that controls a parking gate.

## 🎯 Features

- ✅ **Car detection simulation** - Simulates IR/ultrasonic sensor
- ✅ **Backend communication** - Sends plate data to Flask API
- ✅ **Approval waiting** - Waits for backend response
- ✅ **Gate control** - Opens/closes based on approval
- ✅ **LED indicators** - Green (success), Red (error), Yellow (processing)
- ✅ **Two modes** - Interactive and Automatic
- ✅ **Hardware simulation** - GPIO pins, servo motor, sensors

## 🔧 Hardware Simulation

### Simulated Components

| Component | GPIO Pin | Purpose |
|-----------|----------|---------|
| Car Sensor | GPIO 2 | Detects vehicle presence |
| Servo Motor | GPIO 9 | Controls gate movement |
| Green LED | GPIO 13 | Success indicator |
| Red LED | GPIO 12 | Error indicator |
| Yellow LED | GPIO 14 | Processing indicator |

### Gate States

- **CLOSED** - Default state, servo at 0°
- **OPEN** - Vehicle allowed, servo at 90°

## 🚀 Installation

```bash
cd esp32-emulator

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## 🎮 Usage

### Prerequisites

**Backend server must be running:**
```bash
# In another terminal
cd backend
source venv/bin/activate
python app.py
```

### Run the Emulator

```bash
cd esp32-emulator
source venv/bin/activate
python gate_controller.py
```

## 📋 Operating Modes

### 1. Interactive Mode (Default)

Manual control - you trigger car detection by entering plate numbers.

**Commands:**
- `KA01AB1234` - Enter any plate number
- `random` - Generate random Indian plate
- `status` - Show hardware status
- `quit` or `q` - Exit

**Example:**
```
> KA01AB1234
🚗 VEHICLE DETECTED - 08:57:30
📋 License Plate: KA01AB1234
📤 Sending to backend...
✅ APPROVED
   Assigned Slot: A01
🎉 Gate Open
⏱️  Keeping gate open for 5 seconds...
🚪 Closing gate...
```

### 2. Automatic Mode

Simulates random car arrivals every 2-10 seconds.

**Select option 2 when prompted:**
```
Select mode:
  1. Interactive mode (manual control)
  2. Automatic mode (random cars)

Enter choice (1 or 2): 2
```

## 🔄 System Flow

```
┌─────────────────────────────────────────────────────┐
│  1. Car Detection Sensor Triggered                  │
│     (Simulated by user input or automatic)          │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────┐
│  2. Yellow LED ON (Processing)                      │
│     Display: "VEHICLE DETECTED"                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────┐
│  3. Send Plate to Backend API                       │
│     POST /api/vehicle/entry                         │
│     {"vehicle_number": "KA01AB1234"}                │
└────────────────┬────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────┐
│  4. Wait for Backend Response                       │
│     Display: "Waiting for approval..."              │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ↓                 ↓
┌──────────────┐  ┌──────────────┐
│  SUCCESS     │  │  FAILURE     │
│  (201)       │  │  (4xx/5xx)   │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ↓                 ↓
┌──────────────┐  ┌──────────────┐
│ Green LED ON │  │ Red LED ON   │
│ Yellow OFF   │  │ Yellow OFF   │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ↓                 ↓
┌──────────────┐  ┌──────────────┐
│ GATE OPEN    │  │ GATE CLOSED  │
│ Servo → 90°  │  │ Servo → 0°   │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ↓                 ↓
┌──────────────┐  ┌──────────────┐
│ Wait 5 sec   │  │ Display      │
│              │  │ Error Msg    │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ↓                 ↓
┌──────────────┐  ┌──────────────┐
│ GATE CLOSE   │  │ Wait 3 sec   │
│ Servo → 0°   │  │              │
└──────┬───────┘  └──────┬───────┘
       │                 │
       ↓                 ↓
┌──────────────┐  ┌──────────────┐
│ Green LED    │  │ Red LED OFF  │
│ OFF          │  │              │
└──────────────┘  └──────────────┘
```

## 📊 Example Output

### Successful Entry
```
╔════════════════════════════════════════════════════════╗
║        ESP32 Gate Controller Emulator                 ║
║        Smart Parking System - Entry Gate             ║
╚════════════════════════════════════════════════════════╝

🔧 Initializing ESP32 Gate Controller...
   Sensor Pin: GPIO 2
   Servo Pin: GPIO 9
   Green LED: GPIO 13
   Red LED: GPIO 12
   Yellow LED: GPIO 14
✓ Hardware initialized

🔍 Checking backend connectivity...
✓ Backend server is running

============================================================
🚗 VEHICLE DETECTED - 08:57:30
============================================================

📋 License Plate: KA01AB1234
   💡 YELLOW LED (GPIO 14): ON

📤 Sending to backend: KA01AB1234
   URL: http://localhost:5001/api/vehicle/entry
   Response: 201

⏳ Waiting for backend approval...

✅ APPROVED
   💡 YELLOW LED (GPIO 14): OFF
   💡 GREEN LED (GPIO 13): ON
   Assigned Slot: A01
   Entry Time: 2026-02-06T08:57:30.123456

🎉 Gate Open
🚪 Opening gate...
   [Servo] Moving to 90°
   ✓ Gate OPEN

⏱️  Keeping gate open for 5 seconds...
   Closing in 1...

🚪 Closing gate...
   [Servo] Moving to 0°
   ✓ Gate CLOSED
   💡 GREEN LED (GPIO 13): OFF

📊 Status: Gate=CLOSED 🔴 | Sensor=NO CAR | LEDs=⚫⚫⚫
```

### Failed Entry (Vehicle Already Parked)
```
============================================================
🚗 VEHICLE DETECTED - 08:58:15
============================================================

📋 License Plate: KA01AB1234
   💡 YELLOW LED (GPIO 14): ON

📤 Sending to backend: KA01AB1234
   Response: 400

⏳ Waiting for backend approval...

❌ DENIED
   💡 YELLOW LED (GPIO 14): OFF
   💡 RED LED (GPIO 12): ON
   Reason: Vehicle is already parked

🚫 Gate Closed
🚪 Closing gate...
   ✓ Gate CLOSED
   💡 RED LED (GPIO 12): OFF

📊 Status: Gate=CLOSED 🔴 | Sensor=NO CAR | LEDs=⚫⚫⚫
```

## ⚙️ Configuration

Edit `gate_controller.py`:

```python
# Backend URL
BACKEND_URL = "http://localhost:5001/api"

# Gate timing
GATE_OPEN_DURATION = 5  # seconds to keep gate open
SENSOR_CHECK_INTERVAL = 2  # seconds between sensor checks

# GPIO pins (for reference)
class Pin(Enum):
    SENSOR = 2
    GATE_SERVO = 9
    LED_GREEN = 13
    LED_RED = 12
    LED_YELLOW = 14
```

## 🐛 Troubleshooting

### "Cannot connect to backend server"
**Solution:** Start the backend server first
```bash
cd backend
source venv/bin/activate
python app.py
```

### "Connection refused"
**Solution:** Check backend URL and port
```python
BACKEND_URL = "http://localhost:5001/api"  # Default port is 5001
```

### Gate doesn't close
**Solution:** This is a simulation - gate closes automatically after timeout

## 🔮 Real ESP32 Implementation

To implement this on real ESP32 hardware:

1. **Replace simulation with real GPIO:**
   ```python
   from machine import Pin, PWM
   
   sensor = Pin(2, Pin.IN)
   servo = PWM(Pin(9), freq=50)
   led_green = Pin(13, Pin.OUT)
   ```

2. **Add WiFi connection:**
   ```python
   import network
   wlan = network.WLAN(network.STA_IF)
   wlan.connect('SSID', 'password')
   ```

3. **Use urequests instead of requests:**
   ```python
   import urequests as requests
   ```

4. **Flash to ESP32:**
   ```bash
   esptool.py --port /dev/ttyUSB0 write_flash 0x1000 firmware.bin
   ```

## 📝 Notes

- This is a **software emulator** - no real hardware required
- Simulates all ESP32 hardware components
- Perfect for testing backend integration
- Can be used for demos and development

## 🎓 Learning Resources

- **ESP32 Documentation**: https://docs.espressif.com/
- **MicroPython**: https://micropython.org/
- **Servo Control**: PWM signals at 50Hz
- **IR Sensors**: Digital input (HIGH/LOW)
