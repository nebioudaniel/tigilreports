import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const planPrices: Record<string, number> = {
  free: 0,
  basic: 150,
  pro: 350,
  enterprise: 560,
}

/**
 * Extract the company id from a tx_ref shaped like `tigil-<uuid>-<timestamp>`.
 * UUIDs contain dashes, so we can't simply split on '-'.
 */
function extractCompanyId(txRef: string): string | null {
  const withoutPrefix = txRef.replace(/^tigil-/, '')
  const withoutTimestamp = withoutPrefix.replace(/-\d{10,}$/, '')
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidLike.test(withoutTimestamp) ? withoutTimestamp : null
}

async function verifyWithChapa(txRef: string): Promise<{ ok: boolean; amount?: number; reason?: string }> {
  const secretKey = process.env.CHAPA_SECRET_KEY
  if (!secretKey || secretKey === 'YOUR_CHAPA_SECRET_KEY') {
    return { ok: false, reason: 'not-configured' }
  }
  try {
    const verifyResponse = await fetch(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const text = await verifyResponse.text()
    let verification: { status?: string; data?: { status?: string; amount?: number | string } } | null = null
    try {
      verification = JSON.parse(text)
    } catch {
      verification = null
    }
    // Per docs: top-level status success AND transaction status success
    if (verification?.status === 'success' && verification.data?.status === 'success') {
      const amount = typeof verification.data.amount === 'string'
        ? parseFloat(verification.data.amount)
        : verification.data.amount
      return { ok: true, amount }
    }
    return { ok: false, reason: 'verification-failed' }
  } catch {
    return { ok: false, reason: 'verify-request-error' }
  }
}

async function activateSubscription(txRef: string, status: string, planHint?: string, amountHint?: number) {
  if (status !== 'success') {
    return { success: false as const, error: 'Payment not successful' }
  }

  const companyId = extractCompanyId(txRef)
  if (!companyId) {
    return { success: false as const, error: 'Invalid tx_ref format' }
  }

  // Always verify final state with Chapa (per docs)
  const verification = await verifyWithChapa(txRef)
  if (!verification.ok) {
    console.error(`Chapa verification failed for ${txRef}: ${verification.reason}`)
    return { success: false as const, error: 'Transaction verification failed' }
  }

  const plan = planHint?.toLowerCase() || ''
  const validPlan = Object.keys(planPrices).includes(plan) ? plan : 'pro'
  const planPrice = verification.amount ?? amountHint ?? planPrices[validPlan]

  const supabase = await createClient()
  await supabase.from('companies').update({
    plan: validPlan,
    reports_used_this_month: 0,
  }).eq('id', companyId)

  await supabase.from('subscriptions').insert({
    company_id: companyId,
    plan: validPlan,
    status: 'active',
    chapa_tx_ref: txRef,
    amount: planPrice,
    billing_cycle: 'monthly',
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  console.log(`Plan ${validPlan} activated for company ${companyId}`)
  return { success: true as const }
}

/**
 * Callback handler — Chapa v1 docs: callback_url receives a GET request
 * with trx_ref, ref_id and status after payment completes.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const txRef = params.get('trx_ref') || params.get('tx_ref')
    const status = params.get('status') || ''
    const plan = params.get('plan') || undefined

    if (!txRef) {
      return NextResponse.json({ error: 'Missing trx_ref' }, { status: 400 })
    }

    const result = await activateSubscription(txRef, status, plan)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/dashboard/settings?payment=success`
    )
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** POST handler — accepts manual posts and Chapa dashboard webhook payloads. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const txRef = body.trx_ref || body.tx_ref
    const status = body.status || ''
    const plan = body.plan

    if (!txRef) {
      return NextResponse.json({ error: 'Missing trx_ref' }, { status: 400 })
    }

    const result = await activateSubscription(txRef, status, plan, typeof body.amount === 'number' ? body.amount : undefined)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
