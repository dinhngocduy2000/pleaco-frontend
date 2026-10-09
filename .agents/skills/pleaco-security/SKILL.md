---
name: pleaco-security
description: >
  Pleco frontend security and data-protection guidance. Use when creating, modifying,
  reviewing, or debugging security-sensitive frontend code involving authentication state,
  protected UI/routes, user-controlled content, URLs, client-side validation, environment
  variables, secrets, sensitive data, logging, file uploads, dependency security, or frontend
  deployment security. Also use for security reviews of React/TypeScript changes. This skill
  is scoped to the Pleco frontend and must not introduce backend frameworks or server-side
  patterns that are not present in the repository.
---

# Pleco Security

Apply the frontend-relevant security guidance in `references/security.md`.

## Scope

This skill is for the Pleco Vite + React frontend.

Use it for:

- frontend authentication/authorization UX and route guarding
- user-controlled HTML, text, and URL handling
- frontend environment variables and secret-exposure review
- client-side validation and sanitization
- sensitive-data handling in browser code
- frontend logging and error exposure
- file-upload UI validation
- dependency-security checks
- frontend deployment/security-header review when the repository contains the relevant nginx/config
- security-oriented review of React/TypeScript changes

Do not use this skill to invent backend architecture.

## Primary reference

Read `references/security.md` for any non-trivial security-sensitive task.

The reference is a curated conversion of the original
`security-compliance.instructions.md`. It preserves frontend-applicable guidance and explicitly
marks source sections that were not migrated because they belong to a different SmartHire
Next.js/Hono/MikroORM backend stack.

## Core rules

- Never hardcode secrets or place secret values in the client bundle.
- Treat all user-controlled input as untrusted.
- Use React's normal escaped rendering for untrusted text.
- Avoid `dangerouslySetInnerHTML`; if HTML rendering is truly required, use an established
  sanitization approach already present in the repository.
- Validate user-controlled URL schemes before using them for navigation or links.
- Client-side validation improves UX but is not a security boundary; do not claim it replaces
  backend validation.
- Do not log passwords, API keys, access/refresh tokens, or other sensitive values.
- Do not expose sensitive implementation details through frontend error messages.
- Keep authentication/authorization decisions aligned with the existing Pleco auth flow.
  Do not introduce Next.js, Better Auth, Hono, or other unrelated auth patterns.
- For uploads, validate client-visible constraints such as expected type/size where useful, but
  do not represent frontend validation as sufficient server-side protection.
- Prefer least privilege and minimize exposure of personal/sensitive data in browser state.
- Inspect existing repository configuration before changing CSP, nginx headers, auth handling,
  or environment-variable conventions.

## Source applicability

The original security instructions were written for the "SmartHire Candidate Platform" and include
backend/server implementation examples. They are not automatically Pleco conventions.

Do not apply examples involving:

- `apps/api`
- Hono route handlers or middleware
- MikroORM/database queries
- Better Auth server configuration
- Next.js `use client`, `next/navigation`, or `NEXT_PUBLIC_*`
- backend CORS middleware
- backend rate-limiter middleware
- database encryption/entity decorators
- server-side GDPR repository examples

unless the current repository actually contains those technologies and the task explicitly concerns
them.

## Boundaries with other skills

Use `pleaco-frontend` for general component, route, styling, accessibility, and React/TypeScript
architecture.

Use `pleaco-data-layer` for Axios, React Query, API response types, endpoint enums, schemas, and
state ownership. Use this security skill alongside it when the data-layer task is security-sensitive.

Use `pleaco-e2e` for Playwright implementation. Use this skill alongside it when writing
security-focused E2E coverage.

Use `vercel-react-best-practices` additionally for performance-focused React work; security rules
take priority when a performance technique would weaken safety or expose data.

## Workflow

1. Identify the trust boundary and the user-controlled or sensitive data involved.
2. Inspect the existing Pleco implementation before choosing an auth, env, upload, or
   deployment-security pattern.
3. Read `references/security.md`.
4. Separate frontend-enforceable behavior from backend-enforced security requirements.
5. Make the smallest change that preserves existing architecture.
6. Check for:
   - secret exposure
   - XSS/unsafe HTML
   - unsafe URL handling
   - sensitive data in logs/errors
   - misleading reliance on client-only validation
   - unnecessary exposure of personal data
   - insecure auth-state assumptions
7. Run relevant lint/tests/audit commands only when they exist in the repository.
8. If a required protection belongs to the backend or deployment layer and that implementation is
   outside this repository, state that limitation rather than inventing server-side code.
