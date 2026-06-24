'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Check, Sparkles, Users, Building2, Crown, ArrowLeft } from 'lucide-react'
import { ChapaCheckout } from '@/components/chapa-checkout'

const industries = ['Retail', 'Import/Export', 'Construction', 'Healthcare', 'Education', 'NGO', 'Restaurant', 'Technology', 'Other']
const sizes = ['1-5 people', '6-20 people', '21-50 people', '50+ people']
const reportTypes = [
  { value: 'weekly-sales', label: 'Weekly Sales Report', desc: 'Track weekly revenue and transaction trends' },
  { value: 'monthly-finance', label: 'Monthly Finance Summary', desc: 'Comprehensive monthly financial overview' },
  { value: 'team-performance', label: 'Team Performance Report', desc: 'Evaluate team productivity and goals' },
  { value: 'custom', label: 'Custom Report', desc: 'Build a tailored report for your needs' },
]

const plans = [
  {
    id: 'free', name: 'Free', price: 0, icon: Sparkles,
    desc: 'Get started with basic reports',
    features: ['3 reports per month', 'Basic AI analysis', 'Share via link'],
  },
  {
    id: 'basic', name: 'Basic', price: 150, icon: Building2,
    desc: 'For growing businesses',
    features: ['10 reports per month', 'Advanced AI analysis', 'PDF download', 'Up to 3 team members'],
    popular: true,
  },
  {
    id: 'pro', name: 'Pro', price: 350, icon: Users,
    desc: 'For established teams',
    features: ['Unlimited reports', 'Advanced AI analysis', 'PDF download', 'Up to 10 team members', 'Priority support'],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 560, icon: Crown,
    desc: 'For large organizations',
    features: ['Unlimited reports', 'Custom report branding', 'Unlimited team members', 'Dedicated support', 'API access'],
  },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const router = useRouter()
  function getSupabase() { return createClient() }
  const [formData, setFormData] = useState({
    fullName: '',
    jobTitle: '',
    companyName: '',
    industry: '',
    companySize: '',
    reportType: '',
    selectedPlan: 'free',
  })
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [pendingInvite, setPendingInvite] = useState<{id: string, company_id: string, role: string, company_name?: string} | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    async function checkInvite() {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setInitialLoad(false)
        return
      }
      const { data: invite } = await supabase
        .from('invites')
        .select('*, companies(name)')
        .eq('email', user.email)
        .eq('accepted', false)
        .single()
      
      if (invite) {
        setPendingInvite({
          ...invite,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          company_name: (invite.companies as any)?.name || 'a workspace'
        })
      }
      setInitialLoad(false)
    }
    checkInvite()
  }, [])

  async function handleAcceptInvite() {
    if (!pendingInvite) return
    setLoading(true)
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('profiles').update({
        company_id: pendingInvite.company_id,
        role: pendingInvite.role,
        onboarding_completed: true,
      }).eq('id', user.id)
      
      await supabase.from('invites').update({
        accepted: true
      }).eq('id', pendingInvite.id)
      
      toast.success('Joined workspace successfully!')
      router.push('/dashboard')
    }
  }

  function updateField(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function saveCompanyAndProfile(plan: string) {
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: company, error: companyError } = await getSupabase()
      .from('companies')
      .insert({
        name: formData.companyName,
        industry: formData.industry,
        size: formData.companySize,
        owner_id: user.id,
        plan: plan === 'free' ? 'free' : 'pending',
        reports_used_this_month: 0,
      })
      .select()
      .single()

    if (companyError) throw companyError
    setCreatedCompanyId(company.id)

    const { error: profileError } = await getSupabase()
      .from('profiles')
      .update({
        full_name: formData.fullName,
        job_title: formData.jobTitle,
        company_id: company.id,
        onboarding_completed: true,
        role: 'owner',
      })
      .eq('id', user.id)

    if (profileError) throw profileError

    setUserEmail(user.email || '')

    return { user, company }
  }

  async function handleSelectFree() {
    setLoading(true)
    try {
      await saveCompanyAndProfile('free')
      toast.success('Setup complete!')
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handlePaidPlanSelected() {
    setLoading(true)
    try {
      await saveCompanyAndProfile(formData.selectedPlan)
      setShowPayment(true)
      setLoading(false)
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error.message || 'Something went wrong')
      setLoading(false)
    }
  }

  function handlePaymentSuccess() {
    toast.success('Payment successful! Welcome aboard.')
    router.push('/dashboard')
  }

  const selectedPlanData = plans.find(p => p.id === formData.selectedPlan)

  if (initialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface/30">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  if (pendingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-surface/30">
        <Card className="w-full max-w-sm p-8 border-border text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Users size={28} className="text-primary" />
          </div>
          <h1 className="text-xl font-medium mb-2">You&apos;ve been invited!</h1>
          <p className="text-sm text-muted-foreground mb-8">
            You have been invited to join <strong>{pendingInvite.company_name}</strong> as a {pendingInvite.role}.
          </p>
          <Button className="w-full" onClick={handleAcceptInvite} disabled={loading}>
            {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
            Accept & Join Workspace
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-surface/30 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} />
        Back to home
      </Link>
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1 mb-4">
            <span className="text-2xl font-bold">Tigil</span>
            <span className="text-sm text-muted-foreground">Reports</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Let&apos;s get you started in a few steps</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                s <= step ? 'bg-foreground text-background' : 'bg-border text-muted-foreground'
              }`}>
                {s < step ? <Check size={15} /> : s}
              </div>
              {s < 4 && <div className={`w-10 h-0.5 ${s < step ? 'bg-foreground' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <Card className="p-8 md:p-10 border-border/60 shadow-sm">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold tracking-tight">Tell us about yourself</h2>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="Abebe Kebede"
                  required
                  className="h-12 text-base bg-background border-border focus:border-foreground/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-sm font-medium">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => updateField('jobTitle', e.target.value)}
                  placeholder="Business Owner"
                  className="h-12 text-base bg-background border-border focus:border-foreground/40"
                />
              </div>
              <Button
                className="w-full h-12 text-base rounded-full"
                onClick={() => setStep(2)}
                disabled={!formData.fullName}
              >
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold tracking-tight">About your company</h2>
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="My Business PLC"
                  required
                  className="h-12 text-base bg-background border-border focus:border-foreground/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Industry</Label>
                <Select value={formData.industry} onValueChange={(v) => { if (v) updateField('industry', v); }}>
                  <SelectTrigger className="h-12 text-base bg-background border-border focus:border-foreground/40"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Company Size</Label>
                <Select value={formData.companySize} onValueChange={(v) => { if (v) updateField('companySize', v); }}>
                  <SelectTrigger className="h-12 text-base bg-background border-border focus:border-foreground/40"><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {sizes.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 text-base rounded-full">Back</Button>
                <Button className="flex-1 h-12 text-base rounded-full" onClick={() => setStep(3)} disabled={!formData.companyName}>Next</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold tracking-tight">What will you report on?</h2>
              <p className="text-sm text-muted-foreground">Choose your primary report type</p>
              <div className="space-y-3">
                {reportTypes.map((rt) => (
                  <button
                    key={rt.value}
                    onClick={() => { updateField('reportType', rt.value); setStep(4) }}
                    className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
                      formData.reportType === rt.value
                        ? 'border-foreground bg-foreground/5'
                        : 'border-border hover:border-foreground/30'
                    }`}
                  >
                    <div className="font-medium text-base">{rt.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{rt.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 text-base rounded-full">Back</Button>
              </div>
            </div>
          )}

          {step === 4 && !showPayment && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold tracking-tight">Choose your plan</h2>
              <p className="text-sm text-muted-foreground">Pick the plan that fits your business</p>

              <div className="space-y-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => updateField('selectedPlan', plan.id)}
                    className={`w-full text-left p-5 rounded-xl border transition-all duration-200 relative ${
                      formData.selectedPlan === plan.id
                        ? 'border-foreground bg-foreground/5'
                        : 'border-border hover:border-foreground/30'
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-2.5 right-4 bg-foreground text-background text-[10px]">
                        Most Popular
                      </Badge>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <plan.icon size={16} className="text-muted-foreground" />
                          <span className="font-medium text-base">{plan.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{plan.desc}</div>
                      </div>
                      <div className="text-right">
                        {plan.price === 0 ? (
                          <span className="text-xl font-light">Free</span>
                        ) : (
                          <>
                            <span className="text-xl font-light">ETB {plan.price}</span>
                            <span className="text-xs text-muted-foreground">/mo</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                      {plan.features.map((f) => (
                        <span key={f} className="text-sm text-muted-foreground flex items-center gap-1">
                          <Check size={11} className="text-green-500" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-12 text-base rounded-full">Back</Button>
                {formData.selectedPlan === 'free' ? (
                  <Button className="flex-1 h-12 text-base rounded-full" onClick={handleSelectFree} disabled={loading}>
                    {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                    Start for free
                  </Button>
                ) : (
                  <Button className="flex-1 h-12 text-base rounded-full" onClick={handlePaidPlanSelected} disabled={loading}>
                    {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                    Continue to payment
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 4 && showPayment && selectedPlanData && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto">
                <selectedPlanData.icon size={28} className="text-foreground/70" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Complete your payment</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You&apos;re subscribing to the <strong>{selectedPlanData.name}</strong> plan
                </p>
                <div className="text-3xl font-light mt-4">
                  ETB {selectedPlanData.price}
                  <span className="text-sm text-muted-foreground font-normal">/mo</span>
                </div>
              </div>
              <div className="space-y-3">
                <ChapaCheckout
                  amount={selectedPlanData.price}
                  email={userEmail}
                  companyId={createdCompanyId || ''}
                  firstName={formData.fullName.split(' ')[0]}
                  lastName={formData.fullName.split(' ').slice(1).join(' ') || 'User'}
                  planName={selectedPlanData.name}
                  onSuccess={handlePaymentSuccess}
                  onFailure={(err) => {
                    toast.error(err)
                    setShowPayment(false)
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPayment(false)}
                  className="text-muted-foreground"
                >
                  Choose a different plan
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
