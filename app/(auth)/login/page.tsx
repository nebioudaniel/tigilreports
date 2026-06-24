'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, FileText } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()

  function getSupabase() {
    return createClient()
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      toast.error(error.message)
      setGoogleLoading(false)
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    const { data: { user } } = await getSupabase().auth.getUser()
    if (user) {
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()
      if (profile?.onboarding_completed) {
        router.push('/dashboard')
      } else {
        router.push('/onboarding')
      }
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left panel — form */}
      <div className="flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-xl font-bold text-foreground">Tigil</span>
            <span className="text-xs text-muted-foreground font-normal">Reports</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back to home
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-8">Sign in to your account to continue.</p>

          <Button
            variant="outline"
            className="w-full mb-6"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-foreground underline underline-offset-4 hover:no-underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — decorative */}
      <div className="hidden md:flex flex-col items-center justify-center bg-muted/50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-foreground/5 flex items-center justify-center">
            <FileText size={36} className="text-foreground/20" />
          </div>
          <p className="text-sm text-muted-foreground/60 font-medium">AI-powered reports for Ethiopian businesses</p>
        </div>
      </div>
    </div>
  )
}
