---
name: pleaco-e2e
description: >
  Pleco Playwright end-to-end testing conventions. Use when creating, modifying,
  reviewing, debugging, or organizing Playwright tests, page objects, fixtures, auth
  storage state, test helpers, API mocks/intercepts, visual regression tests,
  accessibility E2E checks, or Playwright CI/debugging workflows under src/tests or
  playwright.config.ts. Also use when the user asks for E2E coverage or Playwright
  test strategy for a Pleco feature.
---

# Pleco E2E

Apply Pleco's established Playwright E2E testing conventions.

## Primary reference

Read `references/e2e.md` for all non-trivial E2E work.

The reference contains the project's conventions for:

- Playwright configuration and commands
- E2E file organization and naming
- test isolation
- locator strategy
- Page Object Model
- custom fixtures and authentication storage state
- web-first assertions
- navigation and API waits
- API mocking/interception
- TanStack Router SPA flows
- react-hook-form/Zod form flows
- toasts, dialogs, and protected routes
- screenshot/visual regression tests
- accessibility checks
- reliability and timeout strategy
- debugging and trace usage
- CI/CD integration
- the new-test checklist

## Project assumptions from the reference

- E2E tests live under `src/tests/`.
- The Playwright config is `playwright.config.ts`.
- Run the suite with `pnpm test:e2e`.
- The dev server is expected to be started by Playwright's configured `webServer`.
- Tests must be independent and safe to run in parallel.
- Use the existing project test structure rather than creating a second E2E convention.

Treat exact configuration values documented in the reference as project-specific guidance. When the
repository implementation differs, inspect `playwright.config.ts` and the existing `src/tests/`
tree before changing behavior.

## Core testing rules

### Test isolation

- Each test must establish its own required state.
- Never depend on another test running first.
- Do not rely on shared mutable state between tests.
- Design tests to remain correct under parallel execution.

### Locators

Prefer locators in this order:

1. `getByRole`
2. `getByLabel`, `getByPlaceholder`, `getByText`, `getByAltText`, or `getByTitle`
3. `getByTestId` only when an accessible/user-facing locator is not practical

Avoid:

- CSS-class selectors
- positional selectors
- implementation-specific selectors
- test IDs when a semantic locator is available

Do not add `data-testid` merely to make a test easier if the UI already exposes a stable accessible
role/name/label.

### Assertions and waiting

- Prefer Playwright web-first `expect(...)` assertions.
- Rely on Playwright auto-waiting where possible.
- Wait for a specific URL, response, locator state, or load condition when explicit synchronization
  is needed.
- Do not use `waitForTimeout` as normal synchronization.
- Do not use retries to hide a flaky test.

### Page objects and fixtures

Use Page Object Model for pages or workflows with enough repeated/complex interactions to justify
an abstraction.

- Page objects should expose meaningful actions and page-level queries/assertion targets.
- Do not expose large collections of raw implementation-detail locators as the public API.
- Use fixtures for reusable setup, authenticated state, or shared test utilities.
- Prefer Playwright `storageState` for reusable authenticated sessions when appropriate.

Do not introduce a page object for a tiny one-off test if direct semantic locators are clearer.

### Network behavior

Use `page.route()` when a test is specifically validating UI behavior for controlled API states.

Mock or intercept external/unreliable dependencies when that improves determinism.

When the test's purpose is true backend integration, do not mock away the behavior being tested.

When waiting for a request triggered by an action, establish the response/request promise before
performing the action to avoid races.

### Test intent

Keep each test focused on one user-observable behavior.

Test names should describe expected behavior rather than a sequence of implementation steps.

Prefer assertions against what a user can observe:

- page URL
- visible text/content
- accessible roles and labels
- enabled/disabled state
- dialogs and notifications
- rendered API states

## Reference-specific patterns

Consult the relevant part of `references/e2e.md` before implementing:

- Authentication work -> fixtures + storage-state sections
- Complex page flows -> Page Object Model section
- API error/loading/empty states -> API mocking/interception section
- Forms -> SPA form-submission section
- Navigation -> TanStack Router navigation section
- Visual checks -> visual regression section
- Accessibility checks -> accessibility section
- Flaky CI tests -> reliability, debugging, trace, and CI sections

## Boundaries with other skills

Use `pleaco-frontend` when the task requires changing application components, routing,
accessibility markup, or UI structure in addition to tests.

Use `pleaco-data-layer` when the task requires changing API/query behavior, response types, or
state ownership in addition to tests.

Use `pleaco-security` when E2E coverage is primarily validating security-sensitive behavior and
that skill exists.

The E2E skill remains authoritative for Playwright test implementation itself.

## Workflow

1. Inspect `playwright.config.ts`, the target feature, and nearby existing tests before adding a new
   pattern.
2. Read `references/e2e.md`.
3. Identify the smallest user behavior the test should prove.
4. Decide whether the test needs:
   - direct locators only,
   - a page object,
   - a fixture,
   - authentication storage state,
   - API interception/mocking,
   - or real backend integration.
5. Create or update tests in the established `src/tests/` structure.
6. Use semantic locators and web-first assertions.
7. Remove hard waits and order dependencies.
8. Run the narrowest relevant Playwright test first when execution is available.
9. Run broader E2E coverage when appropriate.
10. Review failures using traces/screenshots/network/console evidence rather than adding arbitrary
    waits or retries.
