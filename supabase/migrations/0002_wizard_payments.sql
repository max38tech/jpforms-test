-- ============================================
-- Japan Form Automation Platform - Migration 0002
-- Wizard save/resume, page-based Stripe payments
-- Run in Supabase SQL Editor AFTER 0001_init.sql
-- ============================================

-- How many A4 pages a completed form prints as. Admin sets this per form;
-- used to calculate the one-time price (500 JPY/page) and subscription
-- page consumption.
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS page_count INT NOT NULL DEFAULT 1;

-- Wizard save/resume support + payment linkage on submissions.
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS current_step INT NOT NULL DEFAULT 0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Users need to UPDATE their own draft submissions (save progress) — this
-- policy was missing in 0001 (only SELECT + INSERT existed), which would
-- have silently blocked all wizard autosave calls.
DROP POLICY IF EXISTS "Users can update own submissions" ON public.submissions;
CREATE POLICY "Users can update own submissions" ON public.submissions FOR UPDATE USING (auth.uid() = user_id);

-- ---- Payments & entitlements ----

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('one_time', 'subscription')),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  amount_jpy INT NOT NULL,
  pages_granted INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Rolling page-credit ledger. One-time purchases insert a positive row;
-- consuming a download for an N-page form inserts a negative row. Weekly
-- subscription grants insert a positive row each renewal with an
-- expires_at so unused pages don't roll over past the week.
CREATE TABLE IF NOT EXISTS public.page_credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  delta INT NOT NULL,
  reason TEXT NOT NULL, -- 'purchase_one_time' | 'purchase_subscription' | 'consume_download' | 'admin_grant'
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own page credits" ON public.page_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins full access payments" ON public.payments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access page credits" ON public.page_credits FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access subscriptions" ON public.subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Note: writes to payments/page_credits/subscriptions in normal app flow go
-- through the Stripe webhook and API routes using the service-role admin
-- client, which bypasses RLS by design — these policies exist so a user's
-- own browser session can read their balance/history directly if needed.

-- Current available page credit balance for a user (sum of non-expired ledger deltas).
CREATE OR REPLACE FUNCTION public.get_page_balance(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(delta), 0)::INT
  FROM public.page_credits
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());
$$;
