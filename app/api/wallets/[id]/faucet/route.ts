import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/app/lib/db'
import { cdp } from '@/app/lib/cdp'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: walletId } = await params
    
    // Get wallet from database
    const wallet = await db.wallet.findUnique({
      where: { id: walletId }
    })
    
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }
    
    // Request USDC from faucet
    const txHash = await cdp.requestFromFaucet(wallet.address)
    
    return NextResponse.json({
      success: true,
      txHash,
      message: `Testnet USDC requested for ${wallet.address}`
    })
  } catch (error) {
    console.error('Faucet request error:', error)
    return NextResponse.json(
      { error: 'Failed to request from faucet' },
      { status: 500 }
    )
  }
}