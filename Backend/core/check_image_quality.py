import boto3
import os
from dotenv import load_dotenv
from core.quality_check import analyze_image_quality

load_dotenv()
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")

def assess_quality_only(group_image_files):
    rekognition = boto3.client("rekognition", region_name=AWS_REGION)
    quality_reports = []

    for idx, group_img in enumerate(group_image_files, start=1):
        group_bytes = group_img.read()
        
        # 1. Local Image Quality (Blur, Lighting)
        quality_report = analyze_image_quality(group_bytes)
        quality_report["image_index"] = idx

        # Default Face Metrics
        quality_report.update({
            "face_detected": False,
            "face_count": 0,
            "avg_face_confidence": 0.0,
            "face_coverage_pct": 0.0,
        })

        # 2. Rekognition for Face Detection
        try:
            detection = rekognition.detect_faces(
                Image={"Bytes": group_bytes}, Attributes=["ALL"]
            )

            if not detection.get("FaceDetails"):
                quality_report["error"] = "No faces detected"
                quality_reports.append(quality_report)
                continue

            faces = detection["FaceDetails"]
            face_count = len(faces)

            avg_confidence = 0.0
            total_face_area = 0.0

            for face in faces:
                avg_confidence += float(face["Confidence"])
                box = face["BoundingBox"]
                total_face_area += float(box["Width"] * box["Height"])

            if face_count > 0:
                avg_confidence /= face_count
            
            face_coverage = total_face_area * 100

            quality_report.update({
                "face_detected": True,
                "face_count": face_count,
                "avg_face_confidence": round(avg_confidence, 2),
                "face_coverage_pct": round(face_coverage, 2),
            })

            if face_coverage < 1.0:
                quality_report["suggestion"] += " Faces too far. Move closer."

        except Exception as e:
            print(f"Error in Rekognition detect_faces: {e}")
            quality_report["error"] = f"Face detection failed: {str(e)}"
        
        quality_reports.append(quality_report)
        
        # Reset file pointer for subsequent uses if any (though here we just read)
        group_img.seek(0)

    return quality_reports
