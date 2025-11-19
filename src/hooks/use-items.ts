import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CustomType {
  id: string;
  business_id: string;
  category: "contact" | "item";
  label: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  business_id: string;
  created_by: string;
  type_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  address: string | null;
  amount: number | null;
  currency: string | null;
  field_1: string | null;
  field_2: string | null;
  field_3: string | null;
  field_4: string | null;
  field_5: string | null;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ItemWithType extends Item {
  type: CustomType | null;
}

export interface ItemContact {
  id: string;
  item_id: string;
  contact_id: string;
  role_type_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface ItemNote {
  id: string;
  item_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Hook to fetch all items
export function useItems() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["items", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("items")
        .select(`
          *,
          type:custom_types!items_type_id_fkey(*)
        `)
        .eq("business_id", profile.business_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ItemWithType[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to fetch a single item with all relationships
export function useItem(itemId: string) {
  return useQuery({
    queryKey: ["item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(`
          *,
          type:custom_types!items_type_id_fkey(*),
          item_contacts(
            *,
            contact:contacts(*),
            role_type:custom_types!item_contacts_role_type_id_fkey(*)
          ),
          item_notes(
            *,
            user:profiles!item_notes_user_id_fkey(id, full_name, avatar_url)
          ),
          tasks(*)
        `)
        .eq("id", itemId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });
}

// Hook to create an item
export function useCreateItem() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (item: Partial<Item>) => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("items")
        .insert({
          ...item,
          business_id: profile.business_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Hook to update an item
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Item> }) => {
      const { data, error } = await supabase
        .from("items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Hook to delete an item
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Hook to bulk delete items
export function useBulkDeleteItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("items").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Hook to link a contact to an item
export function useLinkContactToItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      contactId,
      roleTypeId,
      notes,
    }: {
      itemId: string;
      contactId: string;
      roleTypeId?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("item_contacts")
        .insert({
          item_id: itemId,
          contact_id: contactId,
          role_type_id: roleTypeId,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["item", variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Hook to unlink a contact from an item
export function useUnlinkContactFromItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, contactId }: { itemId: string; contactId: string }) => {
      const { error } = await supabase
        .from("item_contacts")
        .delete()
        .eq("item_id", itemId)
        .eq("contact_id", contactId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["item", variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// Hook to add a note to an item
export function useCreateItemNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemId, content }: { itemId: string; content: string }) => {
      const { data, error } = await supabase
        .from("item_notes")
        .insert({
          item_id: itemId,
          user_id: user?.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["item", variables.itemId] });
    },
  });
}

// Hook to fetch item notes
export function useItemNotes(itemId: string) {
  return useQuery({
    queryKey: ["item-notes", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_notes")
        .select(`
          *,
          user:profiles!item_notes_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("item_id", itemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });
}
