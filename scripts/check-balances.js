require('dotenv').config();

async function checkBalances() {
  const { PrismaClient } = require('../app/generated/prisma');
  const prisma = new PrismaClient();
  
  try {
    // Get CDP client (use viem directly to avoid ESM issues)
    const { createPublicClient, http } = require('viem');
    const { baseSepolia } = require('viem/chains');
    
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org')
    });
    
    const USDC_ABI = [
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ];
    const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    
    // Get all wallets
    const wallets = await prisma.wallet.findMany({
      include: { user: true },
      take: 5 // Just check first 5
    });
    
    console.log('Checking wallet balances on Base Sepolia...\n');
    
    for (const wallet of wallets) {
      try {
        // Check USDC balance
        const balance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'balanceOf',
          args: [wallet.address]
        });
        
        const usdcBalance = Number(balance) / 1_000_000; // USDC has 6 decimals
        
        console.log(`${wallet.user.email}:`);
        console.log(`  Address: ${wallet.address}`);
        console.log(`  USDC Balance: ${usdcBalance}`);
        console.log(`  View on BaseScan: https://sepolia.basescan.org/address/${wallet.address}`);
        console.log('');
      } catch (error) {
        console.log(`${wallet.user.email}: Error reading balance`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBalances();