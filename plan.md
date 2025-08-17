plan.md

A concise implementation plan for the Intent Marketplace & Fair Rewards (Next.js + Coinbase CDP on Base testnet).

⸻

0. One‑pager

Goal: Users post intentions, agents submit proposals, system allocates participation and selection rewards in USDC via Coinbase CDP wallets.

Demo script: 1. Sign in → wallet auto‑created. 2. Create an intention (budget $50, 10 winners, 12h window). 3. Agents submit (seed + live form). 4. Filter + rank, requester selects winners. 5. Click Allocate Rewards → on‑chain payouts animate.

⸻

1. Architecture
   • UI: Next.js (App Router), Tailwind, shadcn/ui, framer‑motion, wagmi/viem (read‑only onchain)
   • API: Next.js route handlers under /app/api/\*
   • DB: Postgres (Supabase/Neon) via Prisma
   • Chain: Base Sepolia; USDC test token
   • Wallets/Onramp/Transfers: Coinbase CDP (WaaS + Pay + Transfers)
   • Jobs: simple cron (QStash/Upstash) for window close + allocation

⸻

2. Data model (Prisma)

model User {
id String @id @default(cuid())
email String @unique
role UserRole
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
wallet Wallet?
agentProfile AgentProfile?
}

model Wallet {
id String @id @default(cuid())
userId String @unique
cdpWalletId String
address String @unique
network String
createdAt DateTime @default(now())
}

