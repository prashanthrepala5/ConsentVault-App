"use client"

import { useState } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { useAppClient } from '@/hooks/use-app-client'
import { ConsentTable } from '@/components/dashboard/consent-table'
import { AppPermissions } from '@/components/dashboard/app-permissions'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { ConnectWalletPrompt } from '@/components/connect-wallet-prompt'
import { OptInPrompt } from '@/components/dashboard/opt-in-prompt'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatAddress, getExplorerAddressUrl } from '@/lib/types'
import { APP_ID } from '@/lib/algorand'

export default function DashboardPage() {
  const { address, isConnected, signTransactions, sendTransactions, isDemo } = useWallet()
  const { 
    balance, 
    isOptedIn, 
    consents, 
    isLoading, 
    error,
    refresh, 
    optIn,
    revokeConsent,
    appId,
  } = useAppClient({ 
    address, 
    signTransactions, 
    sendTransactions 
  })
  
  const [isRefreshing, setIsRefreshing] = useState(false)

  if (!isConnected) {
    return <ConnectWalletPrompt />
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }

  // Show opt-in prompt if not opted in
  if (!isOptedIn && !isLoading) {
    return (
      <OptInPrompt 
        onOptIn={optIn} 
        isLoading={isLoading}
        balance={balance}
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Consents</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your data consent records stored immutably on Algorand
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/consent">
              <Plus className="mr-2 h-4 w-4" />
              New Consent
            </Link>
          </Button>
        </div>
      </div>

      {/* Account Info Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Address:</span>
          <code className="rounded bg-muted px-2 py-1 text-sm font-mono text-foreground">
            {formatAddress(address || '', 8)}
          </code>
          <a 
            href={getExplorerAddressUrl(address || '')} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        
        <div className="h-4 w-px bg-border hidden sm:block" />
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Balance:</span>
          <span className="font-semibold text-foreground">{balance.toFixed(4)} ALGO</span>
        </div>
        
        <div className="h-4 w-px bg-border hidden sm:block" />
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">App ID:</span>
          <span className="font-mono text-sm text-foreground">{appId || APP_ID || 'Not deployed'}</span>
        </div>

        {isDemo && (
          <>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <span className="rounded-full bg-warning/20 px-2 py-1 text-xs font-medium text-warning">
              Demo Mode
            </span>
          </>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      )}

      {/* Stats */}
      <DashboardStats consents={consents} balance={balance} />

      {/* Consent Table */}
      <ConsentTable 
        consents={consents} 
        onRevoke={revokeConsent}
        isLoading={isLoading}
      />

      <hr className="my-10 border-border" />
      
      {/* App Permissions Backend Layer */}
      <AppPermissions />
    </div>
  )
}
