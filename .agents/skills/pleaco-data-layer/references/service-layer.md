<!-- Converted from service-layer.instructions.md for the pleaco-data-layer Codex skill. -->

> **Original scope:** `src/api/**/*.ts,src/queries/**/*.ts`  
> **Purpose:** Detailed implementation rules for Pleco API functions and TanStack React Query hooks, including query keys, cancellation, mutations, invalidation, pagination, and advanced query patterns.  
> **Usage:** This is reference documentation. Skill activation, precedence, and reference-selection rules live in `../SKILL.md`.

# Service Layer Implementation Patterns

This guide defines the patterns for implementing the service layer in Pleco. The service layer has two parts:

1. **API functions** (`src/api/{feature}.ts`) — axios calls to the backend
2. **Query hooks** (`src/queries/use-{feature}-query.ts`) — React Query wrappers

## HTTP Client Setup

Two axios instances are configured in `src/api/index.ts`:

- **`axiosConfig`** (default export) — for authenticated requests; attaches auth tokens via request interceptor
- **`axiosConfigWithoutAuth`** (named export) — for public endpoints (login, registration, email checks)

Both instances have response interceptors that return `response.data` directly, so API functions receive the unwrapped `IResponseData<T>` object.

### Response Types

All API responses follow a standard shape defined in `src/interface/api-response.ts`:

```typescript
// Standard response
type IResponseData<T> = {
  data: T
  message: string
  statusCode: number
}

// Paginated response
type IResponseDataWithPage<T> = Omit<IResponseData<T>, 'data'> & {
  data: {
    items: T[]
    total: number
  }
}
```

### Endpoint Enums

API paths are defined as enums in `src/enum/endpoints.ts`, not hardcoded strings:

```typescript
// src/enum/endpoints.ts
export enum USERS_ENDPOINTS {
  CHECK_EMAIL_EXISTS = '/users/check-existence',
}

export enum EVENTS_ENDPOINTS {
  LIST = '/events',
  DETAIL = '/events',
  CREATE = '/events',
  DELETE = '/events',
}
```

## 1. API Functions

API functions live in `src/api/{feature}.ts` as standalone exported async functions.

### Reference: `src/api/users.ts`

```typescript
import { USERS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type { IRegisterRequest } from '@/interface/auth'
import { axiosConfigWithoutAuth } from '.'

export const checkEmailExists = async (
  data: Partial<IRegisterRequest>,
  signal?: AbortSignal,
): Promise<IResponseData<boolean>> => {
  return await axiosConfigWithoutAuth.get(USERS_ENDPOINTS.CHECK_EMAIL_EXISTS, {
    params: data,
    signal,
  })
}
```

### API Function Rules

**1. Export as standalone async functions** (not as an object):

```typescript
// ✅ Good — standalone exports
export const getEvents = async (signal?: AbortSignal): Promise<IResponseData<Event[]>> => {
  return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { signal })
}

export const createEvent = async (data: EventInput): Promise<IResponseData<Event>> => {
  return await axiosConfig.post(EVENTS_ENDPOINTS.CREATE, data)
}

// ❌ Bad — object pattern
export const eventsService = {
  getAll: () => axiosConfig.get('/events'),
}
```

**2. Use the correct axios instance:**

```typescript
// Authenticated endpoints → default import
import axiosConfig from '.'

// Public endpoints → named import
import { axiosConfigWithoutAuth } from '.'
```

**3. Use endpoint enums** from `src/enum/endpoints.ts`:

```typescript
// ✅ Good
return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { signal })

// ❌ Bad — hardcoded path
return await axiosConfig.get('/events', { signal })
```

**4. Accept `signal?: AbortSignal`** on GET requests for cancellation support:

```typescript
export const getEvents = async (signal?: AbortSignal): Promise<IResponseData<Event[]>> => {
  return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { signal })
}
```

**5. Type the return value** with `IResponseData<T>` or `IResponseDataWithPage<T>`:

```typescript
// Single item
export const getEventById = async (id: string, signal?: AbortSignal): Promise<IResponseData<Event>> => {
  return await axiosConfig.get(`${EVENTS_ENDPOINTS.DETAIL}/${id}`, { signal })
}

// Paginated list
export const getEventsPaginated = async (
  params: { page: number; limit: number },
  signal?: AbortSignal,
): Promise<IResponseDataWithPage<Event>> => {
  return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { params, signal })
}
```

**6. Pass query params via `params`**, body data as the second arg:

```typescript
// GET with query params
return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { params: { status: 'active' }, signal })

// POST with body
return await axiosConfig.post(EVENTS_ENDPOINTS.CREATE, data)

// PATCH with body
return await axiosConfig.patch(`${EVENTS_ENDPOINTS.DETAIL}/${id}`, data)

// DELETE
return await axiosConfig.delete(`${EVENTS_ENDPOINTS.DELETE}/${id}`)
```

## 2. Query Hooks

Query hooks live in `src/queries/use-{feature}-query.ts`. Each hook wraps a single API function with `useQuery` or `useMutation`.

