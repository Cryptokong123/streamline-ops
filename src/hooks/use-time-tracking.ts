import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TimeEntry {
  id: string;
  business_id: string;
  user_id: string;
  description: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_billable: boolean;
  hourly_rate: number | null;
  billed_amount: number | null;
  is_invoiced: boolean;
  task_id: string | null;
  item_id: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryWithRelations extends TimeEntry {
  user: { id: string; full_name: string | null; avatar_url: string | null } | null;
  task: { id: string; title: string } | null;
  item: { id: string; title: string } | null;
  contact: { id: string; full_name: string | null } | null;
}

// Hook to fetch all time entries
export function useTimeEntries(filters?: {
  user_id?: string;
  task_id?: string;
  item_id?: string;
  contact_id?: string;
  is_billable?: boolean;
  is_invoiced?: boolean;
  start_date?: string;
  end_date?: string;
}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["time-entries", profile?.business_id, filters],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      let query = supabase
        .from("time_entries")
        .select(`
          *,
          user:profiles!time_entries_user_id_fkey(id, full_name, avatar_url),
          task:tasks(id, title),
          item:items(id, title),
          contact:contacts(id, full_name)
        `)
        .eq("business_id", profile.business_id)
        .order("start_time", { ascending: false });

      if (filters?.user_id) {
        query = query.eq("user_id", filters.user_id);
      }
      if (filters?.task_id) {
        query = query.eq("task_id", filters.task_id);
      }
      if (filters?.item_id) {
        query = query.eq("item_id", filters.item_id);
      }
      if (filters?.contact_id) {
        query = query.eq("contact_id", filters.contact_id);
      }
      if (filters?.is_billable !== undefined) {
        query = query.eq("is_billable", filters.is_billable);
      }
      if (filters?.is_invoiced !== undefined) {
        query = query.eq("is_invoiced", filters.is_invoiced);
      }
      if (filters?.start_date) {
        query = query.gte("start_time", filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte("start_time", filters.end_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TimeEntryWithRelations[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to fetch a single time entry
export function useTimeEntry(timeEntryId: string) {
  return useQuery({
    queryKey: ["time-entry", timeEntryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          *,
          user:profiles!time_entries_user_id_fkey(id, full_name, avatar_url),
          task:tasks(id, title, description),
          item:items(id, title, description),
          contact:contacts(id, full_name, email)
        `)
        .eq("id", timeEntryId)
        .single();

      if (error) throw error;
      return data as TimeEntryWithRelations;
    },
    enabled: !!timeEntryId,
  });
}

// Hook to start a timer
export function useStartTimer() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (entry: {
      description: string;
      is_billable?: boolean;
      hourly_rate?: number;
      task_id?: string;
      item_id?: string;
      contact_id?: string;
    }) => {
      if (!profile?.business_id || !user) {
        throw new Error("No business ID or user found");
      }

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          ...entry,
          business_id: profile.business_id,
          user_id: user.id,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["active-timer"] });
    },
  });
}

// Hook to stop a timer
export function useStopTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeEntryId: string) => {
      const endTime = new Date();

      // Get the time entry to calculate duration
      const { data: entry, error: fetchError } = await supabase
        .from("time_entries")
        .select("start_time, hourly_rate")
        .eq("id", timeEntryId)
        .single();

      if (fetchError) throw fetchError;

      const startTime = new Date(entry.start_time);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      // Calculate billed amount if hourly rate exists
      let billedAmount = null;
      if (entry.hourly_rate) {
        billedAmount = (entry.hourly_rate / 60) * durationMinutes;
      }

      const { data, error } = await supabase
        .from("time_entries")
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          billed_amount: billedAmount,
        })
        .eq("id", timeEntryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["active-timer"] });
    },
  });
}

// Hook to get active timer for current user
export function useActiveTimer() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["active-timer", user?.id],
    queryFn: async () => {
      if (!user || !profile?.business_id) {
        return null;
      }

      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          *,
          task:tasks(id, title),
          item:items(id, title),
          contact:contacts(id, full_name)
        `)
        .eq("business_id", profile.business_id)
        .eq("user_id", user.id)
        .is("end_time", null)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TimeEntryWithRelations | null;
    },
    enabled: !!user && !!profile?.business_id,
    refetchInterval: 1000, // Refresh every second to update timer display
  });
}

// Hook to create a manual time entry
export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (entry: {
      description: string;
      start_time: string;
      end_time: string;
      duration_minutes?: number;
      is_billable?: boolean;
      hourly_rate?: number;
      task_id?: string;
      item_id?: string;
      contact_id?: string;
    }) => {
      if (!profile?.business_id || !user) {
        throw new Error("No business ID or user found");
      }

      // Calculate duration if not provided
      let duration = entry.duration_minutes;
      if (!duration) {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        duration = Math.round((end.getTime() - start.getTime()) / 60000);
      }

      // Calculate billed amount
      let billedAmount = null;
      if (entry.hourly_rate && duration) {
        billedAmount = (entry.hourly_rate / 60) * duration;
      }

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          ...entry,
          duration_minutes: duration,
          billed_amount: billedAmount,
          business_id: profile.business_id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });
}

// Hook to update a time entry
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<TimeEntry>;
    }) => {
      // Recalculate billed amount if relevant fields changed
      if (updates.duration_minutes || updates.hourly_rate) {
        const { data: entry } = await supabase
          .from("time_entries")
          .select("duration_minutes, hourly_rate")
          .eq("id", id)
          .single();

        if (entry) {
          const duration = updates.duration_minutes ?? entry.duration_minutes;
          const rate = updates.hourly_rate ?? entry.hourly_rate;

          if (duration && rate) {
            updates.billed_amount = (rate / 60) * duration;
          }
        }
      }

      const { data, error } = await supabase
        .from("time_entries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });
}

// Hook to delete a time entry
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeEntryId: string) => {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", timeEntryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });
}

// Hook to mark time entries as invoiced
export function useMarkTimeEntriesInvoiced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeEntryIds: string[]) => {
      const { error } = await supabase
        .from("time_entries")
        .update({ is_invoiced: true })
        .in("id", timeEntryIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });
}

// Hook to get time tracking summary
export function useTimeTrackingSummary(filters?: {
  user_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["time-tracking-summary", profile?.business_id, filters],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      let query = supabase
        .from("time_entries")
        .select("duration_minutes, billed_amount, is_billable, is_invoiced")
        .eq("business_id", profile.business_id)
        .not("end_time", "is", null);

      if (filters?.user_id) {
        query = query.eq("user_id", filters.user_id);
      }
      if (filters?.start_date) {
        query = query.gte("start_time", filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte("start_time", filters.end_date);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate summary
      const totalMinutes = data.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
      const totalBillable = data.filter(e => e.is_billable).reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
      const totalBilled = data.reduce((sum, entry) => sum + (entry.billed_amount || 0), 0);
      const totalInvoiced = data.filter(e => e.is_invoiced).reduce((sum, entry) => sum + (entry.billed_amount || 0), 0);
      const totalUninvoiced = data.filter(e => !e.is_invoiced && e.is_billable).reduce((sum, entry) => sum + (entry.billed_amount || 0), 0);

      return {
        totalHours: totalMinutes / 60,
        totalBillableHours: totalBillable / 60,
        totalBilled,
        totalInvoiced,
        totalUninvoiced,
        entries: data.length,
      };
    },
    enabled: !!profile?.business_id,
  });
}

// Hook for bulk delete time entries
export function useBulkDeleteTimeEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeEntryIds: string[]) => {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .in("id", timeEntryIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });
}
