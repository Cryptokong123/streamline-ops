-- Task Allocation and Calendar System Enhancement
-- This migration adds support for:
-- 1. Multi-user task assignment
-- 2. Calendar/diary entries with time slots
-- 3. Shared calendar viewing across team members

-- Add time fields to tasks table for calendar integration
ALTER TABLE public.tasks
ADD COLUMN start_time TIMESTAMPTZ,
ADD COLUMN end_time TIMESTAMPTZ,
ADD COLUMN is_all_day BOOLEAN DEFAULT false,
ADD COLUMN recurrence_rule TEXT, -- iCalendar RRULE format for recurring tasks
ADD COLUMN time_estimate_minutes INTEGER; -- Estimated duration in minutes

-- Create task_assignments table for multi-user assignment (junction table)
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Create calendar_entries table for diary/calendar events
CREATE TABLE public.calendar_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  location TEXT,
  color TEXT, -- Hex color for calendar display
  recurrence_rule TEXT, -- iCalendar RRULE format
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL, -- Link to task if applicable
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create calendar_entry_attendees table for multi-user calendar entries
CREATE TABLE public.calendar_entry_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_entry_id UUID NOT NULL REFERENCES public.calendar_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, accepted, declined, tentative
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(calendar_entry_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON public.task_assignments(user_id);
CREATE INDEX idx_tasks_start_time ON public.tasks(start_time) WHERE start_time IS NOT NULL;
CREATE INDEX idx_tasks_end_time ON public.tasks(end_time) WHERE end_time IS NOT NULL;
CREATE INDEX idx_calendar_entries_business_id ON public.calendar_entries(business_id);
CREATE INDEX idx_calendar_entries_time_range ON public.calendar_entries(start_time, end_time);
CREATE INDEX idx_calendar_entry_attendees_entry_id ON public.calendar_entry_attendees(calendar_entry_id);
CREATE INDEX idx_calendar_entry_attendees_user_id ON public.calendar_entry_attendees(user_id);

-- Create trigger for updated_at on calendar_entries
CREATE TRIGGER update_calendar_entries_updated_at
  BEFORE UPDATE ON public.calendar_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_entry_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignments
-- Users can view task assignments for tasks in their business
CREATE POLICY "Users can view task assignments in their business"
  ON public.task_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.profiles p ON p.business_id = t.business_id
      WHERE t.id = task_assignments.task_id
      AND p.id = auth.uid()
    )
  );

-- Users can create task assignments in their business
CREATE POLICY "Users can create task assignments in their business"
  ON public.task_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.profiles p ON p.business_id = t.business_id
      WHERE t.id = task_assignments.task_id
      AND p.id = auth.uid()
    )
  );

-- Users can delete task assignments in their business
CREATE POLICY "Users can delete task assignments in their business"
  ON public.task_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.profiles p ON p.business_id = t.business_id
      WHERE t.id = task_assignments.task_id
      AND p.id = auth.uid()
    )
  );

-- RLS Policies for calendar_entries
-- Users can view calendar entries in their business
CREATE POLICY "Users can view calendar entries in their business"
  ON public.calendar_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.business_id = calendar_entries.business_id
      AND profiles.id = auth.uid()
    )
  );

-- Users can create calendar entries in their business
CREATE POLICY "Users can create calendar entries in their business"
  ON public.calendar_entries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.business_id = calendar_entries.business_id
      AND profiles.id = auth.uid()
    )
  );

-- Users can update their own calendar entries
CREATE POLICY "Users can update their own calendar entries"
  ON public.calendar_entries
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own calendar entries
CREATE POLICY "Users can delete their own calendar entries"
  ON public.calendar_entries
  FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for calendar_entry_attendees
-- Users can view attendees for calendar entries they can access
CREATE POLICY "Users can view attendees in their business"
  ON public.calendar_entry_attendees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_entries ce
      JOIN public.profiles p ON p.business_id = ce.business_id
      WHERE ce.id = calendar_entry_attendees.calendar_entry_id
      AND p.id = auth.uid()
    )
  );

-- Users can add attendees to calendar entries in their business
CREATE POLICY "Users can add attendees to calendar entries"
  ON public.calendar_entry_attendees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_entries ce
      JOIN public.profiles p ON p.business_id = ce.business_id
      WHERE ce.id = calendar_entry_attendees.calendar_entry_id
      AND p.id = auth.uid()
    )
  );

-- Users can update their own attendee status
CREATE POLICY "Users can update their own attendee status"
  ON public.calendar_entry_attendees
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete attendees from calendar entries they created
CREATE POLICY "Users can delete attendees from their calendar entries"
  ON public.calendar_entry_attendees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_entries
      WHERE calendar_entries.id = calendar_entry_attendees.calendar_entry_id
      AND calendar_entries.created_by = auth.uid()
    )
  );

-- Helper function to get user's assigned tasks
CREATE OR REPLACE FUNCTION get_user_assigned_tasks(target_user_id UUID)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  description TEXT,
  due_date DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status public.task_status,
  priority public.task_priority,
  business_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    t.id,
    t.title,
    t.description,
    t.due_date,
    t.start_time,
    t.end_time,
    t.status,
    t.priority,
    t.business_id
  FROM public.tasks t
  LEFT JOIN public.task_assignments ta ON t.id = ta.task_id
  WHERE (t.assigned_to = target_user_id OR ta.user_id = target_user_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.business_id = t.business_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get calendar entries for multiple users
CREATE OR REPLACE FUNCTION get_team_calendar_entries(
  user_ids UUID[],
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  entry_id UUID,
  title TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  is_all_day BOOLEAN,
  location TEXT,
  color TEXT,
  created_by UUID,
  created_by_name TEXT,
  attendee_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.title,
    ce.description,
    ce.start_time,
    ce.end_time,
    ce.is_all_day,
    ce.location,
    ce.color,
    ce.created_by,
    p.full_name,
    ARRAY_AGG(DISTINCT cea.user_id) FILTER (WHERE cea.user_id IS NOT NULL)
  FROM public.calendar_entries ce
  JOIN public.profiles p ON ce.created_by = p.id
  LEFT JOIN public.calendar_entry_attendees cea ON ce.id = cea.calendar_entry_id
  WHERE ce.start_time <= end_date
  AND ce.end_time >= start_date
  AND (
    ce.created_by = ANY(user_ids)
    OR cea.user_id = ANY(user_ids)
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles current_user
    WHERE current_user.id = auth.uid()
    AND current_user.business_id = ce.business_id
  )
  GROUP BY ce.id, p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
