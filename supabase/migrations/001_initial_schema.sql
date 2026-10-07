-- =============================================================================
-- DocuSaathi — Initial Database Migration
-- File: supabase/migrations/001_initial_schema.sql
-- Run this against your Supabase project via:
--   Dashboard → SQL Editor → paste and run
-- OR via Supabase CLI:
--   supabase db push
-- =============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
-- gen_random_uuid() is built-in on Supabase Postgres 14+
-- No extra extensions needed for this schema.


-- =============================================================================
-- TABLES
-- =============================================================================

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Mirrors auth.users. Created automatically via trigger on signup.
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT,
  email              TEXT,
  preferred_language TEXT        NOT NULL DEFAULT 'English',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── documents ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  file_name        TEXT        NOT NULL,
  file_url         TEXT,
  file_type        TEXT,
  file_size        BIGINT,

  document_type    TEXT,
  status           TEXT        NOT NULL DEFAULT 'uploaded'
                               CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),

  confidence_score NUMERIC     CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── extractions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.extractions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  field_name   TEXT        NOT NULL,
  field_value  TEXT,
  confidence   NUMERIC     CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── validation_results ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.validation_results (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  severity     TEXT        NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title        TEXT        NOT NULL,
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── deadlines ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deadlines (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  title        TEXT        NOT NULL,
  due_date     DATE,
  priority     TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  completed    BOOLEAN     NOT NULL DEFAULT FALSE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── chat_messages ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role         TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  message      TEXT        NOT NULL,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- INDEXES
-- =============================================================================

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id    ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status     ON public.documents(status);

-- extractions
CREATE INDEX IF NOT EXISTS idx_extractions_document_id ON public.extractions(document_id);

-- validation_results
CREATE INDEX IF NOT EXISTS idx_validation_results_document_id ON public.validation_results(document_id);

-- deadlines
CREATE INDEX IF NOT EXISTS idx_deadlines_document_id ON public.deadlines(document_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date    ON public.deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_completed   ON public.deadlines(completed);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_document_id ON public.chat_messages(document_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id     ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at  ON public.chat_messages(created_at);


-- =============================================================================
-- AUTO-UPDATE TRIGGERS (updated_at)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- PROFILE AUTO-CREATE TRIGGER
-- Creates a matching profile row whenever a new user signs up via Supabase Auth.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users
CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- ROW LEVEL SECURITY
-- CRITICAL: Every application table is locked down to the owning user.
-- Users can NEVER read or mutate another user's data.
-- =============================================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extractions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;


-- ─── profiles policies ───────────────────────────────────────────────────────

CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profiles are never hard-deleted (cascade from auth.users handles that)


-- ─── documents policies ──────────────────────────────────────────────────────

CREATE POLICY "documents: select own"
  ON public.documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "documents: insert own"
  ON public.documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "documents: update own"
  ON public.documents FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "documents: delete own"
  ON public.documents FOR DELETE
  USING (user_id = auth.uid());


-- ─── extractions policies ────────────────────────────────────────────────────
-- Access is tied to document ownership, not directly to user_id.
-- A user may access an extraction only if the parent document belongs to them.

CREATE POLICY "extractions: select via own document"
  ON public.extractions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = extractions.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "extractions: insert via own document"
  ON public.extractions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = extractions.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "extractions: delete via own document"
  ON public.extractions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = extractions.document_id
        AND d.user_id = auth.uid()
    )
  );


-- ─── validation_results policies ─────────────────────────────────────────────

CREATE POLICY "validation_results: select via own document"
  ON public.validation_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = validation_results.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "validation_results: insert via own document"
  ON public.validation_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = validation_results.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "validation_results: update via own document"
  ON public.validation_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = validation_results.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "validation_results: delete via own document"
  ON public.validation_results FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = validation_results.document_id
        AND d.user_id = auth.uid()
    )
  );


-- ─── deadlines policies ──────────────────────────────────────────────────────

CREATE POLICY "deadlines: select via own document"
  ON public.deadlines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = deadlines.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "deadlines: insert via own document"
  ON public.deadlines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = deadlines.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "deadlines: update via own document"
  ON public.deadlines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = deadlines.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "deadlines: delete via own document"
  ON public.deadlines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = deadlines.document_id
        AND d.user_id = auth.uid()
    )
  );


-- ─── chat_messages policies ──────────────────────────────────────────────────
-- Double check: user must own the document AND the message row must match user_id.

CREATE POLICY "chat_messages: select own"
  ON public.chat_messages FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = chat_messages.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages: insert own"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = chat_messages.document_id
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages: delete own"
  ON public.chat_messages FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = chat_messages.document_id
        AND d.user_id = auth.uid()
    )
  );


-- =============================================================================
-- STORAGE
-- =============================================================================
-- Storage buckets and policies must be created via Supabase Dashboard or CLI.
-- The SQL below creates the storage policies ONLY if you are using the
-- Supabase storage schema directly. Run these after creating the bucket.
--
-- Step 1: Dashboard → Storage → New Bucket
--   Name: documents
--   Public: OFF (private bucket)
--   File size limit: 10 MB
--   Allowed MIME types: image/jpeg, image/png, application/pdf
--
-- Step 2: Run the storage policies below.
-- =============================================================================

-- Storage policy: users can upload to their own folder only
CREATE POLICY "storage: insert own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: users can read their own files only
CREATE POLICY "storage: select own folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: users can delete their own files only
CREATE POLICY "storage: delete own folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- NOTE: UPDATE on storage objects is not needed — re-upload replaces the file.
