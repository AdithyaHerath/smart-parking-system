#!/usr/bin/env python3
"""
ESP32 Gate Controller Emulator - CLOUD CONNECTED
Logic: Fixed Daily Fee. Payment at Entry. Exit Frees Slot.
"""

import requests
import time
import random
from datetime import datetime
from enum import Enum

# ==================== CONFIGURATION ====================
GATE_OPEN_DURATION = 5  
SENSOR_CHECK_INTERVAL = 2  

class Pin(Enum):
    SENSOR = 2          
    GATE_SERVO = 9      
    LED_GREEN = 13      
    LED_RED = 12        
    LED_YELLOW = 14     

# ==================== HARDWARE SIMULATION ====================
class GateController:
    def __init__(self):
        self.gate_open = False
        self.car_detected = False
        self.led_status = {'green': False, 'red': False, 'yellow': False}
        print(" Initializing ESP32 Gate Controller (Cloud Mode)...")
        print("✓ Hardware initialized\n")
    
    def read_sensor(self): return self.car_detected
    
    def open_gate(self):
        if not self.gate_open:
            print(" Opening gate... \n   [Servo] Moving to 90°")
            time.sleep(0.5)
            self.gate_open = True
            print("   ✓ Gate OPEN")
    
    def close_gate(self):
        if self.gate_open:
            print(" Closing gate... \n   [Servo] Moving to 0°")
            time.sleep(0.5)
            self.gate_open = False
            print("   ✓ Gate CLOSED")
    
    def set_led(self, color, state):
        if color in self.led_status:
            self.led_status[color] = state
            print(f"   💡 {color.upper()} LED: {'ON' if state else 'OFF'}")
    
    def all_leds_off(self):
        for color in self.led_status: self.set_led(color, False)
    
    def display_status(self):
        gate = "OPEN 🟢" if self.gate_open else "CLOSED 🔴"
        car = "DETECTED 🚗" if self.car_detected else "NO CAR"
        leds = "".join([("🟢" if self.led_status['green'] else ""), 
                       ("🟡" if self.led_status['yellow'] else ""), 
                       ("🔴" if self.led_status['red'] else "")]) or "⚫⚫⚫"
        print(f"\n Status: Gate={gate} | Sensor={car} | LEDs={leds}\n")

# ==================== BACKEND COMMUNICATION ====================
def send_entry_request(plate_number, owner_name="Unknown"):
    url = "https://ieduoyanviowobfaphmw.supabase.co/functions/v1/anpr-entry"
    return make_api_request(url, {"vehicle_number": plate_number, "owner_name": owner_name})

def send_exit_request(plate_number):
    url = "https://ieduoyanviowobfaphmw.supabase.co/functions/v1/anpr-exit"
    return make_api_request(url, {"vehicle_number": plate_number})

def make_api_request(url, data):
    # Uncomment and add your key here if Supabase gives a 401 Unauthorized error
    # headers = {"Authorization": "Bearer YOUR_SUPABASE_ANON_KEY", "Content-Type": "application/json"}
    
    try:
        print(f" Sending to Supabase Cloud: {data['vehicle_number']}")
        # Change to `requests.post(url, json=data, headers=headers, timeout=5)` if using auth
        response = requests.post(url, json=data, timeout=5)
        
        # Handle Supabase Edge Function responses safely
        try:
            res_data = response.json()
        except:
            res_data = {"error": response.text}
            
        return {
            "success": response.status_code in [200, 201],
            "status_code": response.status_code,
            "data": res_data
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# ==================== MAIN GATE LOGIC ====================
def process_vehicle(controller, plate_number, mode="ENTRY"):
    print(f"\n============================================================")
    print(f" VEHICLE DETECTED AT {mode} GATE - {datetime.now().strftime('%H:%M:%S')}")
    print(f"============================================================")
    
    controller.all_leds_off()
    controller.set_led('yellow', True)
    print(f"\n License Plate: {plate_number}")
    
    result = send_entry_request(plate_number) if mode == "ENTRY" else send_exit_request(plate_number)
    print("\n Processing...")
    
    if result.get('success'):
        res_data = result.get('data', {})
        print("\n ACCESS GRANTED")
        
        if mode == "ENTRY":
            fee = res_data.get('fee_deducted', 'Fixed Rate')
            slot = res_data.get('slot_number', 'Assigned')
            print(f" Payment: LKR {fee} deducted at Entry.")
            print(f" Slot Status: {slot} marked as Occupied/Arrived.")
        else:
            print(f"  Status: Parking slot released and marked as FREE.")

        controller.set_led('yellow', False)
        controller.set_led('green', True)
        controller.open_gate()
        time.sleep(GATE_OPEN_DURATION)
        controller.close_gate()
        controller.set_led('green', False)
    else:
        print("\n ACCESS DENIED")
        controller.set_led('yellow', False)
        controller.set_led('red', True)
        
        error_msg = result.get('data', {}).get('error', 'Validation Failed or Insufficient Funds')
        print(f"  Reason: {error_msg}")
        
        time.sleep(3)
        controller.set_led('red', False)
    
    controller.display_status()

# ==================== SIMULATION MODES ====================
def interactive_mode(controller):
    print("\n INTERACTIVE MODE\nCommands: entry [plate], exit [plate], status, quit")
    while True:
        try:
            user_input = input("\n> ").strip().split()
            if not user_input: continue
            cmd = user_input[0].lower()
            
            if cmd in ['quit', 'q', 'exit'] and len(user_input) == 1: break
            elif cmd == 'status': controller.display_status()
            elif cmd in ['entry', 'exit']:
                mode = "ENTRY" if cmd == 'entry' else "EXIT"
                plate = user_input[1].upper() if len(user_input) > 1 else f"TEST{random.randint(1000,9999)}"
                controller.car_detected = True
                process_vehicle(controller, plate, mode)
                controller.car_detected = False
            else:
                controller.car_detected = True
                process_vehicle(controller, cmd.upper(), "ENTRY")
                controller.car_detected = False
        except KeyboardInterrupt: break

def main():
    print("╔════════════════════════════════════════════════════════╗")
    print("║   ESP32 Gate Emulator - Next.js/Supabase Connected     ║")
    print("║   Logic: Payment at Entry. Exit Frees Slot.            ║")
    print("╚════════════════════════════════════════════════════════╝")
    
    controller = GateController()
    interactive_mode(controller)
    controller.all_leds_off()
    controller.close_gate()

if __name__ == "__main__":
    main()