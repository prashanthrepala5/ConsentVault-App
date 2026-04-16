"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { APP_ID } from '@/lib/algorand'
import { getExplorerAppUrl } from '@/lib/types'

interface OptInPromptProps {
  onOptIn: () => Promise<string>
  isLoading: boolean
  balance: number
}

export function OptInPrompt({ onOptIn, isLoading, balance }: OptInPromptProps) {
  const [isOptingIn, setIsOptingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txId, setTxId] = useState<string | null>(null)

  const handleOptIn = async () => {
    setIsOptingIn(true)
    setError(null)
    
    try {
      const resultTxId = await onOptIn()
      setTxId(resultTxId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to opt-in')
    } finally {
      setIsOptingIn(false)
    }
  }

  const minBalance = 0.1 // Minimum balance required for opt-in

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <Card className="border-primary/20 bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Opt-in to ConsentVault</CardTitle>
          <CardDescription className="text-base">
            To manage your consent records on the blockchain, you need to opt-in to the ConsentVault smart contract
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="mb-3 font-semibold text-foreground">What happens when you opt-in?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                <span>Your address is registered with the ConsentVault application</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                <span>Local storage is allocated for your consent records</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                <span>You can create, view, and revoke consents at any time</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                <span>All actions are recorded immutably for DPDP compliance</span>
              </li>
            </ul>
          </div>

          {/* Balance Check */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-xl font-bold text-foreground">{balance.toFixed(4)} ALGO</p>
            </div>
            {balance < minBalance ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">Insufficient balance</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm">Ready to opt-in</span>
              </div>
            )}
          </div>

          {/* App Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Application ID:{' '}
              <a 
                href={getExplorerAppUrl(APP_ID)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-mono text-primary hover:underline"
              >
                {APP_ID || 'Not deployed'}
              </a>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Success */}
          {txId && (
            <div className="rounded-lg border border-success/50 bg-success/10 p-3 text-sm text-success">
              Successfully opted in! Transaction: {txId.slice(0, 12)}...
            </div>
          )}

          {/* Action Button */}
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleOptIn}
            disabled={isOptingIn || isLoading || balance < minBalance}
          >
            {isOptingIn ? (
              <>
                <Spinner className="mr-2" />
                Opting in...
              </>
            ) : (
              <>
                Opt-in to ConsentVault
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            This transaction requires approximately 0.1 ALGO for minimum balance
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
