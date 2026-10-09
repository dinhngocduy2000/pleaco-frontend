<!-- Converted from state-management.instructions.md for the pleaco-data-layer Codex skill. -->

> **Original scope:** `src/**/*.{ts,tsx}`  
> **Purpose:** State ownership and implementation patterns across TanStack Query, Redux Toolkit, TanStack Router search params, react-hook-form + Zod, and local React state.  
> **Usage:** This is reference documentation. Skill activation, precedence, and reference-selection rules live in `../SKILL.md`.

# State Management Guidelines

Follow these patterns for managing state in the Pleco frontend.

## State Categories

| Category | Tool | Examples |
|---|---|---|
| Server state | TanStack React Query | API data, cached resources |
| Global UI state | Redux Toolkit | Theme, sidebar, auth status |
| URL state | TanStack Router search params | Filters, pagination, search query |
| Form state | react-hook-form + Zod | Form inputs, validation |
| Local UI state | useState / useReducer | Toggles, active tab, temporary values |

**Rule:** Never store server data in Redux or Context. Always use React Query.

## TanStack React Query (Server State)

### Query Client Setup

The query client is configured in `src/queries/index.ts`:

```typescript
// src/queries/index.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes
      gcTime: 10 * 60 * 1000,      // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

Provided at the app root in `src/main.tsx`:

```typescript
<ReduxProvider store={store}>
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
</ReduxProvider>
```

### Service Layer Pattern

**Step 1: Create API Service Functions**

API service functions live in `src/api/` as standalone async functions. Each function uses the axios instances exported from `src/api/index.ts` (`axiosConfig` for authenticated requests, `axiosConfigWithoutAuth` for public requests). Endpoint paths are defined as enums in `src/enum/endpoints.ts`.

```typescript
// src/api/events.ts
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type { Event, EventInput } from '@/interface/events'
import axiosConfig, { axiosConfigWithoutAuth } from '.'

export const getEvents = async (signal?: AbortSignal): Promise<IResponseData<Event[]>> => {
  return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { signal })
}

export const getEventById = async (
  id: string,
  signal?: AbortSignal,
): Promise<IResponseData<Event>> => {
  return await axiosConfig.get(`${EVENTS_ENDPOINTS.DETAIL}/${id}`, { signal })
}

export const createEvent = async (data: EventInput): Promise<IResponseData<Event>> => {
  return await axiosConfig.post(EVENTS_ENDPOINTS.CREATE, data)
}

export const deleteEvent = async (id: string): Promise<IResponseData<void>> => {
  return await axiosConfig.delete(`${EVENTS_ENDPOINTS.DELETE}/${id}`)
}
```

Note: The axios response interceptors in `src/api/index.ts` return `response.data` directly. Use `axiosConfig` (default export) for authenticated endpoints and `axiosConfigWithoutAuth` (named export) for public endpoints.

**Step 2: Create Query/Mutation Hooks**

Query hooks live in `src/queries/` as `use-{feature}-query.ts` files. They wrap `useQuery`/`useMutation` and accept a `ReactQueryHookParams<T>` object for the query key and params. Endpoint enums are used as the base query key for automatic cache alignment.

```typescript
// src/queries/use-events-query.ts
import { useQuery } from '@tanstack/react-query'
import { getEvents, getEventById } from '@/api/events'
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'
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
```

The `ReactQueryHookParams<T>` type (from `src/interface/utils.ts`) provides a consistent hook signature:

```typescript
type ReactQueryHookParams<T> = {
  queryKey?: unknown[]
  params: T
}
```

**Step 3: Use in Components**

```typescript
// routes/events/components/EventList.tsx
import { useEventsQuery } from '@/queries/use-events-query'
import { EventCard } from './EventCard'

