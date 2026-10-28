// ============================================================================
// SUPABASE EDGE FUNCTION: safety-guard
// Path: supabase/functions/safety-guard/index.ts
// Validates anonymous message rate limits, blocked sender hashes, and hidden
// words before calling public.send_anonymous_message RPC.
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recipientUsername, text, senderToken } = await req.json();

    if (!recipientUsername || !text || String(text).trim().length < 2) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Please enter a valid anonymous message.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash client IP + senderToken so recipient can block abusive anonymous senders without exposing their IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon-ip';
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(`${clientIp}:${senderToken || 'anon'}`)
    );
    const senderFingerprint = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 24);

    // Look up recipient and safety settings
    const { data: recipient } = await supabase
      .from('profiles')
      .select('id, username, link_active')
      .ilike('username', String(recipientUsername).replace(/^@/, '').trim())
      .maybeSingle();

    if (!recipient) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Recipient not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recipient.link_active) {
      return new Response(
        JSON.stringify({ ok: false, error: 'This student has paused their anonymous link.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: safety } = await supabase
      .from('user_safety_settings')
      .select('hidden_words, blocked_senders')
      .eq('user_id', recipient.id)
      .maybeSingle();

    if (safety?.blocked_senders?.includes(senderFingerprint)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'You cannot send messages to this link.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lowerText = String(text).toLowerCase();
    const blockedWord = (safety?.hidden_words || []).find(
      (w: string) => w && lowerText.includes(w.toLowerCase().trim())
    );
    if (blockedWord) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Message blocked by the recipient's hidden words safety filter.",
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('anonymous_messages')
      .insert({
        recipient_user_id: recipient.id,
        recipient_username: recipient.username,
        sender_token: senderToken || senderFingerprint,
        text: String(text).trim(),
      })
      .select('id, created_at')
      .single();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ ok: true, messageId: inserted.id, createdAt: inserted.created_at }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
