# AGENTS.md

Instructions for coding agents (Codex and others) working in this repository.

1. **Read `CLAUDE.md` and `docs/handover.md` first**, before any change. Follow every rule in
   them: content style, design, accessibility, security, testing and workflow. They win over
   your defaults.
2. **Work on a branch, never on `main`.** Push it and share the Vercel preview link for review.
3. **Never merge without every check passing:** `npm run lint`, `npm run typecheck`, `npm test`
   and `npm run build`, with zero errors or warnings, plus the relevant `npm run e2e:*` checks
   listed in `CLAUDE.md`. Merge only when the owner has approved it.
4. **Never apply SQL to the production database.** Write migrations in `supabase/migrations/`,
   show the SQL to the owner, and let them approve and apply it. Previews share the production
   database, so treat them as production too.
5. **Never change Stripe or environment variables** (Vercel, Supabase, Resend or any dashboard),
   and never ask for, print or commit secrets.
6. **Update `docs/handover.md` after each task:** what changed, open branches, decisions and
   anything waiting on the owner. Replace old information; keep it short.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
