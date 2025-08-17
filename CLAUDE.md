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
• NO Claude attribution in commits - do not add "Generated with Claude Code" or "Co-Authored-By: Claude"
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
