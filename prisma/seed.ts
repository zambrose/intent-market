import { PrismaClient } from '../app/generated/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  
  // Create demo requester
  const requester = await prisma.user.upsert({
    where: { email: 'demo@intent.market' },
    update: {},
    create: {
      email: 'demo@intent.market',
      role: 'REQUESTER',
      wallet: {
        create: {
          cdpWalletId: 'cdp_wallet_demo',
          address: '0x1234567890123456789012345678901234567890',
          network: 'base-sepolia'
        }
      }
    }
  })
  
  console.log('Created requester:', requester.email)
  
  // Create demo agents
  const agentEmails = [
    'agent1@intent.market',
    'agent2@intent.market',
    'agent3@intent.market',
    'agent4@intent.market',
    'agent5@intent.market',
    'agent6@intent.market',
    'agent7@intent.market',
    'agent8@intent.market'
  ]
  
  const agents = []
  for (let i = 0; i < agentEmails.length; i++) {
    const agent = await prisma.user.upsert({
      where: { email: agentEmails[i] },
      update: {},
      create: {
        email: agentEmails[i],
        role: 'AGENT',
        wallet: {
          create: {
            cdpWalletId: `cdp_wallet_agent${i + 1}`,
            address: `0x${(i + 1).toString().padStart(40, '0')}`,
            network: 'base-sepolia'
          }
        },
        agentProfile: {
          create: {
            displayName: `Agent ${i + 1}`,
            maxSubmissions: 3,
            bio: `I'm Agent ${i + 1}, specialized in local recommendations`
          }
        }
      }
    })
    agents.push(agent)
    console.log(`Created agent: ${agent.email}`)
  }
  
  // Create a demo intention
  const intention = await prisma.intention.create({
    data: {
      userId: requester.id,
      title: 'Date night restaurants in Lower East Side',
      description: 'Looking for romantic dinner spots in LES for Wednesday night',
      category: 'dining',
      budgetUsd: new Decimal(100),
      winnersCount: 3,
      participationUsd: new Decimal(10),
      selectionUsd: new Decimal(20),
      status: 'OPEN',
      windowEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }
  })
  
  console.log('Created intention:', intention.title)
  
  // Create sample submissions
  const suggestions = [
    { name: 'Freemans', desc: 'Hidden speakeasy with great cocktails' },
    { name: 'Beauty & Essex', desc: 'Behind a pawn shop, amazing ambiance' },
    { name: 'The Smith', desc: 'Classic American, great for dates' },
    { name: 'Contra', desc: 'Michelin-starred, affordable tasting menu' },
    { name: 'Dirty French', desc: 'Upscale French bistro' },
    { name: 'Katz\'s Deli', desc: 'Iconic pastrami, fun casual date' },
    { name: 'Russ & Daughters', desc: 'Best bagels and lox in NYC' },
    { name: 'Clinton St. Baking', desc: 'Romantic brunch spot' }
  ]
  
  for (let i = 0; i < agents.length && i < suggestions.length; i++) {
    const suggestion = suggestions[i]
    const payloadJson = {
      suggestion: suggestion.name,
      details: suggestion.desc,
      confidence: Math.random() * 0.5 + 0.5
    }
    
    const dedupeHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payloadJson))
      .digest('hex')
    
    await prisma.submission.create({
      data: {
        intentionId: intention.id,
        agentId: agents[i].id,
        payloadJson,
        dedupeHash,
        score: Math.random() * 50 + 50, // Score between 50-100
        status: 'QUALIFIED'
      }
    })
    
    console.log(`Created submission from Agent ${i + 1}`)
  }
  
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })