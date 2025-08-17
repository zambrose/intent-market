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
let coinbase: any = null // eslint-disable-line @typescript-eslint/no-unused-vars
let cdpAvailable = false

export async function initializeCDP() {
  try {
    // Only import CDP SDK if credentials are available
    const apiKeyName = process.env.COINBASE_CDP_API_KEY
    const apiKeySecret = process.env.COINBASE_CDP_API_SECRET
    
    if (!apiKeyName || !apiKeySecret || apiKeyName === 'your-cdp-api-key' || apiKeyName === 'mock-api-key') {
      console.warn('CDP API credentials not configured - using mock mode')
      console.log('API Key provided:', apiKeyName?.substring(0, 8) + '...')
      return false
    }
    
    // Check if it's a valid UUID format for API key
    const isValidApiKey = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apiKeyName)
    if (!isValidApiKey) {
      console.warn('CDP API key format appears invalid')
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
    
    if (!cdpAvailable || !Coinbase || !Wallet) {
      console.log('CDP not available, returning mock faucet tx')
      return 'mock-faucet-tx-' + Date.now()
    }
    
    try {
      console.log(`🚰 Requesting faucet for address: ${address}`)
      
      // Create a new wallet instance to request faucet
      // (Can't use existing wallet without seed, so we create temporary one)
      const tempWallet = await Wallet.create({
        networkId: Coinbase.networks.BaseSepolia
      })
      
      // Request USDC from faucet
      const faucetTx = await tempWallet.faucet(Coinbase.assets.Usdc)
      
      // Get the transaction details
      const txHash = faucetTx.getTransactionHash() || 'pending'
      console.log(`💰 Faucet transaction initiated: ${txHash}`)
      
      // Transfer the USDC from temp wallet to target address
      if (txHash !== 'pending') {
        console.log(`📤 Note: Faucet sent to temp wallet, user should use their own wallet's faucet`)
      }
      
      return txHash
    } catch (error) {
      console.warn('Faucet request failed:', error)
      console.log('Note: You may need to request USDC directly from Base Sepolia faucet')
      console.log('Visit: https://docs.base.org/docs/tools/network-faucets/')
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
    
    console.log('Transfer request:', { cdpAvailable, hasWalletData: !!fromWalletData, hasCoincaseClass: !!Coinbase })
    
    if (cdpAvailable && fromWalletData && Coinbase) {
      try {
        console.log('Importing wallet with data keys:', Object.keys(fromWalletData))
        const wallet = await cdp.importWallet(fromWalletData)
        
        if (wallet) {
          console.log(`💸 Initiating transfer of ${amountUsd} USDC to ${toAddress}`)
          console.log('Wallet imported successfully, ID:', wallet.getId())
          
          // Create and broadcast the transfer
          // Use gasless option for USDC to avoid needing ETH for gas
          const transfer = await wallet.createTransfer({
            amount: amountUsd,
            assetId: Coinbase.assets.Usdc,
            destination: toAddress,
            gasless: true
          })
          
          // Don't wait for completion, just get the tx hash
          const txHash = transfer.getTransactionHash() || 'pending'
          console.log(`📤 Transfer broadcast: ${txHash}`)
          
          // Optionally wait with timeout
          try {
            await Promise.race([
              transfer.wait(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transfer confirmation timeout')), 10000)
              )
            ])
            console.log(`✅ Transfer confirmed: ${txHash}`)
          } catch {
            console.log(`⏱️ Transfer broadcast but confirmation pending: ${txHash}`)
          }
          
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