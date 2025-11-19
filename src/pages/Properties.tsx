import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, createSelectColumn } from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { useProperties, useCreateProperty, useUpdateProperty, useBulkDeleteProperties } from "@/hooks/use-properties";
import { useContacts } from "@/hooks/use-contacts";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from "@/integrations/supabase/types";

type Property = Database["public"]["Tables"]["properties"]["Row"] & {
  landlord: { id: string; name: string | null } | null;
};
type PropertyStatus = Database["public"]["Enums"]["property_status"];

export default function Properties() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Property[]>([]);

  const [formData, setFormData] = useState({
    address: "",
    bedrooms: 0,
    rent_amount: 0,
    status: "available" as PropertyStatus,
    landlord_id: "",
    notes: "",
  });

  const { data: properties = [], isLoading, error } = useProperties();
  const { data: contacts = [] } = useContacts();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const bulkDeleteProperties = useBulkDeleteProperties();
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      address: "",
      bedrooms: 0,
      rent_amount: 0,
      status: "available",
      landlord_id: "",
      notes: "",
    });
  };

  const handleCreateProperty = async () => {
    if (!formData.address.trim()) {
      toast({
        title: "Error",
        description: "Property address is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createProperty.mutateAsync({
        ...formData,
        landlord_id: formData.landlord_id || null,
      });
      toast({
        title: "Success",
        description: "Property created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create property",
        variant: "destructive",
      });
    }
  };

  const handleEditProperty = async () => {
    if (!selectedProperty) return;

    if (!formData.address.trim()) {
      toast({
        title: "Error",
        description: "Property address is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProperty.mutateAsync({
        id: selectedProperty.id,
        updates: {
          ...formData,
          landlord_id: formData.landlord_id || null,
        },
      });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedProperty(null);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;

    try {
      const ids = selectedRows.map((row) => row.id);
      await bulkDeleteProperties.mutateAsync(ids);
      toast({
        title: "Success",
        description: `Deleted ${selectedRows.length} property/properties`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedRows([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete properties",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      address: property.address || "",
      bedrooms: property.bedrooms || 0,
      rent_amount: property.rent_amount || 0,
      status: property.status || "available",
      landlord_id: property.landlord_id || "",
      notes: property.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-success/10 text-success border-success/20";
      case "available":
        return "bg-primary/10 text-primary border-primary/20";
      case "maintenance":
        return "bg-warning/10 text-warning border-warning/20";
      case "offline":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const columns: ColumnDef<Property>[] = [
    createSelectColumn<Property>(),
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div className="font-medium max-w-md">{row.getValue("address")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant="outline" className={getStatusColor(status)}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "bedrooms",
      header: "Bedrooms",
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("bedrooms") || 0} bed</div>
      ),
    },
    {
      accessorKey: "rent_amount",
      header: "Rent",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.getValue("rent_amount") ? `£${row.getValue("rent_amount")}/mo` : "-"}
        </div>
      ),
    },
    {
      accessorKey: "landlord",
      header: "Landlord",
      cell: ({ row }) => {
        const landlord = row.original.landlord;
        return (
          <div className="text-sm text-muted-foreground">
            {landlord?.name || "-"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openEditDialog(row.original);
          }}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="border border-destructive rounded-lg p-6">
          <p className="text-destructive">Failed to load properties. Please try again.</p>
        </div>
      </div>
    );
  }

  const PropertyForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          placeholder="Property address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            type="number"
            min="0"
            value={formData.bedrooms}
            onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rent_amount">Rent Amount (£/month)</Label>
          <Input
            id="rent_amount"
            type="number"
            min="0"
            value={formData.rent_amount}
            onChange={(e) => setFormData({ ...formData, rent_amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: PropertyStatus) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="landlord_id">Landlord</Label>
          <Select
            value={formData.landlord_id}
            onValueChange={(value) => setFormData({ ...formData, landlord_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select landlord" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground mt-1">
            Manage your property portfolio
          </p>
        </div>
        <div className="flex gap-2">
          {selectedRows.length > 0 && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedRows.length})
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Property</DialogTitle>
                <DialogDescription>
                  Add a new property to your portfolio
                </DialogDescription>
              </DialogHeader>
              <PropertyForm />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateProperty} disabled={createProperty.isPending}>
                  {createProperty.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Property
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={properties}
        searchKey="address"
        searchPlaceholder="Search properties by address..."
        onRowSelectionChange={setSelectedRows}
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update property information
            </DialogDescription>
          </DialogHeader>
          <PropertyForm />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedProperty(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditProperty} disabled={updateProperty.isPending}>
              {updateProperty.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedRows.length} property/properties. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteProperties.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
