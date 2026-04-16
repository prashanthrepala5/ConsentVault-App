"use client"

import { useState } from 'react'
import { Search, FileCheck, XCircle, ExternalLink, Clock, Shield, Copy, Check, Building2, Download, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTimestamp, formatAddress, getExplorerTxUrl, type AuditEntry, PARTNER_APPS } from '@/lib/types'
import { queryAuditTrail, APP_ID } from '@/lib/algorand'

// Demo audit data for testing without real blockchain
const DEMO_AUDIT_DATA: AuditEntry[] = [
  {
    txId: 'TX1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCD',
    type: 'consent_created',
    userAddress: 'DEMOABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS',
    appId: 'fintech-securepay',
    appName: 'SecurePay Finance',
    timestamp: Math.floor(Date.now() / 1000) - 86400 * 30,
    round: 34567890,
    policyHash: '8f4e3d2c1b0a9876543210fedcba9876543210fedcba9876543210fedcba98765',
    logs: ['ConsentCreated:1:DEMO...'],
  },
  {
    txId: 'TX0987654321ZYXWVUTSRQPONMLKJIHGFEDCBA0987654321ZYXW',
    type: 'consent_created',
    userAddress: 'DEMOABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS',
    appId: 'ecom-shopease',
    appName: 'ShopEase Marketplace',
    timestamp: Math.floor(Date.now() / 1000) - 86400 * 15,
    round: 34789012,
    policyHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01',
    logs: ['ConsentCreated:2:DEMO...'],
  },
  {
    txId: 'TX5555555555AAAABBBBCCCCDDDDEEEEFFFFGGGG5555555555AAA',
    type: 'consent_created',
    userAddress: 'DEMOABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS',
    appId: 'health-medicare',
    appName: 'MediCare Health',
    timestamp: Math.floor(Date.now() / 1000) - 86400 * 45,
    round: 34234567,
    policyHash: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    logs: ['ConsentCreated:3:DEMO...'],
  },
  {
    txId: 'REVOKE111222333444555666777888999000AAABBBCCCDDDEEE111',
    type: 'consent_revoked',
    userAddress: 'DEMOABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS',
    appId: 'health-medicare',
    appName: 'MediCare Health',
    timestamp: Math.floor(Date.now() / 1000) - 86400 * 5,
    round: 35012345,
    logs: ['ConsentRevoked:3:DEMO...'],
  },
]

