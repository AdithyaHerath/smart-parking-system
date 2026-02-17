import cv2
import pytesseract
import numpy as np
import re

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

print("Press Q to quit")

cap = cv2.VideoCapture(0)
last_text = ""

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)  # Fix mirror
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Edge detection
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 100, 200)

    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    plate_candidate = None
    max_area = 0

    for cnt in contours:
        area = cv2.contourArea(cnt)

        if area < 5000:
            continue

        # Approximate contour shape
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        #only want 4-corner shapes
        if len(approx) == 4:

            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = w / float(h)

            # Real plate ratio filtering
            if 2.5 < aspect_ratio < 5.5:

                if area > max_area:
                    max_area = area
                    plate_candidate = (x, y, w, h)

    if plate_candidate is not None:
        x, y, w, h = plate_candidate

        plate = gray[y:y+h, x:x+w]
        plate = cv2.resize(plate, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        _, plate = cv2.threshold(plate, 150, 255, cv2.THRESH_BINARY)

        custom_config = r'--oem 3 --psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
        text = pytesseract.image_to_string(plate, config=custom_config)

        text = text.strip().upper()
        text = re.sub(r'[^A-Z0-9-]', '', text)

        pattern = r'^[A-Z]{1,3}-?[0-9]{3,4}$'

        if re.match(pattern, text):
            if text != last_text:
                print("VALID PLATE:", text)
                last_text = text

        # Draw rectangle
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 3)

        cv2.imshow("Plate", plate)

    cv2.imshow("ANPR Camera", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

print("Camera closed successfully")
