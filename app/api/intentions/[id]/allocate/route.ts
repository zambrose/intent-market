import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/app/lib/db'
import { cdp } from '@/app/lib/cdp'
import { allocateRewards } from '@/app/lib/alloc'
import { Decimal } from '@prisma/client/runtime/library'

const AllocateSchema = z.object({
  selectedSubmissionIds: z.array(z.string()).optional()
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: intentionId } = await params
    const body = await req.json()
    const data = AllocateSchema.parse(body)
    
    // Get intention with submissions
    const intention = await db.intention.findUnique({
      where: { id: intentionId },
      include: {
        submissions: true,
        user: {
          include: { wallet: true }
        }
      }
    })
    
    if (!intention) {
      return NextResponse.json(
        { error: 'Intention not found' },
        { status: 404 }
      )
    }
    
    if (intention.status !== 'OPEN' && intention.status !== 'CLOSED') {
      return NextResponse.json(
        { error: 'Intention not ready for allocation' },
        { status: 400 }
      )
    }
    
    // Run allocation algorithm
    const allocationResult = allocateRewards({
      budgetUsd: Number(intention.budgetUsd),
      winnersCount: intention.winnersCount,
      participationUsd: Number(intention.participationUsd),
      selectionUsd: Number(intention.selectionUsd),
      threshold: 50, // Default threshold
      submissions: intention.submissions.map(s => ({
        id: s.id,
        score: s.score || 0,
        dedupeHash: s.dedupeHash,
        agentId: s.agentId,
        status: s.status
      })),
      selectedIds: data.selectedSubmissionIds
    })
    
    // Update intention status
    await db.intention.update({
      where: { id: intentionId },
      data: { status: 'PAYOUTS_PENDING' }
    })
    
    // Create payout records and trigger CDP transfers
    const payouts = []
    
    // Participation payouts
    for (const submissionId of allocationResult.participationIds) {
      const submission = intention.submissions.find(s => s.id === submissionId)
      if (!submission) continue
      
      const agentWallet = await db.wallet.findFirst({
        where: { userId: submission.agentId }
      })
      
      if (agentWallet && intention.user.wallet) {
        const payout = await db.payout.create({
          data: {
            submissionId,
            walletFrom: intention.user.wallet.address,
            walletTo: agentWallet.address,
            amountUsd: new Decimal(intention.participationUsd),
            kind: 'PARTICIPATION',
            status: 'PENDING'
          }
        })
        
        // Trigger CDP transfer with real wallet data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userWalletData = intention.user.wallet.walletData as any
        const transfer = await cdp.transferUsdc(
          userWalletData,
          agentWallet.address,
          Number(intention.participationUsd)
        )
        
        await db.payout.update({
          where: { id: payout.id },
          data: { 
            txHash: transfer.txHash,
            status: 'SENT'
          }
        })
        
        payouts.push(payout)
      }
    }
    
    // Selection payouts
    for (const submissionId of allocationResult.selectionIds) {
      const submission = intention.submissions.find(s => s.id === submissionId)
      if (!submission) continue
      
      const agentWallet = await db.wallet.findFirst({
        where: { userId: submission.agentId }
      })
      
      if (agentWallet && intention.user.wallet) {
        const payout = await db.payout.create({
          data: {
            submissionId,
            walletFrom: intention.user.wallet.address,
            walletTo: agentWallet.address,
            amountUsd: new Decimal(intention.selectionUsd),
            kind: 'SELECTION',
            status: 'PENDING'
          }
        })
        
        // Trigger CDP transfer with real wallet data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userWalletData = intention.user.wallet.walletData as any
        const transfer = await cdp.transferUsdc(
          userWalletData,
          agentWallet.address,
          Number(intention.selectionUsd)
        )
        
        await db.payout.update({
          where: { id: payout.id },
          data: { 
            txHash: transfer.txHash,
            status: 'SENT'
          }
        })
        
        payouts.push(payout)
      }
      
      // Mark submission as selected
      await db.submission.update({
        where: { id: submissionId },
        data: { status: 'SELECTED' }
      })
    }
    
    // Update intention to complete
    await db.intention.update({
      where: { id: intentionId },
      data: { status: 'COMPLETE' }
    })
    
    return NextResponse.json({
      success: true,
      allocation: allocationResult,
      payouts: payouts.length
    })
  } catch (error) {
    console.error('Allocation error:', error)
    return NextResponse.json(
      { error: 'Failed to allocate rewards' },
      { status: 500 }
    )
  }
}