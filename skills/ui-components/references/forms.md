# Complex Forms, Wizards & Validation Reference

Production-grade form architectures combining React Hook Form, Zod schema validation, shadcn/ui components, Sonner notifications, and responsive 2-column card layouts.

---

## 1. Pattern 1: Complex 2-Column Settings Form

A comprehensive entity configuration form with multi-section card layouts, responsive 2-column grids, and complete input coverage.

```tsx
'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, User, Building, Bell, Shield } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// ==========================================
// 1. Zod Schema Definition
// ==========================================

export const organizationSettingsSchema = z.object({
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(50, 'Organization name cannot exceed 50 characters'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  contactEmail: z.string().email('Please enter a valid business email'),
  websiteUrl: z.string().url('Please enter a valid URL (e.g. https://example.com)').or(z.literal('')),
  description: z.string().max(300, 'Description cannot exceed 300 characters').optional(),
  billingCurrency: z.enum(['USD', 'EUR', 'BRL', 'GBP'], {
    required_error: 'Please select a default billing currency',
  }),
  environmentTier: z.enum(['development', 'staging', 'production']),
  twoFactorEnforced: z.boolean().default(false),
  publicDirectoryListed: z.boolean().default(true),
  emailNotifications: z.object({
    securityAlerts: z.boolean().default(true),
    monthlyInvoices: z.boolean().default(true),
    productUpdates: z.boolean().default(false),
  }),
})

export type OrganizationSettingsFormValues = z.infer<typeof organizationSettingsSchema>

const defaultValues: Partial<OrganizationSettingsFormValues> = {
  organizationName: 'Acme Technologies',
  slug: 'acme-tech',
  contactEmail: 'billing@acme.corp',
  websiteUrl: 'https://acme.corp',
  description: 'Enterprise AI workflows and automation tooling.',
  billingCurrency: 'USD',
  environmentTier: 'production',
  twoFactorEnforced: true,
  publicDirectoryListed: false,
  emailNotifications: {
    securityAlerts: true,
    monthlyInvoices: true,
    productUpdates: false,
  },
}

// ==========================================
// 2. Component Implementation
// ==========================================

export function OrganizationSettingsForm() {
  const [isSaving, setIsSaving] = React.useState(false)

  const form = useForm<OrganizationSettingsFormValues>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues,
    mode: 'onBlur',
  })

  const onSubmit = async (values: OrganizationSettingsFormValues) => {
    setIsSaving(true)
    const toastId = toast.loading('Saving organization settings...')

    try {
      // Simulate Server Action call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log('Saved payload:', values)
      toast.success('Settings saved successfully', { id: toastId })
    } catch (error) {
      toast.error('Failed to save settings. Please try again.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1: General Info */}
          <Card className="border-zinc-800 bg-zinc-900/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Building className="h-5 w-5" />
                <CardTitle className="text-base font-semibold text-zinc-100">
                  General Information
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Basic organization details and public workspace identity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-zinc-200">
                      Organization Name <span className="text-rose-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Corp"
                        {...field}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500/30"
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-rose-400" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-zinc-200">
                        Workspace Slug <span className="text-rose-400">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="acme-corp"
                          {...field}
                          className="border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-100 focus-visible:ring-indigo-500/30"
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-zinc-500">
                        Used in your workspace URL.
                      </FormDescription>
                      <FormMessage className="text-xs text-rose-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-zinc-200">
                        Billing Currency
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-200">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-200">
                          <SelectItem value="USD">USD ($ - US Dollar)</SelectItem>
                          <SelectItem value="EUR">EUR (€ - Euro)</SelectItem>
                          <SelectItem value="BRL">BRL (R$ - Real)</SelectItem>
                          <SelectItem value="GBP">GBP (£ - British Pound)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs text-rose-400" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-zinc-200">
                      Primary Contact Email <span className="text-rose-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@acme.corp"
                        {...field}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100 focus-visible:ring-indigo-500/30"
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-rose-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-zinc-200">
                      About Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Describe your company or project mission..."
                        {...field}
                        className="resize-none border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500/30"
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-rose-400" />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Card 2: Environment & Security Settings */}
          <Card className="border-zinc-800 bg-zinc-900/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Shield className="h-5 w-5" />
                <CardTitle className="text-base font-semibold text-zinc-100">
                  Security & Environment
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Control access policies, environment tier, and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Radio Group: Environment Tier */}
              <FormField
                control={form.control}
                name="environmentTier"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-zinc-200">
                      Deployment Environment
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-2"
                      >
                        {[
                          { id: 'development', label: 'Development' },
                          { id: 'staging', label: 'Staging' },
                          { id: 'production', label: 'Production' },
                        ].map((tier) => (
                          <FormItem
                            key={tier.id}
                            className={cn(
                              'flex items-center space-x-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 cursor-pointer transition-colors',
                              field.value === tier.id && 'border-indigo-500 bg-indigo-950/20'
                            )}
                          >
                            <FormControl>
                              <RadioGroupItem value={tier.id} />
                            </FormControl>
                            <FormLabel className="text-xs font-medium text-zinc-200 cursor-pointer">
                              {tier.label}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className="text-xs text-rose-400" />
                  </FormItem>
                )}
              />

              <Separator className="bg-zinc-800" />

              {/* Switches */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="twoFactorEnforced"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-medium text-zinc-200">
                          Enforce Two-Factor Authentication (2FA)
                        </FormLabel>
                        <FormDescription className="text-[11px] text-zinc-400">
                          Require all organization members to configure 2FA.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="publicDirectoryListed"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-medium text-zinc-200">
                          Public Workspace Directory
                        </FormLabel>
                        <FormDescription className="text-[11px] text-zinc-400">
                          Allow discovery in public team search results.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="bg-zinc-800" />

              {/* Notifications Checkboxes */}
              <div className="space-y-2.5">
                <FormLabel className="text-xs font-medium text-zinc-200">
                  Notification Subscriptions
                </FormLabel>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="emailNotifications.securityAlerts"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-zinc-700 data-[state=checked]:bg-indigo-600"
                          />
                        </FormControl>
                        <FormLabel className="text-xs text-zinc-300 font-normal cursor-pointer">
                          Critical security & vulnerability alerts (recommended)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emailNotifications.monthlyInvoices"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-zinc-700 data-[state=checked]:bg-indigo-600"
                          />
                        </FormControl>
                        <FormLabel className="text-xs text-zinc-300 font-normal cursor-pointer">
                          Monthly invoice summary and receipts
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            className="border-zinc-800 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Organization Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

---

## 2. Pattern 2: Multi-Step Wizard Form

A 3-step onboarding wizard with per-step Zod schema validation, progress indicator, and final asynchronous submission with Sonner toast feedback.

```tsx
'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Building,
  CreditCard,
  Users,
  Sparkles,
  Loader2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'

