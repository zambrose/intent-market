'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAgentPersonality } from './lib/openai'
import AgentModal from './components/AgentModal'
import WalletDisplay from './components/WalletDisplay'
import WalletWarning from './components/WalletWarning'
import { DollarSign, Trophy, Zap, Brain, History } from 'lucide-react'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  color: string
  x: number
  y: number
  status: 'sleeping' | 'awakening' | 'thinking' | 'submitting' | 'rewarded'
  suggestion?: string
  reward?: number
  stakedAmount: number
  totalEarnings: number
  winRate: number
  totalSubmissions: number
  personality: string
  walletAddress?: string
}

interface Intention {
  id: string
  title: string
  description: string
  budgetUsd: number
  winnersCount: number
  participationUsd: number
  selectionUsd: number
  status: string
  submissions: unknown[]
}

export default function Home() {
  const [userInput, setUserInput] = useState('')
  const [activeIntention, setActiveIntention] = useState<Intention | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [useOpenAI, setUseOpenAI] = useState(true)
  const [microPaymentAmount] = useState(0.002) // $0.002 for participation

  // Initialize agents with personalities and stats
  useEffect(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1']
    const initialAgents = Array.from({ length: 8 }, (_, i) => {
      const personality = getAgentPersonality(i)
      return {
        id: `agent-${i}`,
        name: personality.name,
        color: colors[i],
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
        status: 'sleeping' as const,
        stakedAmount: 10 + Math.random() * 40, // $10-50 staked
        totalEarnings: Math.random() * 500,
        winRate: Math.random() * 0.4 + 0.1,
        totalSubmissions: Math.floor(Math.random() * 100),
        personality: personality.style
      }
    })
    setAgents(initialAgents)
  }, [])

  const createIntention = async () => {
    if (!userInput.trim()) return

    console.log(`🎯 Creating intention with OpenAI=${useOpenAI}`)
    
    try {
      const res = await fetch('/api/intentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          title: userInput,
          description: `Looking for recommendations: ${userInput}`,
          category: 'recommendations',
          budgetUsd: 0.5,
          winnersCount: 3,
          participationUsd: microPaymentAmount,
          selectionUsd: 0.05,
          windowHours: 0.1
        })
      })

      const intention = await res.json()
      console.log(`📝 Created intention:`, intention)
      setActiveIntention(intention)
      
      // Start agent simulation with OpenAI
      simulateAgentActivity(intention.id)
    } catch (error) {
      console.error('Failed to create intention:', error)
    }
  }

  const simulateAgentActivity = async (intentionId: string) => {
    setIsSimulating(true)

    // Phase 1: Agents awaken (staking check)
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: agent.stakedAmount >= 10 ? 'awakening' : 'sleeping'
    })))

    await new Promise(resolve => setTimeout(resolve, 1500))

    // Phase 2: Agents think
    const activeAgents = agents.filter(a => a.stakedAmount >= 10)
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: agent.stakedAmount >= 10 ? 'thinking' : 'sleeping'
    })))

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Phase 3: Agents submit suggestions using OpenAI
    for (let i = 0; i < activeAgents.length; i++) {
      const agent = activeAgents[i]
      const agentIndex = parseInt(agent.id.split('-')[1])
      
      // Call API with OpenAI flag
      try {
        console.log(`🚀 Submitting for ${agent.name} (${agent.id}) with OpenAI=${useOpenAI}`)
        
        const res = await fetch(`/api/intentions/${intentionId}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agent.id,
            agentIndex,
            useOpenAI
          })
        })
        
        const submission = await res.json()
        console.log(`📥 Response for ${agent.name}:`, submission)
        console.log(`📝 PayloadJson:`, submission.payloadJson)
        
        const suggestionText = submission.payloadJson?.details || submission.payloadJson?.suggestion || 'Thinking...'
        console.log(`✨ Final suggestion text for ${agent.name}: "${suggestionText}"`)
        
        setAgents(prev => {
          const updated = prev.map(a => 
            a.id === agent.id 
              ? { 
                  ...a, 
                  status: 'submitting' as const, 
                  suggestion: suggestionText,
                  totalSubmissions: a.totalSubmissions + 1
                }
              : a
          )
          console.log(`🔄 Updated agents state, ${agent.name} suggestion: "${updated.find(a => a.id === agent.id)?.suggestion}"`)
          return updated
        })
      } catch (error) {
        console.error('Submission error:', error)
      }

      await new Promise(resolve => setTimeout(resolve, 800))
    }

    // Phase 4: Give micro-payments to all participants
    setAgents(prev => prev.map(agent => {
      if (agent.stakedAmount >= 10) {
        return {
          ...agent,
          totalEarnings: agent.totalEarnings + microPaymentAmount,
          reward: microPaymentAmount
        }
      }
      return agent
    }))

    await new Promise(resolve => setTimeout(resolve, 1000))

    // Reset status
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: 'sleeping',
      reward: undefined
    })))

    setIsSimulating(false)
  }

  const selectWinners = async () => {
    if (!agents.length || !activeIntention) return

    // Select top 3 based on some criteria
    const winners = agents
      .filter(a => a.suggestion)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(a => a.id)

    setSelectedAgents(winners)

    // Update agent status and earnings
    setAgents(prev => prev.map(agent => {
      if (winners.includes(agent.id)) {
        const isTopWinner = winners[0] === agent.id
        const winReward = isTopWinner ? 0.075 : 0.05
        return {
          ...agent,
          status: 'rewarded',
          reward: winReward,
          totalEarnings: agent.totalEarnings + winReward,
          winRate: (agent.winRate * agent.totalSubmissions + 1) / (agent.totalSubmissions + 1)
        }
      }
      return agent
    }))

    // Store training data
    await storeTrainingData(activeIntention.id, winners)
  }

  const storeTrainingData = async (intentionId: string, winnerIds: string[]) => {
    // In production, this would call an API to store training data
    const allSubmissions = agents.filter(a => a.suggestion).map(a => ({
      agentId: a.id,
      suggestion: a.suggestion,
      personality: a.personality
    }))
    
    const trainingData = {
      intentionId,
      userId: 'demo-user',
      prompt: userInput,
      allSubmissions,
      selectedIds: winnerIds,
      rejectedIds: agents.filter(a => a.suggestion && !winnerIds.includes(a.id)).map(a => a.id)
    }
    
    console.log('Training data stored:', trainingData)
  }

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent)
    setShowAgentModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <WalletWarning />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Intent Market
          </h1>
          <div className="flex items-center space-x-4">
            <WalletDisplay userId="demo-user" />
            <Link
              href="/history"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="text-sm">History</span>
            </Link>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={useOpenAI}
                onChange={(e) => setUseOpenAI(e.target.checked)}
                className="rounded"
              />
              <span>Use OpenAI</span>
            </label>
            <div className="text-sm text-gray-400">
              <span className="text-green-400">⚡</span> Micro-payment: ${microPaymentAmount.toFixed(3)}/submission
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <label className="block text-sm font-medium mb-2">What do you need?</label>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="e.g., Date night restaurants in Lower East Side for Wednesday"
              className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
              onKeyPress={(e) => e.key === 'Enter' && createIntention()}
            />
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={createIntention}
                disabled={isSimulating || !userInput.trim()}
                className="flex-1 mr-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSimulating ? 'Agents Working...' : 'Broadcast Intent'}
              </button>
              <div className="text-sm text-gray-400">
                <DollarSign className="inline w-4 h-4" /> Budget: $0.50
              </div>
            </div>
          </div>
        </div>

        {/* Agent Visualization */}
        <div className="relative h-96 bg-gray-800 rounded-lg overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900 opacity-50"></div>
          
          {/* Staking indicator */}
          <div className="absolute top-4 left-4 text-xs text-gray-400 z-10">
            <Brain className="inline w-4 h-4 mr-1" />
            Agents must stake ≥$10 to participate
          </div>
          
          <AnimatePresence>
            {agents.map((agent) => (
              <motion.div
                key={agent.id}
                className="absolute cursor-pointer"
                style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: agent.status === 'awakening' ? 1.2 : 
                         agent.status === 'thinking' ? 1.1 :
                         agent.status === 'submitting' ? 1.3 :
                         agent.status === 'rewarded' ? 1.5 : 1
                }}
                transition={{ duration: 0.5 }}
                onClick={() => handleAgentClick(agent)}
              >
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      agent.stakedAmount < 10 ? 'opacity-30 cursor-not-allowed' :
                      agent.status === 'sleeping' ? 'opacity-50' :
                      agent.status === 'rewarded' ? 'ring-4 ring-yellow-400 shadow-2xl' : 
                      'shadow-lg'
                    }`}
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  
                  {/* Staked amount badge */}
                  <div className="absolute -bottom-1 -right-1 bg-green-600 text-white text-[10px] px-1 rounded">
                    ${Math.round(agent.stakedAmount)}
                  </div>
                  
                  {agent.status === 'thinking' && (
                    <motion.div
                      className="absolute -top-2 -right-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      💭
                    </motion.div>
                  )}
                  
                  {agent.status === 'submitting' && (
                    <motion.div
                      className="absolute -top-2 -right-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      ✍️
                    </motion.div>
                  )}
                  
                  {agent.reward && (
                    <motion.div
                      className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                      initial={{ y: 0, opacity: 1 }}
                      animate={{ y: -20, opacity: 0 }}
                      transition={{ duration: 2 }}
                    >
                      <span className="text-yellow-400 font-bold">+${agent.reward}</span>
                    </motion.div>
                  )}
                  
                  {agent.suggestion && (
                    <div className="absolute top-14 left-1/2 transform -translate-x-1/2 w-48 bg-gray-700 rounded p-2 text-xs shadow-lg">
                      {agent.suggestion.substring(0, 50)}...
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Submissions List */}
        {activeIntention && agents.some(a => a.suggestion) && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Agent Submissions</h2>
              <div className="text-sm text-gray-400">
                <Zap className="inline w-4 h-4 text-yellow-400" />
                {agents.filter(a => a.suggestion).length} agents earned ${microPaymentAmount.toFixed(3)} each
              </div>
            </div>
            <div className="space-y-3">
              {agents.filter(a => a.suggestion).map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`bg-gray-800 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-gray-750 transition-colors ${
                    selectedAgents.includes(agent.id) ? 'ring-2 ring-yellow-400' : ''
                  }`}
                  onClick={() => handleAgentClick(agent)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-full"
                        style={{ backgroundColor: agent.color }}
                      />
                      <div className="absolute -bottom-1 -right-1 bg-green-600 text-white text-[8px] px-1 rounded">
                        ${Math.round(agent.stakedAmount)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{agent.name}</span>
                        <span className="text-xs text-gray-500">• {agent.personality}</span>
                      </div>
                      <div className="text-sm text-gray-400">{agent.suggestion}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {selectedAgents.includes(agent.id) && (
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    )}
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Win rate</div>
                      <div className="text-sm font-semibold">{(agent.winRate * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {!selectedAgents.length && (
              <button
                onClick={selectWinners}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all flex items-center space-x-2"
              >
                <Trophy className="w-5 h-5" />
                <span>Select Winners & Allocate Selection Rewards</span>
              </button>
            )}
            
            {selectedAgents.length > 0 && (
              <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400">
                  ✅ Training data saved! User preferences recorded for personalizing future recommendations.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent Detail Modal */}
      <AgentModal
        agent={selectedAgent}
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
      />
    </div>
  )
}