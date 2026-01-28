import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  BarChart3,
  FileSpreadsheet,
  BookOpen,
  Plus,
  Scan,
  Bell,
} from "lucide-react";
import { DashboardHeader } from "@/components/Dashboard/DashboardHeader";
import { DashboardCard } from "@/components/Dashboard/DashboardCard";
import { StudentGallery } from "@/components/Dashboard/StudentGallery";
import { AttendanceAnalytics } from "@/components/Dashboard/AttendanceAnalytics";
import ReportsDownloads from "@/components/Dashboard/ReportsDownloads";
import { ClassOverview } from "@/components/Dashboard/ClassOverview";
import RegisterStudent from "@/components/Dashboard/RegisterStudent";

const API_BASE = import.meta.env.VITE_API_BASE || "http://65.0.42.143:5000/";

type DashboardView =
  | "main"
  | "students"
  | "analytics"
  | "reports"
  | "classes"
  | "register"
  | "attendance"
  | "alerts";

type StudentRecord = {
  er_number?: string;
  name?: string;
};

type AttendanceResult = {
  success?: boolean;
  error?: string;
  present?: StudentRecord[];
  absent?: StudentRecord[];
  [k: string]: any;
};

const Dashboard = () => {
  const [currentView, setCurrentView] = useState<DashboardView>("main");
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalReports, setTotalReports] = useState<number>(0);

  // Alert State
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertResults, setAlertResults] = useState<any[] | null>(null);

  const [batchName, setBatchName] = useState("");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [groupImages, setGroupImages] = useState<FileList | null>(null);
  const [attendanceResult, setAttendanceResult] = useState<AttendanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch students count
  const fetchStudentsCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/students/count`);
      const data = await res.json();
      setTotalStudents(Number(data?.count) || 0);
    } catch (err) {
      console.error("Error fetching student count:", err);
      setTotalStudents(0);
    }
  };

  // Fetch reports count
  const fetchReportsCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports`);
      const data = await res.json();
      // if the API returns an array
      if (Array.isArray(data)) {
        setTotalReports(data.length);
      } else if (typeof data === "object" && data !== null && Array.isArray(data.reports)) {
        setTotalReports(data.reports.length);
      } else {
        setTotalReports(Number(data?.length) || 0);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setTotalReports(0);
    }
  };

  useEffect(() => {
    fetchStudentsCount();
    fetchReportsCount();
  }, []);

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAttendanceResult(null);

    if (!groupImages || groupImages.length === 0) {
      setErrorMsg("Please select at least one group image.");
      return;
    }
    if (!batchName.trim() || !subject.trim()) {
      setErrorMsg("Batch and Subject are required.");
      return;
    }

    const fd = new FormData();
    fd.append("batch_name", batchName.trim());
    fd.append("subject_name", subject.trim());
    fd.append("lab_name", className.trim() || "");

    Array.from(groupImages).forEach((file) => {
      fd.append("class_images", file);
    });

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/take_attendance`, {
        method: "POST",
        body: fd,
      });

      const data: AttendanceResult = await res.json();

      if (!data) {
        setErrorMsg("Empty response from server.");
      } else if (data.success === false) {
        setErrorMsg(data.error || "Attendance failed");
      } else {
        setAttendanceResult(data);
      }
    } catch (err: any) {
      console.error("Attendance error:", err);
      setErrorMsg(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const [analyticsData, setAnalyticsData] = useState<{ avg_attendance_pct: string }>({
    avg_attendance_pct: "0%",
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_BASE}/dashboard`);
        const data = await res.json();
        setAnalyticsData({
          avg_attendance_pct: data?.avg_attendance_pct ?? "0%",
        });
      } catch (err) {
        console.error("Error fetching dashboard:", err);
      }
    };
    fetchDashboard();
  }, []);

  const dashboardOptions = [
    {
      title: "Register Student",
      description: "Add new student faces to the system",
      icon: Plus,
      variant: "primary" as const,
      stats: `${totalStudents} Students`,
      view: "register" as DashboardView,
    },
    {
      title: "Take Attendance",
      description: "Capture class photo and mark attendance",
      icon: Scan,
      variant: "secondary" as const,
      view: "attendance" as DashboardView,
    },
    {
      title: "Attendance Analytics",
      description: "Individual student performance graphs",
      icon: BarChart3,
      variant: "primary" as const,
      view: "analytics" as DashboardView,
    },

    {
      title: "Reports & Downloads",
      description: "Download Excel files and attendance reports",
      icon: FileSpreadsheet,
      variant: "warning" as const,
      stats: `${totalReports} Reports`,
      view: "reports" as DashboardView,
    },
    {
      title: "Class Overview",
      description: "Subject-wise attendance and class graphs",
      icon: BookOpen,
      variant: "secondary" as const,
      stats: "—",
      view: "classes" as DashboardView,
    },
    {
      title: "Low Attendance Alerts",
      description: "Notify students with low attendance (<75%)",
      icon: Bell,
      variant: "warning" as const,
      view: "alerts" as DashboardView,
    },
  ];

  // Alerts Handler
  const handleTriggerAlerts = async () => {
    setAlertLoading(true);
    setAlertResults(null);
    try {
      toast.info("Checking attendance records...");
      const res = await fetch(`${API_BASE}/api/trigger-low-attendance-alert`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setAlertResults(data.alerted_students || []);
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to trigger alerts");
      }
    } catch (err) {
      console.error("Alert error:", err);
      toast.error("Network error while sending alerts");
    } finally {
      setAlertLoading(false);
    }
  };

  const renderAlertsView = () => (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md border">
      <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <Bell className="w-6 h-6 text-orange-500" />
        Low Attendance Auto-Alerter
      </h3>

      <div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-md">
        <p className="text-sm text-orange-800">
          This tool will scan all student records. Any student with <strong>less than 75% attendance</strong> will receive an email warning.
        </p>
      </div>

      <button
        onClick={handleTriggerAlerts}
        disabled={alertLoading}
        className="bg-orange-600 text-white px-6 py-3 rounded-md font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
      >
        {alertLoading ? "Processing & Sending Emails..." : "Run Low Attendance Check"}
      </button>

      {alertResults && (
        <div className="mt-8">
          <h4 className="font-semibold mb-4">Results ({alertResults.length} Found)</h4>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-3">Student Name</th>
                  <th className="px-6 py-3">Attendance %</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {alertResults.map((s, i) => (
                  <tr key={i} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{s.name}</td>
                    <td className="px-6 py-4 text-red-600 font-bold">{s.percentage}%</td>
                    <td className="px-6 py-4 text-gray-500">{s.status}</td>
                  </tr>
                ))}
                {alertResults.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      Great news! No students are below 75%.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // Attendance Form + Results
  const renderAttendanceView = () => (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md border">
      <h3 className="text-2xl font-semibold mb-6">Take Attendance</h3>

      <form onSubmit={handleAttendanceSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Batch Name</label>
            <input
              className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 2021-2025"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Division Name</label>
            <input
              className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., A"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <input
              className="w-full px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., CN"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Upload Class Photo</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png"
            multiple
            onChange={(e) => setGroupImages(e.target.files)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">Upload one or more class/group photos.</p>
        </div>

        {/* Errors */}
        {errorMsg && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium shadow hover:bg-blue-700 transition-colors"
          disabled={loading}
        >
          {loading ? "Processing..." : "Mark Attendance"}
        </button>
      </form>

      {/* Attendance Result */}
      {attendanceResult && (
        <div className="mt-10 bg-gray-50 p-6 rounded-lg border">
          <h4 className="font-semibold mb-4 text-lg">Attendance Result</h4>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Present Students */}
            {attendanceResult?.present && attendanceResult.present.length > 0 ? (
              <table className="w-full border border-gray-300 rounded-lg mb-6">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2 text-left">Number</th>
                    <th className="border px-4 py-2 text-left">ER Number</th>
                    <th className="border px-4 py-2 text-left">Student Name</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceResult.present.map((student, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{idx + 1}</td>
                      <td className="border px-4 py-2">{student.er_number}</td>
                      <td className="border px-4 py-2">{student.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500 mb-6">No present students.</p>
            )}

            {/* Absent Students */}
            {attendanceResult?.absent && attendanceResult.absent.length > 0 ? (
              <table className="w-full border border-gray-300 rounded-lg mb-6">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2 text-left">Number</th>
                    <th className="border px-4 py-2 text-left">ER Number</th>
                    <th className="border px-4 py-2 text-left">Student Name</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceResult.absent.map((student, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{idx + 1}</td>
                      <td className="border px-4 py-2">{student.er_number}</td>
                      <td className="border px-4 py-2 text-red-600">{student.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500 mb-6">No absent students.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Handle View Switching
  const renderCurrentView = () => {
    switch (currentView) {
      case "students":
        return <StudentGallery />;
      case "analytics":
        return <AttendanceAnalytics />;
      case "reports":
        return <ReportsDownloads />;
      case "classes":
        return <ClassOverview />;
      case "register":
        return <RegisterStudent onStudentAdded={fetchStudentsCount} />;
      case "attendance":
        return renderAttendanceView();
      case "alerts":
        return renderAlertsView();
      default:
        return (
          <div className="space-y-8">
            <div className="text-center py-8 bg-white rounded-lg shadow">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Faculty Dashboard</h2>
              <p className="text-lg text-gray-500">
                Comprehensive attendance management powered by ICT Department
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-6 text-gray-800">Dashboard Functions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardOptions.map((option, index) => (
                  <DashboardCard
                    key={index}
                    title={option.title}
                    description={option.description}
                    icon={option.icon}
                    variant={option.variant}
                    stats={option.stats}
                    onClick={() => setCurrentView(option.view)}
                  />
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      {currentView !== "main" && (
        <div className="px-6 py-2 border-b border-gray-200 bg-white shadow-sm">
          <button
            onClick={() => setCurrentView("main")}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      )}
      <main className="container mx-auto px-6 py-8">{renderCurrentView()}</main>
    </div>
  );
};

export default Dashboard;
