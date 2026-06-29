import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    const sb = createClient(url, key)
    const { data, error } = await sb.from('stationen').select('count').limit(1)
    if (error) return NextResponse.json({ status: 'error', error: error.message })
    return NextResponse.json({ status: 'ok', data })
  } catch(e: any) {
    return NextResponse.json({ status: 'catch', error: e.message, stack: e.stack?.substring(0,300) })
  }
}
