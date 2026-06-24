'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Check, Sparkles, Building2, Users, Crown } from 'lucide-react'
import { ChapaCheckout } from '@/components/chapa-checkout'

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
  },
  {
    id: 'pro', name: 'Pro', price: 350, icon: Users,
    desc: 'For established teams',
    features: ['Unlimited reports', 'Advanced AI analysis', 'PDF download', 'Up to 10 team members', 'Priority support'],
    popular: true,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 560, icon: Crown,
    desc: 'For large organizations',
    features: ['Unlimited reports', 'Custom report branding', 'Unlimited team members', 'Dedicated support', 'API access'],
  },
]

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<{
    full_name?: string
    job_title?: string
    email?: string
    initials: string
  }>({ initials: 'U' })
  const [company, setCompany] = useState<{
    id?: string
    name?: string
    industry?: string
    size?: string
    plan: string
    reports_used_this_month: number
  }>({ plan: 'free', reports_used_this_month: 0 })
  const [subscription, setSubscription] = useState<{ status?: string }>({})
  const [loading, setLoading] = useState(true)

  function getSupabase() { return createClient() }

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      const trigger = document.querySelector(`[value="${tab}"]`) as HTMLButtonElement
      trigger?.click()
    }
  }, [searchParams])

  const loadData = useCallback(async () => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: p, error } = await supabase
      .from('profiles')
      .select('*, companies(*, subscriptions(*))')
      .eq('id', user.id)
      .single()
      
    if (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load profile data')
    }

    const profileData = p as {
      full_name?: string
      job_title?: string
      companies?: { id: string; name: string; industry: string; size: string; plan: string; reports_used_this_month: number }
      subscriptions?: { status?: string }[]
    } | null

    const initials = (profileData?.full_name || user.email || 'U')
      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    const companyData = Array.isArray(profileData?.companies) ? profileData?.companies[0] : profileData?.companies
    const subscriptionData = companyData?.subscriptions?.[0]

    setProfile({
      full_name: profileData?.full_name,
      job_title: profileData?.job_title,
      email: user.email || '',
      initials,
    })
    setCompany({
      id: companyData?.id,
      name: companyData?.name,
      industry: companyData?.industry,
      size: companyData?.size,
      plan: companyData?.plan || 'free',
      reports_used_this_month: companyData?.reports_used_this_month || 0,
    })
    setSubscription(subscriptionData || {})
    setLoading(false)
  }, [router])

  useEffect(() => { setTimeout(() => loadData(), 0) }, [loadData])

  function handlePlanUpgraded() {
    toast.success('Plan upgraded!')
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  const currentPlanData = plans.find(p => p.id === company.plan)
  const paidPlans = plans.filter(p => p.id !== 'free')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
          <TabsTrigger value="company" className="flex-1">Company</TabsTrigger>
          <TabsTrigger value="billing" className="flex-1">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card className="p-6 border-border/50 shadow-none space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-foreground/10">{profile.initials}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" className="rounded-lg shadow-none">Upload photo</Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" defaultValue={profile.full_name || ''} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" defaultValue={profile.job_title || ''} placeholder="Business Owner" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile.email || ''} disabled className="opacity-60" />
            </div>
            <Button className="rounded-lg shadow-none">Save Changes</Button>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6 mt-6">
          <Card className="p-6 border-border/50 shadow-none space-y-5">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" defaultValue={company.name || ''} placeholder="My Business PLC" />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select defaultValue={company.industry || ''}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {industries.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select defaultValue={company.size || ''}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5 people">1-5 people</SelectItem>
                  <SelectItem value="6-20 people">6-20 people</SelectItem>
                  <SelectItem value="21-50 people">21-50 people</SelectItem>
                  <SelectItem value="50+ people">50+ people</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-foreground/30 transition-all duration-200">
                <p className="text-sm text-muted-foreground">Click to upload logo</p>
              </div>
            </div>
            <Button className="rounded-lg shadow-none">Save Changes</Button>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6 mt-6">
          <Card className="p-6 border-border/50 shadow-none">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Current Plan</h3>
                <div className="flex items-center gap-2 mt-1">
                  {currentPlanData && <currentPlanData.icon size={16} className="text-muted-foreground" />}
                  <p className="text-sm text-muted-foreground capitalize">{company.plan}</p>
                </div>
              </div>
              <Badge variant={company.plan === 'free' ? 'outline' : 'default'} className="capitalize">
                {subscription?.status || 'active'}
              </Badge>
            </div>
            {company.plan === 'free' && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{company.reports_used_this_month} of 3 reports used this month</span>
                  <span>{Math.round((company.reports_used_this_month / 3) * 100)}%</span>
                </div>
                <Progress value={(company.reports_used_this_month / 3) * 100} className="h-2" />
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {company.plan === 'free' ? 'Upgrade your plan' : 'Available plans'}
            </h3>
            {paidPlans.map((plan) => {
              const isCurrent = company.plan === plan.id
              return (
                <Card key={plan.id} className={`p-6 shadow-none relative transition-colors ${plan.popular ? 'border-foreground/30' : 'border-border/50 hover:border-foreground/20'}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-2.5 right-4 bg-foreground text-background text-[10px]">
                      Most Popular
                    </Badge>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <plan.icon size={18} className="text-muted-foreground" />
                        <h4 className="font-medium">{plan.name}</h4>
                      </div>
                      <div className="text-3xl font-light mt-2">
                        ETB {plan.price}<span className="text-sm text-muted-foreground font-normal">/mo</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                    {plan.features.map((f) => (
                      <span key={f} className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check size={10} className="text-green-500" />
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    {isCurrent ? (
                      <Badge variant="outline" className="rounded-lg px-4 py-1">Current Plan</Badge>
                    ) : (
                      <ChapaCheckout
                        amount={plan.price}
                        email={profile.email || ''}
                        firstName={(profile.full_name || 'User').split(' ')[0]}
                        lastName={(profile.full_name || 'User').split(' ').slice(1).join(' ') || 'User'}
                        companyId={company.id || ''}
                        planName={plan.name}
                        onSuccess={handlePlanUpgraded}
                        onFailure={(err) => toast.error(err)}
                      >
                        Upgrade to {plan.name}
                      </ChapaCheckout>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const industries = ['Retail', 'Import/Export', 'Construction', 'Healthcare', 'Education', 'NGO', 'Restaurant', 'Technology', 'Other']

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}
