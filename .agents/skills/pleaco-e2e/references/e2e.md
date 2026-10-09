<!-- Converted from e2e.instructions.md for the pleaco-e2e Codex skill. -->

> **Original scope:** `src/tests/**/*.{ts,spec.ts}`  
> **Purpose:** Pleco Playwright E2E testing strategy, organization, fixtures, page objects, locators, assertions, mocking, SPA flows, visual/accessibility checks, reliability, debugging, and CI guidance.  
> **Usage:** This is reference documentation. Skill activation and workflow rules live in `../SKILL.md`.

# E2E Testing — Playwright Best Practices & Strategies

You are an expert QA engineer specializing in end-to-end testing with Playwright for a Vite + React 19 + TanStack Router SPA. Follow these patterns and best practices when writing, reviewing, or debugging E2E tests for the Pleco frontend.

## Project Test Configuration

- **Test runner**: `pnpm test:e2e` (runs `playwright test`)
- **Test directory**: `src/tests/`
- **Config**: `playwright.config.ts`
- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Dev server**: Auto-started via `webServer` config (`pnpm dev`)
- **Retries**: 2 on CI, 0 locally
- **Parallelism**: Fully parallel; single worker on CI
- **Tracing**: Enabled on first retry

## File Organization

```
src/tests/
├── auth/
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   └── registration.spec.ts
├── calendar/
│   ├── create-event.spec.ts
│   ├── edit-event.spec.ts
│   └── view-calendar.spec.ts
├── fixtures/
│   ├── auth.fixture.ts          # Authenticated page fixtures
│   └── test-data.fixture.ts     # Shared test data factories
├── pages/
│   ├── login.page.ts            # Login page object
│   ├── calendar.page.ts         # Calendar page object
│   └── base.page.ts             # Base page object with shared helpers
├── helpers/
│   └── api.helper.ts            # API helpers for test setup/teardown
└── example.spec.ts
```

### Naming Conventions

- Test files: `<feature>.spec.ts` (e.g., `login.spec.ts`, `create-event.spec.ts`)
- Page objects: `<page>.page.ts` (e.g., `login.page.ts`)
- Fixtures: `<name>.fixture.ts` (e.g., `auth.fixture.ts`)
- Helpers: `<name>.helper.ts` (e.g., `api.helper.ts`)
- Group related tests by feature directory

## Writing Tests

### Basic Test Structure

```typescript
import { expect, test } from '@playwright/test'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('displays login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows validation errors for empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })
})
```

### Test Isolation

Each test must be fully independent — never rely on state from a previous test:

```typescript
// ✅ Good — each test sets up its own state
test('creates a new event', async ({ page }) => {
  await page.goto('/calendar')
  await page.getByRole('button', { name: /new event/i }).click()
  await page.getByLabel(/title/i).fill('Team standup')
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Team standup')).toBeVisible()
})

// ❌ Bad — depends on the test above having created "Team standup"
test('edits the event', async ({ page }) => {
  await page.goto('/calendar')
  await page.getByText('Team standup').click()
})
```

## Locator Strategy (Priority Order)

Use resilient locators that survive refactors. Prefer user-facing attributes over implementation details:

### 1. Role-Based (Preferred)

```typescript
page.getByRole('button', { name: /submit/i })
page.getByRole('heading', { name: /dashboard/i })
page.getByRole('link', { name: /settings/i })
page.getByRole('textbox', { name: /search/i })
page.getByRole('checkbox', { name: /remember me/i })
page.getByRole('navigation')
page.getByRole('dialog')
```

### 2. Label / Placeholder / Text

```typescript
page.getByLabel(/email address/i)
page.getByPlaceholder(/enter your name/i)
page.getByText(/no events found/i)
page.getByAltText(/company logo/i)
page.getByTitle(/close dialog/i)
```

### 3. Test ID (Last Resort)

Use `data-testid` only when no accessible locator is available:

```typescript
page.getByTestId('event-card-123')
page.getByTestId('calendar-grid')
```

### Anti-Patterns

