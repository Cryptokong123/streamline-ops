import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, Loader2, Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, createSelectColumn } from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, useBulkDeleteContacts } from "@/hooks/use-contacts";
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
import { ContactDetailModal } from "@/components/ContactDetailModal";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type ContactType = Database["public"]["Enums"]["contact_type"];

export default function Contacts() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Contact[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for new/edit contact
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "client" as ContactType,
    address: "",
    notes: "",
  });

  const { data: contacts = [], isLoading, error } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const bulkDeleteContacts = useBulkDeleteContacts();
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      type: "client",
      address: "",
      notes: "",
    });
  };

  const handleCreateContact = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Contact name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createContact.mutateAsync(formData);
      toast({
        title: "Success",
        description: "Contact created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create contact",
        variant: "destructive",
      });
    }
  };

  const handleEditContact = async () => {
    if (!selectedContact) return;

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Contact name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateContact.mutateAsync({
        id: selectedContact.id,
        updates: formData,
      });
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedContact(null);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) return;

    try {
      const ids = selectedRows.map((row) => row.id);
      await bulkDeleteContacts.mutateAsync(ids);
      toast({
        title: "Success",
        description: `Deleted ${selectedRows.length} contact(s)`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedRows([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete contacts",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      type: contact.type || "client",
      address: contact.address || "",
      notes: contact.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleExportCSV = () => {
    if (contacts.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no contacts to export",
        variant: "destructive",
      });
      return;
    }

    // CSV headers
    const headers = ["Name", "Email", "Phone", "Type", "Address", "Notes"];

    // Convert contacts to CSV rows
    const rows = contacts.map(contact => [
      contact.name || "",
      contact.email || "",
      contact.phone || "",
      contact.type || "",
      contact.address || "",
      contact.notes || ""
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: `Exported ${contacts.length} contacts to CSV`,
    });
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());

        if (lines.length < 2) {
          toast({
            title: "Error",
            description: "CSV file is empty or invalid",
            variant: "destructive",
          });
          return;
        }

        // Skip header row
        const dataLines = lines.slice(1);
        const importedContacts: Array<Omit<typeof formData, "business_id" | "created_by">> = [];

        for (const line of dataLines) {
          // Parse CSV line (handle quoted fields)
          const fields: string[] = [];
          let currentField = "";
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"' && nextChar === '"') {
              currentField += '"';
              i++; // Skip next quote
            } else if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              fields.push(currentField);
              currentField = "";
            } else {
              currentField += char;
            }
          }
          fields.push(currentField); // Add last field

          if (fields.length >= 1 && fields[0].trim()) {
            importedContacts.push({
              name: fields[0]?.trim() || "",
              email: fields[1]?.trim() || "",
              phone: fields[2]?.trim() || "",
              type: (fields[3]?.trim() as ContactType) || "client",
              address: fields[4]?.trim() || "",
              notes: fields[5]?.trim() || "",
            });
          }
        }

        if (importedContacts.length === 0) {
          toast({
            title: "Error",
            description: "No valid contacts found in CSV",
            variant: "destructive",
          });
          return;
        }

        // Import contacts one by one
        let successCount = 0;
        let errorCount = 0;

        for (const contact of importedContacts) {
          try {
            await createContact.mutateAsync(contact);
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }

        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} contacts${errorCount > 0 ? `. Failed: ${errorCount}` : ""}`,
        });

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "client":
        return "bg-primary/10 text-primary border-primary/20";
      case "vendor":
        return "bg-accent/10 text-accent border-accent/20";
      case "partner":
        return "bg-success/10 text-success border-success/20";
      case "other":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const columns: ColumnDef<Contact>[] = [
    createSelectColumn<Contact>(),
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant="outline" className={getTypeColor(type)}>
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.getValue("email") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.getValue("phone") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-xs truncate">
          {row.getValue("address") || "-"}
        </div>
      ),
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
          <p className="text-destructive">Failed to load contacts. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your clients, vendors, and partners
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
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportCSV}
            disabled={contacts.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Contact</DialogTitle>
                <DialogDescription>
                  Add a new contact to your CRM
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Contact name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="Phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: ContactType) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
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
                <Button onClick={handleCreateContact} disabled={createContact.isPending}>
                  {createContact.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Contact
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Data Grid */}
      <DataTable
        columns={columns}
        data={contacts}
        searchKey="name"
        searchPlaceholder="Search contacts by name..."
        onRowSelectionChange={setSelectedRows}
        onRowClick={(contact) => {
          setSelectedContact(contact);
          setIsDetailModalOpen(true);
        }}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Contact name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: ContactType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedContact(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditContact} disabled={updateContact.isPending}>
              {updateContact.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedRows.length} contact(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteContacts.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contact Detail Modal */}
      <ContactDetailModal
        contact={selectedContact}
        open={isDetailModalOpen}
        onOpenChange={(open) => {
          setIsDetailModalOpen(open);
          if (!open) setSelectedContact(null);
        }}
      />
    </div>
  );
}
