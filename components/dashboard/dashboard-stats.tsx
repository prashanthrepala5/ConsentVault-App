"use client"

import { FileCheck, XCircle, Shield, Wallet, Clock, Database } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Consent } from '@/lib/types'

interface DashboardStatsProps {
  consents: Consent[]
  balance: number
}

export function DashboardStats({ consents, balance }: DashboardStatsProps) {
  const activeConsents = consents.filter(c => c.status === 'active').length
  const revokedConsents = consents.filter(c => c.status === 'revoked').length
  const totalPermissions = consents
    .filter(c => c.status === 'active')
    .reduce((acc, c) => acc + c.permissions.filter(p => p.granted).length, 0)
  
  // Calculate days since first consent
  const oldestConsent = consents.length > 0 
    ? Math.min(...consents.map(c => c.timestamp))
    : Math.floor(Date.now() / 1000)
  const daysSinceFirst = Math.max(0, Math.floor((Date.now() / 1000 - oldestConsent) / 86400))

  const stats = [
    {
      label: 'Active Consents',
      value: activeConsents,
      icon: FileCheck,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      label: 'Revoked',
      value: revokedConsents,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    {
      label: 'Data Points Shared',
      value: totalPermissions,
      icon: Database,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      label: 'Wallet Balance',
      value: `${balance.toFixed(2)}`,
      suffix: 'ALGO',
      icon: Wallet,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
  ]

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className={`border ${stat.borderColor} bg-card hover:bg-card/80 transition-colors`}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stat.value}
                {stat.suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{stat.suffix}</span>}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
