import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "secondary" | "success" | "warning";
  stats?: string;
}

export const DashboardCard = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  variant = "primary",
  stats 
}: DashboardCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "gradient-primary text-white hover:scale-105";
      case "secondary":
        return "gradient-secondary text-white hover:scale-105";
      case "success":
        return "bg-success text-success-foreground hover:bg-success/90 hover:scale-105";
      case "warning":
        return "bg-warning text-warning-foreground hover:bg-warning/90 hover:scale-105";
      default:
        return "gradient-primary text-white hover:scale-105";
    }
  };

  return (
    <Card className="dashboard-card dashboard-card-hover cursor-pointer group" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground">
          {title}
        </CardTitle>
        <div className={`p-2.5 rounded-full ${getVariantStyles()} transition-all duration-300`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-card-foreground mb-1">
          {stats || "Ready"}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {description}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
        >
          Access
        </Button>
      </CardContent>
    </Card>
  );
};