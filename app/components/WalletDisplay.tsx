'use client'

import { useState, useEffect } from 'react'
import { Wallet, DollarSign, RefreshCw, ExternalLink } from 'lucide-react'

interface WalletInfo {
  address: string
  balance: number
  network: string
}

export default function WalletDisplay({ userId }: { userId?: string }) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [faucetLoading, setFaucetLoading] = useState(false)
  
  useEffect(() => {
    if (userId) {
      fetchWallet()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  
  const fetchWallet = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      // First ensure wallet exists
      const createRes = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      
      if (!createRes.ok) {
        console.warn('Wallet creation returned non-OK status, using mock')
      }
      
      // Get wallet info with balance
      const res = await fetch(`/api/wallets?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setWallet(data)
      } else {
        // Set a mock wallet for display
        setWallet({
          address: '0x' + '0'.repeat(40),
          balance: 0,
          network: 'base-sepolia'
        })
      }
    } catch (error) {
      console.warn('Wallet operations failing, showing mock:', error)
      // Set a mock wallet for display
      setWallet({
        address: '0x' + '0'.repeat(40),
        balance: 0,
        network: 'base-sepolia'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const requestFromFaucet = async () => {
    if (!wallet || !userId) return
    
    setFaucetLoading(true)
    try {
      // Get wallet ID first
      const walletRes = await fetch(`/api/wallets?userId=${userId}`)
      const walletData = await walletRes.json()
      
      const res = await fetch(`/api/wallets/${walletData.id}/faucet`, {
        method: 'POST'
      })
      
      if (res.ok) {
        const data = await res.json()
        console.log('Faucet request:', data)
        
        // Refresh balance after a delay
        setTimeout(() => {
          fetchWallet()
        }, 5000)
      }
    } catch (error) {
      console.error('Faucet request failed:', error)
    } finally {
      setFaucetLoading(false)
    }
  }
  
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
  
  const openExplorer = () => {
    if (wallet) {
      window.open(`https://sepolia.basescan.org/address/${wallet.address}`, '_blank')
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading wallet...</span>
      </div>
    )
  }
  
  if (!wallet) {
    return null
  }
  
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
        <Wallet className="w-4 h-4 text-blue-400" />
        <div className="text-sm">
          <div className="text-gray-400 text-xs">Base Sepolia</div>
          <button
            onClick={openExplorer}
            className="font-mono hover:text-blue-400 transition-colors flex items-center space-x-1"
          >
            <span>{formatAddress(wallet.address)}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
        <DollarSign className="w-4 h-4 text-green-400" />
        <div className="text-sm">
          <div className="text-gray-400 text-xs">USDC Balance</div>
          <div className="font-semibold">{wallet.balance.toFixed(2)}</div>
        </div>
      </div>
      
      {wallet.balance < 10 && (
        <button
          onClick={requestFromFaucet}
          disabled={faucetLoading}
          className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {faucetLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Requesting...</span>
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4" />
              <span>Get Test USDC</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}