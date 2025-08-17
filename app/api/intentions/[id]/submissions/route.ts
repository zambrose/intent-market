import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/app/lib/db'
import { generateAgentResponse } from '@/app/lib/openai'
import { Decimal } from '@prisma/client/runtime/library'
import crypto from 'crypto'

const SubmissionSchema = z.object({
  agentId: z.string(),
  agentIndex: z.number().optional(),
  useOpenAI: z.boolean().optional(),
  payloadJson: z.object({
    suggestion: z.string(),
    details: z.string(),
    confidence: z.number().min(0).max(1)
  }).optional()
})

function generateDedupeHash(payload: unknown): string {
  const normalized = JSON.stringify(payload)
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: intentionId } = await params
    const body = await req.json()
    const data = SubmissionSchema.parse(body)
    
    // Check if intention is open
    const intention = await db.intention.findUnique({
      where: { id: intentionId }
    })
    
    if (!intention || intention.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Intention not open for submissions' },
        { status: 400 }
      )
    }
    
    // Ensure agent exists or create
    let agent = await db.user.findUnique({
      where: { id: data.agentId },
      include: { agentProfile: true }
    })
    
    if (!agent) {
      // Create agent with real CDP wallet
      const { cdp } = await import('@/app/lib/cdp')
      const cdpWallet = await cdp.createWallet(data.agentId)
      
      agent = await db.user.create({
        data: {
          id: data.agentId,
          email: `${data.agentId}@intent.market`,
          role: 'AGENT',
          wallet: {
            create: {
              cdpWalletId: cdpWallet.cdpWalletId,
              address: cdpWallet.address,
              network: cdpWallet.network,
              walletData: cdpWallet.walletData
            }
          },
          agentProfile: {
            create: {
              displayName: data.agentId,
              maxSubmissions: 3,
              bio: 'AI Agent',
              personality: 'Helpful assistant',
              stakedAmount: new Decimal(10),
              totalEarnings: new Decimal(0),
              winRate: 0,
              totalSubmissions: 0
            }
          }
        },
        include: {
          agentProfile: true,
          wallet: true
        }
      })
      
      console.log(`Created agent ${data.agentId} with wallet: ${cdpWallet.address}`)
    }
    
    // Check submission cap for agent
    const existingCount = await db.submission.count({
      where: {
        intentionId,
        agentId: agent.id
      }
    })
    
    const agentProfile = agent.agentProfile
    
    const maxSubmissions = agentProfile?.maxSubmissions || 2
    
    if (existingCount >= maxSubmissions) {
      return NextResponse.json(
        { error: 'Submission limit reached for this agent' },
        { status: 400 }
      )
    }
    
    // Generate response using OpenAI if requested
    let payloadJson = data.payloadJson
    if (!payloadJson && data.agentIndex !== undefined) {
      console.log(`🎯 API: Generating response for agent ${data.agentId}, useOpenAI=${data.useOpenAI}`)
      
      const suggestion = await generateAgentResponse(
        intention.title + ' - ' + intention.description,
        data.agentIndex,
        data.useOpenAI !== false
      )
      
      console.log(`💬 API: Got suggestion: "${suggestion}"`)
      
      payloadJson = {
        suggestion: suggestion,
        details: suggestion,
        confidence: 0.7 + Math.random() * 0.3
      }
      
      console.log(`📦 API: Final payloadJson:`, payloadJson)
    }
    
    if (!payloadJson) {
      return NextResponse.json(
        { error: 'No payload provided' },
        { status: 400 }
      )
    }
    
    // Create submission with dedupe hash
    const dedupeHash = generateDedupeHash(payloadJson)
    const score = 50 + Math.random() * 50 // Score between 50-100
    
    const submission = await db.submission.create({
      data: {
        intentionId,
        agentId: agent.id,
        payloadJson,
        dedupeHash,
        score,
        status: score > 50 ? 'QUALIFIED' : 'PENDING'
      },
      include: {
        agent: {
          include: {
            agentProfile: true,
            wallet: {
              select: {
                address: true
              }
            }
          }
        }
      }
    })
    
    return NextResponse.json(submission)
  } catch (error) {
    console.error('Create submission error:', error)
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 400 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: intentionId } = await params
    
    const submissions = await db.submission.findMany({
      where: { intentionId },
      include: {
        agent: {
          include: {
            agentProfile: true,
            wallet: {
              select: {
                address: true
              }
            }
          }
        }
      },
      orderBy: { score: 'desc' }
    })
    
    return NextResponse.json(submissions)
  } catch (error) {
    console.error('List submissions error:', error)
    return NextResponse.json(
      { error: 'Failed to list submissions' },
      { status: 500 }
    )
  }
}