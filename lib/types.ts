/**
 * ConsentVault - Type Definitions
 * DPDP Act Compliant Consent Management Types
 */

// Core consent record
export interface Consent {
  id: string
  appId: string
  appName: string
  policyHash: string
  timestamp: number
  permissions: Permission[]
  status: 'active' | 'revoked' | 'expired'
  txId: string
  round?: number
  revokedAt?: number
  revokedTxId?: string
  expiresAt?: number
}

// Individual permission
export interface Permission {
  id: string
  name: string
  description: string
  granted: boolean
  category?: 'identity' | 'contact' | 'financial' | 'health' | 'behavioral'
  dpdpCategory?: string // DPDP Act data category
}

// Partner application
export interface PartnerApp {
  id: string
  name: string
  description: string
  category: 'fintech' | 'ecommerce' | 'healthcare' | 'social' | 'government'
  policyVersion: string
  policyUrl: string
  permissions: Permission[]
  icon: string
  verified: boolean
  dpdpCompliant: boolean
}

// Audit trail entry
export interface AuditEntry {
  txId: string
  type: 'consent_created' | 'consent_revoked' | 'consent_verified' | 'opt_in' | 'opt_out'
  userAddress: string
  appId?: string
  appName?: string
  timestamp: number
  round: number
  policyHash?: string
  permissions?: string[]
  logs: string[]
}

// Wallet state
export interface WalletState {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
}

// Transaction result
export interface TxResult {
  txId: string
  confirmed: boolean
  round: number
  logs?: string[]
}

// Demo partner apps with DPDP compliance info
export const PARTNER_APPS: PartnerApp[] = [
  {
    id: 'fintech-securepay',
    name: 'SecurePay Finance',
    description: 'Digital payments and financial services platform for UPI, cards, and loans',
    category: 'fintech',
    policyVersion: '2.1.0',
    policyUrl: 'https://securepay.demo/privacy-policy',
    icon: 'Wallet',
    verified: true,
    dpdpCompliant: true,
    permissions: [
      { 
        id: 'email', 
        name: 'Email Address', 
        description: 'For account verification and transaction alerts',
        granted: true,
        category: 'contact',
        dpdpCategory: 'Contact Information'
      },
      { 
        id: 'phone', 
        name: 'Phone Number', 
        description: 'For OTP verification and two-factor authentication',
        granted: true,
        category: 'contact',
        dpdpCategory: 'Contact Information'
      },
      { 
        id: 'pan', 
        name: 'PAN Details', 
        description: 'Required for KYC compliance under RBI guidelines',
        granted: true,
        category: 'identity',
        dpdpCategory: 'Financial Information'
      },
      { 
        id: 'location', 
        name: 'Location Data', 
        description: 'For fraud prevention and location-based services',
        granted: false,
        category: 'behavioral',
        dpdpCategory: 'Location Data'
      },
      { 
        id: 'transactions', 
        name: 'Transaction History', 
        description: 'To provide spending insights and financial recommendations',
        granted: false,
        category: 'financial',
        dpdpCategory: 'Financial Information'
      },
    ]
  },
  {
    id: 'ecom-shopease',
    name: 'ShopEase Marketplace',
    description: 'E-commerce platform with personalized shopping and fast delivery',
    category: 'ecommerce',
    policyVersion: '1.5.2',
    policyUrl: 'https://shopease.demo/privacy',
    icon: 'ShoppingBag',
    verified: true,
    dpdpCompliant: true,
    permissions: [
      { 
        id: 'email', 
        name: 'Email Address', 
        description: 'For order confirmations and shipping updates',
        granted: true,
        category: 'contact',
        dpdpCategory: 'Contact Information'
      },
      { 
        id: 'address', 
        name: 'Shipping Address', 
        description: 'For delivery of your orders',
        granted: true,
        category: 'contact',
        dpdpCategory: 'Contact Information'
      },
      { 
        id: 'phone', 
        name: 'Phone Number', 
        description: 'For delivery coordination and OTP verification',
        granted: true,
        category: 'contact',
        dpdpCategory: 'Contact Information'
      },
      { 
        id: 'purchase_history', 
        name: 'Purchase History', 
        description: 'For personalized product recommendations',
        granted: false,
        category: 'behavioral',
        dpdpCategory: 'Behavioral Data'
      },
      { 
        id: 'browsing', 
        name: 'Browsing Behavior', 
        description: 'For showing relevant products and offers',
        granted: false,
        category: 'behavioral',
        dpdpCategory: 'Behavioral Data'
      },
    ]
  },
  {
    id: 'health-medicare',
    name: 'MediCare Health',
    description: 'Digital health records, telemedicine, and wellness tracking',
    category: 'healthcare',
    policyVersion: '3.0.1',
    policyUrl: 'https://medicare.demo/privacy-policy',
    icon: 'Heart',
    verified: true,
    dpdpCompliant: true,
    permissions: [
      { 
        id: 'email', 
        name: 'Email Address', 
        description: 'For appointment reminders and health tips',
        granted: true,
        category: 'contact',
        dpdpCategory: 'Contact Information'
      },
      { 
        id: 'dob', 
        name: 'Date of Birth', 
        description: 'For accurate medical records and age-appropriate care',
        granted: true,
        category: 'identity',
        dpdpCategory: 'Personal Identifiers'
      },
      { 
        id: 'health', 
        name: 'Health Records', 
        description: 'To maintain your medical history and provide better care',
        granted: true,
        category: 'health',
        dpdpCategory: 'Sensitive Personal Data'
      },
      { 
        id: 'biometric', 
        name: 'Biometric Data', 
        description: 'For health monitoring devices integration',
        granted: false,
        category: 'health',
        dpdpCategory: 'Sensitive Personal Data'
      },
      { 
        id: 'location', 
        name: 'Location', 
        description: 'For finding nearby clinics and emergency services',
        granted: false,
        category: 'behavioral',
        dpdpCategory: 'Location Data'
      },
    ]
  },
]

// Permission category colors
export const PERMISSION_CATEGORY_COLORS: Record<string, string> = {
  identity: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  contact: 'bg-green-500/20 text-green-400 border-green-500/30',
  financial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  health: 'bg-red-500/20 text-red-400 border-red-500/30',
  behavioral: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

// Helper functions
export function formatAddress(address: string, chars = 6): string {
  if (!address || address.length < chars * 2) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - timestamp
  
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
  
  return formatDate(timestamp)
}

export function generatePolicyHash(appId: string, policyVersion: string, permissions: string[]): string {
  const input = `${appId}:${policyVersion}:${permissions.sort().join(',')}`
  // Simple hash for demo (in production, use SHA256)
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(64, '0')
}

// Algorand explorer URLs
export function getExplorerTxUrl(txId: string): string {
  return `https://testnet.algoexplorer.io/tx/${txId}`
}

export function getExplorerAddressUrl(address: string): string {
  return `https://testnet.algoexplorer.io/address/${address}`
}

export function getExplorerAppUrl(appId: number): string {
  return `https://testnet.algoexplorer.io/application/${appId}`
}
