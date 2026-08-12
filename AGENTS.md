# Pleco — Realtime Autonomous Cleaning Robot Platform — Frontend Agent Instructions

## Project Scope

Pleco Frontend is a single Vite SPA for a multi-tenant, realtime autonomous cleaning robot
management platform. It provides the operator-facing UI for environment mapping, robot and fleet
management, cleaning task planning, realtime robot monitoring, remote control, incidents, RBAC,
and related frontend features.

Key frontend product areas include:

- coordinate-based room/floor/surface map creation and editing
- Manual Draw and robot-assisted Teach Mode perimeter mapping
- robot and fleet CRUD, assignment, and operational status
- General, Multiple Round, and Custom cleaning-task configuration
- custom trajectory/checkpoint drawing and validation UI
- realtime robot position, direction, battery, cleaning state, and task progress
- remote robot controls and command acknowledgement state
- incident visibility for stuck, collision, connectivity, and task failures
- tenant-scoped user experiences and RBAC-aware controls

Robot/device communication, RabbitMQ/MQTT processing, Redis distribution, persistence, and other
backend responsibilities remain outside this frontend repository. The frontend communicates with the
backend through the established HTTP and WebSocket contracts.

This repository is not a monorepo and is not a server-rendered application.

Core stack:

- Vite 7
- React 19
- TypeScript 5.9.3+ with strict mode
- TanStack Router with file-based routes
- TanStack React Query for server state
- Redux Toolkit for global client/UI state
- Axios for HTTP
- react-hook-form + Zod 4 for forms and validation
- Tailwind CSS v4
- Shadcn UI patterns + Radix UI
- lucide-react
- Paraglide for i18n
- Biome for linting and formatting
- Vitest + Testing Library for unit/component tests
- Playwright for E2E tests
- pnpm as the package manager

Production is a static Vite build served by nginx. Do not introduce Next.js, React Server
Components, SSR, server actions, or backend-only architecture unless the task explicitly changes
the project's architecture.

## Instruction Strategy

This `AGENTS.md` contains repository-wide rules that should stay active for all work.

Detailed implementation guidance lives in repository skills under `.agents/skills/`. For
non-trivial work, identify the relevant skill or skills and follow their instructions rather than
duplicating those rules here.

Multiple skills may apply to one task.

### Available Project Skills

#### `pleco-frontend`

Use for:

- React/TypeScript implementation
- component and hook conventions
- TanStack Router work
- feature/file organization
- imports and dependency boundaries
- Tailwind/Shadcn UI
- i18n
- general frontend architecture

#### `pleco-data-layer`

Use for:

- `src/api/`
- `src/queries/`
- `src/interface/`
- `src/enum/`
- `src/schemas/`
- Axios
- React Query hooks and query keys
- API response envelopes
- cache invalidation
- Zod-derived types
- Redux/server-state ownership decisions

#### `pleco-e2e`

Use for:

- Playwright tests
- `src/tests/`
- page objects
- fixtures
- auth storage state
- API interception/mocking in E2E tests
- E2E reliability/debugging
- `playwright.config.ts`

#### `playwright-expert`

Use as supplementary Playwright expertise for:

- browser-test setup, reporting, and CI integration
- robust locators, page-object design, and fixtures
- API mocking and visual regression testing
- diagnosing and eliminating flaky E2E tests

For Pleco E2E work, `pleco-e2e` remains authoritative for project conventions.

#### `websocket-engineer`

Use for:

- WebSocket or Socket.IO client features
- realtime robot telemetry and bidirectional messaging
- live robot position, cleaning-task state, incident, and Teach Mode map updates
- connection lifecycle handling, reconnection, heartbeats, and message delivery behavior
- assessing client-side requirements for scalable realtime systems

For frontend security-sensitive real-time work, also use `pleco-security`.

#### `code-documenter`

Use for:

- developer-facing documentation and user guides
- JSDoc and other TypeScript documentation
- API specifications and interactive API documentation
- validating documentation code examples

#### `pleco-security`

Use for:

- security-sensitive frontend changes
- authentication state, RBAC, tenant isolation, and protected-UI review
- user-controlled HTML or URLs
- secrets and frontend environment exposure
- sensitive data, tenant-scoped robot data, and operational telemetry handling
- frontend logging/error exposure
- file-upload security considerations
- frontend deployment/security-header review

This skill is frontend-scoped. Do not import unrelated Next.js, Hono, MikroORM, or other backend/server-rendered patterns from
source material outside Pleco's established frontend architecture.

#### `vercel-react-best-practices`

