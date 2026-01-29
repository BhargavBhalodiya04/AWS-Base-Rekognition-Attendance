import boto3
import pandas as pd
import io
import os

BUCKET = os.getenv("BUCKET_NAME", "ict-attendances")
THRESHOLD = 75

s3 = boto3.client("s3")
sns = boto3.client("sns")

SNS_TOPIC_ARN = os.getenv("SNS_TOPIC_ARN")

def trigger_alert(report_key):
    # load students
    students = pd.read_excel(
        io.BytesIO(
            s3.get_object(Bucket=BUCKET, Key="students.xlsx")["Body"].read()
        )
    )

    # load current report
    today = pd.read_excel(
        io.BytesIO(
            s3.get_object(Bucket=BUCKET, Key=report_key)["Body"].read()
        )
    )

    present = set(today[today["Status"] == "Present"]["ER Number"])

    absent = [
        f"{r['Name']} ({r['ER Number']})"
        for _, r in students.iterrows()
        if r["ER Number"] not in present
    ]

    # simple alert (absent only)
    message = "🟥 Absent Today:\n" + "\n".join(absent)

    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Subject="Attendance Alert",
        Message=message
    )
