import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Users, Calendar, TrendingUp, ArrowUpRight, UserPlus, Plus, Wand2, FileInput } from 'lucide-react'

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
  let recentReports: unknown[] = []

  if (companyId) {
    const [{ count: total }, { count: monthly }, { count: team }, { data: recent }] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('reports').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
    ])
    totalReports = total || 0
    thisMonthReports = monthly || 0
    teamMembers = team || 0
    recentReports = recent || []
  }

  const stats = [
    { label: 'Total reports', value: totalReports, icon: FileText },
    { label: 'This month', value: thisMonthReports, icon: Calendar },
    { label: 'Staff members', value: teamMembers, icon: Users },
    { label: 'AI generations', value: thisMonthReports * 2, icon: TrendingUp },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.14_0_0/0.04),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.9_0_0/0.07),transparent)]" />
        <div className="relative px-6 md:px-10 py-8">
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest rounded-full mb-3">
            {companyName?.name as string || 'Your workspace'}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{greeting}, {firstName}</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg">
            Build your team, feed in your data, and let AI turn it into professional reports. Here&apos;s what&apos;s happening today.
          </p>
          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <Link href="/dashboard/create">
              <Button className="rounded-full h-10 px-6 shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow">
                <Plus size={15} className="mr-2" />
                New Report
              </Button>
            </Link>
            <Link href="/dashboard/team">
              <Button variant="outline" className="rounded-full h-10 px-6 bg-background">
                <UserPlus size={15} className="mr-2" />
                Add Staff
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 border-border/50 shadow-none hover:shadow-sm transition-shadow">
            <div className="w-9 h-9 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mb-3">
              <s.icon size={15} className="text-foreground/60" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent reports */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold tracking-tight">Recent reports</h3>
            <Link href="/dashboard/reports">
              <Button variant="ghost" size="sm" className="rounded-full text-xs">
                View all <ArrowUpRight size={13} className="ml-1" />
              </Button>
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <Card className="p-10 border-dashed border-border/60 shadow-none text-center">
              <div className="w-12 h-12 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mx-auto mb-4">
                <FileText size={20} className="text-muted-foreground/60" />
              </div>
              <h4 className="font-semibold mb-1">No reports yet</h4>
              <p className="text-sm text-muted-foreground mb-5">Generate your first AI-powered report in minutes.</p>
              <Link href="/dashboard/create">
                <Button className="rounded-full px-6">Create your first report</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {(recentReports as { id: string; title: string; type: string; created_at: string }[]).map((r) => (
                <Link key={r.id} href={`/dashboard/reports/${r.id}`}>
                  <Card className="p-4 border-border/50 shadow-none hover:border-foreground/30 transition-colors flex items-center justify-between group rounded-xl">
                    <div>
                      <div className="font-medium text-sm group-hover:text-foreground">{r.title}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px] rounded-full">
                          {reportTypeLabels[r.type] || r.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full h-7 w-7">
                      <ArrowUpRight size={15} />
                    </Button>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

          {/* Quick actions */}
          <div>
            <h3 className="text-base font-semibold tracking-tight mb-4">Quick actions</h3>
            <Card className="p-5 border-border/50 shadow-none space-y-3">
              <h4 className="text-sm font-medium">Generate from your forms</h4>
              <Link href="/dashboard/create">
                <Button className="w-full justify-start rounded-full gap-3 shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow">
                  <span className="w-6 h-6 rounded-full bg-background/20 flex items-center justify-center shrink-0">
                    <Wand2 size={12} />
                  </span>
                  Analyze form responses with AI
                </Button>
              </Link>
              <Link href="/dashboard/forms">
                <Button variant="outline" className="w-full justify-start rounded-full hover:border-foreground/40 hover:bg-foreground/5 transition-colors gap-3 bg-background">
                  <span className="w-6 h-6 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center shrink-0">
                    <FileInput size={12} className="text-foreground/60" />
                  </span>
                  Create a custom form
                </Button>
              </Link>
            </Card>

          {/* Staff CTA card */}
          <Card className="p-5 mt-4 border-border/50 shadow-none bg-surface">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-2">
                {['A', 'B', 'C'].map((c) => (
                  <div key={c} className="w-6 h-6 rounded-full bg-foreground/10 border border-background flex items-center justify-center text-[9px] font-semibold text-foreground/60">
                    {c}
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{teamMembers} on your team</span>
            </div>
            <h4 className="text-sm font-semibold">Build your staff team</h4>
            <p className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">
              Add staff so they can create and share reports with you.
            </p>
            <Link href="/dashboard/team">
              <Button variant="outline" size="sm" className="rounded-full text-xs bg-background">
                <UserPlus size={13} className="mr-1.5" />
                Add Staff
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
