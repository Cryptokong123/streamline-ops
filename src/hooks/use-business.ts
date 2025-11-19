import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type Business = Database["public"]["Tables"]["businesses"]["Row"];
type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];

// Hook to fetch business details
export function useBusiness() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["business", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", profile.business_id)
        .single();

      if (error) throw error;
      return data as Business;
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to update business settings
export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (updates: BusinessUpdate) => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("businesses")
        .update(updates)
        .eq("id", profile.business_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
}

// Hook to update module labels
export function useUpdateModuleLabels() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (moduleLabels: Record<string, string>) => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("businesses")
        .update({ module_labels: moduleLabels })
        .eq("id", profile.business_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
    },
  });
}
