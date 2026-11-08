-- =================================================================================
-- BOPOI — COMPLETE REAL-TIME ADMIN CONSOLE, 27-TABLE RLS & ATOMIC RPC MIGRATION
-- Tailored 100% to your exact 24-table Supabase schema
-- Safe to run multiple times (100% Idempotent)
-- Admin Access: Strictly Database-Only (profiles.is_admin = true OR role = 'admin')
-- To grant admin to your account in Supabase SQL Editor:
--   UPDATE public.profiles SET is_admin = true, role = 'admin', is_verified = true WHERE username = 'YOUR_USERNAME';
-- =================================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =================================================================================
-- 1. EXTEND YOUR EXISTING TABLES WITH ADMIN & MODERATION COLUMNS
-- =================================================================================
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
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.moderation_reports
  ADD COLUMN IF NOT EXISTS reporter_username text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Expand moderation_reports target_type check to support rooms & support tickets
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

-- =================================================================================
-- 2. CREATE DEDICATED ADMIN & PLATFORM CONTROL TABLES (TABLES 25, 26, 27)
-- =================================================================================

-- 25. public.platform_settings (Singleton global configuration & word filters)
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
  id,
  global_blocked_words,
  allow_anonymous_confessions,
  allow_new_rooms,
  maintenance_mode
)
VALUES (
  'global',
  ARRAY['scam', 'phishing', 'doxx']::text[],
  true,
  true,
  false
)
ON CONFLICT (id) DO NOTHING;

-- 26. public.campus_announcements (Live campus-wide banners & system broadcasts)
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

-- 27. public.admin_audit_logs (Real-time immutable stream of every admin action)
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

