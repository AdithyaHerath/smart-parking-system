#!/usr/bin/env python3
"""
SMART PARKING ANPR SYSTEM
Dual Mode: Auto Scan (Periodic) or Manual Scan (Click)
"""

import cv2
import easyocr
import requests
import re
import os
import time
import numpy as np
from threading import Thread

# ==================== CONFIGURATION ====================

BACKEND_URL = os.environ.get('BACKEND_URL', "http://localhost:5001/api")
CAMERA_INDEX = 0
AUTO_SCAN_INTERVAL = 2.0  # Seconds between auto-scans

print("🔄 Loading EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)
print("✅ Ready!\n")

# Global variables
scan_requested = False
mode = "ENTRY"
scan_mode = "MANUAL"  # "MANUAL" or "AUTO"
last_scan_time = 0
is_processing = False

def mouse_callback(event, x, y, flags, param):
    """Handle mouse clicks for manual scan"""
    global scan_requested
    if event == cv2.EVENT_LBUTTONDOWN and scan_mode == "MANUAL":
        scan_requested = True

# ==================== FUNCTIONS ====================

def clean_plate_text(text):
    """Clean and validate plate text - handles common OCR errors"""
    if not text:
        return None
    
    # Remove all non-alphanumeric
    clean = re.sub(r'[^A-Z0-9]', '', text.upper())
    
    # Common OCR misreads
    replacements = {'GF': 'KG', '6F': 'GF', '0': 'O', 'I': '1', 'Z': '2', 'S': '5', 'B': '8'}
    
    # Find all consecutive letters and numbers
    letter_groups = re.findall(r'[A-Z]+', clean)
    number_groups = re.findall(r'\d{4}', clean)
    
    if letter_groups and number_groups:
        letters = letter_groups[-1]
        numbers = number_groups[0]
        
        # Logic for merged text (e.g. WPKG -> KG)
        # Also handles "NW KL P" -> "KL" (removes province and fuel P)
        
        # 1. Remove Province Code if present at start
        # Check first 2 letters against province list
        if len(letters) >= 2 and letters[:2] in ['WP', 'CP', 'SP', 'NP', 'EP', 'NC', 'NW', 'SG', 'UP', 'UV']:
             letters = letters[2:]
        # Or check single letter heuristic if length is 3 (e.g. WKL -> KL)
        elif len(letters) == 3 and letters[0] in ['W', 'C', 'S', 'N', 'E', 'U', 'P']:
             letters = letters[1:]

        # 2. Remove Fuel Type (P/D) if present at end
        # Only if we still have extra letters (Sri Lankan plates have 2 or 3 valid letters)
        # e.g. "CAEP" (4 chars) -> remove P -> "CAE"
        # e.g. "KLP" (3 chars) -> remove P? -> "KL" (This is standard format)
        if len(letters) > 0 and letters[-1] in ['P', 'D']:
            # If we have 3 letters ending in P (e.g. KLP), it's ambiguous:
            # Could be series 'KLP' OR series 'KL' + fuel 'P'.
            # However, in Sri Lanka, separated 'P' is common.
            # Safe logic: If it results in 2 letters, it's likely a valid old series (e.g. KL).
            # If it results in 3 letters, it's a valid new series.
            
            # Let's strip it if the remaining length is 2 or 3
            if len(letters) == 3: # e.g. KLP -> KL (Safe, KL is valid)
                 letters = letters[:-1]
            elif len(letters) == 4: # e.g. CAEP -> CAE (Safe, CAE is valid)
                 letters = letters[:-1]
        
        if letters in ['GF', 'KF']: letters = 'KG'
        
        return letters + numbers
    
    return None

def preprocess_images(image):
    """Generate multiple preprocessed versions of the image"""
    images = []
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    images.append(("Grayscale", gray))
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    contrast = clahe.apply(gray)
    images.append(("Contrast", contrast))
    
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    images.append(("Threshold", thresh))
    
    return images

def read_plate(image):
    """Read plate using Multi-Pass Strategy"""
    processed_images = preprocess_images(image)
    all_candidates = []
    
    print("\n🔍 Analyzing frame...")
    
    for name, img in processed_images:
        # Only show debug windows in Manual Mode to keep UI clean
        # if scan_mode == "MANUAL":
        #    cv2.imshow(f'Filter: {name}', img)
        
        results = reader.readtext(
            img,
            allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            paragraph=False,
            detail=1,
            width_ths=0.7
        )
        
        for (bbox, text, confidence) in results:
            if confidence > 0.2:
                cleaned = clean_plate_text(text)
                if cleaned:
                    score = confidence
                    if len(cleaned) == 6: score += 0.1
                    if len(cleaned) == 7: score += 0.05
                    all_candidates.append((cleaned, score))
                    # print(f"   [{name}] '{text}' -> {cleaned} ({score:.2f})")

    if not all_candidates:
        return None
    
    best = max(all_candidates, key=lambda x: x[1])
    print(f"🏆 Best Match: {best[0]} (Score: {best[1]:.2f})")
    return best[0]

def send_to_backend(plate, mode_str="ENTRY"):
    """Send to backend"""
    endpoint = "/vehicle/entry" if mode_str == "ENTRY" else "/vehicle/exit"
    payload = {"vehicle_number": plate}
    if mode_str == "ENTRY":
        payload["owner_name"] = "Camera"
    
    try:
        r = requests.post(f"{BACKEND_URL}{endpoint}", json=payload, timeout=5)
        return {"success": r.status_code in [200, 201], "data": r.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ==================== MAIN ====================

def main():
    global scan_requested, mode, scan_mode, last_scan_time, is_processing
    
    print("="*60)
    print("SMART PARKING - ANPR SYSTEM")
    print("1. MANUAL MODE (Click to Scan)")
    print("2. AUTO MODE (Scans every 2 seconds)")
    print("="*60)
    
    choice = input("Select Mode (1 or 2): ").strip()
    if choice == '2':
        scan_mode = "AUTO"
        print("✅ AUTO MODE SELECTED")
    else:
        scan_mode = "MANUAL"
        print("✅ MANUAL MODE SELECTED")
    
    print("\n📋 Instructions:")
    if scan_mode == "MANUAL":
        print("  • CLICK anywhere on the window to scan")
    else:
        print(f"  • Automatically scanning every {AUTO_SCAN_INTERVAL}s")
    
    print("  • E = Entry Mode | X = Exit Mode | Q = Quit")
    print("="*60 + "\n")
    
    cap = cv2.VideoCapture(CAMERA_INDEX)
    # Set camera resolution (optional, good for quality)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    if not cap.isOpened():
        print("❌ Cannot open camera!")
        return
    
    last_result = None
    cv2.namedWindow('ANPR System')
    cv2.setMouseCallback('ANPR System', mouse_callback)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        display = frame.copy()
        h, w = display.shape[:2]
        cv2.rectangle(display, (50, 50), (w-50, h-50), (0, 255, 0), 2)
        
        # Display Status
        status_color = (0, 255, 0) if mode == "ENTRY" else (0, 0, 255)
        cv2.putText(display, f"MODE: {mode}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, status_color, 2)
        
        scan_text = "AUTO SCANNING..." if scan_mode == "AUTO" else "CLICK TO SCAN"
        if is_processing: scan_text = "PROCESSING..."
        
        cv2.putText(display, scan_text, (20, h-20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        
        if last_result:
            cv2.putText(display, f"Last: {last_result}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            
        cv2.imshow('ANPR System', display)
        
        # LOGIC FOR TRIGGERING SCAN
        should_scan = False
        
        if not is_processing:
            if scan_mode == "MANUAL" and scan_requested:
                should_scan = True
                scan_requested = False
            elif scan_mode == "AUTO" and (time.time() - last_scan_time > AUTO_SCAN_INTERVAL):
                should_scan = True
                last_scan_time = time.time()
        
        if should_scan:
            is_processing = True
            if scan_mode == "MANUAL":
                print("\n📸 SCANNING...")
            
            # Process in a way that doesn't freeze UI too much
            # (Ideally this would be threaded, but keep simple for now)
            plate = read_plate(frame.copy())
            
            if plate:
                print(f"✅ DETECTED: {plate}")
                
                # In Auto Mode, only confirm if confidence is high or just process it?
                # For safety, let's keep manual confirmation even in Auto Mode for now
                if scan_mode == "AUTO":
                    # Beep or pause?
                    # Auto-submit if high confidence? Let's just prompt
                    pass
                
                # Standard confirmation flow
                # Note: input() blocks the loop. In a real real-time system we'd avoid this.
                confirm = input(f"   Confirm {plate}? (y/n): ").strip().lower()
                
                if confirm == 'y':
                    print(f"📡 Sending to backend ({mode})...")
                    result = send_to_backend(plate, mode)
                    if result.get("success"):
                        data = result['data'].get('data', {})
                        if mode == "ENTRY":
                            info = f"Slot: {data.get('slot_number')}"
                        else:
                            info = f"Fee: Rs.{data.get('parking_fee')}"
                        print(f"🎉 SUCCESS! {info}")
                        last_result = f"{plate} -> {info}"
                        # Pause slightly so they can remove the car
                        time.sleep(2)
                    else:
                        msg = result.get('data', {}).get('message', result.get('error'))
                        print(f"❌ ERROR: {msg}")
                else:
                    print("❌ Cancelled")
            
            is_processing = False
        
        # Key Controls
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == ord('Q'):
            break
        elif key == ord('e') or key == ord('E'):
            mode = "ENTRY"
            print("✓ Switched to ENTRY mode")
        elif key == ord('x') or key == ord('X'):
            mode = "EXIT"
            print("✓ Switched to EXIT mode")
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
