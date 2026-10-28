-- =================================================================================
-- BOPOI COMPLETE REAL-TIME NOTIFICATION ENGINE (ALL 20 SITE NOTIFICATION EVENTS)
-- Safe to run repeatedly in the Supabase SQL Editor (idempotent)
-- =================================================================================

-- 1. Ensure notifications.type is flexible text so all notification types work
DO $$
BEGIN
  ALTER TABLE public.notifications ALTER COLUMN type TYPE text USING type::text;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Central Helper Function to Safely Create Any Site Notification
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

-- 3. (Event 1) Welcome Notification on New Account Signup
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

-- 4. (Events 2 & 3) New Anonymous Q&A Message Received & Reaction on Anonymous Message
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
    IF OLD.reactions IS DISTINCT FROM NEW.reactions
       AND NEW.sender_user_id IS NOT NULL
       AND NEW.sender_user_id IS DISTINCT FROM NEW.recipient_user_id
    THEN
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

-- 5. (Events 4 & 5) Private 1-on-1 Q&A Convo Reply (Recipient <-> Anonymous Sender)
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

-- 6. (Events 6 & 7) Q&A Answer Published (Notifies Question Sender + Followers)
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

-- 7. (Event 8) Q&A Story Answer Liked
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

-- 8. (Events 9 & 10) Social Post Created: @Mentions in Post + Notify Followers of Public Posts
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

-- 9. (Events 11 & 12) Social Post Liked + Viral Like Milestones (5, 10, 25, 50, 100, 250, 500)
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

-- 10. (Event 13) Social Post Bookmarked / Saved
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

-- 11. (Events 14, 15 & 16) Post Comments, Thread Replies & @Mentions in Comments
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

  -- (a) If this is a reply to an existing comment, notify the parent comment author
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

  -- (b) Notify the post author (if not already notified above and not self-commenting)
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

  -- (c) Notify any @mentioned students in the comment text
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

-- 12. (Event 17) Post Comment Liked
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

-- 13. (Events 18 & 19) Poll Vote Cast + Poll Vote Milestones (5, 10, 25, 50, 100, 250)
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

-- 14. (Event 20) New Follower (Student Followed You)
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

-- 15. (Event 21) Student Joined Your Anonymous Room
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

-- 16. (Events 22, 23 & 24) Room Messages: Direct Replies, @Mentions & Activity in Your Room
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

  -- (a) Direct Reply to a Room Message
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

  -- (b) @Mentions inside a Room Message
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

  -- (c) Notify Room Creator of new messages in their room
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

-- 17. (Event 25) Room Message Liked
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

-- 18. (Event 26) Room Message Emoji Reaction Added
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
