import { useState, useEffect } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export const AttendanceAnalytics = () => {
  const [trendData, setTrendData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    bestSubject: "",
    bestBatch: "",
    activeSubjects: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || "http://65.0.42.143:5000";
        const res = await fetch(`${API_BASE}/api/overview`);
        if (!res.ok) throw new Error("API error");

        const json = await res.json();

        // Map backend response properly
        setTrendData(json.trend || []);
        setSubjects(json.subjects || []);
        setStats({
          totalStudents: json.totalStudents || 0,
          avgAttendance: json.avgAttendance || 0,
          bestSubject: json.bestSubject || "",
          bestBatch: json.bestBatch || "",
          activeSubjects: json.activeSubjects || 0
        });
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-lg text-gray-600 animate-pulse">
          Loading attendance analytics...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* 🔹 SUMMARY CARDS */}
        <section className="grid md:grid-cols-5 gap-6">
          <StatCard title="Total Students" value={stats.totalStudents} />
          <StatCard title="Avg Attendance" value={`${stats.avgAttendance}%`} />
          <StatCard title="Best Subject" value={stats.bestSubject} />
          <StatCard title="Best Batch" value={stats.bestBatch} />
          <StatCard title="Active Subjects" value={stats.activeSubjects} />
        </section>

        {/* 🔹 CHARTS */}
        <section className="grid md:grid-cols-2 gap-10">

          {/* Attendance Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-6">
              📊 Attendance Trend
            </h2>

            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center">
                No trend data available
              </p>
            )}
          </div>

          {/* Subject Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-6">
              📚 Subject-wise Attendance
            </h2>

            {subjects.length > 0 ? (
              <table className="min-w-full border">
                <thead className="bg-indigo-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-left">Batch</th>
                    <th className="px-4 py-2 text-left">Attendance %</th>
                    <th className="px-4 py-2 text-left">Present</th>
                    <th className="px-4 py-2 text-left">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((sub, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{sub.subject}</td>
                      <td className="px-4 py-2">{sub.batch}</td>
                      <td className="px-4 py-2 font-semibold text-indigo-600">
                        {sub.attendance}%
                      </td>
                      <td className="px-4 py-2">{sub.presentCount}</td>
                      <td className="px-4 py-2">{sub.totalCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-center">
                No subject data available
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

/* 🔹 Small reusable card */
const StatCard = ({ title, value }) => (
  <div className="bg-white shadow rounded-lg p-5 text-center">
    <p className="text-gray-500 text-sm">{title}</p>
    <p className="text-2xl font-bold text-indigo-600 mt-2">{value}</p>
  </div>
);
