'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X } from 'lucide-react'

declare global {
  interface Window {
    ChapaCheckout: new (options: Record<string, unknown>) => { initialize: (id: string) => void }
  }
}

interface ChapaInlineProps {
  amount: number
  email: string
  firstName: string
  lastName: string
  companyId: string
  planName: string
  onSuccess?: () => void
  onFailure?: (error: string) => void
  children?: React.ReactNode
  className?: string
}

export function ChapaCheckout({
  amount,
  email,
  firstName,
  lastName,
  companyId,
  planName,
  onSuccess,
  onFailure,
  children,
  className,
}: ChapaInlineProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [containerId] = useState(() => `chapa-${Math.random().toString(36).slice(2, 9)}`)
  const [txRef] = useState(() => `tigil-${companyId}-${Date.now()}`)
  const initialized = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.ChapaCheckout) {
      setTimeout(() => setScriptLoaded(true), 0)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.chapa.co/v1/inline.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => setScriptError('Failed to load payment script')
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [])

  useEffect(() => {
    if (!isOpen || !scriptLoaded || !window.ChapaCheckout || initialized.current) return
    initialized.current = true

    const chapa = new window.ChapaCheckout({
      publicKey: process.env.NEXT_PUBLIC_CHAPA_PUBLIC_KEY,
      amount: String(amount),
      currency: 'ETB',
      tx_ref: txRef,
      showFlag: false,
      showPaymentMethodsNames: true,
      onSuccessfulPayment: () => {
        fetch('/api/webhooks/chapa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tx_ref: txRef,
            status: 'success',
            plan: planName.toLowerCase(),
            email,
            first_name: firstName,
            last_name: lastName,
            amount,
          }),
        }).catch(console.error)
        onSuccess?.()
      },
      onPaymentFailure: (error: string) => {
        onFailure?.(error)
        initialized.current = false
      },
      onClose: () => {
        setIsOpen(false)
        initialized.current = false
      },
      customizations: {
        buttonText: `Pay ETB ${amount.toLocaleString()}`,
        styles: `
          .chapa-pay-button { background-color: #000; color: #fff; border: none; border-radius: 9999px; padding: 12px 24px; font-size: 15px; font-weight: 500; cursor: pointer; width: 100%; transition: opacity 0.2s; }
          .chapa-pay-button:hover { opacity: 0.8; }
          .chapa-pay-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .chapa-payment-methods-grid { display: flex; gap: 8px; margin: 12px 0; justify-content: center; }
          .chapa-payment-method { border: 1px solid #e5e7eb; border-radius: 12px; cursor: pointer; padding: 8px 12px; width: auto; min-width: 56px; height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.2s; }
          .chapa-payment-method:hover { border-color: #000; }
          .chapa-selected { border-color: #000; background-color: #f5f5f5; box-shadow: none; }
          .chapa-payment-icon { width: 28px; height: 28px; margin-bottom: 2px; }
          .chapa-payment-name { font-size: 9px; text-align: center; color: #6b7280; }
          .chapa-phone-input-wrapper { border: 1px solid #e5e7eb; border-radius: 12px; padding: 8px 12px; display: flex; align-items: center; margin-bottom: 8px; }
          .chapa-phone-input-wrapper:hover { border-color: #000; }
          .chapa-phone-prefix { padding: 0 8px 0 0; font-size: 14px; color: #6b7280; display: flex; align-items: center; gap: 4px; }
          .chapa-flag-icon { display: none; }
          .chapa-phone-input { width: 100%; padding: 8px; border: none; border-left: 1px solid #e5e7eb; font-size: 15px; outline: none; box-shadow: none; }
          .chapa-phone-input:focus { outline: none; }
          .chapa-error { color: #ef4444; font-size: 13px; margin-bottom: 8px; display: none; }
          .chapa-loading { display: none; text-align: center; margin-top: 12px; }
          .chapa-spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid #e5e7eb; border-radius: 50%; border-top-color: #000; animation: chapa-spin 0.8s linear infinite; }
          @keyframes chapa-spin { to { transform: rotate(360deg); } }
          .chapa-loading p { font-size: 14px; color: #6b7280; margin-top: 8px; }
          #secure { display: none; }
        `,
      },
    })

    const container = document.getElementById(containerId)
    if (container) container.innerHTML = ''
    chapa.initialize(containerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scriptLoaded])

  if (scriptError) {
    return <p className="text-red-500 text-sm">{scriptError}</p>
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className={className}>
        {children}
      </Button>
    )
  }

  return (
    <Card className="p-5 border-border">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-medium">Pay with Chapa</span>
          <p className="text-xs text-muted-foreground mt-0.5">ETB {amount.toLocaleString()} via mobile money</p>
        </div>
        <button onClick={() => { setIsOpen(false); initialized.current = false }} className="text-muted-foreground hover:text-foreground p-1">
          <X size={16} />
        </button>
      </div>
      <div id={containerId} />
    </Card>
  )
}
