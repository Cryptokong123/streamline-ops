import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { useBusiness } from "@/hooks/use-business";
import {
  LayoutDashboard,
  Users,
  Building2,
  CheckSquare,
  CalendarDays,
  FileText,
  Settings,
  LogOut
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: typeof LayoutDashboard;
  labelKey: string;
  defaultLabel: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "dashboard", defaultLabel: "Dashboard", href: "/" },
  { icon: Users, labelKey: "contacts", defaultLabel: "Contacts", href: "/contacts" },
  { icon: Building2, labelKey: "properties", defaultLabel: "Properties", href: "/properties" },
  { icon: CheckSquare, labelKey: "tasks", defaultLabel: "Tasks", href: "/tasks" },
  { icon: CalendarDays, labelKey: "calendar", defaultLabel: "Calendar", href: "/calendar" },
  { icon: FileText, labelKey: "documents", defaultLabel: "Documents", href: "/documents" },
  { icon: Settings, labelKey: "settings", defaultLabel: "Settings", href: "/settings" },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { data: business } = useBusiness();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">
            Forget the Sheets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Business operations
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            // Get custom label from business settings or use default
            const moduleLabels = business?.module_labels as Record<string, string> | null;
            const label = moduleLabels?.[item.labelKey] || item.defaultLabel;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          {profile && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-sidebar-foreground">
                {profile.full_name || "User"}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {profile.role}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-border bg-background flex items-center justify-end px-6 gap-4">
          <NotificationBell />
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
