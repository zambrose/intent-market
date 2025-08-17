import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/app/lib/db'
import { cdp } from '@/app/lib/cdp'
import { Decimal } from '@prisma/client/runtime/library'

const TransferSchema = z.object({
  fromUserId: z.string(),
  toUserId: z.string(),
  amountUsd: z.number().positive(),
  intentionId: z.string(),
  kind: z.enum(['PARTICIPATION', 'SELECTION'])
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = TransferSchema.parse(body)
    
    // Get wallets for both users
    const [fromWallet, toWallet] = await Promise.all([
      db.wallet.findUnique({
        where: { userId: data.fromUserId },
        include: { user: true }
      }),
      db.wallet.findUnique({
        where: { userId: data.toUserId },
        include: { user: true }
      })
    ])
    
    if (!fromWallet) {
      console.error(`❌ No wallet found for sender user: ${data.fromUserId}`)
      return NextResponse.json(
        { error: `Wallet not found for sender user: ${data.fromUserId}` },
        { status: 404 }
      )
    }
    
    if (!toWallet) {
      console.error(`❌ No wallet found for recipient user: ${data.toUserId}`)
      return NextResponse.json(
        { error: `Wallet not found for recipient user: ${data.toUserId}` },
        { status: 404 }
      )
    }
    
    console.log(`💸 Transferring ${data.amountUsd} USDC from ${fromWallet.user.email} to ${toWallet.user.email}`)
    
    // Perform the transfer using CDP
    const result = await cdp.transferUsdc(
      fromWallet.walletData,
      toWallet.address,
      data.amountUsd
    )
    
    // Record the payout in database
    const submission = await db.submission.findFirst({
      where: {
        intentionId: data.intentionId,
        agentId: data.toUserId
      }
    })
    
    if (submission) {
      await db.payout.create({
        data: {
          submissionId: submission.id,
          walletFrom: fromWallet.address,
          walletTo: toWallet.address,
          amountUsd: new Decimal(data.amountUsd),
          txHash: result.txHash,
          kind: data.kind,
          status: result.status === 'success' ? 'CONFIRMED' : 'SENT'
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      from: fromWallet.address,
      to: toWallet.address,
      amount: data.amountUsd,
      status: result.status
    })
  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json(
      { error: 'Failed to complete transfer' },
      { status: 500 }
    )
  }
}