import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, Send, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, createSelectColumn } from "@/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  useInvoices,
  useCreateInvoice,
  useBulkDeleteInvoices,
  useSendInvoice,
  type InvoiceWithRelations,
} from "@/hooks/use-invoices";
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
import { useContacts } from "@/hooks/use-contacts";
import { useItems } from "@/hooks/use-items";
import { useDeals } from "@/hooks/use-pipeline";
import { format } from "date-fns";

export default function Invoices() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<InvoiceWithRelations[]>([]);
  const [lineItems, setLineItems] = useState([
    { description: "", quantity: 1, unit_price: 0, total: 0, position: 0 }
  ]);

  const [formData, setFormData] = useState({
    invoice_number: "",
    title: "",
    description: "",
    issue_date: new Date().toISOString().split('T')[0],
    due_date: "",
    contact_id: "",
    item_id: "",
    deal_id: "",
    tax_rate: "20",
    discount_amount: "0",
    notes: "",
    terms: "",
  });

  const { data: invoices = [], isLoading, error } = useInvoices();
  const { data: contacts = [] } = useContacts();
  const { data: items = [] } = useItems();
  const { data: deals = [] } = useDeals({ status: 'open' });
  const createInvoice = useCreateInvoice();
  const bulkDeleteInvoices = useBulkDeleteInvoices();
  const sendInvoice = useSendInvoice();
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      invoice_number: "",
      title: "",
      description: "",
      issue_date: new Date().toISOString().split('T')[0],
      due_date: "",
      contact_id: "",
      item_id: "",
      deal_id: "",
      tax_rate: "20",
      discount_amount: "0",
      notes: "",
      terms: "",
    });
    setLineItems([
      { description: "", quantity: 1, unit_price: 0, total: 0, position: 0 }
    ]);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unit_price: 0, total: 0, position: lineItems.length }
    ]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate total for this line
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : updated[index].quantity;
      const price = field === 'unit_price' ? parseFloat(value) || 0 : updated[index].unit_price;
      updated[index].total = qty * price;
    }

    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * parseFloat(formData.tax_rate)) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const discount = parseFloat(formData.discount_amount) || 0;
    return subtotal + tax - discount;
  };

  const handleCreateInvoice = async () => {
    if (!formData.invoice_number.trim() || !formData.title.trim() || !formData.due_date) {
      toast({
        title: "Error",
        description: "Invoice number, title, and due date are required",
        variant: "destructive",
      });
      return;
    }

    if (lineItems.length === 0 || !lineItems[0].description) {
      toast({
        title: "Error",
        description: "At least one line item is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const subtotal = calculateSubtotal();
      const taxAmount = calculateTax();
      const total = calculateTotal();

      await createInvoice.mutateAsync({
        invoice_number: formData.invoice_number,
        title: formData.title,
        description: formData.description || undefined,
        subtotal,
        tax_rate: parseFloat(formData.tax_rate),
        tax_amount: taxAmount,
        discount_amount: parseFloat(formData.discount_amount) || 0,
        total,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        contact_id: formData.contact_id || undefined,
        item_id: formData.item_id || undefined,
        deal_id: formData.deal_id || undefined,
        notes: formData.notes || undefined,
        terms: formData.terms || undefined,
        line_items: lineItems,
      });

      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteInvoices.mutateAsync(selectedRows.map((r) => r.id));
      toast({
        title: "Success",
        description: `Deleted ${selectedRows.length} invoice(s)`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedRows([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoices",
        variant: "destructive",
      });
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await sendInvoice.mutateAsync(invoiceId);
      toast({
        title: "Success",
        description: "Invoice marked as sent",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invoice",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'default';
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const columns: ColumnDef<InvoiceWithRelations>[] = [
    createSelectColumn<InvoiceWithRelations>(),
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("invoice_number")}</div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => row.getValue("title"),
    },
    {
      accessorKey: "contact",
      header: "Client",
      cell: ({ row }) => {
        const contact = row.original.contact;
        if (!contact) return <span className="text-muted-foreground">-</span>;
        return contact.full_name;
      },
    },
    {
      accessorKey: "total",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.getValue("total") as number;
        return <span className="font-semibold">£{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      },
    },
    {
      accessorKey: "issue_date",
      header: "Issue Date",
      cell: ({ row }) => {
        const date = row.getValue("issue_date") as string;
        return format(new Date(date), "dd MMM yyyy");
      },
    },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }) => {
        const date = row.getValue("due_date") as string;
        return format(new Date(date), "dd MMM yyyy");
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={getStatusColor(status)} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <div className="flex gap-2">
            {invoice.status === 'draft' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendInvoice(invoice.id);
                }}
              >
                <Send className="h-3 w-3 mr-1" />
                Send
              </Button>
            )}
          </div>
        );
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
          Error loading invoices. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage invoices and payments
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
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Create a new invoice for your client
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-number">Invoice Number *</Label>
                    <Input
                      id="create-number"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="e.g., INV-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-title">Title *</Label>
                    <Input
                      id="create-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Monthly Services"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="create-description">Description</Label>
                    <Textarea
                      id="create-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-issue-date">Issue Date *</Label>
                    <Input
                      id="create-issue-date"
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-due-date">Due Date *</Label>
                    <Input
                      id="create-due-date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-contact">Client</Label>
                    <Select
                      value={formData.contact_id}
                      onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-item">Related Item</Label>
                    <Select
                      value={formData.item_id}
                      onValueChange={(value) => setFormData({ ...formData, item_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Line Items</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 space-y-3">
                    {lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                            size={1}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Total</Label>
                          <Input
                            value={item.total.toFixed(2)}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        <div className="col-span-1">
                          {lineItems.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeLineItem(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">£{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span>Tax:</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                        className="w-16 h-7"
                      />
                      <span>%</span>
                    </div>
                    <span className="font-medium">£{calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span>Discount:</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                        className="w-24 h-7"
                      />
                    </div>
                    <span className="font-medium">-£{parseFloat(formData.discount_amount || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span>£{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Notes & Terms */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-notes">Notes</Label>
                    <Textarea
                      id="create-notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="create-terms">Payment Terms</Label>
                    <Textarea
                      id="create-terms"
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      rows={3}
                      placeholder="e.g., Payment due within 30 days"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateInvoice} disabled={createInvoice.isPending}>
                  {createInvoice.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Invoiced</p>
          <p className="text-2xl font-bold">
            £{invoices.reduce((sum, inv) => sum + inv.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Paid</p>
          <p className="text-2xl font-bold text-green-600">
            £{invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold text-blue-600">
            £{invoices.filter(i => i.status === 'sent').reduce((sum, inv) => sum + inv.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Overdue</p>
          <p className="text-2xl font-bold text-red-600">
            £{invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Data Grid */}
      <DataTable
        columns={columns}
        data={invoices}
        searchKey="title"
        searchPlaceholder="Search invoices..."
        onRowSelectionChange={setSelectedRows}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoices?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.length} invoice(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteInvoices.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
