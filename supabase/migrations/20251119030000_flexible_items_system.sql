-- Flexible Items System Migration
-- This creates a generic "items" system to replace "properties"
-- Items can be anything: Properties, Listings, Jobs, Sites, etc.
-- Each business defines their own item types and contact types

-- Create custom_types table for storing business-specific entity types
CREATE TABLE IF NOT EXISTS public.custom_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('contact', 'item')),
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, category, label)
);

-- Create items table (replaces properties with more generic structure)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  type_id UUID REFERENCES public.custom_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',

  -- Date range fields (e.g., lease period, project duration)
  start_date DATE,
  end_date DATE,

  -- Location/Address
  address TEXT,

  -- Generic numeric fields (can be used for rent, price, budget, etc.)
  amount DECIMAL(12, 2),
  currency TEXT DEFAULT 'GBP',

  -- Generic text fields for flexibility
  field_1 TEXT,
  field_2 TEXT,
  field_3 TEXT,
  field_4 TEXT,
  field_5 TEXT,

  -- JSONB for completely custom fields
  custom_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create item_contacts junction table (many-to-many relationship)
-- Links items to contacts with a role (e.g., "Tenant", "Landlord", "Client")
CREATE TABLE IF NOT EXISTS public.item_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role_type_id UUID REFERENCES public.custom_types(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, contact_id, role_type_id)
);

-- Create item_notes table for timestamped notes
CREATE TABLE IF NOT EXISTS public.item_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add item_id to tasks table to link tasks to items
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.items(id) ON DELETE SET NULL;

-- Update contacts table to use custom types
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES public.custom_types(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_business_id ON public.items(business_id);
CREATE INDEX IF NOT EXISTS idx_items_type_id ON public.items(type_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_contacts_item_id ON public.item_contacts(item_id);
CREATE INDEX IF NOT EXISTS idx_item_contacts_contact_id ON public.item_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_item_notes_item_id ON public.item_notes(item_id);
CREATE INDEX IF NOT EXISTS idx_tasks_item_id ON public.tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_custom_types_business_id ON public.custom_types(business_id, category);
CREATE INDEX IF NOT EXISTS idx_contacts_type_id ON public.contacts(type_id);

-- Enable RLS
ALTER TABLE public.custom_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_types
CREATE POLICY "Users can view their business's custom types"
  ON public.custom_types FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage custom types"
  ON public.custom_types FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for items
CREATE POLICY "Users can view their business's items"
  ON public.items FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create items for their business"
  ON public.items FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business's items"
  ON public.items FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete items"
  ON public.items FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for item_contacts
CREATE POLICY "Users can view item-contact relationships"
  ON public.item_contacts FOR SELECT
  USING (
    item_id IN (
      SELECT id FROM public.items WHERE business_id IN (
        SELECT business_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage item-contact relationships"
  ON public.item_contacts FOR ALL
  USING (
    item_id IN (
      SELECT id FROM public.items WHERE business_id IN (
        SELECT business_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for item_notes
CREATE POLICY "Users can view item notes"
  ON public.item_notes FOR SELECT
  USING (
    item_id IN (
      SELECT id FROM public.items WHERE business_id IN (
        SELECT business_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create item notes"
  ON public.item_notes FOR INSERT
  WITH CHECK (
    item_id IN (
      SELECT id FROM public.items WHERE business_id IN (
        SELECT business_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own notes"
  ON public.item_notes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON public.item_notes FOR DELETE
  USING (user_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_notes_updated_at
  BEFORE UPDATE ON public.item_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_types_updated_at
  BEFORE UPDATE ON public.custom_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default custom types for all existing businesses
INSERT INTO public.custom_types (business_id, category, label, color)
SELECT DISTINCT b.id, 'contact', 'Client', '#3B82F6'
FROM public.businesses b
ON CONFLICT (business_id, category, label) DO NOTHING;

INSERT INTO public.custom_types (business_id, category, label, color)
SELECT DISTINCT b.id, 'contact', 'Vendor', '#10B981'
FROM public.businesses b
ON CONFLICT (business_id, category, label) DO NOTHING;

INSERT INTO public.custom_types (business_id, category, label, color)
SELECT DISTINCT b.id, 'item', 'Property', '#8B5CF6'
FROM public.businesses b
ON CONFLICT (business_id, category, label) DO NOTHING;

-- Migrate existing properties data to items
INSERT INTO public.items (
  id,
  business_id,
  created_by,
  title,
  address,
  amount,
  status,
  field_1, -- bedrooms
  field_2, -- bathrooms
  field_3, -- sqft
  custom_data,
  created_at,
  updated_at
)
SELECT
  p.id,
  p.business_id,
  p.created_by,
  COALESCE(p.address, 'Untitled Property'),
  p.address,
  p.rent_amount,
  p.status,
  p.bedrooms::TEXT,
  p.bathrooms::TEXT,
  p.sqft::TEXT,
  jsonb_build_object(
    'landlord_id', p.landlord_id,
    'lease_start', p.lease_start,
    'lease_end', p.lease_end,
    'deposit_amount', p.deposit_amount,
    'notes', p.notes
  ),
  p.created_at,
  p.updated_at
FROM public.properties p
ON CONFLICT (id) DO NOTHING;

-- Set type_id for migrated items to "Property" type
UPDATE public.items i
SET type_id = (
  SELECT ct.id FROM public.custom_types ct
  WHERE ct.business_id = i.business_id
  AND ct.category = 'item'
  AND ct.label = 'Property'
  LIMIT 1
)
WHERE i.type_id IS NULL;

-- Migrate landlord relationships to item_contacts
INSERT INTO public.item_contacts (item_id, contact_id, role_type_id, notes)
SELECT
  i.id,
  (i.custom_data->>'landlord_id')::UUID,
  (
    SELECT ct.id FROM public.custom_types ct
    WHERE ct.business_id = i.business_id
    AND ct.category = 'contact'
    AND ct.label = 'Vendor'
    LIMIT 1
  ),
  'Migrated from properties.landlord_id'
FROM public.items i
WHERE i.custom_data->>'landlord_id' IS NOT NULL
AND (i.custom_data->>'landlord_id')::UUID IN (SELECT id FROM public.contacts)
ON CONFLICT DO NOTHING;
