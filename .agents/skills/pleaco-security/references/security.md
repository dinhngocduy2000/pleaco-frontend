<!-- Converted from security-compliance.instructions.md for the pleaco-security Codex skill. -->

> **Original scope:** `**/*.{ts,tsx}`  
> **Purpose:** Frontend security and data-protection guidance for Pleco, including secret exposure, input handling, XSS and URL safety, authentication-state handling, sensitive data, logging, upload constraints, dependency security, and frontend deployment considerations.  
> **Usage:** This is curated reference documentation. The original source mixes frontend guidance with SmartHire/Next.js/Hono/MikroORM backend patterns; applicability rules, exclusions, and skill activation live in `../SKILL.md`.

# Pleco Frontend Security & Data Protection

## Applicability

Pleco is a Vite + React frontend. Apply this reference to browser/frontend concerns only.

The following source ideas are applicable at the frontend level:

- defense in depth
- least privilege
- fail securely
- secret-exposure prevention
- client-side input validation and sanitization
- XSS prevention
- URL safety
- frontend authentication-state handling
- safe handling of sensitive/personal data
- upload constraints in the UI
- safe logging/error behavior
- dependency security
- frontend deployment/security-header review when the relevant config is present

The original source also contains server/backend guidance. Those sections are listed separately
under **Non-applicable source guidance** and must not be treated as Pleco frontend architecture.

## Security Principles

### Defense in Depth

Use multiple layers of security controls. Do not rely on one frontend check as the only protection.

Treat all user-controlled input as untrusted.

Frontend validation and route guards can improve UX and reduce accidental misuse, but security that
depends on server trust must also be enforced by the backend.

### Least Privilege

Minimize access to sensitive data and expose only the information required by the current UI.

Avoid keeping sensitive values in browser state, storage, logs, or rendered output longer than
necessary.

### Fail Securely

Handle failures without exposing secrets or sensitive implementation details.

Prefer safe fallback behavior when auth state, permissions, or user-controlled values are invalid.

Do not expose stack traces, tokens, secrets, or sensitive data in user-facing errors.

## Environment Variables & Secrets

### Frontend rules

Never:

- commit secret-bearing `.env` files
- hardcode secrets in source
- log secrets
- expose secrets in error messages
- include server-only secrets in the client bundle

The original source explicitly warns against putting database credentials and secret keys in
frontend code.

Pleco-specific environment-variable naming and access conventions should come from the existing
Pleco data-layer/project configuration rather than from the source's Next.js examples.

### Important trust boundary

A value available to frontend JavaScript must be treated as client-visible.

Do not treat an environment-variable name or build-time injection mechanism as a way to hide a
secret from users of the built application.

## Input Validation & Sanitization

The source requires treating input as untrusted and validating it according to the expected shape.

Frontend-appropriate validation examples include:

- trim text where the product expects trimmed input
- validate email format
- validate URL format and allowed schemes
- constrain numeric ranges
- constrain fixed choices/enums
- sanitize HTML content if HTML rendering is genuinely required

Use the project's existing Zod/react-hook-form patterns for form validation.

### Security boundary

Do not claim frontend validation is sufficient security enforcement.

The source explicitly states not to trust client-side validation alone. Server-side validation is a
backend responsibility and must be enforced by the backend for security-sensitive operations.

## XSS Prevention

React escapes interpolated text values by default.

Preferred:

```tsx
<div>{userInput}</div>
<input value={userInput} />
```

Avoid rendering untrusted HTML:

