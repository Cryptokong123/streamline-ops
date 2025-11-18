import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  CheckCircle, 
  Users, 
  Building2, 
  FileText, 
  Zap,
  Shield,
  TrendingUp
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Users,
      title: "Contact Management",
      description: "Keep all your tenants, landlords, and contractors organized in one place",
    },
    {
      icon: Building2,
      title: "Property Portfolio",
      description: "Track properties, maintenance schedules, and key dates effortlessly",
    },
    {
      icon: CheckCircle,
      title: "Task Management",
      description: "Never miss a deadline with smart task tracking and reminders",
    },
    {
      icon: FileText,
      title: "Document Storage",
      description: "Store certificates, agreements, and important files securely",
    },
    {
      icon: Zap,
      title: "Automation",
      description: "Set up workflows that run automatically to save you hours each week",
    },
    {
      icon: Shield,
      title: "Multi-tenant Security",
      description: "Enterprise-grade security with role-based access control",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Forget the Sheets</span>
          </div>
          <Link to="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
            Replace Your Spreadsheets with
            <span className="text-primary"> Smart Operations</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The modern platform for UK letting agencies, cleaners, contractors, and service businesses. 
            Manage contacts, properties, tasks, and documents in one beautiful workspace.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gap-2">
                Get Started Free
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-lg text-muted-foreground">
              Purpose-built for small UK businesses that are tired of spreadsheets
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto bg-primary text-primary-foreground">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Forget the Sheets?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Join forward-thinking businesses that have already made the switch. 
              Set up your workspace in minutes.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="gap-2">
                Start Your Free Trial
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Forget the Sheets. Built for UK businesses.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