export function AuditSearch() {
  const [searchAddress, setSearchAddress] = useState('')
  const [filterApp, setFilterApp] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedTx, setCopiedTx] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const handleSearch = async () => {
    if (!searchAddress.trim()) return

    setIsSearching(true)
    setError(null)
    setResults(null)
    setIsDemo(false)

    try {
      // Check if it's a demo search
      if (searchAddress.toUpperCase().startsWith('DEMO')) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        setResults(DEMO_AUDIT_DATA)
        setIsDemo(true)
      } else if (APP_ID === 0) {
        // No app deployed - use demo data
        await new Promise(resolve => setTimeout(resolve, 1000))
        setResults([])
        setError('ConsentVault app not deployed. Using demo mode.')
      } else {
        // Query real indexer
        const auditData = await queryAuditTrail({ userAddress: searchAddress })
        
        // Map to AuditEntry format
        const entries: AuditEntry[] = auditData.map(entry => {
          // Parse logs to determine type and app
          let type: 'consent_created' | 'consent_revoked' = 'consent_created'
          let appId: string | undefined
          let appName: string | undefined
          
          for (const log of entry.logs) {
            if (log.startsWith('ConsentRevoked:')) {
              type = 'consent_revoked'
            } else if (log.startsWith('ConsentCreated:')) {
              type = 'consent_created'
              const parts = log.split(':')
              if (parts.length >= 4) {
                appId = parts[3]
                const app = PARTNER_APPS.find(a => a.id === appId)
                appName = app?.name || appId
              }
            }
          }
          
          return {
            txId: entry.txId,
            type,
            userAddress: entry.userAddress,
            appId,
            appName,
            timestamp: entry.timestamp,
            round: entry.round,
            logs: entry.logs,
          }
        })
        
        setResults(entries)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query audit trail')
    } finally {
      setIsSearching(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTx(id)
    setTimeout(() => setCopiedTx(null), 2000)
  }

  // Filter results
  const filteredResults = results?.filter(entry => {
    if (filterApp !== 'all' && entry.appId !== filterApp) return false
    if (filterType !== 'all' && entry.type !== filterType) return false
    return true
  }) || []

  const stats = results ? {
    total: results.length,
    created: results.filter(r => r.type === 'consent_created').length,
    revoked: results.filter(r => r.type === 'consent_revoked').length,
    uniqueApps: new Set(results.map(r => r.appId).filter(Boolean)).size,
  } : null

  const exportCSV = () => {
    if (!filteredResults.length) return
    
    const headers = ['Transaction ID', 'Type', 'App', 'Timestamp', 'Round']
    const rows = filteredResults.map(r => [
      r.txId,
      r.type,
      r.appName || r.appId || 'Unknown',
      new Date(r.timestamp * 1000).toISOString(),
      r.round.toString()
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consent-audit-${searchAddress.slice(0, 8)}-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="space-y-8">
      {/* Search Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="h-5 w-5 text-primary" />
            Compliance Audit Query
          </CardTitle>
          <CardDescription>
            Search consent records by Algorand address for DPDP Act compliance verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter Algorand address (e.g., DEMO...)"
                className="pl-10 bg-input border-border font-mono text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !searchAddress.trim()}>
              {isSearching ? (
                <>
                  <Spinner className="mr-2" />
                  Querying...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Enter any Algorand address or try &quot;DEMO&quot; to see sample audit data
          </p>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Query Error</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Demo Mode Banner */}
          {isDemo && (
            <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm text-warning">
              <strong>Demo Mode:</strong> Showing sample audit data. Connect to a deployed ConsentVault app for real blockchain queries.
            </div>
          )}

          {/* Stats */}
          {stats && stats.total > 0 && (
            <div className="grid gap-4 sm:grid-cols-4">
              <Card className="border-border bg-card">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Records</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <FileCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{stats.created}</p>
                    <p className="text-xs text-muted-foreground">Consents Granted</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{stats.revoked}</p>
                    <p className="text-xs text-muted-foreground">Revocations</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{stats.uniqueApps}</p>
                    <p className="text-xs text-muted-foreground">Unique Apps</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters & Actions */}
          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] bg-card">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="consent_created">Created</SelectItem>
                  <SelectItem value="consent_revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterApp} onValueChange={setFilterApp}>
                <SelectTrigger className="w-[180px] bg-card">
                  <SelectValue placeholder="App" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Apps</SelectItem>
                  {PARTNER_APPS.map(app => (
                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filteredResults.length}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          )}

          {/* Results Table */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Audit Trail</CardTitle>
              <CardDescription>
                {results.length > 0 
                  ? `Showing ${filteredResults.length} of ${results.length} records`
                  : 'No consent records found for this address'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">No Records Found</h3>
                  <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                    This address has no consent records on the blockchain. The user may not have opted into ConsentVault.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Type</TableHead>
                        <TableHead className="text-muted-foreground">Application</TableHead>
                        <TableHead className="text-muted-foreground">Timestamp</TableHead>
                        <TableHead className="text-muted-foreground hidden md:table-cell">Block</TableHead>
                        <TableHead className="text-muted-foreground">Transaction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((entry) => (
                        <TableRow key={entry.txId} className="border-border">
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                entry.type === 'consent_created'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/10 text-red-400 border-red-500/30'
                              }
                            >
                              <span className="flex items-center gap-1">
                                {entry.type === 'consent_created' ? (
                                  <FileCheck className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {entry.type === 'consent_created' ? 'Created' : 'Revoked'}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {entry.appName || entry.appId || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span className="hidden sm:inline">{formatTimestamp(entry.timestamp)}</span>
                              <span className="sm:hidden">{new Date(entry.timestamp * 1000).toLocaleDateString()}</span>
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <code className="text-xs text-muted-foreground font-mono">
                              #{entry.round.toLocaleString()}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-muted-foreground font-mono">
                                {formatAddress(entry.txId, 6)}
                              </code>
                              <button
                                onClick={() => copyToClipboard(entry.txId, entry.txId)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy transaction ID"
                              >
                                {copiedTx === entry.txId ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <a
                                href={getExplorerTxUrl(entry.txId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                                title="View on AlgoExplorer"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Info Card - only show when no results */}
      {!results && !error && (
        <Card className="border-border bg-secondary/30">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-4">How DPDP Audit Works</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  1
                </div>
                <div>
                  <p className="font-medium text-foreground">Query by Address</p>
                  <p className="text-sm text-muted-foreground">
                    Enter a user&apos;s Algorand address to retrieve their consent history
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  2
                </div>
                <div>
                  <p className="font-medium text-foreground">Immutable Records</p>
                  <p className="text-sm text-muted-foreground">
                    All consent events are stored on-chain and cannot be altered
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  3
                </div>
                <div>
                  <p className="font-medium text-foreground">Regulatory Compliance</p>
                  <p className="text-sm text-muted-foreground">
                    Export audit trails for DPDP Act Section 6 compliance reporting
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
