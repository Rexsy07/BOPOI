-- ============================================================================
-- BOPOI - PART 2: NOTIFICATIONS, ATOMIC RPC FUNCTIONS, PRESENCE, SEARCH & WEBHOOKS
-- Run this script in the Supabase SQL Editor right after 0001_bopoi_full_schema.sql
-- (Safe & idempotent: uses CREATE IF NOT EXISTS / CREATE OR REPLACE)
-- ============================================================================

-- 0. ENABLE PG_NET FOR EDGE FUNCTION DATABASE WEBHOOKS
create extension if not exists "pg_net";

-- ============================================================================
-- 1. NOTIFICATION TYPES & REAL-TIME NOTIFICATIONS TABLE
-- ============================================================================
do $$ begin
  create type public.notification_type as enum (
    'anon_message_received',
    'anon_convo_reply',
    'answer_published',
    'answer_liked',
    'post_liked',
    'post_commented',
    'comment_replied',
    'comment_liked',
    'poll_voted',
    'user_followed',
    'room_message_reply',
    'room_message_reaction',
    'system_alert'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'Someone',
  actor_username text,
  actor_avatar text,
  is_anonymous boolean not null default false,
  type public.notification_type not null,
  title text not null,
  body text not null,
  target_view text not null default 'home', -- e.g. 'inbox', 'message-detail', 'post-detail', 'poll-detail', 'room-detail', 'public-profile'
  target_id text,                           -- e.g. post_id, message_id, room_id, or username
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_unread
  on public.notifications (recipient_user_id, is_read, created_at desc);

-- Web Push / Mobile Push Subscriptions for Background Alerts
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Moderation Reports Table (for reported anonymous messages, posts, comments, or room messages)
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('anonymous_message', 'social_post', 'post_comment', 'room_message', 'user')),
  target_id text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Real-Time Room Presence & Active Heartbeats (tracks live online_count per room)
