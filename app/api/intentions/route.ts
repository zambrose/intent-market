import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/app/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

const CreateIntentionSchema = z.object({
  userId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  budgetUsd: z.number().positive(),
  winnersCount: z.number().int().positive(),
  participationUsd: z.number().positive(),
  selectionUsd: z.number().positive(),
  windowHours: z.number().positive().default(12)
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateIntentionSchema.parse(body)
    
    const intention = await db.intention.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        category: data.category,
        budgetUsd: new Decimal(data.budgetUsd),
        winnersCount: data.winnersCount,
        participationUsd: new Decimal(data.participationUsd),
        selectionUsd: new Decimal(data.selectionUsd),
        status: 'OPEN',
        windowEndsAt: new Date(Date.now() + data.windowHours * 60 * 60 * 1000)
      }
    })
    
    return NextResponse.json(intention)
  } catch (error) {
    console.error('Create intention error:', error)
    return NextResponse.json(
      { error: 'Failed to create intention' },
      { status: 400 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    
    const intentions = await db.intention.findMany({
      where: status ? { status: status as 'OPEN' | 'CLOSED' | 'DRAFT' | 'PAYOUTS_PENDING' | 'COMPLETE' } : undefined,
      include: {
        user: true,
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(intentions)
  } catch (error) {
    console.error('List intentions error:', error)
    return NextResponse.json(
      { error: 'Failed to list intentions' },
      { status: 500 }
    )
  }
}