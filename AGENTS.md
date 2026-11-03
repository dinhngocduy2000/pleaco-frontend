# Pleco Frontend — Agent Instructions

These are repository-wide invariants for Pleco's **single Vite SPA**. Use relevant `.agents/skills/` for specialist implementation guidance; do not duplicate entire skill manuals here.

## 1. Project and source of truth

- Stack: React 19, TypeScript (strict), Vite, TanStack Router (file-based), TanStack React Query, Redux Toolkit, Axios, react-hook-form + Zod, Tailwind CSS v4, Shadcn/Radix, Paraglide i18n, Biome, Vitest/Testing Library, Playwright, and pnpm.
- Production is a **static Vite build served by nginx**, not SSR or a monorepo. Do not introduce Next.js, React Server Components, server actions, backend frameworks, or a second router without an explicit architecture-change request.
- **Source-of-truth order:** explicit task requirements → current repository code/configuration and established contracts → this file → relevant Pleco skills → generic specialist advice/examples. Surface material conflicts rather than silently changing conventions.
- Inspect `package.json`, config files, and nearby code for actual commands, dependency versions, and patterns; do not treat this file as a version lockfile.

## 2. Skill router

Route by **task intent**, not simple keyword matches. For non-trivial tasks, select one **primary** skill, then add supporting skills only for genuinely overlapping concerns. Read the selected `.agents/skills/<skill-name>/SKILL.md` before use. **Do not load all skills by default.**

| If the task involves... | Primary skill | Add when needed |
| --- | --- | --- |
| React/TypeScript components, hooks, routes, styling, i18n, frontend structure, or general feature implementation | `pleco-frontend` | `pleco-data-layer` for API/state changes; `pleco-security` for sensitive flows |
| Axios API functions, React Query, cache invalidation, response envelopes, Zod contracts, or choosing Redux vs server state | `pleco-data-layer` | `pleco-frontend` for component integration; `pleco-security` for auth/tenant data |
| Pleco Playwright E2E specs, fixtures, page objects, auth storage state, `src/tests/`, or `playwright.config.ts` | `pleco-e2e` | `playwright-expert` for complex browser tooling, reliability, or CI |
| General Playwright diagnostics, advanced locators, visual regression, reporter/CI setup, or flaky browser tests | `playwright-expert` | `pleco-e2e` for Pleco-specific patterns (takes precedence) |
| WebSocket/Socket.IO clients, live telemetry, Teach Mode updates, reconnection, heartbeat, or realtime robot/task events | `websocket-engineer` | `pleco-data-layer` for server-state updates; `pleco-security` for authenticated realtime flows |
| JSDoc, developer docs, API docs, user guides, or documentation-focused updates | `code-documenter` | Relevant domain skill for technical accuracy |
| Authentication UI, RBAC, tenant scoping, unsafe inputs/URLs, client secrets, operational controls, or frontend security review | `pleco-security` | `pleco-frontend` or `pleco-data-layer` for implementation; `websocket-engineer` for realtime security |
| React rendering performance, bundle optimization, rerender profiling, or targeted React best-practice review | `vercel-react-best-practices` | `pleco-frontend` to preserve Pleco architecture and conventions |

**Multi-skill examples:**

- Robot inventory with live status: `pleco-frontend` + `pleco-data-layer`; add `websocket-engineer` if changing realtime subscriptions.
- Teach Mode map updates: `websocket-engineer` + `pleco-frontend`; add `pleco-security` for authenticated remote control.
- Secure robot command UI: `pleco-security` + `pleco-frontend`; add `websocket-engineer` for command acknowledgements and live state.
- Flaky Playwright E2E test: `pleco-e2e` + `playwright-expert`.

Pleco-specific skill conventions and existing code win over generic examples (including Next.js/server-side examples in performance or security skills). For simple routine changes with no matching specialty, use repository conventions without forcing a skill.

## 3. Structure and generated files

- Preserve the existing `src/` layout: `routes/` (TanStack Router), `api/` (Axios/API functions), `queries/` (React Query), `schemas/` (Zod), `interface/` and `enum/` (shared contracts), `stores/` (Redux), `components/`, `hooks/`, `lib/`, and `tests/` (Playwright).
- **Never manually edit** `src/routeTree.gen.ts` or generated files under `src/paraglide/`; change their source inputs and rerun the appropriate generator instead.
- Use `@/` for cross-directory imports and local relative imports for closely colocated modules; use `import type` for type-only imports where required. Do not weaken strict TypeScript options or introduce avoidable `any`.
- Biome owns formatting/linting; do not add parallel ESLint/Prettier tooling without explicit approval.

