<!-- Converted from type-definitions.instructions.md for the pleaco-data-layer Codex skill. -->

> **Original scope:** `src/**/*.{ts,tsx}`  
> **Purpose:** Pleco TypeScript type, interface, enum, Zod schema, composition, location, naming, and import conventions.  
> **Usage:** This is reference documentation. Skill activation, precedence, and reference-selection rules live in `../SKILL.md`.

# Type Definitions and Organization

This guide defines how to organize TypeScript types, interfaces, enums, and Zod schemas in Pleco.

## Type Location Strategy

| Kind | Location | Naming |
|---|---|---|
| API response wrappers | `src/interface/api-response.ts` | `IResponseData<T>`, `IResponseDataWithPage<T>` |
| Feature interfaces | `src/interface/{feature}.ts` | `I{Name}`, `I{Action}Request`, `I{Action}Response` |
| React Query helpers | `src/interface/utils.ts` | `ReactQueryHookParams<T>` |
| Zod schemas | `src/schemas/{feature}-schemas.ts` | `{name}Schemas`, `{name}Schema` |
| Form types (Zod-inferred) | `src/interface/{feature}.ts` | `I{Name}FormType` |
| Endpoint enums | `src/enum/endpoints.ts` | `{FEATURE}_ENDPOINTS` |
| Shared enums | `src/enum/{feature}.ts` | `UPPER_CASE` enum names |
| Route-scoped types | `src/routes/{feature}/{feature}.types.ts` | Any — scoped to route |

## Interfaces (`src/interface/`)

### File Structure

```
src/interface/
├── index.ts              # Barrel re-exports
├── api-response.ts       # IResponseData<T>, IResponseDataWithPage<T>
├── auth.ts               # Auth-related types
├── utils.ts              # ReactQueryHookParams<T>
└── {feature}.ts          # Feature-specific types
```

### API Response Types

```typescript
// src/interface/api-response.ts
export type IResponseData<T> = {
  data: T
  message: string
  statusCode: number
}

export type IResponseDataWithPage<T> = Omit<IResponseData<T>, 'data'> & {
  data: {
    items: T[]
    total: number
  }
}
```

### Feature Interface Pattern

Reference: `src/interface/auth.ts`

```typescript
import type z from 'zod'
import type { emailSchemas, otpSchemas, passwordSchemas } from '@/schemas/auth-schemas'

// Form types — inferred from Zod schemas
export type IEmailFormType = z.infer<typeof emailSchemas>
export type IPasswordFormType = z.infer<typeof passwordSchemas>
export type IOTPFormType = z.infer<typeof otpSchemas>

// Request types
export type ILoginRequest = {
  username: string
} & Partial<IPasswordFormType> &
  Partial<IOTPFormType>

// Response types
export type ILoginResponse = {
  accessToken: string
  refreshToken: string
  user: IUserProfile
}

export type IVerifyOTPRequest = IEmailFormType & IOTPFormType

export type IRegisterRequest = { fullName?: string } & IEmailFormType &
  IPasswordFormType &
  IOTPFormType

// Entity types
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

export type IRefreshTokenRequest = {
  refreshToken: string
}

export type IRefreshTokenResponse = {
  accessToken: string
  refreshToken: string
}
```

### Utility Types

```typescript
// src/interface/utils.ts
export type ReactQueryHookParams<T> = {
  queryKey?: unknown[]
  params: T
}
```

### Naming Conventions

| Category | Pattern | Example |
|---|---|---|
| Entity | `I{Name}` | `IUserProfile`, `IEvent` |
| Request | `I{Action}Request` | `ILoginRequest`, `ICreateEventRequest` |
| Response | `I{Action}Response` | `ILoginResponse`, `IRefreshTokenResponse` |
| Form (Zod-inferred) | `I{Name}FormType` | `IEmailFormType`, `IPasswordFormType` |
| List/filter params | `I{Feature}Filter` | `IEventFilter` |

