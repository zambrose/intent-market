import { NextResponse } from 'next/server'
import { getDemoUserId } from '@/app/lib/demo-user'

export async function GET() {
  try {
    const userId = await getDemoUserId()
    return NextResponse.json({ userId })
  } catch (error) {
    console.error('Failed to get demo user:', error)
    return NextResponse.json(
      { error: 'Failed to get demo user' },
      { status: 500 }
    )
  }
}