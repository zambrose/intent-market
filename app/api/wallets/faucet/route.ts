import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cdp } from '@/app/lib/cdp'

const FaucetRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = FaucetRequestSchema.parse(body)
    
    // Request USDC from faucet
    const txHash = await cdp.requestFromFaucet(data.address)
    
    return NextResponse.json({
      success: true,
      txHash,
      message: `Faucet request sent to ${data.address}`
    })
  } catch (error) {
    console.error('Faucet request error:', error)
    
    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes('rate')) {
      return NextResponse.json(
        { error: 'Faucet rate limited. Please wait a few minutes and try again.' },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to request from faucet' },
      { status: 400 }
    )
  }
}