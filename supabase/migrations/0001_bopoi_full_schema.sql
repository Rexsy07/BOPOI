-- ============================================================================
-- BOPOI - COMPLETE PRODUCTION SUPABASE MIGRATION SQL
-- Covers every data point, table, trigger, RPC, RLS policy, Storage & Realtime
-- Run this entire script inside the Supabase SQL Editor
-- ============================================================================

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm"; -- For fast full-text & ILIKE search on Discover

-- ============================================================================
-- 1. CUSTOM TYPES & ENUMS
-- ============================================================================
do $$ begin
  create type public.social_post_type as enum ('post', 'confession', 'poll', 'discussion');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.convo_author_role as enum ('recipient', 'sender');
exception
  when duplicate_object then null;
end $$;

-- ============================================================================
-- 2. USERS / PROFILES & 3D CHARACTER CONFIG
-- Maps to: UserProfile & CreatorProfile
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(trim(username)) >= 2),
  display_name text not null,
  email text unique not null,
  avatar_url text not null default 'char:v1|female|caramel|box-braids|#14111D|hoodie|#5420F5|none|confident|violet-glow|0',
  character_mood text not null default 'chill',
  bio text not null default '',
  campus text not null default 'University of Lagos',
  custom_prompt text not null default 'Send me anonymous messages, confessions, or hot takes!',
  link_active boolean not null default true,
  is_creator boolean not null default false,
  followers_count integer not null default 0 check (followers_count >= 0),
  following_count integer not null default 0 check (following_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 3. USER SAFETY SETTINGS (Hidden Words, Blocked Senders, Public Sharing)
-- Maps to: SafetySettings
-- ============================================================================
create table if not exists public.user_safety_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  hidden_words text[] not null default '{}',
  blocked_senders text[] not null default '{}', -- Stores message IDs or sender fingerprint hashes
  allow_public_sharing boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 4. USER FOLLOWS (Students & Creators Follow Graph)
-- Maps to: CreatorProfile.isFollowing, followersCount, followingCount
-- ============================================================================
create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

-- ============================================================================
-- 5. SOCIAL POSTS (Posts, Confessions, Polls, Discussions)
-- Maps to: SocialPost
-- ============================================================================
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  type public.social_post_type not null default 'post',
  author_user_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  author_username text not null,
  author_avatar text,
  author_campus text not null default 'University of Lagos',
  is_anonymous boolean not null default false,
  category text not null default 'Campus Life',
  title text,
  content text not null,
  hashtags text[] not null default '{}',
  likes_count integer not null default 0 check (likes_count >= 0),
  comments_count integer not null default 0 check (comments_count >= 0),
  shares_count integer not null default 0 check (shares_count >= 0),
  poll_total_votes integer not null default 0 check (poll_total_votes >= 0),
  poll_expires_in text default '24h left',
  poll_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 6. POLL OPTIONS & POLL VOTES
-- Maps to: PollOption & SocialPost.userVotedOptionId
-- ============================================================================
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  text text not null,
  votes integer not null default 0 check (votes >= 0),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_votes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ============================================================================
-- 7. POST LIKES & POST BOOKMARKS (Saved Posts)
-- Maps to: SocialPost.hasLiked, SocialPost.likes, SocialPost.isBookmarked
-- ============================================================================
create table if not exists public.post_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_bookmarks (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ============================================================================
-- 8. POST COMMENTS & THREADED REPLIES + COMMENT LIKES
-- Maps to: SocialComment
-- ============================================================================
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  parent_id uuid references public.post_comments(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  author_username text not null,
  author_avatar text,
  author_campus text,
  is_anonymous boolean not null default false,
  reply_to_author text,
  reply_to_username text,
  text text not null,
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.post_comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ============================================================================
-- 9. ANONYMOUS INBOX MESSAGES, REPORTS & 1-ON-1 PRIVATE CONVO THREADS
-- Maps to: AnonymousMessage & MessageComment
-- ============================================================================
create table if not exists public.anonymous_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_username text not null,
  sender_user_id uuid references public.profiles(id) on delete set null, -- Optional if sender is logged in ("Sent" tab)
  sender_token text, -- Anonymous client token so unauthenticated senders can still view their 1-on-1 convo
  text text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  is_answered boolean not null default false,
  is_reported boolean not null default false,
  report_reason text,
  likes_count integer not null default 0,
  replies_count integer not null default 0,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 1-on-1 Private Convo Messages inside an Anonymous Inbox Message
create table if not exists public.message_comments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.anonymous_messages(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  author_role public.convo_author_role not null default 'recipient',
  author_avatar text,
  is_anonymous boolean not null default false,
  text text not null,
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 10. SHARE-CARD STORY STUDIO ANSWERS & ANSWER LIKES
-- Maps to: MessageAnswer
-- ============================================================================
create table if not exists public.message_answers (
  id uuid primary key default gen_random_uuid(),
  message_id uuid unique not null references public.anonymous_messages(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  author_username text not null,
  author_display_name text not null,
  question_text text not null,
  answer_text text not null,
  is_public boolean not null default true,
  is_draft boolean not null default false,
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_answer_likes (
  answer_id uuid not null references public.message_answers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);

-- ============================================================================
-- 11. COMMUNITY CHAT ROOMS, MEMBERSHIPS, LOCKED PERSONAS & ROOM MESSAGES
-- Maps to: CommunityRoom, RoomAssignedPersona, RoomMessage
-- ============================================================================
create table if not exists public.community_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null default 'Campus',
  members_count integer not null default 1 check (members_count >= 0),
  online_count integer not null default 1 check (online_count >= 0),
  icon_emoji text not null default '💬',
  icon_bg text not null default '#5420F5',
  creator_user_id uuid references public.profiles(id) on delete set null,
  creator_name text,
  creator_alias text default 'Anonymous Founder',
  is_custom_room boolean not null default false,
  is_anonymous_only boolean not null default true,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_memberships (
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Locked Room Personas (First 10 default masks per room, then unique custom masks)
create table if not exists public.room_assigned_personas (
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  alias text not null,
  mask_id text not null default 'masked-student',
  mask_emoji text not null default '🎭',
  is_custom boolean not null default false,
  assigned_at timestamptz not null default now(),
  primary key (room_id, user_id),
  constraint unique_alias_per_room unique (room_id, alias)
);

-- Live Room Chat Messages
create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  author_username text not null,
  author_avatar text,
  author_campus text,
  author_mask_emoji text,
  author_alias text,
  is_anonymous boolean not null default true,
  text text not null,
  reply_to_id uuid references public.room_messages(id) on delete set null,
  reply_to_author_name text,
  reply_to_text text,
  likes_count integer not null default 0 check (likes_count >= 0),
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.room_message_likes (
  message_id uuid not null references public.room_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.room_message_reactions (
  message_id uuid not null references public.room_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- ============================================================================
-- 12. PERFORMANCE & SEARCH INDEXES
-- ============================================================================
create index if not exists idx_profiles_username_lower on public.profiles (lower(username));
create index if not exists idx_profiles_campus on public.profiles (campus);
create index if not exists idx_social_posts_created on public.social_posts (created_at desc);
create index if not exists idx_social_posts_type on public.social_posts (type);
create index if not exists idx_social_posts_category on public.social_posts (category);
create index if not exists idx_social_posts_author on public.social_posts (author_user_id);
create index if not exists idx_poll_options_post on public.poll_options (post_id, sort_order asc);
create index if not exists idx_post_comments_post on public.post_comments (post_id, created_at asc);
create index if not exists idx_anon_messages_recipient on public.anonymous_messages (recipient_user_id, created_at desc);
create index if not exists idx_anon_messages_sender on public.anonymous_messages (sender_user_id, created_at desc);
create index if not exists idx_message_comments_msg on public.message_comments (message_id, created_at asc);
create index if not exists idx_room_messages_room on public.room_messages (room_id, created_at asc);

-- ============================================================================
-- 13. AUTOMATED TRIGGERS & COUNTER FUNCTIONS
-- ============================================================================

-- 13.1 Auto-create profile and safety settings when a user signs up in Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := coalesce(
    nullif(regexp_replace(lower(new.raw_user_meta_data->>'username'), '[^a-z0-9_.]', '', 'g'), ''),
    regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_.]', '', 'g'),
    'student'
  );

  final_username := base_username;
  if exists (select 1 from public.profiles where lower(username) = final_username) then
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (
    id,
    username,
    display_name,
    email,
    avatar_url,
    campus,
    bio
  ) values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name', initcap(base_username)),
    new.email,
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      'char:v1|female|caramel|box-braids|#14111D|hoodie|#5420F5|none|confident|violet-glow|0'
    ),
    coalesce(new.raw_user_meta_data->>'campus', 'University of Lagos'),
    coalesce(new.raw_user_meta_data->>'bio', 'Ask me anything anonymously!')
  )
  on conflict (id) do nothing;

  insert into public.user_safety_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 13.2 Maintain followers_count and following_count on public.profiles
create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.following_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_follow_counts on public.user_follows;
create trigger trg_sync_follow_counts
  after insert or delete on public.user_follows
  for each row execute function public.sync_follow_counts();

-- 13.3 Maintain likes_count on public.social_posts
create or replace function public.sync_post_likes_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.social_posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.social_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_likes_count on public.post_likes;
create trigger trg_sync_post_likes_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_post_likes_count();

-- 13.4 Maintain comments_count on public.social_posts
create or replace function public.sync_post_comments_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.social_posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.social_posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_comments_count on public.post_comments;
create trigger trg_sync_post_comments_count
  after insert or delete on public.post_comments
  for each row execute function public.sync_post_comments_count();

-- 13.5 Maintain likes_count on public.post_comments
create or replace function public.sync_comment_likes_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.post_comments set likes_count = likes_count + 1 where id = new.comment_id;
  elsif (tg_op = 'DELETE') then
    update public.post_comments set likes_count = greatest(0, likes_count - 1) where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_comment_likes_count on public.post_comment_likes;
create trigger trg_sync_comment_likes_count
  after insert or delete on public.post_comment_likes
  for each row execute function public.sync_comment_likes_count();

-- 13.6 Maintain poll option votes and poll_total_votes on public.social_posts
create or replace function public.sync_poll_vote_counts()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.poll_options set votes = votes + 1 where id = new.option_id;
    update public.social_posts set poll_total_votes = poll_total_votes + 1 where id = new.post_id;
  elsif (tg_op = 'UPDATE') then
    if (old.option_id <> new.option_id) then
      update public.poll_options set votes = greatest(0, votes - 1) where id = old.option_id;
      update public.poll_options set votes = votes + 1 where id = new.option_id;
    end if;
  elsif (tg_op = 'DELETE') then
    update public.poll_options set votes = greatest(0, votes - 1) where id = old.option_id;
    update public.social_posts set poll_total_votes = greatest(0, poll_total_votes - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_poll_vote_counts on public.poll_votes;
create trigger trg_sync_poll_vote_counts
  after insert or update or delete on public.poll_votes
  for each row execute function public.sync_poll_vote_counts();

-- 13.7 Maintain replies_count on public.anonymous_messages when 1-on-1 convo messages are added
create or replace function public.sync_message_convo_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.anonymous_messages set replies_count = replies_count + 1 where id = new.message_id;
  elsif (tg_op = 'DELETE') then
    update public.anonymous_messages set replies_count = greatest(0, replies_count - 1) where id = old.message_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_message_convo_count on public.message_comments;
create trigger trg_sync_message_convo_count
  after insert or delete on public.message_comments
  for each row execute function public.sync_message_convo_count();

-- 13.8 Automatically mark anonymous_messages.is_answered = true when a non-draft answer is saved
create or replace function public.sync_message_answered_flag()
returns trigger
language plpgsql
security definer
as $$
begin
  if (new.is_draft = false) then
    update public.anonymous_messages
    set is_answered = true, is_read = true, read_at = coalesce(read_at, now())
    where id = new.message_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_message_answered_flag on public.message_answers;
create trigger trg_sync_message_answered_flag
  after insert or update on public.message_answers
  for each row execute function public.sync_message_answered_flag();

-- 13.9 Maintain members_count on public.community_rooms
create or replace function public.sync_room_members_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.community_rooms set members_count = members_count + 1 where id = new.room_id;
  elsif (tg_op = 'DELETE') then
    update public.community_rooms set members_count = greatest(1, members_count - 1) where id = old.room_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_room_members_count on public.room_memberships;
create trigger trg_sync_room_members_count
  after insert or delete on public.room_memberships
  for each row execute function public.sync_room_members_count();

-- 13.10 Maintain likes_count and JSONB reactions on public.room_messages
create or replace function public.sync_room_message_likes()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.room_messages set likes_count = likes_count + 1 where id = new.message_id;
  elsif (tg_op = 'DELETE') then
    update public.room_messages set likes_count = greatest(0, likes_count - 1) where id = old.message_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_room_message_likes on public.room_message_likes;
create trigger trg_sync_room_message_likes
  after insert or delete on public.room_message_likes
  for each row execute function public.sync_room_message_likes();

create or replace function public.sync_room_message_reactions_json()
returns trigger
language plpgsql
security definer
as $$
declare
  target_msg_id uuid;
  agg jsonb;
begin
  target_msg_id := coalesce(new.message_id, old.message_id);
  select coalesce(jsonb_object_agg(emoji, cnt), '{}'::jsonb)
  into agg
  from (
    select emoji, count(*)::int as cnt
    from public.room_message_reactions
    where message_id = target_msg_id
    group by emoji
  ) sub;

  update public.room_messages set reactions = agg where id = target_msg_id;
  return null;
end;
$$;

drop trigger if exists trg_sync_room_message_reactions_json on public.room_message_reactions;
create trigger trg_sync_room_message_reactions_json
  after insert or delete on public.room_message_reactions
  for each row execute function public.sync_room_message_reactions_json();

-- ============================================================================
-- 14. RPC FUNCTIONS FOR ATOMIC APP WORKFLOWS
-- ============================================================================

-- 14.1 Cast or Switch Poll Vote Atomically
create or replace function public.cast_poll_vote(p_post_id uuid, p_option_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required to vote';
  end if;

  insert into public.poll_votes (post_id, option_id, user_id)
  values (p_post_id, p_option_id, auth.uid())
  on conflict (post_id, user_id)
  do update set option_id = excluded.option_id, created_at = now();
end;
$$;

-- 14.2 Send Anonymous Message (Validates Link Active & Hidden Words Filter)
create or replace function public.send_anonymous_message(
  p_recipient_username text,
  p_text text,
  p_sender_token text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_recipient public.profiles%rowtype;
  v_safety public.user_safety_settings%rowtype;
  v_word text;
  v_new_id uuid;
begin
  if char_length(trim(p_text)) < 2 then
    raise exception 'Please enter a valid message.';
  end if;

  select * into v_recipient
  from public.profiles
  where lower(username) = lower(trim(replace(p_recipient_username, '@', '')));

  if not found then
    raise exception 'Recipient @% not found.', p_recipient_username;
  end if;

  if not v_recipient.link_active then
    raise exception 'This student has paused their anonymous link.';
  end if;

  select * into v_safety
  from public.user_safety_settings
  where user_id = v_recipient.id;

  if found and array_length(v_safety.hidden_words, 1) > 0 then
    foreach v_word in array v_safety.hidden_words loop
      if lower(p_text) like '%' || lower(trim(v_word)) || '%' then
        raise exception 'Message contains a filtered word blocked by the recipient''s safety shield.';
      end if;
    end loop;
  end if;

  insert into public.anonymous_messages (
    recipient_user_id,
    recipient_username,
    sender_user_id,
    sender_token,
    text
  ) values (
    v_recipient.id,
    v_recipient.username,
    auth.uid(),
    p_sender_token,
    trim(p_text)
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.user_safety_settings enable row level security;
alter table public.user_follows enable row level security;
alter table public.social_posts enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_comment_likes enable row level security;
alter table public.anonymous_messages enable row level security;
alter table public.message_comments enable row level security;
alter table public.message_answers enable row level security;
alter table public.message_answer_likes enable row level security;
alter table public.community_rooms enable row level security;
alter table public.room_memberships enable row level security;
alter table public.room_assigned_personas enable row level security;
alter table public.room_messages enable row level security;
alter table public.room_message_likes enable row level security;
alter table public.room_message_reactions enable row level security;

-- Profiles: Publicly readable, owners can update their own profile
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Safety Settings: Private to the user
create policy "Users can view own safety settings"
  on public.user_safety_settings for select using (auth.uid() = user_id);
create policy "Users can upsert own safety settings"
  on public.user_safety_settings for all using (auth.uid() = user_id);

-- Follows: Publicly readable, authenticated users manage their own follows
create policy "Follows are viewable by everyone"
  on public.user_follows for select using (true);
create policy "Users can follow others"
  on public.user_follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow others"
  on public.user_follows for delete using (auth.uid() = follower_id);

-- Social Posts & Poll Options: Publicly readable, authors can create/delete
create policy "Social posts are viewable by everyone"
  on public.social_posts for select using (true);
create policy "Authenticated users can create posts"
  on public.social_posts for insert with check (auth.uid() = author_user_id);
create policy "Authors can update or delete own posts"
  on public.social_posts for all using (auth.uid() = author_user_id);

create policy "Poll options are viewable by everyone"
  on public.poll_options for select using (true);
create policy "Post authors can insert poll options"
  on public.poll_options for insert with check (
    exists (select 1 from public.social_posts where id = post_id and author_user_id = auth.uid())
  );

-- Poll Votes, Post Likes, Bookmarks
create policy "Poll votes are viewable by everyone"
  on public.poll_votes for select using (true);
create policy "Authenticated users can vote"
  on public.poll_votes for all using (auth.uid() = user_id);

create policy "Post likes are viewable by everyone"
  on public.post_likes for select using (true);
create policy "Authenticated users can toggle post likes"
  on public.post_likes for all using (auth.uid() = user_id);

create policy "Users can view and manage own bookmarks"
  on public.post_bookmarks for all using (auth.uid() = user_id);

-- Post Comments & Comment Likes
create policy "Post comments are viewable by everyone"
  on public.post_comments for select using (true);
create policy "Authenticated users can add comments"
  on public.post_comments for insert with check (auth.uid() = author_user_id);
create policy "Authors can delete own comments"
  on public.post_comments for delete using (auth.uid() = author_user_id);

create policy "Comment likes are viewable by everyone"
  on public.post_comment_likes for select using (true);
create policy "Authenticated users can toggle comment likes"
  on public.post_comment_likes for all using (auth.uid() = user_id);

-- Anonymous Inbox Messages & 1-on-1 Convo Comments
create policy "Anyone can send an anonymous message"
  on public.anonymous_messages for insert with check (true);
create policy "Recipients and senders can view their messages"
  on public.anonymous_messages for select using (
    auth.uid() = recipient_user_id or auth.uid() = sender_user_id
  );
create policy "Recipients can update/delete their inbox messages"
  on public.anonymous_messages for all using (auth.uid() = recipient_user_id);

create policy "Participants can view 1-on-1 convo comments"
  on public.message_comments for select using (
    exists (
      select 1 from public.anonymous_messages m
      where m.id = message_id
        and (m.recipient_user_id = auth.uid() or m.sender_user_id = auth.uid())
    )
  );
create policy "Participants can post in 1-on-1 convo"
  on public.message_comments for insert with check (
    exists (
      select 1 from public.anonymous_messages m
      where m.id = message_id
        and (m.recipient_user_id = auth.uid() or m.sender_user_id = auth.uid())
    )
  );

-- Published Story Answers
create policy "Public answers are viewable by everyone"
  on public.message_answers for select using (
    (is_public = true and is_draft = false) or auth.uid() = author_user_id
  );
create policy "Authors can manage their own answers"
  on public.message_answers for all using (auth.uid() = author_user_id);

create policy "Answer likes are viewable by everyone"
  on public.message_answer_likes for select using (true);
create policy "Authenticated users can like answers"
  on public.message_answer_likes for all using (auth.uid() = user_id);

-- Community Rooms, Memberships, Personas & Room Messages
create policy "Community rooms are viewable by everyone"
  on public.community_rooms for select using (true);
create policy "Authenticated users can create rooms"
  on public.community_rooms for insert with check (creator_user_id is null or auth.uid() = creator_user_id);
create policy "Users can update room icons and metadata"
  on public.community_rooms for update using (creator_user_id is null or auth.uid() = creator_user_id)
  with check (creator_user_id is null or auth.uid() = creator_user_id);
create policy "Room creators can delete their own rooms"
  on public.community_rooms for delete using (auth.uid() = creator_user_id);

create policy "Room memberships are viewable by everyone"
  on public.room_memberships for select using (true);
create policy "Authenticated users can join/leave rooms"
  on public.room_memberships for all using (auth.uid() = user_id);

create policy "Room personas are viewable by everyone"
  on public.room_assigned_personas for select using (true);
create policy "Users can lock their own room persona"
  on public.room_assigned_personas for all using (auth.uid() = user_id);

create policy "Room messages are viewable by everyone"
  on public.room_messages for select using (true);
create policy "Authenticated users can send room messages"
  on public.room_messages for insert with check (auth.uid() = author_user_id);

create policy "Room message likes are viewable by everyone"
  on public.room_message_likes for select using (true);
create policy "Authenticated users can like room messages"
  on public.room_message_likes for all using (auth.uid() = user_id);

create policy "Room message reactions are viewable by everyone"
  on public.room_message_reactions for select using (true);
create policy "Authenticated users can react to room messages"
  on public.room_message_reactions for all using (auth.uid() = user_id);

-- ============================================================================
-- 16. SUPABASE REALTIME PUBLICATION SETUP
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.social_posts;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.poll_options;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.post_comments;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.anonymous_messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.message_comments;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.community_rooms;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.room_messages;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 17. SUPABASE STORAGE BUCKETS (Avatars & Share Cards)
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('share-cards', 'share-cards', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id in ('avatars', 'share-cards'));

create policy "Users can upload avatars, room icons, and share cards"
  on storage.objects for insert with check (
    bucket_id in ('avatars', 'share-cards')
  );

create policy "Users can update avatars, room icons, and share cards"
  on storage.objects for update using (
    bucket_id in ('avatars', 'share-cards')
  );
