<!-- Converted from data-layer.instructions.md for the pleaco-data-layer Codex skill. -->

> **Original scope:** `src/api/**/*,src/interface/**/*,src/enum/**/*,src/queries/**/*,src/schemas/**/*`  
> **Purpose:** End-to-end Pleco data flow, Axios clients, response envelopes, endpoints, interfaces, schemas, environment configuration, error handling, testing, and feature checklist.  
> **Usage:** This is reference documentation. Skill activation, precedence, and reference-selection rules live in `../SKILL.md`.

# Data Layer Architecture

This guide defines how data flows through the Pleco frontend — from the backend API to React components.

## Data Flow

```
┌─────────────────┐
│   Components    │  ← Use query hooks, access data?.data
└────────┬────────┘
         │
┌────────▼────────┐
│  Query Hooks    │  ← src/queries/use-{feature}-query.ts
└────────┬────────┘
         │
┌────────▼────────┐
│  API Functions  │  ← src/api/{feature}.ts
└────────┬────────┘
         │
┌────────▼────────┐
│  Axios Client   │  ← src/api/index.ts (interceptors unwrap response)
└────────┬────────┘
         │
┌────────▼────────┐
│  Backend API    │  ← VITE_API_ENDPOINT
└─────────────────┘
```

## HTTP Client — Axios

### Configuration (`src/api/index.ts`)

Two axios instances are exported:

| Instance | Export | Use Case |
|---|---|---|
| `axiosConfig` | default export | Authenticated endpoints (attaches Bearer token) |
| `axiosConfigWithoutAuth` | named export | Public endpoints (login, register, email check) |

Both instances:
- Use `ENV_CONFIGS.VITE_API_ENDPOINT` as `baseURL`
- Set `Content-Type: application/json`
- Have response interceptors that return `response.data` (unwrapping the axios wrapper)

### Response Interceptors

The response interceptors handle HTTP errors by status code:

| Status | Behavior |
|---|---|
| 401 Unauthorized | Silently returns (triggers auth flow) |
| 403 Forbidden | Available for logout handling |
| 404 Not Found | Passes through |
| 500 Internal Server Error | Passes through |
| Other errors | Rejected as-is |

### Choosing the Right Instance

```typescript
// Authenticated endpoint — user must be logged in
import axiosConfig from '.'
export const getEvents = async (signal?: AbortSignal) => {
  return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { signal })
}

// Public endpoint — no auth required
import { axiosConfigWithoutAuth } from '.'
export const checkEmailExists = async (data: Partial<IRegisterRequest>, signal?: AbortSignal) => {
  return await axiosConfigWithoutAuth.get(USERS_ENDPOINTS.CHECK_EMAIL_EXISTS, {
    params: data,
    signal,
  })
}
```

## Response Types (`src/interface/api-response.ts`)

All backend responses follow a standard envelope:

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

### Accessing Data in Components

Because axios interceptors return `response.data` (the `IResponseData<T>` envelope), components access the actual payload via `.data`:

```typescript
const { data: response } = useEventsQuery()

// response is IResponseData<IEvent[]>
// response.data is IEvent[]
// response.message is string
// response.statusCode is number

return (
  <ul>
    {response?.data?.map((event) => (
      <li key={event.id}>{event.title}</li>
    ))}
  </ul>
)
```

For paginated responses:

```typescript
const { data: response } = useEventsPaginatedQuery({ params: { page: 1, limit: 20 } })

// response is IResponseDataWithPage<IEvent>
// response.data.items is IEvent[]
// response.data.total is number
```

## Endpoint Enums (`src/enum/endpoints.ts`)

API paths are centralized as enums. This avoids hardcoded strings, enables find-all-references, and serves as query key bases:

```typescript
export enum USERS_ENDPOINTS {
  CHECK_EMAIL_EXISTS = '/users/check-existence',
}

export enum AUTH_ENDPOINTS {
  LOGIN = '/auth/login',
  REGISTER = '/auth/register',
  REFRESH_TOKEN = '/auth/refresh-token',
  VERIFY_OTP = '/auth/verify-otp',
}

export enum EVENTS_ENDPOINTS {
  LIST = '/events',
  DETAIL = '/events',
  CREATE = '/events',
  DELETE = '/events',
}
```

### Adding a New Feature

When adding endpoints for a new feature:

1. Add the enum to `src/enum/endpoints.ts`
2. Use it in API functions (`src/api/{feature}.ts`)
3. Use it as query key base in query hooks (`src/queries/use-{feature}-query.ts`)

## Interfaces (`src/interface/`)

TypeScript interfaces for API request/response shapes live in `src/interface/`:

```
src/interface/
├── index.ts              # Re-exports (barrel file)
├── api-response.ts       # IResponseData<T>, IResponseDataWithPage<T>
├── auth.ts               # ILoginRequest, ILoginResponse, IUserProfile, etc.
├── utils.ts              # ReactQueryHookParams<T>
└── {feature}.ts          # Feature-specific interfaces
```

### Interface Naming

- Prefix with `I` for interfaces: `IEvent`, `IUserProfile`
- Request types: `I{Action}Request` (e.g., `ILoginRequest`, `ICreateEventRequest`)
- Response types: `I{Action}Response` (e.g., `ILoginResponse`)
- Form types: `I{Name}FormType` inferred from Zod schemas

```typescript
// src/interface/auth.ts
import type z from 'zod'
import type { emailSchemas } from '@/schemas/auth-schemas'

export type IEmailFormType = z.infer<typeof emailSchemas>

export type ILoginRequest = {
  username: string
} & Partial<IPasswordFormType> & Partial<IOTPFormType>

export type ILoginResponse = {
  accessToken: string
  refreshToken: string
  user: IUserProfile
}

export type IUserProfile = {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  email: string
  fullName: string
  active: boolean
  avatar: string
  activeOrganizationId: string
}
```

### Shared vs Feature-Specific

- **Shared interfaces** used across multiple features → `src/interface/`
- **Feature-scoped interfaces** used by one route only → colocate near the route

## Validation Schemas (`src/schemas/`)

Zod schemas for form validation live in `src/schemas/`:

```typescript
// src/schemas/auth-schemas.ts
import { z } from 'zod'

const toTrimmedString = (value: string) => {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

export const emailSchemas = z.object({
  email: z.preprocess(
    toTrimmedString,
    z.string().min(1, { message: 'Email is required' }).email({ message: 'Invalid email format' }),
  ),
})

export const passwordSchemas = z.object({
  password: z.preprocess(
    toTrimmedString,
    z.string().min(1, { message: 'Password is required' }),
  ),
})
```

Form types are inferred from schemas in the interface files:

```typescript
// src/interface/auth.ts
import type z from 'zod'
import type { emailSchemas } from '@/schemas/auth-schemas'

export type IEmailFormType = z.infer<typeof emailSchemas>
```

## Environment Variables

### Configuration (`src/lib/env-const.ts`)

Environment variables are centralized in a typed object:

```typescript
export const ENV_CONFIGS = {
  VITE_API_ENDPOINT: import.meta.env.VITE_API_ENDPOINT as string,
}
```

### `.env.example`

```bash
VITE_API_ENDPOINT=http://localhost:8080/api
```

All client-side environment variables must be prefixed with `VITE_` and accessed via `import.meta.env.VITE_*`.

## Error Handling

### In API Functions

Errors are handled by the axios response interceptors. API functions don't need try/catch — they let errors propagate to the query hooks.

### In Query Hooks

React Query automatically captures errors. Components access them via the `error` return value:

```typescript
const { data, isLoading, error } = useEventsQuery()

if (error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 404) return <NotFound />
    if (status === 403) return <Forbidden />
  }
  return <ErrorMessage message={error.message} />
}
```

### Global Error Handling

The axios 401 interceptor handles token expiration silently. For other global error patterns, extend the response interceptor in `src/api/index.ts`.

## Testing

### Unit Testing API Functions

```typescript
import { describe, expect, it, vi } from 'vitest'
import { getEvents } from '@/api/events'

vi.mock('@/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: [{ id: '1', title: 'Test Event' }],
      message: 'Success',
      statusCode: 200,
    }),
  },
}))

describe('getEvents', () => {
  it('returns events from API', async () => {
    const result = await getEvents()
    expect(result.data).toHaveLength(1)
    expect(result.data[0].title).toBe('Test Event')
  })
})
```

### Testing Components with Query Hooks

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventList } from './EventList'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('EventList', () => {
  it('renders loading state', () => {
    render(<EventList />, { wrapper: createWrapper() })
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

## Checklist for New Features

When adding a new data-connected feature:

- [ ] Add endpoint enum in `src/enum/endpoints.ts`
- [ ] Define interfaces in `src/interface/{feature}.ts`
- [ ] Define Zod schemas in `src/schemas/{feature}-schemas.ts` (if forms exist)
- [ ] Infer form types from Zod schemas in the interface file
- [ ] Create API functions in `src/api/{feature}.ts`
  - [ ] Use correct axios instance (auth vs public)
  - [ ] Use endpoint enums
  - [ ] Type returns with `IResponseData<T>` / `IResponseDataWithPage<T>`
  - [ ] Accept `signal?: AbortSignal` on GET requests
- [ ] Create query hooks in `src/queries/use-{feature}-query.ts`
  - [ ] Use endpoint enum as query key base
  - [ ] Pass `signal` to API functions
  - [ ] Handle cache invalidation on mutations
- [ ] Access `response.data` (not `response`) in components for the actual payload

## Common Mistakes

### Accessing Response Data Wrong

```typescript
// ❌ Bad — response is IResponseData<T>, not T directly
const { data } = useEventsQuery()
return data?.map(event => ...)

// ✅ Good — unwrap the envelope
const { data } = useEventsQuery()
return data?.data?.map(event => ...)
```

### Using Wrong Axios Instance

```typescript
// ❌ Bad — authenticated client for public endpoint
import axiosConfig from '.'
return await axiosConfig.post(AUTH_ENDPOINTS.REGISTER, data)

// ✅ Good — public client for unauthenticated endpoint
import { axiosConfigWithoutAuth } from '.'
return await axiosConfigWithoutAuth.post(AUTH_ENDPOINTS.REGISTER, data)
```

### Hardcoding API Paths

```typescript
// ❌ Bad
return await axiosConfig.get('/events')

// ✅ Good
return await axiosConfig.get(EVENTS_ENDPOINTS.LIST)
```

### Forgetting Signal for GET Requests

```typescript
// ❌ Bad — no cancellation support
export const getEvents = async (): Promise<IResponseData<IEvent[]>> => {
  return await axiosConfig.get(EVENTS_ENDPOINTS.LIST)
}

// ✅ Good
export const getEvents = async (signal?: AbortSignal): Promise<IResponseData<IEvent[]>> => {
  return await axiosConfig.get(EVENTS_ENDPOINTS.LIST, { signal })
}
```
