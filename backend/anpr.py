import cv2
import pytesseract

# Set tesseract path if needed
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Initialize camera
cap = cv2.VideoCapture(0)

print("Press Q to quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Convert to grayscale and smooth
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blur = cv2.bilateralFilter(gray, 11, 17, 17)
    edged = cv2.Canny(blur, 30, 200)

    # Find contours and sort by size
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:30]

    plate = None

    # Loop through contours to find rectangle
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.018 * peri, True)
        if len(approx) == 4:  # rectangle
            x, y, w, h = cv2.boundingRect(approx)
            plate = gray[y:y+h, x:x+w]
            cv2.drawContours(frame, [approx], -1, (0, 255, 0), 3)
            break

    # If a plate is found, run OCR
    if plate is not None:
        custom_config = r'--oem 3 --psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
        text = pytesseract.image_to_string(plate, config=custom_config)
        text = text.strip()
        if text:
            print("Detected Plate:", text)
        cv2.imshow("Plate", plate)

    # Show the main camera frame
    cv2.imshow("Camera", frame)

    # Quit with Q
    if cv2.waitKey(1) & 0xFF == ord('q'):
        print("Camera closed successfully")
        break

# Release resources
cap.release()
cv2.destroyAllWindows()
