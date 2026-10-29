'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Share2, Download, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ReportActions({ reportId }: { reportId: string }) {
  const [copied, setCopied] = useState(false)
  const [printing, setPrinting] = useState(false)

  async function handleShare() {
    const url = `${window.location.origin}/dashboard/reports/${reportId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy link')
    }
  }

  function handlePrint() {
    setPrinting(true)
    toast.success('Choose "Save as PDF" in the print menu')
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 400)
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard/reports" className="no-print">
        <Button variant="ghost" size="sm" className="rounded-full">
          <ArrowLeft size={15} className="mr-1.5" /> Back
        </Button>
      </Link>
      <Button variant="outline" size="sm" className="rounded-full no-print" onClick={handleShare}>
        {copied ? <Check size={14} className="mr-1.5" /> : <Share2 size={14} className="mr-1.5" />}
        {copied ? 'Copied' : 'Share'}
      </Button>
      <Button variant="outline" size="sm" className="rounded-full no-print" onClick={handlePrint} disabled={printing}>
        {printing ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
        Download PDF
      </Button>
    </div>
  )
}
