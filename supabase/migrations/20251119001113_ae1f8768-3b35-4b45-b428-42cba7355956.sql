-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles in their business" ON profiles;

-- Create a security definer function to get user's business_id without recursion
CREATE OR REPLACE FUNCTION public.get_user_business_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM profiles WHERE id = user_id;
$$;

-- Recreate the policy using the function
CREATE POLICY "Users can view profiles in their business"
ON profiles
FOR SELECT
TO authenticated
USING (
  business_id IS NOT NULL 
  AND business_id = public.get_user_business_id(auth.uid())
);