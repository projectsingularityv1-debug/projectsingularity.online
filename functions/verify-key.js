// Cloudflare Pages Function
// File: functions/verify-key.js
// URL: https://projectsingularity.online/verify-key
//
// ตั้งค่า Environment Variables ใน Cloudflare Pages:
//   Pages → Settings → Environment Variables → Add variable:
//   SUPABASE_SERVICE_KEY = (service_role key จาก Supabase)

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const keyValue = (body.key || '').trim();
    const rbxUser = (body.rbx_user || '').trim();
    const rbxId = body.rbx_id || '';

    if (!keyValue) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Key cannot be empty.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const SUPABASE_URL = 'https://jqtxjbuiplmqjodqozre.supabase.co';
    const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || '';

    if (!SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Server misconfiguration. Contact admin.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Query ตาราง script_keys
    const queryUrl = `${SUPABASE_URL}/rest/v1/script_keys?key_value=eq.${encodeURIComponent(keyValue)}&is_active=eq.true&select=id,user_id,expires_at`;

    const supaRes = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (!supaRes.ok) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Database error. Try again later.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const rows = await supaRes.json();

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Invalid key. Get your key at projectsingularity.online/key.html' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const row = rows[0];
    const now = new Date();

    // ดึงข้อมูล Profile
    let profile = null;
    const profileQuery = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${row.user_id}&select=username,avatar_url`;
    const profileRes = await fetch(profileQuery, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (profileRes.ok) {
      const profileRows = await profileRes.json();
      if (profileRows && profileRows.length > 0) {
        profile = profileRows[0];
      }
    }

    // ตรวจสอบวันหมดอายุ
    if (row.expires_at && new Date(row.expires_at) < now) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Your key has expired. Please reset it at projectsingularity.online/key.html' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // บันทึกข้อมูลบัญชี Roblox (Upsert)
    if (rbxUser && rbxUser !== 'Unknown' && rbxId) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/roblox_accounts`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            user_id: row.user_id,
            roblox_username: rbxUser,
            roblox_userid: parseInt(rbxId) || 0,
            key_used: keyValue,
            last_used_at: now.toISOString()
          })
        });
      } catch (e) {
        console.error("Failed to insert roblox account:", e);
      }
    }

    // Key ถูกต้อง
    return new Response(
      JSON.stringify({ valid: true, message: 'Key verified successfully!', profile: profile }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: 'Server error: ' + err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS preflight (CORS)
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}
