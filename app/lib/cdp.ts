import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

// Dynamic imports to avoid build-time errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Coinbase: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Wallet: any = null

// Keep viem client for reading blockchain data
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
})

// Initialize Coinbase SDK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let coinbase: any = null
let cdpAvailable = false

export async function initializeCDP() {
  try {
    // Only import CDP SDK if credentials are available
    const apiKeyName = process.env.COINBASE_CDP_API_KEY
    const apiKeySecret = process.env.COINBASE_CDP_API_SECRET
    
    if (!apiKeyName || !apiKeySecret || apiKeyName === 'your-cdp-api-key' || apiKeyName === 'mock-api-key') {
      console.warn('CDP API credentials not configured - using mock mode')
      return false
    }
    
    // Dynamic import to avoid build errors
    const cdpModule = await import('@coinbase/coinbase-sdk')
    Coinbase = cdpModule.Coinbase
    Wallet = cdpModule.Wallet
    
    coinbase = new Coinbase({
      apiKeyName,
      privateKey: apiKeySecret
    })
    
    cdpAvailable = true
    console.log('✅ CDP SDK initialized successfully')
    return true
  } catch (error) {
    console.warn('CDP initialization failed, using mock mode:', error)
    cdpAvailable = false
    return false
  }
}

export function isCDPAvailable(): boolean {
  return cdpAvailable
}

export interface CDPWalletData {
  cdpWalletId: string
  address: string
  network: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletData?: any // Store the full wallet data for recovery
}

export interface TransferResult {
  txHash: string
  status: 'pending' | 'success' | 'failed'
}

// Real CDP implementation with fallback to mock for development
export const cdp = {
  async createWallet(userId: string): Promise<CDPWalletData> {
    // Try to initialize CDP if not already done
    if (!cdpAvailable) {
      await initializeCDP()
    }
    
    // If CDP is available, try to create real wallet
    if (cdpAvailable && Wallet && Coinbase) {
      try {
        // Create wallet on Base Sepolia network
        const wallet = await Wallet.create({
          networkId: Coinbase.networks.BaseSepolia
        })
        
        // Get the default address
        const defaultAddress = await wallet.getDefaultAddress()
        
        // Export wallet data for storage (includes seed for recovery)
        const walletData = wallet.export()
        
        console.log(`🔑 Created CDP wallet: ${defaultAddress.getId()} on ${wallet.getNetworkId()}`)
        
        return {
          cdpWalletId: wallet.getId(),
          address: defaultAddress.getId(),
          network: wallet.getNetworkId(),
          walletData // Store this securely in database
        }
      } catch (error) {
        console.warn('Failed to create CDP wallet, using mock:', error)
      }
    }
    
    // Fallback to mock wallet creation
    console.log('📦 Creating mock wallet for', userId)
    const mockAddress = `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}` as `0x${string}`
    return {
      cdpWalletId: `cdp_wallet_${userId}`,
      address: mockAddress,
      network: 'base-sepolia'
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async importWallet(walletData: any): Promise<any> {
    if (!cdpAvailable || !Wallet) {
      console.warn('CDP not available for wallet import')
      return null
    }
    
    try {
      const wallet = await Wallet.import(walletData)
      return wallet
    } catch (error) {
      console.error('Failed to import CDP wallet:', error)
      return null
    }
  },

  async getBalance(address: string): Promise<number> {
    try {
      // Try to use viem to read USDC balance directly from chain
      const USDC_ADDRESS = process.env.USDC_CONTRACT_ADDRESS as `0x${string}` || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`]
      })
      
      // USDC has 6 decimals
      return Number(balance) / 1_000_000
    } catch (error) {
      console.warn('Cannot read balance, using mock:', error)
      return Math.random() * 1 // Small mock balance for development
    }
  },

  async requestFromFaucet(address: string): Promise<string> {
    if (!cdpAvailable) {
      await initializeCDP()
    }
    
    if (!cdpAvailable || !coinbase || !Coinbase) {
      console.log('CDP not available, returning mock faucet tx')
      return 'mock-faucet-tx-' + Date.now()
    }
    
    try {
      // Request USDC from Base Sepolia faucet
      const faucetTx = await coinbase.faucet(
        address,
        {
          assetId: Coinbase.assets.Usdc,
        }
      )
      
      const txHash = faucetTx.getTransactionHash() || 'pending'
      console.log(`💰 Faucet USDC sent to ${address}: ${txHash}`)
      return txHash
    } catch (error) {
      console.warn('Faucet request failed:', error)
      return 'mock-faucet-tx-' + Date.now()
    }
  },

  async transferUsdc(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fromWalletData: any | null,
    toAddress: string,
    amountUsd: number
  ): Promise<TransferResult> {
    if (!cdpAvailable) {
      await initializeCDP()
    }
    
    if (cdpAvailable && fromWalletData && Coinbase) {
      try {
        const wallet = await cdp.importWallet(fromWalletData)
        
        if (wallet) {
          console.log(`💸 Initiating transfer of ${amountUsd} USDC to ${toAddress}`)
          
          // Create and broadcast the transfer
          // Use gasless option for USDC to avoid needing ETH for gas
          const transfer = await wallet.createTransfer({
            amount: amountUsd,
            assetId: Coinbase.assets.Usdc,
            destination: toAddress,
            gasless: true
          })
          
          // Wait for the transfer to complete
          await transfer.wait()
          
          const txHash = transfer.getTransactionHash() || 'completed'
          console.log(`✅ Transfer complete: ${txHash}`)
          
          return {
            txHash,
            status: 'success'
          }
        }
      } catch (error) {
        console.warn('CDP transfer failed, using mock:', error)
      }
    }
    
    // Mock transfer for development
    const mockTxHash = `0x${Math.random().toString(16).slice(2).padEnd(64, '0')}`
    console.log(`[Mock] Transfer ${amountUsd} USDC to ${toAddress}`)
    
    return {
      txHash: mockTxHash,
      status: 'pending'
    }
  },

  async createOnrampSession(address: string, amountUsd: number): Promise<string> {
    // Coinbase Pay URL for buying crypto
    // In production, use Coinbase Commerce or Pay SDK
    return `https://pay.coinbase.com/buy?address=${address}&amount=${amountUsd}&asset=USDC&network=base-sepolia`
  }
}

// ERC20 ABI for USDC operations (for direct chain reading)
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
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const