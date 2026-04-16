"use client"

import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useWallet } from '@/lib/wallet-context'

export function ConnectWalletPrompt() {
  const { isConnecting, connect } = useWallet()

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-md border-border bg-card">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-foreground">Connect Your Wallet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your Algorand wallet to view and manage your consent records on the blockchain.
          </p>
          <Button 
            onClick={connect} 
            disabled={isConnecting} 
            className="mt-6 w-full gap-2"
            size="lg"
          >
            {isConnecting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Supports Pera Wallet and AlgoSigner
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
