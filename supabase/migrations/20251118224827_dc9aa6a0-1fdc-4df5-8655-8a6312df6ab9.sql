-- Create invites table
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role DEFAULT 'staff',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, email, status)
);

-- Enable RLS on invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invites
CREATE POLICY "Users can view invites for their business"
  ON public.invites FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own pending invites"
  ON public.invites FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  );

CREATE POLICY "Admins can create invites"
  ON public.invites FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update their own invites"
  ON public.invites FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can delete invites"
  ON public.invites FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile without business_id
  -- User will need to accept an invite to get access
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'staff'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to accept invite
CREATE OR REPLACE FUNCTION public.accept_invite(invite_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Get invite details
  SELECT * INTO v_invite 
  FROM public.invites 
  WHERE id = invite_id 
    AND email = v_user_email
    AND status = 'pending'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired invite');
  END IF;
  
  -- Update profile with business_id and role
  UPDATE public.profiles
  SET 
    business_id = v_invite.business_id,
    role = v_invite.role,
    updated_at = NOW()
  WHERE id = auth.uid();
  
  -- Mark invite as accepted
  UPDATE public.invites
  SET status = 'accepted'
  WHERE id = invite_id;
  
  RETURN jsonb_build_object('success', true, 'business_id', v_invite.business_id);
END;
$$;

-- Add index for performance
CREATE INDEX idx_invites_email_status ON public.invites(email, status) WHERE status = 'pending';
CREATE INDEX idx_invites_business_id ON public.invites(business_id);

-- Update profiles table to make business_id nullable (for users waiting for invite)
-- This was already nullable, but let's ensure the RLS policies work correctly

-- Update RLS policy for profiles to allow users to view their own profile even without business
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Update RLS policy for profiles to allow viewing profiles in same business
DROP POLICY IF EXISTS "Users can view profiles in their business" ON public.profiles;
CREATE POLICY "Users can view profiles in their business"
  ON public.profiles FOR SELECT
  USING (
    business_id IS NOT NULL 
    AND business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );