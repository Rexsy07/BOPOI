// ============================================================================
// SUPABASE EDGE FUNCTION: push-notification
// Path: supabase/functions/push-notification/index.ts
// Triggered by a Supabase Database Webhook on INSERT to `public.notifications`
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationWebhookPayload {
  type: 'INSERT';
  table: 'notifications';
  schema: 'public';
  record: {
    id: string;
    recipient_user_id: string;
    actor_name: string;
    is_anonymous: boolean;
    type: string;
    title: string;
    body: string;
    target_view: string;
    target_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = (await req.json()) as NotificationWebhookPayload;
    const notification = payload.record;

    if (!notification || !notification.recipient_user_id) {
      return new Response(JSON.stringify({ ok: false, reason: 'Missing notification record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all registered Web Push / mobile push subscriptions for this recipient
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', notification.recipient_user_id);

    if (error) {
      throw error;
    }

    const deepLinkUrl = notification.target_id
      ? `/?view=${encodeURIComponent(notification.target_view)}&id=${encodeURIComponent(notification.target_id)}`
      : `/?view=${encodeURIComponent(notification.target_view)}`;

    return new Response(
      JSON.stringify({
        ok: true,
        notificationId: notification.id,
        recipientUserId: notification.recipient_user_id,
        devicesTargeted: subscriptions?.length ?? 0,
        pushPayload: {
          title: notification.title,
          body: notification.body,
          url: deepLinkUrl,
          type: notification.type,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
