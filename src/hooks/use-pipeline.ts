import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PipelineStage {
  id: string;
  business_id: string;
  name: string;
  color: string;
  position: number;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  business_id: string;
  created_by: string;
  title: string;
  description: string | null;
  value: number | null;
  currency: string;
  stage_id: string;
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  contact_id: string | null;
  item_id: string | null;
  assigned_to: string | null;
  status: 'open' | 'won' | 'lost';
  lost_reason: string | null;
  tags: string[];
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DealWithRelations extends Deal {
  stage: PipelineStage;
  contact: { id: string; full_name: string | null } | null;
  item: { id: string; title: string } | null;
  assigned_user: { id: string; full_name: string | null } | null;
  creator: { id: string; full_name: string | null } | null;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string;
  activity_type: 'created' | 'stage_changed' | 'value_changed' | 'note_added' | 'won' | 'lost';
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  created_at: string;
  user: { id: string; full_name: string | null } | null;
}

// Hook to fetch pipeline stages
export function usePipelineStages() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["pipeline-stages", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("business_id", profile.business_id)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to create pipeline stage
export function useCreatePipelineStage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (stage: {
      name: string;
      color: string;
      position: number;
      is_closed_won?: boolean;
      is_closed_lost?: boolean;
    }) => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("pipeline_stages")
        .insert({
          ...stage,
          business_id: profile.business_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
  });
}

// Hook to update pipeline stage
export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PipelineStage>;
    }) => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
  });
}

// Hook to delete pipeline stage
export function useDeletePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from("pipeline_stages")
        .delete()
        .eq("id", stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
    },
  });
}

// Hook to fetch all deals
export function useDeals(filters?: {
  stage_id?: string;
  status?: 'open' | 'won' | 'lost';
  assigned_to?: string;
  contact_id?: string;
  item_id?: string;
}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["deals", profile?.business_id, filters],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      let query = supabase
        .from("deals")
        .select(`
          *,
          stage:pipeline_stages!deals_stage_id_fkey(id, name, color, position, is_closed_won, is_closed_lost),
          contact:contacts(id, full_name),
          item:items(id, title),
          assigned_user:profiles!deals_assigned_to_fkey(id, full_name),
          creator:profiles!deals_created_by_fkey(id, full_name)
        `)
        .eq("business_id", profile.business_id)
        .order("created_at", { ascending: false });

      if (filters?.stage_id) {
        query = query.eq("stage_id", filters.stage_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.assigned_to) {
        query = query.eq("assigned_to", filters.assigned_to);
      }
      if (filters?.contact_id) {
        query = query.eq("contact_id", filters.contact_id);
      }
      if (filters?.item_id) {
        query = query.eq("item_id", filters.item_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DealWithRelations[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to fetch a single deal
export function useDeal(dealId: string) {
  return useQuery({
    queryKey: ["deal", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          stage:pipeline_stages!deals_stage_id_fkey(id, name, color, position, is_closed_won, is_closed_lost),
          contact:contacts(id, full_name, email, phone),
          item:items(id, title, description),
          assigned_user:profiles!deals_assigned_to_fkey(id, full_name, avatar_url),
          creator:profiles!deals_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq("id", dealId)
        .single();

      if (error) throw error;
      return data as DealWithRelations;
    },
    enabled: !!dealId,
  });
}

// Hook to create a deal
export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (deal: {
      title: string;
      description?: string;
      value?: number;
      currency?: string;
      stage_id: string;
      probability?: number;
      expected_close_date?: string;
      contact_id?: string;
      item_id?: string;
      assigned_to?: string;
      tags?: string[];
    }) => {
      if (!profile?.business_id || !user) {
        throw new Error("No business ID or user found");
      }

      const { data, error } = await supabase
        .from("deals")
        .insert({
          ...deal,
          business_id: profile.business_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// Hook to update a deal
export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Deal>;
    }) => {
      const { data, error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// Hook to move deal to different stage
export function useMoveDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      stageId,
    }: {
      dealId: string;
      stageId: string;
    }) => {
      const { data, error } = await supabase
        .from("deals")
        .update({ stage_id: stageId })
        .eq("id", dealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// Hook to mark deal as won
export function useMarkDealWon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      wonStageId,
    }: {
      dealId: string;
      wonStageId: string;
    }) => {
      const { data, error } = await supabase
        .from("deals")
        .update({
          stage_id: wonStageId,
          status: 'won',
          actual_close_date: new Date().toISOString().split('T')[0],
        })
        .eq("id", dealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// Hook to mark deal as lost
export function useMarkDealLost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      lostStageId,
      reason,
    }: {
      dealId: string;
      lostStageId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from("deals")
        .update({
          stage_id: lostStageId,
          status: 'lost',
          lost_reason: reason,
          actual_close_date: new Date().toISOString().split('T')[0],
        })
        .eq("id", dealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// Hook to delete a deal
export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase
        .from("deals")
        .delete()
        .eq("id", dealId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

// Hook to fetch deal activities
export function useDealActivities(dealId: string) {
  return useQuery({
    queryKey: ["deal-activities", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_activities")
        .select(`
          *,
          user:profiles!deal_activities_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DealActivity[];
    },
    enabled: !!dealId,
  });
}

// Hook to add note to deal
export function useAddDealNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      dealId,
      note,
    }: {
      dealId: string;
      note: string;
    }) => {
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("deal_activities")
        .insert({
          deal_id: dealId,
          user_id: user.id,
          activity_type: 'note_added',
          note,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deal-activities", variables.dealId] });
    },
  });
}

// Hook for bulk delete deals
export function useBulkDeleteDeals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealIds: string[]) => {
      const { error } = await supabase
        .from("deals")
        .delete()
        .in("id", dealIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}
