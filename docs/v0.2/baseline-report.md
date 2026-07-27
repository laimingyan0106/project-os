# v0.1 baseline report

Date: 2026-07-27
Branch point: `51961d5 Release Project OS v0.1`

## Confirmed implementation

- Next.js 16.2.12 App Router, React 19.2.4 and TypeScript.
- Tailwind CSS 4 with local shadcn/ui source components.
- Dashboard, Projects, Inbox, Agent Center, Workflow Editor and Settings.
- React Flow graph editing and browser-local `project-os:v1` persistence.
- Lazy Supabase browser client and a non-migration v0.1 schema draft.
- Public v0.1 deployment at `https://project-os-chi.vercel.app`.

## Baseline commands

Executed sequentially because `next build` rebuilds `.next/types` and must not
race `tsc --noEmit`.

| Command | Result |
| --- | --- |
| `npm install` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed; seven application routes prerendered |
| `npm run typecheck` | Passed |

## Known baseline risks

- Production data is still browser-local and has no account boundary.
- The Dashboard completion-rate card is hard-coded.
- Workflow is a singleton JSON graph.
- Settings exposes environment-variable guidance that must be removed from the
  production v0.2 UI.
- The first S0 browser run exposed a React render-phase update in Workflow
  persistence; S0 fixes it before establishing the regression baseline.
- `npm audit` reports upstream issues in the current Next.js dependency tree;
  the suggested automatic fix is a breaking downgrade and was not applied.
