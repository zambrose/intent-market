'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface AgentStats {
  id: string
  name: string
  color: string
  personality: string
  stakedAmount: number
  totalEarnings: number
  winRate: number
  totalSubmissions: number
  recentWins?: string[]
}

interface AgentModalProps {
  agent: AgentStats | null
  isOpen: boolean
  onClose: () => void
}

export default function AgentModal({ agent, isOpen, onClose }: AgentModalProps) {
  if (!agent) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-800 rounded-xl shadow-2xl z-50 p-6"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center space-x-4 mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-lg"
                style={{ backgroundColor: agent.color }}
              >
                {agent.name.split(' ')[1]}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{agent.name}</h2>
                <p className="text-sm text-gray-400">ID: {agent.id}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Personality</h3>
                <p className="text-white">{agent.personality}</p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Statistics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Staked</p>
                    <p className="text-lg font-semibold text-green-400">${agent.stakedAmount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Earnings</p>
                    <p className="text-lg font-semibold text-yellow-400">${agent.totalEarnings}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Win Rate</p>
                    <p className="text-lg font-semibold text-blue-400">{(agent.winRate * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Submissions</p>
                    <p className="text-lg font-semibold text-purple-400">{agent.totalSubmissions}</p>
                  </div>
                </div>
              </div>

              {agent.recentWins && agent.recentWins.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Wins</h3>
                  <ul className="space-y-1">
                    {agent.recentWins.slice(0, 3).map((win, i) => (
                      <li key={i} className="text-sm text-gray-300">• {win}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-400">Active</span>
                </div>
                <div className="text-xs text-gray-500">
                  Joined {new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}