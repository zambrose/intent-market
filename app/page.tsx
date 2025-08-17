'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Agent {
  id: string
  name: string
  color: string
  x: number
  y: number
  status: 'sleeping' | 'awakening' | 'thinking' | 'submitting' | 'rewarded'
  suggestion?: string
  reward?: number
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
  submissions: any[]
}

export default function Home() {
  const [userInput, setUserInput] = useState('')
  const [activeIntention, setActiveIntention] = useState<Intention | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [isSimulating, setIsSimulating] = useState(false)

  // Initialize agents
  useEffect(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1']
    const initialAgents = Array.from({ length: 8 }, (_, i) => ({
      id: `agent-${i}`,
      name: `Agent ${i + 1}`,
      color: colors[i],
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 20,
      status: 'sleeping' as const
    }))
    setAgents(initialAgents)
  }, [])

  const createIntention = async () => {
    if (!userInput.trim()) return

    try {
      const res = await fetch('/api/intentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          title: userInput,
          description: `Looking for recommendations: ${userInput}`,
          category: 'recommendations',
          budgetUsd: 50,
          winnersCount: 3,
          participationUsd: 5,
          selectionUsd: 10,
          windowHours: 0.1 // 6 minutes for demo
        })
      })

      const intention = await res.json()
      setActiveIntention(intention)
      
      // Start agent simulation
      simulateAgentActivity(intention.id)
    } catch (error) {
      console.error('Failed to create intention:', error)
    }
  }

  const simulateAgentActivity = async (intentionId: string) => {
    setIsSimulating(true)

    // Phase 1: Agents awaken
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: 'awakening'
    })))

    await new Promise(resolve => setTimeout(resolve, 1500))

    // Phase 2: Agents think
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: 'thinking'
    })))

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Phase 3: Agents submit suggestions
    const suggestions = [
      'Freemans on Chrystie Street - Amazing cocktails and small plates',
      'Beauty & Essex hidden behind a pawn shop - Great for groups',
      'The Smith near Washington Square - Classic American fare',
      'Contra - Michelin-starred tasting menu at reasonable prices',
      'Dirty French - Upscale bistro with great ambiance',
      'Katz\'s Delicatessen - Iconic pastrami sandwiches',
      'Russ & Daughters - Best bagels and lox in the city',
      'Clinton St. Baking - Famous brunch spot'
    ]

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i]
      
      setAgents(prev => prev.map(a => 
        a.id === agent.id 
          ? { ...a, status: 'submitting', suggestion: suggestions[i] }
          : a
      ))

      // Submit to API
      try {
        await fetch(`/api/intentions/${intentionId}/submissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agent.id,
            payloadJson: {
              suggestion: suggestions[i],
              details: `Details for ${suggestions[i]}`,
              confidence: Math.random() * 0.5 + 0.5
            }
          })
        })
      } catch (error) {
        console.error('Submission error:', error)
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Phase 4: Show all as submitted
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: 'sleeping'
    })))

    setIsSimulating(false)
  }

  const selectWinners = () => {
    if (!agents.length) return

    // Randomly select 3 winners
    const winners = agents
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(a => a.id)

    setSelectedAgents(winners)

    // Update agent status to show rewards
    setAgents(prev => prev.map(agent => {
      if (winners.includes(agent.id)) {
        const isTopWinner = winners[0] === agent.id
        return {
          ...agent,
          status: 'rewarded',
          reward: isTopWinner ? 10 : 5
        }
      }
      return agent
    }))

    // Trigger reward allocation
    if (activeIntention) {
      allocateRewards(activeIntention.id, winners)
    }
  }

  const allocateRewards = async (intentionId: string, winnerIds: string[]) => {
    console.log('Allocating rewards to:', winnerIds)
    // In production, this would call the allocation API
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Intent Market
        </h1>

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
            <button
              onClick={createIntention}
              disabled={isSimulating || !userInput.trim()}
              className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSimulating ? 'Agents Working...' : 'Broadcast Intent'}
            </button>
          </div>
        </div>

        {/* Agent Visualization */}
        <div className="relative h-96 bg-gray-800 rounded-lg overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900 opacity-50"></div>
          
          <AnimatePresence>
            {agents.map((agent) => (
              <motion.div
                key={agent.id}
                className="absolute"
                style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: agent.status === 'awakening' ? 1.2 : 
                         agent.status === 'thinking' ? 1.1 :
                         agent.status === 'submitting' ? 1.3 :
                         agent.status === 'rewarded' ? 1.5 : 1
                }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      agent.status === 'sleeping' ? 'opacity-50' :
                      agent.status === 'rewarded' ? 'ring-4 ring-yellow-400 shadow-2xl' : 
                      'shadow-lg'
                    }`}
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.name.split(' ')[1]}
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
                  
                  {agent.status === 'rewarded' && (
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
            <h2 className="text-2xl font-bold mb-4">Agent Submissions</h2>
            <div className="space-y-3">
              {agents.filter(a => a.suggestion).map((agent) => (
                <motion.div
                  key={agent.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`bg-gray-800 rounded-lg p-4 flex items-center justify-between ${
                    selectedAgents.includes(agent.id) ? 'ring-2 ring-yellow-400' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-10 h-10 rounded-full"
                      style={{ backgroundColor: agent.color }}
                    ></div>
                    <div>
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-sm text-gray-400">{agent.suggestion}</div>
                    </div>
                  </div>
                  {agent.reward && (
                    <div className="text-yellow-400 font-bold">
                      ${agent.reward} earned
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {!selectedAgents.length && (
              <button
                onClick={selectWinners}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all"
              >
                Select Winners & Allocate Rewards
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}