```typescript
// ❌ Bad — fragile CSS selectors
page.locator('.btn-primary')
page.locator('#submit-btn')
page.locator('div > form > button:nth-child(2)')

// ❌ Bad — tied to implementation
page.locator('[class*="MuiButton"]')
page.locator('[data-slot="form-item-description"]')

// ✅ Good — user-facing, resilient
page.getByRole('button', { name: /sign in/i })
```

## Page Object Model (POM)

Encapsulate page interactions behind a clean API. Page objects should expose **actions and assertions**, not raw locators.

### Base Page

```typescript
// src/tests/pages/base.page.ts
import type { Locator, Page } from '@playwright/test'

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async navigateTo(path: string) {
    await this.page.goto(path)
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  getToast(): Locator {
    return this.page.getByRole('status')
  }
}
```

### Feature Page Object

```typescript
// src/tests/pages/login.page.ts
import type { Page } from '@playwright/test'
import { BasePage } from './base.page'

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await this.navigateTo('/login')
  }

  async login(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email)
    await this.page.getByLabel(/password/i).fill(password)
    await this.page.getByRole('button', { name: /sign in/i }).click()
  }

  emailInput() {
    return this.page.getByLabel(/email/i)
  }

  passwordInput() {
    return this.page.getByLabel(/password/i)
  }

  submitButton() {
    return this.page.getByRole('button', { name: /sign in/i })
  }

  validationError(message: string | RegExp) {
    return this.page.getByText(message)
  }
}
```

### Using Page Objects in Tests

```typescript
import { expect, test } from '@playwright/test'
import { LoginPage } from '../pages/login.page'

test.describe('Login', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    await loginPage.login('user@example.com', 'password123')
    await expect(page).toHaveURL('/')
  })

  test('invalid credentials show error', async () => {
    await loginPage.login('user@example.com', 'wrongpassword')
    await expect(loginPage.validationError(/invalid credentials/i)).toBeVisible()
  })
})
```

## Custom Fixtures

Use Playwright fixtures to share setup logic, authenticated state, and test data across tests.

### Authenticated Fixture

```typescript
// src/tests/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test'
import { LoginPage } from '../pages/login.page'

type AuthFixtures = {
  authenticatedPage: ReturnType<typeof base['page']>
  loginPage: LoginPage
}

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await use(loginPage)
  },
})

export { expect } from '@playwright/test'
```

### Storage State for Authentication

Persist authentication across tests to avoid repeated logins:

```typescript
// src/tests/fixtures/auth.setup.ts
import { test as setup } from '@playwright/test'

const AUTH_FILE = 'src/tests/.auth/user.json'

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('test@example.com')
  await page.getByLabel(/password/i).fill('password123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/')

  await page.context().storageState({ path: AUTH_FILE })
})
```

Reference in `playwright.config.ts`:

```typescript
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'src/tests/.auth/user.json',
    },
    dependencies: ['setup'],
  },
]
```

## Assertions

### Prefer Web-First Assertions

Web-first assertions auto-retry until the condition is met or the timeout expires:

```typescript
// ✅ Good — auto-retrying web-first assertions
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveTitle(/pleaco/i)
await expect(page.getByRole('alert')).toBeVisible()
await expect(page.getByRole('alert')).toHaveText(/saved successfully/i)
await expect(page.getByRole('button', { name: /submit/i })).toBeEnabled()
await expect(page.getByRole('list')).toHaveCount(5)
await expect(page.getByLabel(/email/i)).toHaveValue('user@example.com')

// ❌ Bad — manual waits, no auto-retry
await page.waitForTimeout(2000)
const text = await page.textContent('.alert')
expect(text).toBe('Saved successfully')
```

### Negative Assertions

```typescript
await expect(page.getByRole('alert')).not.toBeVisible()
await expect(page.getByRole('button', { name: /submit/i })).not.toBeDisabled()
await expect(page.getByText(/loading/i)).not.toBeAttached()
```

### Soft Assertions

Use soft assertions when you want to collect all failures instead of failing on the first one:

```typescript
test('form has all required fields', async ({ page }) => {
  await page.goto('/events/new')
  await expect.soft(page.getByLabel(/title/i)).toBeVisible()
  await expect.soft(page.getByLabel(/date/i)).toBeVisible()
  await expect.soft(page.getByLabel(/time/i)).toBeVisible()
  await expect.soft(page.getByLabel(/description/i)).toBeVisible()
})
```

