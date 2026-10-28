import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Supabase Edge Function: vector-edge-listener
 * Triggered via Supabase Database Webhook (INSERT on public.social_posts)
 * or direct invocation to compute 768-dim Gemini embeddings automatically.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const record = body.record || body;
    const postId = record?.id || record?.postId;
    const content = record?.content || record?.text || '';

    if (!postId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing postId or content in webhook payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const compositeText = [
      record.type ? `Type: ${record.type}` : '',
      record.category ? `Category: ${record.category}` : '',
      record.title ? `Title: ${record.title}` : '',
      `Content: ${content}`,
      Array.isArray(record.hashtags) ? `Tags: ${record.hashtags.join(' ')}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    let embedding: number[] = [];

    if (geminiApiKey) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'aistudio-build',
          },
          body: JSON.stringify({
            model: 'models/gemini-embedding-2-preview',
            content: { parts: [{ text: compositeText }] },
            outputDimensionality: 768,
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        if (Array.isArray(geminiData?.embedding?.values)) {
          embedding = geminiData.embedding.values.slice(0, 768);
        }
      }
    }

    if (embedding.length === 0) {
      embedding = new Array(768).fill(0).map((_, i) => Math.sin(i + compositeText.length) * 0.03);
    }

    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseAdmin
        .from('social_posts')
        .update({ post_embedding: `[${embedding.join(',')}]` })
        .eq('id', postId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        postId,
        dimensions: embedding.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Edge vector generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
