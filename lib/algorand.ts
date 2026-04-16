/**
 * ConsentVault - Algorand Client & Utilities
 * Handles all blockchain interactions with Algorand TestNet
 */

import algosdk from 'algosdk'

// Network configuration
const ALGOD_SERVER = process.env.NEXT_PUBLIC_ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
const ALGOD_PORT = ''
const ALGOD_TOKEN = ''

const INDEXER_SERVER = process.env.NEXT_PUBLIC_INDEXER_SERVER || 'https://testnet-idx.algonode.cloud'
const INDEXER_PORT = ''
const INDEXER_TOKEN = ''

export const APP_ID = parseInt(process.env.NEXT_PUBLIC_APP_ID || '0', 10)

// Permission bitmask mapping
export const PERMISSION_BITS = {
  email: 1 << 0,
  phone: 1 << 1,
  location: 1 << 2,
  purchase_history: 1 << 3,
  biometric: 1 << 4,
  financial: 1 << 5,
  health: 1 << 6,
  address: 1 << 7,
  pan: 1 << 8,
  dob: 1 << 9,
  browsing: 1 << 10,
  wishlist: 1 << 11,
  transactions: 1 << 12,
} as const

export type PermissionKey = keyof typeof PERMISSION_BITS

// Initialize clients
let algodClient: algosdk.Algodv2 | null = null
let indexerClient: algosdk.Indexer | null = null

export function getAlgodClient(): algosdk.Algodv2 {
  if (!algodClient) {
    algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
  }
  return algodClient
}

export function getIndexerClient(): algosdk.Indexer {
  if (!indexerClient) {
    indexerClient = new algosdk.Indexer(INDEXER_TOKEN, INDEXER_SERVER, INDEXER_PORT)
  }
  return indexerClient
}

// Get account info
export async function getAccountInfo(address: string): Promise<{
  balance: number
  isOptedIn: boolean
  localState: Record<string, unknown> | null
}> {
  const client = getAlgodClient()
  
  try {
    const accountInfo = await client.accountInformation(address).do()
    const balance = Number(accountInfo.amount) / 1_000_000
    
    // Check if opted into our app
    const appsLocalState = accountInfo['apps-local-state'] || []
    const ourAppState = appsLocalState.find((app: { id: number }) => app.id === APP_ID)
    
    let localState: Record<string, unknown> | null = null
    if (ourAppState) {
      localState = parseLocalState(ourAppState['key-value'] || [])
    }
    
    return {
      balance,
      isOptedIn: !!ourAppState,
      localState,
    }
  } catch (error) {
    console.error('Error getting account info:', error)
    throw error
  }
}

// Parse local state from Algorand format
function parseLocalState(keyValues: Array<{ key: string; value: { type: number; bytes?: string; uint?: number } }>): Record<string, unknown> {
  const state: Record<string, unknown> = {}
  
  for (const kv of keyValues) {
    const key = Buffer.from(kv.key, 'base64').toString()
    
    if (kv.value.type === 1) {
      // Bytes
      state[key] = Buffer.from(kv.value.bytes || '', 'base64').toString()
    } else {
      // Uint
      state[key] = kv.value.uint
    }
  }
  
  return state
}

// Create opt-in transaction
export async function createOptInTxn(address: string): Promise<algosdk.Transaction> {
  const client = getAlgodClient()
  const params = await client.getTransactionParams().do()
  
  return algosdk.makeApplicationOptInTxn(address, params, APP_ID)
}

// Create consent transaction
export async function createConsentTxn(
  address: string,
  appId: string,
  policyHash: string,
  permissions: PermissionKey[]
): Promise<algosdk.Transaction> {
  const client = getAlgodClient()
  const params = await client.getTransactionParams().do()
  
  // Calculate permissions bitmask
  let permissionsBitmask = 0
  for (const perm of permissions) {
    permissionsBitmask |= PERMISSION_BITS[perm] || 0
  }
  
  // Create application call
  const appArgs = [
    new Uint8Array(Buffer.from('create')),
    new Uint8Array(Buffer.from(appId)),
    new Uint8Array(Buffer.from(policyHash)),
    algosdk.encodeUint64(permissionsBitmask),
    algosdk.encodeUint64(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60), // 1 year expiry
  ]
  
  return algosdk.makeApplicationNoOpTxn(address, params, APP_ID, appArgs)
}

// Create revoke transaction
export async function createRevokeTxn(
  address: string,
  consentIndex: number
): Promise<algosdk.Transaction> {
  const client = getAlgodClient()
  const params = await client.getTransactionParams().do()
  
  const appArgs = [
    new Uint8Array(Buffer.from('revoke')),
    algosdk.encodeUint64(consentIndex),
  ]
  
  return algosdk.makeApplicationNoOpTxn(address, params, APP_ID, appArgs)
}

