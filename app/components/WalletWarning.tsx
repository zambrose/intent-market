'use client'

import { AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function WalletWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if we're in mock mode
    const checkWalletMode = async () => {
      try {
        const res = await fetch('/api/wallets/status')
        const data = await res.json()
        setShowWarning(data.mockMode === true)
      } catch {
        // If the endpoint doesn't exist yet, assume mock mode
        setShowWarning(true)
      }
    }
    
    checkWalletMode()
  }, [])

  if (!showWarning || dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-yellow-900/90 backdrop-blur border border-yellow-700 rounded-lg p-4 shadow-xl z-50">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-200 mb-1">Mock Mode Active</h3>
          <p className="text-sm text-yellow-300/90">
            Wallet operations are simulated. To enable real blockchain transactions:
          </p>
          <ul className="text-xs text-yellow-300/80 mt-2 space-y-1">
            <li>• Add CDP API credentials to environment variables</li>
            <li>• Transactions shown are not on the blockchain</li>
            <li>• Wallet addresses are randomly generated</li>
          </ul>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-400 hover:text-yellow-200 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}