```tsx
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

If the product truly requires user-controlled HTML:

1. confirm that HTML rendering is actually required
2. use an established sanitization library/pattern already approved in the project
3. sanitize before passing content to `dangerouslySetInnerHTML`
4. do not build a custom HTML sanitizer ad hoc

The original source uses DOMPurify as its sanitization example. Do not add that dependency solely
because it appears in this reference; first inspect whether Pleco already has an approved
sanitization approach.

## URL Safety

Do not blindly use arbitrary user-controlled strings as link targets.

The original source's rule is to validate allowed URL schemes and accept only expected protocols
such as `http:` and `https:` for normal external web links.

Illustrative pattern from the source:

```typescript
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
```

Apply URL validation according to the actual feature requirements. Do not expand the allowed scheme
set without a concrete product need.

## Authentication & Authorization in the Frontend

Frontend route protection should align with the existing Pleco authentication flow.

Security-sensitive rules:

- do not assume hiding a button or route in the UI is sufficient authorization
- avoid rendering protected content while auth state is unresolved
- redirect or block unauthenticated UI access using the project's existing routing/auth pattern
- do not expose protected data merely because navigation is hidden
- do not invent a new auth library or routing stack for this purpose

The original source's protected-route example uses Next.js `use client` and `next/navigation`.
That implementation is not a Pleco convention and was intentionally not carried over.

Backend authorization remains a backend responsibility.

## Security Headers & Frontend Deployment

The source highlights these browser security controls:

- Content-Security-Policy (CSP)
- X-Frame-Options / clickjacking protection
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

For Pleco, inspect the actual nginx/deployment configuration before changing these settings.

Do not copy the source's Hono `secureHeaders` middleware example into this frontend repository.

When reviewing deployment headers, preserve required application behavior and avoid weakening a
policy merely to make a resource load without understanding why it is blocked.

## Sensitive Data & Privacy

Avoid logging or exposing:

- passwords
- access/refresh tokens
- API keys
- payment-card data
- government identifiers
- other sensitive personal data

The source identifies personal data such as email addresses, phone numbers, full names, addresses,
government identifiers, payment-card numbers, and in some jurisdictions IP addresses as potentially
sensitive.

Minimize personal data in:

- browser storage
- Redux/client state
- query caches when unnecessary
- URLs/search parameters
- console logs
- analytics payloads
- error messages

Do not add claims about legal compliance solely from frontend behavior. Requirements such as
retention, deletion, portability, consent, encryption at rest, and breach reporting involve broader
system/process responsibilities.

## File Upload Security

Frontend upload UI may enforce expected constraints such as:

- permitted MIME/type choices
- maximum file size
- expected filename/display-name format

Do not trust the user-provided filename as a safe server filesystem path.

Do not treat client-side MIME/type/size checks as sufficient server-side enforcement.

The source's server-side unique-filename generation and upload-processing implementation was not
migrated because Pleco frontend does not own server file storage.

## Logging & Error Handling

### Never log

- passwords
- API keys
- access tokens
- refresh tokens
- government identifiers
- payment-card information
- other unnecessary sensitive/personal data

### Security-relevant events

The original source recommends recording authentication failures, authorization failures, data
modifications, configuration changes, security errors, and rate-limit violations at the system
level.

For frontend code, only log events that are appropriate for the existing telemetry/logging
architecture, and never include sensitive values.

Do not introduce a new logging backend as part of a frontend change unless explicitly requested.

## Dependency Security

The source recommends checking dependency vulnerabilities and outdated packages with pnpm.

Relevant commands from the source:

```bash
pnpm audit
pnpm outdated
```

Only run project-specific scripts such as:

```bash
pnpm lint:security
```

if that script actually exists in the repository.

Do not automatically run a vulnerability "fix" command that mutates dependencies unless the task
explicitly requires dependency remediation and the resulting changes can be reviewed.

## Frontend Security Review Checklist

For a security-sensitive frontend change, check:

- [ ] No hardcoded secrets
- [ ] No server-only secrets exposed to browser code
- [ ] User-controlled text is rendered safely
- [ ] `dangerouslySetInnerHTML` is absent or justified and sanitized
- [ ] User-controlled URLs are validated for the intended schemes
- [ ] Client-side validation is not treated as the only security boundary
- [ ] Protected UI follows the existing auth flow
- [ ] Sensitive values are not written to logs/errors
- [ ] Personal data is not unnecessarily stored in URL/client state/browser storage
- [ ] File uploads enforce useful client constraints without claiming server-side protection
- [ ] Dependency/security commands used actually exist in the repo
- [ ] Deployment-header changes are made in the actual nginx/deployment config, not invented in app code
- [ ] Any backend-only requirement is identified as such rather than implemented with an unrelated stack

## Incident Response & Compliance Guidance

The source includes high-level incident-response steps:

1. isolate affected systems
2. preserve evidence
3. reset compromised credentials
4. notify the security team
5. identify breach scope and exposure
6. remediate vulnerabilities
7. communicate as required

It also lists GDPR/CCPA-style concerns such as access, deletion, portability, consent, data
minimization, and purpose limitation.

These are system/organizational requirements, not guarantees provided by this frontend skill.

When a task involves legal/compliance obligations, do not infer that Pleco satisfies them merely
because this reference mentions them.

## Non-applicable Source Guidance

The following material exists in the original `security-compliance.instructions.md` but is not
Pleco frontend guidance and should not be applied unless the repository actually contains the
relevant technology.

### SmartHire-specific context

The source identifies the target as the **SmartHire Candidate Platform**, not Pleco.

Do not reuse SmartHire-specific entities such as candidates, jobs, applications, or its backend
folder structure as Pleco conventions.

### Next.js-specific frontend configuration

Excluded examples include:

- `@t3-oss/env-nextjs`
- `NEXT_PUBLIC_API_URL`
- `"use client"`
- `next/navigation`

Pleco is not documented as a Next.js application.

### Hono/backend route handling

Excluded examples include:

- `@hono/zod-validator`
- Hono route handlers
- Hono auth middleware
- Hono CORS middleware
- `hono/secure-headers`
- `hono-rate-limiter`

Do not introduce these into Pleco frontend code because they appear in the source.

### Database/MikroORM guidance

Excluded implementation sections include:

- SQL injection examples
- MikroORM query builder
- raw SQL parameterization
- database entities
- database encryption decorators
- repository-based data export
- soft-delete entity decorators

These are backend/database concerns.

The high-level lesson—never trust client input and enforce backend security on the backend—remains
applicable, but this skill does not prescribe a backend implementation.

### Better Auth server configuration

The original Better Auth setup, password hashing behavior, and server session implementation are
not Pleco frontend conventions.

Use Pleco's existing auth implementation.

### Backend CORS and rate limiting

CORS policy and rate limiting are server/deployment concerns. The original Hono implementations are
not applicable to frontend React code.

### Backend file processing

The source's server-side filename generation and filesystem/storage safety implementation is not a
frontend implementation pattern.

### Database/compliance implementation

The source's database encryption, GDPR soft-delete, and repository export examples are not migrated
as Pleco frontend implementation guidance.

## Final Principle

Use the original source's general security posture:

- treat input as untrusted
- minimize privilege and data exposure
- fail safely
- prevent secret leakage
- prevent unsafe HTML/URL handling
- keep sensitive data out of logs
- recognize that client-side controls are not substitutes for backend enforcement

Apply those principles through Pleco's actual Vite/React architecture rather than through the
unrelated backend/Next.js stack present in the original source.
