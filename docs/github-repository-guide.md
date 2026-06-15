# GitHub Repository Guide

This harness is intended to be a publishable GitHub repository for testing Pioneer and Miden ecosystem apps. A new contributor should be able to clone it, install dependencies, configure local secrets in `.env`, run tests, and inspect artifacts without knowing the original development machine.

## 1. Recommended Repository Structure

```text
pioneer-e2e/
  .github/workflows/
    pioneer-e2e.yml              # Repository health plus manually dispatched testnet E2E
  apps/
    <app>/
      adapter.ts                 # App-specific actions and assertions
      selectors.ts               # App-specific locators
      flows/*.spec.ts            # Playwright specs
  config/
    apps.ts                      # App registry, URLs, wallet requirement flags
    environments.ts              # testnet-first network behavior
    schema.ts                    # Runtime validation for specs
  docs/
    app-onboarding-template.md   # Future-app adapter/spec onboarding checklist
    github-repository-guide.md   # Clone/setup/CI/troubleshooting guide
  harness/
    fixtures.ts                  # Shared Playwright fixtures
    test-step.ts                 # Step runner and artifact capture
    failure-report.ts            # Failure reports and repro docs
    network-capture.ts           # Console/network diagnostics
    timeline-recorder.ts         # Event timeline
  scripts/
    preflight.mjs                # Environment validation
    run-*.mjs                    # Local and CI runners
    build-wallet-extension.mjs   # Wallet extension build orchestration
  test-data/
    accounts.example.json        # Non-secret example test data
  templates/
    pioneer-app/                 # Starter adapter/selectors/smoke files
  wallet/
    *.ts                         # Shared Miden wallet helpers
  .env.example                   # Portable local configuration template
  .gitignore                     # Ignores auth profiles, artifacts, dependencies
  package.json
  playwright.config.ts
  README.md
```

Keep reusable behavior in `harness/`, wallet behavior in `wallet/`, and app behavior in `apps/<app>/`. New app support should not copy Qash or ZoroSwap internals; it should follow [app-onboarding-template.md](app-onboarding-template.md), then add a new adapter and selectors that use the same shared fixtures.

## 2. Setup Instructions For New Users

```bash
git clone https://github.com/Ivanlomoljo26/Harness-Test.git
cd Harness-Test
yarn install --frozen-lockfile
npx playwright install --with-deps chromium
cp .env.example .env
```

For Qash public/onboarding tests, the default `.env.example` is enough to start listing tests and running public smoke tests. It defaults to `E2E_APP=qash` so new users do not need wallet setup for the first successful run.

For authenticated Qash tests, prepare a local browser profile:

```bash
yarn qash:profile
```

Complete Qash/Para login in the Chromium window, wait until Qash shows a post-login page, then close Chromium. The saved profile lives at `.auth/qash` by default and is ignored by Git.

For wallet-backed apps such as ZoroSwap, clone the wallet repository next to this repo or set `WALLET_REPO_PATH`:

```bash
git clone https://github.com/0xMiden/wallet.git ../wallet
yarn wallet:build:testnet
```

After wallet setup, switch `.env` to `E2E_APP=all` or `E2E_APP=zoroswap` when you want wallet-backed app coverage.

## 3. Required Dependencies And Environment Variables

Required local dependencies:

- Node.js 22 or newer
- Yarn 1.x
- Playwright Chromium
- A Chromium-compatible desktop environment for headed runs
- Miden wallet repository only when running wallet-backed apps

Core environment variables:

| Variable | Required For | Purpose |
|---|---|---|
| `E2E_APP` | All runs | `all`, `qash`, or `zoroswap` |
| `E2E_NETWORK` | Single-network runs | `testnet` for the current active path, or `localhost` for local harness experiments |
| `QASH_URL_TESTNET` | Optional | Defaults to `https://app.qash.finance/` |
| `ZOROSWAP_URL_TESTNET` | Optional | Defaults to `https://app.zoroswap.com/` |
| `QASH_AUTH_USER_DATA_DIR` | Authenticated Qash | Prepared profile path, default `.auth/qash` |
| `QASH_PLATFORM_CONTACT_WALLET_ADDRESS` | Qash continuous journey | Testnet Miden `mtst1...` address for the employee contact and Payroll recipient |
| `QASH_PLATFORM_JOURNEY_TIMEOUT_MS` | Qash continuous journey | Optional full-journey timeout; defaults to `900000` |
| `QASH_PLATFORM_ACCOUNT_POOL_SIZE` | Qash continuous journey | Optional reusable multisig-account pool size; defaults to `3`; full pools randomly reuse an existing account |
| `QASH_PLATFORM_MAX_ACCOUNT_COUNT` | Qash continuous journey | Legacy alias for `QASH_PLATFORM_ACCOUNT_POOL_SIZE` when the preferred variable is unset |
| `QASH_PLATFORM_ALLOW_ACCOUNT_OVER_CAP` | Qash continuous journey | Set to `true` only for intentional high-account-count runs |
| `QASH_STRESS_LOOPS` | Qash stress | User-selected loop count for repeated Payroll/Invoice stress |
| `QASH_STRESS_RECEIVER_WALLET_ADDRESS` | Qash stress | Testnet Miden `mtst1...` address used on Payroll and Invoice workload inputs |
| `QASH_STRESS_INCLUDE_PAYMENT_LINK` | Qash stress | Optional Payment Link creation workload; defaults to `false` while the Qash Payment Link route is blocked |
| `QASH_STRESS_INCLUDE_MONEY_MOVEMENT` | Qash stress | Optional Actor A/B public Payment Link settlement; defaults to `false` while the Qash Payment Link route is blocked |
| `QASH_MONEY_MOVEMENT_LOOPS` | Qash Actor A/B money movement | User-selected loop count for public Payment Link pay plus receiver claim/execute |
| `QASH_MONEY_MOVEMENT_DIRECTION` | Qash Actor A/B money movement | Optional direction: `bidirectional`, `actor-b-pays-actor-a`, or `actor-a-pays-actor-b` |
| `QASH_ACTOR_A_*` / `QASH_ACTOR_B_*` | Qash Actor A/B money movement | Actor emails, account IDs, wallet addresses, and prepared profile directories |
| `QASH_FAUCET_REQUEST_TIMEOUT_MS` | Stateful Qash faucet runs | Optional faucet modal settlement timeout; defaults to `180000` |
| `QASH_PENDING_FAUCET_RECEIVE_TIMEOUT_MS` | Qash continuous journey | Optional wait for the faucet receive note; defaults to `300000` |
| `QASH_FAUCET_SETTLEMENT_TIMEOUT_MS` | Qash continuous journey | Optional faucet mint/sync and funded-balance timeout; defaults to `300000` during request settlement |
| `QASH_ACCOUNT_DIRECT_FUNDING_TIMEOUT_MS` | Qash continuous journey | Optional direct-funding check before opening Transactions -> Receive; defaults to `15000` |
| `WALLET_REPO_PATH` | Wallet builds | Local Miden wallet repo path |
| `WALLET_EXTENSION_PATH_TESTNET` | Wallet testnet | Built testnet extension path |
| `WALLET_PASSWORD` | Wallet apps | Password for created/imported wallet profiles |
| `WALLET_SETUP_MODE` | Wallet apps | `create`, `import`, or `profile` |
| `TEST_ACCOUNT_SEED` | Funded wallet import | Seed phrase for transaction tests |
| `WALLET_USER_DATA_DIR` | Wallet profile mode | Prepared wallet browser profile |

Use `.env` for local values. Never commit `.env`, `.auth/`, `.wallet-builds/`, wallet profiles, test seeds, or `test-results/`.

## 4. How To Run Tests Locally

Repository health checks:

```bash
yarn ts
npx playwright test --list
E2E_APP=qash E2E_NETWORK=testnet yarn preflight
```

Qash public smoke:

```bash
E2E_APP=qash E2E_NETWORK=testnet yarn test:e2e:testnet:qash -- --reporter=list
```

Qash authenticated smoke:

```bash
yarn qash:profile
yarn test:e2e:testnet:qash:auth:chromium -- --reporter=list
```

Focused Qash feature surfaces:

```bash
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/feature-surfaces.spec.ts --reporter=list
```

Account-backed Invoice and Payment Link create-action checks without submitting forms:

```bash
QASH_REQUIRE_FEATURE_CREATE_ACTIONS=true \
  yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/feature-surfaces.spec.ts --grep "create-action-smoke" --reporter=list
```

Invoice form fill without submitting:

```bash
QASH_FILL_INVOICE_FORM=true QASH_CREATE_INVOICE_CLIENT=true \
  QASH_INVOICE_CLIENT_WALLET_ADDRESS=mtst1... \
  yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/invoice.spec.ts --grep invoice-form-fill-regression --reporter=list
```

Payment Link form fill without submitting:

```bash
QASH_FILL_PAYMENT_LINK_FORM=true \
  yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/payment-link.spec.ts --grep payment-link-form-fill-regression --reporter=list
```

Continuous Qash product journey through Payment Link:

```bash
QASH_PLATFORM_CONTACT_WALLET_ADDRESS=mtst1... yarn test:e2e:testnet:qash:platform
```

