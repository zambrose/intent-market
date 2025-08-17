import { NextResponse } from 'next/server'
import { db } from '@/app/lib/db'
import { cdp } from '@/app/lib/cdp'

export async function GET() {
  try {
    // Get all agents with their wallets
    const agents = await db.user.findMany({
      where: { role: 'AGENT' },
      include: { 
        wallet: true,
        agentProfile: true
      }
    })
    
    // Map to simplified format
    const agentWallets = await Promise.all(agents.map(async (agent) => {
      let balance = 0
      if (agent.wallet) {
        try {
          balance = await cdp.getBalance(agent.wallet.address)
        } catch {
          console.warn(`Failed to get balance for ${agent.wallet.address}`)
        }
      }
      
      return {
        id: agent.id,
        email: agent.email,
        walletAddress: agent.wallet?.address || null,
        balance,
        displayName: agent.agentProfile?.displayName || agent.email.split('@')[0]
      }
    }))
    
    return NextResponse.json(agentWallets)
  } catch (error) {
    console.error('Failed to get agent wallets:', error)
    return NextResponse.json(
      { error: 'Failed to get agent wallets' },
      { status: 500 }
    )
  }
}