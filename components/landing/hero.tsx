"use client"

import Link from 'next/link'
import { Shield, ArrowRight, Lock, Eye, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/lib/wallet-context'

export function Hero() {
  const { isConnected, isConnecting, connect } = useWallet()

  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] bg-primary/5 blur-3xl rounded-full" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">DPDP Act Compliant</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl text-balance">
            The Trustless Consent Manager
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground text-pretty">
            Take control of your data privacy with blockchain-powered consent management. 
            Every permission you grant is recorded immutably on Algorand, giving you 
            verifiable proof and instant revocation capabilities.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isConnected ? (
              <Button asChild size="lg" className="gap-2 w-full sm:w-auto">
                <Link href="/dashboard">
                  View Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" onClick={connect} disabled={isConnecting} className="gap-2 w-full sm:w-auto">
                {isConnecting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Wallet
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link href="/audit">View Public Audit</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-border pt-10">
            <div>
              <div className="text-3xl font-bold text-foreground">100%</div>
              <div className="mt-1 text-sm text-muted-foreground">Immutable Records</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">0.001</div>
              <div className="mt-1 text-sm text-muted-foreground">ALGO per Consent</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{"< 4s"}</div>
              <div className="mt-1 text-sm text-muted-foreground">Finality Time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
