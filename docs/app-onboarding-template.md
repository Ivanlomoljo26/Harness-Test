# Pioneer App Onboarding Template

Use this template when adding Qash-like, ZoroSwap-like, or future Miden ecosystem apps to the harness. The goal is not just a passing smoke test. A finished onboarding gives the app a stable adapter boundary, CI-safe test tiers, useful artifacts, and a documented path from first local run to stateful regression.

## Quality Bar

| option | cost | risk | behaves like |
|---|---:|---:|---|
| Copy an existing app spec and edit selectors inline | low | high | One-off script that will drift from the harness. |
| Add selectors, adapter methods, and one read-only smoke | medium | low | Playwright reference pattern: fixtures plus page objects. |
| Add full stateful and transaction tests before smoke is stable | high | medium | Product test suite with weak prerequisites. |

Default to the second option first. Add stateful and transaction suites only after the app has a reliable read-only smoke, clear prerequisites, and artifact coverage.

## Files To Add

```text
apps/<app>/
  adapter.ts
  selectors.ts
  flows/
    smoke.spec.ts
```

Optional follow-up files:

```text
apps/<app>/
  funding-state.ts            # Parsed balance/funding state for transaction apps
  test-data.ts                # Non-secret deterministic data builders
  flows/authenticated.spec.ts # Requires prepared auth state
  flows/transaction.spec.ts   # Requires explicit mutation gates
```

Starter files are available under `templates/pioneer-app/`.

## App Registration Checklist

- Add the app name to `PioneerAppName` in `config/apps.ts`.
- Add a base config in `APP_BASE_CONFIGS`.
- Set `requiresMidenWallet` correctly:
  - `true` for apps that need the Miden wallet extension.
  - `false` for apps with their own account provider or public read-only flows.
- Add known safe testnet URL defaults only when they are real public testnet deployments.
- Do not fake network coverage. The default active path is testnet; add another network only when the user explicitly asks for it or there is a real matching deployment and verification plan.
- Add the app to `selectedAppNames`.
- Add path inference in `inferAppNameFromFile`.
- Add `.env.example` entries for:
  - `<APP>_URL_TESTNET`
  - app-specific auth/profile variables
  - stateful or transaction gates

## Suite Tiers

Use suite tiers so local users and CI can run the right risk level intentionally.

| tier | default CI | mutates state | prerequisites | examples |
|---|---:|---:|---|---|
| `smoke` | yes | no | public URL or prepared app shell | load app, render key page, connect wallet prompt |
| `authenticated` | manual or nightly | no by default | prepared auth profile or CI-safe auth state | dashboard, navigation, settings, read-only tables |
| `stateful` | manual | yes | unique test data, cleanup plan, explicit env gate | create contact, create account, request faucet |
| `funding` | manual | yes | faucet availability, transaction account, settlement assertion | request, claim, sign, execute, funded-balance check |
| `transaction` | manual | yes | funded balance, low amount, safe recipient, explicit env gate | payroll create, payment, swap, invoice pay |
| `durability` | scheduled | may mutate | dedicated test account, cleanup or isolated state | repeated smoke, stress loops, regression sweeps |

Rules:

- Smoke tests must be safe for pull requests.
- Authenticated tests must not enter credentials. Reuse prepared profiles, CDP sessions, or provider-supported test auth.
- Stateful tests must use unique labels or idempotent setup.
- Funding and transaction tests must write artifacts before and after every mutation.
- Transaction tests must stop before final submission unless an env gate explicitly allows the mutation.

## Adapter Checklist

`apps/<app>/adapter.ts` should:

- Extend `BaseAppAdapter`.
- Implement `assertReady`.
- Put app workflow actions in methods with user-level names such as `openDashboard`, `startPayment`, or `submitSwap`.
- Use shared helpers such as `clickFirstVisible`, `fillFirstVisible`, and `expectAnyReadySignal`.
- Emit useful timeline entries through the base helpers.
- Keep selectors out of the spec body.
- Throw errors that explain the missing prerequisite when a stateful flow cannot proceed.

## Selector Checklist

`apps/<app>/selectors.ts` should:

- Prefer role, label, placeholder, and exact text locators.
- Put current observed UI selectors before slower fallbacks.
- Include app-specific env selector overrides only for controls that are expected to vary by deployment.
- Avoid coordinate clicks, magic delays, hidden overlay tricks, or broad `text=` selectors that can hit navigation and content at the same time.
- Include readiness locators for each major page or dialog.

## First Smoke Spec Checklist

The first spec should:

- Use `shouldRunApp('<app>')`.
- Instantiate the app adapter.
- Open the app.
- Assert the app-ready state.
- Capture at least one screenshot and one app-state snapshot.
- Avoid auth, funding, or mutation unless the app cannot expose any public page.

Definition of done for first smoke:

- `yarn ts` passes.
- `npx playwright test apps/<app>/flows/smoke.spec.ts --list` lists the test.
- The smoke test passes locally on testnet or records a concrete external blocker.
- Failure artifacts include `report.json`, `repro.md`, `timeline.ndjson`, `checkpoints.json`, screenshot, and snapshot.

## CI Checklist

- Add the app to the manual `workflow_dispatch` app input if the workflow has a fixed options list.
- Keep PR/push health checks secret-free.
- Run app smoke in CI only if it does not require personal auth, wallet funds, or mutable account state.
- Upload `test-results/` for every network job.
- Store testnet URLs as GitHub variables.
- Store wallet seeds or passwords only as GitHub secrets for dedicated test accounts.
- Do not store personal Google, Para, or wallet credentials in GitHub secrets.

## Artifact Checklist

Every meaningful step should capture:

- A full-page screenshot for UI state.
- An app-state snapshot for text, URL, and interactive elements.
- Parsed domain state when available, such as balance, selected account, pending transaction, or validation warning.

For stateful and transaction tests, capture artifacts:

- Before mutation.
- After filling the form.
- Immediately after submit/sign/execute.
- After final settled assertion or timeout.

## Troubleshooting Checklist

Document failures in the app README or the main guide using this structure:

| symptom | likely cause | smallest safe proof or fix |
|---|---|---|
| App opens but readiness times out | Wrong URL, changed copy, or auth wall | Inspect screenshot and app-state snapshot |
| Wallet connect never appears | Extension missing or wrong network build | Run wallet build for the selected network |
| Authenticated page opens on login | Profile expired | Refresh the prepared profile manually |
| Stateful create form stays open | Duplicate test data or validation error | Capture app-state snapshot and read inline errors |
| Transaction remains pending | Missing sign or execute step | Open pending transactions and assert action controls |

New app onboarding is complete only when these troubleshooting entries cover the first real failures observed during local verification.
