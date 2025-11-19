-- Document Management System
-- Comprehensive file storage, organization, and tracking

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),

  -- File metadata
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- bytes
  file_type TEXT NOT NULL, -- MIME type
  storage_path TEXT NOT NULL, -- path in Supabase Storage

  -- Organization
  folder TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',

  -- Relationships
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,

  -- Version control
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  is_latest_version BOOLEAN DEFAULT true,

  -- Metadata
  description TEXT,
  extracted_text TEXT, -- For OCR/search
  extracted_data JSONB DEFAULT '{}', -- Extracted dates, amounts, etc.

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  public_url TEXT,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create document_shares table for granular permissions
CREATE TABLE IF NOT EXISTS public.document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'download', 'edit')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create document_activity table for audit trail
CREATE TABLE IF NOT EXISTS public.document_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('upload', 'view', 'download', 'edit', 'delete', 'share')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_business_id ON public.documents(business_id);
CREATE INDEX IF NOT EXISTS idx_documents_contact_id ON public.documents(contact_id);
CREATE INDEX IF NOT EXISTS idx_documents_item_id ON public.documents(item_id);
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON public.documents(task_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents(folder);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_activity_document_id ON public.document_activity(document_id);

-- Full text search on file names and extracted text
CREATE INDEX IF NOT EXISTS idx_documents_search ON public.documents
  USING gin(to_tsvector('english', coalesce(file_name, '') || ' ' || coalesce(extracted_text, '')));

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view their business's documents"
  ON public.documents FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    id IN (
      SELECT document_id FROM public.document_shares WHERE shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents to their business"
  ON public.documents FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business's documents"
  ON public.documents FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for document_shares
CREATE POLICY "Users can view shares for their documents"
  ON public.document_shares FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents
      WHERE business_id IN (
        SELECT business_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create shares for their documents"
  ON public.document_shares FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents
      WHERE business_id IN (
        SELECT business_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete shares they created"
  ON public.document_shares FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for document_activity
CREATE POLICY "Users can view activity for their documents"
  ON public.document_activity FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents
      WHERE business_id IN (
        SELECT business_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create activity logs"
  ON public.document_activity FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents
      WHERE business_id IN (
        SELECT business_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to log document activity
CREATE OR REPLACE FUNCTION log_document_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.document_activity (document_id, user_id, action, metadata)
    VALUES (NEW.id, NEW.uploaded_by, 'upload', jsonb_build_object('file_name', NEW.file_name, 'file_size', NEW.file_size));
  ELSIF (TG_OP = 'UPDATE' AND OLD.version < NEW.version) THEN
    INSERT INTO public.document_activity (document_id, user_id, action, metadata)
    VALUES (NEW.id, auth.uid(), 'edit', jsonb_build_object('old_version', OLD.version, 'new_version', NEW.version));
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.document_activity (document_id, user_id, action, metadata)
    VALUES (OLD.id, auth.uid(), 'delete', jsonb_build_object('file_name', OLD.file_name));
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_document_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_activity();

-- Storage bucket setup (needs to be run manually in Supabase dashboard or via SQL)
-- This creates the storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload documents to their business folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their business documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
