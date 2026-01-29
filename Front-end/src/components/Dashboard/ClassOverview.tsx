import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, BookOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export const ClassOverview = () => {
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [subjectsData, setSubjectsData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [overallStats, setOverallStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch("http://65.0.42.143:5000/api/overview");
        const data = await res.json();

        if (!data.error) {
          setSubjectsData(data.subjects || []);
          setTrendData(data.trend || []);
          setOverallStats({
            avgAttendance: data.avgAttendance || 0,
            totalStudents: data.totalStudents || 0,
            activeSubjects: data.activeSubjects || 0,
            bestSubject: data.bestSubject || "N/A",
            bestBatch: data.bestBatch || "N/A",
          });
        } else {
          console.error("Error fetching overview:", data.error);
        }
      } catch (err) {
        console.error("Error fetching overview:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) {
    return (
      <p className="text-center text-muted-foreground">
        Loading attendance overview...
      </p>
    );
  }

  const batches = [...new Set(subjectsData.map((item) => item.batch))];
  const subjects = [
    ...new Set(subjectsData.map((item) => `${item.subject} (${item.batch})`)),
  ];

  const filteredSubjects = subjectsData
    .filter((item) => selectedBatch === "all" || item.batch === selectedBatch)
    .map((item) => ({
      ...item,
      subjectWithBatch: `${item.subject} (${item.batch})`,
    }))
    .filter(
      (item) =>
        selectedSubject === "all" || item.subjectWithBatch === selectedSubject
    );

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Class Overview</h2>
          <p className="text-sm text-muted-foreground">
            Subject-wise attendance analysis and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((batch) => (
                <SelectItem key={batch} value={batch}>
                  {batch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dashboard-card">
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Average Attendance
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {overallStats.avgAttendance}%
            </div>
            <div className="flex items-center text-xs text-success">
              <TrendingUp className="mr-1 h-3 w-3" />
              Dynamic calculation
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats.totalStudents}
            </div>
            <p className="text-xs text-muted-foreground">Across all subjects</p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subjects
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats.activeSubjects}
            </div>
            <p className="text-xs text-muted-foreground">Currently tracked</p>
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="flex justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Best Performing
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {overallStats.bestSubject} ({overallStats.bestBatch})
            </div>
            <p className="text-xs text-muted-foreground">Highest attendance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-wise Performance */}
        {/* Subject-wise Performance */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Subject-wise Performance</CardTitle>
            <CardDescription>
              Average attendance percentage by subject
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSubjects.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center">
                No data available for the selected filters
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredSubjects}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="subjectWithBatch"
                    tick={{ fontSize: 12 }}
                    angle={-25}
                    interval={0}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value}%`} />
                  <Bar
                    dataKey="attendance"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Overall Attendance Trend */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Overall Attendance Trend</CardTitle>
            <CardDescription>
              Monthly attendance counts across all subjects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center">
                No trend data available
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} students`,
                      props.payload.subject_batch,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="attendance"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
