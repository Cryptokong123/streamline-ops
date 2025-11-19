-- Create calendar_entries table
CREATE TABLE public.calendar_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_all_day BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar_entry_attendees table
CREATE TABLE public.calendar_entry_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_entry_id UUID NOT NULL REFERENCES public.calendar_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(calendar_entry_id, user_id)
);

-- Create task_assignments table
CREATE TABLE public.task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_entry_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_entries
CREATE POLICY "Users can view calendar entries in their business"
ON public.calendar_entries FOR SELECT
TO authenticated
USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Users can create calendar entries in their business"
ON public.calendar_entries FOR INSERT
TO authenticated
WITH CHECK (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Users can update calendar entries in their business"
ON public.calendar_entries FOR UPDATE
TO authenticated
USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Users can delete calendar entries in their business"
ON public.calendar_entries FOR DELETE
TO authenticated
USING (business_id = get_user_business_id(auth.uid()));

-- RLS Policies for calendar_entry_attendees
CREATE POLICY "Users can view attendees in their business calendar"
ON public.calendar_entry_attendees FOR SELECT
TO authenticated
USING (calendar_entry_id IN (
  SELECT id FROM calendar_entries WHERE business_id = get_user_business_id(auth.uid())
));

CREATE POLICY "Users can add attendees to calendar entries"
ON public.calendar_entry_attendees FOR INSERT
TO authenticated
WITH CHECK (calendar_entry_id IN (
  SELECT id FROM calendar_entries WHERE business_id = get_user_business_id(auth.uid())
));

CREATE POLICY "Users can update attendee status"
ON public.calendar_entry_attendees FOR UPDATE
TO authenticated
USING (calendar_entry_id IN (
  SELECT id FROM calendar_entries WHERE business_id = get_user_business_id(auth.uid())
));

CREATE POLICY "Users can remove attendees"
ON public.calendar_entry_attendees FOR DELETE
TO authenticated
USING (calendar_entry_id IN (
  SELECT id FROM calendar_entries WHERE business_id = get_user_business_id(auth.uid())
));

-- RLS Policies for task_assignments
CREATE POLICY "Users can view task assignments in their business"
ON public.task_assignments FOR SELECT
TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE business_id = get_user_business_id(auth.uid())
));

CREATE POLICY "Users can create task assignments"
ON public.task_assignments FOR INSERT
TO authenticated
WITH CHECK (task_id IN (
  SELECT id FROM tasks WHERE business_id = get_user_business_id(auth.uid())
));

CREATE POLICY "Users can delete task assignments"
ON public.task_assignments FOR DELETE
TO authenticated
USING (task_id IN (
  SELECT id FROM tasks WHERE business_id = get_user_business_id(auth.uid())
));

-- Create RPC function for team calendar
CREATE OR REPLACE FUNCTION public.get_team_calendar_entries(
  user_ids UUID[],
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  title TEXT,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  is_all_day BOOLEAN,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ce.*
  FROM calendar_entries ce
  INNER JOIN calendar_entry_attendees cea ON ce.id = cea.calendar_entry_id
  WHERE cea.user_id = ANY(user_ids)
    AND ce.start_time >= start_date
    AND ce.end_time <= end_date
    AND ce.business_id = get_user_business_id(auth.uid())
  GROUP BY ce.id;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_calendar_entries_updated_at
BEFORE UPDATE ON public.calendar_entries
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_calendar_entry_attendees_updated_at
BEFORE UPDATE ON public.calendar_entry_attendees
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();