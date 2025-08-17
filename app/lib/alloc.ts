export interface Submission {
  id: string
  score: number
  dedupeHash: string
  agentId: string
  status: string
}

export interface AllocationInput {
  budgetUsd: number
  winnersCount: number
  participationUsd: number
  selectionUsd: number
  threshold: number
  submissions: Submission[]
  selectedIds?: string[]
}

export interface AllocationResult {
  participationIds: string[]
  selectionIds: string[]
  totals: {
    participationUsd: number
    selectionUsd: number
    totalUsd: number
  }
}

export function allocateRewards(input: AllocationInput): AllocationResult {
  const {
    budgetUsd,
    winnersCount,
    participationUsd,
    selectionUsd,
    threshold,
    submissions,
    selectedIds = []
  } = input

  // Filter qualified submissions (score >= threshold)
  const qualified = submissions.filter(s => s.score >= threshold)
  
  // Remove duplicates by dedupeHash, keeping highest score
  const deduped = new Map<string, Submission>()
  qualified.forEach(sub => {
    const existing = deduped.get(sub.dedupeHash)
    if (!existing || sub.score > existing.score) {
      deduped.set(sub.dedupeHash, sub)
    }
  })
  
  // Sort by score descending
  const sorted = Array.from(deduped.values()).sort((a, b) => b.score - a.score)
  
  // Calculate max participation count given budget
  const selectionBudget = Math.min(selectedIds.length, winnersCount) * selectionUsd
  const remainingBudget = budgetUsd - selectionBudget
  const maxParticipationCount = Math.floor(remainingBudget / participationUsd)
  
  // Select participation recipients (top scored up to max count)
  const participationIds = sorted
    .slice(0, maxParticipationCount)
    .map(s => s.id)
  
  // Use provided selection or take top winnersCount
  const selectionIds = selectedIds.length > 0
    ? selectedIds.slice(0, winnersCount)
    : sorted.slice(0, winnersCount).map(s => s.id)
  
  // Calculate totals
  const totalParticipationUsd = participationIds.length * participationUsd
  const totalSelectionUsd = selectionIds.length * selectionUsd
  const totalUsd = totalParticipationUsd + totalSelectionUsd
  
  // Validate budget constraint
  if (totalUsd > budgetUsd) {
    throw new Error(`Total payout ${totalUsd} exceeds budget ${budgetUsd}`)
  }
  
  return {
    participationIds,
    selectionIds,
    totals: {
      participationUsd: totalParticipationUsd,
      selectionUsd: totalSelectionUsd,
      totalUsd
    }
  }
}