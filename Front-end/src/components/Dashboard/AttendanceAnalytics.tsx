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
  const [data, setData] = useState({
    students: [],
    daily_trend_data: [],
    subject_pie_chart: ""
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://65.0.42.143:5000/overview");
        const json = await res.json();

        setData({
          students: json.students || [],
          daily_trend_data: json.daily_trend_data || [],
          subject_pie_chart: json.subject_pie_chart
        });
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtering
  const filteredStudents = data.students.filter((student) =>
    (student.name?.toString() || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.er_number?.toString() || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentStudents = sortedStudents.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedStudents.length / rowsPerPage);

  // Handle Sorting
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-lg text-gray-600 animate-pulse">Loading attendance data...</p>
      </div>
    );

  return (
    <div className="bg-gray-100 min-h-screen py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Charts Section */}
        <section className="grid md:grid-cols-2 gap-10">
          {/* Daily Attendance Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">
              📊 Daily Attendance Trend
            </h2>

            {data.daily_trend_data.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={450}>
                  <ComposedChart data={data.daily_trend_data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#374151', fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: '#374151', fontSize: 12 }}
                      label={{ value: 'Students Present', angle: -90, position: 'insideLeft', offset: 10 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                      type="monotone"
                      dataKey="attendance"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 text-center">No trend data available.</p>
            )}
          </div>

          {/* Subject-wise Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2 text-center">
              📚 Subject-wise Attendance Distribution
            </h2>
            {data.subject_pie_chart ? (
              <img
                src={`data:image/png;base64,${data.subject_pie_chart}`}
                alt="Subject Attendance Pie Chart"
                className="w-full max-w-md h-auto rounded-lg shadow-md border"
              />
            ) : (
              <p className="text-gray-500 text-center">No chart data available.</p>
            )}
            <p className="mt-4 text-gray-600 text-center text-sm">
              Distribution of attendance percentage per subject
            </p>
          </div>
        </section>

        {/* Student Attendance Overview */}
        <section className="bg-white rounded-lg shadow p-8">
          <h2 className="text-3xl font-semibold text-gray-800 mb-6 border-b pb-2">
            📋 Student Attendance Overview
          </h2>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by Student Name or ER Number..."
              className="w-full p-3 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Table */}
          {currentStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse text-gray-700">
                <thead className="sticky top-0 bg-indigo-100">
                  <tr>
                    <th
                      className="px-6 py-3 text-left font-semibold cursor-pointer"
                      onClick={() => requestSort("name")}
                    >
                      Student Name ⬍
                    </th>
                    <th
                      className="px-6 py-3 text-left font-semibold cursor-pointer"
                      onClick={() => requestSort("present_count")}
                    >
                      Classes Attended ⬍
                    </th>
                    <th
                      className="px-6 py-3 text-left font-semibold cursor-pointer"
                      onClick={() => requestSort("total_classes")}
                    >
                      Total Classes ⬍
                    </th>
                    <th
                      className="px-6 py-3 text-left font-semibold cursor-pointer"
                      onClick={() => requestSort("attendance_percentage")}
                    >
                      Attendance % ⬍
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentStudents.map((student) => (
                    <tr key={student.er_number} className="odd:bg-gray-50 even:bg-gray-100 hover:bg-indigo-50 transition">
                      <td className="px-6 py-4 font-medium">{student.name}</td>
                      <td className="px-6 py-4">{student.present_count}</td>
                      <td className="px-6 py-4">{student.total_classes}</td>
                      <td className="px-6 py-4 text-indigo-600 font-semibold">
                        {student.attendance_percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center">No attendance data found.</p>
          )}

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="px-4 py-2 bg-indigo-500 text-white rounded disabled:opacity-50"
            >
              Prev
            </button>
            <p className="text-gray-700">
              Page {currentPage} of {totalPages}
            </p>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-4 py-2 bg-indigo-500 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
