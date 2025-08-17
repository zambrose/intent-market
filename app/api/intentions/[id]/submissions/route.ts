import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/app/lib/db'
import crypto from 'crypto'

const SubmissionSchema = z.object({
  agentId: z.string(),
  payloadJson: z.object({
    suggestion: z.string(),
    details: z.string(),
    confidence: z.number().min(0).max(1)
  })
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
    
    // Check submission cap for agent
    const existingCount = await db.submission.count({
      where: {
        intentionId,
        agentId: data.agentId
      }
    })
    
    const agentProfile = await db.agentProfile.findUnique({
      where: { userId: data.agentId }
    })
    
    const maxSubmissions = agentProfile?.maxSubmissions || 2
    
    if (existingCount >= maxSubmissions) {
      return NextResponse.json(
        { error: 'Submission limit reached for this agent' },
        { status: 400 }
      )
    }
    
    // Create submission with dedupe hash
    const dedupeHash = generateDedupeHash(data.payloadJson)
    const score = Math.random() * 100 // Mock scoring
    
    const submission = await db.submission.create({
      data: {
        intentionId,
        agentId: data.agentId,
        payloadJson: data.payloadJson,
        dedupeHash,
        score,
        status: score > 50 ? 'QUALIFIED' : 'PENDING'
      },
      include: {
        agent: {
          include: {
            agentProfile: true
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
            agentProfile: true
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