This command creates or reuses a Qash multisig account from the reusable actor pool, requests faucet funding every run, waits for faucet mint/sync settlement, verifies direct funding or completes the faucet receive transaction when actionable, confirms the selected account balance, creates an employee contact, creates Payroll, creates and views an Invoice, returns to the Invoice dashboard, then creates a Payment Link. The pool creates accounts until `QASH_PLATFORM_ACCOUNT_POOL_SIZE`, default `3`, and then randomly reuses a visible existing account unless `QASH_PLATFORM_ALLOW_ACCOUNT_OVER_CAP=true` is explicitly set. It is one Playwright test, so the authenticated Chromium context stays open from the first account step until Payment Link creation completes or a fatal failure closes the run.

Known blocker on June 15, 2026: Qash testnet can retain a ready faucet receive proposal in the API/UI after the PSM/Miden side has no executable proposal and the note is already consumed. The harness fails safely after the pre-run pending gate and three bounded Execute attempts.

Qash stress with actor-a profile and a receiver wallet input:

```bash
QASH_STRESS_LOOPS=<user-selected-loop-count> \
QASH_STRESS_RECEIVER_WALLET_ADDRESS=mtst1... \
yarn test:e2e:testnet:qash:stress
```

Prepare actor-a as the Chromium profile first. The receiver wallet address is represented by the saved testnet Miden receive address used on Payroll and Invoice workload forms:

```bash
QASH_AUTH_USER_DATA_DIR=.auth/qash/actor-a yarn qash:profile
```

The runner defaults actor-a to `.auth/qash/actor-a`, requests faucet tokens every run for actor-a, then runs user-selected mixed platform workload cycles. Each loop creates a unique Payroll contact group, unique Payroll employee contact, Payroll, Invoice client/contact, and Invoice mutations with per-operation timing/status artifacts. `QASH_STRESS_LOOPS` is required and user-selected; `QASH_DURABILITY_LOOPS` and `QASH_DURABILITY_PAYMENT_LOOPS` remain compatibility aliases. Payment Link creation and Actor A/B public Payment Link settlement default to disabled until the upstream Qash Payment Link route is healthy again.

Qash Actor A/B money movement through public Payment Links:

```bash
yarn qash:actor-profile actor-a
yarn qash:actor-profile actor-b
QASH_MONEY_MOVEMENT_LOOPS=<user-selected-loop-count> yarn test:e2e:testnet:qash:money-movement
```

This runner is distinct from mixed stress and is currently a focused diagnostic, not the default public stress path. Keep it disabled until the upstream Qash Payment Link route is healthy. It launches two persistent wallet-enabled Chromium profiles, creates a Payment Link for the receiver actor, has the payer actor open `/payment/<code>`, connect its Miden wallet, pay, waits for `POST /payment-link/<code>/pay`, then requires the receiver actor to complete Claim, Sign, and Execute for the incoming receive note. `QASH_MONEY_MOVEMENT_DIRECTION=bidirectional` is the default; use `actor-b-pays-actor-a` or `actor-a-pays-actor-b` for single-direction diagnostics.

Money movement requires `QASH_ACTOR_A_*` and `QASH_ACTOR_B_*` email, account ID, wallet address, and profile directory values in `.env`. If the configured account ID or exact `QASH_ACTOR_A_PAYMENT_ACCOUNT_NAME` / `QASH_ACTOR_B_PAYMENT_ACCOUNT_NAME` label is not visible in that actor profile, the run fails instead of creating a replacement. Use `QASH_MONEY_MOVEMENT_CREATE_MISSING_ACCOUNTS=true` only for intentional new-account creation.

Qash Payroll form fill without submitting:

```bash
QASH_FILL_PAYROLL_FORM=true QASH_PAYROLL_EMPLOYEE_NAME="Pioneer E2E Employee" \
  QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS=mtst1... \
  yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/payroll.spec.ts --grep payroll-form-fill-regression --reporter=list
```

Qash Payroll transaction proposal on a funded test account:

```bash
QASH_CREATE_PAYROLL=true QASH_PAYROLL_EMPLOYEE_NAME="Pioneer E2E Employee" \
  QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS=mtst1... \
  yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/payroll.spec.ts --grep payroll-create-transaction-regression --reporter=list
```

ZoroSwap wallet connect smoke:

```bash
yarn wallet:build:testnet
E2E_APP=zoroswap E2E_NETWORK=testnet WALLET_PASSWORD='********' WALLET_SETUP_MODE=create \
  yarn test:e2e:testnet:zoroswap -- --reporter=list
```

All configured apps on testnet, when wallet inputs are configured:

```bash
yarn test:e2e:all
```

`test:e2e:all` runs the testnet path by default. Devnet is intentionally not part of the current active scope and should be added later only when explicitly requested or needed.

