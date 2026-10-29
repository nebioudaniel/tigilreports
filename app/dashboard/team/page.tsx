'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Loader2, UserPlus, Mail, MoreHorizontal, UserX, Shield, Clock, Search, Users, Send, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface Member {
  id: string
  full_name?: string
  job_title?: string
  role: string
  email?: string
  created_at: string
}

interface Invite {
  id: string
  email: string
  role: string
  full_name?: string
  job_title?: string
  created_at: string
}

const roleMeta: Record<string, { label: string; desc: string }> = {
  owner: { label: 'Owner', desc: 'Full access to everything' },
  member: { label: 'Member', desc: 'Can view and create reports' },
  viewer: { label: 'Viewer', desc: 'Can only view reports' },
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [form, setForm] = useState({ fullName: '', jobTitle: '', email: '', role: 'member' })

  function getSupabase() { return createClient() }

  async function loadTeam() {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    const p = profile as { company_id?: string; role?: string } | null
    if (!p?.company_id) {
      setLoading(false)
      return
    }

    setCompanyId(p.company_id)
    setUserRole(p.role || 'member')

    const [{ data: m }, { data: i }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, job_title, role, email, created_at')
        .eq('company_id', p.company_id)
        .order('created_at', { ascending: true }),
      supabase
        .from('invites')
        .select('id, email, role, full_name, job_title, created_at')
        .eq('company_id', p.company_id)
        .eq('accepted', false)
        .order('created_at', { ascending: false }),
    ])

    setMembers((m as Member[]) || [])
    setInvites((i as Invite[]) || [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(() => loadTeam(), 0) }, [])

  async function handleAddStaff() {
    if (!form.email.trim() || !companyId) return
    setSending(true)
    try {
      const { error } = await getSupabase().from('invites').insert({
        email: form.email.trim().toLowerCase(),
        company_id: companyId,
        role: form.role,
        full_name: form.fullName.trim() || null,
        job_title: form.jobTitle.trim() || null,
        invited_by: userId,
        accepted: false,
      })
      if (error) {
        if (error.code === '23505') throw new Error('An invite for this email already exists.')
        throw error
      }
      toast.success(`${form.fullName.trim() || form.email.trim()} invited to the team!`)
      setAddOpen(false)
      setForm({ fullName: '', jobTitle: '', email: '', role: 'member' })
      loadTeam()
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'Failed to add staff member')
    } finally {
      setSending(false)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this staff member from the workspace?')) return
    setActionLoading(memberId)
    try {
      const { error } = await getSupabase()
        .from('profiles')
        .update({ company_id: null })
        .eq('id', memberId)
      if (error) throw error
      toast.success('Staff member removed')
      loadTeam()
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'Failed to remove member')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setActionLoading(inviteId)
    try {
      const { error } = await getSupabase()
        .from('invites')
        .delete()
        .eq('id', inviteId)
      if (error) throw error
      toast.success('Invitation cancelled')
      loadTeam()
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'Failed to cancel invitation')
    } finally {
      setActionLoading(null)
    }
  }

  function getInitials(name?: string, email?: string) {
    const s = name || email || '?'
    return s.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isOwner = userRole === 'owner'

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter(m => {
      const matchesSearch = !q ||
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.job_title?.toLowerCase().includes(q)
      const matchesRole = roleFilter === 'all' || m.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [members, search, roleFilter])

  const owners = members.filter(m => m.role === 'owner').length
  const stats = [
    { label: 'Staff members', value: members.length, icon: Users },
    { label: 'Pending invites', value: invites.length, icon: Send },
    { label: 'Owners', value: owners, icon: Shield },
  ]

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
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest rounded-full">Team</Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Staff management</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Add the people who run your business. Staff can create reports, share insights, and keep everything in sync.
            </p>
          </div>
          {isOwner && (
            <Button onClick={() => setAddOpen(true)} className="shrink-0 rounded-full px-6 h-10 shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow">
              <UserPlus size={16} className="mr-2" />
              Add Staff
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 border-border/50 shadow-none">
            <div className="w-9 h-9 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mb-3">
              <s.icon size={15} className="text-foreground/60" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-full bg-surface border-border/60 text-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { if (v) setRoleFilter(v) }}>
          <SelectTrigger className="w-36 h-10 rounded-full bg-surface border-border/60 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Staff Cards */}
      {filteredMembers.length === 0 ? (
        <Card className="p-12 border-border/50 shadow-none text-center">
          <div className="w-12 h-12 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mx-auto mb-4">
            <Users size={20} className="text-muted-foreground/60" />
          </div>
          <h3 className="font-semibold mb-1">
            {search || roleFilter !== 'all' ? 'No staff match your search' : 'No staff yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            {search || roleFilter !== 'all'
              ? 'Try clearing the search or switching roles.'
              : 'Add your first staff member to start collaborating on reports.'}
          </p>
          {isOwner && !search && roleFilter === 'all' && (
            <Button onClick={() => setAddOpen(true)} className="rounded-full px-6">
              <UserPlus size={15} className="mr-2" />
              Add your first staff member
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="p-5 border-border/60 shadow-none hover:shadow-sm hover:border-border transition-all group">
              <div className="flex items-start justify-between mb-4">
                <Avatar className="h-11 w-11 border border-border/50">
                  <AvatarFallback className="bg-foreground/5 text-foreground text-xs font-semibold">
                    {getInitials(member.full_name, member.email)}
                  </AvatarFallback>
                </Avatar>
                {member.id !== userId && isOwner ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 h-7 w-7 transition-colors">
                      {actionLoading === member.id ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={15} />}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <DropdownMenuItem
                        onClick={() => handleRemove(member.id)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg text-xs"
                      >
                        <UserX size={13} className="mr-2" />
                        Remove from workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  member.id === userId && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 rounded-full font-normal">You</Badge>
                  )
                )}
              </div>
              <div className="font-semibold text-sm truncate">{member.full_name || 'Unnamed'}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{member.job_title || member.email || 'No email'}</div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  <Shield size={12} className={member.role === 'owner' ? 'text-foreground' : 'text-muted-foreground/40'} />
                  <span className="text-[11px] capitalize text-muted-foreground">{roleMeta[member.role]?.label || member.role}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/60">{formatDate(member.created_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-tight">
              Pending invitations
              <span className="ml-2 text-xs font-normal text-muted-foreground">{invites.length} awaiting response</span>
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {invites.map((invite) => (
              <Card key={invite.id} className="p-5 border-dashed border-border/60 shadow-none">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-full bg-muted/50 flex items-center justify-center border border-border/50">
                    <Mail size={16} className="text-muted-foreground" />
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvite(invite.id)}
                      disabled={actionLoading === invite.id}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 text-[11px] rounded-full"
                    >
                      {actionLoading === invite.id ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                      Revoke
                    </Button>
                  )}
                </div>
                <div className="font-semibold text-sm truncate">{invite.full_name || invite.email}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{invite.email}</div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                  <span className="text-[11px] capitalize text-muted-foreground">{roleMeta[invite.role]?.label || invite.role}</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <Clock size={10} />
                    Sent {formatDate(invite.created_at)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/60 rounded-2xl">
          <div className="p-6 pb-0">
            <div className="w-12 h-12 rounded-full bg-foreground/5 border border-border/50 flex items-center justify-center mb-4">
              <UserPlus size={20} className="text-foreground/70" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl tracking-tight">Add staff member</DialogTitle>
              <DialogDescription className="pt-2 text-sm leading-relaxed">
                They&apos;ll get an invitation to join your workspace. When they sign up, they&apos;ll appear here automatically.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff-name" className="text-[10px] uppercase tracking-widest text-muted-foreground">Full Name</Label>
                <Input
                  id="staff-name"
                  placeholder="Abebe Kebede"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-title" className="text-[10px] uppercase tracking-widest text-muted-foreground">Job Title</Label>
                <Input
                  id="staff-title"
                  placeholder="Sales Manager"
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email" className="text-[10px] uppercase tracking-widest text-muted-foreground">Email Address <span className="text-destructive">*</span></Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="colleague@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Workspace Role</Label>
              <Select value={form.role} onValueChange={(v) => { if (v) setForm({ ...form, role: v }) }}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleMeta).filter(([key]) => key !== 'owner').map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span className="font-medium">{meta.label}</span>
                        <span className="text-xs text-muted-foreground">{meta.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-6 pt-4 bg-surface/50 border-t border-border/50 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 size={12} />
              {isOwner ? 'Invitation sent instantly' : 'Owner access required'}
            </span>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setAddOpen(false)} className="rounded-full">
                Cancel
              </Button>
              <Button onClick={handleAddStaff} disabled={!form.email.trim() || sending} className="rounded-full px-6 shadow-lg shadow-black/10 hover:shadow-black/20 transition-shadow">
                {sending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Send size={13} className="mr-2" />}
                Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
