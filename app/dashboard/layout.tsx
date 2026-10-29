'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  LayoutDashboard, FileText, Plus, Users, Settings,
  Sun, Moon, LogOut, Menu, X, UserPlus, ClipboardList,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
      { icon: FileText, label: 'My Reports', href: '/dashboard/reports' },
    ],
  },
  {
    label: 'Build',
    items: [
      { icon: Plus, label: 'Create Report', href: '/dashboard/create' },
      { icon: ClipboardList, label: 'Forms', href: '/dashboard/forms' },
      { icon: UserPlus, label: 'Staff', href: '/dashboard/team' },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; name?: string; plan?: string }>({})
  const pathname = usePathname()
  const router = useRouter()
  function getSupabase() { return createClient() }
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTimeout(() => setMounted(true), 0)
    async function load() {
      const { data: { user: authUser } } = await getSupabase().auth.getUser()
      if (authUser) {
        const { data: profile } = await getSupabase()
          .from('profiles')
          .select('full_name, companies(plan, name)')
          .eq('id', authUser.id)
          .single()
        setUser({
          email: authUser.email,
          name: (profile as { full_name?: string })?.full_name || authUser.email,
          plan: ((profile as { companies?: { plan?: string } })?.companies as { plan?: string })?.plan || 'free',
        })
      }
    }
    load()
  }, [])

  async function handleLogout() {
    await getSupabase().auth.signOut()
    toast.success('Logged out')
    router.push('/login')
  }

  const navItems = navGroups.flatMap(g => g.items)
  const currentPage = navItems.find(
    item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  )?.label || 'Dashboard'

  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-surface border-r border-border/50 flex flex-col transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 h-[65px] flex items-center border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-1">
            <span className="text-lg font-bold text-foreground">Tigil</span>
            <span className="text-xs text-muted-foreground">Reports</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-foreground text-background font-medium shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                    }`}
                  >
                    <item.icon size={17} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs bg-foreground/5 text-foreground border border-border/50">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{user.plan} plan</div>
            </div>
            {mounted && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              </Button>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 mt-1 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 w-full transition-all duration-200"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-60">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
              <h1 className="text-base font-semibold tracking-tight">{currentPage}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="text-xs bg-foreground/5 text-foreground border border-border/50">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="p-6 md:p-8">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
