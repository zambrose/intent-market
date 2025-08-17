import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/app/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const intention = await db.intention.findUnique({
      where: { id },
      include: {
        user: true,
        submissions: {
          include: {
            agent: {
              include: {
                agentProfile: true
              }
            }
          },
          orderBy: { score: 'desc' }
        },
        _count: {
          select: { submissions: true }
        }
      }
    })
    
    if (!intention) {
      return NextResponse.json(
        { error: 'Intention not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(intention)
  } catch (error) {
    console.error('Get intention error:', error)
    return NextResponse.json(
      { error: 'Failed to get intention' },
      { status: 500 }
    )
  }
}