// ==========================================
// Wizard Schema & Step Definitions
// ==========================================

export const wizardSchema = z.object({
  // Step 1: Organization Basics
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
  adminEmail: z.string().email('Enter a valid business email'),
  // Step 2: Plan Selection
  planTier: z.enum(['starter', 'pro', 'enterprise']),
  seatsCount: z.coerce.number().min(1, 'Minimum 1 seat required').max(100),
  // Step 3: Team Invites
  inviteEmails: z.string().optional(),
})

export type WizardFormValues = z.infer<typeof wizardSchema>

const STEPS = [
  { id: 0, title: 'Workspace', icon: Building, fields: ['workspaceName', 'adminEmail'] as const },
  { id: 1, title: 'Plan & Tier', icon: CreditCard, fields: ['planTier', 'seatsCount'] as const },
  { id: 2, title: 'Review & Launch', icon: Sparkles, fields: ['inviteEmails'] as const },
]

export function MultiStepWizardForm() {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<WizardFormValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      workspaceName: '',
      adminEmail: '',
      planTier: 'pro',
      seatsCount: 5,
      inviteEmails: '',
    },
    mode: 'onChange',
  })

  // Validate only the current step's fields before moving next
  const handleNext = async () => {
    const fields = STEPS[currentStep].fields
    const isValid = await form.trigger(fields as any)
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const onSubmit = async (values: WizardFormValues) => {
    setIsSubmitting(true)
    const toastId = toast.loading('Creating your workspace...')

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      console.log('Wizard Completed:', values)
      toast.success('Workspace created successfully!', {
        description: `Welcome to ${values.workspaceName}.`,
        id: toastId,
      })
    } catch (error) {
      toast.error('Failed to create workspace', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 1. Step Progress Header */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon
          const isCompleted = currentStep > idx
          const isCurrent = currentStep === idx

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-all',
                    isCompleted
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : isCurrent
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-4 ring-indigo-500/20'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isCurrent ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
                  )}
                >
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-[2px] flex-1 mx-3 transition-colors',
                    currentStep > idx ? 'bg-indigo-600' : 'bg-zinc-800'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* 2. Form Step Card */}
      <Card className="border-zinc-800 bg-zinc-900/90 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">
            {currentStep === 0 && 'Step 1: Set Up Workspace'}
            {currentStep === 1 && 'Step 2: Select Subscription Plan'}
            {currentStep === 2 && 'Step 3: Review & Finalize'}
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            {currentStep === 0 && 'Provide your organization identity and owner email.'}
            {currentStep === 1 && 'Choose the plan tier and initial seat count for your team.'}
            {currentStep === 2 && 'Review your configuration and launch your workspace.'}
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 min-h-[220px]">
              {/* Step 0: Workspace Basics */}
              {currentStep === 0 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <FormField
                    control={form.control}
                    name="workspaceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-zinc-200">
                          Workspace Name <span className="text-rose-400">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Orbit Robotics"
                            {...field}
                            className="border-zinc-800 bg-zinc-950 text-zinc-100"
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-rose-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-zinc-200">
                          Admin Email Address <span className="text-rose-400">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="admin@orbit.dev"
                            {...field}
                            className="border-zinc-800 bg-zinc-950 text-zinc-100"
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-rose-400" />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 1: Plan Tier & Seats */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <FormField
                    control={form.control}
                    name="planTier"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs text-zinc-200">Select Plan</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                          >
                            {[
                              { id: 'starter', name: 'Starter', price: '$19/mo' },
                              { id: 'pro', name: 'Pro', price: '$49/mo', popular: true },
                              { id: 'enterprise', name: 'Enterprise', price: '$199/mo' },
                            ].map((tier) => (
                              <FormItem
                                key={tier.id}
                                className={cn(
                                  'relative flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3 cursor-pointer transition-all',
                                  field.value === tier.id &&
                                    'border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500'
                                )}
                              >
                                {tier.popular && (
                                  <Badge className="absolute -top-2.5 right-3 bg-indigo-600 text-[10px] px-1.5 py-0">
                                    Popular
                                  </Badge>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-zinc-200">
                                    {tier.name}
                                  </span>
                                  <RadioGroupItem value={tier.id} />
                                </div>
                                <span className="mt-2 text-sm font-bold text-indigo-400">
                                  {tier.price}
                                </span>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs text-rose-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="seatsCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-zinc-200">Team Seats</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            className="border-zinc-800 bg-zinc-950 text-zinc-100"
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-rose-400" />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 2: Review & Summary */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-zinc-850">
                      <span className="text-zinc-400">Workspace Name:</span>
                      <span className="font-semibold text-zinc-100">
                        {form.getValues('workspaceName')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-850">
                      <span className="text-zinc-400">Owner Email:</span>
                      <span className="font-semibold text-zinc-100">
                        {form.getValues('adminEmail')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-850">
                      <span className="text-zinc-400">Selected Plan:</span>
                      <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 uppercase">
                        {form.getValues('planTier')}
                      </Badge>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-400">Allocated Seats:</span>
                      <span className="font-semibold text-zinc-100">
                        {form.getValues('seatsCount')} Members
                      </span>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="inviteEmails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-zinc-200">
                          Invite Team Members (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="colleague@orbit.dev, dev@orbit.dev"
                            {...field}
                            className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500"
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-rose-400" />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0 || isSubmitting}
                className="border-zinc-800 bg-zinc-900 text-xs text-zinc-300"
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Previous
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white"
                >
                  Continue
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      Confirm & Create
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
```

---

## 3. Pattern 3: Advanced File Upload Dropzone

A production-ready drag-and-drop file upload zone with file type validation, preview badges, animated progress bar, and removal handlers.

```tsx
'use client'

import * as React from 'react'
import { UploadCloud, FileText, CheckCircle2, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export interface FileDropzoneProps {
  onFileSelect?: (file: File) => void
  accept?: string[]
  maxSizeMB?: number
}

export function FileDropzone({
  onFileSelect,
  accept = ['.csv', '.xlsx', '.pdf', '.png', '.jpg'],
  maxSizeMB = 10,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = React.useState<number>(0)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const validateAndProcessFile = (selectedFile: File) => {
    setError(null)
    const fileExt = `.${selectedFile.name.split('.').pop()?.toLowerCase()}`

    if (accept.length > 0 && !accept.includes(fileExt)) {
      setError(`Unsupported format. Accepted formats: ${accept.join(', ')}`)
      return
    }

    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds maximum size limit of ${maxSizeMB}MB.`)
      return
    }

    setFile(selectedFile)
    onFileSelect?.(selectedFile)

    // Simulate progress upload animation
    setUploadProgress(10)
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 30
      })
    }, 200)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0])
    }
  }

  const handleRemove = () => {
    setFile(null)
    setUploadProgress(0)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer',
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/50',
          file && 'cursor-default border-zinc-800 bg-zinc-900/30'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept.join(',')}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              validateAndProcessFile(e.target.files[0])
            }
          }}
        />

        {!file ? (
          <div className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-200">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-zinc-500">
                {accept.join(', ').toUpperCase()} (Max {maxSizeMB}MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-zinc-200 truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove()
                }}
                className="h-8 w-8 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {uploadProgress < 100 ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5 bg-zinc-800" />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Upload complete</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
```
