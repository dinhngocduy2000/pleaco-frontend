---
name: pleaco-data-layer
description: >
  Pleco frontend data-layer and state-management conventions. Use when creating,
  modifying, reviewing, or debugging Axios API functions, TanStack React Query hooks,
  query keys, cache invalidation, API response envelopes, endpoint enums, TypeScript API
  types, Zod schemas, form-data types, server state, Redux state, URL/search-param state,
  or related files under src/api, src/queries, src/interface, src/enum, src/schemas, and
  src/stores. Also use when implementing a feature whose work spans API, query, type/schema,
  and state layers.
---

# Pleco Data Layer

Apply Pleco's established data flow and state-ownership conventions.

## Architecture

The expected server-data flow is:

`Component -> Query Hook -> API Function -> Axios Client -> Backend API`

Keep those responsibilities separated:

- Components consume dedicated query/mutation hooks.
- Query hooks own TanStack Query configuration, query keys, cancellation wiring, and cache updates.
- API functions own HTTP calls and use the configured Axios clients.
- Endpoint paths come from endpoint enums.
- API and form types live in the project's type/interface layer.
- Zod schemas live in the schema layer.
- Server state stays in TanStack Query rather than Redux or Context.

## Reference selection

Load only the references needed for the task.

### `references/service-layer.md`

Read this first for work involving:

- `src/api/**/*.ts`
- `src/queries/**/*.ts`
- Axios client selection
- GET cancellation via `AbortSignal`
- query-key construction
- `ReactQueryHookParams<T>`
- mutation hooks and invalidation
- optimistic updates
- dependent or paginated queries

This is the authoritative reference for API-function and React Query hook implementation.

### `references/type-definitions.md`

Read this first for work involving:

- `src/interface/`
- `src/enum/`
- `src/schemas/`
- request/response/entity types
- `IResponseData<T>` and `IResponseDataWithPage<T>`
- Zod-inferred form types
- endpoint enums
- type composition
- type-only imports
- shared vs route-scoped types

This is the authoritative reference for type, schema, and enum organization and naming.

### `references/state-management.md`

Read this first when deciding where state belongs or when working with:

- TanStack Query server state
- Redux Toolkit global UI/client state
- TanStack Router search-param state
- react-hook-form form state
- local `useState` / `useReducer`
- cache invalidation and prefetch behavior from a state-management perspective

This is the authoritative reference for state ownership.

### `references/data-layer.md`

Read this for:

- a broad end-to-end data-flow task
- Axios client and response-envelope context
- environment-variable conventions
- error-handling overview
- data-layer tests
- the complete checklist for a data-connected feature

Use it as the integration overview. For detailed implementation, defer to the more specific
reference above.

## Reference combinations

Use the smallest useful combination:

- New API endpoint only:
  `service-layer.md` + `type-definitions.md`
- New query/mutation hook:
  `service-layer.md` + relevant types from `type-definitions.md`
- New form-backed API feature:
  `service-layer.md` + `type-definitions.md` + relevant form-state sections of `state-management.md`
- Deciding Redux vs Query vs URL vs local state:
  `state-management.md`
- Full new data-connected feature:
  all four references, starting with `data-layer.md`
- Type/schema refactor only:
  `type-definitions.md`

## Precedence

When converted references overlap, use this order by subject:

1. API functions and React Query hooks -> `service-layer.md`
2. Types, interfaces, schemas, enums, and type imports -> `type-definitions.md`
3. State ownership and state-tool selection -> `state-management.md`
4. Overall data-flow integration, environment, error handling, and feature checklist -> `data-layer.md`

Do not merge conflicting examples into a new project convention. If two references disagree on a
project-specific fact and the precedence above does not resolve it, inspect the existing repository
implementation and follow the established code. Surface the conflict when it materially affects the
requested change.

## Core rules

### API functions

- Put feature API functions in `src/api/{feature}.ts`.
- Export standalone async functions rather than service objects.
- Use `axiosConfig` for authenticated endpoints.
- Use `axiosConfigWithoutAuth` for public endpoints.
- Use endpoint enums instead of hardcoded API paths.
- Type return values with the established response envelope.
- Accept `signal?: AbortSignal` on GET functions and pass it to Axios.
- Pass GET query parameters through Axios `params`.
- Let configured interceptors handle shared HTTP behavior unless the task explicitly requires
  changing that behavior.

### Query hooks

- Put hooks in `src/queries/use-{feature}-query.ts`.
- Wrap API functions with dedicated `useQuery` / `useMutation` hooks.
- Use endpoint enums as the base query key.
- Include identifiers and relevant request parameters in the query key.
- Pass TanStack Query's `signal` to GET API functions.
- Use `ReactQueryHookParams<T>` for parameterized hooks where established.
- Invalidate or update affected cached queries after mutations.
- Do not put inline HTTP/query configuration directly in components when a dedicated hook should
  exist.

### Response data

- Axios response interceptors return the API response envelope directly.
- `IResponseData<T>` contains `data`, `message`, and `statusCode`.
- Components consuming a standard query read the payload from the envelope's `.data`.
- Paginated responses use the established `IResponseDataWithPage<T>` structure.

### Types and schemas

- Put shared feature types in `src/interface/{feature}.ts`.
- Follow the project's `I`-prefixed naming convention for types in `src/interface/`.
- Use `type` rather than `interface` where required by the project convention.
- Use `import type` for type-only imports.
- Infer form types from Zod schemas instead of duplicating the shape manually.
- Put Zod schemas in `src/schemas/{feature}-schemas.ts`.
- Put endpoint enums in `src/enum/endpoints.ts`.
- Use the `@/` alias for cross-directory imports.
- Colocate types that are genuinely route-only rather than promoting them to shared types.
- Avoid duplicate type definitions and avoid `any`.

### State ownership

Use the established ownership model:

- API/server state -> TanStack React Query
- global non-server UI/client state -> Redux Toolkit
- shareable filter/pagination/search state -> TanStack Router search params
- form input/validation state -> react-hook-form + Zod
- isolated component state -> `useState` / `useReducer`

Do not copy server data into Redux or Context.

## Boundaries with other skills

Use `pleaco-frontend` for route/component structure, general React/TypeScript implementation,
styling, UI composition, i18n, and frontend architecture outside the data/state concerns above.

Use `pleaco-e2e` for Playwright E2E-only work when that skill exists.

Use `pleaco-security` for security-specific reviews or security-sensitive implementation when
that skill exists.

Use `vercel-react-best-practices` additionally when the requested work is specifically about React
performance optimization.

## Workflow

1. Identify which data/state layers the task touches.
2. Inspect the existing feature and nearby established implementations before adding new patterns.
3. Load only the relevant references listed above.
4. Define or update types/schemas/endpoints before wiring API and query code when those definitions
   are part of the change.
5. Implement API functions and query/mutation hooks using the established boundaries.
6. Keep state in the correct owner; do not duplicate server state.
7. Update cache invalidation/query keys consistently with the API change.
8. Run the most relevant typecheck, lint, and tests when execution is available.
9. Review the final diff for hardcoded paths, wrong Axios client, missing signals, stale-cache risk,
   duplicate/manual types, misplaced state, and cross-layer imports.
