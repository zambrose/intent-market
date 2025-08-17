import { db } from './db'

let cachedDemoUserId: string | null = null

export async function getDemoUserId(): Promise<string> {
  if (cachedDemoUserId) {
    return cachedDemoUserId
  }
  
  // Find or create demo user
  let demoUser = await db.user.findFirst({
    where: { email: 'demo@example.com' }
  })
  
  if (!demoUser) {
    demoUser = await db.user.create({
      data: {
        email: 'demo@example.com',
        role: 'REQUESTER'
      }
    })
  }
  
  cachedDemoUserId = demoUser.id
  return demoUser.id
}