### Reference: `src/queries/use-users-query.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { checkEmailExists } from '@/api/users'
import { USERS_ENDPOINTS } from '@/enum/endpoints'
import type { IEmailFormType } from '@/interface/auth'
import type { ReactQueryHookParams } from '@/interface/utils'

export const useCheckEmailExistenceQuery = ({
  queryKey = [],
  enabled = true,
  ...params
}: ReactQueryHookParams<IEmailFormType> & { enabled?: boolean }) => {
  return useQuery({
    queryKey: [USERS_ENDPOINTS.CHECK_EMAIL_EXISTS, params.params.email, ...queryKey],
    queryFn: async ({ signal }) => await checkEmailExists(params.params, signal),
    enabled: enabled,
  })
}
```

### Query Hook Rules

**1. File naming** — `use-{feature}-query.ts` in `src/queries/`:

```
src/queries/use-users-query.ts
src/queries/use-events-query.ts
src/queries/use-auth-query.ts
```

**2. Hook naming** — `use{Action}{Feature}Query` or `use{Action}{Feature}Mutation`:

```typescript
// Queries
export const useEventsQuery = (...)  => { ... }
export const useEventByIdQuery = (...) => { ... }
export const useCheckEmailExistenceQuery = (...) => { ... }

// Mutations
export const useCreateEventMutation = () => { ... }
export const useDeleteEventMutation = () => { ... }
```

**3. Accept `ReactQueryHookParams<T>`** for hooks that need params:

```typescript
import type { ReactQueryHookParams } from '@/interface/utils'

// ReactQueryHookParams<T> = { queryKey?: unknown[]; params: T }

export const useEventByIdQuery = ({
  queryKey = [],
  enabled = true,
  ...params
}: ReactQueryHookParams<{ id: string }> & { enabled?: boolean }) => {
  return useQuery({
    queryKey: [EVENTS_ENDPOINTS.DETAIL, params.params.id, ...queryKey],
    queryFn: async ({ signal }) => await getEventById(params.params.id, signal),
    enabled,
  })
}
```

For hooks without params, use a simpler signature:

```typescript
export const useEventsQuery = ({
  queryKey = [],
  enabled = true,
}: { queryKey?: unknown[]; enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: [EVENTS_ENDPOINTS.LIST, ...queryKey],
    queryFn: async ({ signal }) => await getEvents(signal),
    enabled,
  })
}
```

**4. Use endpoint enums as the base query key:**

```typescript
// ✅ Good — endpoint enum as base key
queryKey: [USERS_ENDPOINTS.CHECK_EMAIL_EXISTS, params.params.email, ...queryKey]

// ❌ Bad — magic string
queryKey: ['checkEmail', params.params.email]
```

**5. Pass `signal` from `queryFn`** to the API function for automatic cancellation:

```typescript
queryFn: async ({ signal }) => await getEvents(signal),
```

**6. Mutation hooks** use `useMutation` and handle cache invalidation:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEvent } from '@/api/events'
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'

export const useCreateEventMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_ENDPOINTS.LIST] })
    },
  })
}
```

## Complete Example

### Endpoint Enum

```typescript
// src/enum/endpoints.ts
export enum EVENTS_ENDPOINTS {
  LIST = '/events',
  DETAIL = '/events',
  CREATE = '/events',
  DELETE = '/events',
}
```

### Interface

```typescript
// src/interface/events.ts
export interface IEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  createdAt: string
  updatedAt: string
}

export interface ICreateEventRequest {
  title: string
  description?: string
  start: string
  end: string
}
```

### API Functions

```typescript
// src/api/events.ts
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData, IResponseDataWithPage } from '@/interface/api-response'
import type { ICreateEventRequest, IEvent } from '@/interface/events'
import axiosConfig from '.'

export const getEvents = async (
  signal?: AbortSignal,
): Promise<IResponseData<IEvent[]>> => {
  return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { signal })
}

export const getEventById = async (
  id: string,
  signal?: AbortSignal,
): Promise<IResponseData<IEvent>> => {
  return await axiosConfig.get(`${EVENTS_ENDPOINTS.DETAIL}/${id}`, { signal })
}

export const createEvent = async (
  data: ICreateEventRequest,
): Promise<IResponseData<IEvent>> => {
  return await axiosConfig.post(EVENTS_ENDPOINTS.CREATE, data)
}

export const deleteEvent = async (id: string): Promise<IResponseData<void>> => {
  return await axiosConfig.delete(`${EVENTS_ENDPOINTS.DELETE}/${id}`)
}
```

### Query Hooks

```typescript
// src/queries/use-events-query.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createEvent, deleteEvent, getEventById, getEvents } from '@/api/events'
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'
import type { ICreateEventRequest } from '@/interface/events'
import type { ReactQueryHookParams } from '@/interface/utils'

export const useEventsQuery = ({
  queryKey = [],
  enabled = true,
}: { queryKey?: unknown[]; enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: [EVENTS_ENDPOINTS.LIST, ...queryKey],
    queryFn: async ({ signal }) => await getEvents(signal),
    enabled,
  })
}

export const useEventByIdQuery = ({
  queryKey = [],
  enabled = true,
  ...params
}: ReactQueryHookParams<{ id: string }> & { enabled?: boolean }) => {
  return useQuery({
    queryKey: [EVENTS_ENDPOINTS.DETAIL, params.params.id, ...queryKey],
    queryFn: async ({ signal }) => await getEventById(params.params.id, signal),
    enabled,
  })
}

export const useCreateEventMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ICreateEventRequest) => createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_ENDPOINTS.LIST] })
    },
  })
}

export const useDeleteEventMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_ENDPOINTS.LIST] })
    },
  })
}
```

### Usage in Component

```typescript
import { useEventsQuery, useDeleteEventMutation } from '@/queries/use-events-query'

const EventList: React.FC = () => {
  const { data, isLoading, error } = useEventsQuery()
  const deleteMutation = useDeleteEventMutation()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Failed to load events</div>

  return (
    <div className="grid gap-4">
      {data?.data?.map((event) => (
        <div key={event.id} className="flex items-center justify-between">
          <span>{event.title}</span>
          <button
            onClick={() => deleteMutation.mutate(event.id)}
            disabled={deleteMutation.isPending}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

## Advanced Patterns

### Optimistic Updates

```typescript
export const useUpdateEventMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ICreateEventRequest> }) =>
      updateEvent(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: [EVENTS_ENDPOINTS.DETAIL, id] })

      const previous = queryClient.getQueryData([EVENTS_ENDPOINTS.DETAIL, id])

      queryClient.setQueryData([EVENTS_ENDPOINTS.DETAIL, id], (old: IResponseData<IEvent>) => ({
        ...old,
        data: { ...old.data, ...data },
      }))

      return { previous }
    },
    onError: (_err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData([EVENTS_ENDPOINTS.DETAIL, id], context.previous)
      }
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_ENDPOINTS.DETAIL, id] })
      queryClient.invalidateQueries({ queryKey: [EVENTS_ENDPOINTS.LIST] })
    },
  })
}
```

### Dependent Queries

```typescript
export const useEventWithAttendeesQuery = ({
  ...params
}: ReactQueryHookParams<{ id: string }>) => {
  const eventQuery = useEventByIdQuery({ params: params.params })

  const attendeesQuery = useQuery({
    queryKey: [ATTENDEES_ENDPOINTS.BY_EVENT, params.params.id],
    queryFn: async ({ signal }) => await getAttendeesByEvent(params.params.id, signal),
    enabled: !!eventQuery.data,
  })

  return { event: eventQuery, attendees: attendeesQuery }
}
```

### Paginated Queries

```typescript
export const useEventsPaginatedQuery = ({
  queryKey = [],
  ...params
}: ReactQueryHookParams<{ page: number; limit: number }>) => {
  return useQuery({
    queryKey: [EVENTS_ENDPOINTS.LIST, params.params.page, params.params.limit, ...queryKey],
    queryFn: async ({ signal }) => await getEventsPaginated(params.params, signal),
    placeholderData: keepPreviousData,
  })
}
```

## Common Mistakes

### Hardcoded API Paths

```typescript
// ❌ Bad
return await axiosConfig.get('/events', { signal })

// ✅ Good
return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { signal })
```

### Missing Cache Invalidation

```typescript
// ❌ Bad — stale cache after mutation
return useMutation({ mutationFn: createEvent })

// ✅ Good
return useMutation({
  mutationFn: createEvent,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [EVENTS_ENDPOINTS.LIST] })
  },
})
```

### Not Passing Signal

```typescript
// ❌ Bad — no cancellation support
queryFn: async () => await getEvents()

// ✅ Good
queryFn: async ({ signal }) => await getEvents(signal)
```

### Inline Query Config in Components

```typescript
// ❌ Bad — query logic in component
const { data } = useQuery({
  queryKey: ['events'],
  queryFn: () => axiosConfig.get('/events'),
})

// ✅ Good — use dedicated query hook
const { data } = useEventsQuery()
```

### Wrong Axios Instance

```typescript
// ❌ Bad — using authenticated client for public endpoint
import axiosConfig from '.'
return await axiosConfig.get(AUTH_ENDPOINTS.LOGIN, data)

// ✅ Good — using public client
import { axiosConfigWithoutAuth } from '.'
return await axiosConfigWithoutAuth.post(AUTH_ENDPOINTS.LOGIN, data)
```

## Checklist for New Features

When adding API integration for a new feature:

- [ ] Define endpoint enum in `src/enum/endpoints.ts`
- [ ] Define request/response interfaces in `src/interface/{feature}.ts`
- [ ] Create API functions in `src/api/{feature}.ts`
  - [ ] Use correct axios instance (auth vs public)
  - [ ] Use endpoint enums (no hardcoded paths)
  - [ ] Type return values with `IResponseData<T>` / `IResponseDataWithPage<T>`
  - [ ] Accept `signal?: AbortSignal` on GET requests
- [ ] Create query hooks in `src/queries/use-{feature}-query.ts`
  - [ ] Use `ReactQueryHookParams<T>` for parameterized hooks
  - [ ] Use endpoint enum as base query key
  - [ ] Pass `signal` from `queryFn` to API function
  - [ ] Handle cache invalidation in mutation `onSuccess`
