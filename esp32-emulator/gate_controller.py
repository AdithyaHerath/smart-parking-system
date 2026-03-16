#!/usr/bin/env python3
"""
ESP32 Gate Controller Emulator
Simulates an ESP32 microcontroller controlling a parking gate

Features:
- Simulates car detection sensor
- Sends plate data to backend API
- Waits for backend approval
- Controls gate (open/close)
- LED status indicators
"""

import os
import requests
import time
import random
from datetime import datetime
from enum import Enum

# ==================== CONFIGURATION ====================

# Backend API configuration
BACKEND_URL = os.environ.get('BACKEND_URL', "http://localhost:5001/api")

# Gate configuration
GATE_OPEN_DURATION = 5  # seconds to keep gate open
SENSOR_CHECK_INTERVAL = 2  # seconds between sensor checks

# Simulated hardware pins (for display purposes)
class Pin(Enum):
    SENSOR = 2          # Car detection sensor
    GATE_SERVO = 9      # Servo motor for gate
    LED_GREEN = 13      # Green LED (success)
    LED_RED = 12        # Red LED (error)
    LED_YELLOW = 14     # Yellow LED (processing)

# ==================== HARDWARE SIMULATION ====================

class GateController:
    """Simulates ESP32 gate controller hardware"""
    
    def __init__(self):
        self.gate_open = False
        self.car_detected = False
        self.led_status = {
            'green': False,
            'red': False,
            'yellow': False
        }
        print("🔧 Initializing ESP32 Gate Controller...")
        print(f"   Sensor Pin: GPIO {Pin.SENSOR.value}")
        print(f"   Servo Pin: GPIO {Pin.GATE_SERVO.value}")
        print(f"   Green LED: GPIO {Pin.LED_GREEN.value}")
        print(f"   Red LED: GPIO {Pin.LED_RED.value}")
        print(f"   Yellow LED: GPIO {Pin.LED_YELLOW.value}")
        print("✓ Hardware initialized\n")
    
    def read_sensor(self):
        """
        Simulate reading from car detection sensor
        Returns: True if car detected, False otherwise
        """
        # In real ESP32, this would read from an IR sensor or ultrasonic sensor
        # For simulation, we'll return the current state
        return self.car_detected
    
    def open_gate(self):
        """Open the gate (move servo to 90 degrees)"""
        if not self.gate_open:
            print("🚪 Opening gate...")
            print("   [Servo] Moving to 90°")
            time.sleep(0.5)  # Simulate servo movement time
            self.gate_open = True
            print("   ✓ Gate OPEN")
    
    def close_gate(self):
        """Close the gate (move servo to 0 degrees)"""
        if self.gate_open:
            print("🚪 Closing gate...")
            print("   [Servo] Moving to 0°")
            time.sleep(0.5)  # Simulate servo movement time
            self.gate_open = False
            print("   ✓ Gate CLOSED")
    
    def set_led(self, color, state):
        """
        Control LED status
        Args:
            color: 'green', 'red', or 'yellow'
            state: True (on) or False (off)
        """
        if color in self.led_status:
            self.led_status[color] = state
            status = "ON" if state else "OFF"
            pin = {
                'green': Pin.LED_GREEN.value,
                'red': Pin.LED_RED.value,
                'yellow': Pin.LED_YELLOW.value
            }
            print(f"   💡 {color.upper()} LED (GPIO {pin[color]}): {status}")
    
    def all_leds_off(self):
        """Turn off all LEDs"""
        for color in self.led_status:
            self.set_led(color, False)
    
    def display_status(self):
        """Display current hardware status"""
        gate_status = "OPEN 🟢" if self.gate_open else "CLOSED 🔴"
        car_status = "DETECTED 🚗" if self.car_detected else "NO CAR"
        
        leds = []
        if self.led_status['green']:
            leds.append("🟢")
        if self.led_status['yellow']:
            leds.append("🟡")
        if self.led_status['red']:
            leds.append("🔴")
        led_display = " ".join(leds) if leds else "⚫⚫⚫"
        
        print(f"\n📊 Status: Gate={gate_status} | Sensor={car_status} | LEDs={led_display}\n")

# ==================== BACKEND COMMUNICATION ====================

def send_entry_request(plate_number, owner_name="Unknown"):
    """Send vehicle entry request"""
    return make_api_request("vehicle/entry", {
        "vehicle_number": plate_number, 
        "owner_name": owner_name
    })

def send_exit_request(plate_number):
    """Send vehicle exit request"""
    return make_api_request("vehicle/exit", {
        "vehicle_number": plate_number
    })

def make_api_request(endpoint, data):
    """Generic API request handler"""
    try:
        url = f"{BACKEND_URL}/{endpoint}"
        print(f"📤 Sending to backend: {data['vehicle_number']}")
        print(f"   URL: {url}")
        
        response = requests.post(url, json=data, timeout=5)
        print(f"   Response: {response.status_code}")
        
        return {
            "success": response.status_code in [200, 201],
            "status_code": response.status_code,
            "data": response.json()
        }
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return {"success": False, "error": str(e)}

# ==================== MAIN GATE LOGIC ====================

