-- =================================================================================
-- BOPOI — COMPLETE 24-TABLE PRODUCTION INDEXING, TRIGGERS, RPCs, RLS & REALTIME SQL
-- 100% Idempotent: Safe to run on your existing 24-table Supabase database
-- =================================================================================

-- 1. EXTENSIONS FOR UUID, FAST TEXT SEARCH, TRIGRAM & GIN INDEXING
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =================================================================================
-- 2. REPLICA IDENTITY FULL ON ALL 24 TABLES
-- Ensures UPDATE and DELETE events broadcast complete row payloads over Realtime
-- =================================================================================
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.user_safety_settings REPLICA IDENTITY FULL;
ALTER TABLE public.user_follows REPLICA IDENTITY FULL;
ALTER TABLE public.social_posts REPLICA IDENTITY FULL;
ALTER TABLE public.poll_options REPLICA IDENTITY FULL;
ALTER TABLE public.poll_votes REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.post_bookmarks REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.post_comment_likes REPLICA IDENTITY FULL;
ALTER TABLE public.anonymous_messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_comments REPLICA IDENTITY FULL;
ALTER TABLE public.message_answers REPLICA IDENTITY FULL;
ALTER TABLE public.message_answer_likes REPLICA IDENTITY FULL;
ALTER TABLE public.community_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_memberships REPLICA IDENTITY FULL;
ALTER TABLE public.room_assigned_personas REPLICA IDENTITY FULL;
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER TABLE public.room_message_likes REPLICA IDENTITY FULL;
ALTER TABLE public.room_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.push_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.moderation_reports REPLICA IDENTITY FULL;
ALTER TABLE public.room_presence REPLICA IDENTITY FULL;

-- =================================================================================
-- 3. REGISTER ALL 24 TABLES IN SUPABASE REALTIME PUBLICATION (IDEMPOTENT)
-- =================================================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
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
    'room_presence'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
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
-- 4. EXHAUSTIVE INDEXING ACROSS ALL 24 TABLES (B-TREE, COMPOSITE, PARTIAL, GIN, TRGM)
-- =================================================================================

