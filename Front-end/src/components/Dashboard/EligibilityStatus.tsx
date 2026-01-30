import { useState, useEffect } from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { StudentAttendanceDetail } from "./StudentAttendanceDetail";

const API_BASE = import.meta.env.VITE_API_BASE || "http://65.0.42.143:5000";

export const EligibilityStatus = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [stats, setStats] = useState({
        eligible: 0,
        ineligible: 0,
        total: 0
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'eligible' | 'ineligible'>('all');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

    // Constants for eligibility
    const ELIGIBILITY_THRESHOLD = 75;

    useEffect(() => {
        // Mock data for now, or fetch from API if available
        // In a real scenario, this would likely call an endpoint like /api/eligibility
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE}/api/eligibility`);
                const data = await res.json();

                if (data.success && Array.isArray(data.students)) {
                    setStudents(data.students);

                    const eligibleCount = data.students.filter((s: any) => s.attendance_percentage >= ELIGIBILITY_THRESHOLD).length;
                    setStats({
                        eligible: eligibleCount,
                        ineligible: data.students.length - eligibleCount,
                        total: data.students.length
                    });
                }
            } catch (err) {
                console.error("Eligibility fetch failed:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const pieData = [
        { name: "Eligible", value: stats.eligible, color: "#10b981" }, // Green
        { name: "Ineligible", value: stats.ineligible, color: "#ef4444" }  // Red
    ];

    const filteredStudents = students.filter(student => {
        const isEligible = student.attendance_percentage >= ELIGIBILITY_THRESHOLD;
        if (filter === 'eligible') return isEligible;
        if (filter === 'ineligible') return !isEligible;
        return true;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
                <p className="text-lg text-gray-600 animate-pulse">
                    Checking eligibility criteria...
                </p>
            </div>
        );
    }

    if (selectedStudent) {
        return (
            <StudentAttendanceDetail
                erNumber={selectedStudent.er_number}
                studentName={selectedStudent.name}
                onBack={() => setSelectedStudent(null)}
            />
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen py-10 px-4">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="bg-white p-6 rounded-lg shadow flex flex-col md:flex-row justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Eligibility Status</h2>
                        <p className="text-gray-500">Based on {ELIGIBILITY_THRESHOLD}% attendance threshold</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-4">
                        <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                            <span className="block text-2xl font-bold text-green-700">{stats.eligible}</span>
                            <span className="text-xs text-green-600 font-medium">Eligible</span>
                        </div>
                        <div className="text-center px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                            <span className="block text-2xl font-bold text-red-700">{stats.ineligible}</span>
                            <span className="text-xs text-red-600 font-medium">Ineligible</span>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Chart Section */}
                    <div className="md:col-span-1 bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-4 text-center">Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 text-sm text-gray-600 text-center">
                            Total Students: {stats.total}
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="md:col-span-2 bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700">Student List</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('eligible')}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === 'eligible' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
                                >
                                    Eligible
                                </button>
                                <button
                                    onClick={() => setFilter('ineligible')}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === 'ineligible' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
                                >
                                    Ineligible
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-sm font-semibold text-gray-600">ER Number</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Name</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Attendance</th>
                                        <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredStudents.map((student, index) => {
                                        const isEligible = student.attendance_percentage >= ELIGIBILITY_THRESHOLD;
                                        return (
                                            <tr
                                                key={index}
                                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                onClick={() => setSelectedStudent(student)}
                                            >
                                                <td className="p-4 text-sm text-gray-700 font-mono">{student.er_number}</td>
                                                <td className="p-4 text-sm text-gray-800 font-medium">{student.name}</td>
                                                <td className="p-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full ${isEligible ? 'bg-green-500' : 'bg-red-500'}`}
                                                                style={{ width: `${Math.min(student.attendance_percentage, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="font-semibold">{student.attendance_percentage}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {isEligible ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            <CheckCircle size={14} /> Eligible
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            <XCircle size={14} /> Ineligible
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-500">
                                                No students found for this filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