// Create verify transaction
export async function createVerifyTxn(
  callerAddress: string,
  userAddress: string,
  consentIndex: number
): Promise<algosdk.Transaction> {
  const client = getAlgodClient()
  const params = await client.getTransactionParams().do()
  
  const appArgs = [
    new Uint8Array(Buffer.from('verify')),
    algosdk.decodeAddress(userAddress).publicKey,
    algosdk.encodeUint64(consentIndex),
  ]
  
  return algosdk.makeApplicationNoOpTxn(callerAddress, params, APP_ID, appArgs)
}

// Wait for transaction confirmation
export async function waitForConfirmation(txId: string): Promise<{
  confirmed: boolean
  round: number
  logs?: string[]
}> {
  const client = getAlgodClient()
  
  const result = await algosdk.waitForConfirmation(client, txId, 4)
  
  return {
    confirmed: true,
    round: result['confirmed-round'],
    logs: result.logs?.map((log: string) => Buffer.from(log, 'base64').toString()),
  }
}

// Query consent history from indexer
export async function queryConsentHistory(address: string): Promise<Array<{
  txId: string
  type: 'consent_created' | 'consent_revoked'
  round: number
  timestamp: number
  appId?: string
  logs: string[]
}>> {
  const indexer = getIndexerClient()
  
  try {
    const response = await indexer
      .searchForTransactions()
      .address(address)
      .applicationID(APP_ID)
      .do()
    
    const history: Array<{
      txId: string
      type: 'consent_created' | 'consent_revoked'
      round: number
      timestamp: number
      appId?: string
      logs: string[]
    }> = []
    
    for (const txn of response.transactions || []) {
      const logs = (txn.logs || []).map((log: string) => 
        Buffer.from(log, 'base64').toString()
      )
      
      // Determine type from logs
      let type: 'consent_created' | 'consent_revoked' = 'consent_created'
      let appIdFromLog: string | undefined
      
      for (const log of logs) {
        if (log.startsWith('ConsentRevoked:')) {
          type = 'consent_revoked'
        } else if (log.startsWith('ConsentCreated:')) {
          type = 'consent_created'
          // Parse app ID from log
          const parts = log.split(':')
          if (parts.length >= 4) {
            appIdFromLog = parts[3]
          }
        }
      }
      
      history.push({
        txId: txn.id,
        type,
        round: txn['confirmed-round'],
        timestamp: txn['round-time'],
        appId: appIdFromLog,
        logs,
      })
    }
    
    return history.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('Error querying consent history:', error)
    return []
  }
}

// Query audit trail for a company
export async function queryAuditTrail(options: {
  userAddress?: string
  limit?: number
  afterTime?: number
}): Promise<Array<{
  txId: string
  type: string
  userAddress: string
  round: number
  timestamp: number
  logs: string[]
}>> {
  const indexer = getIndexerClient()
  
  try {
    let query = indexer
      .searchForTransactions()
      .applicationID(APP_ID)
      .limit(options.limit || 100)
    
    if (options.userAddress) {
      query = query.address(options.userAddress)
    }
    
    if (options.afterTime) {
      query = query.afterTime(new Date(options.afterTime * 1000).toISOString())
    }
    
    const response = await query.do()
    
    return (response.transactions || []).map((txn: {
      id: string
      sender: string
      'confirmed-round': number
      'round-time': number
      logs?: string[]
    }) => ({
      txId: txn.id,
      type: 'application_call',
      userAddress: txn.sender,
      round: txn['confirmed-round'],
      timestamp: txn['round-time'],
      logs: (txn.logs || []).map((log: string) => 
        Buffer.from(log, 'base64').toString()
      ),
    }))
  } catch (error) {
    console.error('Error querying audit trail:', error)
    return []
  }
}

// Get global app state
export async function getAppGlobalState(): Promise<{
  consentCounter: number
  admin: string
} | null> {
  const client = getAlgodClient()
  
  try {
    const appInfo = await client.getApplicationByID(APP_ID).do()
    const globalState = appInfo.params['global-state'] || []
    
    let consentCounter = 0
    let admin = ''
    
    for (const kv of globalState) {
      const key = Buffer.from(kv.key, 'base64').toString()
      
      if (key === 'consent_counter') {
        consentCounter = kv.value.uint
      } else if (key === 'admin') {
        admin = algosdk.encodeAddress(Buffer.from(kv.value.bytes, 'base64'))
      }
    }
    
    return { consentCounter, admin }
  } catch (error) {
    console.error('Error getting app global state:', error)
    return null
  }
}

// Generate SHA256 hash for policy document
export async function hashPolicy(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
