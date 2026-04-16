"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/lib/wallet-context'
import { formatAddress } from '@/lib/types'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/consent', label: 'Give Consent' },
  { href: '/audit', label: 'Audit Trail' },
]

export function Header() {
  const pathname = usePathname()
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">ConsentVault</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                pathname === item.href
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Wallet Connection */}
        <div className="hidden md:flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm font-mono text-foreground">{formatAddress(address!)}</span>
              </div>
              <Button variant="outline" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connect} disabled={isConnecting} className="gap-2">
              {isConnecting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Connecting...
                </>
              ) : (
                'Connect Wallet'
              )}
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="flex flex-col p-4 gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border mt-2">
              {isConnected ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-sm font-mono text-foreground">{formatAddress(address!)}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={disconnect} className="w-full">
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button onClick={connect} disabled={isConnecting} className="w-full gap-2">
                  {isConnecting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Wallet'
                  )}
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
