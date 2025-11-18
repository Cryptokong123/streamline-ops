-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'staff', 'contractor');
CREATE TYPE public.business_industry AS ENUM ('letting_agency', 'cleaning', 'contracting', 'property_management', 'other');
CREATE TYPE public.contact_type AS ENUM ('tenant', 'landlord', 'client', 'supplier', 'contractor', 'other');
CREATE TYPE public.property_status AS ENUM ('available', 'occupied', 'maintenance', 'offline');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Businesses table
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry public.business_industry DEFAULT 'other',
  custom_fields JSONB DEFAULT '{}',
  custom_workflows JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{"enable_properties": true, "enable_automations": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  full_name TEXT,
  role public.user_role DEFAULT 'staff',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  type public.contact_type DEFAULT 'other',
  address TEXT,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  landlord_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status public.property_status DEFAULT 'available',
  bedrooms INTEGER,
  rent_amount DECIMAL(10,2),
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jobs/Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  due_date DATE,
  status public.task_status DEFAULT 'todo',
  priority public.task_priority DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  custom_fields JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  extracted_data JSONB DEFAULT '{}',
  extracted_dates JSONB DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automations table
CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_condition JSONB DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_payload JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles in their business"
  ON public.profiles FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for businesses
CREATE POLICY "Users can view their own business"
  ON public.businesses FOR SELECT
  USING (
    id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can update business"
  ON public.businesses FOR UPDATE
  USING (
    id IN (
      SELECT business_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for contacts
CREATE POLICY "Users can view contacts in their business"
  ON public.contacts FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create contacts in their business"
  ON public.contacts FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts in their business"
  ON public.contacts FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contacts in their business"
  ON public.contacts FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for properties
CREATE POLICY "Users can view properties in their business"
  ON public.properties FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create properties in their business"
  ON public.properties FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update properties in their business"
  ON public.properties FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete properties in their business"
  ON public.properties FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their business"
  ON public.tasks FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their business"
  ON public.tasks FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their business"
  ON public.tasks FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their business"
  ON public.tasks FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their business"
  ON public.documents FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents in their business"
  ON public.documents FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their business"
  ON public.documents FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for automations
CREATE POLICY "Users can view automations in their business"
  ON public.automations FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage automations"
  ON public.automations FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_businesses
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_contacts
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_properties
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_tasks
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_automations
  BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX idx_profiles_business_id ON public.profiles(business_id);
CREATE INDEX idx_contacts_business_id ON public.contacts(business_id);
CREATE INDEX idx_properties_business_id ON public.properties(business_id);
CREATE INDEX idx_tasks_business_id ON public.tasks(business_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_documents_business_id ON public.documents(business_id);
CREATE INDEX idx_automations_business_id ON public.automations(business_id);