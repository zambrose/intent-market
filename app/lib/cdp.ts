import { createPublicClient, createWalletClient, http, parseUnits, Hash } from 'viem'
import { baseSepolia } from 'viem/chains'

const USDC_ADDRESS = process.env.USDC_CONTRACT_ADDRESS as `0x${string}` || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const USDC_DECIMALS = 6

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
})

interface WalletData {
  cdpWalletId: string
  address: string
  network: string
}

interface TransferResult {
  txHash: string
  status: 'pending' | 'success' | 'failed'
}

// Mock CDP implementation for quick demo
// Real CDP SDK integration would go here
export const cdp = {
  async createWallet(userId: string): Promise<WalletData> {
    // Mock wallet creation - in prod would use CDP SDK
    const mockAddress = `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}` as `0x${string}`
    return {
      cdpWalletId: `cdp_wallet_${userId}`,
      address: mockAddress,
      network: 'base-sepolia'
    }
  },

  async createOnrampSession(address: string, amountUsd: number): Promise<string> {
    // Mock onramp URL - in prod would use Coinbase Pay
    return `https://pay.coinbase.com/buy?address=${address}&amount=${amountUsd}&asset=USDC`
  },

  async transferUsdc(
    fromWalletId: string, 
    toAddress: string, 
    amountUsd: number
  ): Promise<TransferResult> {
    // Mock transfer - in prod would use CDP Transfers API
    const mockTxHash = `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}` as Hash
    
    console.log(`[CDP Mock] Transfer ${amountUsd} USDC from ${fromWalletId} to ${toAddress}`)
    
    // Simulate async transfer
    setTimeout(() => {
      console.log(`[CDP Mock] Transfer confirmed: ${mockTxHash}`)
    }, 2000)
    
    return {
      txHash: mockTxHash,
      status: 'pending'
    }
  },

  async getBalance(address: string): Promise<number> {
    // Mock balance - in prod would query chain
    return Math.random() * 1000
  }
}

// ERC20 ABI for USDC operations
export const USDC_ABI = [
  {
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const