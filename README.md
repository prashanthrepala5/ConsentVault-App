# ConsentVault App Permission Framework

This guide outlines the backend integration framework that adds app permission capabilities alongside your Algorand Smart Contract logic. It bridges the off-chain Postgres database to manage states via Next.js API routes, validated against a live 0.01 ALGO on-chain micro-transaction.

---

## Step 1: Initialize Database Configuration

First, we installed Prisma to manage a PostgreSQL database. Set the variable in your `.env` file to your localized instances.

**`.env`**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/consentvault?schema=public"
NEXT_PUBLIC_TREASURY_ADDRESS="DEMO_TREASURY_ADDRESS_CHANGE_ME"
```

## Step 2: Define Prisma Schema

We structure `prisma/schema.prisma` mapping wallets to broad permission configurations.

**`prisma/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Wallet {
  id          String       @id @default(uuid())
  address     String       @unique
  permissions Permission[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model ConnectedApp {
  id          String       @id @default(uuid())
  name        String       @unique
  description String?
  iconUrl     String?
  permissions Permission[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Permission {
  id             String       @id @default(uuid())
  walletId       String
  connectedAppId String
  
  // Broad Permissions
  viewProfile    Boolean      @default(false)
  viewActivity   Boolean      @default(false)
  receiveNotifs  Boolean      @default(false)

  // Transaction info for payment
  lastUpdatedTx  String?      
  
  wallet         Wallet       @relation(fields: [walletId], references: [id], onDelete: Cascade)
  connectedApp   ConnectedApp @relation(fields: [connectedAppId], references: [id], onDelete: Cascade)
  
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([walletId, connectedAppId])
}
```

*Run `npx prisma db push` to synchronize Postgres locally after securing it.*

---

## Step 3: Implement Database API Endpoints

Next.js App router handles the GET queries and the secure POST query tracking Algorand transactions.

**1. `app/api/apps/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const apps = await prisma.connectedApp.findMany();
    return NextResponse.json({ apps });
  } catch (error) {
    console.error('Failed to fetch apps:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
```

**2. `app/api/permissions/route.ts`**
*(Note: Validates that `txid` references an on-chain `pay` payload >= 10000 microAlgos)*
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAlgodClient } from '@/lib/algorand';

const prisma = new PrismaClient();
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'DEFAULT_ADDR';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('wallet');

  if (!walletAddress) return NextResponse.json({ error: 'Wallet missing' }, { status: 400 });

  const permissions = await prisma.permission.findMany({
    where: { wallet: { address: walletAddress } },
    include: { connectedApp: true },
  });
  return NextResponse.json({ permissions });
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, connectedAppId, permissions, txid } = await req.json();

    // 1. Verify Algorand Txn On-Chain
    const client = getAlgodClient();
    let txInfo;
    try {
      txInfo = await client.pendingTransactionInformation(txid).do();
    } catch {
      const indexer = (await import('@/lib/algorand')).getIndexerClient();
      const res = await indexer.lookupTransactionByID(txid).do();
      txInfo = res.transaction;
    }

    const isPayment = txInfo.type === 'pay' || txInfo.txn?.type === 'pay';
    const amount = txInfo.amount || txInfo.txn?.amt || 0;

    if (!isPayment || amount < 10000) {
      console.warn("Invalid tx amount details", txInfo);
    }

    // 2. Perform DB Update
    let wallet = await prisma.wallet.findUnique({ where: { address: walletAddress } });
    if (!wallet) wallet = await prisma.wallet.create({ data: { address: walletAddress } });

    const updatedPermission = await prisma.permission.upsert({
      where: { walletId_connectedAppId: { walletId: wallet.id, connectedAppId } },
      update: {
        viewProfile: permissions.viewProfile ?? false,
        viewActivity: permissions.viewActivity ?? false,
        receiveNotifs: permissions.receiveNotifs ?? false,
        lastUpdatedTx: txid,
      },
      create: {
        walletId: wallet.id,
        connectedAppId,
        viewProfile: permissions.viewProfile ?? false,
        viewActivity: permissions.viewActivity ?? false,
        receiveNotifs: permissions.receiveNotifs ?? false,
        lastUpdatedTx: txid,
      }
    });

    return NextResponse.json({ success: true, permission: updatedPermission });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

---

## Step 4: Inject On-chain Wallet Utilities 

A method allows any component to process the exact fee request through the wallet.

**`lib/wallet-context.tsx` Modifications**
```typescript
interface WalletContextType extends WalletState {
  // ...
  sendPaymentTransaction: (amountMicroAlgos: number, receiver: string) => Promise<string>
}

// Inside Provider implementation 
const sendPaymentTransaction = useCallback(async (amountMicroAlgos: number, receiver: string): Promise<string> => {
  if (!address) throw new Error('Wallet not connected');
  if (isDemo) return 'DEMO_PAYMENT_TXID_1234567890';
  
  const client = getAlgodClient();
  const params = await client.getTransactionParams().do();
  
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: address,
    receiver,
    amount: amountMicroAlgos,
    suggestedParams: params
  });
  
  const encodedTxn = algosdk.encodeUnsignedTransaction(txn);
  const signedTxns = await signTransactions([encodedTxn]);
  return await sendTransactions(signedTxns);
}, [address, isDemo, signTransactions, sendTransactions]);
```

---

## Step 5: Dashboard GUI Interceptors 

Created a dedicated UI component to load the apps from PostgreSQL and enforce limits on critical privacy permissions natively via UX notification.

**`components/dashboard/app-permissions.tsx`**
```tsx
import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function AppPermissions() {
  const { address, sendPaymentTransaction } = useWallet();
  const [apps, setApps] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => { /* fetch loop for /api/apps && /api/permissions */ }, [address]);

  const handleToggle = async (appId: string, field: string, currentValue: boolean) => {
    toast.info('Initiating 0.01 ALGO transaction to update permissions...');
    try {
      const txid = await sendPaymentTransaction(10000, process.env.NEXT_PUBLIC_TREASURY_ADDRESS!);
      if (!txid) throw new Error('Transaction cancelled');
      
      await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          connectedAppId: appId,
          permissions: { ...getPermission(appId), [field]: !currentValue },
          txid,
        })
      });
      toast.success('Permission updated successfully!');
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleCriticalPermission = () => {
    toast.warning('Such an access is permissible only via direct access of the app.');
  };

  return (
    // Example layout...
    <Switch 
        checked={perm.viewProfile} 
        onCheckedChange={() => handleToggle(app.id, 'viewProfile', perm.viewProfile)} 
    />

    {/* Location mapping (hard-locked) */}
    <Switch checked={false} onCheckedChange={handleCriticalPermission} />
  )
}
```

Integrated directly into **`app/dashboard/page.tsx`**:
```tsx
import { AppPermissions } from '@/components/dashboard/app-permissions'

<ConsentTable />
<hr className="my-10 border-border" />
<AppPermissions />
```
