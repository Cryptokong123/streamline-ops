import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Invoice {
  id: string;
  business_id: string;
  created_by: string;
  invoice_number: string;
  title: string;
  description: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  contact_id: string | null;
  item_id: string | null;
  deal_id: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  is_recurring: boolean;
  recurrence_interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  next_invoice_date: string | null;
  notes: string | null;
  terms: string | null;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  time_entry_ids: string[] | null;
  position: number;
  created_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface InvoiceWithRelations extends Invoice {
  contact: { id: string; full_name: string | null; email: string | null } | null;
  item: { id: string; title: string } | null;
  deal: { id: string; title: string } | null;
  creator: { id: string; full_name: string | null } | null;
  line_items: InvoiceLineItem[];
  payments: Payment[];
}

// Hook to fetch all invoices
export function useInvoices(filters?: {
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  contact_id?: string;
  item_id?: string;
  deal_id?: string;
}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["invoices", profile?.business_id, filters],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      let query = supabase
        .from("invoices")
        .select(`
          *,
          contact:contacts(id, full_name, email),
          item:items(id, title),
          deal:deals(id, title),
          creator:profiles!invoices_created_by_fkey(id, full_name),
          line_items:invoice_line_items(*),
          payments:payments(*)
        `)
        .eq("business_id", profile.business_id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.contact_id) {
        query = query.eq("contact_id", filters.contact_id);
      }
      if (filters?.item_id) {
        query = query.eq("item_id", filters.item_id);
      }
      if (filters?.deal_id) {
        query = query.eq("deal_id", filters.deal_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InvoiceWithRelations[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to fetch a single invoice
export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          contact:contacts(id, full_name, email, phone, address),
          item:items(id, title, description),
          deal:deals(id, title, value),
          creator:profiles!invoices_created_by_fkey(id, full_name, avatar_url),
          line_items:invoice_line_items(*),
          payments:payments(*)
        `)
        .eq("id", invoiceId)
        .single();

      if (error) throw error;
      return data as InvoiceWithRelations;
    },
    enabled: !!invoiceId,
  });
}

// Hook to create an invoice
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (invoice: {
      invoice_number: string;
      title: string;
      description?: string;
      subtotal: number;
      tax_rate?: number;
      tax_amount?: number;
      discount_amount?: number;
      total: number;
      currency?: string;
      issue_date: string;
      due_date: string;
      status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
      contact_id?: string;
      item_id?: string;
      deal_id?: string;
      notes?: string;
      terms?: string;
      is_recurring?: boolean;
      recurrence_interval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      next_invoice_date?: string;
      line_items: {
        description: string;
        quantity: number;
        unit_price: number;
        total: number;
        position: number;
      }[];
    }) => {
      if (!profile?.business_id || !user) {
        throw new Error("No business ID or user found");
      }

      const { line_items, ...invoiceData } = invoice;

      // Create invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          ...invoiceData,
          business_id: profile.business_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items
      const lineItemsWithInvoiceId = line_items.map(item => ({
        ...item,
        invoice_id: newInvoice.id,
      }));

      const { error: lineItemsError } = await supabase
        .from("invoice_line_items")
        .insert(lineItemsWithInvoiceId);

      if (lineItemsError) throw lineItemsError;

      return newInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Hook to update an invoice
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Invoice>;
    }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Hook to delete an invoice
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Hook to add line item to invoice
export function useAddInvoiceLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoice_id,
      item,
    }: {
      invoice_id: string;
      item: {
        description: string;
        quantity: number;
        unit_price: number;
        total: number;
        position: number;
      };
    }) => {
      const { data, error } = await supabase
        .from("invoice_line_items")
        .insert({
          ...item,
          invoice_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Recalculate invoice totals
      await recalculateInvoiceTotals(invoice_id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Hook to update line item
export function useUpdateInvoiceLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      invoice_id,
      updates,
    }: {
      id: string;
      invoice_id: string;
      updates: Partial<InvoiceLineItem>;
    }) => {
      const { data, error } = await supabase
        .from("invoice_line_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Recalculate invoice totals
      await recalculateInvoiceTotals(invoice_id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Hook to delete line item
export function useDeleteInvoiceLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      invoice_id,
    }: {
      id: string;
      invoice_id: string;
    }) => {
      const { error } = await supabase
        .from("invoice_line_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Recalculate invoice totals
      await recalculateInvoiceTotals(invoice_id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Hook to record a payment
export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (payment: {
      invoice_id: string;
      amount: number;
      currency?: string;
      payment_date: string;
      payment_method: string;
      reference?: string;
      notes?: string;
    }) => {
      if (!profile?.business_id || !user) {
        throw new Error("No business ID or user found");
      }

      const { data, error } = await supabase
        .from("payments")
        .insert({
          ...payment,
          business_id: profile.business_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Check if invoice is fully paid
      const { data: invoice } = await supabase
        .from("invoices")
        .select("total")
        .eq("id", payment.invoice_id)
        .single();

      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("invoice_id", payment.invoice_id);

      if (invoice && payments) {
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaid >= invoice.total) {
          await supabase
            .from("invoices")
            .update({
              status: 'paid',
              paid_date: payment.payment_date,
            })
            .eq("id", payment.invoice_id);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Hook to send invoice (change status to sent)
export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: 'sent' })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Hook to mark invoice as paid
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      paidDate,
    }: {
      invoiceId: string;
      paidDate: string;
    }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({
          status: 'paid',
          paid_date: paidDate,
        })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Hook for bulk delete invoices
export function useBulkDeleteInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .in("id", invoiceIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Helper function to recalculate invoice totals
async function recalculateInvoiceTotals(invoiceId: string) {
  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("total")
    .eq("invoice_id", invoiceId);

  if (!lineItems) return;

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

  const { data: invoice } = await supabase
    .from("invoices")
    .select("tax_rate, discount_amount")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return;

  const tax_amount = (subtotal * (invoice.tax_rate || 0)) / 100;
  const total = subtotal + tax_amount - (invoice.discount_amount || 0);

  await supabase
    .from("invoices")
    .update({
      subtotal,
      tax_amount,
      total,
    })
    .eq("id", invoiceId);
}
