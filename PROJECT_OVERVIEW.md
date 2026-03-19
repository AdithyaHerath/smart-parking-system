# 🅿️ SMART PARKING SYSTEM - PROJECT OVERVIEW

This document provides a comprehensive technical breakdown of the Smart Parking System, explaining the purpose, functionality, and interaction of each major component.

---

## 1. 👁️ ANPR System (`/anpr`)
**Automatic Number Plate Recognition (The "Eyes")**
The ANPR module is responsible for detecting and reading vehicle license plates in real-time using computer vision.

*   **Key File**: `anpr_system.py`
*   **Technologies**: OpenCV, EasyOCR, Python
*   **Core Functions**:
    1.  **Video Capture**: Reads a live feed from a connected webcam.
    2.  **Plate Detection**: Identifies the rectangular region of a license plate.
    3.  **OCR Processing**: Converts the image text into a string (e.g., "WP CAM 1234").
    4.  **Intelligent Cleaning**: 
        *   Removes non-alphanumeric noise.
        *   Filters out province codes (e.g., `WP`, `CP`, `NW`) from the start.
        *   Filters out fuel types (e.g., `P`, `D`) from the end if they are redundant.
        *   Corrects common OCR errors (e.g., `G` -> `6`, `I` -> `1`).
    5.  **API Communication**: Sends the clean plate number to the **Backend** to trigger Entry/Exit logic.
*   **Operational Modes**:
    *   **Manual Mode**: Wait for a mouse click to capture and scan (for testing).
    *   **Auto Mode**: Automatically scans every 2 seconds (for deployment).

---

## 2. 🧠 Backend API (`/backend`)
**Central Server & Logic (The "Brain")**
The backend handles all business logic, data storage, and decision-making. It acts as the bridge between the ANPR, Frontend, and Hardware (Emulator).

*   **Key Files**: `app.py`, `routes/user.py`, `routes/admin.py`
*   **Technologies**: Python (Flask), SQLite
*   **Core Responsibilities**:
    *   **Authentication**: rigorous login/registration handling with role-based access (Admin vs User).
    *   **Parking Logic**:
        *   **Entry**: Checks if the vehicle is registered, approved, and has enough wallet balance. Assigns the nearest available slot.
        *   **Exit**: Calculates duration, deducts fee from wallet, and marks the slot as free.
    *   **Wallet System**: Manages user credits. parking fees are auto-deducted on exit.
    *   **Admin Controls**: Allows admins to approve/reject new vehicle registrations and set parking rates.
    *   **Database Management**: Stores user profiles, vehicle details, live slot status, and transaction logs in `parking.db`.

---

## 3. 💻 Frontend Dashboard (`/frontend`)
**User Interface (The "Face")**
A responsive web application for users and administrators to interact with the system.

*   **Key Files**: 
    *   `login.html`: Secure entry point.
    *   `user_dashboard.html`: The driver's portal.
    *   `admin_dashboard.html`: The manager's control center.
*   **Technologies**: HTML5, CSS3 (Glassmorphism Design), JavaScript (Vanilla)
*   **Features**:
    *   **For Users**:
        *   **Live Map**: See real-time availability of parking slots (Green = Free, Red = Occupied).
        *   **Smart Wallet**: Top-up account balance instantly using a simulated payment gateway.
        *   **Vehicle Management**: Register new cars and view approval status.
        *   **Manual Exit**: trigger an exit manually if the ANPR fails or for testing.
    *   **For Admins**:
        *   **Fleet Oversight**: View all parked cars and their owners.
        *   **Approvals**: Review pending vehicle registration requests with one click.
        *   **Revenue Config**: Update hourly parking rates (`waiting_fee`) and minimum balance requirements dynamically.

---

## 4. 🤖 ESP32 Emulator (`/esp32-emulator`)
**Hardware Simulation (The "Peripherals")**
In a physical deployment, this would be an ESP32 microcontroller controlling sensors and barrier gates. This software emulator mimics that hardware behavior for development and testing.

*   **What it Simulates**:
    1.  **Ultrasonic Sensors**: 
        *   Randomly toggles slot occupancy (sends "Slot A1 Occupied" signals to backend).
        *   This tests the Frontend's real-time map updates without needing real cars.
    2.  **Barrier Gate Servo**:
        *   Listens for `OPEN_GATE` commands from the Backend.
        *   Prints "🚧 GATE OPENING 🚧" to the console to confirm the logic worked.
*   **Why it's Crucial**: It allows full system testing (Software + "Hardware") on a single laptop without needing physical components.

---

## 🔄 System Workflow (End-to-End)

1.  **Arrival**: A car pulls up. The **ANPR** camera sees it and reads "CAM 1234".
2.  **Validation**: ANPR sends "CAM 1234" to **Backend**.
3.  **Logic Check**: 
    *   Backend checks DB: *Is "CAM 1234" registered? Is wallet balance > Rs.100?*
4.  **Decision**:
    *   **Success**: Backend assigns Slot A3, deducts entry fee (if any), and sends `OPEN` command to **Emulator**.
    *   **Failure**: Backend returns "Insufficient Funds" or "Not Registered".
5.  **Feedback**:
    *   **Gate**: Opens (simulated by Emulator).
    *   **User App**: Dashboard updates Slot A3 to **Red (Occupied)**.
    *   **Admin Panel**: Logs the entry time and vehicle details.

---

## 🚀 Deployment & Installation

*   **Requirements**: Python 3.9+, Webcam.
*   **Setup**:
    1.  Install dependencies: `pip install -r requirements.txt` (in each folder).
    2.  Start Backend: `python app.py`.
    3.  Start Frontend: Open `login.html`.
    4.  Start ANPR: `python anpr_system.py`.
    5.  Start Emulator: `python esp32-emulator/gate_controller.py`.

This modular architecture ensures that any part (e.g., replacing the Emulator with real ESP32s) can be upgraded without breaking the rest of the system.
