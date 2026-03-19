# Smart Parking Dashboard

A modern, responsive web dashboard for monitoring the Smart Parking System.

## 🌟 Features

- **Live Slot Status**: Visual grid showing real-time occupancy
- **Wallet Checker**: Check vehicle wallet balance instantly
- **Parking History**: View complete entry/exit logs
- **Real-time Updates**: Auto-refreshes slot status every 5 seconds
- **Responsive Design**: Works on desktop and mobile
- **Dark Mode**: Premium glassmorphism UI

## 🛠️ Technology Stack

- **HTML5**: Semantic structure
- **CSS3**: Vanilla CSS with variables, gradients, and flexbox/grid
- **JavaScript**: ES6+ with Fetch API
- **Icons**: RemixIcon library

## 🚀 How to Run

1. **Start the Backend Server** (Required)
   ```bash
   cd backend
   source venv/bin/activate
   python app.py
   ```
   Ensure it's running at `http://localhost:5001`.

2. **Open the Dashboard**
   Simply open `index.html` in your web browser.
   
   **Option A: Direct Open**
   Double-click `index.html` in your file explorer.

   **Option B: Live Server (Recommended)**
   If you have VS Code "Live Server" extension, right-click `index.html` and "Open with Live Server".

## 🖥️ Usage

### Slot Monitor
- **Green Slots**: Available for parking
- **Red Slots**: Occupied means a car is parked
- **Refresh**: Click the refresh button or wait for auto-update

### Wallet Check
1. Enter vehicle number (e.g., `KA01AB1234`)
2. Click "Check Balance"
3. View current balance and owner name

### History Log
1. Enter vehicle number
2. Click "Search"
3. View all parking sessions for that vehicle

## 🔧 Configuration

The dashboard connects to `http://localhost:5001/api` by default.
To change this, edit `script.js`:

```javascript
const API_BASE_URL = 'http://your-ip-address:5001/api';
```
