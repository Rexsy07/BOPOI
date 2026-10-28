-- ============================================================================
-- 0004_argon_retention_and_vector_engine.sql
-- Argon Blueprint: Two-Tower pgvector Retrieval, Thompson Sampling Telemetry,
-- Adamic-Adar 2-Hop Triadic Closure, and Lookalike Cold-Start Clusters
-- ============================================================================

-- 1. Enable pgvector extension for 768-dim Gemini embeddings
create extension if not exists vector;

-- 2. Upgrade social_posts with dense embedding vector & bandit telemetry counters
alter table public.social_posts
  add column if not exists post_embedding vector(768),
  add column if not exists impressions_count integer not null default 0,
  add column if not exists clicks_count integer not null default 0,
  add column if not exists dwell_ms_total bigint not null default 0;

-- 3. Upgrade profiles with user preference embedding vector for Two-Tower matching
alter table public.profiles
  add column if not exists user_embedding vector(768),
  add column if not exists interest_tags text[] default '{}'::text[],
  add column if not exists faculty_id text;

-- 4. Create HNSW Index for sub-millisecond Approximate Nearest Neighbor (ANN) retrieval
create index if not exists social_posts_embedding_hnsw_idx
  on public.social_posts
  using hnsw (post_embedding vector_cosine_ops);

-- 5. Two-Tower Candidate Fetching RPC
create or replace function public.get_personalized_candidates(
  p_user_embedding vector(768),
  p_limit integer default 300
)
returns table (
  id uuid,
  author_user_id uuid,
  author_name text,
  author_username text,
  author_avatar text,
  author_campus text,
  author_is_verified boolean,
  type text,
  category text,
  title text,
  content text,
  hashtags text[],
  likes_count integer,
  comments_count integer,
  shares_count integer,
  created_at timestamp with time zone,
  is_featured boolean,
  is_pinned boolean,
  impressions_count integer,
  clicks_count integer,
  cosine_similarity float
) as $$
begin
  return query
  select
    sp.id,
    sp.author_user_id,
    sp.author_name,
    sp.author_username,
    sp.author_avatar,
    sp.author_campus,
    sp.author_is_verified,
    sp.type,
    sp.category,
    sp.title,
    sp.content,
    sp.hashtags,
    sp.likes_count,
    sp.comments_count,
    sp.shares_count,
    sp.created_at,
    sp.is_featured,
    sp.is_pinned,
    sp.impressions_count,
    sp.clicks_count,
    case
      when sp.post_embedding is not null and p_user_embedding is not null
        then (1 - (sp.post_embedding <=> p_user_embedding))::float
      else 0.5::float
    end as cosine_similarity
  from
    public.social_posts sp
  order by
    case
      when sp.post_embedding is not null and p_user_embedding is not null
        then (sp.post_embedding <=> p_user_embedding)
      else 0.5
    end asc,
    sp.created_at desc
  limit p_limit;
end;
$$ language plpgsql stable;

-- 6. Bandit Telemetry RPCs (Impressions & Clicks for Thompson Sampling alpha/beta updates)
create or replace function public.record_post_bandit_telemetry(
  p_post_id uuid,
  p_is_click boolean default false,
  p_dwell_ms integer default 0
)
returns void as $$
begin
  update public.social_posts
  set
    impressions_count = impressions_count + 1,
    clicks_count = clicks_count + (case when p_is_click then 1 else 0 end),
    dwell_ms_total = dwell_ms_total + greatest(0, coalesce(p_dwell_ms, 0))
  where id = p_post_id;
end;
$$ language plpgsql security definer;

-- 7. Adamic-Adar 2-Hop Triadic Closure Node Recommendation RPC
create or replace function public.compute_adamic_adar_candidates(
  p_user_id uuid,
  p_campus_id text default 'Chrisland University'
)
returns table (
  profile_id uuid,
  username text,
  display_name text,
  avatar_url text,
  campus text,
  bio text,
  followers_count integer,
  following_count integer,
  is_verified boolean,
  adamic_adar_score numeric,
  mutual_count bigint,
  is_following_user boolean
) as $$
begin
  return query
  with user_direct_follows as (
    select following_id from public.user_follows where follower_id = p_user_id
  ),
  shared_neighbors as (
    -- Find 2-hop candidate nodes through mutual connection links
    select
      f2.following_id as target_node,
      f1.following_id as mutual_node
    from public.user_follows f1
    join public.user_follows f2 on f1.following_id = f2.follower_id
    where f1.follower_id = p_user_id
      and f2.following_id != p_user_id
      and f2.following_id not in (select following_id from user_direct_follows)
  ),
  neighbor_degrees as (
    -- Calculate degree constraints for Adamic-Adar penalty metrics
    select
      follower_id,
      count(following_id) as out_degree
    from public.user_follows
    group by follower_id
  )
  select
    p.id as profile_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.campus,
    p.bio,
    p.followers_count,
    p.following_count,
    coalesce(p.is_verified, false) as is_verified,
    sum(1.0 / log(coalesce(nullif(nd.out_degree, 1), 2) + 1.0))::numeric as adamic_adar_score,
    count(distinct sn.mutual_node) as mutual_count,
    exists(
      select 1 from public.user_follows uf
      where uf.follower_id = p.id and uf.following_id = p_user_id
    ) as is_following_user
  from shared_neighbors sn
  join neighbor_degrees nd on nd.follower_id = sn.mutual_node
  join public.profiles p on p.id = sn.target_node
  where (p_campus_id is null or p_campus_id = '' or lower(p.campus) = lower(p_campus_id))
    and coalesce(p.is_suspended, false) = false
  group by
    p.id, p.username, p.display_name, p.avatar_url, p.campus, p.bio,
    p.followers_count, p.following_count, p.is_verified
  order by adamic_adar_score desc
  limit 100;
end;
$$ language plpgsql stable;

-- 8. Lookalike Clusters Table for Cold-Start Onboarding Recovery
create table if not exists public.lookalike_clusters (
  id uuid primary key default gen_random_uuid(),
  campus_id text not null default 'Chrisland University',
  cluster_name text not null,
  associated_tags text[] not null default '{}'::text[],
  recommended_creator_ids text[] not null default '{}'::text[],
  recommended_room_ids text[] not null default '{}'::text[],
  icebreaker_prompts text[] not null default '{}'::text[],
  created_at timestamp with time zone default now()
);
