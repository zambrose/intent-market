import { NextResponse } from 'next/server'
import { isCDPAvailable, initializeCDP } from '@/app/lib/cdp'

export async function GET() {
  // Try to initialize CDP if not already done
  const cdpReady = isCDPAvailable() || await initializeCDP()
  
  return NextResponse.json({
    mockMode: !cdpReady,
    cdpAvailable: cdpReady,
    message: cdpReady 
      ? 'CDP is configured and ready' 
      : 'Running in mock mode - CDP credentials not configured'
  })
}