model Intention {
id String @id @default(cuid())
userId String
title String
description String
category String
budgetUsd Decimal
winnersCount Int
participationUsd Decimal
selectionUsd Decimal
status IntentionStatus
windowEndsAt DateTime
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

model Submission {
id String @id @default(cuid())
intentionId String
agentId String
payloadUrl String?
payloadJson Json
dedupeHash String
score Float?
status SubmissionStatus
createdAt DateTime @default(now())
}

model Review {
id String @id @default(cuid())
submissionId String
reviewerId String
relevance Int
novelty Int
notes String?
createdAt DateTime @default(now())
}

model Payout {
id String @id @default(cuid())
submissionId String
walletFrom String
walletTo String
amountUsd Decimal
txHash String?
kind PayoutKind
status PayoutStatus
createdAt DateTime @default(now())
}

model AgentProfile {
userId String @id
displayName String
maxSubmissions Int @default(2)
bio String?
createdAt DateTime @default(now())
}

Enums

enum UserRole { REQUESTER AGENT BOTH }

enum IntentionStatus { DRAFT OPEN CLOSED PAYOUTS_PENDING COMPLETE }

enum SubmissionStatus { PENDING QUALIFIED REJECTED SELECTED PAID }

enum PayoutKind { PARTICIPATION SELECTION }

enum PayoutStatus { PENDING SENT CONFIRMED FAILED }

⸻

3. API surface

Auth & Wallet
• POST /api/wallets → create CDP wallet { cdpWalletId, address, network }
• POST /api/onramp/session → Coinbase Pay session link

Intentions
• POST /api/intentions → create
• GET /api/intentions?status=OPEN → agent discovery
• GET /api/intentions/:id → detail incl. counts/time remaining
• POST /api/intentions/:id/open | POST /api/intentions/:id/close

Submissions & Scoring
• POST /api/intentions/:id/submissions → enforce per‑agent cap + dedupeHash
• POST /api/intentions/:id/score → batch score pending (admin/requester)
• POST /api/submissions/:id/review → relevance/novelty 1–5

Selection & Payouts
• POST /api/intentions/:id/select { submissionIds: string[] }
• POST /api/intentions/:id/allocate → run allocation, create Payout rows, call CDP transfers
• POST /api/webhooks/cdp → update payout status on confirmations

⸻

4. Reward policy (MVP)
   • Fixed submission window; accept until windowEndsAt.
   • Pre‑screen dupes/out‑of‑bounds; mark QUALIFIED if score ≥ threshold.
   • Participation: pay top‑scored qualified up to pool limit.
   • Selection: requester picks up to winnersCount; pay selectionUsd each.
   • Budget guardrails: participationPaid _ participationUsd + selected _ selectionUsd ≤ budgetUsd.
   • Default split: 50% participation / 50% selection (configurable).

⸻

5. UI routes
   • / Landing
   • /intent/new Wizard
   • /intent/:id Requester dashboard (rank, select, allocate)
   • /market Agent feed
   • /submit/:intentionId Agent form
   • /wallet Balance, onramp, history

⸻

6. Environment

DATABASE_URL=
NEXTAUTH_SECRET=
COINBASE_CDP_API_KEY=
COINBASE_CDP_API_SECRET=
CDP_NETWORK=base-sepolia
USDC_CONTRACT_ADDRESS=0x...
APP_BASE_URL=https://...

⸻

7. Implementation punch list

Day 1
• Bootstrap Next.js (App Router), Tailwind, shadcn/ui, Prisma
• NextAuth (email magic link)
• Prisma schema + prisma migrate dev
• Wallet: /api/wallets (CDP create), /wallet page
• Intent CRUD: create, list OPEN, detail view; open/close actions

Day 2
• Submissions API + form (cap, dedupe)
• Simple scoring endpoint and UI sliders (relevance/novelty)
• Ranking UI in requester dashboard
• Selection flow (/select), persisted SELECTED
• Payout model + allocate endpoint (dry‑run mode)

Day 3 (polish + chain)
• CDP transfer integration (USDC on Base Sepolia)
• Webhook for transfer confirmations → mark Payout.status
• Timer/cron to auto‑close window & trigger allocation
• Animations, toasts, copy, seed script

Stretch
• Agent reputation (win rate)
• Budget auto‑tuner
• Light staking for anti‑spam

⸻

8. Testing & demo data
   • Seed script: 1 requester, 5 agents, 1 open intention, 25 submissions
   • Unit: dedupe, cap, allocation math, budget guardrails
   • Integration: create → submit → select → allocate → webhook confirm

⸻

CLAUDE.md

Guidelines for Claude Code acting as our coding copilot for this repo.

Mission

Implement the Intent Marketplace & Fair Rewards MVP quickly, safely, and with clean scaffolding for extensions.

Coding ground rules 1. TypeScript everywhere (Next.js App Router). 2. Prisma for DB; generate types; use Zod for request validation. 3. No secret leakage; env access only via process.env.\*; validate with env.mjs (zod). 4. Small PRs; each PR maps to a checklist item. 5. Testing first where feasible: unit for pure functions (allocation), light integration on APIs.

Project setup tasks
• Create Next.js app with --ts --eslint --app.
• Add Tailwind, shadcn/ui, framer‑motion, Prisma, NextAuth, Zod, viem/wagmi.
• Create env.mjs with Zod schema for required vars.
• Configure Prisma schema.prisma per plan; run migrations.

Directory conventions

/app
/api
/intentions
route.ts // POST create, GET list
/[id]
route.ts // GET detail
/open/route.ts // POST open
/close/route.ts // POST close
/submissions/route.ts// POST create submission
/score/route.ts // POST batch score
/select/route.ts // POST selections
/allocate/route.ts // POST allocate payouts
/(marketing)
/(dashboard)
/lib
/cdp.ts // Coinbase CDP client helpers
/db.ts // Prisma client
/alloc.ts // allocation math (pure functions + tests)
/dedupe.ts // normalize + hash util
/auth.ts // NextAuth config
/components
// ui components
/prisma
schema.prisma
/tests
alloc.test.ts
api-allocate.test.ts

Build order for Claude 1. Schema & types: implement Prisma models + enums; generate client. 2. Env & clients: db.ts, cdp.ts with stubbed transfer + wallet create. 3. Auth: NextAuth email provider; protect /dashboard routes. 4. Intentions API: create/list/detail/open/close with Zod validation. 5. Submissions API: cap + dedupe + payload validation. 6. Scoring: simple scorer util; endpoint to batch score pending. 7. Selection: persist SELECTED; enforce winnersCount. 8. Allocation: implement alloc.ts pure functions + tests; wire /allocate. 9. CDP transfers: replace stubs with real calls; add webhook route → update Payout. 10. UI: minimal but slick pages; requester dashboard with live ranking.

Allocation rules (reference, must match tests)
• Input: budgetUsd, winnersCount, participationUsd, selectionUsd, threshold, submissions[].
• Steps:
• Filter to score ≥ threshold and unique by dedupeHash.
• Sort by score desc.
• Compute max participation count given remaining budget after reserving winnersCount \* selectionUsd.
• Pay top‑scored qualified up to that count.
• Winners = up to winnersCount chosen by requester.
• Assert total payout ≤ budget; error if not.
• Output: { participationIds: string[], selectionIds: string[], totals: { usd } }.

Coinbase CDP usage
• createWallet(userId) → { cdpWalletId, address }
• createOnrampSession(address, amountUsd) → url
• transferUsdc(fromWalletId, toAddress, amountUsd) → { txHash }
• Handle webhook events: update Payout.status to CONFIRMED on success.

Quality bar
• Lint/format clean; no any unless justified.
• API handlers: validate inputs with Zod; return typed errors.
• Log with context: intentId, userId, submissionId.
• Minimal but tasteful UI: dark theme, gradient accents, motion on payouts.

Git hygiene
• Branch naming: feat/intentions-api, feat/allocate, chore/cdp-client.
• Conventional commits: feat:, fix:, chore:, test:, docs:.
• PR checklist:
• Types compile
• Tests pass
• Env docs updated
• Screenshots for UI changes

Prompts Claude can run (examples)
• “Generate Prisma models and migration for schema in plan.md.”
• “Create /app/api/intentions/route.ts with POST create + GET list using Zod.”
• “Implement alloc.ts pure function with tests per Allocation rules.”
• “Stub Coinbase CDP client with interfaces + mock responses.”
• “Add /app/api/intentions/[id]/allocate/route.ts that calls alloc.ts and creates Payout rows.”
• “Build /intent/[id] dashboard: table of submissions, manual scores, select winners, run payouts.”

Runbook
• pnpm install
• pnpm prisma migrate dev
• pnpm dev
• Seed: add script that creates 1 requester, 5 agents, 1 intention, 25 submissions.

Non‑negotiables
• Never exceed budget in allocation.
• Enforce per‑agent submission cap.
• Dedupe by normalized link/title.
• Don’t hit CDP in tests; mock it.
