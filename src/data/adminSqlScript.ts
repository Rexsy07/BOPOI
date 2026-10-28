export const ADMIN_SQL_MIGRATION_SCRIPT = `-- =================================================================================
-- BOPOI — COMPLETE REAL-TIME ADMIN CONSOLE, 27-TABLE RLS & ATOMIC RPC MIGRATION
-- Tailored 100% to your exact 24-table Supabase schema
-- Safe to run multiple times (100% Idempotent)
-- Admin Access: Strictly Database-Only (profiles.is_admin = true OR role = 'admin')
-- To grant admin to your account in Supabase SQL Editor:
--   UPDATE public.profiles SET is_admin = true, role = 'admin', is_verified = true WHERE username = 'YOUR_USERNAME';
-- =================================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. EXTEND YOUR EXISTING TABLES WITH ADMIN & MODERATION COLUMNS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.community_rooms
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.moderation_reports
  ADD COLUMN IF NOT EXISTS reporter_username text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE public.moderation_reports
  DROP CONSTRAINT IF EXISTS moderation_reports_target_type_check;

ALTER TABLE public.moderation_reports
  ADD CONSTRAINT moderation_reports_target_type_check
  CHECK (
    target_type = ANY (
      ARRAY[
        'anonymous_message'::text,
        'social_post'::text,
        'post_comment'::text,
        'room_message'::text,
        'community_room'::text,
        'user'::text,
        'support_ticket'::text
      ]
    )
  );

-- 2. CREATE DEDICATED ADMIN & PLATFORM CONTROL TABLES (TABLES 25, 26, 27)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY DEFAULT 'global',
  global_blocked_words text[] NOT NULL DEFAULT ARRAY['scam', 'phishing', 'doxx']::text[],
  allow_anonymous_confessions boolean NOT NULL DEFAULT true,
  allow_new_rooms boolean NOT NULL DEFAULT true,
  maintenance_mode boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings
  DROP COLUMN IF EXISTS admin_passkey;

INSERT INTO public.platform_settings (
  id, global_blocked_words, allow_anonymous_confessions, allow_new_rooms, maintenance_mode
)
VALUES (
  'global', ARRAY['scam', 'phishing', 'doxx']::text[], true, true, false
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.campus_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  campus text NOT NULL DEFAULT 'All Campuses',
  badge_label text NOT NULL DEFAULT 'Campus Broadcast',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'celebration', 'urgent')),
  action_view text NOT NULL DEFAULT 'home',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_username text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_username text NOT NULL DEFAULT 'admin',
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. INDEXES FOR ADMIN QUERIES & MODERATION FILTERS
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles (is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles (is_suspended) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_social_posts_pinned ON public.social_posts (is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_rooms_featured ON public.community_rooms (is_featured DESC, online_count DESC);
CREATE INDEX IF NOT EXISTS idx_campus_announcements_active ON public.campus_announcements (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs (created_at DESC);

-- 4. REPLICA IDENTITY FULL & REALTIME PUBLICATION FOR ALL 27 TABLES
DO $$
DECLARE
  tbl text;
  all_27_tables text[] := ARRAY[
    'profiles', 'user_safety_settings', 'user_follows', 'social_posts',
    'poll_options', 'poll_votes', 'post_likes', 'post_bookmarks',
    'post_comments', 'post_comment_likes', 'anonymous_messages', 'message_comments',
    'message_answers', 'message_answer_likes', 'community_rooms', 'room_memberships',
    'room_assigned_personas', 'room_messages', 'room_message_likes', 'room_message_reactions',
    'notifications', 'push_subscriptions', 'moderation_reports', 'room_presence',
    'platform_settings', 'campus_announcements', 'admin_audit_logs'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY all_27_tables LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- 5. SECURITY DEFINER ROLE & SUSPENSION CHECK FUNCTIONS FOR RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (is_admin = true OR role IN ('admin', 'super_admin'))
      AND is_suspended = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_suspended()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_suspended = true
  );
$$;

-- 6. HARDENED ROW LEVEL SECURITY (RLS) & PRIVILEGE ESCALATION PROTECTION
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.is_admin := OLD.is_admin;
    NEW.role := OLD.role;
    NEW.is_verified := OLD.is_verified;
    NEW.is_suspended := OLD.is_suspended;
    NEW.suspension_reason := OLD.suspension_reason;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 6b. Prevent non-admins from self-elevating privileged columns on social_posts and community_rooms
CREATE OR REPLACE FUNCTION public.prevent_post_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.is_pinned := OLD.is_pinned;
    NEW.is_featured := OLD.is_featured;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_post_privilege_escalation ON public.social_posts;
CREATE TRIGGER trg_prevent_post_privilege_escalation
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_post_privilege_escalation();

CREATE OR REPLACE FUNCTION public.prevent_room_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.is_locked := OLD.is_locked;
    NEW.is_featured := OLD.is_featured;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_room_privilege_escalation ON public.community_rooms;
CREATE TRIGGER trg_prevent_room_privilege_escalation
  BEFORE UPDATE ON public.community_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_room_privilege_escalation();

DO $$
DECLARE
  tbl text;
  all_27_tables text[] := ARRAY[
    'profiles', 'user_safety_settings', 'user_follows', 'social_posts',
    'poll_options', 'poll_votes', 'post_likes', 'post_bookmarks',
    'post_comments', 'post_comment_likes', 'anonymous_messages', 'message_comments',
    'message_answers', 'message_answer_likes', 'community_rooms', 'room_memberships',
    'room_assigned_personas', 'room_messages', 'room_message_likes', 'room_message_reactions',
    'notifications', 'push_subscriptions', 'moderation_reports', 'room_presence',
    'platform_settings', 'campus_announcements', 'admin_audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_27_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Active non-suspended access on %I" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Admins have full control on %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Admins have full control on %I" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())',
      tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS "Restrict suspended users on %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Restrict suspended users on %I" ON public.%I AS RESTRICTIVE FOR ALL USING (NOT public.is_user_suspended()) WITH CHECK (NOT public.is_user_suspended())',
      tbl, tbl
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public read platform settings" ON public.platform_settings;
CREATE POLICY "Public read platform settings" ON public.platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active campus announcements" ON public.campus_announcements;
CREATE POLICY "Public read active campus announcements" ON public.campus_announcements FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Users manage own safety settings" ON public.user_safety_settings;
CREATE POLICY "Users manage own safety settings" ON public.user_safety_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view anonymous messages" ON public.anonymous_messages;
DROP POLICY IF EXISTS "Participants can view own anonymous messages" ON public.anonymous_messages;
CREATE POLICY "Participants can view own anonymous messages" ON public.anonymous_messages FOR SELECT USING (
  auth.uid() IS NOT NULL AND (auth.uid() = recipient_user_id OR auth.uid() = sender_user_id)
);
DROP POLICY IF EXISTS "Recipients can update anonymous messages" ON public.anonymous_messages;
CREATE POLICY "Recipients can update anonymous messages" ON public.anonymous_messages FOR UPDATE USING (auth.uid() = recipient_user_id) WITH CHECK (auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "Anyone can view message comments" ON public.message_comments;
DROP POLICY IF EXISTS "Participants can view message comments" ON public.message_comments;
CREATE POLICY "Participants can view message comments" ON public.message_comments FOR SELECT USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.anonymous_messages m
    WHERE m.id = message_comments.message_id
      AND (m.recipient_user_id = auth.uid() OR m.sender_user_id = auth.uid())
  )
);

-- 7. REMOVE LEGACY PASSKEY SELF-ELEVATION FUNCTION (STRICT DATABASE-ONLY ADMIN)
DROP FUNCTION IF EXISTS public.admin_unlock_with_passkey(text);

-- 8. HIGH-CONCURRENCY COMPOSITE INDEXES FOR MAXIMUM USERS
CREATE INDEX IF NOT EXISTS idx_social_posts_feed_sort ON public.social_posts (is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_type_created ON public.social_posts (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created ON public.post_comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_created ON public.room_messages (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_recipient_created ON public.anonymous_messages (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications (recipient_user_id, is_read, created_at DESC);
`;

