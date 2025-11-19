import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type ContactComment = Database["public"]["Tables"]["contact_comments"]["Row"];
type ContactCommentInsert = Database["public"]["Tables"]["contact_comments"]["Insert"];

// Hook to fetch contact comments
export function useContactComments(contactId: string) {
  return useQuery({
    queryKey: ["contact-comments", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_comments")
        .select(`
          *,
          user:profiles!contact_comments_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (ContactComment & {
        user: { id: string; full_name: string | null; avatar_url: string | null } | null;
      })[];
    },
    enabled: !!contactId,
  });
}

// Hook to create a contact comment
export function useCreateContactComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      contactId,
      content,
      mentions,
    }: {
      contactId: string;
      content: string;
      mentions?: string[];
    }) => {
      const { data, error } = await supabase
        .from("contact_comments")
        .insert({
          contact_id: contactId,
          user_id: user?.id,
          content,
          mentions: mentions || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-comments", variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook to update a contact comment
export function useUpdateContactComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      content,
      contactId,
    }: {
      id: string;
      content: string;
      contactId: string;
    }) => {
      const { data, error } = await supabase
        .from("contact_comments")
        .update({ content })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-comments", variables.contactId] });
    },
  });
}

// Hook to delete a contact comment
export function useDeleteContactComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from("contact_comments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-comments", variables.contactId] });
    },
  });
}
