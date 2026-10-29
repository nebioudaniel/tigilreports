'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, FileInput, CheckCircle2, Table2, ClipboardList, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface FormField {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'radio' | 'checkbox'
  options?: string[]
  required: boolean
}

interface ResponseRow {
  id: string
  submitted_by: string | null
  data: Record<string, string | string[]>
  created_at: string
}

export default function FillFormPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState<{ id: string; title: string; description?: string | null; fields: FormField[]; created_at: string } | null>(null)
  const [values, setValues] = useState<Record<string, string | string[]>>({})
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [members, setMembers] = useState<Record<string, string>>({})
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()
    const p = profile as { company_id?: string; role?: string } | null
    if (!p?.company_id) { router.replace('/onboarding'); return }
    setIsOwner(p.role === 'owner')

    const { data: fm } = await supabase.from('custom_forms').select('id, title, description, fields, created_at').eq('id', id as string).single()
    if (!fm) { router.replace('/dashboard/forms'); return }
    setForm(fm as typeof form)

    const [{ data: res }, { data: prof }, { data: mine }] = await Promise.all([
      supabase.from('form_responses').select('id, submitted_by, data, created_at').eq('form_id', id as string).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email').eq('company_id', p.company_id),
      supabase.from('form_responses').select('data').eq('form_id', id as string).eq('submitted_by', user.id).maybeSingle(),
    ])
    setResponses((res || []) as ResponseRow[])
    if (mine) setValues((mine as { data: Record<string, string | string[]> }).data || {})
    const mMap: Record<string, string> = {}
    for (const m of (prof || []) as { id: string; full_name?: string; email?: string }[]) {
      mMap[m.id] = m.full_name || m.email || 'Staff'
    }
    setMembers(mMap)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(() => load(), 0) }, [id])

  async function validate() {
    if (!form) return false
    const missing = form.fields.filter(f => {
      const v = values[f.id]
      const empty = f.type === 'checkbox' ? !Array.isArray(v) || v.length === 0 : !v || String(v).trim() === ''
      return f.required && empty
    })
    if (missing.length) {
      toast.error(`Please fill: ${missing.map(f => f.label).join(', ')}`)
      return false
    }
    return true
  }

  async function saveResponse(supabase = createClient()) {
    if (!form) return null
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single()
    const companyId = (profile as { company_id?: string })?.company_id
    const payload = { data: Object.fromEntries(form.fields.map(f => [f.id, values[f.id] ?? ''])) }

    // One editable entry per person — update if they already submitted, else insert
    const { data: existing } = await supabase
      .from('form_responses')
      .select('id')
      .eq('form_id', form.id)
      .eq('submitted_by', user!.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from('form_responses').update(payload).eq('id', (existing as { id: string }).id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('form_responses').insert({
        form_id: form.id,
        company_id: companyId,
        submitted_by: user!.id,
        ...payload,
      })
      if (error) throw error
    }
    return companyId
  }

  async function handleSubmit() {
    if (!(await validate())) return
    setSubmitting(true)
    try {
      await saveResponse()
      toast.success('Response saved!')
      setSubmitted(true)
      load()
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerate() {
    if (!form || !(await validate())) return
    setAnalyzing(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('company_id, companies(name)').eq('id', user!.id).single()
      const p = profile as { company_id?: string; companies?: { name?: string } } | null
      const companyName = p?.companies?.name || 'My Company'
      const companyId = p?.company_id

      // Save the current entry
      await saveResponse(supabase)

      // Pull every response so far
      const { data: responses } = await supabase
        .from('form_responses')
        .select('data, created_at')
        .eq('form_id', form.id)
        .order('created_at', { ascending: true })
      const rows = (responses || []) as { data: Record<string, string | string[]>; created_at: string }[]
      if (rows.length === 0) throw new Error('No responses yet')

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

      const resp = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: `${form.title} form analysis`,
          inputData: aiInput,
          companyName,
          dateRange: `${rows[0].created_at.split('T')[0]} to ${rows[rows.length - 1].created_at.split('T')[0]}`,
        }),
      })
      const result = await resp.json()
      if (!result.success) throw new Error(result.error || 'Generation failed')

      const today = new Date().toISOString().split('T')[0]
      const { data: report, error } = await supabase.from('reports').insert({
        company_id: companyId,
        created_by: user!.id,
        title: `${form.title} Report - ${today}`,
        type: 'form-analysis',
        date_from: rows[0].created_at.split('T')[0],
        date_to: rows[rows.length - 1].created_at.split('T')[0],
        input_data: aiInput,
        ai_output: result.report,
        status: 'published',
      }).select().single()

      if (error) throw error
      toast.success('Report generated!')
      router.push(`/dashboard/reports/${report.id}`)
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'Failed to generate report')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link href="/dashboard/forms">
          <Button variant="ghost" size="sm" className="rounded-full pl-3">
            <ArrowLeft size={15} className="mr-1.5" /> All forms
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest rounded-full">
            <ClipboardList size={11} className="mr-1.5" />{form.fields?.length || 0} fields
          </Badge>
        </div>
      </div>

      {/* Header */}
      <div className="text-center py-4 print:hidden">
        <div className="w-12 h-12 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mx-auto mb-4">
          <FileInput size={20} className="text-foreground/60" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{form.title}</h2>
        {form.description && <p className="text-sm text-muted-foreground mt-1">{form.description}</p>}
      </div>

      {/* Fill form */}
      <Card className="border-border/60 shadow-none rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-5">
          {form.fields.map((field) => {
            if (field.type === 'radio' && field.options?.length) {
              return (
                <div key={field.id} className="space-y-2.5">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {field.options.map((o) => {
                      const selected = values[field.id] === o
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setValues(prev => ({ ...prev, [field.id]: o }))}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all text-left ${
                            selected
                              ? 'border-foreground bg-foreground/5 shadow-sm'
                              : 'border-border/60 bg-surface/40 hover:border-foreground/30'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-foreground' : 'border-muted-foreground/40'}`}>
                            {selected && <span className="w-2 h-2 rounded-full bg-foreground" />}
                          </span>
                          {o}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            }
            if (field.type === 'checkbox' && field.options?.length) {
              const selectedArr = Array.isArray(values[field.id]) ? values[field.id] as string[] : []
              return (
                <div key={field.id} className="space-y-2.5">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                    <span className="text-xs text-muted-foreground font-normal ml-2">(select all that apply)</span>
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {field.options.map((o) => {
                      const checked = selectedArr.includes(o)
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setValues(prev => {
                            const cur = Array.isArray(prev[field.id]) ? (prev[field.id] as string[]) : []
                            const next = checked ? cur.filter(x => x !== o) : [...cur, o]
                            return { ...prev, [field.id]: next }
                          })}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all text-left ${
                            checked
                              ? 'border-foreground bg-foreground/5 shadow-sm'
                              : 'border-border/60 bg-surface/40 hover:border-foreground/30'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-foreground border-foreground' : 'border-muted-foreground/40'}`}>
                            {checked && <CheckCircle2 size={11} className="text-background" />}
                          </span>
                          {o}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            }
            return (
              <div key={field.id} className="space-y-2">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <Textarea
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    value={String(values[field.id] || '')}
                    onChange={(e) => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="min-h-[80px] resize-none bg-surface/40"
                    rows={3}
                  />
                ) : field.type === 'select' && field.options?.length ? (
                  <Select value={String(values[field.id] || '')} onValueChange={(v) => setValues(prev => ({ ...prev, [field.id]: v ?? '' }))}>
                    <SelectTrigger className="h-10 bg-surface/40"><SelectValue placeholder={`Choose ${field.label.toLowerCase()}...`} /></SelectTrigger>
                    <SelectContent>
                      {field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    value={String(values[field.id] || '')}
                    onChange={(e) => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="h-10 bg-surface/40"
                  />
                )}
              </div>
            )
          })}

          {submitted && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-foreground/5 border border-border/50 rounded-full px-4 py-2">
              <CheckCircle2 size={13} />
              Your response is saved — edit and submit again anytime to update it.
            </div>
          )}
        </CardContent>
        <div className="px-6 md:px-8 py-4 border-t border-border/50 bg-surface/50 flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {isOwner ? 'Saved under your name, then AI turns all responses into a report' : 'Your entry is saved under your name and can be edited anytime'}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={handleSubmit} disabled={submitting || analyzing} className="rounded-full">
              {submitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CheckCircle2 size={14} className="mr-1.5" />}
              Submit
            </Button>
            {isOwner && (
              <Button onClick={handleGenerate} disabled={analyzing || submitting} className="rounded-full px-6 shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow">
                {analyzing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Sparkles size={14} className="mr-2" />}
                {analyzing ? 'Generating...' : 'Generate Report with AI'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Responses (owner) */}
      {isOwner && (
        <Card className="border-border/60 shadow-none rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Table2 size={14} className="text-muted-foreground" />
              Responses
              <Badge variant="outline" className="text-[10px] rounded-full">{responses.length}</Badge>
            </CardTitle>
          </CardHeader>
          {responses.length === 0 ? (
            <CardContent className="pt-0 pb-6">
              <p className="text-sm text-muted-foreground">No responses yet — share this form with your staff.</p>
            </CardContent>
          ) : (
            <CardContent className="pt-0">
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-muted-foreground text-[10px] uppercase tracking-widest">
                    <tr>
                      {form.fields.map(f => (
                        <th key={f.id} className="px-4 py-3 font-medium border-b border-border/50 whitespace-nowrap">{f.label}</th>
                      ))}
                      <th className="px-4 py-3 font-medium border-b border-border/50 whitespace-nowrap text-right">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {responses.map((r) => (
                      <tr key={r.id} className="bg-background hover:bg-surface/30 transition-colors">
                        {form.fields.map(f => {
                          const v = r.data?.[f.id]
                          const display = Array.isArray(v) ? v.join(', ') : (v || '—')
                          return <td key={f.id} className="px-4 py-3 text-xs">{display}</td>
                        })}
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap text-right">
                          {members[r.submitted_by!] || 'Staff'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
