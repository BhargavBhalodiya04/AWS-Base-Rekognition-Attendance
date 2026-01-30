import boto3
import os
from datetime import datetime
from openpyxl import Workbook

# Get individual student image bytes from S3
def get_photo_bytes_from_s3(bucket, key):
    s3 = boto3.client('s3')
    response = s3.get_object(Bucket=bucket, Key=key)
    return response['Body'].read()

# List all student image keys in a batch
def list_student_images_from_s3(bucket, batch_prefix):
    s3 = boto3.client('s3')
    paginator = s3.get_paginator('list_objects_v2')
    page_iterator = paginator.paginate(Bucket=bucket, Prefix=batch_prefix)

    image_keys = []
    for page in page_iterator:
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key.lower().endswith(('.jpg', '.jpeg', '.png')) and key != batch_prefix:
                image_keys.append(key)
    return image_keys

# Extract ER number and student name from file name safely
def extract_student_details_from_key(key):
    filename = os.path.basename(key)  # e.g. "1234_John_Doe.png"
    name_part, _ = os.path.splitext(filename)  # -> "1234_John_Doe"
    parts = name_part.split('_')

    if len(parts) >= 2:
        er_number = parts[0]
        name = " ".join(parts[1:])
        return er_number.strip(), name.strip()

    # Fallback if no underscore or malformed filename
    return name_part.strip(), name_part.strip()

# Save attendance to Excel and upload to S3
def save_attendance_to_excel(attendance_data, absent_data, batch_name, class_name, subject, s3_bucket, region):
    now = datetime.now()
    current_date = now.strftime("%Y%m%d")  
    current_time = now.strftime("%H%M%S")  # ✅ Unique per attendance

    # Build filename: date_time_batch_class_subject.xlsx
    safe_batch = batch_name.replace(" ", "_")
    safe_class = class_name.replace(" ", "_")
    safe_subject = subject.replace(" ", "_")

    filename = f"{current_date}_{current_time}_{safe_batch}_{safe_class}_{safe_subject}.xlsx"

    # Save locally first
    save_dir = "attendance_reports"
    os.makedirs(save_dir, exist_ok=True)
    filepath = os.path.join(save_dir, filename)

    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance"

    # Header row
    ws.append(["ER Number", "Student Name", "Date", "Time", "Class", "Subject", "Batch", "Status"])

    # ✅ Present students
    for student in attendance_data:
        ws.append([
            student["er_number"],
            student["name"],
            now.strftime("%d-%m-%Y"),
            now.strftime("%H:%M:%S"),
            class_name,
            subject,
            batch_name,
            "Present"
        ])

    # ✅ Absent students
    for student in absent_data:
        ws.append([
            student["er_number"],
            student["name"],
            now.strftime("%d-%m-%Y"),
            now.strftime("%H:%M:%S"),
            class_name,
            subject,
            batch_name,
            "Absent"
        ])

    wb.save(filepath)

    # ✅ Upload to S3
    s3 = boto3.client("s3", region_name=region)
    s3_key = f"reports/{filename}"
    s3.upload_file(filepath, s3_bucket, s3_key)

    # ✅ Return public file URL
    file_url = f"https://{s3_bucket}.s3.{region}.amazonaws.com/{s3_key}"
    return filepath, file_url

from core.quality_check import analyze_image_quality

def mark_batch_attendance_s3(
    batch_name,
    class_name,
    subject,
    group_image_files,
    s3_bucket='ict-attendance',
    region='ap-south-1'
):
    rekognition = boto3.client('rekognition', region_name=region)
    batch_prefix = f"{batch_name}/"

    # ✅ Fetch only images from the selected batch
    student_image_keys = list_student_images_from_s3(s3_bucket, batch_prefix)

    present_students = {}
    quality_reports = []  # ✅ Store quality reports for each image

    for i, group_img_file in enumerate(group_image_files):
        group_bytes = group_img_file.read()

        # ✅ 1. Run Quality Check
        quality_report = analyze_image_quality(group_bytes)
        quality_report['image_index'] = i + 1
        
        # ✅ 2. Run Rekognition Detection to get Face Metrics
        detection = rekognition.detect_faces(
            Image={'Bytes': group_bytes},
            Attributes=['ALL']
        )
        
        if not detection['FaceDetails']:
            quality_report['face_detected'] = False
            quality_report['error'] = "No faces detected"
            quality_reports.append(quality_report)
            print("⚠️ No face detected in group image. Skipping...")
            continue
        
        quality_report['face_detected'] = True
        quality_report['face_count'] = len(detection['FaceDetails'])
        
        # Calculate Average Face Quality Metrics from Rekognition
        avg_confidence = 0
        total_face_area = 0
        
        for face in detection['FaceDetails']:
            avg_confidence += face['Confidence']
            box = face['BoundingBox']
            total_face_area += box['Width'] * box['Height']
            
        avg_confidence /= len(detection['FaceDetails'])
        face_coverage = total_face_area * 100 # Percentage of image covered by faces
        
        quality_report['avg_face_confidence'] = round(avg_confidence, 2)
        quality_report['face_coverage_pct'] = round(face_coverage, 2)
        
        # Add suggestion if coverage is too low
        if face_coverage < 1.0: # Less than 1% of image is faces
            quality_report['suggestion'] += " Faces are too small or far away. Move closer."

        quality_reports.append(quality_report)
        
        # ✅ 3. Compare Faces
        for key in student_image_keys:
            try:
                student_bytes = get_photo_bytes_from_s3(s3_bucket, key)
                response = rekognition.compare_faces(
                    SourceImage={'Bytes': student_bytes},
                    TargetImage={'Bytes': group_bytes},
                    SimilarityThreshold=80
                )
                if response['FaceMatches']:
                    er_number, student_name = extract_student_details_from_key(key)
                    er_number = er_number.strip()  # ensure no extra spaces
                    student_name = student_name.strip()
                    present_students[er_number] = {"er_number": er_number, "name": student_name}
            except Exception as e:
                print(f"⚠️ Error comparing {key}: {e}")
                continue

        group_img_file.seek(0)

    # ✅ Build full batch student list
    batch_students = []
    for key in student_image_keys:
        er_number, student_name = extract_student_details_from_key(key)
        batch_students.append({
            "er_number": er_number.strip(),
            "name": student_name.strip()
        })

    # ✅ Compute absent students
    absent_students = [
        student for student in batch_students
        if student["er_number"] not in present_students
    ]

    # ✅ Debug prints (optional, remove in production)
    print("Batch students ER numbers:", [s["er_number"] for s in batch_students])
    print("Present students ER numbers:", list(present_students.keys()))
    print("Absent students ER numbers:", [s["er_number"] for s in absent_students])

    # Save Excel for present students
    attendance_list = list(present_students.values())
    excel_file_path, file_url = save_attendance_to_excel(
    attendance_list, absent_students, batch_name, class_name, subject, s3_bucket, region
)

    # ✅ Return present, absent, excel URL, AND quality reports
    return attendance_list, absent_students, file_url, quality_reports