import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase.from('stationen').select('count').limit(1)
    if (error) return NextResponse.json({ status: 'supabase_error', error: error.message, code: error.code })
    return NextResponse.json({ status: 'supabase_ok', data })
  } catch (e: any) {
    return NextResponse.json({ status: 'exception', error: e.message })
  }
}