-- =================================================================================
-- 3. INDEXES FOR ADMIN QUERIES & MODERATION FILTERS
-- =================================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles (is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles (is_suspended) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_social_posts_pinned ON public.social_posts (is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_rooms_featured ON public.community_rooms (is_featured DESC, online_count DESC);
CREATE INDEX IF NOT EXISTS idx_campus_announcements_active ON public.campus_announcements (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs (created_at DESC);

-- =================================================================================
-- 4. REPLICA IDENTITY FULL & REALTIME PUBLICATION FOR ALL 27 TABLES
-- =================================================================================
DO $$
DECLARE
  tbl text;
  all_27_tables text[] := ARRAY[
    'profiles',
    'user_safety_settings',
    'user_follows',
    'social_posts',
    'poll_options',
    'poll_votes',
    'post_likes',
    'post_bookmarks',
    'post_comments',
    'post_comment_likes',
    'anonymous_messages',
    'message_comments',
    'message_answers',
    'message_answer_likes',
    'community_rooms',
    'room_memberships',
    'room_assigned_personas',
    'room_messages',
    'room_message_likes',
    'room_message_reactions',
    'notifications',
    'push_subscriptions',
    'moderation_reports',
    'room_presence',
    'platform_settings',
    'campus_announcements',
    'admin_audit_logs'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY all_27_tables LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- =================================================================================
-- 5. SECURITY DEFINER ROLE & SUSPENSION CHECK FUNCTIONS FOR RLS
-- =================================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (is_admin = true OR role IN ('admin', 'super_admin'))
      AND is_suspended = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_suspended = true
  );
$$;

-- =================================================================================
-- 6. HARDENED ROW LEVEL SECURITY (RLS) & PRIVILEGE ESCALATION PROTECTION
-- =================================================================================

-- 6.1 Prevent non-admins from self-elevating privileged columns on public.profiles
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

-- 6.1b Prevent non-admins from self-elevating privileged columns on social_posts and community_rooms
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
    'profiles',
    'user_safety_settings',
    'user_follows',
    'social_posts',
    'poll_options',
    'poll_votes',
    'post_likes',
    'post_bookmarks',
    'post_comments',
    'post_comment_likes',
    'anonymous_messages',
    'message_comments',
    'message_answers',
    'message_answer_likes',
    'community_rooms',
    'room_memberships',
    'room_assigned_personas',
    'room_messages',
    'room_message_likes',
    'room_message_reactions',
    'notifications',
    'push_subscriptions',
    'moderation_reports',
    'room_presence',
    'platform_settings',
    'campus_announcements',
    'admin_audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_27_tables LOOP
    -- Enable RLS on every table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- Remove legacy overly-permissive policy if present
    EXECUTE format('DROP POLICY IF EXISTS "Active non-suspended access on %I" ON public.%I', tbl, tbl);

    -- Universal Admin Full-Control Policy (SELECT, INSERT, UPDATE, DELETE)
    EXECUTE format('DROP POLICY IF EXISTS "Admins have full control on %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Admins have full control on %I" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())',
      tbl,
      tbl
    );

    -- Restrictive Suspension Guard: blocks suspended accounts across all operations without granting permissive access
    EXECUTE format('DROP POLICY IF EXISTS "Restrict suspended users on %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Restrict suspended users on %I" ON public.%I AS RESTRICTIVE FOR ALL USING (NOT public.is_user_suspended()) WITH CHECK (NOT public.is_user_suspended())',
      tbl,
      tbl
    );
  END LOOP;
END $$;

-- 6.2 Least-Privilege Policies for Admin & System Configuration Tables
DROP POLICY IF EXISTS "Public read platform settings" ON public.platform_settings;
CREATE POLICY "Public read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read active campus announcements" ON public.campus_announcements;
CREATE POLICY "Public read active campus announcements"
  ON public.campus_announcements FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can submit moderation reports" ON public.moderation_reports;
CREATE POLICY "Authenticated users can submit moderation reports"
  ON public.moderation_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (reporter_user_id IS NULL OR reporter_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own moderation reports" ON public.moderation_reports;
CREATE POLICY "Users can view own moderation reports"
  ON public.moderation_reports FOR SELECT
  USING (reporter_user_id = auth.uid() OR public.is_admin());

-- 6.3 Owner-Scoped Policies Across All User, Social, Inbox & Room Tables
DO $$
BEGIN
  -- profiles
  DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

  -- user_safety_settings, push_subscriptions, notifications
  DROP POLICY IF EXISTS "Users manage own safety settings" ON public.user_safety_settings;
  CREATE POLICY "Users manage own safety settings" ON public.user_safety_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
  CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users read and update own notifications" ON public.notifications;
  CREATE POLICY "Users read and update own notifications" ON public.notifications FOR ALL USING (auth.uid() = recipient_user_id) WITH CHECK (auth.uid() = recipient_user_id);

  -- user_follows
  DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
  CREATE POLICY "Anyone can view follows" ON public.user_follows FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Authenticated users manage follows" ON public.user_follows;
  CREATE POLICY "Authenticated users manage follows" ON public.user_follows FOR ALL USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

  -- social_posts
  DROP POLICY IF EXISTS "Anyone can view social posts" ON public.social_posts;
  CREATE POLICY "Anyone can view social posts" ON public.social_posts FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Anyone can create social posts" ON public.social_posts;
  DROP POLICY IF EXISTS "Authenticated users can create social posts" ON public.social_posts;
  CREATE POLICY "Authenticated users can create social posts" ON public.social_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (author_user_id IS NULL OR author_user_id = auth.uid()));
  DROP POLICY IF EXISTS "Anyone can update social posts" ON public.social_posts;
  DROP POLICY IF EXISTS "Authors can update own social posts" ON public.social_posts;
  CREATE POLICY "Authors can update own social posts" ON public.social_posts FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = author_user_id) WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_user_id);
  DROP POLICY IF EXISTS "Authors can delete own social posts" ON public.social_posts;
  CREATE POLICY "Authors can delete own social posts" ON public.social_posts FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = author_user_id);

  -- poll_options & poll_votes
  DROP POLICY IF EXISTS "Anyone can view poll options" ON public.poll_options;
  CREATE POLICY "Anyone can view poll options" ON public.poll_options FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Anyone can insert poll options" ON public.poll_options;
  DROP POLICY IF EXISTS "Post authors can insert poll options" ON public.poll_options;
  CREATE POLICY "Post authors can insert poll options" ON public.poll_options FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.social_posts p WHERE p.id = poll_options.post_id AND p.author_user_id = auth.uid()
    )
  );
  DROP POLICY IF EXISTS "Anyone can update poll options" ON public.poll_options;
  DROP POLICY IF EXISTS "Post authors can update poll options" ON public.poll_options;
  CREATE POLICY "Post authors can update poll options" ON public.poll_options FOR UPDATE USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.social_posts p WHERE p.id = poll_options.post_id AND p.author_user_id = auth.uid()
    )
  );

  DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.poll_votes;
  CREATE POLICY "Anyone can view poll votes" ON public.poll_votes FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Users can vote on polls" ON public.poll_votes;
  CREATE POLICY "Users can vote on polls" ON public.poll_votes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- post_likes & post_bookmarks
  DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;
  CREATE POLICY "Anyone can view post likes" ON public.post_likes FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Users can manage post likes" ON public.post_likes;
  CREATE POLICY "Users can manage post likes" ON public.post_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.post_bookmarks;
  CREATE POLICY "Users manage own bookmarks" ON public.post_bookmarks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- post_comments & post_comment_likes
  DROP POLICY IF EXISTS "Anyone can view post comments" ON public.post_comments;
  CREATE POLICY "Anyone can view post comments" ON public.post_comments FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Anyone can insert post comments" ON public.post_comments;
  DROP POLICY IF EXISTS "Authenticated users can insert post comments" ON public.post_comments;
  CREATE POLICY "Authenticated users can insert post comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (author_user_id IS NULL OR author_user_id = auth.uid()));
  DROP POLICY IF EXISTS "Anyone can update post comments" ON public.post_comments;
  DROP POLICY IF EXISTS "Authors can update own post comments" ON public.post_comments;
  CREATE POLICY "Authors can update own post comments" ON public.post_comments FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = author_user_id) WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_user_id);
  DROP POLICY IF EXISTS "Authors can delete own post comments" ON public.post_comments;
  CREATE POLICY "Authors can delete own post comments" ON public.post_comments FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = author_user_id);

  DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.post_comment_likes;
  CREATE POLICY "Anyone can view comment likes" ON public.post_comment_likes FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Users manage comment likes" ON public.post_comment_likes;
  CREATE POLICY "Users manage comment likes" ON public.post_comment_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- anonymous_messages (strictly private to recipient & authenticated sender)
  DROP POLICY IF EXISTS "Anyone can send anonymous messages" ON public.anonymous_messages;
  CREATE POLICY "Anyone can send anonymous messages" ON public.anonymous_messages FOR INSERT WITH CHECK (sender_user_id IS NULL OR sender_user_id = auth.uid());
  DROP POLICY IF EXISTS "Anyone can view anonymous messages" ON public.anonymous_messages;
  DROP POLICY IF EXISTS "Participants can view own anonymous messages" ON public.anonymous_messages;
  CREATE POLICY "Participants can view own anonymous messages" ON public.anonymous_messages FOR SELECT USING (
    auth.uid() IS NOT NULL AND (auth.uid() = recipient_user_id OR auth.uid() = sender_user_id)
  );
  DROP POLICY IF EXISTS "Recipients can update anonymous messages" ON public.anonymous_messages;
  CREATE POLICY "Recipients can update anonymous messages" ON public.anonymous_messages FOR UPDATE USING (auth.uid() = recipient_user_id) WITH CHECK (auth.uid() = recipient_user_id);
  DROP POLICY IF EXISTS "Recipients can delete anonymous messages" ON public.anonymous_messages;
  CREATE POLICY "Recipients can delete anonymous messages" ON public.anonymous_messages FOR DELETE USING (auth.uid() = recipient_user_id);

  -- message_comments (strictly private to participants of the parent anonymous_message)
  DROP POLICY IF EXISTS "Anyone can view message comments" ON public.message_comments;
  DROP POLICY IF EXISTS "Participants can view message comments" ON public.message_comments;
  CREATE POLICY "Participants can view message comments" ON public.message_comments FOR SELECT USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.anonymous_messages m
      WHERE m.id = message_comments.message_id
        AND (m.recipient_user_id = auth.uid() OR m.sender_user_id = auth.uid())
    )
  );
  DROP POLICY IF EXISTS "Anyone can insert message comments" ON public.message_comments;
  DROP POLICY IF EXISTS "Participants can insert message comments" ON public.message_comments;
  CREATE POLICY "Participants can insert message comments" ON public.message_comments FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (author_user_id IS NULL OR author_user_id = auth.uid()) AND EXISTS (
      SELECT 1 FROM public.anonymous_messages m
      WHERE m.id = message_comments.message_id
        AND (m.recipient_user_id = auth.uid() OR m.sender_user_id = auth.uid())
    )
  );
  DROP POLICY IF EXISTS "Anyone can update message comments" ON public.message_comments;
  DROP POLICY IF EXISTS "Authors can update own message comments" ON public.message_comments;
  CREATE POLICY "Authors can update own message comments" ON public.message_comments FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = author_user_id) WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_user_id);

  -- message_answers & message_answer_likes
  DROP POLICY IF EXISTS "Anyone can view message answers" ON public.message_answers;
  CREATE POLICY "Anyone can view message answers" ON public.message_answers FOR SELECT USING (
    (is_public = true AND is_draft = false) OR auth.uid() = author_user_id
  );
  DROP POLICY IF EXISTS "Authors manage message answers" ON public.message_answers;
  CREATE POLICY "Authors manage message answers" ON public.message_answers FOR ALL USING (auth.uid() = author_user_id) WITH CHECK (auth.uid() = author_user_id);

  DROP POLICY IF EXISTS "Anyone can view answer likes" ON public.message_answer_likes;
  CREATE POLICY "Anyone can view answer likes" ON public.message_answer_likes FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Users manage answer likes" ON public.message_answer_likes;
  CREATE POLICY "Users manage answer likes" ON public.message_answer_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- community_rooms, memberships, personas, messages, likes, reactions, presence
  DROP POLICY IF EXISTS "Anyone can view community rooms" ON public.community_rooms;
  CREATE POLICY "Anyone can view community rooms" ON public.community_rooms FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Anyone can create community rooms" ON public.community_rooms;
  DROP POLICY IF EXISTS "Authenticated users can create community rooms" ON public.community_rooms;
  CREATE POLICY "Authenticated users can create community rooms" ON public.community_rooms FOR INSERT WITH CHECK (creator_user_id IS NULL OR creator_user_id = auth.uid());
  DROP POLICY IF EXISTS "Anyone can update community rooms" ON public.community_rooms;
  DROP POLICY IF EXISTS "Creators can update community rooms" ON public.community_rooms;
  DROP POLICY IF EXISTS "Users can update room icons and metadata" ON public.community_rooms;
  CREATE POLICY "Creators can update community rooms" ON public.community_rooms FOR UPDATE USING (creator_user_id IS NULL OR auth.uid() = creator_user_id OR public.is_admin()) WITH CHECK (creator_user_id IS NULL OR auth.uid() = creator_user_id OR public.is_admin());
  DROP POLICY IF EXISTS "Creators can delete community rooms" ON public.community_rooms;
  CREATE POLICY "Creators can delete community rooms" ON public.community_rooms FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = creator_user_id);

  DROP POLICY IF EXISTS "Anyone can manage room memberships" ON public.room_memberships;
  DROP POLICY IF EXISTS "Anyone can view room memberships" ON public.room_memberships;
  DROP POLICY IF EXISTS "Users manage own room memberships" ON public.room_memberships;
  CREATE POLICY "Anyone can view room memberships" ON public.room_memberships FOR SELECT USING (true);
  CREATE POLICY "Users manage own room memberships" ON public.room_memberships FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Anyone can manage room personas" ON public.room_assigned_personas;
  DROP POLICY IF EXISTS "Anyone can view room personas" ON public.room_assigned_personas;
  DROP POLICY IF EXISTS "Users manage own room personas" ON public.room_assigned_personas;
  CREATE POLICY "Anyone can view room personas" ON public.room_assigned_personas FOR SELECT USING (true);
  CREATE POLICY "Users manage own room personas" ON public.room_assigned_personas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Anyone can view room messages" ON public.room_messages;
  CREATE POLICY "Anyone can view room messages" ON public.room_messages FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Anyone can insert room messages" ON public.room_messages;
  DROP POLICY IF EXISTS "Authenticated users can insert room messages" ON public.room_messages;
  CREATE POLICY "Authenticated users can insert room messages" ON public.room_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (author_user_id IS NULL OR author_user_id = auth.uid()));
  DROP POLICY IF EXISTS "Anyone can update room messages" ON public.room_messages;
  DROP POLICY IF EXISTS "Authors can update own room messages" ON public.room_messages;
  CREATE POLICY "Authors can update own room messages" ON public.room_messages FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = author_user_id) WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_user_id);
  DROP POLICY IF EXISTS "Authors can delete own room messages" ON public.room_messages;
  CREATE POLICY "Authors can delete own room messages" ON public.room_messages FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = author_user_id);

  DROP POLICY IF EXISTS "Anyone can manage room message likes" ON public.room_message_likes;
  DROP POLICY IF EXISTS "Anyone can view room message likes" ON public.room_message_likes;
  DROP POLICY IF EXISTS "Users manage own room message likes" ON public.room_message_likes;
  CREATE POLICY "Anyone can view room message likes" ON public.room_message_likes FOR SELECT USING (true);
  CREATE POLICY "Users manage own room message likes" ON public.room_message_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Anyone can manage room message reactions" ON public.room_message_reactions;
  DROP POLICY IF EXISTS "Anyone can view room message reactions" ON public.room_message_reactions;
  DROP POLICY IF EXISTS "Users manage own room message reactions" ON public.room_message_reactions;
  CREATE POLICY "Anyone can view room message reactions" ON public.room_message_reactions FOR SELECT USING (true);
  CREATE POLICY "Users manage own room message reactions" ON public.room_message_reactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Anyone can manage room presence" ON public.room_presence;
  DROP POLICY IF EXISTS "Anyone can view room presence" ON public.room_presence;
  DROP POLICY IF EXISTS "Users manage own room presence" ON public.room_presence;
  CREATE POLICY "Anyone can view room presence" ON public.room_presence FOR SELECT USING (true);
  CREATE POLICY "Users manage own room presence" ON public.room_presence FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END $$;

