import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InviteManagement } from "@/components/InviteManagement";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusiness } from "@/hooks/use-business";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useContactTypes,
  useItemTypes,
  useCreateCustomType,
  useDeleteCustomType,
} from "@/hooks/use-custom-types";

export default function Settings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === "owner" || profile?.role === "admin";

  const { data: business, isLoading: isLoadingBusiness } = useBusiness();
  const { data: contactTypes = [], isLoading: isLoadingContactTypes } = useContactTypes();
  const { data: itemTypes = [], isLoading: isLoadingItemTypes } = useItemTypes();
  const createCustomType = useCreateCustomType();
  const deleteCustomType = useDeleteCustomType();

  const [newContactType, setNewContactType] = useState("");
  const [newItemType, setNewItemType] = useState("");

  const handleAddContactType = async () => {
    if (!newContactType.trim()) return;

    try {
      await createCustomType.mutateAsync({
        category: "contact",
        label: newContactType.trim(),
      });
      setNewContactType("");
      toast({ title: "Success", description: "Contact type added" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contact type",
        variant: "destructive",
      });
    }
  };

  const handleAddItemType = async () => {
    if (!newItemType.trim()) return;

    try {
      await createCustomType.mutateAsync({
        category: "item",
        label: newItemType.trim(),
      });
      setNewItemType("");
      toast({ title: "Success", description: "Item type added" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item type",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContactType = async (id: string) => {
    try {
      await deleteCustomType.mutateAsync(id);
      toast({ title: "Success", description: "Contact type removed" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove contact type",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItemType = async (id: string) => {
    try {
      await deleteCustomType.mutateAsync(id);
      toast({ title: "Success", description: "Item type removed" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item type",
        variant: "destructive",
      });
    }
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
          <TabsTrigger value="contact-types">Contact Types</TabsTrigger>
          <TabsTrigger value="item-types">Item Types</TabsTrigger>
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

        {/* Contact Types Tab */}
        <TabsContent value="contact-types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Contact Types</CardTitle>
              <CardDescription>
                Create custom contact types like "Tenant", "Landlord", "Contractor", etc. These will appear as options when creating or editing contacts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter new contact type (e.g., Tenant, Landlord)"
                  value={newContactType}
                  onChange={(e) => setNewContactType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newContactType.trim()) {
                      handleAddContactType();
                    }
                  }}
                />
                <Button
                  onClick={handleAddContactType}
                  disabled={!newContactType.trim() || createCustomType.isPending}
                >
                  {createCustomType.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Plus className="h-4 w-4 mr-2" />
                  Add Type
                </Button>
              </div>

              {isLoadingContactTypes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No contact types yet. Add one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      contactTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.label}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: type.color }}
                              />
                              <span className="text-xs text-muted-foreground">{type.color}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContactType(type.id)}
                              disabled={deleteCustomType.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> These contact types will be available when creating or editing contacts. You can link multiple contacts to an item (e.g., link both a Tenant and Landlord to a Property).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Types Tab */}
        <TabsContent value="item-types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Item Types</CardTitle>
              <CardDescription>
                Create custom item types like "Property", "Listing", "Job", "Site", etc. Items are the main entities you track in your business.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter new item type (e.g., Property, Listing, Job)"
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItemType.trim()) {
                      handleAddItemType();
                    }
                  }}
                />
                <Button
                  onClick={handleAddItemType}
                  disabled={!newItemType.trim() || createCustomType.isPending}
                >
                  {createCustomType.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Plus className="h-4 w-4 mr-2" />
                  Add Type
                </Button>
              </div>

              {isLoadingItemTypes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No item types yet. Add one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">{type.label}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: type.color }}
                              />
                              <span className="text-xs text-muted-foreground">{type.color}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItemType(type.id)}
                              disabled={deleteCustomType.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Items can have contacts linked to them, notes, date ranges, and tasks. For example, a "Property" item could have a Tenant and Landlord linked, maintenance notes, a lease period, and associated repair tasks.
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
