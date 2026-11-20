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
| Accessibility audits of existing UI, WCAG 2.2 AA findings, axe-core/pa11y results, keyboard or screen-reader issues, focus/contrast checks, or remediation of verified violations | `accessibility-engineering` | `pleco-frontend` for component fixes; `pleco-e2e` for regression coverage; `playwright-expert` for browser-tooling issues |
| Reviewing a diff/PR, checking changes before merge, or performing final quality review after implementation, refactoring, or bug fixes | `code-review-and-quality` | `pleco-security` for security-sensitive changes; `accessibility-engineering` for accessibility issues; `vercel-react-best-practices` for React performance investigations |
| WebSocket/Socket.IO clients, live telemetry, Teach Mode updates, reconnection, heartbeat, or realtime robot/task events | `websocket-engineer` | `pleco-data-layer` for server-state updates; `pleco-security` for authenticated realtime flows |
| JSDoc, developer docs, API docs, user guides, or documentation-focused updates | `code-documenter` | Relevant domain skill for technical accuracy |
| Authentication UI, RBAC, tenant scoping, unsafe inputs/URLs, client secrets, operational controls, or frontend security review | `pleco-security` | `pleco-frontend` or `pleco-data-layer` for implementation; `websocket-engineer` for realtime security |
| React rendering performance, bundle optimization, rerender profiling, or targeted React best-practice review | `vercel-react-best-practices` | `pleco-frontend` to preserve Pleco architecture and conventions |

**Multi-skill examples:**

- Robot inventory with live status: `pleco-frontend` + `pleco-data-layer`; add `websocket-engineer` if changing realtime subscriptions.
- Teach Mode map updates: `websocket-engineer` + `pleco-frontend`; add `pleco-security` for authenticated remote control.
- Secure robot command UI: `pleco-security` + `pleco-frontend`; add `websocket-engineer` for command acknowledgements and live state.
- Flaky Playwright E2E test: `pleco-e2e` + `playwright-expert`.
- Accessibility audit of the map editor or robot controls: `accessibility-engineering` + `pleco-frontend`; add `pleco-e2e` for lasting regression tests.
- New form, dialog, or interactive control: start with `pleco-frontend`; use `accessibility-engineering` when the rendered UI needs auditing or a verified issue needs fixing.
- Review a robot-command PR: `code-review-and-quality` + `pleco-security`; use `websocket-engineer` only if the review needs deeper realtime-protocol analysis.
- Review a React rendering regression: `code-review-and-quality` + `vercel-react-best-practices`; preserve `pleco-frontend` conventions.

Pleco-specific skill conventions and existing code win over generic examples (including Next.js/server-side examples in performance or security skills). For simple routine changes with no matching specialty, use repository conventions without forcing a skill.

**Accessibility ownership:** `pleco-frontend` remains primary for building new UI, including semantic markup and accessible interaction patterns. `accessibility-engineering` is primary for evaluating an existing interface and remediating findings. If that skill refers to a generic `frontend-ui-engineering` skill, do not substitute it for Pleco's established frontend conventions; use it only if installed and genuinely needed as supporting guidance.

**Code-review ownership:** `code-review-and-quality` supplies the five-axis review process (correctness, readability, architecture, security, performance). Section 7 supplies Pleco-specific priorities and finding format. For detailed security and React performance guidance, prefer `pleco-security` and `vercel-react-best-practices` over generic skills named in review examples. Review changes without treating a review request as permission to merge, rewrite unrelated code, or delete uncertain dead code.

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
   - For accessibility-sensitive UI changes or release audits, follow `accessibility-engineering`: run its pinned axe-core/pa11y checks against the **actual running app URL** (inspect the Vite configuration rather than assuming port 3000). Use the skill's bundled `audit-a11y.sh` only after confirming its path exists in the repository.
   - Automated audits alone do not establish WCAG conformance. Check relevant keyboard/focus behavior, accessible names, screen-reader announcements, contrast, zoom, and touch targets; report the browser/assistive-technology combination used. Mark unavailable manual checks as **not verified**, and treat missing/failed audit tooling as an incomplete audit, not a pass.
4. Run relevant scripts actually defined in `package.json` (typically `pnpm lint`, targeted tests, and `pnpm build` for routing/build-sensitive changes). For broad refactors, run broader checks when practical.
5. Review the diff using `code-review-and-quality` before marking implementation complete or merge-ready; inspect test coverage, correctness, simplicity, architecture, security, performance, and potential regressions. For explicit PR reviews, first confirm the checked-out revision and note any uncommitted changes. Any suggested mutation experiment must use an isolated/disposable copy and must not overwrite existing user changes.
6. Report what changed, checks **actually run**, failures, review findings, and unverified areas. Never claim unrun tests passed or weaken assertions/type/lint settings to hide a failure. Do not leave avoidable TODO placeholders or unrelated edits.


## 7. Code Review Rules

Use `code-review-and-quality` for review procedure and its five quality axes. Apply the following Pleco-specific priorities when reviewing frontend code changes:

- Group isolation, RBAC, and permission-aware UI behavior.
- API contract compatibility, response envelopes, and robot UUID identity.
- React Query caching, invalidation, and server-state consistency.
- Redux, URL-state, form-state, and local-state ownership.
- Map geometry, workspace constraints, and world-to-canvas coordinate transformations.
- WebSocket/Socket.IO lifecycle, reconnection, and stale or out-of-order telemetry.
- Robot command acknowledgement, execution states, timeouts, and emergency-stop UI safety.
- Loading, error, and empty states; accessibility regressions in semantic controls, keyboard/focus order, screen-reader feedback, contrast, and touch targets; unintended UI regressions.

Report actionable defects with:
- Severity (Critical, High, Medium, Low).
- File path and line number.
- Impact and supporting evidence.
- Recommended fix when applicable.

Distinguish regressions introduced by the reviewed change from pre-existing issues. Mark non-blocking suggestions as optional; never invent findings to fill a checklist. For dependency changes, review `package.json` and `pnpm-lock.yaml`, use the repository's pnpm tooling, and do not hand-edit the lockfile or adopt npm commands solely because a generic skill example uses them.

Prioritize correctness, security, reliability, and user safety.
Avoid stylistic comments unless they cause real issues.
Do not report speculative defects without evidence.