## Handling Async Operations

### Waiting for Navigation

```typescript
await page.getByRole('link', { name: /dashboard/i }).click()
await page.waitForURL('/dashboard')
```

### Waiting for API Responses

```typescript
const responsePromise = page.waitForResponse('**/api/events')
await page.getByRole('button', { name: /save/i }).click()
const response = await responsePromise
expect(response.status()).toBe(200)
```

### Waiting for Network Idle

```typescript
await page.goto('/dashboard')
await page.waitForLoadState('networkidle')
```

### Avoiding Hard Waits

```typescript
// ❌ Bad — flaky and slow
await page.waitForTimeout(3000)

// ✅ Good — wait for a specific condition
await expect(page.getByText(/event created/i)).toBeVisible()
await page.waitForResponse((res) => res.url().includes('/api/events') && res.status() === 200)
```

## API Mocking & Interception

### Mock API Responses

Use `page.route()` to intercept network requests and return mock data. Useful for testing UI states without a real backend:

```typescript
test('displays events from API', async ({ page }) => {
  await page.route('**/api/events', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: '1', title: 'Team standup', date: '2026-03-01' },
        { id: '2', title: 'Sprint review', date: '2026-03-05' },
      ]),
    }),
  )

  await page.goto('/calendar')
  await expect(page.getByText('Team standup')).toBeVisible()
  await expect(page.getByText('Sprint review')).toBeVisible()
})
```

### Mock Error Responses

```typescript
test('shows error state when API fails', async ({ page }) => {
  await page.route('**/api/events', (route) =>
    route.fulfill({ status: 500, body: JSON.stringify({ message: 'Internal Server Error' }) }),
  )

  await page.goto('/calendar')
  await expect(page.getByText(/something went wrong/i)).toBeVisible()
})
```

### Mock Authentication State

```typescript
test('redirects unauthenticated users to login', async ({ page }) => {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, body: JSON.stringify({ message: 'Unauthorized' }) }),
  )

  await page.goto('/')
  await expect(page).toHaveURL('/login')
})
```

## Testing Common SPA Patterns

### Route Navigation (TanStack Router)

```typescript
test('navigates between pages', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /calendar/i }).click()
  await expect(page).toHaveURL('/calendar')
  await expect(page.getByRole('heading', { name: /calendar/i })).toBeVisible()
})
```

### Form Submission (react-hook-form + Zod)

```typescript
test('validates and submits event form', async ({ page }) => {
  await page.goto('/events/new')

  // Submit empty form — triggers Zod validation
  await page.getByRole('button', { name: /create/i }).click()
  await expect(page.getByText(/title is required/i)).toBeVisible()

  // Fill valid data
  await page.getByLabel(/title/i).fill('Sprint planning')
  await page.getByLabel(/date/i).fill('2026-03-01')

  const responsePromise = page.waitForResponse('**/api/events')
  await page.getByRole('button', { name: /create/i }).click()
  await responsePromise

  await expect(page.getByText(/event created/i)).toBeVisible()
})
```

### Toast / Notification Messages

```typescript
test('shows success toast after saving', async ({ page }) => {
  await page.goto('/events/new')
  await page.getByLabel(/title/i).fill('Retro meeting')
  await page.getByRole('button', { name: /create/i }).click()

  const toast = page.getByRole('status')
  await expect(toast).toBeVisible()
  await expect(toast).toHaveText(/created successfully/i)
})
```

### Dialog / Modal Interactions

```typescript
test('confirms event deletion via dialog', async ({ page }) => {
  await page.goto('/events/1')
  await page.getByRole('button', { name: /delete/i }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/are you sure/i)).toBeVisible()

  await dialog.getByRole('button', { name: /confirm/i }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page).toHaveURL('/calendar')
})
```

### Protected Routes

```typescript
test('redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/login')
})

test('stays on dashboard when authenticated', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/')
  await expect(authenticatedPage).toHaveURL('/')
  await expect(authenticatedPage.getByRole('heading', { name: /dashboard/i })).toBeVisible()
})
```

