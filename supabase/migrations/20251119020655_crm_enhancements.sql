-- CRM System Enhancements
-- This migration adds:
-- 1. Task notes/comments system
-- 2. Notifications and activity tracking
-- 3. @mentions/tagging system
-- 4. Business customization settings
-- 5. Task history/audit log

-- Task comments/notes table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- Array of user IDs mentioned in comment
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task activity/history log
CREATE TABLE public.task_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- created, updated, completed, assigned, commented, etc.
  changes JSONB DEFAULT '{}', -- Old and new values
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Recipient
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who triggered it
  type TEXT NOT NULL, -- mention, assignment, task_update, comment, etc.
  title TEXT NOT NULL,
  message TEXT,
  link TEXT, -- URL to the relevant item
  reference_type TEXT, -- task, calendar_entry, contact, etc.
  reference_id UUID, -- ID of the referenced item
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact comments/notes
CREATE TABLE public.contact_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Property comments/notes
CREATE TABLE public.property_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expand business settings for customization
-- Update existing businesses table to add module_labels
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS module_labels JSONB DEFAULT '{
  "contacts": "Contacts",
  "properties": "Properties",
  "tasks": "Tasks",
  "calendar": "Calendar",
  "documents": "Documents"
}'::jsonb;

-- Add custom fields configuration for each module
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS contacts_custom_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS properties_custom_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tasks_custom_fields JSONB DEFAULT '[]'::jsonb;

-- Indexes for performance
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);
CREATE INDEX idx_task_comments_created_at ON public.task_comments(created_at DESC);

CREATE INDEX idx_task_activity_task_id ON public.task_activity(task_id);
CREATE INDEX idx_task_activity_created_at ON public.task_activity(created_at DESC);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_business_id ON public.notifications(business_id);

CREATE INDEX idx_contact_comments_contact_id ON public.contact_comments(contact_id);
CREATE INDEX idx_property_comments_property_id ON public.property_comments(property_id);

-- Triggers for updated_at
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_comments_updated_at
  BEFORE UPDATE ON public.contact_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_comments_updated_at
  BEFORE UPDATE ON public.property_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments in their business"
  ON public.task_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.profiles p ON p.business_id = t.business_id
      WHERE t.id = task_comments.task_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments on tasks in their business"
  ON public.task_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.profiles p ON p.business_id = t.business_id
      WHERE t.id = task_comments.task_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.task_comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.task_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for task_activity
CREATE POLICY "Users can view activity in their business"
  ON public.task_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.profiles p ON p.business_id = t.business_id
      WHERE t.id = task_activity.task_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "System can create activity logs"
  ON public.task_activity
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create notifications in their business"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.business_id = notifications.business_id
      AND profiles.id = auth.uid()
    )
  );

-- RLS Policies for contact_comments
CREATE POLICY "Users can view contact comments in their business"
  ON public.contact_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      JOIN public.profiles p ON p.business_id = c.business_id
      WHERE c.id = contact_comments.contact_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create contact comments in their business"
  ON public.contact_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts c
      JOIN public.profiles p ON p.business_id = c.business_id
      WHERE c.id = contact_comments.contact_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own contact comments"
  ON public.contact_comments
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own contact comments"
  ON public.contact_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for property_comments (similar pattern)
CREATE POLICY "Users can view property comments in their business"
  ON public.property_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties prop
      JOIN public.profiles p ON p.business_id = prop.business_id
      WHERE prop.id = property_comments.property_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create property comments in their business"
  ON public.property_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties prop
      JOIN public.profiles p ON p.business_id = prop.business_id
      WHERE prop.id = property_comments.property_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own property comments"
  ON public.property_comments
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own property comments"
  ON public.property_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- Function to create notification when mentioned
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user UUID;
  task_title TEXT;
  actor_name TEXT;
BEGIN
  -- Get task title and actor name
  SELECT t.title, p.full_name INTO task_title, actor_name
  FROM public.tasks t
  LEFT JOIN public.profiles p ON p.id = NEW.user_id
  WHERE t.id = NEW.task_id;

  -- Create notification for each mentioned user
  IF NEW.mentions IS NOT NULL THEN
    FOREACH mentioned_user IN ARRAY NEW.mentions
    LOOP
      INSERT INTO public.notifications (
        business_id,
        user_id,
        actor_id,
        type,
        title,
        message,
        link,
        reference_type,
        reference_id
      )
      SELECT
        t.business_id,
        mentioned_user,
        NEW.user_id,
        'mention',
        actor_name || ' mentioned you in a comment',
        LEFT(NEW.content, 200),
        '/tasks/' || NEW.task_id,
        'task',
        NEW.task_id
      FROM public.tasks t
      WHERE t.id = NEW.task_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for mention notifications
CREATE TRIGGER task_comment_mentions_trigger
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notifications();

-- Function to log task activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.task_activity (task_id, user_id, action, changes)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('old', OLD.status, 'new', NEW.status)
    );
  END IF;

  -- Log assignment changes
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.task_activity (task_id, user_id, action, changes)
    VALUES (
      NEW.id,
      auth.uid(),
      'assignment_changed',
      jsonb_build_object('old', OLD.assigned_to, 'new', NEW.assigned_to)
    );

    -- Create notification for newly assigned user
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (
        business_id,
        user_id,
        actor_id,
        type,
        title,
        message,
        link,
        reference_type,
        reference_id
      )
      VALUES (
        NEW.business_id,
        NEW.assigned_to,
        auth.uid(),
        'assignment',
        'You were assigned a task',
        NEW.title,
        '/tasks/' || NEW.id,
        'task',
        NEW.id
      );
    END IF;
  END IF;

  -- Log priority changes
  IF TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.task_activity (task_id, user_id, action, changes)
    VALUES (
      NEW.id,
      auth.uid(),
      'priority_changed',
      jsonb_build_object('old', OLD.priority, 'new', NEW.priority)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for task activity logging
CREATE TRIGGER task_activity_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(target_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = target_user_id
    AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
