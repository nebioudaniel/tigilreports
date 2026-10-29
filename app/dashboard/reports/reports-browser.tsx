'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Trash2, FileText, TrendingUp, BarChart3, Users, Link2, Check, FileInput } from 'lucide-react'
import { toast } from 'sonner'

interface ReportItem {
  id: string
  title: string
  type: string
  created_at: string
  summary: string | null
}

const typeMeta: Record<string, { label: string; icon: typeof FileText }> = {
  'weekly-sales': { label: 'Sales', icon: TrendingUp },
  'monthly-finance': { label: 'Finance', icon: BarChart3 },
  'team-performance': { label: 'Team', icon: Users },
  'custom': { label: 'Custom', icon: FileText },
  'form-analysis': { label: 'Form AI', icon: FileInput },
}

const typeFilters = [
  { value: 'all', label: 'All' },
  { value: 'weekly-sales', label: 'Sales' },
  { value: 'monthly-finance', label: 'Finance' },
  { value: 'team-performance', label: 'Team' },
  { value: 'custom', label: 'Custom' },
  { value: 'form-analysis', label: 'Form AI' },
]

export function ReportsBrowser({ reports }: { reports: ReportItem[] }) {
  const [items, setItems] = useState(reports)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(r => {
      const matchesSearch = !q || r.title?.toLowerCase().includes(q) || r.summary?.toLowerCase().includes(q)
      const matchesType = typeFilter === 'all' || r.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [items, search, typeFilter])

  async function handleDelete(id: string) {
    if (!confirm('Delete this report permanently?')) return
    setDeleting(id)
    const { error } = await createClient().from('reports').delete().eq('id', id)
    setDeleting(null)
    if (error) {
      toast.error('Failed to delete report')
      return
    }
    setItems(prev => prev.filter(r => r.id !== id))
    toast.success('Report deleted')
  }

  async function handleCopyLink(id: string) {
    const url = `${window.location.origin}/dashboard/reports/${id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      toast.success('Link copied')
      setTimeout(() => setCopied(null), 1500)
    } catch {
      toast.error('Could not copy link')
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (items.length === 0) {
    return (
      <Card className="p-12 border-dashed border-border/60 shadow-none text-center">
        <div className="w-12 h-12 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mx-auto mb-4">
          <FileText size={20} className="text-muted-foreground/60" />
        </div>
        <h3 className="font-semibold mb-1">No reports yet</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
          Generate your first AI-powered report — it only takes your data and one prompt.
        </p>
        <Link href="/dashboard/create">
          <Button className="rounded-full px-6">Create your first report</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-full bg-surface border-border/60 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {typeFilters.map((f) => {
            const isActive = typeFilter === f.value
            const count = f.value === 'all' ? items.length : items.filter(r => r.type === f.value).length
            if (f.value !== 'all' && count === 0) return null
            return (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`shrink-0 px-4 h-9 rounded-full text-xs font-medium transition-all border ${
                  isActive
                    ? 'bg-foreground text-background border-foreground shadow-sm'
                    : 'bg-background text-muted-foreground border-border/60 hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 ${isActive ? 'text-background/60' : 'text-muted-foreground/50'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-10 border-border/50 shadow-none text-center">
          <h3 className="font-semibold mb-1">Nothing found</h3>
          <p className="text-sm text-muted-foreground">Try a different search term or filter.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((report) => {
            const meta = typeMeta[report.type] || typeMeta['custom']
            const Icon = meta.icon
            return (
              <Card key={report.id} className="group p-0 border-border/60 shadow-none hover:shadow-sm hover:border-foreground/25 transition-all overflow-hidden flex flex-col">
                <Link href={`/dashboard/reports/${report.id}`} className="block p-5 pb-4 hover:bg-transparent">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center">
                      <Icon size={16} className="text-foreground/60" />
                    </div>
                    <Badge variant="outline" className="text-[10px] rounded-full">{meta.label}</Badge>
                  </div>
                  <h4 className="font-semibold text-sm mb-1.5 line-clamp-1 group-hover:text-foreground">{report.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2rem]">
                    {report.summary || 'No summary available for this report.'}
                  </p>
                </Link>
                <div className="mt-auto flex items-center justify-between px-5 py-3 border-t border-border/40 bg-surface/50">
                  <span className="text-[10px] text-muted-foreground/70">{formatDate(report.created_at)}</span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopyLink(report.id)}
                    >
                      {copied === report.id ? <Check size={13} /> : <Link2 size={13} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(report.id)}
                    >
                      {deleting === report.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