## 4. State, data, and UI boundaries

| Concern | Owner |
| --- | --- |
| API/server state and caching | TanStack React Query |
| Global, non-server client/UI state | Redux Toolkit |
| Shareable URL filters, search, pagination | TanStack Router search params |
| Form state and validation | react-hook-form + Zod |
| Local component state | React state/hooks |

- Do not duplicate API/server state into Redux or Context. Preserve the data path: **component → query/mutation hook → API function → configured Axios client → backend**.
- The configured Axios interceptor returns the backend **response envelope**, not the raw Axios response. Reuse existing endpoint enums, query-key and invalidation conventions; consult `pleco-data-layer` for details.
- Follow the existing Shadcn/Radix component patterns, `src/styles.css` theme tokens (including light/dark modes), and lucide-react icons. Do not create a competing design system.
- For routes, modify source files under `src/routes/`; do not introduce alternate routing patterns.
- For translations, English (`en`) is the source language and Vietnamese (`vi`) is supported. Edit translation sources under `messages/` and use generated Paraglide APIs in application code.

## 5. Pleco-specific safety and realtime invariants

- **Tenant/group scoping, RBAC-aware UI, and protected actions** must remain consistent across maps, robots, tasks, fleets, and commands. Frontend checks are UX only; never assume they replace backend authorization.
- Preserve map world/physical coordinates separately from canvas/screen pixels. Perform conversions only through the established coordinate conversion abstraction; use existing map rendering patterns for boundaries, regions, docks, trajectories, and Teach Mode.
- Realtime robot telemetry, connection status, and command feedback can arrive late, duplicate, out of order, or after reconnection. Follow the established message/state handling; never treat message dispatch or broker acknowledgement as confirmation that a robot physically executed a command.
- Render remote-control and emergency-stop actions according to existing authorization, acknowledgement, pending/failed/timeout, and connection-state UX. Do not silently show an action as successful before confirmed execution.
- Treat Vite `import.meta.env.VITE_*` values as **public build-time data**. Never put secrets in frontend env variables or client bundles, or expose sensitive credentials in logs, UI, or error messages.
- Preserve the existing static deployment model; inspect `Dockerfile` and `nginx.conf` for deployment changes rather than adding server logic to React.

## 6. Change and verification workflow

1. Inspect target files, nearby patterns, tests, and relevant configuration. Select the smallest applicable skill set.
2. Make the smallest coherent change; preserve strict typing, state ownership, API contracts, existing design tokens, generated-file boundaries, and unrelated behavior.
3. Test the affected behavior with the existing tools: **Vitest + Testing Library** for unit/components; **Playwright** for E2E. Prefer independent tests, semantic locators, web-first assertions, and no arbitrary hard waits.
4. Run relevant scripts actually defined in `package.json` (typically `pnpm lint`, targeted tests, and `pnpm build` for routing/build-sensitive changes). For broad refactors, run broader checks when practical.
5. Review the diff and report what changed, checks **actually run**, failures, and unverified areas. Never claim unrun tests passed or weaken assertions/type/lint settings to hide a failure. Do not leave avoidable TODO placeholders or unrelated edits.


## 7. Code Review Rules

When reviewing frontend code changes, prioritize:

- Group isolation, RBAC, and permission-aware UI behavior.
- API contract compatibility, response envelopes, and robot UUID identity.
- React Query caching, invalidation, and server-state consistency.
- Redux, URL-state, form-state, and local-state ownership.
- Map geometry, workspace constraints, and world-to-canvas coordinate transformations.
- WebSocket/Socket.IO lifecycle, reconnection, and stale or out-of-order telemetry.
- Robot command acknowledgement, execution states, timeouts, and emergency-stop UI safety.
- Loading, error, and empty states, accessibility, and unintended UI regressions.

Report actionable defects with:
- Severity (Critical, High, Medium, Low).
- File path and line number.
- Impact and supporting evidence.
- Recommended fix when applicable.

Prioritize correctness, security, reliability, and user safety.
Avoid stylistic comments unless they cause real issues.
Do not report speculative defects without evidence.
