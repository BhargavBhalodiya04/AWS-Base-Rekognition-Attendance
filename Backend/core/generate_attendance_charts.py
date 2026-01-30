import matplotlib
matplotlib.use('Agg')

import matplotlib.pyplot as plt
import io
import base64
import pandas as pd
import boto3
import os
from dotenv import load_dotenv

load_dotenv()
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
EXCEL_FOLDER_KEY = os.getenv("EXCEL_FOLDER_KEY", "reports/")

def generate_overall_attendance():
    s3 = boto3.client(
        's3',
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY
    )

    response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=EXCEL_FOLDER_KEY)
    files = [file['Key'] for file in response.get('Contents', []) if file['Key'].endswith('.xlsx')]

    if not files:
        raise ValueError(f"No Excel files found in S3 folder: {EXCEL_FOLDER_KEY}")

    combined_df = pd.DataFrame()
    for file_key in files:
        obj = s3.get_object(Bucket=BUCKET_NAME, Key=file_key)
        df = pd.read_excel(io.BytesIO(obj['Body'].read()))
        df.columns = [col.strip().lower() for col in df.columns]
        combined_df = pd.concat([combined_df, df], ignore_index=True)

    required_cols = ['date', 'subject', 'student name', 'er number', 'status']
    missing_cols = [col for col in required_cols if col not in combined_df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns in Excel files: {missing_cols}")

    combined_df['date'] = pd.to_datetime(combined_df['date'], errors='coerce')
    combined_df = combined_df.dropna(subset=['date'])

    # Load Master Student List from students.xlsx
    try:
        student_obj = s3.get_object(Bucket=BUCKET_NAME, Key="students.xlsx")
        students_df = pd.read_excel(io.BytesIO(student_obj['Body'].read()))
        # Normalize columns
        students_df.columns = [col.strip().lower() for col in students_df.columns]
        
        # Map common column names to standard ones
        col_mapping = {
            'name': 'student name',
            'student_name': 'student name',
            'er_number': 'er number',
            'enrollment': 'er number',
            'er no': 'er number', 
            'erno': 'er number'
        }
        students_df.rename(columns=col_mapping, inplace=True)
        
        # Ensure we have required columns
        if 'student name' not in students_df.columns or 'er number' not in students_df.columns:
            # Fallback if standard columns aren't found - try to use first two columns
             print("Warning: Could not find 'student name' or 'er number' in students.xlsx. Using first two columns.")
             students_df.rename(columns={students_df.columns[0]: 'er number', students_df.columns[1]: 'student name'}, inplace=True)

        all_students = students_df[['student name', 'er number']].drop_duplicates()
        
    except Exception as e:
        print(f"Warning: Could not read students.xlsx: {e}. Falling back to report data.")
        # Fallback to existing logic if students.xlsx is missing/bad
        all_students = combined_df[['student name', 'er number']].drop_duplicates()

    # Total unique class sessions (date + subject)
    total_classes = combined_df[['date', 'subject']].drop_duplicates().shape[0]

    # Count Present only
    present_df = combined_df[combined_df['status'].str.lower() == 'present']

    present_count = (
        present_df[['date', 'subject', 'student name', 'er number']]
        .drop_duplicates()
        .groupby(['student name', 'er number'])
        .size()
        .reset_index(name='present_count')
    )

    # Convert ER Number to string for consistent merging
    all_students['er number'] = all_students['er number'].astype(str)
    present_count['er number'] = present_count['er number'].astype(str)

    # Merge Master List with Present Counts
    student_attendance_count = all_students.merge(
        present_count,
        on=['er number'],
        how='left',
        suffixes=('', '_from_report')
    ).fillna({'present_count': 0})
    
    # Handle name conflicts (prefer master list name, but fallback if missing)
    if 'student name_from_report' in student_attendance_count.columns:
         student_attendance_count['student name'] = student_attendance_count['student name'].fillna(student_attendance_count['student name_from_report'])

    # Add total_classes and percentage
    student_attendance_count['total_classes'] = total_classes
    student_attendance_count['attendance_percentage'] = (
        student_attendance_count['present_count'] / student_attendance_count['total_classes'] * 100
    )
    # Handle division by zero if total_classes is 0
    student_attendance_count['attendance_percentage'] = student_attendance_count['attendance_percentage'].fillna(0.0)

    students = []
    for _, row in student_attendance_count.iterrows():
        students.append({
            "name": row['student name'],
            "er_number": row['er number'],
            "present_count": int(row['present_count']),
            "total_classes": int(row['total_classes']),
            "attendance_percentage": round(float(row['attendance_percentage']), 1)
        })

    # Build Structured Daily Trend Data (how many PRESENT each day)
    daily_trend_df = (
        present_df.groupby('date')
        .agg({'er number': pd.Series.nunique})
        .reset_index()
    )
    daily_trend_data = []
    for _, row in daily_trend_df.iterrows():
        daily_trend_data.append({
            "date": row['date'].strftime('%Y-%m-%d'),
            "attendance": int(row['er number'])
        })

    # Calculate Real-time Average Attendance %
    # Use all_students count for accurate denominator
    total_students_count = len(all_students)
    total_days = combined_df['date'].nunique()
    total_attendance_records = present_df[['date', 'er number']].drop_duplicates().shape[0]

    if total_students_count * total_days > 0:
        avg_attendance_pct = round(
            (total_attendance_records / (total_students_count * total_days)) * 100, 1
        )
    else:
        avg_attendance_pct = 0.0

    # Generate Subject Pie Chart (based on PRESENT counts)
    subject_summary = (
        present_df.groupby('subject')
        .agg({'er number': pd.Series.nunique})
        .reset_index()
    )

    fig, ax = plt.subplots(figsize=(8, 8))
    ax.pie(
        subject_summary['er number'],
        labels=subject_summary['subject'],
        autopct='%1.1f%%',
        startangle=140
    )
    ax.set_title('Subject-wise Attendance Distribution')
    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    subject_pie_chart = base64.b64encode(buf.getvalue()).decode()

    return {
        "students": students,
        "daily_trend_data": daily_trend_data,
        "subject_pie_chart": subject_pie_chart,
        "avg_attendance_pct": f"{avg_attendance_pct}%"
    }

def get_student_details(er_number):
    s3 = boto3.client(
        's3',
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY
    )

    response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=EXCEL_FOLDER_KEY)
    files = [file['Key'] for file in response.get('Contents', []) if file['Key'].endswith('.xlsx')]

    if not files:
        return []

    combined_df = pd.DataFrame()
    for file_key in files:
        obj = s3.get_object(Bucket=BUCKET_NAME, Key=file_key)
        df = pd.read_excel(io.BytesIO(obj['Body'].read()))
        df.columns = [col.strip().lower() for col in df.columns]
        combined_df = pd.concat([combined_df, df], ignore_index=True)

    required_cols = ['date', 'subject', 'student name', 'er number', 'status']
    # basic check
    if not all(col in combined_df.columns for col in required_cols):
         return []

    combined_df['date'] = pd.to_datetime(combined_df['date'], errors='coerce')
    combined_df = combined_df.dropna(subset=['date'])

    # Filter for specific student
    student_df = combined_df[combined_df['er number'].astype(str) == str(er_number)]
    
    records = []
    for _, row in student_df.iterrows():
        records.append({
            "date": row['date'].strftime('%Y-%m-%d'),
            "subject": row['subject'],
            "status": row['status'],
            "time": row['time'] if 'time' in row else '-'
        })
        
    # Sort by date descending
    records.sort(key=lambda x: x['date'], reverse=True)
    
    return records
