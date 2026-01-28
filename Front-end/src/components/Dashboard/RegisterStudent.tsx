import React, { useState, useRef, ChangeEvent, FormEvent } from "react";

interface UploadResponse {
  success: boolean;
  results?: string[];
  student?: {
    batch_name: string;
    bucket_name: string;
    er_number: string;
    name: string;
  };
  message?: string;
  error?: string;
}

interface RegisterStudentProps {
  onStudentAdded?: () => void; // 🔥 callback from Dashboard
}

const RegisterStudent: React.FC<RegisterStudentProps> = ({ onStudentAdded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [studentName, setStudentName] = useState("");
  const [erNumber, setErNumber] = useState("");
  const [batchName, setBatchName] = useState("");
  const [bucketName, setBucketName] = useState("ict-attendance");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedStudent, setUploadedStudent] = useState<string | null>(null); // 👈 to display student name

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file first");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setUploadedStudent(null);

    const formData = new FormData();
    formData.append("images", file);
    formData.append("name", studentName);
    formData.append("er_number", erNumber);
    formData.append("batch_name", batchName);
    formData.append("bucket_name", bucketName);

    try {
      const response = await fetch("http://65.0.42.143:5000/upload-image", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      console.log("Raw response text:", text);

      let data: UploadResponse;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Failed to parse JSON:", text);
        throw new Error("Server did not return valid JSON");
      }

      if (!response.ok || !data.success) {
        setError("❌ Upload failed: " + (data.error || "Unknown error"));
        setMessage(null);
      } else {
        setMessage(data.message || "✅ Upload successful!");
        setError(null);
        console.log("Upload results:", data.results);
        console.log("Student info:", data.student);

        // 🔥 Store uploaded student name to show below form
        if (data.student?.name) {
          setUploadedStudent(data.student.name);
        }

        // 🔥 Notify Dashboard to update student count
        if (onStudentAdded) onStudentAdded();

        // Reset form fields
        setFile(null);
        setStudentName("");
        setErNumber("");
        setBatchName("");
        setBucketName("ict-attendance");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setError("❌ Upload error: " + err.message);
      setMessage(null);
      console.error("Error uploading:", err);
    } finally {
      setLoading(false);
    }
  };

  // Input fields list
  const inputFields = [
    { label: "Student Name", value: studentName, setValue: setStudentName, required: true },
    { label: "ER Number", value: erNumber, setValue: setErNumber, required: true },
    { label: "Batch Name", value: batchName, setValue: setBatchName, required: true },
    { label: "Bucket Name", value: bucketName, setValue: setBucketName, required: false },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 400,
        margin: "2rem auto",
        padding: "2rem",
        border: "1px solid #ddd",
        borderRadius: 10,
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: "#fff",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "1.5rem",
          color: "#333",
          fontWeight: "700",
          fontSize: "1.8rem",
        }}
      >
        Upload Student Image
      </h2>

      {inputFields.map(({ label, value, setValue, required }) => (
        <input
          key={label}
          type="text"
          placeholder={label}
          value={value}
          required={required}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: "100%",
            padding: "0.6rem 0.75rem",
            marginBottom: "1.2rem",
            borderRadius: 6,
            border: "1.5px solid #ccc",
            fontSize: "1rem",
            transition: "border-color 0.3s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4a90e2")}
          onBlur={(e) => (e.target.style.borderColor = "#ccc")}
        />
      ))}

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept="image/*"
        required
        style={{
          marginBottom: "1.5rem",
          cursor: "pointer",
        }}
      />

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "0.75rem",
          fontSize: "1.1rem",
          backgroundColor: loading ? "#7ea1d6" : "#4a90e2",
          color: "#fff",
          fontWeight: "600",
          border: "none",
          borderRadius: 6,
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 3px 6px rgba(74, 144, 226, 0.6)",
          transition: "background-color 0.3s ease",
        }}
        onMouseEnter={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = "#357ABD";
        }}
        onMouseLeave={(e) => {
          if (!loading) e.currentTarget.style.backgroundColor = "#4a90e2";
        }}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {message && (
        <p
          style={{
            color: "green",
            marginTop: "1rem",
            fontWeight: "600",
            textAlign: "center",
          }}
          role="alert"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          style={{
            color: "red",
            marginTop: "1rem",
            fontWeight: "600",
            textAlign: "center",
          }}
          role="alert"
        >
          {error}
        </p>
      )}

      {/* 👇 Show uploaded student name at bottom */}
      {uploadedStudent && (
        <p
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            fontWeight: "700",
            fontSize: "1.1rem",
            color: "#2c3e50",
          }}
        >
          🎓 Registered Student:{" "}
          <span style={{ color: "#4a90e2" }}>{uploadedStudent}</span>
        </p>
      )}
    </form>
  );
};

export default RegisterStudent;
