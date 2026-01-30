import React, { useState, useRef, ChangeEvent, FormEvent } from "react";

interface UploadResponse {
  success: boolean;
  results?: string[];
  student?: {
    batch_name: string;
    bucket_name: string;
    er_number: string;
    name: string;
    parent_phone?: string; // ✅ ADDED
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

  const [parentPhone, setParentPhone] = useState(""); // ✅ ADDED

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedStudent, setUploadedStudent] = useState<string | null>(null);

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

    if (parentPhone.length !== 10) { // ✅ ADDED
      setError("Parent phone number must be 10 digits");
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
    formData.append("parent_phone", parentPhone); // ✅ ADDED

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://65.0.42.143:5000";
      const response = await fetch(`${API_BASE}/upload-image`, {
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

        if (data.student?.name) {
          setUploadedStudent(data.student.name);
        }

        if (onStudentAdded) onStudentAdded();

        // Reset form fields
        setFile(null);
        setStudentName("");
        setErNumber("");
        setBatchName("");
        setBucketName("ict-attendance");
        setParentPhone(""); // ✅ ADDED

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

    { // ✅ ADDED (NO REMOVAL)
      label: "Parent Phone Number",
      value: parentPhone,
      setValue: setParentPhone,
      required: true,
    },

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
          type={label.includes("Phone") ? "tel" : "text"} // ✅ ADDED
          placeholder={label}
          value={value}
          required={required}
          onChange={(e) => {
            if (label.includes("Phone")) {
              setValue(e.target.value.replace(/\D/g, "").slice(0, 10)); // ✅ ADDED
            } else {
              setValue(e.target.value);
            }
          }}
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
        style={{ marginBottom: "1.5rem", cursor: "pointer" }}
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
        }}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {message && (
        <p style={{ color: "green", marginTop: "1rem", fontWeight: "600", textAlign: "center" }}>
          {message}
        </p>
      )}

      {error && (
        <p style={{ color: "red", marginTop: "1rem", fontWeight: "600", textAlign: "center" }}>
          {error}
        </p>
      )}

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