-- =================================================================================
-- 7. ATOMIC ADMIN RPC FUNCTIONS FOR REAL-TIME SITE MANAGEMENT (DATABASE ADMIN ONLY)
-- =================================================================================

-- Remove any legacy passkey self-elevation function
DROP FUNCTION IF EXISTS public.admin_unlock_with_passkey(text);

-- 7.1 Update User Role, Verification, Creator Status, Link Active & Suspension
CREATE OR REPLACE FUNCTION public.admin_update_user_status(
  p_target_user_id uuid,
  p_is_admin boolean DEFAULT NULL,
  p_is_creator boolean DEFAULT NULL,
  p_is_verified boolean DEFAULT NULL,
  p_is_suspended boolean DEFAULT NULL,
  p_suspension_reason text DEFAULT NULL,
  p_link_active boolean DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target_username text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only database admins can update user status';
  END IF;

  UPDATE public.profiles
  SET is_admin = COALESCE(p_is_admin, is_admin),
      is_creator = COALESCE(p_is_creator, is_creator),
      is_verified = COALESCE(p_is_verified, is_verified),
      is_suspended = COALESCE(p_is_suspended, is_suspended),
      suspension_reason = CASE
        WHEN p_is_suspended = false THEN NULL
        ELSE COALESCE(p_suspension_reason, suspension_reason)
      END,
      link_active = COALESCE(p_link_active, link_active),
      role = COALESCE(p_role, CASE WHEN p_is_admin = true THEN 'admin' ELSE role END),
      updated_at = now()
  WHERE id = p_target_user_id
  RETURNING username INTO v_target_username;

  INSERT INTO public.admin_audit_logs (admin_user_id, admin_username, action_type, target_type, target_id, summary)
  VALUES (
    auth.uid(),
    'admin',
    'update_user_status',
    'profile',
    p_target_user_id::text,
    format('Updated status/roles for @%s', COALESCE(v_target_username, p_target_user_id::text))
  );
END;
$$;

-- 7.3 Resolve or Dismiss Moderation Report (with Optional Target Content Deletion)
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id uuid,
  p_status text,
  p_delete_target boolean DEFAULT false,
  p_admin_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rep public.moderation_reports%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only database admins can resolve reports';
  END IF;

  SELECT * INTO v_rep FROM public.moderation_reports WHERE id = p_report_id;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.moderation_reports
  SET status = p_status,
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      resolved_by = auth.uid(),
      resolved_at = now()
  WHERE id = p_report_id;

  IF p_delete_target THEN
    IF v_rep.target_type = 'social_post' AND v_rep.target_id ~* '^[0-9a-f-]{36}$' THEN
      DELETE FROM public.social_posts WHERE id = v_rep.target_id::uuid;
    ELSIF v_rep.target_type = 'post_comment' AND v_rep.target_id ~* '^[0-9a-f-]{36}$' THEN
      DELETE FROM public.post_comments WHERE id = v_rep.target_id::uuid;
    ELSIF v_rep.target_type = 'room_message' AND v_rep.target_id ~* '^[0-9a-f-]{36}$' THEN
      DELETE FROM public.room_messages WHERE id = v_rep.target_id::uuid;
    ELSIF v_rep.target_type = 'anonymous_message' AND v_rep.target_id ~* '^[0-9a-f-]{36}$' THEN
      DELETE FROM public.anonymous_messages WHERE id = v_rep.target_id::uuid;
    ELSIF v_rep.target_type = 'community_room' AND v_rep.target_id ~* '^[0-9a-f-]{36}$' THEN
      DELETE FROM public.community_rooms WHERE id = v_rep.target_id::uuid;
    ELSIF v_rep.target_type = 'user' THEN
      UPDATE public.profiles
      SET is_suspended = true,
          suspension_reason = 'Suspended via Moderation Report'
      WHERE LOWER(username) = LOWER(v_rep.target_id)
         OR id::text = v_rep.target_id;
    END IF;
  END IF;

  INSERT INTO public.admin_audit_logs (admin_user_id, admin_username, action_type, target_type, target_id, summary)
  VALUES (
    auth.uid(),
    'admin',
    'resolve_report',
    v_rep.target_type,
    v_rep.target_id,
    format('Marked report %s as %s (delete_target=%s)', p_report_id::text, p_status, p_delete_target::text)
  );
END;
$$;

-- 7.4 Broadcast Live Campus Announcement & Fan-Out Real-Time Notifications
CREATE OR REPLACE FUNCTION public.admin_broadcast_announcement(
  p_title text,
  p_body text,
  p_campus text DEFAULT 'All Campuses',
  p_severity text DEFAULT 'info',
  p_target_view text DEFAULT 'home'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ann_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only database admins can broadcast campus announcements';
  END IF;

  INSERT INTO public.campus_announcements (
    title,
    body,
    campus,
    severity,
    action_view,
    is_active,
    created_by,
    created_by_username
  )
  VALUES (
    TRIM(p_title),
    TRIM(p_body),
    COALESCE(NULLIF(TRIM(p_campus), ''), 'All Campuses'),
    COALESCE(p_severity, 'info'),
    COALESCE(p_target_view, 'home'),
    true,
    auth.uid(),
    'admin'
  )
  RETURNING id INTO v_ann_id;

  -- Fan out a real-time notification to all matching campus profiles
  INSERT INTO public.notifications (
    recipient_user_id,
    type,
    title,
    body,
    target_view,
    target_id,
    actor_name,
    actor_username,
    is_anonymous
  )
  SELECT
    p.id,
    'system_alert',
    TRIM(p_title),
    TRIM(p_body),
    COALESCE(p_target_view, 'home'),
    v_ann_id::text,
    'Bopoi Campus Admin',
    'admin',
    false
  FROM public.profiles p
  WHERE p_campus = 'All Campuses' OR LOWER(p.campus) = LOWER(p_campus);

  INSERT INTO public.admin_audit_logs (admin_user_id, admin_username, action_type, target_type, target_id, summary)
  VALUES (
    auth.uid(),
    'admin',
    'broadcast_announcement',
    'campus_announcement',
    v_ann_id::text,
    format('Broadcasted "%s" to %s', TRIM(p_title), COALESCE(p_campus, 'All Campuses'))
  );

  RETURN v_ann_id;
END;
$$;

-- 7.5 Update Global Platform Settings & Auto-Blocked Word Filters
CREATE OR REPLACE FUNCTION public.admin_update_platform_settings(
  p_blocked_words text[],
  p_allow_confessions boolean DEFAULT true,
  p_allow_new_rooms boolean DEFAULT true,
  p_maintenance_mode boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only database admins can update platform settings';
  END IF;

  INSERT INTO public.platform_settings (
    id,
    global_blocked_words,
    allow_anonymous_confessions,
    allow_new_rooms,
    maintenance_mode,
    updated_by,
    updated_at
  )
  VALUES (
    'global',
    COALESCE(p_blocked_words, ARRAY[]::text[]),
    COALESCE(p_allow_confessions, true),
    COALESCE(p_allow_new_rooms, true),
    COALESCE(p_maintenance_mode, false),
    auth.uid(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    global_blocked_words = EXCLUDED.global_blocked_words,
    allow_anonymous_confessions = EXCLUDED.allow_anonymous_confessions,
    allow_new_rooms = EXCLUDED.allow_new_rooms,
    maintenance_mode = EXCLUDED.maintenance_mode,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  INSERT INTO public.admin_audit_logs (admin_user_id, admin_username, action_type, target_type, target_id, summary)
  VALUES (
    auth.uid(),
    'admin',
    'update_platform_settings',
    'platform_settings',
    'global',
    format('Updated global safety settings (%s blocked words)', COALESCE(array_length(p_blocked_words, 1), 0))
  );
END;
$$;

-- 7.6 Hardened Private Convo & Inbox Moderation RPCs
CREATE OR REPLACE FUNCTION public.post_private_convo_reply(
  p_message_id uuid,
  p_text text,
  p_sender_token text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msg public.anonymous_messages%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_is_recipient boolean := false;
  v_comment_id uuid;
BEGIN
  SELECT * INTO v_msg FROM public.anonymous_messages WHERE id = p_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() = v_msg.recipient_user_id THEN
    v_is_recipient := true;
    SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  ELSIF (auth.uid() IS NOT NULL AND auth.uid() = v_msg.sender_user_id)
     OR (p_sender_token IS NOT NULL AND v_msg.sender_token IS NOT NULL AND LENGTH(TRIM(p_sender_token)) >= 20 AND v_msg.sender_token = p_sender_token) THEN
    v_is_recipient := false;
  ELSE
    RAISE EXCEPTION 'Unauthorized: You are not a participant in this private conversation';
  END IF;

  INSERT INTO public.message_comments (
    message_id,
    author_user_id,
    author_name,
    author_role,
    author_avatar,
    is_anonymous,
    text
  )
  VALUES (
    p_message_id,
    CASE WHEN v_is_recipient THEN auth.uid() ELSE v_msg.sender_user_id END,
    CASE WHEN v_is_recipient THEN COALESCE(v_profile.display_name, v_msg.recipient_username) ELSE 'Original Sender' END,
    CASE WHEN v_is_recipient THEN 'recipient'::convo_author_role ELSE 'sender'::convo_author_role END,
    CASE WHEN v_is_recipient THEN v_profile.avatar_url ELSE NULL END,
    NOT v_is_recipient,
    TRIM(p_text)
  )
  RETURNING id INTO v_comment_id;

  IF v_is_recipient THEN
    UPDATE public.anonymous_messages
    SET is_read = true, read_at = COALESCE(read_at, now())
    WHERE id = p_message_id;
  END IF;

  RETURN v_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_or_block_message(
  p_message_id uuid,
  p_reason text,
  p_block_sender boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msg public.anonymous_messages%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.anonymous_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF auth.uid() IS NULL OR (auth.uid() IS DISTINCT FROM v_msg.recipient_user_id AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Unauthorized: Only the message recipient can report or block this message';
  END IF;

  UPDATE public.anonymous_messages
  SET is_reported = true,
      report_reason = p_reason
  WHERE id = p_message_id;

  INSERT INTO public.moderation_reports (reporter_user_id, target_type, target_id, reason)
  VALUES ( auth.uid(), 'anonymous_message', p_message_id::text, p_reason );

  IF p_block_sender AND v_msg.sender_token IS NOT NULL THEN
    INSERT INTO public.user_safety_settings (user_id, blocked_senders)
    VALUES (v_msg.recipient_user_id, ARRAY[v_msg.sender_token])
    ON CONFLICT (user_id) DO UPDATE
    SET blocked_senders = CASE
      WHEN v_msg.sender_token = ANY(public.user_safety_settings.blocked_senders)
        THEN public.user_safety_settings.blocked_senders
      ELSE array_append(public.user_safety_settings.blocked_senders, v_msg.sender_token)
    END,
    updated_at = now();
  END IF;
END;
$$;

-- ============================================================================
-- 8. HIGH-CONCURRENCY COMPOSITE INDEXES FOR MAXIMUM USERS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_social_posts_feed_sort
  ON public.social_posts (is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_type_created
  ON public.social_posts (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
  ON public.post_comments (post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_room_messages_room_created
  ON public.room_messages (room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_anonymous_messages_recipient_created
  ON public.anonymous_messages (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_user_id, is_read, created_at DESC);


