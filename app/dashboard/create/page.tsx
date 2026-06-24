'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, File as FileIcon, Sparkles, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const loadingMessages = [
  'Analyzing your data...',
  'Writing executive summary...',
  'Generating insights...',
  'Almost ready...',
]

function CreateReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  function getSupabase() { return createClient() }

  const [reportType, setReportType] = useState(searchParams.get('type') || 'weekly-sales')
  const [title, setTitle] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})

  const reportTypeOptions = [
    { value: 'weekly-sales', label: 'Weekly Sales Report' },
    { value: 'monthly-finance', label: 'Monthly Finance Summary' },
    { value: 'team-performance', label: 'Team Performance Report' },
    { value: 'custom', label: 'Custom Report' },
  ]

  useEffect(() => {
    const typeLabel = reportTypeOptions.find(rt => rt.value === reportType)?.label || reportType
    setTimeout(() => setTitle(`${typeLabel} - ${dateTo || 'Today'}`), 0)
  }, [reportType, dateTo])

  function updateFormField(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerate = useCallback(async () => {
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

      const response = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          inputData: formData,
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
          type: reportType,
          date_from: dateFrom,
          date_to: dateTo,
          input_data: formData,
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
  }, [reportType, title, dateFrom, dateTo, formData, router])

  const netProfit = Number(formData.totalRevenue || 0) - Number(formData.totalExpenses || 0)

  const inputClass = "h-12 text-base bg-background border-border focus:border-foreground/40 focus:ring-0 transition-colors"
  const labelClass = "text-sm font-medium text-foreground/80"
  const selectClass = "h-12 text-base bg-background border-border focus:border-foreground/40 focus:ring-0"

  const dynamicFields = () => {
    switch (reportType) {
      case 'weekly-sales':
        return (
          <>
            <div className="space-y-1.5">
              <Label className={labelClass}>Total Sales (ETB)</Label>
              <Input type="number" placeholder="0" value={formData.totalSales || ''} onChange={(e) => updateFormField('totalSales', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Number of Transactions</Label>
              <Input type="number" placeholder="0" value={formData.transactions || ''} onChange={(e) => updateFormField('transactions', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Top Product/Service</Label>
              <Input placeholder="Product name" value={formData.topProduct || ''} onChange={(e) => updateFormField('topProduct', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Week compared to last</Label>
              <Select value={formData.weekComparison || ''} onValueChange={(v) => { if (v) updateFormField('weekComparison', v); }}>
                <SelectTrigger className={selectClass}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="better">Better</SelectItem>
                  <SelectItem value="same">Same</SelectItem>
                  <SelectItem value="worse">Worse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Notes</Label>
              <Textarea placeholder="Additional notes..." value={formData.notes || ''} onChange={(e) => updateFormField('notes', e.target.value)} className="min-h-[100px] text-base bg-background border-border focus:border-foreground/40" />
            </div>
          </>
        )
      case 'monthly-finance':
        return (
          <>
            <div className="space-y-1.5">
              <Label className={labelClass}>Total Revenue (ETB)</Label>
              <Input type="number" placeholder="0" value={formData.totalRevenue || ''} onChange={(e) => updateFormField('totalRevenue', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Total Expenses (ETB)</Label>
              <Input type="number" placeholder="0" value={formData.totalExpenses || ''} onChange={(e) => updateFormField('totalExpenses', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Net Profit (ETB)</Label>
              <div className={`p-4 rounded-xl border text-lg font-medium ${netProfit >= 0 ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-900' : 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'}`}>
                ETB {netProfit.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Main Expense Category</Label>
              <Select value={formData.expenseCategory || ''} onValueChange={(v) => { if (v) updateFormField('expenseCategory', v); }}>
                <SelectTrigger className={selectClass}><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salaries">Salaries & Wages</SelectItem>
                  <SelectItem value="rent">Rent & Utilities</SelectItem>
                  <SelectItem value="inventory">Inventory & Stock</SelectItem>
                  <SelectItem value="marketing">Marketing & Ads</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Notes</Label>
              <Textarea placeholder="Additional notes..." value={formData.notes || ''} onChange={(e) => updateFormField('notes', e.target.value)} className="min-h-[100px] text-base bg-background border-border focus:border-foreground/40" />
            </div>
          </>
        )
      case 'team-performance':
        return (
          <>
            <div className="space-y-1.5">
              <Label className={labelClass}>Team Size</Label>
              <Input type="number" placeholder="0" value={formData.teamSize || ''} onChange={(e) => updateFormField('teamSize', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Projects Completed</Label>
              <Input type="number" placeholder="0" value={formData.projectsCompleted || ''} onChange={(e) => updateFormField('projectsCompleted', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Projects In Progress</Label>
              <Input type="number" placeholder="0" value={formData.projectsInProgress || ''} onChange={(e) => updateFormField('projectsInProgress', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Key Achievement</Label>
              <Textarea placeholder="What was the biggest win?" value={formData.keyAchievement || ''} onChange={(e) => updateFormField('keyAchievement', e.target.value)} className="min-h-[100px] text-base bg-background border-border focus:border-foreground/40" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Main Challenge</Label>
              <Textarea placeholder="What was the biggest challenge?" value={formData.mainChallenge || ''} onChange={(e) => updateFormField('mainChallenge', e.target.value)} className="min-h-[100px] text-base bg-background border-border focus:border-foreground/40" />
            </div>
          </>
        )
      case 'custom':
        return (
          <div className="space-y-1.5">
            <Label className={labelClass}>Describe your business data and what you want in the report</Label>
            <Textarea
              rows={8}
              placeholder="e.g. We are a retail store in Addis Ababa. Last month we had 500 customers and total sales of ETB 450,000. Our top product was imported electronics. We want a report showing our monthly performance with recommendations for next month..."
              value={formData.customPrompt || ''}
              onChange={(e) => updateFormField('customPrompt', e.target.value)}
              className="min-h-[180px] text-base bg-background border-border focus:border-foreground/40"
            />
          </div>
        )
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Create a new report</h2>
        <p className="text-muted-foreground mt-2">Fill in your data and let AI do the rest</p>
      </div>

      <Tabs defaultValue="form" className="w-full">
        <TabsList className="w-full h-12 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="form" className="flex-1 h-full rounded-lg text-sm font-medium data-[state=active]:shadow-sm">Fill form</TabsTrigger>
          <TabsTrigger value="file" className="flex-1 h-full rounded-lg text-sm font-medium data-[state=active]:shadow-sm">Upload file</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-6 mt-8">
          <Card className="p-8 border-border/60 shadow-sm space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="title" className={labelClass}>Report Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Quarterly Performance Review - Q3 2026" />
            </div>

            <div className="space-y-1.5">
              <Label className={labelClass}>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => { if (v) setReportType(v); }}>
                <SelectTrigger className={selectClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {reportTypeOptions.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className={labelClass}>From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
              </div>
            </div>

            {dynamicFields()}

            <Button
              className="w-full h-14 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <span className="flex items-center gap-3">
                  <Loader2 size={20} className="animate-spin" />
                  {loadingMessage}
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <Sparkles size={20} />
                  Generate Report with AI
                  <ArrowRight size={18} />
                </span>
              )}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="file" className="space-y-6 mt-8">
          <Card className="p-8 border-border/60 shadow-sm">
            <div
              className="border-2 border-dashed border-border/60 rounded-xl p-16 text-center cursor-pointer hover:border-foreground/30 hover:bg-muted/20 transition-all duration-200 group"
              onClick={() => document.getElementById('file-upload')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const droppedFile = e.dataTransfer.files[0]
                if (droppedFile) setFile(droppedFile)
              }}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileIcon size={28} className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-base font-medium">{file.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-4 py-1 text-xs">File selected</Badge>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload size={28} className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-base font-medium">Drop your CSV or Excel file here</div>
                    <div className="text-sm text-muted-foreground mt-1">or click to browse</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-4 py-1 text-xs">.csv, .xlsx, .xls</Badge>
                </div>
              )}
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0])
                }}
              />
            </div>

            {file && (
              <Button
                className="w-full h-14 mt-6 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <span className="flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin" />
                    {loadingMessage}
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <Sparkles size={20} />
                    Generate Report
                    <ArrowRight size={18} />
                  </span>
                )}
              </Button>
            )}
          </Card>
        </TabsContent>
      </Tabs>
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
