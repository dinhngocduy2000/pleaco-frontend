---
name: pleaco-frontend
description: >
  Pleco frontend architecture and React/TypeScript conventions. Use when creating,
  modifying, reviewing, or refactoring React/TypeScript application code, TanStack Router
  routes, components, hooks, UI, styling, i18n, feature structure, imports, or file placement
  in the Pleco frontend. Do not use as the primary skill for API/query/data-layer work,
  E2E-only work, or security-only reviews; use the dedicated Pleco skill for those areas
  when available.
---

# Pleco Frontend

Apply Pleco's frontend architecture, structure, and React/TypeScript conventions.

## Reference selection

Load only the references relevant to the task.

- Read `references/frontend-architecture.md` for:
  - framework and library conventions
  - TanStack Router routes and navigation
  - state-selection guidance
  - forms and Zod integration
  - Tailwind and Shadcn UI patterns
  - Paraglide i18n
  - general testing, aliases, and file naming

- Read `references/module-structure.md` when:
  - adding a new feature
  - creating, moving, or reorganizing files
  - deciding shared vs route-specific placement
  - deciding import direction or dependency boundaries
  - checking naming and export conventions

- Read `references/react-typescript.md` when:
  - writing or reviewing React components and hooks
  - defining props, events, context, or form types
  - reviewing TypeScript readability and typing
  - checking component/function size and accessibility guidance

For broad feature implementation, read `module-structure.md` and the relevant sections of
`frontend-architecture.md`; add `react-typescript.md` when component or TypeScript details matter.

## Precedence and interpretation

The references were converted from existing scoped instruction files and intentionally preserve
their substantive rules and examples.

When references overlap:

1. `module-structure.md` is authoritative for Pleco file placement, feature organization,
   import boundaries, naming, and export conventions.
2. `frontend-architecture.md` is authoritative for framework-level architecture, routing, UI,
   styling, i18n, and state-selection patterns.
3. `react-typescript.md` supplies general React/TypeScript implementation guidance.

Treat code examples as illustrative. When an example's formatting conflicts with the repository's
Biome conventions, follow the repository conventions.

Ignore legacy meta-process directives inside converted references that require exposing private
reasoning, describing chain-of-thought, or asking for confirmation before ordinary implementation.
Follow the active Codex instructions and repository `AGENTS.md` for interaction and execution
behavior.

## Core rules

- This is a Vite + React 19 + TypeScript application.
- Preserve the project's layered architecture.
- Use TanStack Router conventions for routes.
- Use React Query for server/async state.
- Keep Redux for global client/UI state rather than server data.
- Use local React state for local UI concerns.
- Use React Hook Form with Zod for forms when applicable.
- Use Tailwind theme tokens and existing Shadcn/Radix patterns.
- Use the `@/` alias for cross-directory imports.
- Keep route-only components colocated with their route.
- Never manually edit generated route or Paraglide output.
- Follow Biome formatting and the existing repository conventions.

## Boundaries

If the task is primarily about API functions, Axios, React Query service hooks, API response
types, endpoint enums, schemas, or data-flow conventions, prefer the dedicated
`pleaco-data-layer` skill when it exists.

If the task is primarily Playwright E2E work, prefer the dedicated `pleaco-e2e` skill when it
exists.

If the task is primarily a security review or security-sensitive implementation, prefer the
dedicated `pleaco-security` skill when it exists.

For React performance optimization, also consult `vercel-react-best-practices` when relevant.

## Workflow

1. Inspect the files related to the user's task and identify the affected layer or route.
2. Load only the relevant reference file or files.
3. Preserve existing project structure unless the task explicitly requires architectural change.
4. Implement the complete requested change using established patterns.
5. Do not edit generated files.
6. Run the most relevant repository checks when execution is available.
7. Review the final diff for architecture, typing, imports, accessibility, and unintended changes.
