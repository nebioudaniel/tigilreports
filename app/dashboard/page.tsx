import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Users, Share2, Calendar, ArrowUpRight, BarChart3, TrendingUp } from 'lucide-react'

const reportTypeLabels: Record<string, string> = {
  'weekly-sales': 'Weekly Sales',
  'monthly-finance': 'Monthly Finance',
  'team-performance': 'Team Performance',
  'custom': 'Custom',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_id, companies(name)')
    .eq('id', user.id)
    .single()

  const companyName = (profile as { companies?: { name?: string } })?.companies as { name?: string } | null
  const firstName = (profile as { full_name?: string })?.full_name?.split(' ')[0] || 'there'
  const companyId = (profile as { company_id?: string })?.company_id

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  let totalReports = 0
  let thisMonthReports = 0
  let teamMembers = 0
  let sharedReports = 0
  let recentReports: unknown[] = []

  if (companyId) {
    const [{ count: total }, { count: monthly }, { count: team }, { count: shared }, { data: recent }] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_public', true),
      supabase.from('reports').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
    ])
    totalReports = total || 0
    thisMonthReports = monthly || 0
    teamMembers = team || 1
    sharedReports = shared || 0
    recentReports = recent || []
  }

  const stats = [
    { label: 'Total Reports', value: totalReports, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'This Month', value: thisMonthReports, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Team Members', value: teamMembers, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Reports Shared', value: sharedReports, icon: Share2, color: 'text-primary', bg: 'bg-primary/10' },
  ]

  const quickActions = [
    { label: 'Weekly Sales', type: 'weekly-sales', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Monthly Finance', type: 'monthly-finance', icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Custom', type: 'custom', icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-light">{greeting}, {firstName}</h2>
        <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with {companyName?.name as string || 'your company'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 border-border/50 shadow-none hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
            </div>
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Recent reports</h3>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-sm">
                View all <ArrowUpRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <Card className="p-8 border-border/50 shadow-none text-center">
              <FileText size={32} className="mx-auto mb-3 text-muted-foreground/50" />
              <h4 className="font-medium mb-1">No reports yet</h4>
              <p className="text-sm text-muted-foreground mb-4">Create your first report to get started</p>
              <Link href="/create">
                <Button size="sm" className="rounded-lg">Create your first report</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {(recentReports as { id: string; title: string; type: string; created_at: string }[]).map((r) => (
                <Link key={r.id} href={`/reports/${r.id}`}>
                  <Card className="p-4 border-border/50 shadow-none hover:border-primary/50 transition-colors flex items-center justify-between group">
                    <div>
                      <div className="font-medium text-sm group-hover:text-primary transition-colors">{r.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {reportTypeLabels[r.type] || r.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <ArrowUpRight size={16} />
                    </Button>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Quick actions</h3>
          <Card className="p-5 border-border/50 shadow-none space-y-3">
            <h4 className="text-sm font-medium">Create a new report</h4>
            {quickActions.map((qa) => (
              <Link key={qa.type} href={`/create?type=${qa.type}`}>
                <Button variant="outline" className="w-full justify-start rounded-lg hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors gap-3">
                  <span className={`w-6 h-6 rounded-md ${qa.bg} flex items-center justify-center shrink-0`}>
                    <qa.icon size={13} className={qa.color} />
                  </span>
                  {qa.label}
                </Button>
              </Link>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
