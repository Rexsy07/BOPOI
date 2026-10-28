-- ============================================================================
-- BOPOI - PART 3: FINAL PRODUCTION SQL (REPLICA IDENTITY, ANON CONVO ACCESS,
-- REMAINING ATOMIC RPCs, STORAGE UPDATE POLICIES & DEFAULT ROOMS SEED)
-- Paste and run ONLY this SQL block inside the Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. ENABLE REPLICA IDENTITY FULL FOR SUPABASE REALTIME FILTERED SUBSCRIPTIONS
-- (Required so UPDATE and DELETE events over WebSockets include full row data
--  when filtering by room_id, post_id, or recipient_user_id)
-- ============================================================================
alter table public.profiles replica identity full;
alter table public.social_posts replica identity full;
alter table public.poll_options replica identity full;
alter table public.post_comments replica identity full;
alter table public.anonymous_messages replica identity full;
alter table public.message_comments replica identity full;
alter table public.message_answers replica identity full;
alter table public.community_rooms replica identity full;
alter table public.room_messages replica identity full;
alter table public.room_assigned_personas replica identity full;
alter table public.room_presence replica identity full;
alter table public.notifications replica identity full;

-- ============================================================================
-- 2. REMAINING ATOMIC RPC FUNCTIONS (100% PARITY WITH FRONTEND CONTEXT)
-- ============================================================================

-- 2.1 Allow Unauthenticated Anonymous Senders to Fetch Their 1-on-1 Convo Threads via sender_token
create or replace function public.get_sender_convo_threads(p_sender_token text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_result jsonb;
begin
  if p_sender_token is null or char_length(trim(p_sender_token)) < 4 then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(msg_row order by msg_row.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select
      m.id,
      m.recipient_username,
      m.text,
      m.is_read,
      m.read_at,
      m.is_answered,
      m.likes_count,
      m.replies_count,
      m.reactions,
      m.created_at,
      coalesce(
        (
          select jsonb_agg(c order by c.created_at asc)
          from public.message_comments c
          where c.message_id = m.id
        ),
        '[]'::jsonb
      ) as comments
    from public.anonymous_messages m
    where m.sender_token = trim(p_sender_token)
       or (auth.uid() is not null and m.sender_user_id = auth.uid())
  ) msg_row;

  return v_result;
end;
$$;

-- 2.2 Toggle Story Answer Like Atomically
create or replace function public.toggle_answer_like(p_answer_id uuid)
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

  if exists (select 1 from public.message_answer_likes where answer_id = p_answer_id and user_id = v_uid) then
    delete from public.message_answer_likes where answer_id = p_answer_id and user_id = v_uid;
    v_liked := false;
  else
    insert into public.message_answer_likes (answer_id, user_id) values (p_answer_id, v_uid);
    v_liked := true;
  end if;

  select likes_count into v_count from public.message_answers where id = p_answer_id;
  return jsonb_build_object('liked', v_liked, 'likes_count', coalesce(v_count, 0));
end;
$$;

-- 2.3 Toggle Join / Leave Community Room Atomically
create or replace function public.toggle_join_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_joined boolean;
  v_members integer;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.room_memberships where room_id = p_room_id and user_id = v_uid) then
    delete from public.room_memberships where room_id = p_room_id and user_id = v_uid;
    delete from public.room_presence where room_id = p_room_id and user_id = v_uid;
    v_joined := false;
  else
    insert into public.room_memberships (room_id, user_id) values (p_room_id, v_uid);
    insert into public.room_presence (room_id, user_id, last_seen_at)
    values (p_room_id, v_uid, now())
    on conflict (room_id, user_id) do update set last_seen_at = now();
    v_joined := true;
  end if;

  select members_count into v_members from public.community_rooms where id = p_room_id;
  return jsonb_build_object('is_joined', v_joined, 'members_count', coalesce(v_members, 1));
end;
$$;

-- 2.4 Toggle Room Chat Message Like Atomically
create or replace function public.toggle_room_message_like(p_message_id uuid)
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

  if exists (select 1 from public.room_message_likes where message_id = p_message_id and user_id = v_uid) then
    delete from public.room_message_likes where message_id = p_message_id and user_id = v_uid;
    v_liked := false;
  else
    insert into public.room_message_likes (message_id, user_id) values (p_message_id, v_uid);
    v_liked := true;
  end if;

  select likes_count into v_count from public.room_messages where id = p_message_id;
  return jsonb_build_object('liked', v_liked, 'likes_count', coalesce(v_count, 0));
end;
$$;

