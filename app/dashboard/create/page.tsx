'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileInput, Users } from 'lucide-react'
import { toast } from 'sonner'

const loadingMessages = [
  'Reading every response...',
  'Analyzing your data...',
  'Writing executive summary...',
  'Generating insights...',
  'Almost ready...',
]

interface FormField {
  id: string
  label: string
  type: string
  options?: string[]
}

interface FormSummary {
  id: string
  title: string
  description?: string | null
  fields: FormField[]
}

interface FormResponse {
  id: string
  data: Record<string, string | string[]>
  created_at: string
  submitted_by: string | null
}

const inputClass = "h-12 text-base bg-background border-border focus:border-foreground/40 focus:ring-0 transition-colors"
const selectClass = "h-12 text-base bg-background border-border focus:border-foreground/40 focus:ring-0"

function CreateReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedForm = searchParams.get('form')
  function getSupabase() { return createClient() }

  const [title, setTitle] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [forms, setForms] = useState<FormSummary[]>([])
  const [selectedForm, setSelectedForm] = useState<string>('')
  const [loadingForms, setLoadingForms] = useState(true)

  const form = forms.find(f => f.id === selectedForm)

  // Load the company's custom forms
  useEffect(() => {
    setTimeout(() => setLoadingForms(true), 0)
    async function load() {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
      const companyId = (profile as { company_id?: string })?.company_id
      if (!companyId) return
      const { data: f } = await supabase
        .from('custom_forms')
        .select('id, title, description, fields')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      const list = (f || []) as FormSummary[]
      setForms(list)
      if (preselectedForm && list.some(x => x.id === preselectedForm)) {
        setSelectedForm(preselectedForm)
      } else if (list.length === 1) {
        setSelectedForm(list[0].id)
      }
      setLoadingForms(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto title from the selected form
  useEffect(() => {
    const label = form?.title || 'Form Analysis'
    setTimeout(() => setTitle(`${label} Report - ${dateTo || 'Today'}`), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForm, dateTo, forms.length])

  async function handleGenerate() {
    if (generating) return
    setGenerating(true)
    let msgIndex = 0
    setLoadingMessage(loadingMessages[0])
    const interval = setInterval(() => {
      msgIndex++
      if (msgIndex < loadingMessages.length) {
        setLoadingMessage(loadingMessages[msgIndex])
      }
    }, 3000)

    try {
      const { data: { user } } = await getSupabase().auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('company_id, companies(name)')
        .eq('id', user.id)
        .single()

      const companyName = ((profile as { companies?: { name?: string } })?.companies as { name?: string })?.name || 'My Company'
      const companyId = (profile as { company_id?: string })?.company_id

      if (!companyId) throw new Error('No company found')
      if (!form) throw new Error('Choose a form to analyze first')

      const { data: responses } = await getSupabase()
        .from('form_responses')
        .select('data, created_at')
        .eq('form_id', form.id)
        .order('created_at', { ascending: true })

      const rows = (responses || []) as FormResponse[]
      if (rows.length === 0) throw new Error('This form has no responses yet — have your staff fill it in first')

      const aiInput = {
        formTitle: form.title,
        formDescription: form.description,
        fieldLabels: form.fields.map(f => f.label),
        responseCount: rows.length,
        responses: rows.map(r => {
          const entry: Record<string, string> = {}
          form.fields.forEach(f => {
            const v = r.data?.[f.id]
            entry[f.label] = Array.isArray(v) ? v.join(', ') : (v ?? '')
          })
          return { date: r.created_at.split('T')[0], values: entry }
        }),
      }

      const response = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: `${form.title} form analysis`,
          inputData: aiInput,
          companyName,
          dateRange: `${dateFrom} to ${dateTo}`,
        }),
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Generation failed')

      const { data: report, error } = await getSupabase()
        .from('reports')
        .insert({
          company_id: companyId,
          created_by: user.id,
          title,
          type: 'form-analysis',
          date_from: dateFrom,
          date_to: dateTo,
          input_data: aiInput,
          ai_output: result.report,
          status: 'published',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Report generated!')
      router.push(`/dashboard/reports/${report.id}`)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || 'Failed to generate report')
    } finally {
      clearInterval(interval)
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.14_0_0/0.04),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.9_0_0/0.07),transparent)]" />
        <div className="relative px-6 md:px-8 py-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground border border-border/60 rounded-full px-2.5 py-1">
              <FileInput size={11} />
              Reports
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create a report</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md leading-relaxed">
            Choose a form your staff filled in — AI reads every response and writes the full business report.
          </p>
        </div>
      </div>

      <Card className="p-6 md:p-8 border-border/60 shadow-none space-y-6">
        {loadingForms ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-border/60 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mx-auto mb-3">
              <FileInput size={16} className="text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium mb-1">Create a custom form first</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto leading-relaxed">
              AI reports run on forms <span className="text-foreground">you create</span>. Build one with your own fields, have your staff fill it, then analyze it here.
            </p>
            <Link href="/dashboard/forms">
              <Button className="rounded-full px-6">Create custom form</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Choose a form</Label>
              <Select value={selectedForm} onValueChange={(v) => { if (v) setSelectedForm(v) }}>
                <SelectTrigger className={selectClass}>
                  <SelectValue placeholder="Pick a custom form..." />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((f) => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
              </div>
            </div>

            <FormPreview form={form} getSupabase={getSupabase} />

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Report Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>

            <Button
              size="sm"
              className="w-full h-10 text-sm font-medium rounded-full shadow-sm"
              onClick={() => handleGenerate()}
              disabled={generating}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {loadingMessage}
                </span>
              ) : (
                'Analyze with AI'
              )}
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}

/** Live preview of a form's responses shown before AI analysis */
function FormPreview({ form, getSupabase }: {
  form?: FormSummary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSupabase: () => any
}) {
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!form?.id) return
    setLoading(true)
    getSupabase()
      .from('form_responses')
      .select('id, data, created_at')
      .eq('form_id', form.id)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: FormResponse[] | null }) => {
        setResponses(data || [])
        setLoading(false)
      })
  }, [form?.id, getSupabase])

  if (!form) return null

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface/60 border-b border-border/50">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Response preview</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Users size={12} />
          {loading ? '...' : `${responses.length} submission${responses.length === 1 ? '' : 's'}`}
        </span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
      ) : responses.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No responses yet — staff can fill this form first.</p>
      ) : (
        <div className="overflow-x-auto max-h-48">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface/40 text-muted-foreground text-[10px] uppercase tracking-wider sticky top-0">
              <tr>
                {form.fields.map(f => (
                  <th key={f.id} className="px-3 py-2 font-medium border-b border-border/50 whitespace-nowrap">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {responses.slice(0, 5).map((r) => (
                <tr key={r.id} className="bg-background">
                  {form.fields.map(f => {
                    const v = r.data?.[f.id]
                    return <td key={f.id} className="px-3 py-2 whitespace-nowrap">{Array.isArray(v) ? v.join(', ') : (v || '—')}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function CreateReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-16"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>}>
      <CreateReportContent />
    </Suspense>
  )
}
