import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check onboarding status and invites
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // 1. Check if they have an invite
        const { data: invite } = await supabase
          .from('invites')
          .select('*')
          .eq('email', user.email)
          .eq('accepted', false)
          .single()
          
        if (invite) {
          // Send to onboarding, which will handle the invite logic
          return NextResponse.redirect(`${origin}/onboarding`)
        }
        
        // 2. Check if they are already onboarded
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
          
        if (profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
