#!/usr/bin/env python3
"""
SMART PARKING ANPR SYSTEM - CLOUD CONNECTED
Logic: Fixed Daily Fee (LKR 100/50) deducted at ENTRY. EXIT only frees the slot.
"""

import cv2
import easyocr
import requests
import re
import time
import numpy as np

# ==================== CONFIGURATION ====================
CAMERA_INDEX = 0
AUTO_SCAN_INTERVAL = 2.0  

print("Loading EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)
print("Ready!\n")

# Global variables
scan_requested = False
mode = "ENTRY"
scan_mode = "MANUAL"
last_scan_time = 0
is_processing = False

def mouse_callback(event, x, y, flags, param):
    global scan_requested
    if event == cv2.EVENT_LBUTTONDOWN and scan_mode == "MANUAL":
        scan_requested = True

def clean_plate_text(text):
    if not text: return None
    clean = re.sub(r'[^A-Z0-9]', '', text.upper())
    letter_groups = re.findall(r'[A-Z]+', clean)
    number_groups = re.findall(r'\d{4}', clean)
    
    if letter_groups and number_groups:
        letters = letter_groups[-1]
        numbers = number_groups[0]
        if len(letters) >= 2 and letters[:2] in ['WP', 'CP', 'SP', 'NP', 'EP', 'NC', 'NW', 'SG', 'UP', 'UV']:
             letters = letters[2:]
        elif len(letters) == 3 and letters[0] in ['W', 'C', 'S', 'N', 'E', 'U', 'P']:
             letters = letters[1:]
        if len(letters) > 0 and letters[-1] in ['P', 'D']:
            if len(letters) == 3: letters = letters[:-1]
            elif len(letters) == 4: letters = letters[:-1]
        if letters in ['GF', 'KF']: letters = 'KG'
        return letters + numbers
    return None

def preprocess_images(image):
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
    processed_images = preprocess_images(image)
    all_candidates = []
    print("\n🔍 Analyzing frame...")
    for name, img in processed_images:
        results = reader.readtext(img, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', paragraph=False, detail=1, width_ths=0.7)
        for (bbox, text, confidence) in results:
            if confidence > 0.2:
                cleaned = clean_plate_text(text)
                if cleaned:
                    score = confidence
                    if len(cleaned) == 6: score += 0.1
                    if len(cleaned) == 7: score += 0.05
                    all_candidates.append((cleaned, score))

    if not all_candidates: return None
    best = max(all_candidates, key=lambda x: x[1])
    print(f"Best Match: {best[0]} (Score: {best[1]:.2f})")
    return best[0]

def send_to_backend(plate, mode_str="ENTRY"):
    """Send to Supabase Edge Functions"""
    if mode_str == "ENTRY":
        # CHANGE THIS LINE:
        url = "https://ieduoyanviowobfaphmw.supabase.co/functions/v1/anpr-entry"
        payload = {"vehicle_number": plate, "owner_name": "Camera"}
    else:
        # CHANGE THIS LINE:
        url = "https://ieduoyanviowobfaphmw.supabase.co/functions/v1/anpr-exit"
        payload = {"vehicle_number": plate}
    
    # Uncomment and add your key here if Supabase gives a 401 Unauthorized error
    # headers = {"Authorization": "Bearer YOUR_SUPABASE_ANON_KEY", "Content-Type": "application/json"}
    
    try:
        # Change to `requests.post(url, json=payload, headers=headers, timeout=5)` if using auth
        r = requests.post(url, json=payload, timeout=15)
        return {"success": r.status_code in [200, 201], "data": r.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    global scan_requested, mode, scan_mode, last_scan_time, is_processing
    
    print("="*60)
    print("SMART PARKING - ANPR SYSTEM (SUPABASE CONNECTED)")
    print("Logic: Fixed Daily Fee. Payment at Entry. Exit Frees Slot.")
    print("1. MANUAL MODE (Click to Scan)")
    print("2. AUTO MODE (Scans every 2 seconds)")
    print("="*60)
    
    choice = input("Select Mode (1 or 2): ").strip()
    scan_mode = "AUTO" if choice == '2' else "MANUAL"
    print(f" {scan_mode} MODE SELECTED\n")
    
    cap = cv2.VideoCapture(CAMERA_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    if not cap.isOpened():
        print("Cannot open camera!")
        return
    
    last_result = None
    cv2.namedWindow('ANPR System')
    cv2.setMouseCallback('ANPR System', mouse_callback)
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        display = frame.copy()
        h, w = display.shape[:2]
        cv2.rectangle(display, (50, 50), (w-50, h-50), (0, 255, 0), 2)
        
        status_color = (0, 255, 0) if mode == "ENTRY" else (0, 0, 255)
        cv2.putText(display, f"MODE: {mode}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, status_color, 2)
        
        scan_text = "PROCESSING..." if is_processing else ("AUTO SCANNING..." if scan_mode == "AUTO" else "CLICK TO SCAN")
        cv2.putText(display, scan_text, (20, h-20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        
        if last_result:
            cv2.putText(display, f"Last: {last_result}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
            
        cv2.imshow('ANPR System', display)
        
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
            plate = read_plate(frame.copy())
            
            if plate:
                print(f"✅ DETECTED: {plate}")
                confirm = input(f"   Confirm {plate}? (y/n): ").strip().lower()
                
                if confirm == 'y':
                    print(f"📡 Sending to Supabase ({mode})...")
                    result = send_to_backend(plate, mode)
                    
                    if result.get("success"):
                        res_data = result.get("data", {})
                        
                        if mode == "ENTRY":
                            fee = res_data.get('fee_deducted', '100/50')
                            print(f"🎉 SUCCESS! Entry Recorded.")
                            print(f"💰 Fixed Fee of LKR {fee} deducted from wallet.")
                            last_result = f"{plate}: ENTRY (Paid LKR {fee})"
                        else:
                            print(f"🎉 SUCCESS! Exit Recorded.")
                            print(f"🅿️  Slot is now FREE.")
                            last_result = f"{plate}: EXIT (Slot Freed)"
                        time.sleep(2)
                    else:
                        error_msg = result.get('data', {}).get('error', result.get('error', 'Unknown Error'))
                        print(f" DENIED: {error_msg}")
                        last_result = f"DENIED: {error_msg}"
                else:
                    print(" Cancelled")
            is_processing = False
        
        key = cv2.waitKey(1) & 0xFF
        if key in [ord('q'), ord('Q')]: break
        elif key in [ord('e'), ord('E')]: mode = "ENTRY"; print("✓ ENTRY mode")
        elif key in [ord('x'), ord('X')]: mode = "EXIT"; print("✓ EXIT mode")
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()