def process_vehicle(controller, plate_number, mode="ENTRY"):
    """
    Process vehicle at gate
    Args:
        controller: GateController instance
        plate_number: License plate number
        mode: "ENTRY" or "EXIT"
    """
    print("\n" + "="*60)
    print(f"🚗 VEHICLE DETECTED AT {mode} GATE - {datetime.now().strftime('%H:%M:%S')}")
    print("="*60)
    
    # Step 1: Processing indicator
    controller.all_leds_off()
    controller.set_led('yellow', True)
    print(f"\n📋 License Plate: {plate_number}")
    
    # Step 2: Send to backend
    if mode == "ENTRY":
        result = send_entry_request(plate_number)
    else:
        result = send_exit_request(plate_number)
    
    # Step 3: Wait for response
    print("\n⏳ Processing...")
    time.sleep(1)
    
    # Step 4: Handle Response
    if result.get('success'):
        # SUCCESS
        print("\n✅ APPROVED")
        controller.set_led('yellow', False)
        controller.set_led('green', True)
        
        data = result['data']['data']
        
        if mode == "ENTRY":
            print(f"   Assigned Slot: {data['slot_number']}")
            print(f"   Entry Time: {data['entry_time']}")
        else:
            print(f"   Duration: {data['duration_minutes']} mins")
            print(f"   Fee: Rs.{data['parking_fee']}")
            print(f"   Wallet Balance: Rs.{data['wallet_balance']}")
            print(f"   Status: PAID & EXITING")
            
        # Open gate
        print("\n🎉 Gate Open")
        controller.open_gate()
        
        # Keep gate open
        print(f"\n⏱️  Keeping gate open for {GATE_OPEN_DURATION} seconds...")
        time.sleep(GATE_OPEN_DURATION)
        
        # Close gate
        controller.close_gate()
        controller.set_led('green', False)
        
    else:
        # FAILURE
        print("\n❌ DENIED")
        controller.set_led('yellow', False)
        controller.set_led('red', True)
        
        error_msg = result.get('error') or result.get('data', {}).get('message', 'Unknown error')
        print(f"   Reason: {error_msg}")
        
        if mode == "EXIT" and "wallet" in error_msg.lower():
            print("   ⚠️  Please recharge wallet")
        
        print("\n🚫 Gate Closed")
        controller.close_gate()
        time.sleep(3)
        controller.set_led('red', False)
    
    controller.display_status()
    return result.get('success', False)


# ==================== SIMULATION MODES ====================

def interactive_mode(controller):
    """Interactive control mode"""
    print("\n" + "="*60)
    print("🎮 INTERACTIVE MODE")
    print("="*60)
    print("Commands:")
    print("  entry [plate]  - Simulate entry (e.g. 'entry KA01AB1234')")
    print("  exit [plate]   - Simulate exit (e.g. 'exit KA01AB1234')")
    print("  status         - Show hardware status")
    print("  quit           - Exit")
    print("="*60)
    
    while True:
        try:
            user_input = input("\n> ").strip().split()
            if not user_input: continue
            
            cmd = user_input[0].lower()
            
            if cmd in ['quit', 'q'] and len(user_input) == 1:
                break
                
            elif cmd == 'status':
                controller.display_status()
                
            elif cmd in ['entry', 'exit']:
                mode = "ENTRY" if cmd == 'entry' else "EXIT"
                
                if len(user_input) > 1:
                    plate = user_input[1].upper()
                else:
                    plate = f"TEST{random.randint(1000,9999)}"
                    
                controller.car_detected = True
                process_vehicle(controller, plate, mode)
                controller.car_detected = False
                
            else:
                # Default to entry if just plate provided
                plate = cmd.upper()
                controller.car_detected = True
                process_vehicle(controller, plate, "ENTRY")
                controller.car_detected = False
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

def auto_mode(controller):
    """Automatic random simulation"""
    print("\n" + "="*60)
    print("🤖 AUTO SIMULATION MODE")
    print("="*60)
    
    parked_cars = []
    
    try:
        while True:
            # Randomly decide: Entry (70%) or Exit (30%)
            action = "ENTRY"
            if parked_cars and random.random() < 0.3:
                action = "EXIT"
            
            if action == "ENTRY":
                plate = f"KA{random.randint(10,99)}AB{random.randint(1000,9999)}"
                print(f"\n[AUTO] New car arriving: {plate}")
                success = process_vehicle(controller, plate, "ENTRY")
                if success:
                    parked_cars.append(plate)
                
            else:
                plate = random.choice(parked_cars)
                print(f"\n[AUTO] Car exiting: {plate}")
                success = process_vehicle(controller, plate, "EXIT")
                if success:
                    parked_cars.remove(plate)
                
            time.sleep(random.randint(3, 7))
            
    except KeyboardInterrupt:
        print("\nStopped.")

# ==================== MAIN ====================

def main():
    """Main entry point"""
    print("""
    ╔════════════════════════════════════════════════════════╗
    ║        ESP32 Gate Controller Emulator                 ║
    ║        Smart Parking System - Entry Gate             ║
    ╚════════════════════════════════════════════════════════╝
    """)
    
    # Initialize hardware
    controller = GateController()
    controller.display_status()
    
    # Check backend connectivity
    print("🔍 Checking backend connectivity...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=3)
        if response.status_code == 200:
            print("✓ Backend server is running\n")
        else:
            print(f"⚠️  Backend returned status {response.status_code}\n")
    except requests.RequestException:
        print("❌ WARNING: Cannot connect to backend server")
        print(f"   Make sure backend is running at {BACKEND_URL}\n")
    
    # Choose mode
    print("Select mode:")
    print("  1. Interactive mode (manual control)")
    print("  2. Automatic mode (random cars)")
    
    choice = input("\nEnter choice (1 or 2): ").strip()
    
    if choice == '2':
        auto_mode(controller)
    else:
        interactive_mode(controller)
    
    # Cleanup
    controller.all_leds_off()
    controller.close_gate()
    print("\n✓ Gate controller shutdown complete")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
