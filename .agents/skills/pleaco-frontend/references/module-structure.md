<!-- Converted from module-structure.instructions.md for the pleaco-frontend Codex skill. -->

> **Original scope:** `src/**/*`  
> **Purpose:** Pleco layered feature organization, file placement, imports, dependency boundaries, naming, and new-feature structure.  
> **Usage:** This is reference documentation. Skill activation and reference-selection rules live in `../SKILL.md`.

# Feature Organization Patterns

This guide defines how features are organized in Pleco. The project uses a **layered architecture** with shared top-level directories rather than self-contained feature modules.

## Project Layout

```
src/
├── api/                    # API service functions (one file per feature)
│   ├── index.ts            # Axios instances (axiosConfig, axiosConfigWithoutAuth)
│   ├── users.ts
│   └── {feature}.ts
├── components/
│   ├── layouts/            # Layout components (MainLayout, Header, Footer)
│   ├── reusable/           # Shared reusable components
│   └── ui/                 # Shadcn base UI components
├── enum/                   # Endpoint enums and shared enums
│   ├── endpoints.ts
│   └── {feature}.ts
├── hooks/                  # Shared custom hooks
├── interface/              # TypeScript interfaces (one file per feature)
│   ├── index.ts            # Barrel re-exports
│   ├── api-response.ts     # IResponseData<T>, IResponseDataWithPage<T>
│   ├── auth.ts
│   ├── utils.ts            # ReactQueryHookParams<T>
│   └── {feature}.ts
├── lib/                    # Utilities (cn(), env-const, translation)
├── queries/                # React Query hooks (one file per feature)
│   ├── index.ts            # QueryClient config
│   ├── use-users-query.ts
│   └── use-{feature}-query.ts
├── routes/                 # TanStack Router file-based routes
│   ├── __root.tsx
│   ├── index.tsx
│   └── {feature}/          # Feature route pages + colocated components
│       ├── index.tsx
│       ├── $id.tsx
│       └── components/     # Route-specific components
├── schemas/                # Zod validation schemas
│   ├── auth-schemas.ts
│   └── {feature}-schemas.ts
├── stores/                 # Redux Toolkit store
│   ├── index.ts
│   └── slices/
└── tests/                  # Test files
```

## Adding a New Feature

When adding a new feature (e.g., "events"), create files across the relevant layers:

### 1. Endpoint Enum

```typescript
// src/enum/endpoints.ts (add to existing file)
export enum EVENTS_ENDPOINTS {
  LIST = '/events',
  DETAIL = '/events',
  CREATE = '/events',
  DELETE = '/events',
}
```

### 2. Interfaces

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

Re-export from the barrel file:

```typescript
// src/interface/index.ts
export * from './api-response'
export * from './auth'
export * from './events'
export * from './utils'
```

### 3. API Functions

```typescript
// src/api/events.ts
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
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

### 4. Query Hooks

```typescript
// src/queries/use-events-query.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createEvent, deleteEvent, getEvents } from '@/api/events'
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'

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

export const useCreateEventMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEvent,
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

### 5. Zod Schemas (if the feature has forms)

```typescript
// src/schemas/events-schemas.ts
import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
})
```

Infer form types in the interface file:

```typescript
// src/interface/events.ts (add)
import type z from 'zod'
import type { createEventSchema } from '@/schemas/events-schemas'

export type ICreateEventFormType = z.infer<typeof createEventSchema>
```

### 6. Route Pages

```typescript
// src/routes/events/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { EventList } from './components/EventList'

export const Route = createFileRoute('/events/')({
  component: EventsPage,
})

function EventsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Events</h1>
      <EventList />
    </div>
  )
}
```

### 7. Route-Specific Components

```typescript
// src/routes/events/components/EventList.tsx
import { useEventsQuery } from '@/queries/use-events-query'

export const EventList: React.FC = () => {
  const { data, isLoading, error } = useEventsQuery()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Failed to load events</div>

  return (
    <div className="grid gap-4">
      {data?.data?.map((event) => (
        <div key={event.id}>{event.title}</div>
      ))}
    </div>
  )
}
```

## File Placement Rules

| File Type | Location | Naming |
|---|---|---|
| Endpoint enums | `src/enum/endpoints.ts` | `{FEATURE}_ENDPOINTS` enum |
| Interfaces | `src/interface/{feature}.ts` | `I{Name}`, `I{Action}Request` |
| API functions | `src/api/{feature}.ts` | `get{Feature}`, `create{Feature}` |
| Query hooks | `src/queries/use-{feature}-query.ts` | `use{Feature}Query`, `use{Action}{Feature}Mutation` |
| Zod schemas | `src/schemas/{feature}-schemas.ts` | `{action}{Feature}Schema` |
| Route pages | `src/routes/{feature}/index.tsx` | TanStack Router conventions |
| Route components | `src/routes/{feature}/components/` | `PascalCase.tsx` |
| Shared components | `src/components/reusable/` | `PascalCase.tsx` |
| UI components | `src/components/ui/` | Shadcn conventions |
| Shared hooks | `src/hooks/` | `use{Name}.ts` |
| Redux slices | `src/stores/slices/` | `{name}Slice.ts` |

## Shared vs Route-Specific Components

**Shared** (`src/components/reusable/` or `src/components/ui/`):
- Used by 2+ routes
- Generic UI elements (buttons, inputs, cards, modals)
- Layout components

**Route-specific** (`src/routes/{feature}/components/`):
- Used only within one route
- Feature-specific presentation (EventCard, EventForm)
- Colocated near the route that uses them

```typescript
// ✅ Shared — used across routes
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/reusable/DataTable'

// ✅ Route-specific — colocated
import { EventCard } from './components/EventCard'
```

## Import Conventions

**Use `@/` for cross-directory imports:**

```typescript
// ✅ Good — @/ alias for shared directories
import { getEvents } from '@/api/events'
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'
import type { IEvent } from '@/interface/events'
import { useEventsQuery } from '@/queries/use-events-query'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
```

**Use relative imports within a route's colocated components:**

```typescript
// ✅ Good — relative within the same route
// In src/routes/events/components/EventList.tsx
import { EventCard } from './EventCard'
```

**Never use relative imports across directories:**

```typescript
// ❌ Bad
import { Button } from '../../../components/ui/button'
```

## Dependency Rules

| Source | Can Import From |
|---|---|
| Route components | `@/api/`, `@/queries/`, `@/interface/`, `@/enum/`, `@/components/`, `@/lib/`, `@/hooks/`, `@/stores/`, colocated `./components/` |
| Query hooks | `@/api/`, `@/enum/`, `@/interface/` |
| API functions | `@/enum/`, `@/interface/`, `@/api` (index for axios instances) |
| Schemas | `zod` only |
| Interfaces | `@/schemas/` (for `z.infer`), other `@/interface/` files |

**Circular imports are forbidden.** If two files need each other, extract the shared code to a third file.

## Naming Conventions

### Files

- **Components**: `PascalCase.tsx` (`EventCard.tsx`)
- **Hooks**: `use-{feature}-query.ts` for query hooks, `use{Name}.ts` for custom hooks
- **API**: `{feature}.ts` (`events.ts`, `users.ts`)
- **Interfaces**: `{feature}.ts` (`events.ts`, `auth.ts`)
- **Schemas**: `{feature}-schemas.ts` (`auth-schemas.ts`, `events-schemas.ts`)
- **Enums**: `{feature}.ts` or `endpoints.ts`
- **Redux slices**: `{name}Slice.ts` (`appSlice.ts`)

### Exports

- **Named exports** for everything (components, hooks, API functions, types)
- **Default exports** only for Redux slice reducers (`export default slice.reducer`) and axios instances

### Type Naming

- `I` prefix for interfaces: `IEvent`, `IUserProfile`
- `I{Action}Request` for request types: `ICreateEventRequest`, `ILoginRequest`
- `I{Action}Response` for response types: `ILoginResponse`
- `I{Name}FormType` for Zod-inferred form types: `IEmailFormType`

## Common Mistakes

### Putting API Logic in Components

```typescript
// ❌ Bad — fetching directly in component
import axiosConfig from '@/api'

export const EventList: React.FC = () => {
  const [events, setEvents] = useState([])
  useEffect(() => {
    axiosConfig.get('/events').then(setEvents)
  }, [])
}

// ✅ Good — use query hook
import { useEventsQuery } from '@/queries/use-events-query'

export const EventList: React.FC = () => {
  const { data, isLoading } = useEventsQuery()
}
```

### Feature-Specific Types in Shared Interface

```typescript
// ❌ Bad — type only used by events route, but in shared location
// src/interface/events.ts
export interface IEventCalendarViewState { ... }  // Only used in events route

// ✅ Good — colocate near the route
// src/routes/events/events.types.ts
export interface IEventCalendarViewState { ... }
```

### Wrong File Location

```typescript
// ❌ Bad — query hook in api/ directory
// src/api/use-events-query.ts

// ✅ Good — query hooks in queries/
// src/queries/use-events-query.ts
```

## New Feature Checklist

- [ ] Endpoint enum added to `src/enum/endpoints.ts`
- [ ] Interfaces created in `src/interface/{feature}.ts`
- [ ] Interfaces re-exported from `src/interface/index.ts`
- [ ] API functions created in `src/api/{feature}.ts`
  - [ ] Correct axios instance (auth vs public)
  - [ ] Endpoint enums used (no hardcoded paths)
  - [ ] `signal?: AbortSignal` on GET requests
  - [ ] Typed with `IResponseData<T>` / `IResponseDataWithPage<T>`
- [ ] Query hooks created in `src/queries/use-{feature}-query.ts`
  - [ ] Endpoint enum as base query key
  - [ ] `signal` passed to API functions
  - [ ] Mutations invalidate related queries
- [ ] Zod schemas in `src/schemas/{feature}-schemas.ts` (if forms)
- [ ] Route pages in `src/routes/{feature}/`
- [ ] Route-specific components in `src/routes/{feature}/components/`
- [ ] All imports use `@/` alias (no deep relative paths)
