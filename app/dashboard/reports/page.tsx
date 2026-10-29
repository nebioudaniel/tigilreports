import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Sparkles, CalendarClock, FileSpreadsheet, Languages, Bell } from 'lucide-react'
import { ReportsBrowser } from './reports-browser'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, companies(name)')
    .eq('id', user.id)
    .single()

  const companyId = (profile as { company_id?: string })?.company_id
  if (!companyId) redirect('/onboarding')

  const companyName = (profile as { companies?: { name?: string } })?.companies?.name || 'your company'

  const { data: reports } = await supabase
    .from('reports')
    .select('id, title, type, created_at, ai_output')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  const reportList = (reports || []) as { id: string; title: string; type: string; created_at: string; ai_output: unknown }[]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.14_0_0/0.04),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.9_0_0/0.07),transparent)]" />
        <div className="relative px-6 md:px-10 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest rounded-full mb-2">Reports</Badge>
            <h2 className="text-2xl font-bold tracking-tight">My Reports</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Every report {companyName} generates, organized in one place. Search, filter, and share with anyone.
            </p>
          </div>
          <Link href="/dashboard/create">
            <Button className="shrink-0 rounded-full px-6 h-10 shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow">
              <Plus size={16} className="mr-2" />
              New Report
            </Button>
          </Link>
        </div>
      </div>

      <ReportsBrowser reports={reportList.map(r => ({
        ...r,
        summary: (r.ai_output as { executiveSummary?: string } | null)?.executiveSummary || null,
      }))} />

      {/* Roadmap teaser */}
      <div className="rounded-2xl border border-dashed border-border/60 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">On our roadmap</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { icon: CalendarClock, label: 'Scheduled & recurring reports' },
            { icon: FileSpreadsheet, label: 'Excel & CSV auto-import' },
            { icon: Bell, label: 'Email & WhatsApp digests' },
            { icon: Languages, label: 'Multilingual output (Amharic)' },
          ].map((f) => (
            <Badge key={f.label} variant="outline" className="rounded-full px-3 py-1.5 text-xs font-normal text-muted-foreground bg-background">
              <f.icon size={12} className="mr-1.5" />
              {f.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
