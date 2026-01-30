import io

def analyze_image_quality(image_bytes):
    # Lazy import to avoid startup crash if libraries are missing
    import cv2
    import numpy as np

    try:
        # Convert bytes to numpy array for OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"error": "Could not decode image"}

        height, width, _ = img.shape
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Blur Detection (Laplacian Variance)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_blurry = blur_score < 100.0  # Threshold can be tuned

        # 2. Lighting Check (Mean Brightness)
        brightness = np.mean(gray)
        lighting_status = "Good"
        suggestion = ""
        
        if brightness < 60:
            lighting_status = "Too Dark"
            suggestion = "Increase lighting or turn on flash."
        elif brightness > 220:
            lighting_status = "Too Bright"
            suggestion = "Reduce exposure or avoid direct backlight."
        
        # 3. Environment/Contrast (RMS Contrast)
        contrast = gray.std()
        
        # 4. Face Coverage (Placeholder - requires Rekognition data or Haar Cascade)
        # We will merge this with Rekognition data in the main flow, 
        # but here we can return the cv2 based metrics.
        
        return {
            "resolution": f"{width}x{height}",
            "blur_score": round(blur_score, 2),
            "is_blurry": is_blurry,
            "brightness": round(brightness, 2),
            "lighting_status": lighting_status,
            "contrast": round(contrast, 2),
            "suggestion": suggestion
        }

    except ImportError:
        return {"error": "OpenCV or Numpy not installed on server."}
    except Exception as e:
        print(f"Error in quality check: {e}")
        return {"error": str(e)}
