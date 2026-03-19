# ANPR Quick Start Guide

## 🚀 Setup (One-time)

### 1. Install Tesseract OCR

**macOS:**
```bash
brew install tesseract
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr
```

### 2. Find Tesseract Path

```bash
which tesseract
```

Copy the path (e.g., `/opt/homebrew/bin/tesseract`)

### 3. Update Configuration

Edit `anpr_system.py` line 20:
```python
pytesseract.pytesseract.tesseract_cmd = '/YOUR/PATH/HERE'
```

### 4. Install Python Dependencies

```bash
cd anpr
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 🧪 Testing

### Webcam Capture (Single Shot)

```bash
python anpr_system.py --test
```

This captures one image from webcam and processes it.

## 🎮 Running the Full System

### Step 1: Start Backend Server

```bash
# Terminal 1
cd backend
source venv/bin/activate
python app.py
```

Server should start on `http://localhost:5001`

### Step 2: Start Plate Reader

```bash
# Terminal 2
cd anpr
source venv/bin/activate
python anpr_system.py
```

### Step 3: Use the System

1. Position license plate in front of webcam
2. Press **SPACE** to capture and process
3. System will:
   - Extract plate number
   - Send to backend API
   - Assign parking slot
   - Display result

Press **Q** to quit.

## 📊 Expected Flow

```
User positions plate → Press SPACE → Webcam captures image
                                            ↓
                                    OCR extracts text
                                            ↓
                                    Validates plate number
                                            ↓
                                    Sends to backend API
                                            ↓
                                    Backend assigns slot
                                            ↓
                                    Displays success message
```

## 🐛 Common Issues

### "tesseract is not installed"
→ Install Tesseract: `brew install tesseract`

### "Cannot open webcam"
→ Check camera permissions in System Settings

### "No plate detected"
→ Improve lighting, position plate clearly

### "Connection refused"
→ Start backend server first

## 💡 Tips for Best Results

- ✅ Use good lighting (avoid shadows)
- ✅ Keep plate 1-2 feet from camera
- ✅ Face plate directly to camera
- ✅ Ensure plate is clean and readable
- ✅ Avoid reflections on plate surface