## Visual Regression Testing

### Screenshots

```typescript
test('login page matches snapshot', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveScreenshot('login-page.png')
})

test('calendar renders correctly', async ({ page }) => {
  await page.goto('/calendar')
  await expect(page.getByTestId('calendar-grid')).toHaveScreenshot('calendar-grid.png')
})
```

### Masking Dynamic Content

```typescript
test('dashboard screenshot with masked dynamic content', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [page.getByTestId('current-time'), page.getByTestId('user-avatar')],
  })
})
```

## Accessibility Testing

Integrate accessibility checks into E2E tests:

```typescript
import AxeBuilder from '@axe-core/playwright'

test('login page has no accessibility violations', async ({ page }) => {
  await page.goto('/login')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('calendar page meets WCAG standards', async ({ page }) => {
  await page.goto('/calendar')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
```

## Performance & Reliability

### Avoid Flaky Tests

1. **Never use hard waits** — use web-first assertions or `waitFor*` methods
2. **Don't depend on test order** — each test must be self-contained
3. **Use specific locators** — avoid positional or index-based selectors
4. **Wait for loading states** — ensure the page is ready before interacting
5. **Mock external dependencies** — avoid flakiness from third-party APIs

### Test Timeouts

```typescript
// Per-test timeout
test('slow operation completes', async ({ page }) => {
  test.setTimeout(60_000)
  // ...
})

// Per-assertion timeout
await expect(page.getByText(/processing/i)).toBeVisible({ timeout: 10_000 })
```

### Retries on CI

Configured in `playwright.config.ts`:

```typescript
retries: process.env.CI ? 2 : 0
```

Avoid relying on retries to mask genuine failures. If a test needs frequent retries, fix the root cause.

## Debugging

### Interactive Debugging

```bash
# Run with Playwright Inspector (step through tests)
pnpm test:e2e -- --debug

# Run with headed browser
pnpm test:e2e -- --headed

# Run a specific test file
pnpm test:e2e -- src/tests/auth/login.spec.ts

# Run tests matching a name pattern
pnpm test:e2e -- -g "login"
```

### Trace Viewer

Traces are captured on first retry. View them with:

```bash
pnpm playwright show-trace trace.zip
```

### Generating Tests with Codegen

```bash
# Record browser interactions and generate test code
pnpm playwright codegen http://localhost:3000
```

### Console & Network Logs

```typescript
test('captures console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/dashboard')
  expect(errors).toEqual([])
})
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Install Playwright browsers
  run: pnpm playwright install --with-deps

- name: Run E2E tests
  run: pnpm test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v4
  if: ${{ !cancelled() }}
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

### Test Reports

The HTML reporter is configured in `playwright.config.ts` (`reporter: 'html'`). Reports are generated in `playwright-report/` after each run:

```bash
# View the HTML report
pnpm playwright show-report
```

## Checklist — Writing a New E2E Test

- [ ] Test file is in `src/tests/<feature>/` with `.spec.ts` extension
- [ ] Uses `test.describe` to group related tests
- [ ] Each test is independent (no shared mutable state between tests)
- [ ] Uses role-based / label-based locators (not CSS selectors)
- [ ] Uses web-first assertions (`await expect(locator).toBeVisible()`)
- [ ] No hard waits (`waitForTimeout`)
- [ ] API calls are intercepted/mocked when testing UI behavior
- [ ] Page Object Model used for complex pages (3+ interactions)
- [ ] Test names describe the expected behavior, not the steps
- [ ] Handles loading states before asserting content

## Key Reminders

- Run `pnpm test:e2e` to execute all E2E tests (dev server starts automatically)
- Tests run in parallel by default — ensure complete test isolation
- Use `page.route()` to mock API responses and test edge cases
- Prefer `getByRole` and `getByLabel` over CSS selectors or test IDs
- Use Playwright's auto-waiting — it retries assertions until they pass or timeout
- Keep tests focused: one behavior per test, descriptive test names
- Use Page Object Model for pages with multiple interactions
- Store authentication state with `storageState` to avoid repeated logins
- Add `data-testid` only when no accessible locator is possible
- Traces and screenshots are your best debugging tools on CI
