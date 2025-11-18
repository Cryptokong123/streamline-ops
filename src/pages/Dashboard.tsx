import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Users, Building2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  // Mock data - will be replaced with real data
  const stats = [
    { icon: CheckSquare, label: "Active Tasks", value: "12", color: "text-primary" },
    { icon: Users, label: "Contacts", value: "48", color: "text-accent" },
    { icon: Building2, label: "Properties", value: "23", color: "text-success" },
    { icon: AlertCircle, label: "Overdue", value: "3", color: "text-destructive" },
  ];

  const upcomingTasks = [
    { id: 1, title: "Gas Safety Check - 12 Oak Street", dueDate: "2025-11-20", priority: "high" },
    { id: 2, title: "Tenancy renewal - Apartment 4B", dueDate: "2025-11-22", priority: "medium" },
    { id: 3, title: "Property inspection - Riverside Complex", dueDate: "2025-11-25", priority: "low" },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={cn("p-3 rounded-lg bg-secondary", stat.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    task.priority === "high"
                      ? "destructive"
                      : task.priority === "medium"
                      ? "default"
                      : "secondary"
                  }
                >
                  {task.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
