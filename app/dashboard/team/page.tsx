'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Plus, Mail, MoreHorizontal, UserX, Shield, Clock } from 'lucide-react'
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
  created_at: string
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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
    if (!p?.company_id) return

    setCompanyId(p.company_id)
    setUserRole(p.role || 'member')

    const { data: m } = await supabase
      .from('profiles')
      .select('id, full_name, job_title, role, email, created_at')
      .eq('company_id', p.company_id)
      .order('created_at', { ascending: true })

    setMembers((m as Member[]) || [])

    const { data: i } = await supabase
      .from('invites')
      .select('*')
      .eq('company_id', p.company_id)
      .eq('accepted', false)
      .order('created_at', { ascending: false })

    setInvites((i as Invite[]) || [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(() => loadTeam(), 0) }, [])

  async function handleInvite() {
    if (!inviteEmail.trim() || !companyId || !userId) return
    setSending(true)
    try {
      const { error } = await getSupabase().from('invites').insert({
        email: inviteEmail.trim(),
        company_id: companyId,
        role: inviteRole,
        invited_by: userId,
        accepted: false,
      })
      if (error) {
        if (error.code === '23505') throw new Error('An invite for this email already exists.')
        throw error
      }
      toast.success('Invitation sent!')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('member')
      loadTeam()
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return
    setActionLoading(memberId)
    try {
      const { error } = await getSupabase()
        .from('profiles')
        .update({ company_id: null })
        .eq('id', memberId)
      if (error) throw error
      toast.success('Member removed successfully')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Team Members</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who has access to your workspace reports and settings.
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setInviteOpen(true)} className="shrink-0 rounded-full px-6">
            <Plus size={16} className="mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Active Members Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-border/50">User</th>
                <th className="px-6 py-4 font-medium border-b border-border/50 hidden sm:table-cell">Role</th>
                <th className="px-6 py-4 font-medium border-b border-border/50 hidden md:table-cell">Joined</th>
                <th className="px-6 py-4 font-medium border-b border-border/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {members.map((member) => (
                <tr key={member.id} className="bg-background hover:bg-surface/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border/50">
                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-medium">
                          {getInitials(member.full_name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {member.full_name || 'Unnamed User'}
                          {member.id === userId && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">You</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{member.email || 'No email provided'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      {member.role === 'owner' ? <Shield size={14} className="text-primary" /> : <Shield size={14} className="text-muted-foreground/50" />}
                      <span className="capitalize font-medium">{member.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                    {formatDate(member.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {member.id !== userId && isOwner ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-muted-foreground">
                          {actionLoading === member.id ? <Loader2 size={14} className="animate-spin" /> : <MoreHorizontal size={16} />}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={() => handleRemove(member.id)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                          >
                            <UserX size={14} className="mr-2" />
                            Remove from workspace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending Invites Table */}
      {invites.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-medium tracking-tight">Pending Invitations</h3>
          <Card className="border-border/60 shadow-sm overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium border-b border-border/50">Email</th>
                    <th className="px-6 py-4 font-medium border-b border-border/50 hidden sm:table-cell">Role</th>
                    <th className="px-6 py-4 font-medium border-b border-border/50 hidden md:table-cell">Sent</th>
                    <th className="px-6 py-4 font-medium border-b border-border/50 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {invites.map((invite) => (
                    <tr key={invite.id} className="bg-background hover:bg-surface/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center border border-border/50">
                            <Mail size={16} className="text-muted-foreground" />
                          </div>
                          <div className="font-medium">{invite.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="capitalize font-medium text-muted-foreground">{invite.role}</span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-muted-foreground/70" />
                          {formatDate(invite.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isOwner && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleCancelInvite(invite.id)}
                            disabled={actionLoading === invite.id}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 text-xs font-medium"
                          >
                            {actionLoading === invite.id ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null}
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/60">
          <div className="p-6 pb-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail size={20} className="text-primary" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl">Invite to workspace</DialogTitle>
              <DialogDescription className="pt-2">
                Send an email invitation to a colleague to join your team. They will receive a link to sign up.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Workspace Role</Label>
              <Select value={inviteRole} onValueChange={(v) => { if (v) setInviteRole(v) }}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex flex-col">
                      <span className="font-medium">Member</span>
                      <span className="text-xs text-muted-foreground">Can view and create reports</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex flex-col">
                      <span className="font-medium">Viewer</span>
                      <span className="text-xs text-muted-foreground">Can only view reports</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="p-6 pt-4 bg-surface/30 border-t border-border/50 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setInviteOpen(false)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || sending} className="rounded-full px-6">
              {sending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
