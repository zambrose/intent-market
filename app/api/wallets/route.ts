import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/app/lib/db'
import { cdp } from '@/app/lib/cdp'

const CreateWalletSchema = z.object({
  userId: z.string()
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateWalletSchema.parse(body)
    
    // Check if user already has a wallet
    const existingWallet = await db.wallet.findUnique({
      where: { userId: data.userId }
    })
    
    if (existingWallet) {
      return NextResponse.json(existingWallet)
    }
    
    // Create CDP wallet
    const cdpWallet = await cdp.createWallet(data.userId)
    
    // Store wallet in database
    const wallet = await db.wallet.create({
      data: {
        userId: data.userId,
        cdpWalletId: cdpWallet.cdpWalletId,
        address: cdpWallet.address,
        network: cdpWallet.network,
        walletData: cdpWallet.walletData // Store encrypted wallet data
      }
    })
    
    console.log(`✅ Created wallet for user ${data.userId}: ${wallet.address}`)
    
    // Don't return sensitive wallet data to client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { walletData, ...safeWallet } = wallet
    return NextResponse.json(safeWallet)
  } catch (error) {
    console.error('Create wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 400 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      )
    }
    
    const wallet = await db.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        address: true,
        network: true,
        createdAt: true
      }
    })
    
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }
    
    // Get current balance
    const balance = await cdp.getBalance(wallet.address)
    
    return NextResponse.json({
      ...wallet,
      balance
    })
  } catch (error) {
    console.error('Get wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to get wallet' },
      { status: 500 }
    )
  }
}