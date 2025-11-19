import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type CalendarEntry = Database["public"]["Tables"]["calendar_entries"]["Row"];
type CalendarEntryInsert = Database["public"]["Tables"]["calendar_entries"]["Insert"];
type CalendarEntryUpdate = Database["public"]["Tables"]["calendar_entries"]["Update"];
type CalendarAttendee = Database["public"]["Tables"]["calendar_entry_attendees"]["Row"];

// Hook to fetch calendar entries for the current business
export function useCalendarEntries(startDate: Date, endDate: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["calendar-entries", profile?.business_id, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("calendar_entries")
        .select(`
          *,
          created_by_profile:profiles!calendar_entries_created_by_fkey(id, full_name, avatar_url),
          calendar_entry_attendees(
            id,
            user_id,
            status,
            user:profiles!calendar_entry_attendees_user_id_fkey(id, full_name, avatar_url)
          ),
          task:tasks(id, title, status, priority)
        `)
        .eq("business_id", profile.business_id)
        .gte("end_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time");

      if (error) throw error;
      return data as (CalendarEntry & {
        created_by_profile: { id: string; full_name: string | null; avatar_url: string | null };
        calendar_entry_attendees: Array<CalendarAttendee & {
          user: { id: string; full_name: string | null; avatar_url: string | null };
        }>;
        task?: { id: string; title: string; status: string; priority: string } | null;
      })[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to fetch calendar entries for multiple team members (Outlook-style multi-calendar view)
export function useTeamCalendar(userIds: string[], startDate: Date, endDate: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["team-calendar", userIds, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!profile?.business_id || userIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase.rpc("get_team_calendar_entries", {
        user_ids: userIds,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.business_id && userIds.length > 0,
  });
}

// Hook to fetch user's own calendar entries
export function useUserCalendar(startDate: Date, endDate: Date, userId?: string) {
  const { user, profile } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["user-calendar", targetUserId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!targetUserId || !profile?.business_id) {
        throw new Error("No user ID or business ID found");
      }

      const { data, error } = await supabase
        .from("calendar_entries")
        .select(`
          *,
          created_by_profile:profiles!calendar_entries_created_by_fkey(id, full_name, avatar_url),
          calendar_entry_attendees!inner(
            id,
            user_id,
            status
          ),
          task:tasks(id, title, status, priority)
        `)
        .eq("business_id", profile.business_id)
        .eq("calendar_entry_attendees.user_id", targetUserId)
        .gte("end_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time");

      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId && !!profile?.business_id,
  });
}

// Hook to create a calendar entry
export function useCreateCalendarEntry() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      entry,
      attendeeIds,
    }: {
      entry: Omit<CalendarEntryInsert, "business_id" | "created_by">;
      attendeeIds?: string[];
    }) => {
      if (!profile?.business_id || !user?.id) {
        throw new Error("No business ID or user ID found");
      }

      // Create the calendar entry
      const { data: calendarEntry, error: entryError } = await supabase
        .from("calendar_entries")
        .insert({
          ...entry,
          business_id: profile.business_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Add attendees if provided
      if (attendeeIds && attendeeIds.length > 0) {
        const attendees = attendeeIds.map((userId) => ({
          calendar_entry_id: calendarEntry.id,
          user_id: userId,
          status: "pending",
        }));

        const { error: attendeesError } = await supabase
          .from("calendar_entry_attendees")
          .insert(attendees);

        if (attendeesError) throw attendeesError;
      }

      return calendarEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
      queryClient.invalidateQueries({ queryKey: ["team-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["user-calendar"] });
    },
  });
}

// Hook to update a calendar entry
export function useUpdateCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: CalendarEntryUpdate }) => {
      const { data, error } = await supabase
        .from("calendar_entries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
      queryClient.invalidateQueries({ queryKey: ["team-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["user-calendar"] });
    },
  });
}

// Hook to delete a calendar entry
export function useDeleteCalendarEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_entries").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
      queryClient.invalidateQueries({ queryKey: ["team-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["user-calendar"] });
    },
  });
}

// Hook to add attendees to a calendar entry
export function useAddAttendees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, userIds }: { entryId: string; userIds: string[] }) => {
      const attendees = userIds.map((userId) => ({
        calendar_entry_id: entryId,
        user_id: userId,
        status: "pending",
      }));

      const { data, error } = await supabase
        .from("calendar_entry_attendees")
        .insert(attendees)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
      queryClient.invalidateQueries({ queryKey: ["team-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["user-calendar"] });
    },
  });
}

// Hook to remove an attendee from a calendar entry
export function useRemoveAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, userId }: { entryId: string; userId: string }) => {
      const { error } = await supabase
        .from("calendar_entry_attendees")
        .delete()
        .eq("calendar_entry_id", entryId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
      queryClient.invalidateQueries({ queryKey: ["team-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["user-calendar"] });
    },
  });
}

// Hook to update attendee status (accept/decline/tentative)
export function useUpdateAttendeeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      userId,
      status,
    }: {
      entryId: string;
      userId: string;
      status: string;
    }) => {
      const { data, error } = await supabase
        .from("calendar_entry_attendees")
        .update({ status })
        .eq("calendar_entry_id", entryId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
      queryClient.invalidateQueries({ queryKey: ["team-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["user-calendar"] });
    },
  });
}
