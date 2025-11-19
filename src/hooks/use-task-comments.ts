import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type TaskComment = Database["public"]["Tables"]["task_comments"]["Row"];
type TaskCommentInsert = Database["public"]["Tables"]["task_comments"]["Insert"];
type TaskActivity = Database["public"]["Tables"]["task_activity"]["Row"];

// Hook to fetch comments for a task
export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select(`
          *,
          user:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as (TaskComment & {
        user: { id: string; full_name: string | null; avatar_url: string | null };
      })[];
    },
    enabled: !!taskId,
  });
}

// Hook to fetch activity/history for a task
export function useTaskActivity(taskId: string) {
  return useQuery({
    queryKey: ["task-activity", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_activity")
        .select(`
          *,
          user:profiles!task_activity_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as (TaskActivity & {
        user: { id: string; full_name: string | null; avatar_url: string | null };
      })[];
    },
    enabled: !!taskId,
  });
}

// Hook to create a comment
export function useCreateTaskComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      content,
      mentions,
    }: {
      taskId: string;
      content: string;
      mentions?: string[];
    }) => {
      if (!user?.id) throw new Error("No user ID");

      const { data, error } = await supabase
        .from("task_comments")
        .insert({
          task_id: taskId,
          user_id: user.id,
          content,
          mentions: mentions || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook to update a comment
export function useUpdateTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      const { data, error} = await supabase
        .from("task_comments")
        .update({ content })
        .eq("id", commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", data.task_id] });
    },
  });
}

// Hook to delete a comment
export function useDeleteTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, taskId }: { commentId: string; taskId: string }) => {
      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
    },
  });
}
