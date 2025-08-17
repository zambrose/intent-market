'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, Users, Trophy, ChevronDown, ChevronUp } from 'lucide-react'

interface IntentionHistory {
  id: string
  title: string
  description: string
  createdAt: string
  status: string
  budgetUsd: number
  submissions: any[]
  _count: {
    submissions: number
  }
  selectedSubmissions?: any[]
}

export default function HistoryPage() {
  const [intentions, setIntentions] = useState<IntentionHistory[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/intentions')
      const data = await res.json()
      setIntentions(data)
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = async (intentionId: string) => {
    if (expandedId === intentionId) {
      setExpandedId(null)
    } else {
      // Fetch full details including submissions
      try {
        const res = await fetch(`/api/intentions/${intentionId}`)
        const data = await res.json()
        setIntentions(prev => prev.map(i => 
          i.id === intentionId ? { ...i, ...data } : i
        ))
        setExpandedId(intentionId)
      } catch (error) {
        console.error('Failed to fetch intention details:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-green-400'
      case 'CLOSED': return 'text-yellow-400'
      case 'COMPLETE': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Query History
            </h1>
          </div>
          <div className="text-sm text-gray-400">
            {intentions.length} total queries
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : intentions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400">No queries yet. Start by creating an intention!</p>
            <Link
              href="/"
              className="mt-4 inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Create First Intention
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {intentions.map((intention) => (
              <motion.div
                key={intention.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-lg overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-750 transition-colors"
                  onClick={() => toggleExpand(intention.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold">{intention.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full bg-gray-700 ${getStatusColor(intention.status)}`}>
                          {intention.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{intention.description}</p>
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(intention.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4" />
                          <span>${intention.budgetUsd}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{intention._count?.submissions || 0} submissions</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      {expandedId === intention.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedId === intention.id && intention.submissions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-700"
                  >
                    <div className="p-6 space-y-4">
                      <h4 className="text-lg font-semibold mb-3">Agent Submissions</h4>
                      {intention.submissions.map((submission: any) => (
                        <div
                          key={submission.id}
                          className={`p-4 bg-gray-900 rounded-lg ${
                            submission.status === 'SELECTED' ? 'ring-2 ring-yellow-400' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-semibold">
                                  {submission.agent?.agentProfile?.displayName || submission.agentId}
                                </span>
                                {submission.status === 'SELECTED' && (
                                  <Trophy className="w-4 h-4 text-yellow-400" />
                                )}
                              </div>
                              <p className="text-sm text-gray-300">
                                {submission.payloadJson?.suggestion || 'No suggestion'}
                              </p>
                              {submission.payloadJson?.details && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {submission.payloadJson.details}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Score</div>
                              <div className="text-sm font-semibold">
                                {submission.score ? submission.score.toFixed(1) : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {intention.submissions.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No submissions yet</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}