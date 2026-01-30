import boto3
import os
from datetime import datetime
from openpyxl import Workbook
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")

# -------------------------------
# S3 HELPERS
# -------------------------------

def get_photo_bytes_from_s3(bucket, key):
    s3 = boto3.client("s3", region_name=AWS_REGION)
    response = s3.get_object(Bucket=bucket, Key=key)
    return response["Body"].read()


def list_student_images_from_s3(bucket, batch_prefix):
    s3 = boto3.client("s3", region_name=AWS_REGION)
    paginator = s3.get_paginator("list_objects_v2")

    image_keys = []
    for page in paginator.paginate(Bucket=bucket, Prefix=batch_prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.lower().endswith((".jpg", ".jpeg", ".png")):
                image_keys.append(key)
    return image_keys


def extract_student_details_from_key(key):
    filename = os.path.basename(key)
    name_part, _ = os.path.splitext(filename)
    parts = name_part.split("_")

    if len(parts) >= 2:
        return parts[0].strip(), " ".join(parts[1:]).strip()

    return name_part.strip(), name_part.strip()


# -------------------------------
# EXCEL REPORT
# -------------------------------

def save_attendance_to_excel(
    attendance_data,
    absent_data,
    batch_name,
    class_name,
    subject,
    s3_bucket,
    region,
):
    now = datetime.now()
    filename = f"{now.strftime('%Y%m%d_%H%M%S')}_{batch_name}_{class_name}_{subject}.xlsx"

    os.makedirs("attendance_reports", exist_ok=True)
    filepath = os.path.join("attendance_reports", filename)

    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance"

    ws.append(
        ["ER Number", "Name", "Date", "Time", "Class", "Subject", "Batch", "Status"]
    )

    for student in attendance_data:
        ws.append(
            [
                student["er_number"],
                student["name"],
                now.strftime("%d-%m-%Y"),
                now.strftime("%H:%M:%S"),
                class_name,
                subject,
                batch_name,
                "Present",
            ]
        )

    for student in absent_data:
        ws.append(
            [
                student["er_number"],
                student["name"],
                now.strftime("%d-%m-%Y"),
                now.strftime("%H:%M:%S"),
                class_name,
                subject,
                batch_name,
                "Absent",
            ]
        )

    wb.save(filepath)

    s3 = boto3.client("s3", region_name=region)
    s3_key = f"reports/{filename}"
    s3.upload_file(filepath, s3_bucket, s3_key)

    return filepath, f"https://{s3_bucket}.s3.{region}.amazonaws.com/{s3_key}"


# -------------------------------
# MAIN ATTENDANCE LOGIC
# -------------------------------

from core.quality_check import analyze_image_quality


def mark_batch_attendance_s3(
    batch_name,
    class_name,
    subject,
    group_image_files,
    s3_bucket="ict-attendances",
    region="ap-south-1",
):
    rekognition = boto3.client("rekognition", region_name=region)

    student_image_keys = list_student_images_from_s3(
        s3_bucket, f"{batch_name}/"
    )

    present_students = {}
    quality_reports = []

    for idx, group_img in enumerate(group_image_files, start=1):
        group_bytes = group_img.read()

        quality_report = analyze_image_quality(group_bytes)
        quality_report["image_index"] = idx

        # Defaults (IMPORTANT)
        quality_report.update(
            {
                "face_detected": False,
                "face_count": 0,
                "avg_face_confidence": 0.0,
                "face_coverage_pct": 0.0,
            }
        )

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

        avg_confidence /= face_count
        face_coverage = total_face_area * 100

        quality_report.update(
            {
                "face_detected": True,
                "face_count": face_count,
                "avg_face_confidence": round(avg_confidence, 2),
                "face_coverage_pct": round(face_coverage, 2),
            }
        )

        if face_coverage < 1.0:
            quality_report["suggestion"] += " Faces too far. Move closer."

        quality_reports.append(quality_report)

        # Face comparison
        for key in student_image_keys:
            try:
                student_bytes = get_photo_bytes_from_s3(s3_bucket, key)
                result = rekognition.compare_faces(
                    SourceImage={"Bytes": student_bytes},
                    TargetImage={"Bytes": group_bytes},
                    SimilarityThreshold=80,
                )

                if result["FaceMatches"]:
                    er, name = extract_student_details_from_key(key)
                    present_students[er] = {"er_number": er, "name": name}
            except Exception as e:
                print(f"Compare error for {key}: {e}")

        group_img.seek(0)

    batch_students = [
        {"er_number": er, "name": name}
        for er, name in (
            extract_student_details_from_key(k) for k in student_image_keys
        )
    ]

    absent_students = [
        s for s in batch_students if s["er_number"] not in present_students
    ]

    attendance_list = list(present_students.values())

    _, report_url = save_attendance_to_excel(
        attendance_list,
        absent_students,
        batch_name,
        class_name,
        subject,
        s3_bucket,
        region,
    )

    return attendance_list, absent_students, report_url, quality_reports