-- 4.1 public.profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_campus ON public.profiles (campus);
CREATE INDEX IF NOT EXISTS idx_profiles_followers_desc ON public.profiles (followers_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_creator ON public.profiles (is_creator) WHERE is_creator = true;
CREATE INDEX IF NOT EXISTS idx_profiles_link_active ON public.profiles (link_active) WHERE link_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (display_name gin_trgm_ops);

-- 4.2 public.user_safety_settings
CREATE INDEX IF NOT EXISTS idx_user_safety_hidden_words_gin ON public.user_safety_settings USING gin (hidden_words);
CREATE INDEX IF NOT EXISTS idx_user_safety_blocked_senders_gin ON public.user_safety_settings USING gin (blocked_senders);

-- 4.3 public.user_follows
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows (following_id, created_at DESC);

-- 4.4 public.social_posts
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at_desc ON public.social_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_type_created_at ON public.social_posts (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_category_created_at ON public.social_posts (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_author_user_id ON public.social_posts (author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_author_username_lower ON public.social_posts (LOWER(author_username), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_campus_created_at ON public.social_posts (author_campus, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_trending ON public.social_posts ((likes_count + comments_count + shares_count) DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_hashtags_gin ON public.social_posts USING gin (hashtags);
CREATE INDEX IF NOT EXISTS idx_social_posts_content_trgm ON public.social_posts USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_social_posts_title_trgm ON public.social_posts USING gin (title gin_trgm_ops);

-- 4.5 public.poll_options
CREATE INDEX IF NOT EXISTS idx_poll_options_post_id_sort ON public.poll_options (post_id, sort_order ASC);

-- 4.6 public.poll_votes
CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON public.poll_votes (post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON public.poll_votes (option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes (user_id, created_at DESC);

-- 4.7 public.post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes (user_id, created_at DESC);

-- 4.8 public.post_bookmarks
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id_created ON public.post_bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id ON public.post_bookmarks (post_id);

-- 4.9 public.post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_created ON public.post_comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON public.post_comments (parent_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_user_id ON public.post_comments (author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_username_lower ON public.post_comments (LOWER(author_username), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_reply_to_username ON public.post_comments (LOWER(reply_to_username));
CREATE INDEX IF NOT EXISTS idx_post_comments_text_trgm ON public.post_comments USING gin (text gin_trgm_ops);

-- 4.10 public.post_comment_likes
CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment_id ON public.post_comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comment_likes_user_id ON public.post_comment_likes (user_id);

-- 4.11 public.anonymous_messages
CREATE INDEX IF NOT EXISTS idx_anon_messages_recipient_user_created ON public.anonymous_messages (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anon_messages_recipient_username_lower ON public.anonymous_messages (LOWER(recipient_username), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anon_messages_sender_user_created ON public.anonymous_messages (sender_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anon_messages_sender_token ON public.anonymous_messages (sender_token, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anon_messages_unread ON public.anonymous_messages (recipient_user_id, is_read, created_at DESC) WHERE is_reported = false;
CREATE INDEX IF NOT EXISTS idx_anon_messages_answered ON public.anonymous_messages (recipient_user_id, is_answered, created_at DESC) WHERE is_reported = false;
CREATE INDEX IF NOT EXISTS idx_anon_messages_reactions_gin ON public.anonymous_messages USING gin (reactions);

-- 4.12 public.message_comments
CREATE INDEX IF NOT EXISTS idx_message_comments_message_id_created ON public.message_comments (message_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_message_comments_author_user_id ON public.message_comments (author_user_id, created_at DESC);

-- 4.13 public.message_answers
CREATE INDEX IF NOT EXISTS idx_message_answers_author_user_created ON public.message_answers (author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_answers_author_username_lower ON public.message_answers (LOWER(author_username), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_answers_public_feed ON public.message_answers (author_user_id, is_public, is_draft, created_at DESC) WHERE is_public = true AND is_draft = false;

-- 4.14 public.message_answer_likes
CREATE INDEX IF NOT EXISTS idx_message_answer_likes_answer_id ON public.message_answer_likes (answer_id);
CREATE INDEX IF NOT EXISTS idx_message_answer_likes_user_id ON public.message_answer_likes (user_id);

-- 4.15 public.community_rooms
CREATE INDEX IF NOT EXISTS idx_community_rooms_category ON public.community_rooms (category, online_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_rooms_online_desc ON public.community_rooms (online_count DESC, members_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_rooms_creator_user_id ON public.community_rooms (creator_user_id);
CREATE INDEX IF NOT EXISTS idx_community_rooms_tags_gin ON public.community_rooms USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_community_rooms_name_trgm ON public.community_rooms USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_community_rooms_desc_trgm ON public.community_rooms USING gin (description gin_trgm_ops);

-- 4.16 public.room_memberships
CREATE INDEX IF NOT EXISTS idx_room_memberships_user_id ON public.room_memberships (user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_memberships_room_id ON public.room_memberships (room_id, joined_at DESC);

-- 4.17 public.room_assigned_personas
CREATE INDEX IF NOT EXISTS idx_room_personas_user_id ON public.room_assigned_personas (user_id);
CREATE INDEX IF NOT EXISTS idx_room_personas_room_id ON public.room_assigned_personas (room_id);

-- 4.18 public.room_messages
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id_created ON public.room_messages (room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id_created_desc ON public.room_messages (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_messages_author_user_id ON public.room_messages (author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_messages_reply_to_id ON public.room_messages (reply_to_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_reactions_gin ON public.room_messages USING gin (reactions);
CREATE INDEX IF NOT EXISTS idx_room_messages_text_trgm ON public.room_messages USING gin (text gin_trgm_ops);

-- 4.19 public.room_message_likes
CREATE INDEX IF NOT EXISTS idx_room_message_likes_message_id ON public.room_message_likes (message_id);
CREATE INDEX IF NOT EXISTS idx_room_message_likes_user_id ON public.room_message_likes (user_id);

-- 4.20 public.room_message_reactions
CREATE INDEX IF NOT EXISTS idx_room_message_reactions_message_id ON public.room_message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_room_message_reactions_user_id ON public.room_message_reactions (user_id);

-- 4.21 public.notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON public.notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications (recipient_user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_actor_user_id ON public.notifications (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type, created_at DESC);

-- 4.22 public.push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions (endpoint);

-- 4.23 public.moderation_reports
CREATE INDEX IF NOT EXISTS idx_moderation_reports_status_created ON public.moderation_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_target ON public.moderation_reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter ON public.moderation_reports (reporter_user_id);

-- 4.24 public.room_presence
CREATE INDEX IF NOT EXISTS idx_room_presence_room_last_seen ON public.room_presence (room_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_presence_user_last_seen ON public.room_presence (user_id, last_seen_at DESC);

-- =================================================================================
-- 5. REAL-TIME AUTOMATIC COUNTER, JSONB & NOTIFICATION TRIGGERS
-- =================================================================================

-- 5.1 Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_safety_updated_at ON public.user_safety_settings;
CREATE TRIGGER trg_user_safety_updated_at
  BEFORE UPDATE ON public.user_safety_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_social_posts_updated_at ON public.social_posts;
CREATE TRIGGER trg_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_message_answers_updated_at ON public.message_answers;
CREATE TRIGGER trg_message_answers_updated_at
  BEFORE UPDATE ON public.message_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5.2 Auto-create profile & safety settings on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_username text;
  default_display text;
BEGIN
  default_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || SUBSTR(NEW.id::text, 1, 4)
  );
  default_display := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, username, display_name, email, avatar_url, campus, bio)
  VALUES (
    NEW.id,
    default_username,
    default_display,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'char:v1|female|caramel|box-braids|#14111D|hoodie|#5420F5|none|confident|violet-glow|0'),
    COALESCE(NEW.raw_user_meta_data->>'campus', 'University of Lagos'),
    COALESCE(NEW.raw_user_meta_data->>'bio', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    campus = EXCLUDED.campus,
    bio = EXCLUDED.bio;

  INSERT INTO public.user_safety_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5.3 Post Likes Counter Trigger
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_post_likes_count ON public.post_likes;
CREATE TRIGGER trg_sync_post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

-- 5.4 Post Comments Counter Trigger
CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_post_comments_count ON public.post_comments;
CREATE TRIGGER trg_sync_post_comments_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments_count();

-- 5.5 Post Comment Likes Counter Trigger
CREATE OR REPLACE FUNCTION public.sync_post_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_post_comment_likes_count ON public.post_comment_likes;
CREATE TRIGGER trg_sync_post_comment_likes_count
  AFTER INSERT OR DELETE ON public.post_comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_likes_count();

-- 5.6 Poll Votes Counter Trigger
CREATE OR REPLACE FUNCTION public.sync_poll_votes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.poll_options SET votes = votes + 1 WHERE id = NEW.option_id;
    UPDATE public.social_posts SET poll_total_votes = poll_total_votes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poll_options SET votes = GREATEST(0, votes - 1) WHERE id = OLD.option_id;
    UPDATE public.social_posts SET poll_total_votes = GREATEST(0, poll_total_votes - 1) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.option_id IS DISTINCT FROM NEW.option_id THEN
    UPDATE public.poll_options SET votes = GREATEST(0, votes - 1) WHERE id = OLD.option_id;
    UPDATE public.poll_options SET votes = votes + 1 WHERE id = NEW.option_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_poll_votes_count ON public.poll_votes;
CREATE TRIGGER trg_sync_poll_votes_count
  AFTER INSERT OR UPDATE OR DELETE ON public.poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_poll_votes_count();

-- 5.7 User Follows Counter Trigger
CREATE OR REPLACE FUNCTION public.sync_user_follows_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_follows_count ON public.user_follows;
CREATE TRIGGER trg_sync_user_follows_count
  AFTER INSERT OR DELETE ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_follows_count();

-- 5.8 Anonymous Message Replies Counter Trigger
CREATE OR REPLACE FUNCTION public.sync_message_replies_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.anonymous_messages SET replies_count = replies_count + 1 WHERE id = NEW.message_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.anonymous_messages SET replies_count = GREATEST(0, replies_count - 1) WHERE id = OLD.message_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_message_replies_count ON public.message_comments;
CREATE TRIGGER trg_sync_message_replies_count
  AFTER INSERT OR DELETE ON public.message_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_message_replies_count();

-- 5.9 Message Answer Likes Counter Trigger + Sync is_answered on anonymous_messages
CREATE OR REPLACE FUNCTION public.sync_message_answer_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.message_answers SET likes_count = likes_count + 1 WHERE id = NEW.answer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.message_answers SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.answer_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_message_answer_likes_count ON public.message_answer_likes;
CREATE TRIGGER trg_sync_message_answer_likes_count
  AFTER INSERT OR DELETE ON public.message_answer_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_message_answer_likes_count();

CREATE OR REPLACE FUNCTION public.sync_message_answered_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.anonymous_messages
    SET is_answered = (NOT NEW.is_draft), is_read = true, read_at = COALESCE(read_at, now())
    WHERE id = NEW.message_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.anonymous_messages
    SET is_answered = false
    WHERE id = OLD.message_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_message_answered_status ON public.message_answers;
CREATE TRIGGER trg_sync_message_answered_status
  AFTER INSERT OR UPDATE OR DELETE ON public.message_answers
  FOR EACH ROW EXECUTE FUNCTION public.sync_message_answered_status();

-- 5.10 Room Memberships Counter Trigger (Counts distinct members including creator so creator is never double-counted)
CREATE OR REPLACE FUNCTION public.sync_room_members_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_room_id uuid;
  exact_count integer;
BEGIN
  target_room_id := COALESCE(NEW.room_id, OLD.room_id);
  SELECT GREATEST(1, COUNT(DISTINCT u_id)::int)
  INTO exact_count
  FROM (
    SELECT rm.user_id AS u_id FROM public.room_memberships rm WHERE rm.room_id = target_room_id
    UNION
    SELECT cr.creator_user_id AS u_id FROM public.community_rooms cr WHERE cr.id = target_room_id AND cr.creator_user_id IS NOT NULL
  ) combined_members;

  UPDATE public.community_rooms
  SET members_count = exact_count
  WHERE id = target_room_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_room_members_count ON public.room_memberships;
CREATE TRIGGER trg_sync_room_members_count
  AFTER INSERT OR DELETE ON public.room_memberships
  FOR EACH ROW EXECUTE FUNCTION public.sync_room_members_count();

-- 5.11 Room Message Likes Counter Trigger
CREATE OR REPLACE FUNCTION public.sync_room_message_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.room_messages SET likes_count = likes_count + 1 WHERE id = NEW.message_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.room_messages SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.message_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_room_message_likes_count ON public.room_message_likes;
CREATE TRIGGER trg_sync_room_message_likes_count
  AFTER INSERT OR DELETE ON public.room_message_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_room_message_likes_count();

-- 5.12 Room Message Reactions JSONB Aggregation Trigger
CREATE OR REPLACE FUNCTION public.sync_room_message_reactions_jsonb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_msg_id uuid;
  agg_reactions jsonb;
BEGIN
  target_msg_id := COALESCE(NEW.message_id, OLD.message_id);

  SELECT COALESCE(jsonb_object_agg(emoji, cnt), '{}'::jsonb)
  INTO agg_reactions
  FROM (
    SELECT emoji, COUNT(*)::int AS cnt
    FROM public.room_message_reactions
    WHERE message_id = target_msg_id
    GROUP BY emoji
  ) sub;

  UPDATE public.room_messages
  SET reactions = COALESCE(agg_reactions, '{}'::jsonb)
  WHERE id = target_msg_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_room_message_reactions_jsonb ON public.room_message_reactions;
CREATE TRIGGER trg_sync_room_message_reactions_jsonb
  AFTER INSERT OR UPDATE OR DELETE ON public.room_message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_room_message_reactions_jsonb();

-- 5.13 Room Presence Active Online Count Trigger
CREATE OR REPLACE FUNCTION public.sync_room_online_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_room_id uuid;
  active_cnt integer;
BEGIN
  target_room_id := COALESCE(NEW.room_id, OLD.room_id);

  SELECT GREATEST(1, COUNT(*)::int)
  INTO active_cnt
  FROM public.room_presence
  WHERE room_id = target_room_id
    AND last_seen_at >= (now() - interval '15 minutes');

  UPDATE public.community_rooms
  SET online_count = active_cnt
  WHERE id = target_room_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_room_online_count ON public.room_presence;
CREATE TRIGGER trg_sync_room_online_count
  AFTER INSERT OR UPDATE OR DELETE ON public.room_presence
  FOR EACH ROW EXECUTE FUNCTION public.sync_room_online_count();

-- =================================================================================
-- 5.14 COMPLETE REAL-TIME NOTIFICATION ENGINE (ALL 17 SITE NOTIFICATION EVENTS)
-- Automatically inserts rows into public.notifications for every interaction
-- =================================================================================

-- Ensure notifications.type is flexible text so any notification type is supported
DO $$
BEGIN
  ALTER TABLE public.notifications ALTER COLUMN type TYPE text USING type::text;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Central helper function to safely insert a notification
CREATE OR REPLACE FUNCTION public.create_app_notification(
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_actor_name text,
  p_actor_username text,
  p_actor_avatar text,
  p_is_anonymous boolean,
  p_type text,
  p_title text,
  p_body text,
  p_target_view text DEFAULT 'home',
  p_target_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_recipient_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id,
    actor_user_id,
    actor_name,
    actor_username,
    actor_avatar,
    is_anonymous,
    type,
    title,
    body,
    target_view,
    target_id,
    is_read
  )
  VALUES (
    p_recipient_user_id,
    CASE WHEN p_is_anonymous THEN NULL ELSE p_actor_user_id END,
    CASE WHEN p_is_anonymous THEN COALESCE(p_actor_name, 'Anonymous Student') ELSE p_actor_name END,
    CASE WHEN p_is_anonymous THEN NULL ELSE p_actor_username END,
    CASE WHEN p_is_anonymous THEN NULL ELSE p_actor_avatar END,
    COALESCE(p_is_anonymous, false),
    p_type,
    p_title,
    LEFT(COALESCE(p_body, ''), 240),
    COALESCE(p_target_view, 'home'),
    p_target_id,
    false
  );
END;
$$;

-- (1) Welcome Notification on New Account Signup
CREATE OR REPLACE FUNCTION public.notify_on_profile_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.create_app_notification(
    NEW.id,
    NULL,
    'Bopoi Campus',
    'bopoi',
    NULL,
    false,
    'welcome_notification',
    'Welcome to Bopoi, ' || COALESCE(NEW.display_name, NEW.username) || '! 🎉',
    'Your anonymous Q&A link (@' || NEW.username || '/ask) is live! Share it with classmates or explore confessions, polls, and anonymous rooms.',
    'inbox',
    NEW.id::text
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_profile_created ON public.profiles;
CREATE TRIGGER trg_notify_on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_profile_created();

-- (2) New Anonymous Q&A Message Received & Reaction on Anonymous Message
CREATE OR REPLACE FUNCTION public.notify_on_anonymous_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.recipient_user_id IS NOT NULL THEN
      PERFORM public.create_app_notification(
        NEW.recipient_user_id,
        NULL,
        'Anonymous Student',
        NULL,
        NULL,
        true,
        'anon_message_received',
        'New Anonymous Question 👀',
        '"' || LEFT(NEW.text, 140) || '"',
        'inbox',
        NEW.id::text
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.reactions IS DISTINCT FROM NEW.reactions AND NEW.sender_user_id IS NOT NULL AND NEW.sender_user_id IS DISTINCT FROM NEW.recipient_user_id THEN
      PERFORM public.create_app_notification(
        NEW.sender_user_id,
        NEW.recipient_user_id,
        '@' || NEW.recipient_username,
        NEW.recipient_username,
        NULL,
        false,
        'anon_message_reaction',
        '@' || NEW.recipient_username || ' reacted to your anonymous message ❤️',
        '"' || LEFT(NEW.text, 120) || '"',
        'inbox',
        NEW.id::text
      );
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_anonymous_message ON public.anonymous_messages;
CREATE TRIGGER trg_notify_on_anonymous_message
  AFTER INSERT OR UPDATE OF reactions ON public.anonymous_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_anonymous_message();

-- (3) Private 1-on-1 Q&A Convo Reply (Recipient <-> Anonymous Sender)
CREATE OR REPLACE FUNCTION public.notify_on_message_convo_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msg public.anonymous_messages%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.anonymous_messages WHERE id = NEW.message_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF NEW.author_role::text = 'sender' THEN
    IF v_msg.recipient_user_id IS NOT NULL THEN
      PERFORM public.create_app_notification(
        v_msg.recipient_user_id,
        NULL,
        'Original Sender',
        NULL,
        NULL,
        true,
        'anon_convo_reply',
        'Anonymous Sender Replied in 1-on-1 Convo 💬',
        '"' || LEFT(NEW.text, 140) || '"',
        'inbox',
        NEW.message_id::text
      );
    END IF;
  ELSE
    IF v_msg.sender_user_id IS NOT NULL AND v_msg.sender_user_id IS DISTINCT FROM v_msg.recipient_user_id THEN
      PERFORM public.create_app_notification(
        v_msg.sender_user_id,
        v_msg.recipient_user_id,
        NEW.author_name,
        v_msg.recipient_username,
        NEW.author_avatar,
        false,
        'anon_convo_reply',
        '@' || v_msg.recipient_username || ' replied to your anonymous message 💬',
        '"' || LEFT(NEW.text, 140) || '"',
        'inbox',
        NEW.message_id::text
      );
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_message_convo_reply ON public.message_comments;
CREATE TRIGGER trg_notify_on_message_convo_reply
  AFTER INSERT ON public.message_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message_convo_reply();

-- (4) Q&A Answer Published (Notifies Question Sender + Followers)
CREATE OR REPLACE FUNCTION public.notify_on_answer_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msg public.anonymous_messages%ROWTYPE;
  v_follower record;
BEGIN
  IF NEW.is_draft = true THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_draft = false THEN RETURN NULL; END IF;

  SELECT * INTO v_msg FROM public.anonymous_messages WHERE id = NEW.message_id;

  -- Notify original question sender if registered
  IF v_msg.sender_user_id IS NOT NULL AND v_msg.sender_user_id IS DISTINCT FROM NEW.author_user_id THEN
    PERFORM public.create_app_notification(
      v_msg.sender_user_id,
      NEW.author_user_id,
      NEW.author_display_name,
      NEW.author_username,
      NULL,
      false,
      'answer_published',
      '@' || NEW.author_username || ' answered your anonymous question! ✨',
      '"' || LEFT(NEW.answer_text, 140) || '"',
      'public-profile',
      NEW.author_username
    );
  END IF;

  -- If shared publicly, notify followers
  IF NEW.is_public = true AND NEW.author_user_id IS NOT NULL THEN
    FOR v_follower IN
      SELECT follower_id FROM public.user_follows WHERE following_id = NEW.author_user_id
    LOOP
      IF v_follower.follower_id IS DISTINCT FROM v_msg.sender_user_id THEN
        PERFORM public.create_app_notification(
          v_follower.follower_id,
          NEW.author_user_id,
          NEW.author_display_name,
          NEW.author_username,
          NULL,
          false,
          'answer_published',
          '@' || NEW.author_username || ' published a Q&A Story Card ✨',
          '"' || LEFT(NEW.answer_text, 120) || '"',
          'public-profile',
          NEW.author_username
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_answer_published ON public.message_answers;
CREATE TRIGGER trg_notify_on_answer_published
  AFTER INSERT OR UPDATE ON public.message_answers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_answer_published();

-- (5) Q&A Story Answer Liked
CREATE OR REPLACE FUNCTION public.notify_on_answer_liked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ans public.message_answers%ROWTYPE;
  v_actor public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_ans FROM public.message_answers WHERE id = NEW.answer_id;
  IF NOT FOUND OR v_ans.author_user_id IS NULL OR v_ans.author_user_id = NEW.user_id THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.create_app_notification(
    v_ans.author_user_id,
    NEW.user_id,
    COALESCE(v_actor.display_name, 'A classmate'),
    v_actor.username,
    v_actor.avatar_url,
    false,
    'answer_liked',
    'Your Q&A Answer Was Liked ❤️',
    COALESCE('@' || v_actor.username, 'A student') || ' liked your answer: "' || LEFT(v_ans.answer_text, 100) || '"',
    'profile',
    NEW.answer_id::text
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_answer_liked ON public.message_answer_likes;
CREATE TRIGGER trg_notify_on_answer_liked
  AFTER INSERT ON public.message_answer_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_answer_liked();

-- (6) Social Post Created: @Mentions in Post + Notify Followers of Public Posts
CREATE OR REPLACE FUNCTION public.notify_on_social_post_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_match text[];
  v_mentioned_user public.profiles%ROWTYPE;
  v_notified_ids uuid[] := ARRAY[]::uuid[];
  v_follower record;
  v_target_view text;
BEGIN
  v_target_view := CASE WHEN NEW.type::text = 'poll' THEN 'poll-detail' ELSE 'post-detail' END;

  -- Scan post title & content for @username mentions
  FOR v_match IN
    SELECT regexp_matches(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''), '@([a-zA-Z0-9_]+)', 'g')
  LOOP
    SELECT * INTO v_mentioned_user
    FROM public.profiles
    WHERE LOWER(username) = LOWER(v_match[1])
    LIMIT 1;

    IF FOUND
       AND v_mentioned_user.id IS DISTINCT FROM NEW.author_user_id
       AND NOT (v_mentioned_user.id = ANY(v_notified_ids))
    THEN
      v_notified_ids := array_append(v_notified_ids, v_mentioned_user.id);
      PERFORM public.create_app_notification(
        v_mentioned_user.id,
        NEW.author_user_id,
        CASE WHEN NEW.is_anonymous THEN 'Anonymous Student' ELSE NEW.author_name END,
        CASE WHEN NEW.is_anonymous THEN NULL ELSE NEW.author_username END,
        CASE WHEN NEW.is_anonymous THEN NULL ELSE NEW.author_avatar END,
        NEW.is_anonymous,
        'user_mentioned',
        'You Were Mentioned in a ' || INITCAP(NEW.type::text) || ' 📣',
        (CASE WHEN NEW.is_anonymous THEN 'An anonymous student' ELSE '@' || NEW.author_username END) || ' mentioned you: "' || LEFT(NEW.content, 110) || '"',
        v_target_view,
        NEW.id::text
      );
    END IF;
  END LOOP;

  -- Notify followers when a student publishes a non-anonymous post/poll/discussion
  IF NOT COALESCE(NEW.is_anonymous, false) AND NEW.author_user_id IS NOT NULL THEN
    FOR v_follower IN
      SELECT follower_id FROM public.user_follows WHERE following_id = NEW.author_user_id
    LOOP
      IF NOT (v_follower.follower_id = ANY(v_notified_ids)) THEN
        PERFORM public.create_app_notification(
          v_follower.follower_id,
          NEW.author_user_id,
          NEW.author_name,
          NEW.author_username,
          NEW.author_avatar,
          false,
          'new_post_from_following',
          '@' || NEW.author_username || ' posted a new ' || NEW.type::text || ' ✨',
          '"' || LEFT(COALESCE(NEW.title, NEW.content), 120) || '"',
          v_target_view,
          NEW.id::text
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_social_post_created ON public.social_posts;
CREATE TRIGGER trg_notify_on_social_post_created
  AFTER INSERT ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_social_post_created();

-- (7) Social Post Liked + Viral Like Milestones (5, 10, 25, 50, 100, 250, 500)
CREATE OR REPLACE FUNCTION public.notify_on_post_liked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_post public.social_posts%ROWTYPE;
  v_actor public.profiles%ROWTYPE;
  v_target_view text;
  v_new_likes int;
BEGIN
  SELECT * INTO v_post FROM public.social_posts WHERE id = NEW.post_id;
  IF NOT FOUND OR v_post.author_user_id IS NULL OR v_post.author_user_id = NEW.user_id THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = NEW.user_id;
  v_target_view := CASE WHEN v_post.type::text = 'poll' THEN 'poll-detail' ELSE 'post-detail' END;
  v_new_likes := COALESCE(v_post.likes_count, 0);

  PERFORM public.create_app_notification(
    v_post.author_user_id,
    NEW.user_id,
    COALESCE(v_actor.display_name, 'A student'),
    v_actor.username,
    v_actor.avatar_url,
    false,
    'post_liked',
    COALESCE('@' || v_actor.username, 'A student') || ' liked your ' || v_post.type::text || ' ❤️',
    '"' || LEFT(COALESCE(v_post.title, v_post.content), 110) || '"',
    v_target_view,
    NEW.post_id::text
  );

  IF v_new_likes IN (5, 10, 25, 50, 100, 250, 500) THEN
    PERFORM public.create_app_notification(
      v_post.author_user_id,
      NULL,
      'Campus Trending',
      NULL,
      NULL,
      false,
      'post_milestone',
      '🔥 Your ' || INITCAP(v_post.type::text) || ' Hit ' || v_new_likes || ' Likes!',
      'Your post "' || LEFT(COALESCE(v_post.title, v_post.content), 90) || '" is trending on campus!',
      v_target_view,
      NEW.post_id::text
    );
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_post_liked ON public.post_likes;
CREATE TRIGGER trg_notify_on_post_liked
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_liked();

-- (8) Social Post Bookmarked / Saved
CREATE OR REPLACE FUNCTION public.notify_on_post_bookmarked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_post public.social_posts%ROWTYPE;
  v_target_view text;
BEGIN
  SELECT * INTO v_post FROM public.social_posts WHERE id = NEW.post_id;
  IF NOT FOUND OR v_post.author_user_id IS NULL OR v_post.author_user_id = NEW.user_id THEN
    RETURN NULL;
  END IF;

  v_target_view := CASE WHEN v_post.type::text = 'poll' THEN 'poll-detail' ELSE 'post-detail' END;

  PERFORM public.create_app_notification(
    v_post.author_user_id,
    NULL,
    'Campus Student',
    NULL,
    NULL,
    true,
    'post_bookmarked',
    'Someone Bookmarked Your ' || INITCAP(v_post.type::text) || ' 🔖',
    'A student saved your ' || v_post.type::text || ': "' || LEFT(COALESCE(v_post.title, v_post.content), 100) || '"',
    v_target_view,
    NEW.post_id::text
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_post_bookmarked ON public.post_bookmarks;
CREATE TRIGGER trg_notify_on_post_bookmarked
  AFTER INSERT ON public.post_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_bookmarked();

-- (9) Post Comments, Thread Replies & @Mentions in Comments
CREATE OR REPLACE FUNCTION public.notify_on_post_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_post public.social_posts%ROWTYPE;
  v_parent public.post_comments%ROWTYPE;
  v_target_view text;
  v_actor_label text;
  v_notified_ids uuid[] := ARRAY[]::uuid[];
  v_match text[];
  v_mentioned_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_post FROM public.social_posts WHERE id = NEW.post_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_target_view := CASE WHEN v_post.type::text = 'poll' THEN 'poll-detail' ELSE 'post-detail' END;
  v_actor_label := CASE WHEN NEW.is_anonymous THEN 'Anonymous Student' ELSE '@' || NEW.author_username END;

  -- (9a) If this is a reply to an existing comment, notify the parent comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT * INTO v_parent FROM public.post_comments WHERE id = NEW.parent_id;
    IF FOUND AND v_parent.author_user_id IS NOT NULL AND v_parent.author_user_id IS DISTINCT FROM NEW.author_user_id THEN
      v_notified_ids := array_append(v_notified_ids, v_parent.author_user_id);
      PERFORM public.create_app_notification(
        v_parent.author_user_id,
        NEW.author_user_id,
        NEW.author_name,
        NEW.author_username,
        NEW.author_avatar,
        NEW.is_anonymous,
        'comment_replied',
        v_actor_label || ' replied to your comment 💬',
        '"' || LEFT(NEW.text, 120) || '"',
        v_target_view,
        NEW.post_id::text
      );
    END IF;
  END IF;

  -- (9b) Notify the post author (if not already notified above and not self-commenting)
  IF v_post.author_user_id IS NOT NULL
     AND v_post.author_user_id IS DISTINCT FROM NEW.author_user_id
     AND NOT (v_post.author_user_id = ANY(v_notified_ids))
  THEN
    v_notified_ids := array_append(v_notified_ids, v_post.author_user_id);
    PERFORM public.create_app_notification(
      v_post.author_user_id,
      NEW.author_user_id,
      NEW.author_name,
      NEW.author_username,
      NEW.author_avatar,
      NEW.is_anonymous,
      'post_commented',
      v_actor_label || ' commented on your ' || v_post.type::text || ' 💬',
      '"' || LEFT(NEW.text, 120) || '"',
      v_target_view,
      NEW.post_id::text
    );
  END IF;

  -- (9c) Notify any @mentioned students in the comment text
  FOR v_match IN
    SELECT regexp_matches(COALESCE(NEW.text, ''), '@([a-zA-Z0-9_]+)', 'g')
  LOOP
    SELECT * INTO v_mentioned_user
    FROM public.profiles
    WHERE LOWER(username) = LOWER(v_match[1])
    LIMIT 1;

    IF FOUND
       AND v_mentioned_user.id IS DISTINCT FROM NEW.author_user_id
       AND NOT (v_mentioned_user.id = ANY(v_notified_ids))
    THEN
      v_notified_ids := array_append(v_notified_ids, v_mentioned_user.id);
      PERFORM public.create_app_notification(
        v_mentioned_user.id,
        NEW.author_user_id,
        NEW.author_name,
        NEW.author_username,
        NEW.author_avatar,
        NEW.is_anonymous,
        'user_mentioned',
        v_actor_label || ' mentioned you in a comment 📣',
        '"' || LEFT(NEW.text, 120) || '"',
        v_target_view,
        NEW.post_id::text
      );
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_post_comment ON public.post_comments;
CREATE TRIGGER trg_notify_on_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_comment();

-- (10) Post Comment Liked
CREATE OR REPLACE FUNCTION public.notify_on_comment_liked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_comment public.post_comments%ROWTYPE;
  v_actor public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_comment FROM public.post_comments WHERE id = NEW.comment_id;
  IF NOT FOUND OR v_comment.author_user_id IS NULL OR v_comment.author_user_id = NEW.user_id THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_actor FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.create_app_notification(
    v_comment.author_user_id,
    NEW.user_id,
    COALESCE(v_actor.display_name, 'A student'),
    v_actor.username,
    v_actor.avatar_url,
    false,
    'comment_liked',
    COALESCE('@' || v_actor.username, 'A student') || ' liked your comment ❤️',
    '"' || LEFT(v_comment.text, 110) || '"',
    'post-detail',
    v_comment.post_id::text
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment_liked ON public.post_comment_likes;
CREATE TRIGGER trg_notify_on_comment_liked
  AFTER INSERT ON public.post_comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_liked();

-- (11) Poll Vote Cast + Poll Vote Milestones (5, 10, 25, 50, 100)
CREATE OR REPLACE FUNCTION public.notify_on_poll_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_post public.social_posts%ROWTYPE;
  v_option public.poll_options%ROWTYPE;
  v_total_votes int;
BEGIN
  SELECT * INTO v_post FROM public.social_posts WHERE id = NEW.post_id;
  IF NOT FOUND OR v_post.author_user_id IS NULL OR v_post.author_user_id = NEW.user_id THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_option FROM public.poll_options WHERE id = NEW.option_id;
  v_total_votes := COALESCE(v_post.poll_total_votes, 1);

  PERFORM public.create_app_notification(
    v_post.author_user_id,
    NULL,
    'Campus Voter',
    NULL,
    NULL,
    true,
    'poll_voted',
    'New Vote on Your Poll 📊',
    'A student voted "' || COALESCE(v_option.text, 'an option') || '" on "' || LEFT(v_post.content, 80) || '"',
    'poll-detail',
    NEW.post_id::text
  );

  IF v_total_votes IN (5, 10, 25, 50, 100, 250) THEN
    PERFORM public.create_app_notification(
      v_post.author_user_id,
      NULL,
      'Campus Polls',
      NULL,
      NULL,
      false,
      'poll_milestone',
      '🚀 Your Poll Reached ' || v_total_votes || ' Votes!',
      '"' || LEFT(v_post.content, 100) || '" now has ' || v_total_votes || ' total campus votes!',
      'poll-detail',
      NEW.post_id::text
    );
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_poll_vote ON public.poll_votes;
CREATE TRIGGER trg_notify_on_poll_vote
  AFTER INSERT ON public.poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_poll_vote();

-- (12) New Follower (User Followed You)
CREATE OR REPLACE FUNCTION public.notify_on_user_followed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_follower public.profiles%ROWTYPE;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NULL; END IF;

  SELECT * INTO v_follower FROM public.profiles WHERE id = NEW.follower_id;

  PERFORM public.create_app_notification(
    NEW.following_id,
    NEW.follower_id,
    COALESCE(v_follower.display_name, 'A student'),
    v_follower.username,
    v_follower.avatar_url,
    false,
    'new_follower',
    'New Campus Follower 🎉',
    COALESCE(v_follower.display_name, 'A student') || ' (@' || COALESCE(v_follower.username, 'student') || ') started following you.',
    'public-profile',
    COALESCE(v_follower.username, NEW.follower_id::text)
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_user_followed ON public.user_follows;
CREATE TRIGGER trg_notify_on_user_followed
  AFTER INSERT ON public.user_follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_user_followed();

-- (13) Student Joined Your Anonymous Room
CREATE OR REPLACE FUNCTION public.notify_on_room_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_room public.community_rooms%ROWTYPE;
BEGIN
  SELECT * INTO v_room FROM public.community_rooms WHERE id = NEW.room_id;
  IF NOT FOUND OR v_room.creator_user_id IS NULL OR v_room.creator_user_id = NEW.user_id THEN
    RETURN NULL;
  END IF;

  PERFORM public.create_app_notification(
    v_room.creator_user_id,
    NULL,
    'Masked Student',
    NULL,
    NULL,
    true,
    'room_joined',
    'New Member Joined #' || v_room.name || ' 🎭',
    'A student joined your anonymous room #' || v_room.name || '.',
    'room-detail',
    NEW.room_id::text
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_room_joined ON public.room_memberships;
CREATE TRIGGER trg_notify_on_room_joined
  AFTER INSERT ON public.room_memberships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_room_joined();

-- (14) Room Messages: Replies to Your Room Message, @Mentions & Activity in Your Room
CREATE OR REPLACE FUNCTION public.notify_on_room_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_room public.community_rooms%ROWTYPE;
  v_orig public.room_messages%ROWTYPE;
  v_sender_alias text;
  v_notified_ids uuid[] := ARRAY[]::uuid[];
  v_match text[];
  v_mentioned_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_room FROM public.community_rooms WHERE id = NEW.room_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_sender_alias := COALESCE(NEW.author_alias, NEW.author_name, 'Masked Student');

  -- (14a) Direct Reply to a Room Message
  IF NEW.reply_to_id IS NOT NULL THEN
    SELECT * INTO v_orig FROM public.room_messages WHERE id = NEW.reply_to_id;
    IF FOUND AND v_orig.author_user_id IS NOT NULL AND v_orig.author_user_id IS DISTINCT FROM NEW.author_user_id THEN
      v_notified_ids := array_append(v_notified_ids, v_orig.author_user_id);
      PERFORM public.create_app_notification(
        v_orig.author_user_id,
        NEW.author_user_id,
        v_sender_alias,
        NEW.author_username,
        NEW.author_avatar,
        NEW.is_anonymous,
        'room_message_reply',
        v_sender_alias || ' replied to you in #' || v_room.name || ' 💬',
        '"' || LEFT(NEW.text, 120) || '"',
        'room-detail',
        NEW.room_id::text
      );
    END IF;
  END IF;

  -- (14b) @Mentions inside a Room Message
  FOR v_match IN
    SELECT regexp_matches(COALESCE(NEW.text, ''), '@([a-zA-Z0-9_]+)', 'g')
  LOOP
    SELECT * INTO v_mentioned_user
    FROM public.profiles
    WHERE LOWER(username) = LOWER(v_match[1])
    LIMIT 1;

    IF FOUND
       AND v_mentioned_user.id IS DISTINCT FROM NEW.author_user_id
       AND NOT (v_mentioned_user.id = ANY(v_notified_ids))
    THEN
      v_notified_ids := array_append(v_notified_ids, v_mentioned_user.id);
      PERFORM public.create_app_notification(
        v_mentioned_user.id,
        NEW.author_user_id,
        v_sender_alias,
        NEW.author_username,
        NEW.author_avatar,
        NEW.is_anonymous,
        'room_mention',
        v_sender_alias || ' mentioned you in #' || v_room.name || ' 📣',
        '"' || LEFT(NEW.text, 120) || '"',
        'room-detail',
        NEW.room_id::text
      );
    END IF;
  END LOOP;

  -- (14c) Notify Room Creator of new messages in their room
  IF v_room.creator_user_id IS NOT NULL
     AND v_room.creator_user_id IS DISTINCT FROM NEW.author_user_id
     AND NOT (v_room.creator_user_id = ANY(v_notified_ids))
  THEN
    PERFORM public.create_app_notification(
      v_room.creator_user_id,
      NEW.author_user_id,
      v_sender_alias,
      NEW.author_username,
      NEW.author_avatar,
      NEW.is_anonymous,
      'room_activity',
      'New Message in #' || v_room.name || ' 💬',
      v_sender_alias || ': "' || LEFT(NEW.text, 110) || '"',
      'room-detail',
      NEW.room_id::text
    );
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_room_message ON public.room_messages;
CREATE TRIGGER trg_notify_on_room_message
  AFTER INSERT ON public.room_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_room_message();

-- (15) Room Message Liked
CREATE OR REPLACE FUNCTION public.notify_on_room_message_liked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msg public.room_messages%ROWTYPE;
  v_room public.community_rooms%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.room_messages WHERE id = NEW.message_id;
  IF NOT FOUND OR v_msg.author_user_id IS NULL OR v_msg.author_user_id = NEW.user_id THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_room FROM public.community_rooms WHERE id = v_msg.room_id;

  PERFORM public.create_app_notification(
    v_msg.author_user_id,
    NULL,
    'Room Member',
    NULL,
    NULL,
    true,
    'room_message_liked',
    'Someone Liked Your Message in #' || COALESCE(v_room.name, 'Room') || ' ❤️',
    '"' || LEFT(v_msg.text, 110) || '"',
    'room-detail',
    v_msg.room_id::text
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_room_message_liked ON public.room_message_likes;
CREATE TRIGGER trg_notify_on_room_message_liked
  AFTER INSERT ON public.room_message_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_room_message_liked();

-- (16) Room Message Emoji Reaction Added
CREATE OR REPLACE FUNCTION public.notify_on_room_message_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msg public.room_messages%ROWTYPE;
  v_room public.community_rooms%ROWTYPE;
BEGIN
  SELECT * INTO v_msg FROM public.room_messages WHERE id = NEW.message_id;
  IF NOT FOUND OR v_msg.author_user_id IS NULL OR v_msg.author_user_id = NEW.user_id THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_room FROM public.community_rooms WHERE id = v_msg.room_id;

  PERFORM public.create_app_notification(
    v_msg.author_user_id,
    NULL,
    'Room Member',
    NULL,
    NULL,
    true,
    'room_message_reaction',
    'New ' || NEW.emoji || ' Reaction in #' || COALESCE(v_room.name, 'Room'),
    'Someone reacted ' || NEW.emoji || ' to your message: "' || LEFT(v_msg.text, 100) || '"',
    'room-detail',
    v_msg.room_id::text
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_room_message_reaction ON public.room_message_reactions;
CREATE TRIGGER trg_notify_on_room_message_reaction
  AFTER INSERT ON public.room_message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_room_message_reaction();

-- =================================================================================
-- 6. ALL 17 RPC FUNCTIONS FOR ATOMIC FRONTEND ACTIONS & ANONYMOUS 1-ON-1 CONVOS
-- Automatically drops any existing version/return-type of these 17 RPCs first
-- so PostgreSQL never throws ERROR 42P13 (cannot change return type of existing function)
-- =================================================================================

DO $$
DECLARE
  fn_record record;
  rpc_names text[] := ARRAY[
    'send_anonymous_message',
    'get_sender_convo_threads',
    'post_private_convo_reply',
    'add_anonymous_message_reaction',
    'report_or_block_message',
    'mark_notifications_read',
    'toggle_answer_like',
    'toggle_post_like',
    'toggle_post_bookmark',
    'cast_poll_vote',
    'toggle_comment_like',
    'increment_post_share',
    'toggle_join_room',
    'toggle_follow_user',
    'toggle_room_message_like',
    'toggle_room_message_reaction',
    'room_presence_heartbeat'
  ];
BEGIN
  FOR fn_record IN
    SELECT p.oid::regprocedure AS fn_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = ANY(rpc_names)
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', fn_record.fn_sig);
  END LOOP;
END $$;

-- 6.1 Send Anonymous Message (resolves recipient by username & enforces link_active + blocked senders/words)
CREATE OR REPLACE FUNCTION public.send_anonymous_message(
  p_recipient_username text,
  p_text text,
  p_sender_token text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_clean_username text;
  v_link_active boolean;
  v_is_suspended boolean;
  v_blocked_senders text[];
  v_hidden_words text[];
  v_global_blocked text[];
  v_word text;
  v_lower_text text;
  v_msg_id uuid;
BEGIN
  IF p_text IS NULL OR LENGTH(TRIM(p_text)) = 0 THEN
    RAISE EXCEPTION 'Message text cannot be empty';
  END IF;

  IF LENGTH(TRIM(p_text)) > 500 THEN
    RAISE EXCEPTION 'Message cannot exceed 500 characters';
  END IF;

  v_clean_username := LOWER(TRIM(BOTH '@' FROM TRIM(p_recipient_username)));

  SELECT id, username, link_active, is_suspended
  INTO v_recipient_id, v_clean_username, v_link_active, v_is_suspended
  FROM public.profiles
  WHERE LOWER(username) = v_clean_username
  LIMIT 1;

  IF v_recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient @% not found', v_clean_username;
  END IF;

  IF v_is_suspended = true OR v_link_active = false THEN
    RAISE EXCEPTION 'Recipient link is currently paused or unavailable';
  END IF;

  SELECT COALESCE(blocked_senders, '{}'::text[]), COALESCE(hidden_words, '{}'::text[])
  INTO v_blocked_senders, v_hidden_words
  FROM public.user_safety_settings
  WHERE user_id = v_recipient_id;

  IF p_sender_token IS NOT NULL AND v_blocked_senders IS NOT NULL AND p_sender_token = ANY(v_blocked_senders) THEN
    RAISE EXCEPTION 'You are unable to send messages to this recipient';
  END IF;

  v_lower_text := LOWER(TRIM(p_text));

  IF v_hidden_words IS NOT NULL THEN
    FOREACH v_word IN ARRAY v_hidden_words LOOP
      IF LENGTH(TRIM(v_word)) > 0 AND POSITION(LOWER(TRIM(v_word)) IN v_lower_text) > 0 THEN
        RAISE EXCEPTION 'Message contains words filtered by the recipient';
      END IF;
    END LOOP;
  END IF;

  SELECT COALESCE(global_blocked_words, '{}'::text[])
  INTO v_global_blocked
  FROM public.platform_settings
  WHERE id = 'global';

  IF v_global_blocked IS NOT NULL THEN
    FOREACH v_word IN ARRAY v_global_blocked LOOP
      IF LENGTH(TRIM(v_word)) > 0 AND POSITION(LOWER(TRIM(v_word)) IN v_lower_text) > 0 THEN
        RAISE EXCEPTION 'Message contains prohibited platform keywords';
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.anonymous_messages (
    recipient_user_id,
    recipient_username,
    sender_user_id,
    sender_token,
    text
  )
  VALUES (
    v_recipient_id,
    v_clean_username,
    auth.uid(),
    p_sender_token,
    TRIM(p_text)
  )
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

-- 6.2 Fetch 1-on-1 Convo Threads for Anonymous Sender Token
CREATE OR REPLACE FUNCTION public.get_sender_convo_threads(p_sender_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_sender_token IS NULL OR LENGTH(TRIM(p_sender_token)) < 20 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'recipient_username', m.recipient_username,
        'text', m.text,
        'is_read', m.is_read,
        'read_at', m.read_at,
        'is_answered', m.is_answered,
        'likes_count', m.likes_count,
        'replies_count', m.replies_count,
        'reactions', m.reactions,
        'created_at', m.created_at,
        'comments', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', c.id,
                'message_id', c.message_id,
                'author_name', c.author_name,
                'author_role', c.author_role,
                'author_avatar', c.author_avatar,
                'is_anonymous', c.is_anonymous,
                'text', c.text,
                'likes_count', c.likes_count,
                'created_at', c.created_at
              )
              ORDER BY c.created_at ASC
            )
            FROM public.message_comments c
            WHERE c.message_id = m.id
          ),
          '[]'::jsonb
        )
      )
      ORDER BY m.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.anonymous_messages m
  WHERE m.sender_token = p_sender_token;

  RETURN v_result;
END;
$$;

-- 6.3 Post Private 1-on-1 Convo Reply (supports both recipient and anonymous sender)
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

-- 6.4 Add Reaction to Anonymous Message (recipient, sender, or admin only)
CREATE OR REPLACE FUNCTION public.add_anonymous_message_reaction(
  p_message_id uuid,
  p_emoji text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_msg public.anonymous_messages%ROWTYPE;
  v_reactions jsonb;
  v_current int;
BEGIN
  SELECT * INTO v_msg
  FROM public.anonymous_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  IF auth.uid() IS NULL OR (
    auth.uid() IS DISTINCT FROM v_msg.recipient_user_id
    AND auth.uid() IS DISTINCT FROM v_msg.sender_user_id
    AND NOT public.is_admin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only the message recipient or sender can react to this message';
  END IF;

  v_reactions := COALESCE(v_msg.reactions, '{}'::jsonb);
  v_current := COALESCE((v_reactions->>p_emoji)::int, 0);
  v_reactions := jsonb_set(v_reactions, ARRAY[p_emoji], to_jsonb(v_current + 1), true);

  UPDATE public.anonymous_messages
  SET reactions = v_reactions,
      likes_count = likes_count + 1
  WHERE id = p_message_id;
END;
$$;

-- 6.5 Report or Block Anonymous Message Sender (recipient or admin only)
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

-- 6.6 Mark Notifications Read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  p_notification_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  IF p_notification_id IS NULL THEN
    UPDATE public.notifications
    SET is_read = true, read_at = COALESCE(read_at, now())
    WHERE recipient_user_id = auth.uid() AND is_read = false;
  ELSE
    UPDATE public.notifications
    SET is_read = true, read_at = COALESCE(read_at, now())
    WHERE id = p_notification_id AND recipient_user_id = auth.uid();
  END IF;
END;
$$;

-- 6.7 Toggle Story Answer Like (authenticated users only)
CREATE OR REPLACE FUNCTION public.toggle_answer_like(p_answer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.message_answer_likes WHERE answer_id = p_answer_id AND user_id = auth.uid()) THEN
    DELETE FROM public.message_answer_likes WHERE answer_id = p_answer_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.message_answer_likes (answer_id, user_id) VALUES (p_answer_id, auth.uid());
  END IF;
END;
$$;

-- 6.8 Toggle Social Post Like (authenticated users only)
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.post_likes WHERE post_id = p_post_id AND user_id = auth.uid()) THEN
    DELETE FROM public.post_likes WHERE post_id = p_post_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.post_likes (post_id, user_id) VALUES (p_post_id, auth.uid());
  END IF;
END;
$$;

-- 6.9 Toggle Social Post Bookmark
CREATE OR REPLACE FUNCTION public.toggle_post_bookmark(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.post_bookmarks WHERE post_id = p_post_id AND user_id = auth.uid()) THEN
    DELETE FROM public.post_bookmarks WHERE post_id = p_post_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.post_bookmarks (post_id, user_id) VALUES (p_post_id, auth.uid());
  END IF;
END;
$$;

-- 6.10 Cast Poll Vote (authenticated users only)
CREATE OR REPLACE FUNCTION public.cast_poll_vote(p_post_id uuid, p_option_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  INSERT INTO public.poll_votes (post_id, option_id, user_id)
  VALUES (p_post_id, p_option_id, auth.uid())
  ON CONFLICT (post_id, user_id)
  DO UPDATE SET option_id = EXCLUDED.option_id;
END;
$$;

-- 6.11 Toggle Post Comment Like (authenticated users only)
CREATE OR REPLACE FUNCTION public.toggle_comment_like(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.post_comment_likes WHERE comment_id = p_comment_id AND user_id = auth.uid()) THEN
    DELETE FROM public.post_comment_likes WHERE comment_id = p_comment_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.post_comment_likes (comment_id, user_id) VALUES (p_comment_id, auth.uid());
  END IF;
END;
$$;

-- 6.12 Increment Post Share Count (authenticated users only)
CREATE OR REPLACE FUNCTION public.increment_post_share(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  UPDATE public.social_posts
  SET shares_count = shares_count + 1
  WHERE id = p_post_id;
END;
$$;

-- 6.13 Toggle Join Community Room
CREATE OR REPLACE FUNCTION public.toggle_join_room(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.room_memberships WHERE room_id = p_room_id AND user_id = auth.uid()) THEN
    DELETE FROM public.room_memberships WHERE room_id = p_room_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.room_memberships (room_id, user_id) VALUES (p_room_id, auth.uid());
  END IF;
END;
$$;

-- 6.14 Toggle Follow Student / Creator
CREATE OR REPLACE FUNCTION public.toggle_follow_user(p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = p_target_user_id OR public.is_user_suspended() THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.user_follows WHERE follower_id = auth.uid() AND following_id = p_target_user_id) THEN
    DELETE FROM public.user_follows WHERE follower_id = auth.uid() AND following_id = p_target_user_id;
  ELSE
    INSERT INTO public.user_follows (follower_id, following_id) VALUES (auth.uid(), p_target_user_id);
  END IF;
END;
$$;

-- 6.15 Toggle Room Message Like (authenticated users only)
CREATE OR REPLACE FUNCTION public.toggle_room_message_like(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM public.room_message_likes WHERE message_id = p_message_id AND user_id = auth.uid()) THEN
    DELETE FROM public.room_message_likes WHERE message_id = p_message_id AND user_id = auth.uid();
  ELSE
    INSERT INTO public.room_message_likes (message_id, user_id) VALUES (p_message_id, auth.uid());
  END IF;
END;
$$;

-- 6.16 Toggle Room Message Reaction
CREATE OR REPLACE FUNCTION public.toggle_room_message_reaction(p_message_id uuid, p_emoji text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.room_message_reactions
    WHERE message_id = p_message_id AND user_id = auth.uid() AND emoji = p_emoji
  ) THEN
    DELETE FROM public.room_message_reactions
    WHERE message_id = p_message_id AND user_id = auth.uid() AND emoji = p_emoji;
  ELSE
    INSERT INTO public.room_message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, auth.uid(), p_emoji);
  END IF;
END;
$$;

-- 6.17 Room Presence Heartbeat
CREATE OR REPLACE FUNCTION public.room_presence_heartbeat(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_user_suspended() THEN RETURN; END IF;

  INSERT INTO public.room_presence (room_id, user_id, last_seen_at)
  VALUES (p_room_id, auth.uid(), now())
  ON CONFLICT (room_id, user_id)
  DO UPDATE SET last_seen_at = now();

  INSERT INTO public.room_memberships (room_id, user_id)
  VALUES (p_room_id, auth.uid())
  ON CONFLICT (room_id, user_id) DO NOTHING;
END;
$$;

-- =================================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES ACROSS ALL 24 TABLES
-- =================================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_safety_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_answer_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_assigned_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_presence ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- profiles
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

  -- user_safety_settings
  DROP POLICY IF EXISTS "Users manage own safety settings" ON public.user_safety_settings;
  CREATE POLICY "Users manage own safety settings" ON public.user_safety_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- user_follows
  DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
  CREATE POLICY "Anyone can view follows" ON public.user_follows FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Authenticated users manage follows" ON public.user_follows;
  CREATE POLICY "Authenticated users manage follows" ON public.user_follows FOR ALL USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

  -- social_posts (owner-scoped write policies; no unauthenticated or cross-user tampering)
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

  -- anonymous_messages (strictly private to recipient & authenticated sender; unauthenticated senders use RPC)
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
  CREATE POLICY "Authenticated users can create community rooms" ON public.community_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (creator_user_id IS NULL OR creator_user_id = auth.uid()));
  DROP POLICY IF EXISTS "Anyone can update community rooms" ON public.community_rooms;
  DROP POLICY IF EXISTS "Creators can update community rooms" ON public.community_rooms;
  CREATE POLICY "Creators can update community rooms" ON public.community_rooms FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = creator_user_id) WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = creator_user_id);
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

  DROP POLICY IF EXISTS "Users read and update own notifications" ON public.notifications;
  CREATE POLICY "Users read and update own notifications" ON public.notifications FOR ALL USING (auth.uid() = recipient_user_id) WITH CHECK (auth.uid() = recipient_user_id);

  DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
  CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Authenticated users can submit moderation reports" ON public.moderation_reports;
  CREATE POLICY "Authenticated users can submit moderation reports" ON public.moderation_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (reporter_user_id IS NULL OR reporter_user_id = auth.uid()));
  DROP POLICY IF EXISTS "Reporters can view own reports" ON public.moderation_reports;
  CREATE POLICY "Reporters can view own reports" ON public.moderation_reports FOR SELECT USING (auth.uid() = reporter_user_id);
END $$;

-- =================================================================================
-- 8. REAL-TIME ADMIN CONSOLE TABLES, UNIVERSAL ADMIN RLS & ATOMIC MODERATION RPCs
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
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.moderation_reports
  ADD COLUMN IF NOT EXISTS reporter_username text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

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

INSERT INTO public.platform_settings (id, global_blocked_words, allow_anonymous_confessions, allow_new_rooms, maintenance_mode)
VALUES ('global', ARRAY['scam', 'phishing', 'doxx']::text[], true, true, false)
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

ALTER TABLE public.platform_settings REPLICA IDENTITY FULL;
ALTER TABLE public.campus_announcements REPLICA IDENTITY FULL;
ALTER TABLE public.admin_audit_logs REPLICA IDENTITY FULL;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

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
  all_tables text[] := ARRAY[
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
  FOREACH tbl IN ARRAY all_tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS "Admins have full control on %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Admins have full control on %I" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())',
      tbl,
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "Restrict suspended users on %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Restrict suspended users on %I" ON public.%I AS RESTRICTIVE FOR ALL USING (NOT public.is_user_suspended()) WITH CHECK (NOT public.is_user_suspended())',
      tbl,
      tbl
    );
  END LOOP;

  DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
  CREATE POLICY "Anyone can read platform settings" ON public.platform_settings FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Anyone can read campus announcements" ON public.campus_announcements;
  DROP POLICY IF EXISTS "Anyone can insert campus announcements" ON public.campus_announcements;
  DROP POLICY IF EXISTS "Anyone can update campus announcements" ON public.campus_announcements;
  DROP POLICY IF EXISTS "Anyone can delete campus announcements" ON public.campus_announcements;
  CREATE POLICY "Anyone can read campus announcements" ON public.campus_announcements FOR SELECT USING (is_active = true OR public.is_admin());

  DROP POLICY IF EXISTS "Anyone can view admin audit logs" ON public.admin_audit_logs;
  DROP POLICY IF EXISTS "Anyone can insert admin audit logs" ON public.admin_audit_logs;

  DROP POLICY IF EXISTS "Anyone can view moderation reports" ON public.moderation_reports;
  DROP POLICY IF EXISTS "Anyone can update moderation reports" ON public.moderation_reports;
  DROP POLICY IF EXISTS "Anyone can delete moderation reports" ON public.moderation_reports;
END $$;


