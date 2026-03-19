# License Plate Reader (ANPR)

Simple Automatic Number Plate Recognition system using OpenCV and Tesseract OCR.

## 🎯 Features

- ✅ **Webcam capture** - Real-time video feed
- ✅ **OCR text extraction** - Tesseract-based plate recognition
- ✅ **Image preprocessing** - Grayscale, filtering, thresholding
- ✅ **Text validation** - Cleans and validates plate numbers
- ✅ **Backend integration** - Sends plate to parking API
- ✅ **Interactive UI** - Simple OpenCV window interface

## 📋 Prerequisites

### 1. Install Tesseract OCR

**macOS (Homebrew):**
```bash
brew install tesseract
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

**Windows:**
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki

### 2. Verify Tesseract Installation

```bash
tesseract --version
```

You should see version information (e.g., `tesseract 5.x.x`)

### 3. Find Tesseract Path

**macOS (Homebrew):**
```bash
which tesseract
# Usually: /opt/homebrew/bin/tesseract
```

**Linux:**
```bash
which tesseract
# Usually: /usr/bin/tesseract
```

**Windows:**
```
C:\Program Files\Tesseract-OCR\tesseract.exe
```

## 🚀 Installation

### 1. Create Virtual Environment

```bash
cd anpr
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Tesseract Path

Edit `anpr_system.py` line 20 to match your Tesseract installation:

```python
# For macOS with Homebrew
pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'

# For Linux
pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

# For Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

## 🎮 Usage

### Interactive Mode (Recommended)

```bash
# Make sure backend server is running first!
cd anpr
source venv/bin/activate
python anpr_system.py
```

**Controls:**
- **SPACE** - Capture image and process plate
- **Q** - Quit application

### Test Mode (Single Capture)

```bash
python anpr_system.py --test
```

This captures one image, saves it as `captured_plate.jpg`, and processes it.

## 🔧 How It Works

### 1. Image Capture
```python
# Captures frame from webcam
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
```

### 2. Image Preprocessing
```python
# Convert to grayscale
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

# Reduce noise with bilateral filter
gray = cv2.bilateralFilter(gray, 11, 17, 17)

# Apply adaptive thresholding
thresh = cv2.adaptiveThreshold(gray, 255, ...)
```

### 3. OCR Text Extraction
```python
# Extract text using Tesseract
text = pytesseract.image_to_string(processed, config=custom_config)
```

### 4. Text Cleaning & Validation
```python
# Remove special characters, validate length
plate_number = clean_plate_text(text)
```

### 5. Send to Backend
```python
# POST to vehicle entry API
response = requests.post(
    "http://localhost:5001/api/vehicle/entry",
    json={"vehicle_number": plate_number}
)
```

## 📊 Expected Output

```
╔════════════════════════════════════════════════════════╗
║        License Plate Reader with OCR                  ║
║        Powered by OpenCV + Tesseract                  ║
╚════════════════════════════════════════════════════════╝

============================================================
License Plate Reader - Starting...
============================================================
✓ Webcam initialized

Instructions:
  - Position license plate in front of camera
  - Press SPACE to capture and process
  - Press 'q' to quit
============================================================

============================================================
📸 Capturing image at 08:52:30
🔍 Processing image with OCR...
✓ Plate detected: KA01AB1234
📤 Sending to backend API...
✅ SUCCESS!
   Vehicle: KA01AB1234
   Slot: A01
   Entry Time: 2026-02-06T08:52:30.123456
============================================================
```

## ⚙️ Configuration

### Backend URL
Edit line 15 in `anpr_system.py`:
```python
BACKEND_URL = "http://localhost:5001/api"
```

### Camera Index
Edit line 23 in `anpr_system.py`:
```python
CAMERA_INDEX = 0  # 0 = default webcam, 1 = external camera
```

### OCR Configuration
Edit the `custom_config` in `extract_plate_text()` function:
```python
# --psm 7: Single text line mode
# --psm 6: Uniform block of text
# --psm 8: Single word
custom_config = r'--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
```

## 🐛 Troubleshooting

### "tesseract is not installed"
```bash
# Install Tesseract first
brew install tesseract  # macOS
sudo apt-get install tesseract-ocr  # Linux
```

### "Cannot open webcam"
```bash
# Check camera permissions in System Settings (macOS)
# Try different camera index (0, 1, 2...)
CAMERA_INDEX = 1
```

### "No plate detected"
- Ensure good lighting
- Position plate clearly in frame
- Try different angles
- Clean the camera lens
- Adjust preprocessing parameters

### "Cannot connect to backend API"
```bash
# Make sure Flask server is running
cd ../backend
source venv/bin/activate
python app.py
```

### Poor OCR Accuracy
- Use better lighting (avoid shadows)
- Ensure plate is in focus
- Try different Tesseract PSM modes
- Adjust preprocessing filters
- Use higher resolution camera

## 📝 Notes

- **Plate Format**: Works best with standard format plates (6-10 characters)
- **Lighting**: Good lighting is crucial for OCR accuracy
- **Distance**: Keep plate 1-2 feet from camera
- **Angle**: Face plate directly to camera (avoid skew)
- **Backend**: Ensure backend server is running before use

## 🔮 Future Enhancements

- [ ] Add plate detection using Haar Cascades or YOLO
- [ ] Support multiple plate formats (different countries)
- [ ] Add confidence score for OCR results
- [ ] Implement plate tracking across frames
- [ ] Add GUI with Tkinter or PyQt
- [ ] Support video file input
- [ ] Add database of known plates
- [ ] Implement plate exit detection

## 📚 Dependencies

- **opencv-python**: Webcam capture and image processing
- **pytesseract**: OCR text extraction
- **requests**: HTTP API calls
- **Pillow**: Image manipulation support
