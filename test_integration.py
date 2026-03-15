#!/usr/bin/env python3
"""
Cloud Integration Test Script
Tests the Supabase Edge Functions for the Smart Parking System
"""

import requests
import time
import random

# Supabase Edge Function URLs
ENTRY_URL = "https://ieduoyanviowobfaphmw.supabase.co/functions/v1/anpr-entry"
EXIT_URL = "https://ieduoyanviowobfaphmw.supabase.co/functions/v1/anpr-exit"

# NOTE: If your Supabase functions require authentication, add your Anon Key here
# SUPABASE_ANON_KEY = "your_anon_key_here"
# HEADERS = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}", "Content-Type": "application/json"}

# Default headers (Use the one above if you get 401 Unauthorized errors)
HEADERS = {"Content-Type": "application/json"} 

def print_header(title):
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def test_cloud_entry(plate_number):
    print_header(f"Test 1: Cloud Vehicle Entry - {plate_number}")
    
    print(f" Sending POST request to: {ENTRY_URL}")
    payload = {
        "vehicle_number": plate_number,
        "owner_name": "Integration Test"
    }
    
    try:
        response = requests.post(ENTRY_URL, json=payload, headers=HEADERS, timeout=10)
        print(f"Response Status Code: {response.status_code}")
        
        try:
            data = response.json()
            print(f"Response Body: {data}")
        except:
            print(f"Response Text: {response.text}")
            
        if response.status_code in [200, 201]:
            print(" Entry successful!")
            return True
        else:
            print(" Entry failed.")
            return False
            
    except Exception as e:
        print(f" Connection Error: {e}")
        return False

def test_cloud_exit(plate_number):
    print_header(f"Test 2: Cloud Vehicle Exit - {plate_number}")
    
    print(f" Sending POST request to: {EXIT_URL}")
    payload = {
        "vehicle_number": plate_number
    }
    
    try:
        response = requests.post(EXIT_URL, json=payload, headers=HEADERS, timeout=10)
        print(f"Response Status Code: {response.status_code}")
        
        try:
            data = response.json()
            print(f"Response Body: {data}")
        except:
            print(f"Response Text: {response.text}")
            
        if response.status_code in [200, 201]:
            print(" Exit successful!")
            return True
        else:
            print(" Exit failed.")
            return False
            
    except Exception as e:
        print(f" Connection Error: {e}")
        return False

def run_tests():
    print("""
    ╔════════════════════════════════════════════════════════╗
    ║     Smart Parking System - Cloud Integration Test      ║
    ║     Testing Supabase Edge Functions directly           ║
    ╚════════════════════════════════════════════════════════╝
    """)
    
    # Generate a random test plate or use a specific one
    # If your Lovable app requires vehicles to be pre-registered, 
    # change this to a plate number you manually added to your Supabase database!
    test_plate = f"TEST{random.randint(1000, 9999)}"
    
    # Step 1: Test Entry
    entry_success = test_cloud_entry(test_plate)
    
    if not entry_success:
        print("\n Stopping tests because Entry failed. Please check the errors above.")
        print(" Hint: Did you remember to register this vehicle in your Supabase database first?")
        return
        
    print("\n Waiting 5 seconds before testing exit to simulate parking duration...")
    time.sleep(5)
    
    # Step 2: Test Exit
    test_cloud_exit(test_plate)
    
    print("\n Cloud Integration Tests Completed!")

if __name__ == "__main__":
    run_tests()