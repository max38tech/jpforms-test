-- ============================================
-- Japan Form Automation Platform - Migration 0004
-- Site-wide language preference
-- Run in Supabase SQL Editor AFTER 0001, 0002, 0003
-- ============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en'
  CHECK (preferred_language IN ('en', 'ja', 'vi', 'zh', 'ko'));
