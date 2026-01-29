import io
import os
import pandas as pd
from flask import Blueprint, jsonify
from dotenv import load_dotenv
import boto3
from datetime import timezone

# -----------------------
# Load environment
# -----------------------
load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")

# 🔴 MUST MATCH EXACT BUCKET NAME
BUCKET_NAME = os.getenv("BUCKET_NAME", "ict-attendances")

# -----------------------
# S3 client
# -----------------------
s3_client = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY
)

dashboard_bp = Blueprint("dashboard_api", __name__)

# =====================================================
# 🔹 LOW ATTENDANCE HELPER FUNCTION
# =====================================================
def get_low_attendance_students(threshold=75):
    """
    Calculate low attendance students using reports in S3
    """

    # 1️⃣ Load students.xlsx
    students_obj = s3_client.get_object(
        Bucket=BUCKET_NAME,
        Key="students.xlsx"
    )
    students_body = students_obj["Body"].read()
    df_students = pd.read_excel(io.BytesIO(students_body))

    # Expected columns:
    # ER Number | Name | Batch | Section
    students = df_students.to_dict(orient="records")

    # 2️⃣ List reports
    response = s3_client.list_objects_v2(
        Bucket=BUCKET_NAME,
        Prefix="reports/"
    )

    attendance_map = {}
    total_classes = 0

    for obj in response.get("Contents", []):
        key = obj["Key"]

        if not key.endswith((".xlsx", ".csv")):
            continue

        total_classes += 1

        report_obj = s3_client.get_object(
            Bucket=BUCKET_NAME,
            Key=key
        )
        body = report_obj["Body"].read()

        df = (
            pd.read_csv(io.BytesIO(body))
            if key.endswith(".csv")
            else pd.read_excel(io.BytesIO(body))
        )

        if "ER Number" not in df.columns or "Status" not in df.columns:
            continue

        present_ers = set(
            df[df["Status"].str.lower() == "present"]["ER Number"]
        )

        for s in students:
            er = s["ER Number"]

            attendance_map.setdefault(
                er,
                {
                    "name": s.get("Name", "Unknown"),
                    "batch": s.get("Batch", "Unknown"),
                    "section": s.get("Section", "Unknown"),
                    "present": 0
                }
            )

            if er in present_ers:
                attendance_map[er]["present"] += 1

    # 3️⃣ Calculate percentages
    low_attendance = []

    for er, data in attendance_map.items():
        percentage = (
            round((data["present"] / total_classes) * 100, 2)
            if total_classes > 0 else 0
        )

        if percentage < threshold:
            low_attendance.append({
                "erNumber": er,
                "name": data["name"],
                "batch": data["batch"],
                "section": data["section"],
                "presentClasses": data["present"],
                "totalClasses": total_classes,
                "attendancePercentage": percentage
            })

    return low_attendance


# =====================================================
# 🔹 LOW ATTENDANCE API
# =====================================================
@dashboard_bp.route("/api/trigger-low-attendance-alert", methods=["GET"])
def trigger_low_attendance_alert():
    try:
        threshold = float(os.getenv("LOW_ATTENDANCE_THRESHOLD", 75))

        students = get_low_attendance_students(threshold)

        return jsonify({
            "success": True,
            "threshold": threshold,
            "lowAttendanceCount": len(students),
            "students": students
        })

    except Exception as e:
        print("LOW ATTENDANCE ERROR:", e)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =====================================================
# 🔹 OVERVIEW API (UNCHANGED)
# =====================================================
@dashboard_bp.route("/api/overview", methods=["GET"])
def class_overview():
    try:
        print("DEBUG: Using bucket ->", BUCKET_NAME)

        # 1️⃣ Load students.xlsx
        try:
            students_obj = s3_client.get_object(
                Bucket=BUCKET_NAME,
                Key="students.xlsx"
            )
            students_body = students_obj["Body"].read()
            df_students = pd.read_excel(io.BytesIO(students_body))
            total_students = len(df_students)
        except Exception as e:
            print("ERROR reading students.xlsx:", e)
            total_students = 0

        # 2️⃣ List reports
        response = s3_client.list_objects_v2(
            Bucket=BUCKET_NAME,
            Prefix="reports/"
        )

        subjects_data = []
        overall_trend = []

        for obj in response.get("Contents", []):
            key = obj["Key"]

            if not key.endswith((".xlsx", ".csv")):
                continue

            try:
                report_obj = s3_client.get_object(
                    Bucket=BUCKET_NAME,
                    Key=key
                )
                report_body = report_obj["Body"].read()

                df = (
                    pd.read_csv(io.BytesIO(report_body))
                    if key.endswith(".csv")
                    else pd.read_excel(io.BytesIO(report_body))
                )

                if df.empty:
                    continue

                df.columns = [c.strip() for c in df.columns]

                subject_name = df["Subject"].iloc[0] if "Subject" in df.columns else "Unknown"
                batch_name = df["Batch"].iloc[0] if "Batch" in df.columns else "Unknown"

                present_count = 0
                if "Status" in df.columns and "ER Number" in df.columns:
                    present_count = (
                        df[df["Status"].str.lower() == "present"]["ER Number"]
                        .nunique()
                    )

                total_count = total_students if total_students > 0 else 1
                attendance_percent = round((present_count / total_count) * 100, 2)

                subjects_data.append({
                    "subject": subject_name,
                    "batch": batch_name,
                    "attendance": attendance_percent,
                    "presentCount": present_count,
                    "totalCount": total_count
                })

                # Monthly trend
                if "Date" in df.columns:
                    df["Month"] = pd.to_datetime(
                        df["Date"], errors="coerce"
                    ).dt.strftime("%b")

                    trend = (
                        df[df["Status"].str.lower() == "present"]
                        .groupby("Month")["ER Number"]
                        .nunique()
                        .reset_index(name="attendance")
                    )

                    for _, row in trend.iterrows():
                        overall_trend.append({
                            "month": row["Month"],
                            "attendance": row["attendance"],
                            "subject_batch": f"{subject_name} ({batch_name})"
                        })

            except Exception as e:
                print(f"ERROR reading {key}:", e)
                continue

        # 3️⃣ Aggregate
        if subjects_data:
            df_subjects = pd.DataFrame(subjects_data)
            subjects_data = (
                df_subjects
                .groupby(["subject", "batch"], as_index=False)
                .agg({
                    "attendance": "mean",
                    "presentCount": "sum",
                    "totalCount": "max"
                })
                .to_dict(orient="records")
            )

        avg_attendance = (
            round(sum(s["attendance"] for s in subjects_data) / len(subjects_data), 2)
            if subjects_data else 0
        )

        best_subject_data = (
            max(subjects_data, key=lambda x: x["attendance"])
            if subjects_data else None
        )

        return jsonify({
            "avgAttendance": avg_attendance,
            "totalStudents": total_students,
            "activeSubjects": len(subjects_data),
            "bestSubject": best_subject_data["subject"] if best_subject_data else None,
            "bestBatch": best_subject_data["batch"] if best_subject_data else None,
            "subjects": subjects_data,
            "trend": overall_trend
        })

    except Exception as e:
        print("FATAL OVERVIEW ERROR:", e)
        return jsonify({"error": str(e)}), 500
