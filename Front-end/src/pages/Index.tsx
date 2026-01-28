import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Users, BarChart3, FileSpreadsheet, Camera, CheckCircle, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const features = [
    {
      icon: Camera,
      title: "Face Recognition",
      description: "AWS Rekognition powered attendance tracking"
    },
    {
      icon: Users,
      title: "Student Management", 
      description: "Complete student registration and gallery"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Detailed attendance analytics and insights"
    },
    {
      icon: FileSpreadsheet,
      title: "Excel Reports",
      description: "Generate and download attendance reports"
    },
    {
      icon: Shield,
      title: "AWS Integration",
      description: "Secure cloud storage with S3 and DynamoDB"
    },
    {
      icon: CheckCircle,
      title: "Real-time Tracking",
      description: "Instant attendance marking and verification"
    }
  ];

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">ICT Smart Attendance System</h1>
          </div>
          <Link to="/login">
            <Button className="gradient-primary">
              Access Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>


      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 gradient-primary rounded flex items-center justify-center">
              <Camera className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">Attendance Management</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Smart Attendance Management • Bhargav Bhalodiya - Sem 7 
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
