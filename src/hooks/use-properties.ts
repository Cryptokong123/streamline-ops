import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type Property = Database["public"]["Tables"]["properties"]["Row"];
type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];

// Hook to fetch all properties
export function useProperties() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["properties", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          landlord:contacts!properties_landlord_id_fkey(id, name)
        `)
        .eq("business_id", profile.business_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (Property & {
        landlord: { id: string; name: string | null } | null;
      })[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to fetch a single property
export function useProperty(propertyId: string) {
  return useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error} = await supabase
        .from("properties")
        .select(`
          *,
          landlord:contacts!properties_landlord_id_fkey(id, name)
        `)
        .eq("id", propertyId)
        .single();

      if (error) throw error;
      return data as Property & {
        landlord: { id: string; name: string | null } | null;
      };
    },
    enabled: !!propertyId,
  });
}

// Hook to create a property
export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (property: Omit<PropertyInsert, "business_id" | "created_by">) => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("properties")
        .insert({
          ...property,
          business_id: profile.business_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

// Hook to update a property
export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PropertyUpdate }) => {
      const { data, error } = await supabase
        .from("properties")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

// Hook to delete a property
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

// Hook to bulk delete properties
export function useBulkDeleteProperties() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("properties").delete().in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

// Hook to bulk update properties
export function useBulkUpdateProperties() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: PropertyUpdate }) => {
      const promises = ids.map((id) =>
        supabase.from("properties").update(updates).eq("id", id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} properties`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
