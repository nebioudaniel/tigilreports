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

export default function RegisterPage() {
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

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    toast.success('Account created! Check your email.')
    router.push('/onboarding')
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
          <h1 className="text-2xl font-bold tracking-tight mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-8">Get started with Tigil Reports in seconds.</p>

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
            Sign up with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              Create account
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-foreground underline underline-offset-4 hover:no-underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — animated visual */}
      <div className="hidden md:flex flex-col items-center justify-center bg-muted/50 relative overflow-hidden">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-12px) rotate(1deg); }
            66% { transform: translateY(6px) rotate(-1deg); }
          }
          @keyframes floatSlow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-16px) rotate(2deg); }
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.05); }
          }
          @keyframes drift {
            0% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(10px, -15px) scale(1.02); }
            50% { transform: translate(-5px, -25px) scale(0.98); }
            75% { transform: translate(-15px, -10px) scale(1.01); }
            100% { transform: translate(0, 0) scale(1); }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-float-slow { animation: floatSlow 8s ease-in-out infinite; }
          .animate-pulse-glow { animation: pulseGlow 4s ease-in-out infinite; }
          .animate-drift { animation: drift 12s ease-in-out infinite; }
          .animate-drift-2 { animation: drift 14s ease-in-out infinite reverse; }
        `}</style>

        {/* Background gradient orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-foreground/[0.02] blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-foreground/[0.015] blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
        </div>

        {/* Floating shapes */}
        <div className="relative flex flex-col items-center">
          {/* Central ring */}
          <div className="w-48 h-48 rounded-full border border-foreground/10 flex items-center justify-center animate-float-slow">
            <div className="w-32 h-32 rounded-full border border-foreground/10 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center shadow-sm">
                <FileText size={28} className="text-foreground/30" />
              </div>
            </div>
          </div>

          {/* Orbiting icons */}
          <div className="absolute w-10 h-10 rounded-xl bg-background border border-border shadow-sm flex items-center justify-center animate-drift" style={{ top: '-40px', left: '60px' }}>
            <svg className="w-5 h-5 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div className="absolute w-10 h-10 rounded-xl bg-background border border-border shadow-sm flex items-center justify-center animate-drift-2" style={{ bottom: '-30px', right: '50px' }}>
            <svg className="w-5 h-5 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m0-4.5v-4.5m0 4.5h3m-3 0h-1.5m4.5 0h1.5M3 12.75v.75m0-3v-3m0 3h1.5M3 12.75H1.5m4.5 0h4.5m-4.5 0v2.25" />
            </svg>
          </div>
          <div className="absolute w-10 h-10 rounded-xl bg-background border border-border shadow-sm flex items-center justify-center animate-drift" style={{ bottom: '-50px', left: '40px', animationDelay: '3s' }}>
            <svg className="w-5 h-5 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0a2.25 2.25 0 01-2.25-2.25V3" />
            </svg>
          </div>
          <div className="absolute w-10 h-10 rounded-xl bg-background border border-border shadow-sm flex items-center justify-center animate-drift-2" style={{ top: '-20px', right: '70px', animationDelay: '2s' }}>
            <svg className="w-5 h-5 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235.083.487.128.75.128h10.5c.263 0 .515-.045.75-.128M6 6.878a2.25 2.25 0 00-.878.46L3 9.75m15-2.872c.346.128.672.31.878.558L21 9.75M3 9.75l1.5 7.5A2.25 2.25 0 006.75 19.5h10.5a2.25 2.25 0 002.25-2.25l1.5-7.5M3 9.75h18" />
            </svg>
          </div>
        </div>

        <p className="absolute bottom-12 text-sm text-muted-foreground/40 font-medium tracking-wide">
          AI-powered reports for Ethiopian businesses
        </p>
      </div>
    </div>
  )
}
