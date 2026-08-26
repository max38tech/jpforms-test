-- ============================================
-- Japan Form Automation Platform - Migration 0003
-- Pre-authorize users by email (admin "Add User")
-- Run in Supabase SQL Editor AFTER 0001 and 0002
-- ============================================

-- Since sign-up only happens via Google OAuth (no admin-created passwords),
-- an admin can't directly create a working login for someone who hasn't
-- signed in yet. Instead, this table lets an admin pre-authorize an email
-- with a target role (typically 'admin', for a partner/employee who hasn't
-- logged in yet). The moment that email signs in with Google for the first
-- time, handle_new_user consults this table and applies the role instead
-- of the 'user' default — then marks the invite consumed.
CREATE TABLE IF NOT EXISTS public.admin_invites (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('user', 'admin')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access invites" ON public.admin_invites FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Replace the signup trigger to check for a matching pending invite
-- (case-insensitive email match) and apply its role, then mark it consumed.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invited_role TEXT;
BEGIN
  SELECT role INTO invited_role
  FROM public.admin_invites
  WHERE lower(email) = lower(NEW.email) AND consumed_at IS NULL
  LIMIT 1;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(invited_role, 'user')
  );

  IF invited_role IS NOT NULL THEN
    UPDATE public.admin_invites
    SET consumed_at = timezone('utc'::text, now())
    WHERE lower(email) = lower(NEW.email) AND consumed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger `on_auth_user_created` from 0001 already points at this function
-- by name, so replacing the function body is sufficient — no need to
-- recreate the trigger itself.