create table if not exists public.room_presence (
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_room_presence_last_seen
  on public.room_presence (room_id, last_seen_at desc);

-- ============================================================================
-- 2. MISSING COUNTER TRIGGERS (Answer Likes & Room Online Count)
-- ============================================================================

-- 2.1 Sync likes_count on public.message_answers when someone likes a Story Answer
create or replace function public.sync_answer_likes_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.message_answers set likes_count = likes_count + 1 where id = new.answer_id;
  elsif (tg_op = 'DELETE') then
    update public.message_answers set likes_count = greatest(0, likes_count - 1) where id = old.answer_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_answer_likes_count on public.message_answer_likes;
create trigger trg_sync_answer_likes_count
  after insert or delete on public.message_answer_likes
  for each row execute function public.sync_answer_likes_count();

-- 2.2 Automatically keep profiles.updated_at and social_posts.updated_at current
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_social_posts_updated_at on public.social_posts;
create trigger trg_social_posts_updated_at
  before update on public.social_posts
  for each row execute function public.set_updated_at_timestamp();

-- ============================================================================
-- 3. AUTOMATED REAL-TIME NOTIFICATION TRIGGERS
-- ============================================================================

-- 3.1 Notify recipient when a new Anonymous Inbox Message arrives
create or replace function public.notify_on_anonymous_message()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    actor_name,
    is_anonymous,
    type,
    title,
    body,
    target_view,
    target_id,
    metadata
  ) values (
    new.recipient_user_id,
    null,
    'Anonymous Student',
    true,
    'anon_message_received',
    'New Anonymous Message 💌',
    left(new.text, 120),
    'message-detail',
    new.id::text,
    jsonb_build_object('message_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_on_anonymous_message on public.anonymous_messages;
create trigger trg_notify_on_anonymous_message
  after insert on public.anonymous_messages
  for each row execute function public.notify_on_anonymous_message();

-- 3.2 Notify the other participant when a 1-on-1 Private Convo Reply is sent
create or replace function public.notify_on_message_convo_reply()
returns trigger
language plpgsql
security definer
as $$
declare
  v_msg public.anonymous_messages%rowtype;
  v_target_user uuid;
begin
  select * into v_msg from public.anonymous_messages where id = new.message_id;
  if not found then
    return new;
  end if;

  if new.author_role = 'sender' then
    -- Sender replied -> notify the inbox owner (recipient)
    v_target_user := v_msg.recipient_user_id;
  else
    -- Recipient replied -> notify the original sender if they were logged in
    v_target_user := v_msg.sender_user_id;
  end if;

  if v_target_user is not null and (new.author_user_id is null or v_target_user <> new.author_user_id) then
    insert into public.notifications (
      recipient_user_id,
      actor_user_id,
      actor_name,
      actor_avatar,
      is_anonymous,
      type,
      title,
      body,
      target_view,
      target_id,
      metadata
    ) values (
      v_target_user,
      case when new.is_anonymous then null else new.author_user_id end,
      case when new.is_anonymous then 'Anonymous Sender' else new.author_name end,
      case when new.is_anonymous then null else new.author_avatar end,
      new.is_anonymous,
      'anon_convo_reply',
      case when new.author_role = 'sender'
        then 'New Reply in Anonymous Convo 💬'
        else '@' || v_msg.recipient_username || ' replied to your anonymous message 💬'
      end,
      left(new.text, 120),
      'message-detail',
      new.message_id::text,
      jsonb_build_object('message_id', new.message_id, 'comment_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_message_convo_reply on public.message_comments;
create trigger trg_notify_on_message_convo_reply
  after insert on public.message_comments
  for each row execute function public.notify_on_message_convo_reply();

-- 3.3 Notify when a Post is Liked
create or replace function public.notify_on_post_like()
returns trigger
language plpgsql
security definer
as $$
declare
  v_post public.social_posts%rowtype;
  v_actor public.profiles%rowtype;
begin
  select * into v_post from public.social_posts where id = new.post_id;
  if not found or v_post.author_user_id is null or v_post.author_user_id = new.user_id then
    return new;
  end if;

  select * into v_actor from public.profiles where id = new.user_id;

  insert into public.notifications (
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
    metadata
  ) values (
    v_post.author_user_id,
    new.user_id,
    coalesce(v_actor.display_name, 'A student'),
    v_actor.username,
    v_actor.avatar_url,
    false,
    'post_liked',
    coalesce(v_actor.display_name, 'Someone') || ' liked your ' || v_post.type::text || ' ❤️',
    left(coalesce(v_post.title, v_post.content), 100),
    case when v_post.type = 'poll' then 'poll-detail' else 'post-detail' end,
    v_post.id::text,
    jsonb_build_object('post_id', v_post.id, 'post_type', v_post.type)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_on_post_like on public.post_likes;
create trigger trg_notify_on_post_like
  after insert on public.post_likes
  for each row execute function public.notify_on_post_like();

-- 3.4 Notify when a Post receives a Comment or a Threaded Reply
create or replace function public.notify_on_post_comment()
returns trigger
language plpgsql
security definer
as $$
declare
  v_post public.social_posts%rowtype;
  v_parent public.post_comments%rowtype;
begin
  select * into v_post from public.social_posts where id = new.post_id;
  if not found then
    return new;
  end if;

  -- If this is a reply to a parent comment, notify the parent comment author
  if new.parent_id is not null then
    select * into v_parent from public.post_comments where id = new.parent_id;
    if found and v_parent.author_user_id is not null and v_parent.author_user_id <> new.author_user_id then
      insert into public.notifications (
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
        metadata
      ) values (
        v_parent.author_user_id,
        case when new.is_anonymous then null else new.author_user_id end,
        case when new.is_anonymous then 'Anonymous Student' else new.author_name end,
        case when new.is_anonymous then null else new.author_username end,
        case when new.is_anonymous then null else new.author_avatar end,
        new.is_anonymous,
        'comment_replied',
        (case when new.is_anonymous then 'Anonymous Student' else new.author_name end) || ' replied to your comment 💬',
        left(new.text, 120),
        case when v_post.type = 'poll' then 'poll-detail' else 'post-detail' end,
        v_post.id::text,
        jsonb_build_object('post_id', v_post.id, 'comment_id', new.id, 'parent_id', new.parent_id)
      );
    end if;
  end if;

  -- Also notify the post author (if not the commenter and not already notified as parent author)
  if v_post.author_user_id is not null
     and (new.author_user_id is null or v_post.author_user_id <> new.author_user_id)
     and (v_parent.author_user_id is null or v_post.author_user_id <> v_parent.author_user_id)
  then
    insert into public.notifications (
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
      metadata
    ) values (
      v_post.author_user_id,
      case when new.is_anonymous then null else new.author_user_id end,
      case when new.is_anonymous then 'Anonymous Student' else new.author_name end,
      case when new.is_anonymous then null else new.author_username end,
      case when new.is_anonymous then null else new.author_avatar end,
      new.is_anonymous,
      'post_commented',
      (case when new.is_anonymous then 'Anonymous Student' else new.author_name end) || ' commented on your ' || v_post.type::text || ' 💬',
      left(new.text, 120),
      case when v_post.type = 'poll' then 'poll-detail' else 'post-detail' end,
      v_post.id::text,
      jsonb_build_object('post_id', v_post.id, 'comment_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_post_comment on public.post_comments;
create trigger trg_notify_on_post_comment
  after insert on public.post_comments
  for each row execute function public.notify_on_post_comment();

-- 3.5 Notify when a User Follows another Student/Creator
create or replace function public.notify_on_user_follow()
returns trigger
language plpgsql
security definer
as $$
declare
  v_follower public.profiles%rowtype;
begin
  select * into v_follower from public.profiles where id = new.follower_id;
  if not found then
    return new;
  end if;

  insert into public.notifications (
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
    metadata
  ) values (
    new.following_id,
    new.follower_id,
    v_follower.display_name,
    v_follower.username,
    v_follower.avatar_url,
    false,
    'user_followed',
    v_follower.display_name || ' (@' || v_follower.username || ') started following you ✨',
    coalesce(nullif(v_follower.bio, ''), 'Tap to view their campus profile.'),
    'public-profile',
    v_follower.username,
    jsonb_build_object('follower_id', v_follower.id, 'username', v_follower.username)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_on_user_follow on public.user_follows;
create trigger trg_notify_on_user_follow
  after insert on public.user_follows
  for each row execute function public.notify_on_user_follow();

-- 3.6 Notify when someone replies to your message inside a Community Room
create or replace function public.notify_on_room_reply()
returns trigger
language plpgsql
security definer
as $$
declare
  v_orig public.room_messages%rowtype;
  v_room public.community_rooms%rowtype;
begin
  if new.reply_to_id is null then
    return new;
  end if;

  select * into v_orig from public.room_messages where id = new.reply_to_id;
  if not found or v_orig.author_user_id is null or v_orig.author_user_id = new.author_user_id then
    return new;
  end if;

  select * into v_room from public.community_rooms where id = new.room_id;

  insert into public.notifications (
    recipient_user_id,
    actor_user_id,
    actor_name,
    is_anonymous,
    type,
    title,
    body,
    target_view,
    target_id,
    metadata
  ) values (
    v_orig.author_user_id,
    case when new.is_anonymous then null else new.author_user_id end,
    coalesce(new.author_alias, new.author_name, 'Someone'),
    new.is_anonymous,
    'room_message_reply',
    coalesce(new.author_alias, new.author_name) || ' replied to you in ' || coalesce(v_room.name, 'a room'),
    left(new.text, 120),
    'room-detail',
    new.room_id::text,
    jsonb_build_object('room_id', new.room_id, 'message_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_on_room_reply on public.room_messages;
create trigger trg_notify_on_room_reply
  after insert on public.room_messages
  for each row execute function public.notify_on_room_reply();

-- ============================================================================
-- 4. COMPLETE ATOMIC RPC FUNCTIONS FOR EVERY FRONTEND INTERACTION
-- ============================================================================

-- 4.1 Toggle Post Like Atomically
create or replace function public.toggle_post_like(p_post_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.post_likes where post_id = p_post_id and user_id = v_uid) then
    delete from public.post_likes where post_id = p_post_id and user_id = v_uid;
    v_liked := false;
  else
    insert into public.post_likes (post_id, user_id) values (p_post_id, v_uid);
    v_liked := true;
  end if;

  select likes_count into v_count from public.social_posts where id = p_post_id;
  return jsonb_build_object('liked', v_liked, 'likes_count', coalesce(v_count, 0));
end;
$$;

-- 4.2 Toggle Post Bookmark (Saved Posts) Atomically
create or replace function public.toggle_post_bookmark(p_post_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.post_bookmarks where post_id = p_post_id and user_id = v_uid) then
    delete from public.post_bookmarks where post_id = p_post_id and user_id = v_uid;
    return false;
  else
    insert into public.post_bookmarks (post_id, user_id) values (p_post_id, v_uid);
    return true;
  end if;
end;
$$;

-- 4.3 Increment Post Share Count Atomically
create or replace function public.increment_post_share(p_post_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_new_count integer;
begin
  update public.social_posts
  set shares_count = shares_count + 1
  where id = p_post_id
  returning shares_count into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;

-- 4.4 Toggle Comment Like Atomically
create or replace function public.toggle_comment_like(p_comment_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_liked boolean;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.post_comment_likes where comment_id = p_comment_id and user_id = v_uid) then
    delete from public.post_comment_likes where comment_id = p_comment_id and user_id = v_uid;
    v_liked := false;
  else
    insert into public.post_comment_likes (comment_id, user_id) values (p_comment_id, v_uid);
    v_liked := true;
  end if;

  select likes_count into v_count from public.post_comments where id = p_comment_id;
  return jsonb_build_object('liked', v_liked, 'likes_count', coalesce(v_count, 0));
end;
$$;

-- 4.5 Toggle Follow / Unfollow Student or Creator Atomically
create or replace function public.toggle_follow_user(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_following boolean;
  v_followers integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if v_uid = p_target_user_id then
    raise exception 'You cannot follow yourself';
  end if;

  if exists (select 1 from public.user_follows where follower_id = v_uid and following_id = p_target_user_id) then
    delete from public.user_follows where follower_id = v_uid and following_id = p_target_user_id;
    v_following := false;
  else
    insert into public.user_follows (follower_id, following_id) values (v_uid, p_target_user_id);
    v_following := true;
  end if;

  select followers_count into v_followers from public.profiles where id = p_target_user_id;
  return jsonb_build_object('is_following', v_following, 'followers_count', coalesce(v_followers, 0));
end;
$$;

-- 4.6 Create Social Post with Poll Options Atomically in One Transaction
create or replace function public.create_social_post_with_poll(
  p_type public.social_post_type,
  p_content text,
  p_title text default null,
  p_category text default 'Campus Life',
  p_hashtags text[] default '{}',
  p_is_anonymous boolean default false,
  p_poll_options text[] default null,
  p_poll_expires_in text default '24h left'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_post_id uuid;
  v_idx integer;
  v_opt text;
begin
  if v_uid is null then
    raise exception 'Authentication required to create a post';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'User profile not found';
  end if;

  insert into public.social_posts (
    type,
    author_user_id,
    author_name,
    author_username,
    author_avatar,
    author_campus,
    is_anonymous,
    category,
    title,
    content,
    hashtags,
    poll_expires_in,
    poll_expires_at
  ) values (
    p_type,
    v_uid,
    case when p_is_anonymous then 'Anonymous Student' else v_profile.display_name end,
    case when p_is_anonymous then 'anonymous' else v_profile.username end,
    case when p_is_anonymous then null else v_profile.avatar_url end,
    v_profile.campus,
    p_is_anonymous,
    coalesce(nullif(trim(p_category), ''), 'Campus Life'),
    nullif(trim(p_title), ''),
    trim(p_content),
    coalesce(p_hashtags, '{}'),
    p_poll_expires_in,
    case when p_type = 'poll' then now() + interval '24 hours' else null end
  )
  returning id into v_post_id;

  if p_type = 'poll' and p_poll_options is not null and array_length(p_poll_options, 1) >= 2 then
    for v_idx in 1 .. array_length(p_poll_options, 1) loop
      v_opt := trim(p_poll_options[v_idx]);
      if char_length(v_opt) > 0 then
        insert into public.poll_options (post_id, text, sort_order)
        values (v_post_id, v_opt, v_idx - 1);
      end if;
    end loop;
  end if;

  return v_post_id;
end;
$$;

-- 4.7 Post 1-on-1 Private Convo Reply (Supports both Logged-in Recipient & Anonymous Sender Token)
create or replace function public.post_private_convo_reply(
  p_message_id uuid,
  p_text text,
  p_sender_token text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_msg public.anonymous_messages%rowtype;
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_role public.convo_author_role;
  v_author_name text;
  v_author_avatar text := null;
  v_is_anon boolean := true;
  v_comment_id uuid;
begin
  if char_length(trim(p_text)) < 1 then
    raise exception 'Reply text cannot be empty';
  end if;

  select * into v_msg from public.anonymous_messages where id = p_message_id;
  if not found then
    raise exception 'Message thread not found';
  end if;

  if v_uid is not null and v_uid = v_msg.recipient_user_id then
    v_role := 'recipient';
    select * into v_profile from public.profiles where id = v_uid;
    v_author_name := coalesce(v_profile.display_name, '@' || v_msg.recipient_username);
    v_author_avatar := v_profile.avatar_url;
    v_is_anon := false;
    -- Also mark inbox message as read when recipient replies
    update public.anonymous_messages
    set is_read = true, read_at = coalesce(read_at, now())
    where id = p_message_id;
  elsif (v_uid is not null and v_uid = v_msg.sender_user_id)
        or (p_sender_token is not null and v_msg.sender_token = p_sender_token) then
    v_role := 'sender';
    v_author_name := 'Original Sender';
    v_is_anon := true;
  else
    raise exception 'Not authorized to reply in this private conversation';
  end if;

  insert into public.message_comments (
    message_id,
    author_user_id,
    author_name,
    author_role,
    author_avatar,
    is_anonymous,
    text
  ) values (
    p_message_id,
    v_uid,
    v_author_name,
    v_role,
    v_author_avatar,
    v_is_anon,
    trim(p_text)
  )
  returning id into v_comment_id;

  return v_comment_id;
end;
$$;

-- 4.8 Atomic Room Persona Assignment (First 10 Preset Masks per Room, then Custom Unique Mask)
create or replace function public.assign_or_lock_room_persona(
  p_room_id uuid,
  p_custom_alias text default null,
  p_custom_emoji text default null
)
returns public.room_assigned_personas
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.room_assigned_personas%rowtype;
  v_preset record;
  v_created public.room_assigned_personas%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required to lock a room persona';
  end if;

  -- Return existing locked persona if user already has one in this room
  select * into v_existing
  from public.room_assigned_personas
  where room_id = p_room_id and user_id = v_uid;

  if found then
    return v_existing;
  end if;

  -- Ensure user is joined to the room
  insert into public.room_memberships (room_id, user_id)
  values (p_room_id, v_uid)
  on conflict (room_id, user_id) do nothing;

  -- If custom alias was explicitly provided (for 11th+ user or custom mask)
  if p_custom_alias is not null and char_length(trim(p_custom_alias)) >= 2 then
    insert into public.room_assigned_personas (
      room_id, user_id, alias, mask_id, mask_emoji, is_custom
    ) values (
      p_room_id,
      v_uid,
      trim(p_custom_alias),
      'custom-' || substr(md5(random()::text), 1, 6),
      coalesce(nullif(trim(p_custom_emoji), ''), '🎭'),
      true
    )
    returning * into v_created;
    return v_created;
  end if;

  -- Otherwise, check if any of the 10 preset masks are still unclaimed in this room
  for v_preset in
    select * from (values
      ('shadow-fox',     'Shadow Fox',     '🦊'),
      ('midnight-owl',   'Midnight Owl',   '🦉'),
      ('velvet-phantom', 'Velvet Phantom', '👻'),
      ('cyber-ninja',    'Cyber Ninja',    '🥷'),
      ('golden-lion',    'Golden Lion',    '🦁'),
      ('cosmic-rebel',   'Cosmic Rebel',   '👽'),
      ('mystic-panda',   'Mystic Panda',   '🐼'),
      ('neon-viper',     'Neon Viper',     '🐍'),
      ('storm-falcon',   'Storm Falcon',   '🦅'),
      ('lunar-wolf',     'Lunar Wolf',     '🐺')
    ) as presets(mask_id, alias, emoji)
  loop
    if not exists (
      select 1 from public.room_assigned_personas
      where room_id = p_room_id and lower(alias) = lower(v_preset.alias)
    ) then
      insert into public.room_assigned_personas (
        room_id, user_id, alias, mask_id, mask_emoji, is_custom
      ) values (
        p_room_id, v_uid, v_preset.alias, v_preset.mask_id, v_preset.emoji, false
      )
      returning * into v_created;
      return v_created;
    end if;
  end loop;

  -- All 10 presets are taken and no custom alias was passed yet -> raise specific code so UI opens Custom Persona Modal
  raise exception 'PRESETS_FULL: All 10 default masks in this room are taken. Please choose your custom alias and emoji.';
end;
$$;

-- 4.9 Room Presence Heartbeat (Updates online_count in real time)
create or replace function public.room_presence_heartbeat(p_room_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_online integer;
begin
  if v_uid is not null then
    insert into public.room_presence (room_id, user_id, last_seen_at)
    values (p_room_id, v_uid, now())
    on conflict (room_id, user_id)
    do update set last_seen_at = now();
  end if;

  -- Count active members in the room within the last 2 minutes
  select greatest(1, count(*)::int) into v_online
  from public.room_presence
  where room_id = p_room_id
    and last_seen_at >= now() - interval '2 minutes';

  update public.community_rooms
  set online_count = v_online
  where id = p_room_id;

  return v_online;
end;
$$;

-- 4.9b Update Community Room Profile Icon Atomically
create or replace function public.update_community_room_icon(
  p_room_id uuid,
  p_icon_emoji text,
  p_icon_bg text default '#5420F5'
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update public.community_rooms
  set icon_emoji = p_icon_emoji,
      icon_bg = coalesce(nullif(trim(p_icon_bg), ''), icon_bg)
  where id = p_room_id;
  return found;
end;
$$;

-- 4.10 Toggle Room Message Reaction Atomically
create or replace function public.toggle_room_message_reaction(p_message_id uuid, p_emoji text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reactions jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1 from public.room_message_reactions
    where message_id = p_message_id and user_id = v_uid and emoji = p_emoji
  ) then
    delete from public.room_message_reactions
    where message_id = p_message_id and user_id = v_uid and emoji = p_emoji;
  else
    insert into public.room_message_reactions (message_id, user_id, emoji)
    values (p_message_id, v_uid, p_emoji);
  end if;

  select reactions into v_reactions from public.room_messages where id = p_message_id;
  return coalesce(v_reactions, '{}'::jsonb);
end;
$$;

-- 4.11 Mark Notifications as Read (Single or All)
create or replace function public.mark_notifications_read(p_notification_id uuid default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  if p_notification_id is not null then
    update public.notifications
    set is_read = true, read_at = now()
    where id = p_notification_id and recipient_user_id = auth.uid();
  else
    update public.notifications
    set is_read = true, read_at = now()
    where recipient_user_id = auth.uid() and is_read = false;
  end if;
end;
$$;

-- 4.12 Global Discover Search RPC (Returns Posts, Polls, People, and Rooms — NO room chats, NO Q&A, NO Pages)
create or replace function public.search_discover_global(
  p_query text,
  p_topic text default 'All'
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_term text := trim(coalesce(p_query, ''));
  v_clean_tag text := regexp_replace(lower(v_term), '^#', '');
  v_posts jsonb;
  v_polls jsonb;
  v_people jsonb;
  v_rooms jsonb;
begin
  -- 1. Matching Posts (excluding polls)
  select coalesce(jsonb_agg(p order by p.created_at desc), '[]'::jsonb)
  into v_posts
  from (
    select *
    from public.social_posts
    where type <> 'poll'
      and (p_topic = 'All' or lower(category) = lower(p_topic))
      and (
        v_term = ''
        or content ilike '%' || v_term || '%'
        or coalesce(title, '') ilike '%' || v_term || '%'
        or category ilike '%' || v_term || '%'
        or (not is_anonymous and (author_name ilike '%' || v_term || '%' or author_username ilike '%' || v_term || '%'))
        or exists (select 1 from unnest(hashtags) h where lower(h) like '%' || v_clean_tag || '%')
      )
    limit 40
  ) p;

  -- 2. Matching Polls
  select coalesce(jsonb_agg(pl order by pl.created_at desc), '[]'::jsonb)
  into v_polls
  from (
    select sp.*,
      coalesce(
        (select jsonb_agg(po order by po.sort_order asc) from public.poll_options po where po.post_id = sp.id),
        '[]'::jsonb
      ) as poll_options
    from public.social_posts sp
    where sp.type = 'poll'
      and (p_topic = 'All' or lower(sp.category) = lower(p_topic))
      and (
        v_term = ''
        or sp.content ilike '%' || v_term || '%'
        or coalesce(sp.title, '') ilike '%' || v_term || '%'
        or exists (select 1 from public.poll_options po where po.post_id = sp.id and po.text ilike '%' || v_term || '%')
      )
    limit 25
  ) pl;

  -- 3. Matching People (Students & Creators)
  select coalesce(jsonb_agg(pr order by pr.followers_count desc), '[]'::jsonb)
  into v_people
  from (
    select id, username, display_name, avatar_url, campus, bio, followers_count, following_count, is_creator
    from public.profiles
    where v_term = ''
       or display_name ilike '%' || v_term || '%'
       or username ilike '%' || v_term || '%'
       or campus ilike '%' || v_term || '%'
       or bio ilike '%' || v_term || '%'
    limit 30
  ) pr;

  -- 4. Matching Community Rooms (Rooms only — NEVER room chat messages)
  select coalesce(jsonb_agg(rm order by rm.members_count desc), '[]'::jsonb)
  into v_rooms
  from (
    select *
    from public.community_rooms
    where (p_topic = 'All' or lower(category) = lower(p_topic))
      and (
        v_term = ''
        or name ilike '%' || v_term || '%'
        or description ilike '%' || v_term || '%'
        or category ilike '%' || v_term || '%'
        or exists (select 1 from unnest(tags) t where lower(t) like '%' || v_clean_tag || '%')
      )
    limit 25
  ) rm;

  return jsonb_build_object(
    'posts', v_posts,
    'polls', v_polls,
    'people', v_people,
    'rooms', v_rooms
  );
end;
$$;

-- 4.13 Dynamic Trending Hashtags Aggregation RPC
create or replace function public.get_trending_hashtags(p_limit integer default 10)
returns table (
  tag text,
  posts_count bigint,
  total_engagement bigint
)
language sql
stable
security definer set search_path = public
as $$
  select
    lower(trim(replace(raw_tag, '#', ''))) as tag,
    count(distinct sp.id) as posts_count,
    sum(sp.likes_count + sp.comments_count * 2 + sp.shares_count * 3)::bigint as total_engagement
  from public.social_posts sp,
       unnest(sp.hashtags) as raw_tag
  where char_length(trim(replace(raw_tag, '#', ''))) > 1
  group by lower(trim(replace(raw_tag, '#', '')))
  order by total_engagement desc, posts_count desc
  limit p_limit;
$$;

-- ============================================================================
-- 5. RLS POLICIES FOR NEW TABLES (Notifications, Push, Reports, Presence)
-- ============================================================================
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.room_presence enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_user_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = recipient_user_id);

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = recipient_user_id);

drop policy if exists "Users manage their own push subscriptions" on public.push_subscriptions;
create policy "Users manage their own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);

drop policy if exists "Anyone authenticated can submit moderation reports" on public.moderation_reports;
create policy "Anyone authenticated can submit moderation reports"
  on public.moderation_reports for insert
  with check (auth.uid() = reporter_user_id or reporter_user_id is null);

drop policy if exists "Room presence is viewable by everyone" on public.room_presence;
create policy "Room presence is viewable by everyone"
  on public.room_presence for select
  using (true);

drop policy if exists "Authenticated users can update their room presence" on public.room_presence;
create policy "Authenticated users can update their room presence"
  on public.room_presence for all
  using (auth.uid() = user_id);

-- ============================================================================
-- 6. ADD NOTIFICATIONS & PRESENCE TO SUPABASE REALTIME PUBLICATION
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.room_assigned_personas;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.room_presence;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.message_answers;
exception when duplicate_object then null; end $$;
