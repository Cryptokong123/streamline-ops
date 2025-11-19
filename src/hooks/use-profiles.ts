import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  business_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
  updated_at: string;
}

// Hook to fetch all profiles (team members) in the same business
export function useProfiles() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["profiles", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("business_id", profile.business_id)
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!profile?.business_id,
  });
}
