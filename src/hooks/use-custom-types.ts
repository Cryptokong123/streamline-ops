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

// Hook to fetch all custom types for a business
export function useCustomTypes(category?: "contact" | "item") {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["custom-types", profile?.business_id, category],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      let query = supabase
        .from("custom_types")
        .select("*")
        .eq("business_id", profile.business_id)
        .eq("is_active", true)
        .order("label", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CustomType[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to fetch contact types
export function useContactTypes() {
  return useCustomTypes("contact");
}

// Hook to fetch item types
export function useItemTypes() {
  return useCustomTypes("item");
}

// Hook to create a custom type
export function useCreateCustomType() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      category,
      label,
      color,
    }: {
      category: "contact" | "item";
      label: string;
      color?: string;
    }) => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("custom_types")
        .insert({
          business_id: profile.business_id,
          category,
          label,
          color: color || "#" + Math.floor(Math.random() * 16777215).toString(16),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-types"] });
    },
  });
}

// Hook to update a custom type
export function useUpdateCustomType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CustomType>;
    }) => {
      const { data, error } = await supabase
        .from("custom_types")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-types"] });
    },
  });
}

// Hook to delete a custom type (soft delete by setting is_active = false)
export function useDeleteCustomType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_types")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-types"] });
    },
  });
}
