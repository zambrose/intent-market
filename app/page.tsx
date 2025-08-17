'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAgentPersonality } from './lib/openai'
import AgentModal from './components/AgentModal'
import WalletDisplay from './components/WalletDisplay'
import WalletWarning from './components/WalletWarning'
import { useDemoUser } from './hooks/useDemoUser'
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
  walletBalance?: number
  agentIndex: number
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
  const { demoUserId } = useDemoUser()

  // Initialize agents with personalities and fetch wallet data
  useEffect(() => {
    const initializeAgents = async () => {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1']
      
      // Fetch real agent wallet data
      try {
        const res = await fetch('/api/agents/wallets')
        const agentWallets = await res.json()
        
        const initialAgents = Array.from({ length: Math.min(8, agentWallets.length) }, (_, i) => {
          const personality = getAgentPersonality(i)
          const walletData = agentWallets[i]
          return {
            id: walletData?.id || `agent-${i}`,
            name: personality.name,
            color: colors[i],
            x: Math.random() * 80 + 10,
            y: Math.random() * 60 + 20,
            status: 'sleeping' as const,
            stakedAmount: 10 + Math.random() * 40, // $10-50 staked
            totalEarnings: Math.random() * 500,
            winRate: Math.random() * 0.4 + 0.1,
            totalSubmissions: Math.floor(Math.random() * 100),
            personality: personality.style,
            walletAddress: walletData?.walletAddress,
            walletBalance: walletData?.balance || 0,
            agentIndex: i
          }
        })
        setAgents(initialAgents)
      } catch (error) {
        console.error('Failed to fetch agent wallets:', error)
        // Fall back to mock data
        const initialAgents = Array.from({ length: 8 }, (_, i) => {
          const personality = getAgentPersonality(i)
          return {
            id: `agent-${i}`,
            name: personality.name,
            color: colors[i],
            x: Math.random() * 80 + 10,
            y: Math.random() * 60 + 20,
            status: 'sleeping' as const,
            stakedAmount: 10 + Math.random() * 40,
            totalEarnings: Math.random() * 500,
            winRate: Math.random() * 0.4 + 0.1,
            totalSubmissions: Math.floor(Math.random() * 100),
            personality: personality.style,
            agentIndex: i
          }
        })
        setAgents(initialAgents)
      }
    }
    
    initializeAgents()
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
    console.log('Active agents:', activeAgents.map(a => ({ id: a.id, name: a.name, agentIndex: a.agentIndex })))
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: agent.stakedAmount >= 10 ? 'thinking' : 'sleeping'
    })))

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Phase 3: Agents submit suggestions using OpenAI (process in smaller batches)
    const successfulSubmissions: Agent[] = [] // Track successful agents for rewards
    const BATCH_SIZE = 2 // Process 2 agents at a time to avoid overwhelming OpenAI
    
    for (let batchStart = 0; batchStart < activeAgents.length; batchStart += BATCH_SIZE) {
      const batch = activeAgents.slice(batchStart, batchStart + BATCH_SIZE)
      console.log(`Processing batch of ${batch.length} agents...`)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (agent, batchIndex) => {
        const agentIndex = agent.agentIndex ?? (batchStart + batchIndex)
        
        try {
          console.log(`🚀 Submitting for ${agent.name} (${agent.id}) agentIndex=${agentIndex} with OpenAI=${useOpenAI}`)
          
          const res = await fetch(`/api/intentions/${intentionId}/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: agent.id,
              agentIndex,
              useOpenAI
            })
          })
          
          if (!res.ok) {
            throw new Error(`Submission failed: ${res.status}`)
          }
          
          const submission = await res.json()
          console.log(`📥 Response for ${agent.name}:`, submission)
          
          const suggestionText = submission.payloadJson?.details || submission.payloadJson?.suggestion || 'Thinking...'
          console.log(`✨ Final suggestion text for ${agent.name}: "${suggestionText}"`)
          
          // Track successful submission for rewards
          successfulSubmissions.push({
            ...agent,
            suggestion: suggestionText
          })
          
          setAgents(prev => prev.map(a => 
            a.id === agent.id 
              ? { 
                  ...a, 
                  status: 'submitting' as const, 
                  suggestion: suggestionText,
                  totalSubmissions: a.totalSubmissions + 1
                }
              : a
          ))
        } catch (error) {
          console.error(`Submission error for ${agent.name}:`, error)
          setAgents(prev => prev.map(a => 
            a.id === agent.id 
              ? { ...a, status: 'sleeping' as const, suggestion: 'Failed to generate response' }
              : a
          ))
        }
      })
      
      // Wait for batch to complete
      await Promise.all(batchPromises)
      
      // Small delay between batches
      if (batchStart + BATCH_SIZE < activeAgents.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Phase 4: Send real micro-payments to all participants
    const participatingAgents = successfulSubmissions.filter(a => a.stakedAmount >= 10)
    console.log(`💸 Sending participation rewards to ${participatingAgents.length} agents...`)
    
    for (const agent of participatingAgents) {
      if (demoUserId) {
        try {
          console.log(`💰 Sending ${microPaymentAmount} USDC to ${agent.name} (${agent.id})...`)
          const res = await fetch('/api/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromUserId: demoUserId,
              toUserId: agent.id,
              amountUsd: microPaymentAmount,
              intentionId,
              kind: 'PARTICIPATION'
            })
          })
          
          if (!res.ok) {
            const errorText = await res.text()
            console.error(`❌ Transfer failed for ${agent.name}: ${res.status} - ${errorText}`)
            continue
          }
          
          const result = await res.json()
          console.log(`✅ Participation reward sent to ${agent.name}:`, result)
        } catch (error) {
          console.error(`❌ Failed to send participation reward to ${agent.name}:`, error)
        }
      } else {
        console.warn('⚠️ No demo user ID available for participation rewards')
      }
    }
    
    setAgents(prev => prev.map(agent => {
      if (agent.stakedAmount >= 10 && agent.suggestion) {
        return {
          ...agent,
          totalEarnings: agent.totalEarnings + microPaymentAmount,
          walletBalance: (agent.walletBalance || 0) + microPaymentAmount,
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

  const handleRewardAgent = async (agent: Agent) => {
    if (!demoUserId || !activeIntention) {
      console.error('Missing demo user or active intention')
      return
    }
    
    try {
      // Send selection reward to agent
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: demoUserId,
          toUserId: agent.id,
          amountUsd: 0.05,
          intentionId: activeIntention.id,
          kind: 'SELECTION'
        })
      })
      
      const result = await res.json()
      console.log('Selection reward sent:', result)
      
      // Update local state
      setSelectedAgents(prev => [...prev, agent.id])
      setAgents(prev => prev.map(a => 
        a.id === agent.id 
          ? { 
              ...a, 
              status: 'rewarded' as const,
              reward: 0.05,
              totalEarnings: a.totalEarnings + 0.05,
              walletBalance: (a.walletBalance || 0) + 0.05,
              winRate: (a.winRate * a.totalSubmissions + 1) / (a.totalSubmissions + 1)
            }
          : a
      ))
      
      // Store training data
      await storeTrainingData(activeIntention.id, [agent.id])
      
      // Refresh wallet balance after transfer
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error('Failed to reward agent:', error)
    }
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
            <WalletDisplay userId={demoUserId || undefined} />
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
                        {agent.walletAddress && (
                          <span className="text-xs text-blue-400">
                            • {agent.walletBalance?.toFixed(2) || '0.00'} USDC
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">{agent.suggestion}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {selectedAgents.includes(agent.id) ? (
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        <span className="text-xs text-yellow-400">Rewarded</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRewardAgent(agent)
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold transition-colors"
                      >
                        Reward ${0.05}
                      </button>
                    )}
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Win rate</div>
                      <div className="text-sm font-semibold">{(agent.winRate * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
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