-- 2.5 React to an Anonymous Inbox Message Atomically
create or replace function public.add_anonymous_message_reaction(
  p_message_id uuid,
  p_emoji text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.anonymous_messages%rowtype;
  v_current_count integer;
  v_updated jsonb;
begin
  select * into v_msg from public.anonymous_messages where id = p_message_id;
  if not found then
    raise exception 'Message not found';
  end if;

  if v_uid is null or v_uid <> v_msg.recipient_user_id then
    raise exception 'Only the message recipient can react';
  end if;

  v_current_count := coalesce((v_msg.reactions->>p_emoji)::int, 0);
  v_updated := jsonb_set(coalesce(v_msg.reactions, '{}'::jsonb), array[p_emoji], to_jsonb(v_current_count + 1), true);

  update public.anonymous_messages
  set reactions = v_updated
  where id = p_message_id;

  return v_updated;
end;
$$;

-- 2.6 Report an Anonymous Message & Optionally Block the Anonymous Sender
create or replace function public.report_or_block_message(
  p_message_id uuid,
  p_reason text default 'Reported by recipient',
  p_block_sender boolean default false
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.anonymous_messages%rowtype;
  v_block_key text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_msg from public.anonymous_messages where id = p_message_id;
  if not found or v_msg.recipient_user_id <> v_uid then
    raise exception 'Message not found or unauthorized';
  end if;

  update public.anonymous_messages
  set is_reported = true, report_reason = p_reason
  where id = p_message_id;

  insert into public.moderation_reports (reporter_user_id, target_type, target_id, reason)
  values (v_uid, 'anonymous_message', p_message_id::text, p_reason);

  if p_block_sender then
    v_block_key := coalesce(v_msg.sender_token, v_msg.sender_user_id::text, p_message_id::text);
    insert into public.user_safety_settings (user_id, blocked_senders)
    values (v_uid, array[v_block_key])
    on conflict (user_id)
    do update set
      blocked_senders = array_append(
        array_remove(public.user_safety_settings.blocked_senders, v_block_key),
        v_block_key
      ),
      updated_at = now();
  end if;
end;
$$;

-- ============================================================================
-- 3. COMPLETE STORAGE UPDATE & DELETE POLICIES (AVATARS & SHARE CARDS)
-- ============================================================================
drop policy if exists "Users can update own uploaded files" on storage.objects;
create policy "Users can update own uploaded files"
  on storage.objects for update
  using (bucket_id in ('avatars', 'share-cards') and auth.uid() = owner);

drop policy if exists "Users can delete own uploaded files" on storage.objects;
create policy "Users can delete own uploaded files"
  on storage.objects for delete
  using (bucket_id in ('avatars', 'share-cards') and auth.uid() = owner);

-- ============================================================================
-- 4. SEED DEFAULT CAMPUS COMMUNITY ROOMS (IDEMPOTENT)
-- Ensures your platform has active rooms immediately on first launch
-- ============================================================================
insert into public.community_rooms (
  name,
  description,
  category,
  members_count,
  online_count,
  icon_emoji,
  icon_bg,
  creator_name,
  creator_alias,
  is_custom_room,
  is_anonymous_only,
  tags
)
select * from (values
  (
    'UNILAG Night Owls 🦉',
    'Late night campus gist, hostel updates, Jaja & Moremi banter, and anonymous confessions.',
    'Campus',
    428,
    64,
    '🦉',
    '#5420F5',
    'Bopoi Campus',
    'Shadow Fox',
    false,
    true,
    array['unilag', 'nightowls', 'campus', 'gist']
  ),
  (
    'Relationship & Situationships 💔',
    'Unfiltered dating advice, talking stage red flags, breakfast stories, and crush confessions.',
    'Dating',
    612,
    93,
    '💔',
    '#E11D48',
    'Bopoi Campus',
    'Velvet Phantom',
    false,
    true,
    array['dating', 'love', 'situationships', 'confessions']
  ),
  (
    'Tech, Internships & Side Hustles 💻',
    'Frontend, backend, UI/UX, remote gigs, SIWES placements, and student startup builders.',
    'Study',
    319,
    41,
    '💻',
    '#0EA5E9',
    'Bopoi Campus',
    'Cyber Ninja',
    false,
    false,
    array['tech', 'internships', 'coding', 'hustle']
  ),
  (
    'Hostel & Department Gist 🏠',
    'What is happening in your faculty and hostel right now? Drop anonymous updates live.',
    'Lifestyle',
    510,
    78,
    '🏠',
    '#10B981',
    'Bopoi Campus',
    'Midnight Owl',
    false,
    true,
    array['hostel', 'faculty', 'campuslife']
  ),
  (
    'Music, Afrobeats & Pop Culture 🎧',
    'New album drops, weekend parties, campus concerts, and unpopular music opinions.',
    'Entertainment',
    284,
    37,
    '🎧',
    '#F59E0B',
    'Bopoi Campus',
    'Cosmic Rebel',
    false,
    false,
    array['afrobeats', 'music', 'entertainment', 'vibes']
  )
) as seed_rooms(
  name, description, category, members_count, online_count,
  icon_emoji, icon_bg, creator_name, creator_alias,
  is_custom_room, is_anonymous_only, tags
)
where not exists (
  select 1 from public.community_rooms existing where existing.name = seed_rooms.name
);
