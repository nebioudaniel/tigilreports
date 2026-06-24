import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { amount, email, firstName, lastName, companyId, title, description, returnUrl } = await request.json()

    if (!amount || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const secretKey = process.env.CHAPA_SECRET_KEY
    if (!secretKey || secretKey === 'YOUR_CHAPA_SECRET_KEY') {
      console.error('Chapa secret key not configured')
      return NextResponse.json({ error: 'Payment not configured. Set CHAPA_SECRET_KEY in .env.local' }, { status: 500 })
    }

    const txRef = `tigil-${companyId || 'anon'}-${Date.now()}`

    const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency: 'ETB',
        email,
        first_name: firstName || 'User',
        last_name: lastName || 'User',
        tx_ref: txRef,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/chapa`,
        return_url: returnUrl
          ? `${process.env.NEXT_PUBLIC_APP_URL}${returnUrl}`
          : `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&success=true`,
        customization: {
          title: (title || 'Tigil Reports').replace(/[^a-zA-Z0-9 _.-]/g, ''),
          description: (description || 'Payment for Tigil Reports plan').replace(/[^a-zA-Z0-9 _.-]/g, '')
        }
      })
    })

    const text = await chapaResponse.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.error('Chapa returned non-JSON:', text)
      return NextResponse.json({ error: 'Invalid response from payment gateway' }, { status: 500 })
    }

    if (data.status === 'success' && data.data?.checkout_url) {
      return NextResponse.json({ checkoutUrl: data.data.checkout_url, txRef })
    }

    console.error('Chapa error response:', data)
    return NextResponse.json({ error: data.message || data.detail || 'Payment initialization failed' }, { status: 500 })
  } catch (error) {
    console.error('Chapa error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
