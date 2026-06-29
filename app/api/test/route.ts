import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Test: eine Station einfügen
    const { data, error } = await supabase
      .from('stationen')
      .insert({
        interne_id: 'TEST_' + Date.now(),
        bezeichnung: 'Test',
        kundenname: 'Test Kunde',
        standort: null,
        meldungstyp: 'offline',
      })
      .select('id')
      .single()
    
    if (error) return NextResponse.json({ status: 'insert_error', error: error.message, code: error.code })
    return NextResponse.json({ status: 'insert_ok', id: data.id })
  } catch (e: any) {
    return NextResponse.json({ status: 'exception', error: e.message })
  }
}
