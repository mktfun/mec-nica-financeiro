import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, params, config } = await req.json()
    const mcpUrl = config?.mcpUrl || Deno.env.get('MCP_URL')
    const workerKey = config?.apiKey || Deno.env.get('WORKER_API_KEY') || 'your_secret_key_here'

    if (!mcpUrl) {
      throw new Error('MCP_URL secret is not set')
    }

    const jobId = crypto.randomUUID();
    
    // Start job
    const response = await fetch(`${mcpUrl}/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        'x-api-key': workerKey
      },
      body: JSON.stringify({ job_id: jobId, action, params }),
    })

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`Failed to start job: ${response.status} ${errTxt}`)
    }

    const { job_id: serverJobId } = await response.json();
    
    // Poll loop
    let attempts = 0;
    while (attempts < 20) { // Max 60 seconds (20 * 3s)
      await sleep(3000);
      
      const poll = await fetch(`${mcpUrl}/v1/jobs/${serverJobId}`, {
        headers: {
          'x-api-key': workerKey,
          'Bypass-Tunnel-Reminder': 'true',
        }
      });
      
      if (!poll.ok) {
        throw new Error(`Poll failed: ${poll.status}`)
      }
      
      const statusJson = await poll.json();
      
      if (statusJson.status === 'completed') {
        return new Response(JSON.stringify(statusJson.result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      } else if (statusJson.status === 'failed' || statusJson.status === 'session_expired') {
        throw new Error(statusJson.error || 'Job failed')
      }
      
      attempts++;
    }
    
    throw new Error('Timeout waiting for job completion')

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
