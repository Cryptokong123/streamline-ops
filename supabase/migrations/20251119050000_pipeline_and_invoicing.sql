-- Pipeline/Sales Funnel and Invoicing System
-- Track deals through sales stages and manage invoicing/payments

-- ============================================
-- PIPELINE/SALES FUNNEL
-- ============================================

-- Create pipeline_stages table
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  position INTEGER NOT NULL,
  is_closed_won BOOLEAN DEFAULT false,
  is_closed_lost BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, position)
);

-- Create deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Deal info
  title TEXT NOT NULL,
  description TEXT,
  value DECIMAL(12, 2),
  currency TEXT DEFAULT 'GBP',

  -- Pipeline
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id),
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date DATE,

  -- Relationships
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  lost_reason TEXT,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create deal_activities table for history
CREATE TABLE IF NOT EXISTS public.deal_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('created', 'stage_changed', 'value_changed', 'note_added', 'won', 'lost')),
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INVOICING & PAYMENTS
-- ============================================

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Invoice details
  invoice_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'GBP',

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),

  -- Relationships
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,

  -- Payment info
  payment_method TEXT,
  payment_reference TEXT,

  -- Recurring
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT CHECK (recurrence_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_invoice_date DATE,

  -- Metadata
  notes TEXT,
  terms TEXT,
  custom_fields JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, invoice_number)
);

-- Create invoice_line_items table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,

  -- Optional time tracking reference
  time_entry_ids UUID[],

  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,

  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL,
  reference TEXT,
  notes TEXT,

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TIME TRACKING
-- ============================================

-- Create time_entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Time info
  description TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER, -- calculated or manually entered

  -- Billing
  is_billable BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(10, 2),
  billed_amount DECIMAL(12, 2),
  is_invoiced BOOLEAN DEFAULT false,

  -- Relationships
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_business_position ON public.pipeline_stages(business_id, position);
CREATE INDEX IF NOT EXISTS idx_deals_business_id ON public.deals(business_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON public.deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON public.invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON public.time_entries(start_time DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Pipeline stages policies
CREATE POLICY "Users can view their business's pipeline stages"
  ON public.pipeline_stages FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage pipeline stages"
  ON public.pipeline_stages FOR ALL
  USING (business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Deals policies
CREATE POLICY "Users can view their business's deals"
  ON public.deals FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create deals"
  ON public.deals FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update deals"
  ON public.deals FOR UPDATE
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete deals"
  ON public.deals FOR DELETE
  USING (business_id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Deal activities policies
CREATE POLICY "Users can view deal activities"
  ON public.deal_activities FOR SELECT
  USING (deal_id IN (
    SELECT id FROM public.deals WHERE business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create deal activities"
  ON public.deal_activities FOR INSERT
  WITH CHECK (deal_id IN (
    SELECT id FROM public.deals WHERE business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- Invoices policies (similar pattern)
CREATE POLICY "Users can view their business's invoices"
  ON public.invoices FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage invoices"
  ON public.invoices FOR ALL
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- Invoice line items policies
CREATE POLICY "Users can view invoice line items"
  ON public.invoice_line_items FOR SELECT
  USING (invoice_id IN (
    SELECT id FROM public.invoices WHERE business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage invoice line items"
  ON public.invoice_line_items FOR ALL
  USING (invoice_id IN (
    SELECT id FROM public.invoices WHERE business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

-- Payments policies
CREATE POLICY "Users can view payments"
  ON public.payments FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage payments"
  ON public.payments FOR ALL
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- Time entries policies
CREATE POLICY "Users can view their business's time entries"
  ON public.time_entries FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their own time entries"
  ON public.time_entries FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to log deal stage changes
CREATE OR REPLACE FUNCTION log_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.stage_id != NEW.stage_id) THEN
    INSERT INTO public.deal_activities (deal_id, user_id, activity_type, old_value, new_value)
    SELECT NEW.id, auth.uid(), 'stage_changed',
           (SELECT name FROM public.pipeline_stages WHERE id = OLD.stage_id),
           (SELECT name FROM public.pipeline_stages WHERE id = NEW.stage_id);
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('won', 'lost')) THEN
    INSERT INTO public.deal_activities (deal_id, user_id, activity_type, note)
    VALUES (NEW.id, auth.uid(), NEW.status, NEW.lost_reason);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_deal_changes
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_stage_change();

-- Function to update invoice status based on due date
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS void AS $$
BEGIN
  UPDATE public.invoices
  SET status = 'overdue'
  WHERE status = 'sent'
  AND due_date < CURRENT_DATE
  AND paid_date IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Insert default pipeline stages for existing businesses
INSERT INTO public.pipeline_stages (business_id, name, color, position)
SELECT b.id, 'Lead', '#94A3B8', 1 FROM public.businesses b
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stages (business_id, name, color, position)
SELECT b.id, 'Qualified', '#3B82F6', 2 FROM public.businesses b
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stages (business_id, name, color, position)
SELECT b.id, 'Proposal', '#F59E0B', 3 FROM public.businesses b
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stages (business_id, name, color, position, is_closed_won)
SELECT b.id, 'Won', '#10B981', 4, true FROM public.businesses b
ON CONFLICT DO NOTHING;

INSERT INTO public.pipeline_stages (business_id, name, color, position, is_closed_lost)
SELECT b.id, 'Lost', '#EF4444', 5, true FROM public.businesses b
ON CONFLICT DO NOTHING;
