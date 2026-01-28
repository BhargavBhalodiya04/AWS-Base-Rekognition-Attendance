import { useEffect, useState } from "react";
import { Download, Eye, FileSpreadsheet, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Report {
  id: string;
  fileName: string;
  userFriendlyName: string;
  size: string;
  records: number;
  status: string;
  batch: string;
  subject: string;
  section?: string;
  date: string;
  url: string;
  students: string[];
}

function parseFromFileName(fileName: string) {
  if (!fileName) return {} as { className?: string; subject?: string; section?: string; date?: string };

  const base = fileName.replace(/\.xlsx$/i, "");

  // Pattern 1: YYYYMMDD_HHMMSS_Batch_Section_Subject
  let m = base.match(/^(\d{8})_(\d{6})_([^_]+)_([^_]+)_([^_]+)$/);
  if (m) {
    const [, yyyymmdd, hhmmss, batch, section, subject] = m;
    const date = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6)}`;
    return { className: batch, subject, section, date };
  }

  // Pattern 2: YYYYMMDD_Class_Section_Subject
  m = base.match(/^(\d{8})_([^_]+)_([^_]+)_([^_]+)$/);
  if (m) {
    const [, yyyymmdd, className, section, subject] = m;
    const date = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6)}`;
    return { className, subject, section, date };
  }

  // Pattern 3: Class_Subject_Section_DD-MM-YYYY
  m = base.match(/^([^_]+)_([^_]+)_([^_]+)_(\d{2}-\d{2}-\d{4})$/);
  if (m) {
    const [, className, subject, section, ddmmyyyy] = m;
    const [dd, mm, yyyy] = ddmmyyyy.split("-");
    const date = `${yyyy}-${mm}-${dd}`;
    return { className, subject, section, date };
  }

  return {} as { className?: string; subject?: string; section?: string; date?: string };
}


export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalReports, setTotalReports] = useState(0);
  const [totalSize, setTotalSize] = useState("0 KB");
  const [totalRecords, setTotalRecords] = useState(0);
  const [latest, setLatest] = useState("-");

  // Filters
  const [selectedBatch, setSelectedBatch] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");

  // Preview Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://65.0.42.143:5000/api/reports")
      .then((res) => res.json())
      .then((data: Report[]) => {
        const normalized = data.map((r) => {
          const meta = parseFromFileName(r.userFriendlyName || r.fileName || "");
          return {
            ...r,
            batch: meta.className || r.batch || "-",
            subject: meta.subject || r.subject || "-",
            section: meta.section || r.section || "-",
            date: meta.date || r.date || "-",
          } as Report;
        });

        setReports(normalized);
        setTotalReports(normalized.length);

        const sizeInKB = normalized.reduce((acc, r) => {
          const val = parseFloat(String(r.size).replace(/KB/i, "").trim());
          return acc + (isNaN(val) ? 0 : val);
        }, 0);
        setTotalSize(sizeInKB.toFixed(1) + " KB");

        const recordsCount = normalized.reduce(
          (acc, r) => acc + (Number(r.records) || 0),
          0
        );
        setTotalRecords(recordsCount);

        if (normalized.length > 0) {
          const latestDate = new Date(
            Math.max(...normalized.map((r) => new Date(r.date || 0).getTime()))
          );
          setLatest(latestDate.toLocaleString());
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            {/* <button
              onClick={() => window.history.back()}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors mb-2 text-left"
            >
              ← Back
            </button> */}
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6" /> Reports & Downloads
            </h1>
          </div>
        </div>
        <p className="text-gray-500 mb-6">
          Download attendance reports and Excel files
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalReports}</p>
              <p className="text-sm text-gray-500">Available files</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Size</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalSize}</p>
              <p className="text-sm text-gray-500">Combined file size</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalRecords}</p>
              <p className="text-sm text-gray-500">Total attendance records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{latest}</p>
              <p className="text-sm text-gray-500">Last generated</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Available Reports</CardTitle>
              <p className="text-gray-500 text-sm">
                Download or preview attendance reports
              </p>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mt-3 md:mt-0">
              {/* Batch Filter */}
              <div>
                <label className="mr-2 text-sm font-medium">Batch:</label>
                <select
                  className="border px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                >
                  <option value="All">All</option>
                  {[...new Set(reports.map((r) => r.batch))].map((batch) => (
                    <option key={batch} value={batch}>
                      {batch}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className="mr-2 text-sm font-medium">Subject:</label>
                <select
                  className="border px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="All">All</option>
                  {[...new Set(reports.map((r) => r.subject))].map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : reports.length === 0 ? (
              <p className="text-gray-400">
                No reports found matching your criteria.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {reports
                    .filter(
                      (r) =>
                        (selectedBatch === "All" || r.batch === selectedBatch) &&
                        (selectedSubject === "All" ||
                          r.subject === selectedSubject)
                    )
                    .map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="text-lg">
                          {report.batch || "-"}
                        </TableCell>
                        <TableCell className="text-lg">
                          {report.subject || "-"}
                        </TableCell>
                        <TableCell className="text-lg">
                          {report.section || "-"}
                        </TableCell>
                        <TableCell className="text-lg">
                          {report.date
                            ? new Date(report.date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPreviewUrl(
                                `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                                  report.url
                                )}`
                              )
                            }
                          >
                            <Eye className="w-4 h-4 mr-1" /> Preview
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={report.url} download>
                              <Download className="w-4 h-4 mr-1" /> Download
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white w-11/12 md:w-4/5 lg:w-3/4 h-5/6 rounded-xl shadow-2xl relative flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-800">
                  Report Preview
                </h2>
                <button
                  className="text-gray-700 hover:text-red-600 transition"
                  onClick={() => setPreviewUrl(null)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Iframe */}
              <iframe
                src={previewUrl}
                className="flex-1 w-full"
                frameBorder="0"
              ></iframe>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
