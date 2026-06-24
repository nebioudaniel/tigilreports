'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  LayoutDashboard, FileText, Plus, Users, Settings,
  Sun, Moon, LogOut, Menu, X,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
  { icon: FileText, label: 'My Reports', href: '/dashboard/reports' },
  { icon: Plus, label: 'Create Report', href: '/dashboard/create' },
  { icon: Users, label: 'Team', href: '/dashboard/team' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
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

  const currentPage = navItems.find(
    item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  )?.label || 'Dashboard'

  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-surface border-r border-border/50 flex flex-col transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-1">
            <span className="text-lg font-bold text-primary">Tigil</span>
            <span className="text-xs text-muted-foreground">Reports</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{user.plan}</Badge>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 w-full transition-all duration-200"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-60">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/50">
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
              <h1 className="text-lg font-medium">{currentPage}</h1>
            </div>
            <div className="flex items-center gap-3">
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </Button>
              )}
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
