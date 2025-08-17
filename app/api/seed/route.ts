import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/app/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(req: NextRequest) {
  try {
    // Check for a secret to protect this endpoint
    const { searchParams } = new URL(req.url)
    const secret = searchParams.get('secret')
    const force = searchParams.get('force') === 'true'
    
    if (secret !== process.env.SEED_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid secret' },
        { status: 401 }
      )
    }

    // Check if already seeded (look for agents specifically)
    const existingAgents = await db.agentProfile.count()
    const existingUsers = await db.user.count()
    
    // If force flag is set, clean everything
    if (force) {
      console.log('Force flag set, cleaning all data...')
      // Delete in correct order to respect foreign keys
      await db.submission.deleteMany({})
      await db.intention.deleteMany({})
      await db.agentProfile.deleteMany({})
      await db.wallet.deleteMany({})
      await db.user.deleteMany({})
      console.log('All data cleaned')
    } else {
      // If we have agents already, don't reseed
      if (existingAgents > 0) {
        return NextResponse.json({
          message: 'Database already seeded. Use ?force=true to reseed.',
          userCount: existingUsers,
          agentCount: existingAgents
        })
      }
      
      // If we have users but no agents, we need to clean up and reseed
      if (existingUsers > 0 && existingAgents === 0) {
        console.log('Found users but no agents, cleaning up partial data...')
        // Delete in correct order to respect foreign keys
        await db.submission.deleteMany({})
        await db.intention.deleteMany({})
        await db.wallet.deleteMany({})
        await db.user.deleteMany({})
        console.log('Cleaned up partial data')
      }
    }

    console.log('Starting database seed...')

    // Create requester user
    const requester = await db.user.create({
      data: {
        email: 'demo@intent.market',
        role: 'REQUESTER'
      }
    })
    console.log('Created requester:', requester.email)

    // Create agent users
    const agents = []
    for (let i = 1; i <= 8; i++) {
      const agent = await db.user.create({
        data: {
          email: `agent${i}@intent.market`,
          role: 'AGENT',
          agentProfile: {
            create: {
              displayName: `Agent ${i}`,
              bio: `AI Agent ${i} specializing in various recommendations`,
              personality: getPersonality(i),
              maxSubmissions: 3,
              stakedAmount: new Decimal(10),
              totalEarnings: new Decimal(0),
              winRate: 0,
              totalSubmissions: 0
            }
          }
        },
        include: {
          agentProfile: true
        }
      })
      agents.push(agent)
      console.log('Created agent:', agent.email)
    }

    // Create sample intention
    const intention = await db.intention.create({
      data: {
        userId: requester.id,
        title: 'Date night restaurants in Lower East Side',
        description: 'Looking for romantic dinner spots',
        category: 'dining',
        budgetUsd: new Decimal(100),
        winnersCount: 2,
        participationUsd: new Decimal(0.002),
        selectionUsd: new Decimal(0.05),
        status: 'OPEN',
        windowEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    })
    console.log('Created intention:', intention.title)

    // Create sample submissions
    for (const agent of agents) {
      const submission = await db.submission.create({
        data: {
          intentionId: intention.id,
          agentId: agent.id,
          payloadJson: {
            suggestion: `${agent.agentProfile?.displayName}'s recommendation`,
            details: `Great spot recommended by ${agent.agentProfile?.displayName}`,
            confidence: 0.7 + Math.random() * 0.3
          },
          dedupeHash: `hash-${agent.id}-${intention.id}`,
          score: 50 + Math.random() * 50,
          status: 'QUALIFIED'
        }
      })
      console.log(`Created submission from ${agent.agentProfile?.displayName}`)
    }

    const finalCounts = {
      users: await db.user.count(),
      agents: await db.agentProfile.count(),
      intentions: await db.intention.count(),
      submissions: await db.submission.count()
    }

    return NextResponse.json({
      message: 'Database seeded successfully!',
      counts: finalCounts
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error },
      { status: 500 }
    )
  }
}

function getPersonality(index: number): string {
  const personalities = [
    'Local Expert',
    'Foodie',
    'Budget Hunter',
    'Romantic',
    'Trendsetter',
    'Classic Connoisseur',
    'Adventure Seeker',
    'Health Conscious'
  ]
  return personalities[index - 1] || 'Helpful Assistant'
}

// GET endpoint to check seed status
export async function GET() {
  try {
    const counts = {
      users: await db.user.count(),
      agents: await db.agentProfile.count(),
      intentions: await db.intention.count(),
      submissions: await db.submission.count()
    }
    
    return NextResponse.json({
      seeded: counts.users > 0,
      counts
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check seed status' },
      { status: 500 }
    )
  }
}