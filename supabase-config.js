// ============================================================
//  SINGULARITY — Supabase Client Config
//  ใช้ @supabase/supabase-js via CDN (ไม่ต้อง build tool)
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL          = 'https://jqtxjbuiplmqjodqozre.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_u0TQQKm1F4b9Hi4fZTm0hg_cXokm473'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