export const EventList: React.FC = () => {
  const { data, isLoading, error } = useEventsQuery()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Failed to load events</div>

  return (
    <div className="grid gap-4">
      {data?.data?.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
```

### Query Key Convention

Use endpoint enums as the base query key. This keeps keys aligned with the API and makes invalidation straightforward:

```typescript
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'

// Query keys follow: [ENDPOINT, ...identifiers, ...extra]
queryKey: [EVENTS_ENDPOINTS.LIST]
queryKey: [EVENTS_ENDPOINTS.DETAIL, eventId]
queryKey: [EVENTS_ENDPOINTS.LIST, { status: 'active' }]
```

**Invalidation examples:**

```typescript
const queryClient = useQueryClient()

// Invalidate all event lists
queryClient.invalidateQueries({ queryKey: [EVENTS_ENDPOINTS.LIST] })

// Invalidate a specific event detail
queryClient.invalidateQueries({ queryKey: [EVENTS_ENDPOINTS.DETAIL, eventId] })
```

### Cache Invalidation Strategies

**Invalidate on mutation** (simple, always consistent):

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEvent } from '@/api/events'
import { EVENTS_ENDPOINTS } from '@/enum/endpoints'

const useCreateEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_ENDPOINTS.LIST] })
    },
  })
}
```

**Optimistic update** (instant UI, rollback on error):

```typescript
const useUpdateEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventInput> }) =>
      updateEvent(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: [EVENTS_ENDPOINTS.DETAIL, id] })

      const previous = queryClient.getQueryData([EVENTS_ENDPOINTS.DETAIL, id])

      queryClient.setQueryData([EVENTS_ENDPOINTS.DETAIL, id], (old: Event) => ({
        ...old,
        ...data,
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
    },
  })
}
```

**Prefetch on hover** (preload before navigation):

```typescript
const queryClient = useQueryClient()

const handleMouseEnter = (id: string) => {
  queryClient.prefetchQuery({
    queryKey: [EVENTS_ENDPOINTS.DETAIL, id],
    queryFn: ({ signal }) => getEventById(id, signal),
  })
}
```

### Error Handling

```typescript
const { data, error, isError } = useEventsQuery()

if (isError) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) return <NotFound />
    if (error.response?.status === 403) return <Unauthorized />
  }
  return <ErrorMessage message={error.message} />
}
```

## Redux Toolkit (Global UI State)

### When to Use Redux

Use Redux for **global UI state** that:
- Is needed across many unrelated components
- Persists across route navigations
- Doesn't come from an API

Examples: theme, sidebar state, user preferences, auth tokens.

### Store Setup

```typescript
// src/stores/index.ts
import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import appReducer from './slices/appSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
```

### Slice Pattern

```typescript
// src/stores/slices/appSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface AppState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
}

const initialState: AppState = {
  theme: 'light',
  sidebarOpen: false,
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
  },
})

export const { setTheme, toggleSidebar } = appSlice.actions
export default appSlice.reducer
```

### Usage with Typed Hooks

```typescript
import { useAppDispatch, useAppSelector } from '@/stores'
import { setTheme, toggleSidebar } from '@/stores/slices/appSlice'

const Sidebar: React.FC = () => {
  const sidebarOpen = useAppSelector((state) => state.app.sidebarOpen)
  const dispatch = useAppDispatch()

  return (
    <aside className={cn('transition-all', sidebarOpen ? 'w-64' : 'w-0')}>
      <button onClick={() => dispatch(toggleSidebar())}>Toggle</button>
    </aside>
  )
}
```

### Adding a New Slice

1. Create `src/stores/slices/{name}Slice.ts`
2. Add the reducer to `src/stores/index.ts`

```typescript
// src/stores/index.ts
import appReducer from './slices/appSlice'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
  },
})
```

### When NOT to Use Redux

- **Server data** → use React Query
- **Form state** → use react-hook-form
- **URL state** → use TanStack Router search params
- **Local component state** → use `useState`

## TanStack Router Search Params (URL State)

Use search params for state that should be shareable via URL (filters, pagination, search queries):

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const searchSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(20),
  q: z.string().optional(),
  category: z.string().optional(),
})

export const Route = createFileRoute('/events/')({
  validateSearch: searchSchema,
  component: EventsPage,
})

function EventsPage() {
  const { page, pageSize, q, category } = Route.useSearch()
  const navigate = Route.useNavigate()

  const handlePageChange = (newPage: number) => {
    navigate({ search: (prev) => ({ ...prev, page: newPage }) })
  }

  const handleSearch = (query: string) => {
    navigate({ search: (prev) => ({ ...prev, q: query, page: 1 }) })
  }

  // Pass search params to query hook
  const { data } = useEventsQuery({
    queryKey: [{ page, pageSize, q, category }],
  })

  return <div>{/* ... */}</div>
}
```

## react-hook-form + Zod (Form State)

### Basic Form

```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
})

type EventFormValues = z.infer<typeof eventSchema>

const EventForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      start: '',
      end: '',
    },
  })

  const { createEvent, isCreating } = useEvents()

  const handleFormSubmit = (data: EventFormValues) => {
    createEvent(data, {
      onSuccess: () => reset(),
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <div>
        <input {...register('title')} placeholder="Event title" />
        {errors.title && (
          <span className="text-sm text-destructive">{errors.title.message}</span>
        )}
      </div>

      <div>
        <textarea {...register('description')} placeholder="Description" />
      </div>

      <button type="submit" disabled={isSubmitting || isCreating}>
        {isCreating ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  )
}
```

### Form with Mutation Integration

```typescript
const EditEventForm: React.FC<{ event: Event }> = ({ event }) => {
  const { updateEvent, isUpdating } = useEvents()

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event.title,
      description: event.description ?? '',
      start: event.start,
      end: event.end,
    },
  })

  const handleFormSubmit = (data: EventFormValues) => {
    updateEvent({ id: event.id, data })
  }

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
      {/* fields */}
      <button type="submit" disabled={isUpdating}>
        {isUpdating ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
```

## Local Component State

### useState

Use for simple, isolated UI state:

```typescript
const [isOpen, setIsOpen] = useState(false)
const [searchTerm, setSearchTerm] = useState('')
const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview')
```

### useReducer

Use for complex state with multiple related values or state transitions:

```typescript
interface TableState {
  page: number
  pageSize: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

type TableAction =
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SORT'; payload: { sortBy: string; sortOrder: 'asc' | 'desc' } }
  | { type: 'RESET' }

const tableReducer = (state: TableState, action: TableAction): TableState => {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.payload }
    case 'SET_SORT':
      return { ...state, ...action.payload, page: 1 }
    case 'RESET':
      return initialState
  }
}

const [state, dispatch] = useReducer(tableReducer, initialState)
```

## Decision Flowchart

```
Is the data from an API?
├── Yes → TanStack React Query
└── No
    ├── Should it persist in the URL? → TanStack Router search params
    ├── Is it form input state? → react-hook-form
    ├── Is it needed across many unrelated components?
    │   └── Yes → Redux Toolkit (slice)
    └── No → useState / useReducer
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|---|---|
| Fetching in `useEffect` | Use `useQuery` |
| Server data in Redux | Use React Query |
| All state in one Redux slice | Split into focused slices |
| Prop drilling through 3+ levels | Redux or React Context |
| Storing derived data | Compute with `useMemo` |
| Mutating state directly | Return new objects in reducers |
| Inline query config in components | Use `src/queries/use-*-query.ts` hooks |
| Form state in Redux | Use react-hook-form |
