import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type TaskAssignment = Database["public"]["Tables"]["task_assignments"]["Row"];

// Hook to fetch all tasks for the current business
export function useTasks() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["tasks", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
          task_assignments(
            id,
            user_id,
            assigned_at,
            assigned_by,
            user:profiles!task_assignments_user_id_fkey(id, full_name, avatar_url)
          )
        `)
        .eq("business_id", profile.business_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (Task & {
        assigned_to_profile?: { id: string; full_name: string | null; avatar_url: string | null };
        task_assignments: Array<TaskAssignment & {
          user: { id: string; full_name: string | null; avatar_url: string | null };
        }>;
      })[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to fetch tasks assigned to a specific user
export function useUserTasks(userId?: string) {
  const { user, profile } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["user-tasks", targetUserId],
    queryFn: async () => {
      if (!targetUserId) {
        throw new Error("No user ID provided");
      }

      const { data, error } = await supabase.rpc("get_user_assigned_tasks", {
        target_user_id: targetUserId,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId && !!profile?.business_id,
  });
}

// Hook to create a new task
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...task,
          business_id: profile.business_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// Hook to update a task
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
    },
  });
}

// Hook to delete a task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
    },
  });
}

// Hook to assign users to a task
export function useAssignTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, userIds }: { taskId: string; userIds: string[] }) => {
      // Remove existing assignments
      await supabase.from("task_assignments").delete().eq("task_id", taskId);

      // Add new assignments
      const assignments = userIds.map((userId) => ({
        task_id: taskId,
        user_id: userId,
        assigned_by: user?.id,
      }));

      const { data, error } = await supabase
        .from("task_assignments")
        .insert(assignments)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
    },
  });
}

// Hook to unassign a user from a task
export function useUnassignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { error } = await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["user-tasks"] });
    },
  });
}

// Hook to fetch team members for task assignment
export function useTeamMembers() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["team-members", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url, phone")
        .eq("business_id", profile.business_id)
        .order("full_name");

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.business_id,
  });
}
