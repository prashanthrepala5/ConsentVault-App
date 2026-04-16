"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, ShoppingBag, Heart, Check, FileSignature, ExternalLink, AlertCircle, Shield, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { useWallet } from '@/lib/wallet-context'
import { useAppClient } from '@/hooks/use-app-client'
import { 
  PARTNER_APPS, 
  getExplorerTxUrl,
  PERMISSION_CATEGORY_COLORS,
  type PartnerApp, 
} from '@/lib/types'
import type { PermissionKey } from '@/lib/algorand'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet,
  ShoppingBag,
  Heart,
}

export function ConsentForm() {
  const router = useRouter()
  const { address, signTransactions, sendTransactions, isDemo } = useWallet()
  const { consents, createConsent, isOptedIn, optIn, isLoading } = useAppClient({
    address,
    signTransactions,
    sendTransactions,
  })
  
  const [selectedApp, setSelectedApp] = useState<PartnerApp | null>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txResult, setTxResult] = useState<{ txId: string; consent: any } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'select' | 'permissions' | 'review'>('select')

  const handleAppSelect = (app: PartnerApp) => {
    setSelectedApp(app)
    setTxResult(null)
    setError(null)
    // Initialize permissions based on app defaults
    const initialPermissions: Record<string, boolean> = {}
    app.permissions.forEach(p => {
      initialPermissions[p.id] = p.granted
    })
    setPermissions(initialPermissions)
    setStep('permissions')
  }

  const togglePermission = (permId: string) => {
    setPermissions(prev => ({
      ...prev,
      [permId]: !prev[permId]
    }))
  }

  const hasExistingConsent = (appId: string) => {
    return consents.some(c => c.appId === appId && c.status === 'active')
  }

  const grantedPermissionIds = Object.entries(permissions)
    .filter(([_, granted]) => granted)
    .map(([id]) => id as PermissionKey)

  const grantedPermissions = selectedApp?.permissions.filter(p => permissions[p.id]) || []

  const handleSubmit = async () => {
    if (!selectedApp || grantedPermissionIds.length === 0) return

    setIsSubmitting(true)
    setError(null)

    try {
      // If not opted in, opt in first
      if (!isOptedIn) {
        await optIn()
      }

      // Create the consent on-chain
      const result = await createConsent(selectedApp.id, grantedPermissionIds)
      setTxResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create consent')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step === 'review') {
      setStep('permissions')
    } else if (step === 'permissions') {
      setStep('select')
      setSelectedApp(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full",
          step === 'select' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}>
          <span className="font-medium">1. Select App</span>
        </div>
        <div className="w-8 h-px bg-border" />
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full",
          step === 'permissions' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}>
          <span className="font-medium">2. Permissions</span>
        </div>
        <div className="w-8 h-px bg-border" />
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full",
          step === 'review' ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}>
          <span className="font-medium">3. Sign</span>
        </div>
      </div>

      {/* Back Button */}
      {step !== 'select' && !txResult && (
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      )}

      {/* Step 1: App Selection */}
      {step === 'select' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Choose a Partner Application</h2>
            <p className="text-muted-foreground mt-1">
              Select an app to review their data policy and grant consent
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PARTNER_APPS.map((app) => {
              const Icon = iconMap[app.icon] || Wallet
              const hasActive = hasExistingConsent(app.id)

              return (
                <Card
                  key={app.id}
                  className={cn(
                    "cursor-pointer transition-all border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                    hasActive && "opacity-60 cursor-not-allowed"
                  )}
                  onClick={() => !hasActive && handleAppSelect(app)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl",
                        app.category === 'fintech' && "bg-amber-500/10 text-amber-400",
                        app.category === 'ecommerce' && "bg-emerald-500/10 text-emerald-400",
                        app.category === 'healthcare' && "bg-red-500/10 text-red-400",
                      )}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{app.name}</h3>
                          {app.dpdpCompliant && (
                            <Shield className="h-4 w-4 text-primary" title="DPDP Compliant" />
                          )}
                        </div>
                        {hasActive && (
                          <Badge variant="secondary" className="mt-1 text-xs">Active Consent</Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{app.description}</p>
                    
                    <div className="mt-4 flex items-center gap-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {app.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {app.permissions.length} permissions
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: Permissions */}
      {step === 'permissions' && selectedApp && !txResult && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-4">
                {(() => {
                  const Icon = iconMap[selectedApp.icon] || Wallet
                  return (
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      selectedApp.category === 'fintech' && "bg-amber-500/10 text-amber-400",
                      selectedApp.category === 'ecommerce' && "bg-emerald-500/10 text-emerald-400",
                      selectedApp.category === 'healthcare' && "bg-red-500/10 text-red-400",
                    )}>
                      <Icon className="h-6 w-6" />
                    </div>
                  )
                })()}
                <div>
                  <CardTitle className="text-foreground">{selectedApp.name}</CardTitle>
                  <CardDescription>{selectedApp.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="font-medium text-foreground">Data Permissions</h4>
                <span className="text-sm text-muted-foreground">
                  {grantedPermissionIds.length} of {selectedApp.permissions.length} selected
                </span>
              </div>
              
              {selectedApp.permissions.map((perm) => (
                <div
                  key={perm.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                    permissions[perm.id] 
                      ? "border-primary/50 bg-primary/5" 
                      : "border-border hover:bg-secondary/50"
                  )}
                >
                  <Checkbox
                    id={perm.id}
                    checked={permissions[perm.id] || false}
                    onCheckedChange={() => togglePermission(perm.id)}
                    className="mt-0.5"
                  />
                  <label htmlFor={perm.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{perm.name}</p>
                      {perm.category && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border",
                          PERMISSION_CATEGORY_COLORS[perm.category] || ''
                        )}>
                          {perm.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{perm.description}</p>
                    {perm.dpdpCategory && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        DPDP Category: {perm.dpdpCategory}
                      </p>
                    )}
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={() => setStep('review')} 
              disabled={grantedPermissionIds.length === 0}
              className="flex-1"
            >
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Sign */}
      {step === 'review' && selectedApp && !txResult && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" />
                Review & Sign Consent
              </CardTitle>
              <CardDescription>
                Confirm the details below and sign the blockchain transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Application</span>
                  <span className="text-foreground font-medium">{selectedApp.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Policy Version</span>
                  <span className="text-foreground font-mono">v{selectedApp.policyVersion}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data Points</span>
                  <span className="text-foreground">{grantedPermissions.length} permissions</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-foreground">Algorand Testnet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Fee</span>
                  <span className="text-foreground">~0.001 ALGO</span>
                </div>
              </div>

              {/* Permissions Summary */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Data You&apos;re Sharing:</h4>
                <div className="flex flex-wrap gap-2">
                  {grantedPermissions.map(perm => (
                    <Badge key={perm.id} variant="outline" className="text-foreground">
                      {perm.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Opt-in notice */}
              {!isOptedIn && (
                <Alert className="border-primary/50 bg-primary/5">
                  <Shield className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-foreground">
                    You&apos;ll first opt-in to the ConsentVault app, then your consent will be recorded.
                    This requires approximately 0.1 ALGO for minimum balance.
                  </AlertDescription>
                </Alert>
              )}

              {/* Demo mode notice */}
              {isDemo && (
                <Alert className="border-warning/50 bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning">
                    Demo Mode: Transaction will be simulated. Connect a real Pera Wallet for actual blockchain transactions.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || isLoading}
              className="flex-1"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2" />
                  {!isOptedIn ? 'Opting in...' : 'Signing...'}
                </>
              ) : (
                <>
                  <FileSignature className="mr-2 h-4 w-4" />
                  Sign & Submit
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Success State */}
      {txResult && (
        <div className="max-w-2xl mx-auto">
          <Card className="border-emerald-500/50 bg-emerald-500/5">
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              
              <h3 className="mt-4 text-xl font-semibold text-foreground">Consent Recorded!</h3>
              <p className="mt-2 text-muted-foreground">
                Your consent has been immutably stored on the Algorand blockchain
              </p>

              <div className="mt-6 rounded-lg bg-secondary p-4 text-left">
                <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                <code className="text-sm text-foreground font-mono break-all block">
                  {txResult.txId}
                </code>
              </div>

              <div className="mt-6 flex gap-3">
                <Button asChild variant="outline" className="flex-1">
                  <a
                    href={getExplorerTxUrl(txResult.txId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on Explorer
                  </a>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/dashboard">
                    Go to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
