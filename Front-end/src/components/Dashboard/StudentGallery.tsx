import { useState } from "react";
import { Search, Filter, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock student data
const mockStudents = [
  { id: "1", name: "John Doe", erNumber: "ER001", batch: "2021-2024", imageUrl: "/api/placeholder/150/150", status: "active" },
  { id: "2", name: "Jane Smith", erNumber: "ER002", batch: "2021-2024", imageUrl: "/api/placeholder/150/150", status: "active" },
  { id: "3", name: "Mike Johnson", erNumber: "ER003", batch: "2022-2025", imageUrl: "/api/placeholder/150/150", status: "active" },
  { id: "4", name: "Sarah Williams", erNumber: "ER004", batch: "2021-2024", imageUrl: "/api/placeholder/150/150", status: "inactive" },
  { id: "5", name: "David Brown", erNumber: "ER005", batch: "2022-2025", imageUrl: "/api/placeholder/150/150", status: "active" },
  { id: "6", name: "Lisa Davis", erNumber: "ER006", batch: "2021-2024", imageUrl: "/api/placeholder/150/150", status: "active" },
];

export const StudentGallery = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all");

  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.erNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBatch = selectedBatch === "all" || student.batch === selectedBatch;
    return matchesSearch && matchesBatch;
  });

  const batches = [...new Set(mockStudents.map(student => student.batch))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Student Gallery</h2>
          <p className="text-sm text-muted-foreground">View all registered students and their images</p>
        </div>
        <Button className="gradient-primary">
          <Download className="mr-2 h-4 w-4" />
          Export List
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map(batch => (
              <SelectItem key={batch} value={batch}>{batch}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStudents.map((student) => (
          <Card key={student.id} className="dashboard-card dashboard-card-hover">
            <CardHeader className="pb-3">
              <div className="aspect-square rounded-lg bg-muted overflow-hidden mb-3">
                <img
                  src={student.imageUrl}
                  alt={student.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`;
                  }}
                />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium">{student.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{student.erNumber}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <Badge variant={student.batch === "2021-2024" ? "default" : "secondary"}>
                  {student.batch}
                </Badge>
                <Badge variant={student.status === "active" ? "default" : "secondary"}>
                  {student.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No students found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};