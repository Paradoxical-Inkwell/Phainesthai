import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAX_NAME_LENGTH = 120

function serverSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server configuration is unavailable')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (!name || name.length > MAX_NAME_LENGTH) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

    const supabase = serverSupabase()
    const { data, error } = await supabase
      .from('system_profiles')
      .select('user_code, full_name, status, level, rank, is_admin, first_login_at, attributes')
      .eq('full_name', name)
      .limit(2)

    if (error || !data?.length || data.length !== 1) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const profile = data[0]
    const firstLogin = profile.first_login_at == null
    return NextResponse.json({ profile, firstLogin })
  } catch {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }
}
