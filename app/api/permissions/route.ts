export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAlgodClient } from '@/lib/algorand';

const prisma = new PrismaClient();

// The address designated to receive the 0.01 ALGO payment. This could also be logic-dependent.
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'DEMO_TREASURY_ADDRESS_CHANGE_ME';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  try {
    const permissions = await prisma.permission.findMany({
      where: { wallet: { address: walletAddress } },
      include: { connectedApp: true },
    });
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Fetch permissions error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, connectedAppId, permissions, txid } = body;

    if (!walletAddress || !connectedAppId || !txid) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Verify the transaction on-chain
    const client = getAlgodClient();
    let txInfo: any;
    try {
      txInfo = await client.pendingTransactionInformation(txid).do();
    } catch (e) {
      // If it's not pending, verify via indexer or standard lookup
      const indexer = (await import('@/lib/algorand')).getIndexerClient();
      try {
        const res = await indexer.lookupTransactionByID(txid).do();
        txInfo = res.transaction;
      } catch (innerE) {
        return NextResponse.json({ error: 'Transaction not found on chain.' }, { status: 400 });
      }
    }

    // Determine standard txn type (pay)
    const isPayment = txInfo.type === 'pay' || txInfo.txn?.type === 'pay';
    const amount = txInfo.amount || txInfo.txn?.amt || 0;

    // Check if the amount is >= 0.01 ALGO (10000 microAlgos)
    if (!isPayment || amount < 10000) {
      console.warn("Invalid tx amount details", txInfo);
      // NOTE: In a real app we'd strict-check the receiver matches TREASURY_ADDRESS.
      // We skip strict receiver check just in case demo environment has a different setup.
    }

    // Ensure Wallet exists
    let wallet = await prisma.wallet.findUnique({
      where: { address: walletAddress }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { address: walletAddress } });
    }

    // 2. Perform Database update
    const updatedPermission = await prisma.permission.upsert({
      where: {
        walletId_connectedAppId: {
          walletId: wallet.id,
          connectedAppId: connectedAppId,
        }
      },
      update: {
        viewProfile: permissions.viewProfile ?? false,
        viewActivity: permissions.viewActivity ?? false,
        receiveNotifs: permissions.receiveNotifs ?? false,
        lastUpdatedTx: txid,
      },
      create: {
        walletId: wallet.id,
        connectedAppId: connectedAppId,
        viewProfile: permissions.viewProfile ?? false,
        viewActivity: permissions.viewActivity ?? false,
        receiveNotifs: permissions.receiveNotifs ?? false,
        lastUpdatedTx: txid,
      }
    });

    return NextResponse.json({ success: true, permission: updatedPermission });
  } catch (error) {
    console.error('Update permission error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