### Rules

1. **Prefix with `I`** for all interfaces and type aliases in `src/interface/`
2. **Use `type`** (not `interface`) — the project convention is `export type`
3. **Use `import type`** for type-only imports (enforced by `verbatimModuleSyntax`)
4. **Compose types** with intersections and `Partial<>` / `Omit<>` instead of duplicating fields
5. **Infer form types** from Zod schemas — don't define them manually

```typescript
// ✅ Good — inferred from schema
import type z from 'zod'
import type { createEventSchema } from '@/schemas/events-schemas'
export type ICreateEventFormType = z.infer<typeof createEventSchema>

// ❌ Bad — manually duplicated
export type ICreateEventFormType = {
  title: string
  description?: string
  start: string
  end: string
}
```

## Zod Schemas (`src/schemas/`)

### File Structure

```
src/schemas/
├── index.ts                  # Barrel re-exports (if needed)
├── auth-schemas.ts           # Auth-related schemas
└── {feature}-schemas.ts      # Feature-specific schemas
```

### Schema Pattern

Reference: `src/schemas/auth-schemas.ts`

```typescript
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

export const otpSchemas = z.object({
  otp: z.preprocess(
    toTrimmedString,
    z.string().min(1, { message: 'OTP is required' }).min(6, { message: 'OTP is incorrect' }),
  ),
})
```

### Schema Rules

1. **File naming**: `{feature}-schemas.ts` (kebab-case with `-schemas` suffix)
2. **Schema naming**: `{name}Schemas` (plural) for field-group schemas, `{name}Schema` (singular) for full-object schemas
3. **Validation messages**: Always provide `{ message: '...' }` for user-facing errors
4. **Preprocess strings**: Use `z.preprocess(toTrimmedString, ...)` for text inputs to trim whitespace
5. **Compose schemas**: Combine smaller schemas for complex forms

```typescript
// Compose schemas for a registration form
export const registerSchema = emailSchemas
  .merge(passwordSchemas)
  .merge(otpSchemas)
  .extend({
    fullName: z.string().min(1, { message: 'Name is required' }),
  })
```

6. **Infer types in `src/interface/`**, not in the schema file:

```typescript
// ✅ Good — type inference in interface file
// src/interface/auth.ts
import type z from 'zod'
import type { emailSchemas } from '@/schemas/auth-schemas'
export type IEmailFormType = z.infer<typeof emailSchemas>

// ❌ Bad — type inference in schema file
// src/schemas/auth-schemas.ts
export type IEmailFormType = z.infer<typeof emailSchemas>  // Don't put types here
```

## Enums (`src/enum/`)

### File Structure

```
src/enum/
├── index.ts              # Barrel re-exports (if needed)
├── endpoints.ts          # API endpoint paths
└── language.ts           # Language codes
```

### Endpoint Enums

```typescript
// src/enum/endpoints.ts
export enum USERS_ENDPOINTS {
  CHECK_EMAIL_EXISTS = '/users/check-existence',
}

export enum AUTH_ENDPOINTS {
  LOGIN = '/auth/login',
  REGISTER = '/auth/register',
  REFRESH_TOKEN = '/auth/refresh-token',
}
```

### Shared Enums

```typescript
// src/enum/language.ts
export enum LANGUAGE {
  VI = 'vi',
  EN = 'en',
}
```

### Enum Rules

1. **UPPER_CASE** for enum names and values: `LANGUAGE`, `USERS_ENDPOINTS`
2. **Group by feature**: One enum per feature block in `endpoints.ts`, or separate files for non-endpoint enums
3. **Use enums** (not `as const` objects) — this is the project convention

## Type Composition Patterns

### Omit Auto-Generated Fields

```typescript
export type ICreateEventRequest = Omit<IEvent, 'id' | 'createdAt' | 'updatedAt'>
```

### Partial Updates

