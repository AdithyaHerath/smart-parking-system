#!/usr/bin/env python3
"""
Test script for license plate reader using static images
Useful for testing OCR without webcam
"""

import cv2
import pytesseract
import sys
import os

# Configure Tesseract path (update based on your system)
pytesseract.pytesseract.tesseract_cmd = '/opt/homebrew/bin/tesseract'

def preprocess_image(image):
    """Preprocess image for better OCR"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 11, 17, 17)
    thresh = cv2.adaptiveThreshold(
        gray, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 
        11, 2
    )
    return thresh

def test_image(image_path):
    """
    Test OCR on a static image
    Args:
        image_path: Path to image file
    """
    print(f"\n{'='*60}")
    print(f"Testing image: {image_path}")
    print(f"{'='*60}")
    
    # Check if file exists
    if not os.path.exists(image_path):
        print(f" Error: File not found: {image_path}")
        return
    
    # Read image
    image = cv2.imread(image_path)
    if image is None:
        print(f" Error: Cannot read image: {image_path}")
        return
    
    print(f"✓ Image loaded: {image.shape[1]}x{image.shape[0]} pixels")
    
    # Preprocess
    print(" Preprocessing image...")
    processed = preprocess_image(image)
    
    # Extract text with different PSM modes
    psm_modes = [
        (7, "Single text line"),
        (6, "Uniform block of text"),
        (8, "Single word"),
        (13, "Raw line")
    ]
    
    print("\n Testing different OCR modes:")
    print("-" * 60)
    
    for psm, description in psm_modes:
        config = f'--psm {psm} -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        text = pytesseract.image_to_string(processed, config=config)
        text = text.strip().upper().replace(' ', '')
        
        print(f"PSM {psm} ({description}):")
        print(f"  Result: '{text}'")
        if len(text) >= 6 and len(text) <= 10:
            print(f"  ✓ Valid plate format")
        else:
            print(f"  ✗ Invalid length ({len(text)} chars)")
        print()
    
    # Show images
    print("Displaying images (press any key to close)...")
    cv2.imshow('Original', image)
    cv2.imshow('Preprocessed', processed)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

def create_sample_plate_image():
    """
    Create a sample license plate image for testing
    """
    import numpy as np
    
    # Create white background
    img = np.ones((200, 500, 3), dtype=np.uint8) * 255
    
    # Add black border
    cv2.rectangle(img, (10, 10), (490, 190), (0, 0, 0), 3)
    
    # Add sample plate text
    font = cv2.FONT_HERSHEY_SIMPLEX
    text = "KA01AB1234"
    font_scale = 2
    thickness = 4
    
    # Get text size
    (text_width, text_height), _ = cv2.getTextSize(text, font, font_scale, thickness)
    
    # Center text
    x = (500 - text_width) // 2
    y = (200 + text_height) // 2
    
    # Draw text
    cv2.putText(img, text, (x, y), font, font_scale, (0, 0, 0), thickness)
    
    # Save image
    output_path = "sample_plate.jpg"
    cv2.imwrite(output_path, img)
    print(f"✓ Created sample plate image: {output_path}")
    
    return output_path

if __name__ == "__main__":
    print("""
    ╔════════════════════════════════════════════════════════╗
    ║        License Plate OCR - Image Test Tool           ║
    ╚════════════════════════════════════════════════════════╝
    """)
    
    if len(sys.argv) > 1:
        # Test provided image
        image_path = sys.argv[1]
        test_image(image_path)
    else:
        # Create and test sample image
        print("No image provided. Creating sample plate image...")
        sample_path = create_sample_plate_image()
        print("\nTesting sample image...")
        test_image(sample_path)
        
        print(f"\n{'='*60}")
        print("Usage: python test_image.py <path_to_image>")
        print("Example: python test_image.py my_plate.jpg")
        print(f"{'='*60}")
