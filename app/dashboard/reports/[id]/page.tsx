import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Sparkles, CheckCircle, User, Building2 } from 'lucide-react'
import { ReportActions } from './report-actions'

const reportTypeLabels: Record<string, string> = {
  'weekly-sales': 'Weekly Sales',
  'monthly-finance': 'Monthly Finance',
  'team-performance': 'Team Performance',
  'custom': 'Custom',
  'form-analysis': 'Form AI Analysis',
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'up') return (
    <div className="w-6 h-6 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center">
      <TrendingUp size={12} className="text-foreground/70" />
    </div>
  )
  if (trend === 'down') return (
    <div className="w-6 h-6 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center">
      <TrendingDown size={12} className="text-foreground/70" />
    </div>
  )
  return (
    <div className="w-6 h-6 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center">
      <Minus size={12} className="text-muted-foreground/50" />
    </div>
  )
}

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: report, error } = await supabase
    .from('reports')
    .select('*, companies(name)')
    .eq('id', id)
    .single()

  if (error || !report) notFound()

  const aiOutput = report.ai_output as {
    executiveSummary?: string
    keyMetrics?: { label: string; value: string; trend: string; description: string }[]
    detailedAnalysis?: string
    trendsAndInsights?: string[]
    recommendations?: string[]
  } | null

  const companyName = (report.companies as { name?: string })?.name || 'Company'
  const dateFrom = new Date(report.date_from || report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const dateTo = new Date(report.date_to || report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto space-y-0 print:space-y-6">
      {/* Toolbar */}
      <div className="sticky top-16 z-20 bg-background/80 backdrop-blur-md border-b border-border/50 -mx-6 md:-mx-8 px-6 md:px-8 py-3 flex items-center justify-between print:static print:bg-transparent print:border-0">
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest rounded-full hidden sm:inline-flex">
          {reportTypeLabels[report.type as string] || report.type}
        </Badge>
        <ReportActions reportId={report.id} />
      </div>

      {/* Document */}
      <article className="py-10">
        {/* Document header */}
        <header className="text-center max-w-2xl mx-auto mb-12 print:mb-10">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mb-6">
            <span className="flex items-center gap-1.5"><Building2 size={13} />{companyName}</span>
            <span className="flex items-center gap-1.5"><User size={13} />Tigil Reports</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-4">{report.title}</h1>
          <p className="text-sm text-muted-foreground print:hidden">{dateFrom} — {dateTo}</p>
        </header>

        {/* Executive summary */}
        {aiOutput?.executiveSummary && (
          <Card className="border-border/50 shadow-none mb-10 rounded-2xl overflow-hidden print:break-inside-avoid">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-medium">
                <Sparkles size={13} /> Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-base leading-relaxed text-foreground/90">{aiOutput.executiveSummary}</p>
            </CardContent>
          </Card>
        )}

        {/* Key metrics */}
        {aiOutput?.keyMetrics && aiOutput.keyMetrics.length > 0 && (
          <section className="mb-10 print:break-inside-avoid">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Key Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {aiOutput.keyMetrics.map((metric, i) => (
                <Card key={i} className="p-4 border-border/50 shadow-none hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-muted-foreground font-medium">{metric.label}</span>
                    <TrendIcon trend={metric.trend} />
                  </div>
                  <div className="text-xl font-bold tracking-tight">{metric.value}</div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{metric.description}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Detailed analysis */}
        {aiOutput?.detailedAnalysis && (
          <section className="mb-10">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Detailed Analysis</h2>
            <div className="text-sm leading-relaxed space-y-4 text-foreground/85 prose-sm max-w-none">
              {aiOutput.detailedAnalysis.split('\n\n').map((para, i) => (
                <p key={i} className="print:break-inside-avoid">{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* Trends & insights */}
        {aiOutput?.trendsAndInsights && aiOutput.trendsAndInsights.length > 0 && (
          <section className="mb-10 print:break-inside-avoid">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Trends & Insights</h2>
            <ul className="divide-y divide-border/40 border border-border/50 rounded-2xl overflow-hidden">
              {aiOutput.trendsAndInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-3 p-4 text-sm bg-background hover:bg-surface/50 transition-colors">
                  <CheckCircle size={15} className="text-foreground/60 mt-0.5 shrink-0" />
                  <span className="text-foreground/85 leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recommendations */}
        {aiOutput?.recommendations && aiOutput.recommendations.length > 0 && (
          <section className="print:break-inside-avoid">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">Recommendations</h2>
            <div className="space-y-3">
              {aiOutput.recommendations.map((rec, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/50 flex items-start gap-4 hover:border-foreground/25 transition-colors">
                  <span className="w-6 h-6 rounded-full bg-foreground text-background text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground/85 leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Document footer */}
        <footer className="mt-14 pt-6 border-t border-border/40 text-center print:mt-10">
          <p className="text-[11px] text-muted-foreground">
            Generated by <span className="font-semibold text-foreground/70">Tigil Reports</span> · {companyName} · {dateTo}
          </p>
        </footer>
      </article>
    </div>
  )
}