```typescript
export type IUpdateEventRequest = Partial<Omit<IEvent, 'id' | 'createdAt' | 'updatedAt'>>
```

### Intersection for Request Types

```typescript
export type IRegisterRequest = { fullName?: string } & IEmailFormType &
  IPasswordFormType &
  IOTPFormType
```

### Union Types for Status

```typescript
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'

export type IEvent = {
  id: string
  title: string
  status: EventStatus
}
```

### Discriminated Unions

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }
```

### Utility Types

```typescript
// Make specific fields required
type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>

// Make specific fields optional
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
```

## Shared vs Route-Scoped Types

**Shared** (`src/interface/`) — used by 2+ features or across API/query layers:

```typescript
// src/interface/events.ts
export type IEvent = { ... }              // Used in API, queries, and components
export type ICreateEventRequest = { ... } // Used in API and forms
```

**Route-scoped** (`src/routes/{feature}/`) — used within one route only:

```typescript
// src/routes/events/events.types.ts
export type IEventCalendarView = { ... }  // Only used in events route components
export type IEventDragState = { ... }     // UI-specific state
```

## Import Conventions

### Always Use `import type` for Types

TypeScript's `verbatimModuleSyntax` is enabled, so type-only imports are required:

```typescript
// ✅ Good
import type { IEvent } from '@/interface/events'
import type { IResponseData } from '@/interface/api-response'
import type z from 'zod'

// ❌ Bad — will cause build errors with verbatimModuleSyntax
import { IEvent } from '@/interface/events'
```

### Mixed Imports

When importing both values and types from the same module:

```typescript
// ✅ Good
import { z } from 'zod'
import type { ZodSchema } from 'zod'

// ✅ Also good — inline type import
import { z, type ZodSchema } from 'zod'
```

### Use `@/` Alias

```typescript
// ✅ Good
import type { IUserProfile } from '@/interface/auth'
import type { ReactQueryHookParams } from '@/interface/utils'

// ❌ Bad
import type { IUserProfile } from '../../interface/auth'
```

## Common Mistakes

### Using `any`

```typescript
// ❌ Bad
const data: any = await fetchData()

// ✅ Good
const data: IResponseData<IEvent[]> = await getEvents()
```

### Duplicating Types

```typescript
// ❌ Bad — same type in two places
// src/interface/events.ts
export type IEvent = { id: string; title: string }
// src/routes/events/events.types.ts
export type IEvent = { id: string; title: string }

// ✅ Good — import from shared location
import type { IEvent } from '@/interface/events'
```

### Manual Form Types

```typescript
// ❌ Bad — manually defined, can drift from schema
export type IEmailFormType = { email: string }

// ✅ Good — inferred from Zod schema
export type IEmailFormType = z.infer<typeof emailSchemas>
```

### Missing `I` Prefix

```typescript
// ❌ Bad — inconsistent with project convention
export type Event = { ... }
export type LoginRequest = { ... }

// ✅ Good
export type IEvent = { ... }
export type ILoginRequest = { ... }
```

### Types in Schema Files

```typescript
// ❌ Bad — type export in schema file
// src/schemas/auth-schemas.ts
export type IEmailFormType = z.infer<typeof emailSchemas>

// ✅ Good — types in interface file, schemas in schema file
// src/interface/auth.ts
export type IEmailFormType = z.infer<typeof emailSchemas>
```

## Checklist

When adding types for a new feature:

- [ ] Interfaces in `src/interface/{feature}.ts` with `I` prefix
- [ ] Re-exported from `src/interface/index.ts`
- [ ] Zod schemas in `src/schemas/{feature}-schemas.ts`
- [ ] Form types inferred from Zod schemas (not manually defined)
- [ ] Endpoint enums in `src/enum/endpoints.ts`
- [ ] All type imports use `import type`
- [ ] All imports use `@/` alias
- [ ] No `any` types
- [ ] No duplicated type definitions
- [ ] Route-scoped types colocated if only used in one route
