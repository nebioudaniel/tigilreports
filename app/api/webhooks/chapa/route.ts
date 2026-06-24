import { NextRequest, NextResponse } from 'next/server'

const planPrices: Record<string, number> = {
  free: 0,
  basic: 150,
  pro: 350,
  enterprise: 560,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tx_ref, status, plan: planName, amount } = body

    if (!tx_ref) {
      return NextResponse.json({ error: 'Missing tx_ref' }, { status: 400 })
    }

    if (status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 })
    }

    const parts = tx_ref.split('-')
    const companyId = parts[1]

    if (!companyId || companyId === 'anon') {
      return NextResponse.json({ error: 'Invalid tx_ref format' }, { status: 400 })
    }

    const secretKey = process.env.CHAPA_SECRET_KEY
    if (secretKey && secretKey !== 'YOUR_CHAPA_SECRET_KEY') {
      try {
        const verifyResponse = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${secretKey}` }
        })
        const verifyText = await verifyResponse.text()
        let verification
        try {
          verification = JSON.parse(verifyText)
        } catch {
          verification = null
        }
        if (verification && verification.status === 'success') {
          console.log('Chapa verification passed for', tx_ref)
        }
      } catch (e) {
        console.log('Chapa verify skipped (inline tx):', e)
      }
    }

    const plan = planName?.toLowerCase() || 'pro'
    const validPlan = Object.keys(planPrices).includes(plan) ? plan : 'pro'
    const planPrice = amount || planPrices[validPlan] || 0

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    await supabase.from('companies').update({
      plan: validPlan,
      reports_used_this_month: 0,
    }).eq('id', companyId)

    await supabase.from('subscriptions').insert({
      company_id: companyId,
      plan: validPlan,
      status: 'active',
      chapa_tx_ref: tx_ref,
      amount: planPrice,
      billing_cycle: 'monthly',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    console.log(`Plan ${validPlan} activated for company ${companyId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