Use as additional React performance and optimization guidance when relevant.

Treat this skill as an optimization advisor within the existing Pleco architecture, not as a
replacement for project-specific conventions.

## Skill Precedence

When guidance overlaps:

1. A domain-specific Pleco skill is authoritative for its domain.
2. `pleco-frontend` supplies the general Pleco frontend architecture.
3. `vercel-react-best-practices` supplies general React performance guidance.

If Vercel guidance conflicts with Pleco-specific architecture, file placement, data flow,
naming, framework choices, or state-management conventions, follow the Pleco convention.

Examples:

- Keep Pleco's dedicated React Query hook/API-function architecture even if a generic
  optimization suggests reorganizing data fetching.
- Keep Pleco file placement and naming when applying a React rendering optimization.
- Security requirements take priority over a performance optimization that would expose sensitive
  data or weaken a trust boundary.

When two Pleco references appear to disagree and the relevant skill does not resolve the
conflict, inspect the current repository implementation and follow the established pattern unless
the task explicitly asks to change it. Call out a material conflict instead of silently inventing a
new convention.

## Repository Structure

Important locations:

```text
src/
├── api/             Axios instances and feature API functions
├── assets/          Imported static assets
├── components/
│   ├── layouts/
│   ├── reusable/
│   └── ui/
├── enum/            Endpoint/shared enums
├── hooks/           Shared custom hooks
├── interface/       Shared TypeScript types
├── lib/             Utilities
├── paraglide/       Generated i18n runtime — do not edit
├── queries/         React Query client and feature query hooks
├── routes/          TanStack Router file-based routes
├── schemas/         Zod schemas
├── stores/          Redux Toolkit store and slices
├── tests/           Playwright E2E tests
├── main.tsx
├── router.tsx
├── routeTree.gen.ts Generated route tree — do not edit
└── styles.css       Global CSS and Tailwind theme tokens
```

## Generated Files

Never manually edit:

- `src/routeTree.gen.ts`
- files under `src/paraglide/`

`src/routeTree.gen.ts` is generated by the TanStack Router Vite plugin.

`src/paraglide/` is generated by Paraglide from the i18n project/messages configuration.

If generated output is stale, fix or rerun the generator/dev workflow rather than patching the
generated output directly.

## Routing

Routes are file-based through TanStack Router.

Add or modify route source files under `src/routes/`.

Do not introduce a second routing system.

## State Ownership

Use the established state boundaries:

- server/API state -> TanStack React Query
- global non-server UI/client state -> Redux Toolkit
- URL-shareable filters/search/pagination -> TanStack Router search params
- form state -> react-hook-form + Zod
- local isolated UI state -> `useState` / `useReducer`

Do not copy server data into Redux or Context.

For implementation details, use `pleco-data-layer`.

## Data Layer

Preserve the established data flow:

```text
Component
  -> dedicated query/mutation hook
  -> API function
  -> configured Axios client
  -> backend API
```

The Axios response interceptor returns the backend response envelope rather than the raw Axios
response object.

Pleco frontend domain data includes resources such as tenants, users, roles, maps, mapping sessions,
robots, fleets, cleaning tasks, incidents, and historical telemetry. Keep server-owned state for these
resources in React Query unless a documented realtime/UI requirement calls for separate ephemeral
client state.

Do not hardcode endpoint paths when an endpoint enum should be used.

Use `pleco-data-layer` for the detailed API/query/type conventions.

## Imports

The `@/` alias maps to `src/`.

Use `@/` for cross-directory imports.

Avoid deep relative imports such as:

```typescript
import { Button } from '../../../components/ui/button'
```

Local relative imports are acceptable for files intentionally colocated inside the same
route/module, following `pleco-frontend` guidance.

Use `import type` for type-only imports where required by the TypeScript configuration.

## TypeScript

TypeScript strict checks are enabled, including:

- `strict`
- `noUnusedLocals`
- `noUnusedParameters`
- `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax`

Do not weaken TypeScript configuration to work around a local type error.

Avoid `any` when an actual type can be expressed.

## Code Style

Biome is the repository formatter and linter.

Repository formatting conventions include:

- single quotes
- no semicolons
- 2-space indentation
- 100-character line width
- organized imports

Do not add ESLint or Prettier configuration to replace or duplicate Biome.

Run:

```bash
pnpm lint
```

Use:

```bash
pnpm lint:fix
```

when an explicit auto-fix is appropriate.

## Styling and UI

`src/styles.css` is the source of truth for global Tailwind/theme configuration and theme tokens.

When changing theme values:

- update `src/styles.css`
- use existing CSS variables/theme tokens instead of hardcoded colors
- consider both light and dark modes

Shadcn is configured as a client-side, non-RSC setup. UI components live under
`src/components/ui/`.

Follow existing Shadcn/cva/Radix patterns rather than introducing a parallel component-system
convention.

Use lucide-react for icons unless the existing feature uses another established project asset.

Pleco includes interactive coordinate-based map, trajectory, robot-position, and Teach Mode UIs.
Preserve the established map-rendering abstraction and world-coordinate conventions when working on
these features. Do not mix physical/world coordinates with canvas/screen pixels outside the dedicated
coordinate-conversion layer.

## Internationalization

Pleco supports:

- English (`en`) as the source language
- Vietnamese (`vi`)

Translation source files live under `messages/`.

Use the generated Paraglide message API from application code.

Do not manually edit generated files under `src/paraglide/`.

## Environment Variables

Client-side environment variables use Vite's `import.meta.env.VITE_*` mechanism.

Do not place secrets in frontend environment variables or assume build-time variables are hidden
from users of the built application.

The source documentation contains inconsistent historical naming for the API base variable
(`VITE_API_BASE_URL` vs `VITE_API_ENDPOINT`). When changing environment configuration, inspect the
current repository implementation and `.env.example` and preserve the actual active convention
instead of guessing.

## Common Commands

Install:

```bash
pnpm install
```

Development:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Preview:

```bash
pnpm preview
```

Unit/component tests:

```bash
pnpm test
```

E2E tests:

```bash
pnpm test:e2e
```

Lint:

```bash
pnpm lint
```

Auto-fix/format:

```bash
pnpm lint:fix
pnpm format
```

Use pnpm for repository package commands. Do not substitute npm or yarn in documentation or
commands unless the task explicitly requires it.

## Verification Expectations

After modifying code, run the smallest relevant checks available for the change.

Typical mapping:

- React/TypeScript change -> relevant tests + `pnpm lint`
- data-layer change -> relevant unit/component tests + `pnpm lint`
- routing/build-sensitive change -> `pnpm build`
- E2E change -> relevant Playwright test or `pnpm test:e2e`
- broad/refactor change -> relevant tests, lint, and build

Do not claim a command passed unless it was actually run successfully.

Do not hide a failing check by weakening assertions, removing coverage, adding arbitrary waits, or
changing lint/type configuration unless the task explicitly requires that behavior.

## Testing

Use Vitest + Testing Library for unit/component-level tests.

Use Playwright for end-to-end behavior.

For Playwright implementation, follow `pleco-e2e`, especially:

- independent tests
- semantic locators
- web-first assertions
- no arbitrary hard waits
- fixtures/page objects only when justified

## Security

For security-sensitive work, use `pleco-security` in addition to the primary implementation
skill.

At minimum:

- never hardcode or log secrets/tokens
- treat user-controlled content as untrusted
- do not use unsafe HTML rendering without a justified sanitization strategy
- validate user-controlled URL schemes where relevant
- do not present client-side validation as a substitute for backend enforcement
- minimize sensitive/personal data in browser storage, URLs, logs, and errors

Do not introduce backend frameworks or server-side security implementations that do not exist in
this frontend repository.

## Deployment

The application is built as static Vite assets and served with nginx.

The Docker build is multi-stage and produces the Vite `dist/` output for the nginx production
image.

The nginx configuration owns SPA fallback and static-serving behavior.

When changing deployment behavior, inspect `Dockerfile` and `nginx.conf` rather than implementing
server behavior inside React.

## Git Conventions

Branches documented by the project use:

- `main`
- `feature/*`
- `fix/*`
- `refactor/*`

Commit messages follow Conventional Commits, for example:

```text
feat: add realtime robot map view
fix: resolve Teach Mode coordinate conversion issue
docs: update Pleco project overview
refactor: extract robot telemetry panel
test: add E2E tests for cleaning task flow
chore: update dependencies
```

Apply these conventions when the task involves creating branches or commits.

## Change Discipline

Before making a non-trivial change:

1. Inspect the existing implementation around the target code.
2. Identify and use the relevant Pleco skill(s).
3. Preserve established architecture unless the task explicitly requests an architectural change.
4. Avoid editing unrelated files.
5. Do not modify generated files.
6. Complete the requested implementation rather than leaving TODO placeholders.
7. Run the most relevant available checks.
8. Review the final diff for accidental changes, architecture violations, and missing tests.

If existing code and written guidance materially disagree, report the discrepancy and prefer the
current repository implementation unless the task explicitly asks to migrate the convention.