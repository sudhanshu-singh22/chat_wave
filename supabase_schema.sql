-- ============================================================
-- ChatWave — Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 1. USERS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY,               -- matches auth.users.id
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast name search
CREATE INDEX IF NOT EXISTS users_name_idx ON public.users USING GIN (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- ── 2. MESSAGES TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content      TEXT,                          -- NULL for file-only messages
  file_url     TEXT,                          -- Supabase Storage URL for files
  file_name    TEXT,                          -- Original file name
  file_type    TEXT,                          -- MIME type (e.g., image/png)
  file_size    INTEGER,                       -- File size in bytes
  read_at      TIMESTAMPTZ,                   -- NULL = unread
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce: must have either content or file_url
ALTER TABLE public.messages
  ADD CONSTRAINT message_content_or_file
  CHECK ((content IS NOT NULL AND CHAR_LENGTH(TRIM(content)) > 0) OR file_url IS NOT NULL);

-- Indexes for fast conversation queries
CREATE INDEX IF NOT EXISTS messages_sender_idx   ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_idx  ON public.messages (created_at DESC);

-- Composite index for conversation lookups
CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON public.messages (sender_id, receiver_id, created_at DESC);

-- ── 3. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users: anyone authenticated can read; only the owner can update their own row
CREATE POLICY "Users are viewable by authenticated users"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Messages: users can only see messages they sent or received
CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages they send"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read_at on received messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- ── 4. FUNCTION: auto-create user profile on signup ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: fires after a new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. STORAGE: File uploads ────────────────────────────────────
-- NOTE: Run this in Supabase Dashboard → Storage → New Bucket
-- CREATE BUCKET chat-files (PUBLIC)

-- ── STORAGE ROW LEVEL SECURITY ──────────────────────────────────
-- Enable RLS on storage.objects
-- CREATE POLICY "Users can upload their own files"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can download files"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'chat-files');

-- ── DONE ─────────────────────────────────────────────────────
-- Your schema is ready! 🎉
-- NEXT: Create storage bucket 'chat-files' in Supabase Dashboard
