export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ═══════════════════════════════════════════════════════
    // Handle CORS Preflight (OPTIONS) สำหรับทุก Route
    // ═══════════════════════════════════════════════════════
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // ═══════════════════════════════════════════════════════
    // Route: /verify-key หรือ /raw/verify-key — ตรวจสอบ Key จาก Roblox Script
    // ═══════════════════════════════════════════════════════
    if (url.pathname === '/verify-key' || url.pathname === '/raw/verify-key') {
      try {
        let keyValue = '';
        let rbxUser = '';
        let rbxId = '';
        if (request.method === 'POST') {
          const body = await request.json();
          keyValue = (body.key || '').trim();
          rbxUser = (body.rbx_user || '').trim();
          rbxId = body.rbx_id || '';
        } else if (request.method === 'GET') {
          keyValue = (url.searchParams.get('k') || '').trim();
          rbxUser = (url.searchParams.get('rbx_user') || '').trim();
          rbxId = url.searchParams.get('rbx_id') || '';
        } else {
          return jsonResponse({ valid: false, message: 'Method not allowed.' }, 405);
        }

        if (!keyValue) {
          return jsonResponse({ valid: false, message: 'Key cannot be empty.' }, 400);
        }

        // ── ดึง Supabase credentials จาก env secrets ──────────
        // ตั้งค่าใน Cloudflare Dashboard → Worker → Settings → Variables
        // SUPABASE_URL = https://jqtxjbuiplmqjodqozre.supabase.co
        // SUPABASE_SERVICE_KEY = (service_role key ของคุณ)
        const SUPABASE_URL = env.SUPABASE_URL || 'https://jqtxjbuiplmqjodqozre.supabase.co';
        const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || '';

        if (!SUPABASE_SERVICE_KEY) {
          return jsonResponse({ valid: false, message: 'Server misconfiguration.' }, 500);
        }

        // ── Query ตาราง script_keys ───────────────────────────
        const now = new Date().toISOString();
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
          return jsonResponse({ valid: false, message: 'Database error.' }, 500);
        }

        const rows = await supaRes.json();

        if (!rows || rows.length === 0) {
          return jsonResponse({ valid: false, message: 'Invalid key. Get your key at https://singularity-web.pages.dev/key.html' });
        }

        const row = rows[0];

        // ── ดึงข้อมูล Profile + Email ─────────────────────────
        let profile = null;
        const profileQuery = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${row.user_id}&select=username,avatar_url,email`;
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

        // ── ถ้ายังไม่มี email ใน profile ดึงจาก auth.users ─────────
        if (profile && !profile.email) {
          try {
            const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${row.user_id}`, {
              method: 'GET',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              }
            });
            if (authRes.ok) {
              const authUser = await authRes.json();
              profile.email = authUser.email || '';
            }
          } catch (e) {
            console.error('Failed to fetch email from auth:', e);
          }
        }

        // ── ตรวจสอบวันหมดอายุ (ถ้ามี) ────────────────────────
        if (row.expires_at && new Date(row.expires_at) < new Date(now)) {
          return jsonResponse({ valid: false, message: 'Your key has expired. Please generate a new one.' });
        }

        // ── บันทึกข้อมูลบัญชี Roblox (Upsert) ───────────────────────
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
                last_used_at: now
              })
            });
          } catch (e) {
            console.error("Failed to insert roblox account:", e);
          }
        }

        // ── Key ถูกต้อง ───────────────────────────────────────
        // ถ้ามี rbxId ให้ใส่ avatar_url ใน profile เป็น Roblox Thumbnail URL
        if (profile && rbxId && parseInt(rbxId) > 0) {
          profile.avatar_url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${parseInt(rbxId)}&size=150x150&format=Png&isCircular=true`;
        }

        return jsonResponse({ valid: true, message: 'Key verified successfully!', profile: profile });

      } catch (err) {
        return jsonResponse({ valid: false, message: 'Server error: ' + err.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════
    // Route: POST /obfuscate — Proxy ไปยัง hide.lat API
    // (แก้ปัญหา CORS ที่ Browser เรียก API ตรงๆ ไม่ได้)
    // ═══════════════════════════════════════════════════════
    if (url.pathname === '/obfuscate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const luaCode = body.source;

        if (!luaCode) {
          return new Response(JSON.stringify({ error: 'Missing source field' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        // ส่งไปให้ hide.lat API เข้ารหัส
        const hidelatRes = await fetch('https://hide.lat/api/obfuscate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: luaCode,
            tier: body.tier || 'lite',
            banner: false
          })
        });

        if (!hidelatRes.ok) {
          const errText = await hidelatRes.text();
          return new Response(JSON.stringify({ error: `hide.lat error ${hidelatRes.status}: ${errText}` }), {
            status: hidelatRes.status,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const result = await hidelatRes.json();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }


    // ═══════════════════════════════════════════════════════
    // Route: GET /raw/* — ดึงไฟล์สคริปต์จาก Supabase
    // ═══════════════════════════════════════════════════════
    const supabaseUrl = 'https://jqtxjbuiplmqjodqozre.supabase.co/storage/v1/object/public';

    let path = url.pathname;
    if (path.startsWith('/raw')) {
      path = path.replace('/raw', '');
    }

    const targetUrl = supabaseUrl + path;

    const userAgent = request.headers.get('User-Agent') || '';

    if (!userAgent.toLowerCase().includes('roblox')) {
      return new Response(
        "-- Access Denied\nwarn('ไม่สามารถดูโค้ดผ่านเบราว์เซอร์ได้! อนุญาตให้รันผ่าน Roblox เท่านั้น')",
        {
          status: 403,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        }
      );
    }

    const supabaseResponse = await fetch(targetUrl);

    if (!supabaseResponse.ok) {
      return new Response(
        "-- 404 Not Found\nwarn('หาไฟล์ไม่เจอ หรือลิงก์ผิด')",
        {
          status: 404,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        }
      );
    }

    const scriptContent = await supabaseResponse.text();

    return new Response(scriptContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  },
};

// ── Helper ─────────────────────────────────────────────────
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
