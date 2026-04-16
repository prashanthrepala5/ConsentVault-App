"use client"

import { useState, useCallback, useEffect } from 'react'
import {
  getAccountInfo,
  createOptInTxn,
  createConsentTxn,
  createRevokeTxn,
  waitForConfirmation,
  queryConsentHistory,
  getAppGlobalState,
  hashPolicy,
  APP_ID,
  type PermissionKey,
} from '@/lib/algorand'
import type { Consent, Permission } from '@/lib/types'
import { PARTNER_APPS } from '@/lib/types'

interface UseAppClientOptions {
  address: string | null
  signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  sendTransactions: (signedTxns: Uint8Array[]) => Promise<string>
}

interface AppClientState {
  balance: number
  isOptedIn: boolean
  consents: Consent[]
  isLoading: boolean
  globalState: {
    consentCounter: number
    admin: string
  } | null
}

export function useAppClient({ address, signTransactions, sendTransactions }: UseAppClientOptions) {
  const [state, setState] = useState<AppClientState>({
    balance: 0,
    isOptedIn: false,
    consents: [],
    isLoading: false,
    globalState: null,
  })
  const [error, setError] = useState<string | null>(null)

  // Fetch account info and consents
  const refresh = useCallback(async () => {
    if (!address || APP_ID === 0) return

    setState(prev => ({ ...prev, isLoading: true }))
    setError(null)

    try {
      // Get account info
      const accountInfo = await getAccountInfo(address)
      
      // Get consent history from indexer
      const history = await queryConsentHistory(address)
      
      // Parse consents from local state and history
      const consents = parseConsentsFromHistory(history, accountInfo.localState)
      
      // Get global state
      const globalState = await getAppGlobalState()

      setState({
        balance: accountInfo.balance,
        isOptedIn: accountInfo.isOptedIn,
        consents,
        isLoading: false,
        globalState,
      })
    } catch (err) {
      console.error('Error refreshing app state:', err)
      setError(err instanceof Error ? err.message : 'Failed to load account data')
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [address])

  // Auto-refresh on mount and address change
  useEffect(() => {
    if (address) {
      refresh()
    }
  }, [address, refresh])

  // Opt-in to the application
  const optIn = useCallback(async (): Promise<string> => {
    if (!address) throw new Error('Wallet not connected')

    setState(prev => ({ ...prev, isLoading: true }))
    setError(null)

    try {
      const txn = await createOptInTxn(address)
      const signedTxns = await signTransactions([txn.toByte()])
      const txId = await sendTransactions(signedTxns)
      
      await waitForConfirmation(txId)
      await refresh()
      
      return txId
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Opt-in failed'
      setError(message)
      throw err
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [address, signTransactions, sendTransactions, refresh])

  // Create new consent
  const createConsent = useCallback(async (
    appId: string,
    permissions: PermissionKey[]
  ): Promise<{ txId: string; consent: Consent }> => {
    if (!address) throw new Error('Wallet not connected')
    if (!state.isOptedIn) throw new Error('Must opt-in first')

    setState(prev => ({ ...prev, isLoading: true }))
    setError(null)

    try {
      // Find partner app
      const partnerApp = PARTNER_APPS.find(app => app.id === appId)
      if (!partnerApp) throw new Error('Unknown partner app')

      // Generate policy hash
      const policyContent = `${appId}:${partnerApp.policyVersion}:${permissions.join(',')}`
      const policyHash = await hashPolicy(policyContent)

      // Create transaction
      const txn = await createConsentTxn(address, appId, policyHash, permissions)
      const signedTxns = await signTransactions([txn.toByte()])
      const txId = await sendTransactions(signedTxns)

      // Wait for confirmation
      const result = await waitForConfirmation(txId)

      // Create consent object
      const consent: Consent = {
        id: String(state.consents.length + 1),
        appId,
        appName: partnerApp.name,
        policyHash,
        timestamp: Math.floor(Date.now() / 1000),
        permissions: partnerApp.permissions
          .filter(p => permissions.includes(p.id as PermissionKey))
          .map(p => ({ ...p, granted: true })),
        status: 'active',
        txId,
      }

      // Update local state
      setState(prev => ({
        ...prev,
        consents: [consent, ...prev.consents],
        isLoading: false,
      }))

      return { txId, consent }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create consent'
      setError(message)
      throw err
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [address, state.isOptedIn, state.consents.length, signTransactions, sendTransactions])

  // Revoke consent
  const revokeConsent = useCallback(async (consentIndex: number): Promise<string> => {
    if (!address) throw new Error('Wallet not connected')

    setState(prev => ({ ...prev, isLoading: true }))
    setError(null)

    try {
      const txn = await createRevokeTxn(address, consentIndex)
      const signedTxns = await signTransactions([txn.toByte()])
      const txId = await sendTransactions(signedTxns)

      await waitForConfirmation(txId)

      // Update local state
      setState(prev => ({
        ...prev,
        consents: prev.consents.map((c, i) =>
          i === consentIndex
            ? {
                ...c,
                status: 'revoked' as const,
                revokedAt: Math.floor(Date.now() / 1000),
                revokedTxId: txId,
              }
            : c
        ),
        isLoading: false,
      }))

      return txId
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke consent'
      setError(message)
      throw err
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [address, signTransactions, sendTransactions])

  return {
    ...state,
    error,
    refresh,
    optIn,
    createConsent,
    revokeConsent,
    appId: APP_ID,
  }
}

// Helper to parse consents from transaction history
function parseConsentsFromHistory(
  history: Array<{
    txId: string
    type: 'consent_created' | 'consent_revoked'
    round: number
    timestamp: number
    appId?: string
    logs: string[]
  }>,
  localState: Record<string, unknown> | null
): Consent[] {
  const consentsMap = new Map<string, Consent>()

  // Process history in chronological order
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp)

  for (const entry of sortedHistory) {
    if (entry.type === 'consent_created' && entry.appId) {
      const partnerApp = PARTNER_APPS.find(app => app.id === entry.appId)
      
      consentsMap.set(entry.txId, {
        id: entry.txId.slice(0, 8),
        appId: entry.appId,
        appName: partnerApp?.name || entry.appId,
        policyHash: extractPolicyHash(entry.logs),
        timestamp: entry.timestamp,
        permissions: partnerApp?.permissions.filter(p => p.granted) || [],
        status: 'active',
        txId: entry.txId,
      })
    } else if (entry.type === 'consent_revoked') {
      // Find and update the revoked consent
      for (const [txId, consent] of consentsMap) {
        if (consent.status === 'active') {
          consent.status = 'revoked'
          consent.revokedAt = entry.timestamp
          consent.revokedTxId = entry.txId
          break
        }
      }
    }
  }

  return Array.from(consentsMap.values()).reverse()
}

function extractPolicyHash(logs: string[]): string {
  for (const log of logs) {
    if (log.includes('hash:')) {
      const match = log.match(/hash:([a-f0-9]+)/i)
      if (match) return match[1]
    }
  }
  return '0'.repeat(64)
}
