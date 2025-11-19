import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, createSelectColumn } from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { useItems, useCreateItem, useBulkDeleteItems, type ItemWithType } from "@/hooks/use-items";
import { useItemTypes } from "@/hooks/use-custom-types";
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
import { format } from "date-fns";

export default function Items() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<ItemWithType[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemWithType | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type_id: "",
    address: "",
    amount: "",
    start_date: "",
    end_date: "",
  });

  const { data: items = [], isLoading, error } = useItems();
  const { data: itemTypes = [] } = useItemTypes();
  const createItem = useCreateItem();
  const bulkDeleteItems = useBulkDeleteItems();
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type_id: "",
      address: "",
      amount: "",
      start_date: "",
      end_date: "",
    });
  };

  const handleCreateItem = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createItem.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        type_id: formData.type_id || null,
        address: formData.address || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: "active",
      });

      toast({
        title: "Success",
        description: "Item created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create item",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteItems.mutateAsync(selectedRows.map((r) => r.id));
      toast({
        title: "Success",
        description: `Deleted ${selectedRows.length} item(s)`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedRows([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<ItemWithType>[] = [
    createSelectColumn<ItemWithType>(),
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.type;
        if (!type) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="outline" style={{ backgroundColor: type.color + "20", borderColor: type.color }}>
            {type.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => row.getValue("address") || <span className="text-muted-foreground">-</span>,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number | null;
        if (!amount) return <span className="text-muted-foreground">-</span>;
        return <span>£{amount.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: "start_date",
      header: "Start Date",
      cell: ({ row }) => {
        const date = row.getValue("start_date") as string | null;
        if (!date) return <span className="text-muted-foreground">-</span>;
        return format(new Date(date), "dd MMM yyyy");
      },
    },
    {
      accessorKey: "end_date",
      header: "End Date",
      cell: ({ row }) => {
        const date = row.getValue("end_date") as string | null;
        if (!date) return <span className="text-muted-foreground">-</span>;
        return format(new Date(date), "dd MMM yyyy");
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return <Badge variant="secondary">{status || "active"}</Badge>;
      },
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
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
          Error loading items. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Items</h1>
          <p className="text-muted-foreground mt-1">
            Manage your items - properties, listings, jobs, or whatever you track
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
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Item</DialogTitle>
                <DialogDescription>
                  Add a new item to your system
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="create-title">Title *</Label>
                    <Input
                      id="create-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., 123 Main Street, Project Alpha"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="create-type">Type</Label>
                    <Select
                      value={formData.type_id}
                      onValueChange={(value) => setFormData({ ...formData, type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No item types. Add them in Settings.
                          </div>
                        ) : (
                          itemTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="create-description">Description</Label>
                    <Textarea
                      id="create-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="create-address">Address/Location</Label>
                    <Input
                      id="create-address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-amount">Amount (£)</Label>
                    <Input
                      id="create-amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="e.g., 1500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input disabled value="GBP" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-start-date">Start Date</Label>
                    <Input
                      id="create-start-date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-end-date">End Date</Label>
                    <Input
                      id="create-end-date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateItem} disabled={createItem.isPending}>
                  {createItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info banner if no item types */}
      {itemTypes.length === 0 && (
        <div className="bg-muted/50 border border-border p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Go to Settings → Item Types to create custom types like "Property", "Listing", or "Job" to categorize your items.
          </p>
        </div>
      )}

      {/* Data Grid */}
      <DataTable
        columns={columns}
        data={items}
        searchKey="title"
        searchPlaceholder="Search items by title..."
        onRowSelectionChange={setSelectedRows}
        onRowClick={(item) => {
          setSelectedItem(item);
          // TODO: Open detail modal
          toast({
            title: "Item selected",
            description: `Opening details for ${item.title}`,
          });
        }}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Items?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.length} item(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteItems.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
