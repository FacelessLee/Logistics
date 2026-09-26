-- =============================================================================
-- NAVITHON LOGISTICS: SUPABASE DATABASE INITIALIZATION SCHEMA
-- Project URL: https://uyrcahtnftskxiowpime.supabase.co
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/uyrcahtnftskxiowpime/sql/new
-- 2. Paste the SQL statements below into the SQL Editor.
-- 3. Click "RUN" to initialize all tables, indexes, and security policies.
-- =============================================================================

-- 1. CONSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.consignments (
  tracking_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  origin_location TEXT,
  destination_location TEXT,
  current_location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consignments_status ON public.consignments(status);
CREATE INDEX IF NOT EXISTS idx_consignments_updated_at ON public.consignments(updated_at DESC);

-- 2. CHAT CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  status TEXT DEFAULT 'ACTIVE',
  unread_count_agent INT DEFAULT 0,
  unread_count_visitor INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_visitor_id ON public.conversations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);

-- 3. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  sender_name TEXT,
  text TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false,
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp ASC);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS and grant complete read/write access to publishable/anon and authenticated clients
ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on consignments" ON public.consignments;
CREATE POLICY "Allow public all on consignments" 
  ON public.consignments FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on conversations" ON public.conversations;
CREATE POLICY "Allow public all on conversations" 
  ON public.conversations FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on messages" ON public.messages;
CREATE POLICY "Allow public all on messages" 
  ON public.messages FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);
