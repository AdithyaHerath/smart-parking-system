## pip install -r requirements.txt







# For manual entry want to execute

# python gate\_controller.py







Step 2: Test the Arrival (Entry)

We will use your hardware emulator because it is much faster for testing than holding a photo up to your webcam.



Open your terminal, navigate to your new folder, and run:



Bash



python gate\_controller.py

Press 1 for Interactive Mode.



Simulate the car arriving by typing this command and hitting Enter:



Plaintext



entry TEST100

What you should see: \* The script will say Sending to Supabase Cloud: TEST100.



It should return ✅ ACCESS GRANTED.



It will explicitly state Payment: LKR 100 deducted at Entry.



The virtual gate will open and close.



Step 3: Verify the Backend State

Before testing the exit, go back to your Lovable Web Dashboard and check two things:



Wallet: The balance for TEST100 should now be LKR 100 (it deducted the LKR 100 entry fee).



Slots: The slot they booked should now show as Arrived / Occupied.



Step 4: Test the Departure (Exit)

Now, simulate the user leaving the parking lot.



Go back to your terminal where gate\_controller.py is still running.



Type this command and hit Enter:



Plaintext



exit TEST100

What you should see:



It will say Sending to Supabase Cloud: TEST100.



It should return ✅ ACCESS GRANTED.



It will state Status: Parking slot released and marked as FREE. (Notice it does not mention deducting money!).



Step 5: Final Verification

Go back to your Lovable Web Dashboard one last time:



Wallet: The balance should still be LKR 100 (no extra money was taken at exit).



Slots: The parking slot should now be completely Available / Free for the next person to book.



If all of these steps happen exactly as described, your new system architecture is fully operational!



Would you like me to tell you how to test the "No-Show" penalty logic next, or do you want to run this Entry/Exit test first?







# For ANPR Camera entry want to execute

# python gate\_controller.py









Testing the actual ANPR camera using your laptop's webcam is incredibly satisfying! Since we already updated anpr\_system.py to connect to your new Supabase backend, you can test the real physical flow right at your desk.



Here is the exact step-by-step guide to testing the camera detection and payment logic:



Step 1: Prepare a "License Plate"

Since you don't have a real car in your room, you need a fake license plate to show your webcam.



Open Google Images on your smartphone and search for a clear picture of a license plate (or just type a plate number like KA01AB1234 in a large, bold font in a notes app).



Make your phone screen nice and bright.



Step 2: Prepare the Backend Data

Just like the emulator test, the backend will reject the plate if it isn't registered and booked.



Go to your Lovable Web Dashboard.



Register the exact plate number you have on your phone screen (e.g., KA01AB1234).



Top up that vehicle's wallet with at least LKR 200.



Create an active booking for that specific plate number.



Step 3: Start the Camera

Open your terminal, navigate to your new folder, and make sure your virtual environment is active (if you are using one).



Run the camera script:



Bash



python anpr\_system.py

The terminal will ask you to select a mode. Press 1 for MANUAL MODE (this is much easier for testing so it doesn't constantly scan your face while you get set up).



Your webcam light should turn on, and a new window showing your camera feed will pop up. Notice the text in the corner says MODE: ENTRY.



Step 4: Test the Entry (Payment Deduction)

Hold your phone with the license plate up to your laptop's webcam so it is clearly visible inside the green box on the screen. (Tip: Angle your phone slightly down to avoid the glare from your laptop screen reflecting off your phone glass).



Click your mouse anywhere inside the camera window.



Look at your terminal. You should see it processing and extracting the text:



🏆 Best Match: KA01AB1234



It will ask: Confirm KA01AB1234? (y/n):



Type y and press Enter.



The Result: The console should say 📡 Sending to Supabase (ENTRY)... followed by 🎉 SUCCESS! Entry Recorded. and 💰 Fixed Fee of LKR 100 deducted from wallet.



Step 5: Test the Exit (Slot Release)

Now, let's pretend the user has finished their shopping and is driving out of the parking lot.



Bring the camera window back to the front of your screen.



Press the X key on your keyboard. You will see the text on the camera feed instantly change to MODE: EXIT (in red).



Hold the same phone/license plate up to the camera again.



Click the window to scan it.



Type y in the terminal to confirm the plate.



The Result: The console should say 📡 Sending to Supabase (EXIT)... followed by 🎉 SUCCESS! Exit Recorded. and 🅿️ Slot is now FREE.



Check your Lovable Dashboard one last time: the wallet should only be down by LKR 100, and the slot should be available again.