## 5. How To Run Tests In CI With GitHub Actions

The workflow at `.github/workflows/pioneer-e2e.yml` has two modes.

Repository health runs automatically on pull requests and pushes to `main`. It does not need secrets:

- installs dependencies
- runs `yarn ts`
- lists Playwright tests
- runs Qash-only testnet preflight without wallet secrets

Manual testnet E2E is dispatched from the GitHub Actions UI:

1. Open **Actions** -> **Pioneer E2E** -> **Run workflow**.
2. Choose `app`: `all`, `qash`, or `zoroswap`.
3. Choose the wallet ref if wallet-backed apps are included.
4. Run the workflow.

Configure repository variables:

| Variable | Purpose |
|---|---|
| `QASH_URL_TESTNET` | Optional Qash testnet override |
| `ZOROSWAP_URL_TESTNET` | Optional ZoroSwap testnet override |

Configure repository secrets for wallet-backed apps:

| Secret | Purpose |
|---|---|
| `WALLET_PASSWORD` | Wallet password for CI-created/imported profiles |
| `TEST_ACCOUNT_SEED` | Funded seed for transaction-capable wallet tests |

Authenticated Qash CI needs a CI-safe auth strategy before it should be enabled by default. Do not store personal Google credentials in GitHub secrets. Prefer a dedicated test account, provider-supported auth state, or a future service-account/test-mode flow. The continuous Qash product journey should run in GitHub Actions only after that CI-safe auth state exists and `QASH_PLATFORM_CONTACT_WALLET_ADDRESS` is provided from a repository variable or secret.

## 6. Test Artifacts

Each test writes structured artifacts under:

```text
test-results/run-<timestamp>/<network>/<app>/<scenario>/
```

Important files:

- `report.json`: classified failure report with diagnostic hints
- `repro.md`: local reproduction command and triage steps
- `timeline.ndjson`: chronological events, console/network activity, and step markers
- `checkpoints.json`: step names, status, screenshots, snapshots
- `screenshots/`: full-page screenshots for each configured step
- `snapshots/`: app, wallet, and parsed state snapshots
- Playwright traces/videos/screenshots under `test-results/playwright-artifacts/`
- Playwright HTML report under `test-results/html/`

GitHub Actions uploads `test-results/` as a testnet workflow artifact. Open the workflow run, scroll to **Artifacts**, download the relevant zip, then start with `report.json` and `repro.md`.

## 7. Beginner-Friendly Harness Rules

- Keep `.env.example` complete and safe to copy.
- Make `yarn ts`, `npx playwright test --list`, and `yarn preflight` the first troubleshooting commands.
- Prefer focused scripts such as `yarn test:e2e:testnet:qash:auth:chromium` over long raw Playwright commands.
- Gate mutating actions behind explicit environment variables such as `QASH_REQUEST_FAUCET_TOKENS=true`.
- Use readable step names in specs because they become artifact filenames and checkpoints.
- Put selector knowledge in `selectors.ts` and workflow knowledge in `adapter.ts`.
- Add new apps by following the adapter pattern, not by duplicating another app's spec body.
- Start new apps from `docs/app-onboarding-template.md` and `templates/pioneer-app/`.
- Document every required secret or external prerequisite next to the command that needs it.

## 8. Troubleshooting Failed Tests

Start with setup validation:

```bash
yarn ts
npx playwright test --list
yarn preflight
```

Then inspect artifacts in this order:

1. `report.json`
2. `repro.md`
3. failed-step screenshot in `screenshots/`
4. `checkpoints.json`
5. `timeline.ndjson`
6. Playwright trace zip in `test-results/playwright-artifacts/`

Common failures:

| Symptom | Likely Cause | Fix |
|---|---|---|
| `WALLET_PASSWORD is required` | Running wallet-backed apps without wallet setup | Set `E2E_APP=qash` for Qash-only, or configure wallet vars |
| Qash opens on `Continue by email` | Auth profile expired or was never prepared | Run `yarn qash:profile` and close Chromium after login |
| Google rejects login browser | Attempting auth in Playwright-controlled context | Use the standalone `yarn qash:profile` flow |
| Wallet extension network mismatch | Wallet extension build does not match `E2E_NETWORK` | Run `yarn wallet:build:testnet` for the default path |
| Selector timeout | App UI changed or loaded into a different state | Inspect screenshot and app snapshot, then update app selectors/adapter |
| Faucet/funding test stalls | Pending receive/sign/execute state not complete | Run the gated claim or funded-balance checks and inspect Transactions artifacts |

When adding a new troubleshooting entry, include the symptom, likely cause, and the smallest safe command that proves or fixes it.
