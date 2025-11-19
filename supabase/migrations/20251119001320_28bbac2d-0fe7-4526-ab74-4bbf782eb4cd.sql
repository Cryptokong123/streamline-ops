-- Add color field to calendar_entries
ALTER TABLE public.calendar_entries 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- Create function to get user's assigned tasks with explicit column ordering
CREATE OR REPLACE FUNCTION public.get_user_assigned_tasks(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  business_id UUID,
  title TEXT,
  description TEXT,
  status task_status,
  priority task_priority,
  due_date DATE,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  property_id UUID,
  contact_id UUID,
  custom_fields JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.business_id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.assigned_to,
    t.created_by,
    t.created_at,
    t.updated_at,
    t.property_id,
    t.contact_id,
    t.custom_fields
  FROM tasks t
  LEFT JOIN task_assignments ta ON t.id = ta.task_id
  WHERE (t.assigned_to = target_user_id OR ta.user_id = target_user_id)
    AND t.business_id = get_user_business_id(auth.uid())
  GROUP BY t.id
  ORDER BY t.created_at DESC;
$$;