import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SITE_URL = 'https://catalogo.vrcf.pt'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch pending alerts whose product is back in stock
    const { data: alerts, error: alertsErr } = await supabase
      .from('stock_alerts')
      .select('id, email, product_id, products!inner(id, name, slug, stock_status)')
      .eq('status', 'pending')
      .eq('products.stock_status', 'in_stock')
      .limit(500)

    if (alertsErr) {
      console.error('stock_alerts fetch error:', alertsErr)
      return new Response(JSON.stringify({ error: alertsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    let failed = 0

    for (const alert of alerts as any[]) {
      const product = alert.products
      if (!product) continue
      const productUrl = `${SITE_URL}/produto/${product.slug ?? product.id}`

      try {
        const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'stock-alert',
            recipientEmail: alert.email,
            idempotencyKey: `stock-alert-${alert.id}`,
            templateData: {
              productName: product.name,
              productUrl,
            },
          },
        })
        if (sendErr) throw sendErr

        await supabase
          .from('stock_alerts')
          .update({ status: 'notified', notified_at: new Date().toISOString() })
          .eq('id', alert.id)

        sent++
      } catch (e) {
        console.error(`alert ${alert.id} failed:`, e)
        failed++
      }
    }

    return new Response(JSON.stringify({ success: true, processed: alerts.length, sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('process-stock-alerts error:', e)
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
