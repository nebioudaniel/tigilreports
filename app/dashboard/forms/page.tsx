'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2, ClipboardList, Plus, Trash2, FileInput, Users, X, ArrowRight, Sparkles, Lock, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

interface FormField {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'radio' | 'checkbox'
  options?: string[]
  required: boolean
}

interface CustomForm {
  id: string
  title: string
  description?: string | null
  fields: FormField[]
  created_at: string
  response_count: number
}

const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown choice' },
  { value: 'radio', label: 'Single choice (radio cards)' },
  { value: 'checkbox', label: 'Multi-select (checkboxes)' },
]

const OPTION_TYPES = ['select', 'radio', 'checkbox']
const makeId = () => Math.random().toString(36).slice(2, 9)

// Forms allowed per company plan (null = unlimited)
const PLAN_LIMITS: Record<string, number | null> = {
  free: 2,
  basic: 5,
  pro: 15,
  enterprise: null,
}

export default function FormsPage() {
  const router = useRouter()
  const [forms, setForms] = useState<CustomForm[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [selectOptions, setSelectOptions] = useState<Record<string, string>>({})
  const [aiThinking, setAiThinking] = useState(false)

  async function loadForms() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role, companies(plan)')
      .eq('id', user.id)
      .single()
    const p = profile as { company_id?: string; role?: string; companies?: { plan?: string } } | null
    if (!p?.company_id) { router.replace('/onboarding'); return }
    setUserRole(p.role || 'member')
    setPlan(p.companies?.plan || 'free')

    const [{ data: f }, { data: r }] = await Promise.all([
      supabase.from('custom_forms').select('id, title, description, fields, created_at, is_open').eq('company_id', p.company_id).order('created_at', { ascending: false }),
      supabase.from('form_responses').select('form_id').eq('company_id', p.company_id),
    ])

    const respCounts = new Map<string, number>()
    for (const row of (r || []) as { form_id: string }[]) {
      respCounts.set(row.form_id, (respCounts.get(row.form_id) || 0) + 1)
    }

    setForms(((f || []) as Omit<CustomForm, 'response_count'>[]).map(fm => ({ ...fm, response_count: respCounts.get(fm.id) || 0 })))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(() => loadForms(), 0) }, [])

  function addField() {
    setFields(prev => [...prev, { id: makeId(), label: '', type: 'text', required: false }])
  }

  async function aiSuggestFields() {
    if (!formTitle.trim()) {
      toast.error('Add a form title first so AI knows what to build')
      return
    }
    setAiThinking(true)
    try {
      const response = await fetch('/api/ai/suggest-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formTitle, description: formDesc }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'AI failed')
      const suggested = (result.fields as Omit<FormField, 'id'>[]).map(f => ({
        ...f,
        id: makeId(),
      }))
      setFields(suggested)
      setSelectOptions(Object.fromEntries(
        suggested.filter(f => f.options?.length).map(f => [f.id, f.options!.join(', ')])
      ))
      toast.success(`AI drafted ${suggested.length} fields — tweak them as you like`)
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'Failed to get AI suggestions')
    } finally {
      setAiThinking(false)
    }
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  const isOwner = userRole === 'owner'
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const atLimit = limit !== null && forms.length >= limit
  const nearLimit = limit !== null && forms.length >= limit - 1

  const builderValid =
    formTitle.trim() &&
    fields.length > 0 &&
    fields.every(f =>
      f.label.trim() &&
      (!OPTION_TYPES.includes(f.type) || (selectOptions[f.id] || '').trim().includes(',') || (selectOptions[f.id] || '').trim().length > 0)
    )

  async function handleCreateForm() {
    if (!builderValid || atLimit) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single()
      const companyId = (profile as { company_id?: string })?.company_id
      const { error } = await supabase.from('custom_forms').insert({
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        fields: fields.map(f => ({
          id: f.id,
          label: f.label.trim(),
          type: f.type,
          required: f.required,
          ...(OPTION_TYPES.includes(f.type) ? { options: (selectOptions[f.id] || '').split(',').map(o => o.trim()).filter(Boolean) } : {}),
        })),
        company_id: companyId,
        created_by: user!.id,
        is_open: true,
      })
      if (error) throw error
      toast.success('Form created — your staff can fill it now!')
      setBuilderOpen(false)
      setFormTitle(''); setFormDesc(''); setFields([]); setSelectOptions({})
      loadForms()
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'Failed to create form')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this form and all its responses?')) return
    const { error } = await createClient().from('custom_forms').delete().eq('id', id)
    if (error) { toast.error('Failed to delete form'); return }
    setForms(prev => prev.filter(f => f.id !== id))
    toast.success('Form deleted')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.14_0_0/0.04),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.9_0_0/0.07),transparent)]" />
        <div className="relative px-6 md:px-10 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border/60 rounded-full px-2 py-0.5">Forms</span>
              {limit !== null && (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border/60 rounded-full px-2 py-0.5">
                  {forms.length}/{limit} used · {plan} plan
                </span>
              )}
              {limit === null && (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border/60 rounded-full px-2 py-0.5">
                  Unlimited · {plan} plan
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Custom forms</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Build a form with the exact fields you need — dropdowns, radio cards, checkboxes. Staff fill it in, and AI can turn the responses into a report.
            </p>
          </div>
          {isOwner && (
            <Button onClick={() => { setFields([{ id: makeId(), label: '', type: 'text', required: false }]); setBuilderOpen(true) }} disabled={atLimit} className="shrink-0 rounded-full px-6 h-10 shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow">
              {atLimit ? <Lock size={16} className="mr-2" /> : <ClipboardList size={16} className="mr-2" />}
              Create Form
            </Button>
          )}
        </div>
      </div>

      {/* Plan limit banner */}
      {limit !== null && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-5 py-3.5 ${nearLimit ? 'border-border bg-surface' : 'border-border/50 bg-surface/50'}`}>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Sparkles size={14} className="text-foreground/60" />
            <span>
              <span className="font-medium text-foreground">{forms.length} of {limit} forms</span> used on the {plan} plan.
              {nearLimit && ' You\u2019re almost at your limit.'}
            </span>
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/dashboard/settings" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
              Manage plan
            </Link>
          </div>
        </div>
      )}

      {/* Forms grid */}
      {forms.length === 0 ? (
        <Card className="p-12 border-dashed border-border/60 shadow-none text-center">
          <div className="w-12 h-12 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mx-auto mb-4">
            <FileInput size={20} className="text-muted-foreground/60" />
          </div>
          <h3 className="font-semibold mb-1">No forms yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            {isOwner
              ? 'Create a form — like a weekly sales sheet — and let your staff submit numbers into it.'
              : 'Your owner hasn\u2019t created any forms yet. Check back soon.'}
          </p>
          {isOwner && !atLimit && (
            <Button onClick={() => { setFields([{ id: makeId(), label: '', type: 'text', required: false }]); setBuilderOpen(true) }} className="rounded-full px-6">
              <Plus size={15} className="mr-2" />
              Create your first form
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form) => (
            <Card key={form.id} className="group p-5 border-border/60 shadow-none hover:shadow-sm hover:border-foreground/25 transition-all flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center">
                  <FileInput size={16} className="text-foreground/60" />
                </div>
                {isOwner && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive" onClick={() => handleDelete(form.id)}>
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
              <h4 className="font-semibold text-sm mb-1 truncate">{form.title}</h4>
              {form.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{form.description}</p>}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><ClipboardList size={11} />{form.fields?.length || 0} fields</span>
                <span className="flex items-center gap-1"><Users size={11} />{form.response_count} responses</span>
              </div>
              <div className="mt-4 pt-3 border-t border-border/40 flex gap-2">
                <Link href={`/dashboard/forms/${form.id}`} className="flex-1">
                  <Button size="sm" className="w-full rounded-full text-xs h-8">
                    Fill form <ArrowRight size={12} className="ml-1" />
                  </Button>
                </Link>
                {isOwner && form.response_count > 0 && (
                  <Link href={`/dashboard/forms/${form.id}?tab=responses`}>
                    <Button variant="outline" size="sm" className="rounded-full text-xs h-8 bg-background">Responses</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-border/60 rounded-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="text-xl tracking-tight">Create a form</DialogTitle>
              <DialogDescription className="pt-1.5 text-sm">
                Add fields exactly the way your staff fill them. Submissions are collected automatically.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Form Title <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Weekly Sales Entry" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</Label>
              <Textarea placeholder="What is this form for? (optional)" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="min-h-[64px] resize-none" rows={2} />
            </div>

            {/* AI assist */}
            <div className="rounded-xl border border-border/60 bg-surface/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Wand2 size={13} className="text-foreground/70" />
                    Need ideas? Let AI draft it
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Describe the form above and AI will pick the fields, types, and choices for you.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={aiSuggestFields}
                  disabled={aiThinking}
                  className="rounded-full shrink-0 bg-background"
                >
                  {aiThinking ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Sparkles size={13} className="mr-1.5" />}
                  {aiThinking ? 'Thinking...' : 'Suggest fields'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Fields <span className="text-destructive">*</span></Label>
                <Button variant="outline" size="sm" onClick={addField} className="rounded-full h-7 text-xs bg-background">
                  <Plus size={12} className="mr-1" /> Add field
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="rounded-xl border border-border/60 bg-surface/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Field {idx + 1}</span>
                      {fields.length > 1 && (
                        <button onClick={() => removeField(field.id)} className="ml-auto text-muted-foreground/60 hover:text-destructive transition-colors">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_170px_90px] gap-2">
                      <Input placeholder="Field label — e.g. Total sales (ETB)" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} className="h-9 text-sm bg-background" />
                      <Select value={field.type} onValueChange={(v) => { if (v) updateField(field.id, { type: v as FormField['type'] }) }}>
                        <SelectTrigger className="h-9 text-sm bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => updateField(field.id, { required: !field.required })}
                        className={`h-9 rounded-lg text-xs font-medium border transition-colors ${
                          field.required
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30'
                        }`}
                      >
                        {field.required ? 'Required' : 'Optional'}
                      </button>
                    </div>
                    {OPTION_TYPES.includes(field.type) && (
                      <div className="mt-2">
                        <Input
                          placeholder="Choices, separated by commas — e.g. Cash, Card, Transfer"
                          value={selectOptions[field.id] || ''}
                          onChange={(e) => setSelectOptions(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="h-9 text-sm bg-background"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border/60 rounded-xl">
                  Add at least one field
                </p>
              )}
            </div>
          </div>

          <div className="p-6 pt-4 bg-surface/50 border-t border-border/50 flex justify-between items-center gap-3">
            <span className="text-[11px] text-muted-foreground">
              {fields.length} field{fields.length === 1 ? '' : 's'} · staff will see exactly what you build
            </span>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setBuilderOpen(false)} className="rounded-full">Cancel</Button>
              <Button onClick={handleCreateForm} disabled={!builderValid || saving} className="rounded-full px-6 shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow">
                {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Create Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
