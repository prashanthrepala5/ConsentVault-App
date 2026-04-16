"use client"

import { useState } from 'react'
import { ExternalLink, MoreVertical, XCircle, Eye, Copy, Check, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  formatTimestamp, 
  formatAddress, 
  getExplorerTxUrl,
  getRelativeTime,
  PERMISSION_CATEGORY_COLORS,
  type Consent 
} from '@/lib/types'
import Link from 'next/link'

interface ConsentTableProps {
  consents: Consent[]
  onRevoke: (consentIndex: number) => Promise<string>
  isLoading: boolean
}

export function ConsentTable({ consents, onRevoke, isLoading }: ConsentTableProps) {
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null)
  const [revokeConsent, setRevokeConsent] = useState<{ consent: Consent; index: number } | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [copiedTx, setCopiedTx] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [revokeTxId, setRevokeTxId] = useState<string | null>(null)

  const handleRevoke = async () => {
    if (!revokeConsent) return
    
    setRevoking(revokeConsent.consent.id)
    setRevokeError(null)
    
    try {
      const txId = await onRevoke(revokeConsent.index)
      setRevokeTxId(txId)
      setTimeout(() => {
        setRevokeConsent(null)
        setRevokeTxId(null)
      }, 2000)
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : 'Failed to revoke consent')
    } finally {
      setRevoking(null)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTx(id)
    setTimeout(() => setCopiedTx(null), 2000)
  }

  // Loading state
  if (isLoading && consents.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Consent Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (consents.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Eye className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">No Consents Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
            You haven&apos;t granted any consents yet. Grant consent to partner apps to start managing your data rights.
          </p>
          <Button asChild className="mt-6">
            <Link href="/consent">Grant Your First Consent</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Consent Records</CardTitle>
          <span className="text-sm text-muted-foreground">
            {consents.length} total
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Application</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">Policy Hash</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">Permissions</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consents.map((consent, index) => (
                  <TableRow key={consent.id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{consent.appName}</p>
                        <p className="text-xs text-muted-foreground md:hidden mt-0.5">
                          {formatAddress(consent.policyHash, 8)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          {formatAddress(consent.policyHash, 8)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(consent.policyHash, consent.id + '-hash')}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy full hash"
                        >
                          {copiedTx === consent.id + '-hash' ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>
                        <p className="text-sm">{getRelativeTime(consent.timestamp)}</p>
                        <p className="text-xs text-muted-foreground/70 hidden lg:block">
                          {formatTimestamp(consent.timestamp)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">
                          {consent.permissions.filter(p => p.granted).length}
                        </span>
                        <span className="text-xs text-muted-foreground">granted</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          consent.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }
                      >
                        {consent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-border">
                          <DropdownMenuItem
                            onClick={() => setSelectedConsent(consent)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a
                              href={getExplorerTxUrl(consent.txId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View on Explorer
                            </a>
                          </DropdownMenuItem>
                          {consent.status === 'active' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setRevokeConsent({ consent, index })}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Revoke Consent
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Consent Details Dialog */}
      <Dialog open={!!selectedConsent} onOpenChange={() => setSelectedConsent(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selectedConsent?.appName}</DialogTitle>
            <DialogDescription>
              Consent record details and granted data permissions
            </DialogDescription>
          </DialogHeader>
          {selectedConsent && (
            <div className="space-y-6">
              {/* Status and Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={
                      selectedConsent.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }
                  >
                    {selectedConsent.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Granted On</p>
                  <p className="text-sm text-foreground">{formatTimestamp(selectedConsent.timestamp)}</p>
                </div>
                {selectedConsent.revokedAt && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Revoked On</p>
                    <p className="text-sm text-foreground">{formatTimestamp(selectedConsent.revokedAt)}</p>
                  </div>
                )}
              </div>

              {/* Blockchain Info */}
              <div className="space-y-3 rounded-lg border border-border bg-secondary/50 p-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Policy Hash (SHA256)</p>
                  <code className="text-xs text-foreground font-mono break-all block bg-muted p-2 rounded">
                    {selectedConsent.policyHash}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Consent Transaction</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-foreground font-mono">
                      {formatAddress(selectedConsent.txId, 12)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(selectedConsent.txId, 'detail-tx')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedTx === 'detail-tx' ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <a
                      href={getExplorerTxUrl(selectedConsent.txId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                {selectedConsent.revokedTxId && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Revocation Transaction</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-foreground font-mono">
                        {formatAddress(selectedConsent.revokedTxId, 12)}
                      </code>
                      <a
                        href={getExplorerTxUrl(selectedConsent.revokedTxId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div>
                <p className="text-sm font-medium text-foreground mb-3">
                  Data Permissions ({selectedConsent.permissions.filter(p => p.granted).length} granted)
                </p>
                <div className="space-y-2">
                  {selectedConsent.permissions.filter(p => p.granted).map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-start justify-between rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{perm.name}</p>
                          {perm.category && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${PERMISSION_CATEGORY_COLORS[perm.category] || ''}`}>
                              {perm.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                        {perm.dpdpCategory && (
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            DPDP Category: {perm.dpdpCategory}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 ml-2">
                        Granted
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedConsent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeConsent} onOpenChange={() => !revoking && setRevokeConsent(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke Consent
            </AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTxId ? (
                <span className="text-success">
                  Consent revoked successfully! Transaction: {formatAddress(revokeTxId, 8)}
                </span>
              ) : (
                <>
                  Are you sure you want to revoke your consent for <strong className="text-foreground">{revokeConsent?.consent.appName}</strong>?
                  This action will be recorded on the blockchain and cannot be undone.
                  The app will no longer have permission to process your data.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {revokeError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {revokeError}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!revoking}>Cancel</AlertDialogCancel>
            {!revokeTxId && (
              <AlertDialogAction
                onClick={handleRevoke}
                disabled={!!revoking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {revoking ? (
                  <>
                    <Spinner className="mr-2" />
                    Revoking...
                  </>
                ) : (
                  'Yes, Revoke Consent'
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
