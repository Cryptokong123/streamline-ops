import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InviteManagement } from "@/components/InviteManagement";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusiness, useUpdateModuleLabels } from "@/hooks/use-business";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home, Users, Building2, CheckSquare, Calendar, FileText } from "lucide-react";

export default function Settings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === "owner" || profile?.role === "admin";

  const { data: business, isLoading: isLoadingBusiness } = useBusiness();
  const updateModuleLabels = useUpdateModuleLabels();

  // Module labels state
  const [moduleLabels, setModuleLabels] = useState({
    dashboard: "Dashboard",
    contacts: "Contacts",
    properties: "Properties",
    tasks: "Tasks",
    calendar: "Calendar",
    documents: "Documents",
  });

  // Load module labels from business data
  useEffect(() => {
    if (business?.module_labels) {
      setModuleLabels({
        ...moduleLabels,
        ...(business.module_labels as Record<string, string>),
      });
    }
  }, [business]);

  const handleSaveModuleLabels = async () => {
    try {
      await updateModuleLabels.mutateAsync(moduleLabels);
      toast({
        title: "Success",
        description: "Module labels updated successfully. Refresh to see changes.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update module labels",
        variant: "destructive",
      });
    }
  };

  const handleResetModuleLabels = () => {
    setModuleLabels({
      dashboard: "Dashboard",
      contacts: "Contacts",
      properties: "Properties",
      tasks: "Tasks",
      calendar: "Calendar",
      documents: "Documents",
    });
  };

  if (isLoadingBusiness) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your business settings and preferences
        </p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
        </TabsList>

        {/* Business Settings Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Update your business details and industry type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input id="businessName" placeholder="Enter business name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry Type</Label>
                <Select defaultValue="letting_agency">
                  <SelectTrigger id="industry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="letting_agency">Letting Agency</SelectItem>
                    <SelectItem value="cleaning">Cleaning Services</SelectItem>
                    <SelectItem value="contracting">Contracting</SelectItem>
                    <SelectItem value="property_management">Property Management</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>
                Enable or disable features based on your business needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Property Management</Label>
                  <p className="text-sm text-muted-foreground">
                    Track properties and associate them with contacts
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Automations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automated workflows and reminders
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Document AI Extraction</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically extract dates and data from uploaded documents
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Customization Tab */}
        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customize Module Labels</CardTitle>
              <CardDescription>
                Rename modules to match your business terminology. For example, change "Properties" to "Listings", "Clients", "Jobs", etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="label-dashboard">Dashboard</Label>
                  </div>
                  <Input
                    id="label-dashboard"
                    placeholder="Dashboard"
                    value={moduleLabels.dashboard}
                    onChange={(e) =>
                      setModuleLabels({ ...moduleLabels, dashboard: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="label-contacts">Contacts Module</Label>
                  </div>
                  <Input
                    id="label-contacts"
                    placeholder="e.g., Clients, Customers, Contacts"
                    value={moduleLabels.contacts}
                    onChange={(e) =>
                      setModuleLabels({ ...moduleLabels, contacts: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: Clients, Customers, Tenants, Contacts
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="label-properties">Properties Module</Label>
                  </div>
                  <Input
                    id="label-properties"
                    placeholder="e.g., Properties, Listings, Jobs, Sites"
                    value={moduleLabels.properties}
                    onChange={(e) =>
                      setModuleLabels({ ...moduleLabels, properties: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: Properties, Listings, Jobs, Sites, Units
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="label-tasks">Tasks Module</Label>
                  </div>
                  <Input
                    id="label-tasks"
                    placeholder="e.g., Tasks, To-Do, Tickets, Work Orders"
                    value={moduleLabels.tasks}
                    onChange={(e) =>
                      setModuleLabels({ ...moduleLabels, tasks: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: Tasks, To-Do, Tickets, Work Orders
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="label-calendar">Calendar Module</Label>
                  </div>
                  <Input
                    id="label-calendar"
                    placeholder="e.g., Calendar, Schedule, Appointments"
                    value={moduleLabels.calendar}
                    onChange={(e) =>
                      setModuleLabels({ ...moduleLabels, calendar: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: Calendar, Schedule, Appointments, Diary
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="label-documents">Documents Module</Label>
                  </div>
                  <Input
                    id="label-documents"
                    placeholder="e.g., Documents, Files, Media"
                    value={moduleLabels.documents}
                    onChange={(e) =>
                      setModuleLabels({ ...moduleLabels, documents: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: Documents, Files, Media, Resources
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button onClick={handleSaveModuleLabels} disabled={updateModuleLabels.isPending}>
                  {updateModuleLabels.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleResetModuleLabels}>
                  Reset to Defaults
                </Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> After saving, you'll need to refresh the page to see the updated module names in the sidebar.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="Enter your name" defaultValue={profile?.full_name || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="07700 900123" defaultValue={profile?.phone || ""} />
              </div>
              <Button>Update Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="team" className="space-y-6">
            <InviteManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
