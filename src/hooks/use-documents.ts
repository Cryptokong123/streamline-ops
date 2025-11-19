import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Document {
  id: string;
  business_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  folder: string;
  tags: string[];
  contact_id: string | null;
  item_id: string | null;
  task_id: string | null;
  version: number;
  parent_document_id: string | null;
  is_latest_version: boolean;
  description: string | null;
  extracted_text: string | null;
  extracted_data: Record<string, any>;
  is_public: boolean;
  public_url: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentWithRelations extends Document {
  uploader: { id: string; full_name: string | null } | null;
}

export interface DocumentActivity {
  id: string;
  document_id: string;
  user_id: string;
  action: 'upload' | 'view' | 'download' | 'edit' | 'delete' | 'share';
  metadata: Record<string, any>;
  created_at: string;
  user: { id: string; full_name: string | null } | null;
}

// Hook to fetch all documents
export function useDocuments(filters?: {
  folder?: string;
  contact_id?: string;
  item_id?: string;
  task_id?: string;
  file_type?: string;
}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["documents", profile?.business_id, filters],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      let query = supabase
        .from("documents")
        .select(`
          *,
          uploader:profiles!documents_uploaded_by_fkey(id, full_name)
        `)
        .eq("business_id", profile.business_id)
        .eq("is_latest_version", true)
        .order("created_at", { ascending: false });

      if (filters?.folder) {
        query = query.eq("folder", filters.folder);
      }
      if (filters?.contact_id) {
        query = query.eq("contact_id", filters.contact_id);
      }
      if (filters?.item_id) {
        query = query.eq("item_id", filters.item_id);
      }
      if (filters?.task_id) {
        query = query.eq("task_id", filters.task_id);
      }
      if (filters?.file_type) {
        query = query.ilike("file_type", `${filters.file_type}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DocumentWithRelations[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook to fetch a single document
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          uploader:profiles!documents_uploaded_by_fkey(id, full_name, avatar_url)
        `)
        .eq("id", documentId)
        .single();

      if (error) throw error;
      return data as DocumentWithRelations;
    },
    enabled: !!documentId,
  });
}

// Hook to upload a document
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      folder,
      description,
      tags,
      contact_id,
      item_id,
      task_id,
    }: {
      file: File;
      folder?: string;
      description?: string;
      tags?: string[];
      contact_id?: string;
      item_id?: string;
      task_id?: string;
    }) => {
      if (!profile?.business_id || !user) {
        throw new Error("No business ID or user found");
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${profile.business_id}/${folder || 'general'}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          business_id: profile.business_id,
          uploaded_by: user.id,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          folder: folder || 'general',
          description,
          tags: tags || [],
          contact_id,
          item_id,
          task_id,
        })
        .select()
        .single();

      if (dbError) {
        // Cleanup storage if DB insert fails
        await supabase.storage.from('documents').remove([storagePath]);
        throw dbError;
      }

      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// Hook to download a document
export function useDownloadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Get document info
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('storage_path, file_name')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Download from storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path);

      if (error) throw error;

      // Log activity
      await supabase.from('document_activity').insert({
        document_id: documentId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'download',
      });

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-activity"] });
    },
  });
}

// Hook to get document URL (for preview)
export function useGetDocumentUrl() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      // Get document info
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Get signed URL (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600);

      if (error) throw error;

      // Log view activity
      await supabase.from('document_activity').insert({
        document_id: documentId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'view',
      });

      return data.signedUrl;
    },
  });
}

// Hook to update document metadata
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Document>;
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// Hook to delete a document
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Get storage path
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// Hook to get document activity
export function useDocumentActivity(documentId: string) {
  return useQuery({
    queryKey: ["document-activity", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_activity')
        .select(`
          *,
          user:profiles!document_activity_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DocumentActivity[];
    },
    enabled: !!documentId,
  });
}

// Hook to get folders
export function useFolders() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["folders", profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) {
        throw new Error("No business ID found");
      }

      const { data, error } = await supabase
        .from('documents')
        .select('folder')
        .eq('business_id', profile.business_id);

      if (error) throw error;

      // Get unique folders
      const folders = [...new Set(data.map(d => d.folder))].filter(Boolean);
      return folders as string[];
    },
    enabled: !!profile?.business_id,
  });
}

// Hook for bulk delete
export function useBulkDeleteDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentIds: string[]) => {
      // Get storage paths
      const { data: docs, error: docError } = await supabase
        .from('documents')
        .select('storage_path')
        .in('id', documentIds);

      if (docError) throw docError;

      // Delete from storage
      const paths = docs.map(d => d.storage_path);
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove(paths);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .in('id', documentIds);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
