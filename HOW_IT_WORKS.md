# 🧠 How The Smart Parking System Works

This document explains the "magic" behind the system components.

## 1. The Big Picture 🗺️

Think of the system as a **brain (Backend)** connected to **eyes (Camera/ANPR)** and a **face (Dashboard)**.

1.  **The Brain (Flask Backend)**: Needs to know everything. It stores data in a digital notebook (Database).
2.  **The Eyes (ANPR/Camera)**: Sees a car, reads the text, and tells the brain "Hey, KA01AB1234 is here!"
3.  **The Face (Dashboard)**: Shows what the brain knows (Occupied slots, Wallet balance).

---

## 2. How the Camera Detects Plates (ANPR) 📸

This is the most complex part, broken down into 4 steps:

### Step 1: Capture
The Python script (`anpr_system.py`) wakes up your webcam. It takes 30 pictures per second (frames).

### Step 2: Pre-processing (Cleaning)
Computers read high-contrast text best. We use **OpenCV** to:
1.  Turn the image **Grayscale** (remove color noise).
2.  Apply **Blur** (remove graininess).
3.  Apply **Thresholding** (make it purely Black & White).

### Step 3: OCR (Reading)
We feed this clean, black-and-white image to **Tesseract**.
*   **Tesseract** scans shapes. It recognizes that "two diagonal lines crossing" is an `X`.
*   It gives us raw text: `~KA-01_AB.1234`.

### Step 4: Validation (Thinking)
Our script cleans up the text:
*   Removes symbols: `KA01AB1234`
*   Checks rules: "Is it 6-10 characters long?" "Is it alphanumeric?"
*   If VALID -> It sends it to the Backend.

---

## 3. How Vehicle Registration Works 📝

We built an **Automatic First-Time Registration** system. You don't need a separate signup form!

**The Logic:**
1.  Car enters for the first time.
2.  Backend checks database: "Do I know this Vehicle ID?"
3.  **NO**: Creates a new record automatically.
    *   Sets Wallet = **Rs.100 (Free Bonus)**.
    *   Sets Owner = "Unknown" (can be updated later).
4.  **YES**: Checks existing wallet balance.

**To Top-Up:**
Use the Dashboard or API to add money. A "Manual Registration" is just topping up a new number for the first time.

---

## 4. Web Dashboard & Admin View 🖥️

Currently, the **User App** and **Admin Dashboard** are combined into one interface for simplicity.

### 🚗 User View (What Drivers See)
*   **Live Slot Status**: The grid of Red/Green boxes.
    *   *How it works*: Every 5 seconds, the webpage asks the backend `/api/slots`. If the DB says `is_occupied=1`, the box turns Red.
*   **Wallet Checker**: Drivers type their plate to see their balance.

### 👮 Admin View (What You See)
*   **Logs & History**: The "Recent Activity" table.
*   **Financials**: We added a secret `TransactionLogs` table locally that tracks every Rs.10 fee collected.
*   **Control**: You can manually "Simulate Entry" to test the system.

---

## 5. End-to-End Story: "John's Parking"

1.  **Arrival**: John drives his car (`KA05XY9999`) to the gate.
2.  **Detection**: The Camera (or ESP32 Emulator) sees him.
3.  **API Call**: The system sends `POST /vehicle/entry` to the backend.
4.  **Decision**:
    *   Backend checks: "Is Slot A01 free? Yes."
    *   Backend checks: "Is this a new car? Yes.Create account with Rs.100."
    *   Backend says: "Open Gate. Assigned Slot A01."
5.  **Parking**: The Dashboard updates Slot A01 to **RED**.
6.  **Exit (2 Hours Later)**:
    *   John drives to the exit.
    *   System sends `POST /vehicle/exit`.
    *   Backend calculates: "2 Hours * Rs.10 = Rs.20 Fee."
    *   Backend Logic: "Wallet (Rs.100) - Fee (Rs.20) = New Balance (Rs.80)."
    *   **Success**: Gate opens. Slot A01 turns **GREEN**.
