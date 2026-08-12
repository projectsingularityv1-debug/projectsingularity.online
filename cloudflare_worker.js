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

