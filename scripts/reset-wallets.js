require('dotenv').config();
const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function resetWallets() {
  console.log('🗑️  Clearing existing wallets...');
  
  try {
    // Delete all existing wallets
    const deleted = await prisma.wallet.deleteMany({});
    console.log(`Deleted ${deleted.count} wallets`);
    
    // Import CDP SDK
    const { Coinbase, Wallet } = await import('@coinbase/coinbase-sdk');
    
    // Initialize Coinbase
    const coinbase = new Coinbase({
      apiKeyName: process.env.COINBASE_CDP_API_KEY,
      privateKey: process.env.COINBASE_CDP_API_SECRET
    });
    
    console.log('✅ CDP initialized');
    
    // Create demo user wallet
    console.log('\n📝 Creating demo user wallet...');
    const demoUser = await prisma.user.findFirst({
      where: { email: 'demo@example.com' }
    });
    
    if (!demoUser) {
      console.log('Creating demo user...');
      const newUser = await prisma.user.create({
        data: {
          email: 'demo@example.com',
          role: 'REQUESTER'
        }
      });
      console.log('Created user:', newUser.id);
    }
    
    const user = demoUser || await prisma.user.findFirst({ where: { email: 'demo@example.com' } });
    
    if (user) {
      const userWallet = await Wallet.create({
        networkId: Coinbase.networks.BaseSepolia
      });
      
      const userAddress = await userWallet.getDefaultAddress();
      const userWalletData = userWallet.export();
      
      await prisma.wallet.create({
        data: {
          userId: user.id,
          cdpWalletId: userWallet.getId(),
          address: userAddress.getId(),
          network: userWallet.getNetworkId(),
          walletData: userWalletData
        }
      });
      
      console.log(`✅ User wallet created: ${userAddress.getId()}`);
      console.log(`   View on BaseScan: https://sepolia.basescan.org/address/${userAddress.getId()}`);
      
      // Request USDC from faucet for demo user
      try {
        const faucetTx = await userWallet.faucet(Coinbase.assets.Usdc);
        console.log(`   💰 Faucet request: ${faucetTx.getTransactionHash()}`);
      } catch (e) {
        console.log('   ⚠️ Faucet request failed (rate limited)');
      }
    }
    
    // Create agent wallets
    console.log('\n📝 Creating agent wallets...');
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' }
    });
    
    if (agents.length === 0) {
      console.log('Creating agent users...');
      for (let i = 0; i < 8; i++) {
        await prisma.user.create({
          data: {
            email: `agent${i}@example.com`,
            role: 'AGENT',
            agentProfile: {
              create: {
                displayName: `Agent ${i}`,
                bio: `AI Agent #${i}`,
                personality: `Personality ${i}`,
                stakedAmount: 10 + Math.random() * 40
              }
            }
          }
        });
      }
      console.log('Created 8 agent users');
    }
    
    const allAgents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      include: { wallet: true }
    });
    
    for (const agent of allAgents) {
      if (!agent.wallet) {
        console.log(`Creating wallet for ${agent.email}...`);
        
        const agentWallet = await Wallet.create({
          networkId: Coinbase.networks.BaseSepolia
        });
        
        const agentAddress = await agentWallet.getDefaultAddress();
        const agentWalletData = agentWallet.export();
        
        await prisma.wallet.create({
          data: {
            userId: agent.id,
            cdpWalletId: agentWallet.getId(),
            address: agentAddress.getId(),
            network: agentWallet.getNetworkId(),
            walletData: agentWalletData
          }
        });
        
        console.log(`  ✅ Wallet: ${agentAddress.getId()}`);
        
        // Request USDC from faucet (with delay to avoid rate limiting)
        if (Math.random() > 0.7) { // Only request for some agents to avoid rate limits
          try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            const faucetTx = await agentWallet.faucet(Coinbase.assets.Usdc);
            console.log(`     💰 Faucet: ${faucetTx.getTransactionHash()}`);
          } catch (e) {
            console.log('     ⚠️ Faucet request failed (rate limited)');
          }
        }
      }
    }
    
    console.log('\n✅ All wallets created successfully!');
    
    // Display summary
    const wallets = await prisma.wallet.findMany({
      include: { user: true }
    });
    
    console.log('\n📊 Wallet Summary:');
    for (const wallet of wallets) {
      console.log(`${wallet.user.email}: ${wallet.address}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetWallets();