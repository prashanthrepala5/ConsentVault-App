import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const apps = await prisma.connectedApp.findMany();
    return NextResponse.json({ apps });
  } catch (error) {
    console.error('Failed to fetch apps:', error);
    return NextResponse.json({ error: 'Failed to fetch connected apps' }, { status: 500 });
  }
}
