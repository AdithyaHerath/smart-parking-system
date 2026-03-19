#!/usr/bin/env python3
"""
Master Launcher for Smart Parking System
Connects all components: Backend, ESP32 Emulator, and Web Dashboard.
Automatically manages virtual environments to avoid system package errors.
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.absolute()
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
ESP32_DIR = PROJECT_ROOT / "esp32-emulator"
ANPR_DIR = PROJECT_ROOT / "anpr"

def print_header(title):
    print("\n" + "="*60)
    print(f"🚀 {title}")
    print("="*60)

def get_venv_python(base_dir):
    """Get path to python executable in virtual environment"""
    if sys.platform == "win32":
        return base_dir / "venv" / "Scripts" / "python.exe"
    return base_dir / "venv" / "bin" / "python"

def ensure_venv(base_dir):
    """Ensure virtual environment exists, create if missing"""
    venv_path = base_dir / "venv"
    if not venv_path.exists():
        print(f"📦 Creating venv in {base_dir.name}...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], cwd=base_dir, check=True)
    return get_venv_python(base_dir)

def install_deps(base_dir):
    """Install dependencies in the specific venv"""
    venv_python = ensure_venv(base_dir)
    req_file = base_dir / "requirements.txt"
    
    if req_file.exists():
        print(f"⬇️  Installing dependencies for {base_dir.name}...")
        subprocess.run(
            [str(venv_python), "-m", "pip", "install", "-r", "requirements.txt"], 
            cwd=base_dir,
            check=True
        )

def check_python():
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required")
        sys.exit(1)

def setup_components():
    print_header("Setting up Virtual Environments & Dependencies")
    
    try:
        install_deps(BACKEND_DIR)
        install_deps(ESP32_DIR)
        install_deps(ANPR_DIR)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        sys.exit(1)

def start_backend():
    print_header("Starting System Components")
    print("🔌 Starting Backend Server...")
    
    venv_python = get_venv_python(BACKEND_DIR)
    
    # Start backend in a separate process
    backend_process = subprocess.Popen(
        [str(venv_python), "app.py"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait a bit for backend to start
    print("⏳ Waiting for backend to initialize...")
    time.sleep(3)
    
    if backend_process.poll() is None:
        print("✅ Backend Server Running (Port 5001)")
    else:
        print("❌ Failed to start Backend Server")
        sys.exit(1)
        
    return backend_process

def open_dashboard():
    print("🖥️  Opening Web Dashboard...")
    dashboard_path = FRONTEND_DIR / "index.html"
    webbrowser.open(f"file://{dashboard_path}")

def run_esp32_controller():
    print("\n📋 Instructions:")
    print("1. The Backend is running in the background.")
    print("2. The Web Dashboard opens in your browser.")
    print("3. You are now controlling the ESP32 GATE EMULATOR.")
    print("4. Use commands 'entry [plate]' or 'exit [plate]' to simulate cars.")
    
    print("\n⚠️  To stop everything, press Ctrl+C")
    
    venv_python = get_venv_python(ESP32_DIR)
    
    # Run the interactive gate controller in the main thread
    try:
        subprocess.run([str(venv_python), "gate_controller.py"], cwd=ESP32_DIR)
    except KeyboardInterrupt:
        pass

def main():
    check_python()
    setup_components()
    
    backend_proc = start_backend()
    open_dashboard()
    
    try:
        run_esp32_controller()
    except KeyboardInterrupt:
        print("\n👋 Stopping system...")
    finally:
        print("\n🛑 Shutting down backend...")
        backend_proc.terminate()
        backend_proc.wait()
        print("✅ System Shutdown Complete")

if __name__ == "__main__":
    main()
