import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";

interface AttendanceRecord {
    date: string;
    subject: string;
    status: string;
    time: string;
}

interface StudentDetailProps {
    erNumber: string;
    studentName: string;
    onBack: () => void;
}

export const StudentAttendanceDetail = ({ erNumber, studentName, onBack }: StudentDetailProps) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE || "http://65.0.42.143:5000";
                const res = await fetch(`${API_BASE}/api/student/${erNumber}`);
                const data = await res.json();

                if (data.success) {
                    setRecords(data.attendance_records);
                } else {
                    setError(data.error || "Failed to fetch records");
                }
            } catch (err) {
                setError("Network error");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [erNumber]);

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md flex justify-center items-center h-64">
                <p className="text-gray-500 animate-pulse">Loading attendance records...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={onBack}
                    className="text-blue-600 hover:underline"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b flex items-center gap-4 bg-gray-50">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    title="Back to List"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{studentName}</h2>
                    <p className="text-sm text-gray-500 font-mono">ER: {erNumber}</p>
                </div>
            </div>

            {/* Content */}
            <div className="p-0">
                {records.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No attendance records found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {records.map((record, index) => {
                                    const isPresent = record.status.toLowerCase() === 'present';
                                    return (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {record.date}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    {record.time}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {record.subject}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {isPresent ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Present
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <XCircle className="w-3 h-3 mr-1" /> Absent
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
