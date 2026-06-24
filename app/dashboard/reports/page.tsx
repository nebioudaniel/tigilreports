import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, ArrowUpRight, Trash2 } from 'lucide-react'

const reportTypeLabels: Record<string, string> = {
  'weekly-sales': 'Sales',
  'monthly-finance': 'Finance',
  'team-performance': 'Team',
  'custom': 'Custom',
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = (profile as { company_id?: string })?.company_id
  if (!companyId) redirect('/onboarding')

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light">My Reports</h2>
        <Link href="/dashboard/create">
          <Button size="sm" className="rounded-full">
            <Plus size={16} className="mr-1" /> Create Report
          </Button>
        </Link>
      </div>

      {(!reports || reports.length === 0) ? (
        <Card className="p-12 border-border text-center">
          <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium mb-2">No reports yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Create your first AI-powered report</p>
          <Link href="/dashboard/create">
            <Button className="rounded-full">
              <Plus size={16} className="mr-1" /> Create your first report
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(reports as { id: string; title: string; type: string; created_at: string; ai_output: unknown; is_public: boolean }[]).map((report) => {
            const output = report.ai_output as { executiveSummary?: string } | null
            const initials = report.title.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            return (
              <Card key={report.id} className="p-5 border-border hover:border-foreground/30 transition-all duration-200 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-sm font-medium">
                    {initials}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {reportTypeLabels[report.type] || report.type}
                  </Badge>
                </div>
                <h4 className="font-medium text-sm mb-1 line-clamp-1">{report.title}</h4>
                {output?.executiveSummary && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{output.executiveSummary}</p>
                )}
                <div className="text-xs text-muted-foreground mb-4">
                  {new Date(report.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <Link href={`/dashboard/reports/${report.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-full text-xs">
                      View <ArrowUpRight size={12} className="ml-1" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Trash2 size={14} className="text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
