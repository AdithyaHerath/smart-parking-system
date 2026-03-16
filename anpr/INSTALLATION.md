# 🔧 Installation Guide - ANPR Module

## Prerequisites

Before running the ANPR module, you need to install Tesseract OCR.

## Step 1: Install Tesseract OCR

### macOS (Recommended: Homebrew)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Tesseract
brew install tesseract

# Verify installation
tesseract --version
```

**Expected output:**
```
tesseract 5.x.x
```

**Find Tesseract path:**
```bash
which tesseract
```

Common paths:
- Intel Mac: `/usr/local/bin/tesseract`
- Apple Silicon (M1/M2): `/opt/homebrew/bin/tesseract`

### Ubuntu/Debian

```bash
# Update package list
sudo apt-get update

# Install Tesseract
sudo apt-get install -y tesseract-ocr

# Verify installation
tesseract --version

# Find path
which tesseract
# Usually: /usr/bin/tesseract
```

### Windows

1. Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Run the installer
3. Default path: `C:\Program Files\Tesseract-OCR\tesseract.exe`
4. Add to PATH or note the full path

## Step 2: Install Python Dependencies

```bash
cd anpr

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

## Step 3: Configure Tesseract Path

### Option A: Update Python Scripts (Recommended)

Edit `anpr_system.py`:

**For macOS (Intel):**
```python
pytesseract.pytesseract.tesseract_cmd = '/usr/local/bin/tesseract'
```

**For macOS (Apple Silicon M1/M2):**
```python
pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'
```

**For Linux:**
```python
pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
```

**For Windows:**
```python
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

### Option B: Add to System PATH

**macOS/Linux:**
Add to `~/.zshrc` or `~/.bashrc`:
```bash
export PATH="/opt/homebrew/bin:$PATH"
```

Then reload:
```bash
source ~/.zshrc
```

**Windows:**
Add Tesseract directory to System PATH environment variable.

## Step 4: Verify Installation

```bash
cd anpr
source venv/bin/activate

# Test Webcam Capture (Single Shot)
python anpr_system.py --test
```

## Troubleshooting

### "tesseract is not installed or it's not in your PATH"

**Solution 1:** Install Tesseract (see Step 1)

**Solution 2:** Update the path in Python scripts:
```python
# Find your Tesseract path
which tesseract  # macOS/Linux
where tesseract  # Windows

# Update in anpr_system.py line 20
pytesseract.pytesseract.tesseract_cmd = '/YOUR/PATH/HERE'
```

### "TesseractNotFoundError"

The path in the Python script is incorrect.

```bash
# Find correct path
which tesseract

# Update anpr_system.py with the correct path
```

### "ImportError: No module named 'cv2'"

Virtual environment not activated or dependencies not installed.

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### "Cannot open webcam"

**macOS:** Grant camera permissions in System Settings → Privacy & Security → Camera

**Linux:** Check if camera is available:
```bash
ls /dev/video*
```

**All platforms:** Try different camera index in `anpr_system.py`:
```python
CAMERA_INDEX = 1  # Try 0, 1, 2, etc.
```

## Next Steps

After successful installation:

1. **Test Webcam**: `python anpr_system.py --test`
2. **Run Full System**: See `QUICKSTART.md`

## Dependencies Installed

- **opencv-python**: Image processing and webcam capture
- **pytesseract**: Python wrapper for Tesseract OCR
- **requests**: HTTP requests to backend API
- **Pillow**: Image manipulation support

## System Requirements

- **Python**: 3.8 or higher
- **Webcam**: Any USB or built-in camera
- **RAM**: 2GB minimum
- **OS**: macOS, Linux, or Windows
