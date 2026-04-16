"use client"

import { useWallet } from '@/lib/wallet-context'
import { ConsentForm } from '@/components/consent/consent-form'
import { ConnectWalletPrompt } from '@/components/connect-wallet-prompt'

export default function ConsentPage() {
  const { isConnected } = useWallet()

  if (!isConnected) {
    return <ConnectWalletPrompt />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Give Consent</h1>
        <p className="mt-2 text-muted-foreground">
          Select a partner app and grant data permissions with on-chain verification
        </p>
      </div>

      <ConsentForm />
    </div>
  )
}
