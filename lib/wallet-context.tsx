"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import algosdk from 'algosdk'
import type { WalletState, Consent } from './types'
import { getAlgodClient, waitForConfirmation } from './algorand'

// Pera Wallet types (simplified for demo)
interface PeraWallet {
  connect: () => Promise<string[]>
  disconnect: () => Promise<void>
  signTransaction: (txnGroups: Array<{ txn: algosdk.Transaction }[]>) => Promise<Uint8Array[]>
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  sendTransactions: (signedTxns: Uint8Array[]) => Promise<string>
  sendPaymentTransaction: (amountMicroAlgos: number, receiver: string) => Promise<string>
  isDemo: boolean
  setDemoMode: (demo: boolean) => void
}

const WalletContext = createContext<WalletContextType | null>(null)

// Demo wallet for testing without real wallet
const DEMO_ADDRESS = 'DEMOQ7WXYZ2ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJ'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [peraWallet, setPeraWallet] = useState<PeraWallet | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  // Initialize Pera Wallet on mount (client-side only)
  useEffect(() => {
    const initWallet = async () => {
      if (typeof window !== 'undefined') {
        try {
          // Dynamic import for Pera wallet (browser only)
          const { PeraWalletConnect } = await import('@perawallet/connect')
          const pera = new PeraWalletConnect({
            shouldShowSignTxnToast: true,
          })
          setPeraWallet(pera as unknown as PeraWallet)

          // Check for reconnection
          pera.reconnectSession().then((accounts: string[]) => {
            if (accounts.length > 0) {
              setAddress(accounts[0])
            }
          }).catch(() => {
            // Session expired or not found
          })
        } catch (error) {
          console.error('Failed to initialize Pera Wallet:', error)
        }
      }
    }

    initWallet()
  }, [])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    
    try {
      if (isDemo) {
        // Demo mode - simulate connection
        await new Promise(resolve => setTimeout(resolve, 1000))
        setAddress(DEMO_ADDRESS)
      } else if (peraWallet) {
        // Real Pera Wallet connection
        const accounts = await peraWallet.connect()
        if (accounts.length > 0) {
          setAddress(accounts[0])
        }
      } else {
        // Fallback to demo if Pera not available
        console.warn('Pera Wallet not available, using demo mode')
        setIsDemo(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        setAddress(DEMO_ADDRESS)
      }
    } catch (error: any) {
      if (error?.message?.includes('closed by user')) {
        console.log('Connection cancelled by user')
      } else {
        console.error('Connection error:', error)
      }
    } finally {
      setIsConnecting(false)
    }
  }, [peraWallet, isDemo])

  const disconnect = useCallback(async () => {
    if (peraWallet && !isDemo) {
      try {
        await peraWallet.disconnect()
      } catch (error) {
        console.error('Disconnect error:', error)
      }
    }
    setAddress(null)
  }, [peraWallet, isDemo])

  const signTransactions = useCallback(async (txns: Uint8Array[]): Promise<Uint8Array[]> => {
    if (isDemo) {
      // Demo mode - return unsigned txns (they won't actually be sent)
      await new Promise(resolve => setTimeout(resolve, 500))
      return txns
    }

    if (!peraWallet) {
      throw new Error('Wallet not connected')
    }

    // Decode transactions and prepare for signing
    const txnGroups = txns.map(txnBytes => {
      const txn = algosdk.decodeUnsignedTransaction(txnBytes)
      return [{ txn }]
    })

    return await peraWallet.signTransaction(txnGroups)
  }, [peraWallet, isDemo])

  const sendTransactions = useCallback(async (signedTxns: Uint8Array[]): Promise<string> => {
    if (isDemo) {
      // Demo mode - simulate transaction
      await new Promise(resolve => setTimeout(resolve, 1500))
      const demoTxId = 'DEMO' + Array.from({ length: 48 }, () => 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
      ).join('')
      return demoTxId
    }

    const client = getAlgodClient()
    
    // Send all transactions
    const { txid } = await client.sendRawTransaction(signedTxns).do()
    
    // Wait for confirmation
    await waitForConfirmation(txid)
    
    return txid
  }, [isDemo])

  const sendPaymentTransaction = useCallback(async (amountMicroAlgos: number, receiver: string): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');
    if (isDemo) {
      return 'DEMO_PAYMENT_TXID_1234567890';
    }
    
    const client = getAlgodClient();
    const params = await client.getTransactionParams().do();
    
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: receiver,
      amount: amountMicroAlgos,
      suggestedParams: params
    });
    
    const encodedTxn = algosdk.encodeUnsignedTransaction(txn);
    const signedTxns = await signTransactions([encodedTxn]);
    const txid = await sendTransactions(signedTxns);
    return txid;
  }, [address, isDemo, signTransactions, sendTransactions]);

  const setDemoMode = useCallback((demo: boolean) => {
    setIsDemo(demo)
    if (!demo && address === DEMO_ADDRESS) {
      setAddress(null)
    }
  }, [address])

  return (
    <WalletContext.Provider value={{
      address,
      isConnected: !!address,
      isConnecting,
      connect,
      disconnect,
      signTransactions,
      sendTransactions,
      sendPaymentTransaction,
      isDemo,
      setDemoMode,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
