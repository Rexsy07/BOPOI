// ============================================================================
// SUPABASE EDGE FUNCTION: og-share-card
// Path: supabase/functions/og-share-card/index.ts
// Generates dynamic OpenGraph SVG/HTML cards for /u/:username public ask links
// and shared campus posts/polls on WhatsApp, Instagram, and X.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    const postId = url.searchParams.get('postId');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let title = 'Bopoi — Campus Confessions, Polls & Anonymous Q&A';
    let subtitle = 'Send anonymous messages, vote on live polls, and join campus rooms.';
    let badge = 'BOPOI CAMPUS';

    if (username) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, campus, custom_prompt')
        .ilike('username', username.replace(/^@/, ''))
        .maybeSingle();

      if (profile) {
        title = `Ask ${profile.display_name} (@${profile.username}) anonymously`;
        subtitle = profile.custom_prompt || 'Send me an anonymous message on Bopoi — 100% secret!';
        badge = profile.campus || 'BOPOI ANONYMOUS LINK';
      }
    } else if (postId) {
      const { data: post } = await supabase
        .from('social_posts')
        .select('type, title, content, author_name, is_anonymous, category')
        .eq('id', postId)
        .maybeSingle();

      if (post) {
        title = post.title || post.content.slice(0, 72);
        subtitle = post.content.slice(0, 140);
        badge = `${(post.type || 'POST').toUpperCase()} • ${post.category || 'CAMPUS'}`;
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#5420F5" />
          <stop offset="55%" stop-color="#3B12B5" />
          <stop offset="100%" stop-color="#191525" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)" rx="32" />
      <rect x="64" y="64" width="1072" height="502" rx="36" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="2" />
      <text x="116" y="150" fill="#DDD6FE" font-family="Plus Jakarta Sans, sans-serif" font-size="24" font-weight="800" letter-spacing="3">${badge.replace(/[<>&"']/g, '')}</text>
      <text x="116" y="260" fill="#FFFFFF" font-family="Plus Jakarta Sans, sans-serif" font-size="52" font-weight="800">${title.slice(0, 42).replace(/[<>&"']/g, '')}</text>
      <text x="116" y="345" fill="#E9D5FF" font-family="Plus Jakarta Sans, sans-serif" font-size="30" font-weight="500">${subtitle.slice(0, 68).replace(/[<>&"']/g, '')}</text>
      <text x="116" y="505" fill="#FFFFFF" font-family="Plus Jakarta Sans, sans-serif" font-size="26" font-weight="700">bopoi.app • 100% Anonymous Campus Network</text>
    </svg>`;

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
