# Miden Pioneer App E2E Framework

Automation framework for Miden Pioneer apps such as ZoroSwap and Qash Finance.

The framework is intentionally built as a shared Playwright harness plus app adapters. This avoids one-off scripts and keeps wallet setup, diagnostics, reports, and CI behavior consistent across apps.

For the GitHub-ready clone/install/configure/run workflow, see [docs/github-repository-guide.md](docs/github-repository-guide.md). For adding future apps, see [docs/app-onboarding-template.md](docs/app-onboarding-template.md).

## Architecture

| Option | Cost | Risk | Behaves like |
|---|---:|---|---|
| One-off specs per app | Low upfront | Duplicated wallet logic and weak diagnostics | Prototype script |
| Shared harness plus app adapters | Medium | More structure to maintain | Playwright reference pattern: fixtures, page objects, reporters |
| Custom runner | High | Reimplements Playwright and slows delivery | Custom test platform |

Chosen approach: shared harness plus app adapters.

## Requirements

- Node 22+
- Yarn
- Playwright Chromium
- Built Miden wallet extension for testnet when running Miden-wallet apps such as ZoroSwap
- Either `TEST_ACCOUNT_SEED` or `WALLET_USER_DATA_DIR` for funded wallet transaction tests
- Real app URLs for testnet. ZoroSwap and Qash have known public testnet URLs.

Build the testnet wallet extension from the wallet repo before running wallet-backed app tests:

```bash
cd pioneer-e2e
yarn wallet:build:testnet
```

This creates:

```text
.wallet-builds/testnet/chrome_unpacked/
```

## Setup

```bash
git clone https://github.com/Ivanlomoljo26/Harness-Test.git
cd Harness-Test
yarn install --frozen-lockfile
npx playwright install --with-deps chromium
cp .env.example .env
```

Set these values in `.env` or your shell:

```bash
export E2E_APP=qash
export WALLET_REPO_PATH=../wallet
export WALLET_EXTENSION_PATH_TESTNET=.wallet-builds/testnet/chrome_unpacked
export WALLET_PASSWORD='********'
export WALLET_SETUP_MODE=create
```

The default `.env.example` starts with `E2E_APP=qash` so new users can run Qash public checks before configuring wallet-backed apps. Switch to `E2E_APP=all` or `E2E_APP=zoroswap` after wallet extension setup is complete.

For funded swap/payment tests, use `WALLET_SETUP_MODE=import` plus `TEST_ACCOUNT_SEED`, or `WALLET_SETUP_MODE=profile` plus `WALLET_USER_DATA_DIR`.

Qash currently uses Para account onboarding rather than Miden wallet connection. Its smoke test opens `https://app.qash.finance/`, clicks `Continue by email`, and verifies that the Para sign-up/login or post-auth onboarding surface appears.

The Qash deployment may return HTTP 500 for the initial `/` document while still hydrating and redirecting into the usable `/login` UI. The Qash adapter records that document status as a warning and lets readiness selectors determine whether the user-facing onboarding flow works. Other apps still fail fast on HTTP 4xx/5xx document responses.

## Run Locally

Default testnet run:

```bash
yarn test:e2e:testnet
```

Focused testnet app runs:

```bash
yarn test:e2e:testnet:zoroswap
yarn test:e2e:testnet:qash
```

All configured apps on testnet:

```bash
yarn test:e2e:all
```

`test:e2e:all` is testnet-focused by default. Devnet is intentionally not part of the current active scope and should be added later only when explicitly requested or needed.

Single app:

```bash
yarn test:e2e:zoroswap
yarn test:e2e:qash
```

Qash public/onboarding and Para-authenticated platform runs do not require `WALLET_PASSWORD`, `TEST_ACCOUNT_SEED`, or wallet extension setup. Qash Actor A/B money-movement runs do require prepared Miden extension wallets in both actor profiles because the public Payment Link payer flow connects the extension wallet.

## Qash Authenticated Profile

Qash uses Google/Para auth. Do not automate Google credentials directly. Prepare a persistent browser profile once, then reuse it for authenticated checks.

Create or refresh the profile:

```bash
cd pioneer-e2e
yarn qash:profile
```

The script opens Qash in a standalone Chromium window backed by `.auth/qash`. Complete Qash/Para login manually, then close Chromium after Qash shows a post-login screen such as `Tell us about your company`, `Wallet Created`, or the dashboard. The standalone login window avoids Playwright control during manual Google/Para authentication, because Google may reject automated browser contexts.

If Google asks for a password, recovery, or 2FA, finish that manually. The default profile path is:

```text
.auth/qash
```

Run authenticated tests with that Chromium profile:

```bash
yarn test:e2e:testnet:qash:auth:chromium
```

The Chromium authenticated runner verifies `.auth/qash` before Playwright starts. If the profile has expired during a headed local run, the runner opens the same standalone Chromium profile-prep window first; complete Qash/Para login manually, close Chromium after a post-login screen appears, and the runner continues to the test. Headless and CI runs remain non-interactive and stop before test execution with a profile-refresh message.

Useful overrides:

```bash
QASH_AUTH_AUTO_PREP=false yarn test:e2e:testnet:qash:auth:chromium
QASH_AUTH_PREFLIGHT=false yarn test:e2e:testnet:qash:auth:chromium -- --list
QASH_AUTH_PREFLIGHT_TIMEOUT_MS=10000 yarn test:e2e:testnet:qash:auth:chromium
```

### Existing Windows Chrome Profile

If Qash is already logged in inside a Windows Chrome profile, use the CDP runner instead of copying the profile or pointing Linux Chromium at it:

```bash
yarn test:e2e:testnet:qash:auth:windows-profile -- --reporter=list
```

Set `QASH_WINDOWS_CHROME_USER_DATA_DIR` to your Windows Chrome user-data root before using this runner. Override `QASH_WINDOWS_CHROME_PROFILE_DIRECTORY`, or `QASH_WINDOWS_CHROME_EXE` when using a non-default Chrome install/profile. The runner auto-detects the Windows WSL interface and starts a temporary Windows-local TCP proxy when WSL cannot directly see Chrome's localhost CDP endpoint; set `QASH_WINDOWS_CHROME_CONNECT_HOST` only if auto-detection fails. If the profile is already open without remote debugging, close that Chrome profile window and rerun the command. The runner does not enter or read Google credentials.

### Qash Continuous Platform Journey

The current product-level Qash journey runs as one Playwright test and keeps the same Chromium context/page from the first account step through Payment Link creation:

1. create a Qash account
2. request faucet funding
3. wait for faucet mint/sync settlement, then verify direct funding or claim/sign/execute the faucet receive transaction
4. confirm the new account shows a non-zero QASH balance
5. open Contact Book
6. create an employee contact
7. open Payroll
8. fill Payroll, click `Create now`, click `Confirm and create`
9. verify the created Payroll row is visible
10. create a Client contact for Invoice
11. create Invoice, view the created invoice, then return to the Invoice dashboard and verify the new row
12. create Payment Link and verify the active link row

Prepare the authenticated Qash profile first with `yarn qash:profile`, then provide a testnet Miden address for the employee contact:

```bash
QASH_PLATFORM_CONTACT_WALLET_ADDRESS=mtst1... yarn test:e2e:testnet:qash:platform
```

The command sets `QASH_PLATFORM_JOURNEY=true` for that run, launches Chromium once through the authenticated Qash runner, writes step screenshots/snapshots/traces under `test-results/`, and closes Chromium only after Payment Link creation completes or after a fatal failure.

Current known blocker, June 15, 2026: Qash testnet can retain a ready faucet receive proposal in the API/UI after the PSM/Miden side has no executable proposal and the note is already consumed. The platform journey performs a pre-run pending gate and three bounded Execute attempts before failing safely. Treat this as an upstream Qash/testnet settlement blocker, not a harness pass, until Qash reconciles the pending receive route.

The platform journey keeps a small reusable multisig-account pool. It creates accounts until the actor profile has `QASH_PLATFORM_ACCOUNT_POOL_SIZE` accounts, default `3`; after that, it randomly reuses a visible existing account. The journey still requests faucet tokens every run because faucet activity is part of the testnet network monitor. `QASH_PLATFORM_MAX_ACCOUNT_COUNT` is kept as a legacy fallback, and `QASH_PLATFORM_ALLOW_ACCOUNT_OVER_CAP=true` should only be used when intentionally testing high account counts.

Optional overrides:

```bash
QASH_PLATFORM_ACCOUNT_NAME="Pioneer E2E Platform"
QASH_PLATFORM_CONTACT_NAME="Pioneer E2E Employee"
QASH_PLATFORM_CONTACT_EMAIL="pioneer.platform@example.com"
QASH_PLATFORM_CONTACT_GROUP="Engineering"
QASH_PLATFORM_PAYROLL_MONTHLY_AMOUNT=3.25
QASH_PLATFORM_INVOICE_AMOUNT=2.75
QASH_PLATFORM_PAYMENT_LINK_AMOUNT=4.10
```

When `QASH_PLATFORM_CONTACT_GROUP` is omitted, the journey creates a unique group before adding the contact. If you provide an existing group, the command reuses it unless `QASH_PLATFORM_CREATE_CONTACT_GROUP=true`. Platform Payroll, Invoice, and Payment Link amounts default to randomized `1-5 QASH` values unless overridden.

### Qash Stress

The stress runner is separate from the full platform journey. The platform journey is a one-pass golden path; stress is a repeated workload runner with loop count, failure budget, per-operation timing, and summary artifacts. The public/default stress path currently keeps Payment Link creation and public Payment Link money movement disabled until the upstream Qash Payment Link route is fixed:

1. create or reuse actor-a's sender account from a 3-account pool
2. request faucet tokens every run and settle Claim/Sign/Execute when needed
3. loop mixed platform mutations: unique Payroll contact group, unique Payroll employee contact, Payroll, Invoice client/contact, and Invoice
4. optionally create Payment Links only when `QASH_STRESS_INCLUDE_PAYMENT_LINK=true`
5. optionally run Actor A/B public Payment Link settlement only when `QASH_STRESS_INCLUDE_MONEY_MOVEMENT=true`
6. optionally observe/complete actor-a visible pending transactions when explicitly enabled
7. write per-loop operation/status/latency artifacts under `test-results/`

Prepare actor-a first for the mixed platform leg:

```bash
yarn qash:actor-profile actor-a
```

Then run:

```bash
QASH_STRESS_LOOPS=<user-selected-loop-count> \
QASH_STRESS_RECEIVER_WALLET_ADDRESS=mtst1... \
yarn test:e2e:testnet:qash:stress
```

For example, a five-loop Qash stress run is:

```bash
QASH_STRESS_LOOPS=5 \
QASH_STRESS_RECEIVER_WALLET_ADDRESS=mtst1... \
yarn test:e2e:testnet:qash:stress
```

The command defaults actor-a to `.auth/qash/actor-a`. `QASH_STRESS_RECEIVER_WALLET_ADDRESS` is the testnet `mtst1...` address used on Payroll and Invoice workload inputs. `QASH_STRESS_LOOPS` is required and user-selected; `QASH_DURABILITY_LOOPS` and `QASH_DURABILITY_PAYMENT_LOOPS` remain compatibility aliases. Every generated Payroll and Invoice amount defaults to a randomized `1-5 QASH` value unless the corresponding stress amount override is set. Pending transaction completion is not a pass criterion for the mixed workload; set `QASH_STRESS_ATTEMPT_PENDING_TRANSACTIONS=true` only when deliberately inspecting visible pending transaction behavior.

`QASH_STRESS_INCLUDE_MIXED_PLATFORM` defaults to `true`. `QASH_STRESS_INCLUDE_PAYMENT_LINK` and `QASH_STRESS_INCLUDE_MONEY_MOVEMENT` default to `false` for the publishable path. When the Qash Payment Link route is healthy again, opt into the full Payment Link path with both flags and prepared Actor A/B profiles:

```bash
yarn qash:actor-profile actor-a
yarn qash:actor-profile actor-b
QASH_STRESS_LOOPS=<user-selected-loop-count> \
QASH_STRESS_RECEIVER_WALLET_ADDRESS=mtst1... \
QASH_STRESS_INCLUDE_PAYMENT_LINK=true \
QASH_STRESS_INCLUDE_MONEY_MOVEMENT=true \
yarn test:e2e:testnet:qash:stress
```

### Qash Actor A/B Money Movement

The money-movement runner is included in Qash stress and remains available as a focused diagnostic command. It uses two prepared Chromium profiles, each with its own Qash login and Miden extension wallet, then proves product-supported settlement through public Payment Links:

1. receiver actor creates a Payment Link on its selected Qash account
2. payer actor opens the public `/payment/<code>` page
3. payer actor connects its Miden wallet, clicks `Pay now`, and approves the wallet transaction
4. Qash records `POST /payment-link/<code>/pay`
5. receiver actor opens Transactions and completes Claim, Sign, and Execute for the incoming receive note

Prepare both actor profiles first:

```bash
yarn qash:actor-profile actor-a
yarn qash:actor-profile actor-b
```

Set both actors' browser account emails, Qash account IDs, Miden wallet addresses, and profile directories in `.env`, then run a user-selected loop count:

```bash
QASH_MONEY_MOVEMENT_LOOPS=<user-selected-loop-count> yarn test:e2e:testnet:qash:money-movement
```

Required actor variables:

```text
QASH_ACTOR_A_EMAIL=
QASH_ACTOR_A_ACCOUNT_ID=
QASH_ACTOR_A_WALLET_ADDRESS=
QASH_ACTOR_A_PROFILE_DIR=.auth/qash/actor-a
QASH_ACTOR_B_EMAIL=
QASH_ACTOR_B_ACCOUNT_ID=
QASH_ACTOR_B_WALLET_ADDRESS=
QASH_ACTOR_B_PROFILE_DIR=.auth/qash/actor-b
```

`QASH_MONEY_MOVEMENT_DIRECTION` defaults to `bidirectional`, which runs Actor B pays Actor A and Actor A pays Actor B for each loop. Set it to `actor-b-pays-actor-a` or `actor-a-pays-actor-b` for a single direction. Amounts default to randomized `1-5 QASH`; set `QASH_MONEY_MOVEMENT_AMOUNT` only when a fixed amount is needed.

Payment execution uses a disposable payer wallet browser session for each leg, matching the wallet harness fresh-session lifecycle. A random `create` wallet is valid for connect-only diagnostics but has `0 QASH`, so live Pay requires a funded wallet source: set `QASH_PAYER_TEST_ACCOUNT_SEED` or the role-specific `QASH_ACTOR_A_PAYER_TEST_ACCOUNT_SEED` / `QASH_ACTOR_B_PAYER_TEST_ACCOUNT_SEED` to import a funded wallet into a fresh profile each run. As an alternate, set `QASH_PAYER_WALLET_USER_DATA_DIR` or the role-specific payer profile variable for a prepared funded profile. The runner checks the wallet's QASH balance before clicking Pay because the Qash faucet funds Qash multisig accounts, not arbitrary public payer wallet addresses.

For the Social Account workaround probe, reuse an existing public Payment Link with Actor A's Qash-authenticated profile:

```bash
QASH_ACTOR_A_PAYMENT_LINK_URL=https://app.qash.finance/payment/<code> yarn test:e2e:testnet:qash:actor-a-social-payment
```

This route is intentionally separate from Miden Wallet settlement. It records whether the public `Social Account` option can complete Pay from Qash/Para account state, but it does not produce a Miden wallet transaction hash.

Money movement reuses the saved Actor A/B accounts by default. If the profile cannot show the saved account ID or an exact account label from `QASH_ACTOR_A_PAYMENT_ACCOUNT_NAME` / `QASH_ACTOR_B_PAYMENT_ACCOUNT_NAME`, the run fails instead of creating a replacement account. Set `QASH_MONEY_MOVEMENT_CREATE_MISSING_ACCOUNTS=true` only when intentionally creating a new actor account; newly created account IDs are saved in run artifacts.

### Qash Contact Book

The Contact Book smoke is read-only and stops at the employee contact form. Creating a contact is stateful and must be explicitly enabled:

```bash
QASH_CREATE_CONTACT=true QASH_CONTACT_WALLET_ADDRESS=mtst1... yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/contact-book.spec.ts --grep contact-book-create-employee-contact --reporter=list
```

Optional overrides:

```bash
QASH_CONTACT_NAME="Pioneer E2E Contact" QASH_CONTACT_EMAIL="pioneer.e2e@example.com" QASH_CONTACT_GROUP="Engineering"
```

When `QASH_CONTACT_GROUP` is omitted, the create test first creates a unique Contact Book group and then selects it for the contact. Set `QASH_CREATE_CONTACT_GROUP=true` with `QASH_CONTACT_GROUP` only when the named group should be created during the run instead of reused. Reusing an existing group requires an address that is not already present in that group; Qash keeps the form open with an `address already exists in the selected group` warning for duplicates.

### Qash Payroll

Payroll coverage is read-only by default. It verifies the Payroll overview table and opens the Create Payroll page without submitting:

```bash
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/payroll.spec.ts --reporter=list
```

The Create Payroll smoke stops after asserting the form surface: employee, network, token, wallet address, contract term, monthly amount, scheduled pay date, item description, optional note, and `Create now` action.

To fill the Payroll form without submitting, provide an existing employee contact and a testnet Miden address:

```bash
QASH_FILL_PAYROLL_FORM=true \
QASH_PAYROLL_EMPLOYEE_NAME="Pioneer E2E Employee" \
QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS=mtst1... \
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/payroll.spec.ts --grep payroll-form-fill-regression --reporter=list
```

To create a unique employee contact first, add:

```bash
QASH_CREATE_PAYROLL_CONTACT=true
```

Creating a Payroll proposal is stateful and requires a funded QASH balance. It is gated separately:

```bash
QASH_CREATE_PAYROLL=true \
QASH_PAYROLL_EMPLOYEE_NAME="Pioneer E2E Employee" \
QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS=mtst1... \
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/payroll.spec.ts --grep payroll-create-transaction-regression --reporter=list
```

To also sign and execute the resulting pending transaction, use a dedicated funded test account and add:

```bash
QASH_COMPLETE_PAYROLL_TRANSACTION=true
```

Defaults are testnet-only and use randomized `1-5 QASH` amounts: `QASH_PAYROLL_DURATION_MONTHS=1` and `QASH_PAYROLL_PAY_DAY=1`. Override `QASH_PAYROLL_MONTHLY_AMOUNT`, `QASH_PAYROLL_NETWORK`, `QASH_PAYROLL_TOKEN`, `QASH_PAYROLL_ITEM_DESCRIPTION`, and `QASH_PAYROLL_NOTE` only when the live Qash UI or test data requires it.

### Qash Feature Surfaces

The feature-surface suite is read-only by default. It verifies Invoice, Bills, Payment Link, Transactions, and Settings overview surfaces without creating invoices, bills, links, payments, or transactions. The assertions are state-aware: a profile with no multisig account can still prove the overview/prerequisite state, while an account-backed profile also exposes create actions.

```bash
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/feature-surfaces.spec.ts --reporter=list
```

To require account-backed create actions for Invoice and Payment Link without submitting either form:

```bash
QASH_REQUIRE_FEATURE_CREATE_ACTIONS=true \
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/feature-surfaces.spec.ts --grep "create-action-smoke" --reporter=list
```

Bills is currently modeled as an inbound bills table in Qash, so this suite verifies its table/status surface instead of inventing a local create flow.

### Qash Invoice

Invoice coverage is read-only by default. It verifies the Invoice overview and the first create wizard surface without submitting an invoice:

```bash
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/invoice.spec.ts --reporter=list
```

To fill the Invoice wizard without submitting, provide an existing Client contact and testnet Miden address, or create a fresh Client contact first:

```bash
QASH_FILL_INVOICE_FORM=true \
QASH_CREATE_INVOICE_CLIENT=true \
QASH_INVOICE_CLIENT_WALLET_ADDRESS=mtst1... \
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/invoice.spec.ts --grep invoice-form-fill-regression --reporter=list
```

Stateful Invoice creation is explicitly gated because it mutates live testnet data:

```bash
QASH_CREATE_INVOICE=true \
QASH_CREATE_INVOICE_WIZARD_EXPERIMENTAL=true \
QASH_CREATE_INVOICE_CLIENT=true \
QASH_INVOICE_CLIENT_WALLET_ADDRESS=mtst1... \
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/invoice.spec.ts --grep invoice-create-transaction-regression --reporter=list
```

Defaults are testnet-only: `QASH_INVOICE_AMOUNT` is randomized in the `1-5 QASH` range, `QASH_INVOICE_NETWORK=Miden Testnet`, and `QASH_INVOICE_TOKEN=QASH`.

### Qash Payment Link

Payment Link coverage is read-only by default. It verifies the Payment Links overview and create-form surface without submitting a link:

```bash
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/payment-link.spec.ts --reporter=list
```

To fill the Payment Link form without submitting:

```bash
QASH_FILL_PAYMENT_LINK_FORM=true \
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/payment-link.spec.ts --grep payment-link-form-fill-regression --reporter=list
```

Stateful Payment Link creation is explicitly gated because it mutates live testnet data:

```bash
QASH_CREATE_PAYMENT_LINK=true \
QASH_CREATE_PAYMENT_LINK_EXPERIMENTAL=true \
yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/payment-link.spec.ts --grep payment-link-create-regression --reporter=list
```

Defaults are testnet-only: `QASH_PAYMENT_LINK_AMOUNT` is randomized in the `1-5 QASH` range, `QASH_PAYMENT_LINK_NETWORK=Miden Testnet`, and `QASH_PAYMENT_LINK_TOKEN=QASH`.

### Qash Faucet And Funding

The faucet modal smoke is read-only. The faucet request flow is stateful and must be explicitly enabled:

```bash
QASH_REQUEST_FAUCET_TOKENS=true yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/faucet.spec.ts --grep request-free-test-tokens --reporter=list
```

After confirming the faucet request, the runner stays on the dashboard until Qash no longer shows `Minting...` or wallet-sync progress. Some Qash builds then show a funded account balance directly; others expose a pending receive note under Transactions -> Receive. The request flow accepts either behavior, but it does not continue until the fresh account shows a non-zero balance. It intentionally ignores the faucet modal offer amount and the pending receive amount, so `100` is not treated as funding proof until the account balance updates.

To claim an already-pending faucet receive note without requesting more tokens:

```bash
QASH_CLAIM_PENDING_FAUCET_RECEIVE=true yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/faucet.spec.ts --grep claim-pending-faucet-receive --reporter=list
```

To check transaction readiness without clicking the faucet:

```bash
QASH_REQUIRE_FUNDED_BALANCE=true yarn test:e2e:testnet:qash:auth:chromium -- apps/qash/flows/faucet.spec.ts --grep funded-balance-readiness --reporter=list
```

List tests:

```bash
yarn test:e2e:list
```

Preflight:

```bash
yarn preflight
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `E2E_NETWORK` | Yes for single runs | `testnet` for the current active path, or `localhost` for local harness experiments |
| `E2E_APP` | No | `all`, `zoroswap`, or `qash` |
| `WALLET_REPO_PATH` | For wallet builds | Local Miden wallet repo |
| `WALLET_EXTENSION_PATH_TESTNET` | For testnet | Testnet-built Miden wallet extension directory |
| `WALLET_EXTENSION_PATH` | Fallback only | Generic built wallet extension directory for one-off runs |
| `WALLET_PASSWORD` | Yes | Password used to unlock/import wallet |
| `WALLET_SETUP_MODE` | No | `create`, `import`, or `profile` |
| `TEST_ACCOUNT_SEED` | One of seed/profile | Seed phrase for automated import |
| `WALLET_USER_DATA_DIR` | One of seed/profile | Prepared Chromium persistent profile |
| `QASH_PAYER_TEST_ACCOUNT_SEED` | For live Qash public Payment Link Pay | Funded payer seed imported into a fresh wallet profile each payment leg |
| `QASH_PAYER_WALLET_USER_DATA_DIR` | For live Qash public Payment Link Pay | Prepared funded payer wallet profile used instead of random 0-QASH creation |
| `QASH_ACTOR_A_PAYER_TEST_ACCOUNT_SEED` / `QASH_ACTOR_B_PAYER_TEST_ACCOUNT_SEED` | Optional role override | Role-specific funded payer seed for Actor A/B money movement |
| `QASH_PAYER_WALLET_BALANCE_TIMEOUT_MS` | No | Timeout for the pre-Pay wallet QASH balance check; defaults to `120000` |
| `QASH_ACTOR_A_SOCIAL_PAYMENT` | For Social Account diagnostic | Set to `true` to test public Payment Link payment through the Social Account option |
| `QASH_ACTOR_A_SOCIAL_PAYMENT_PAY` | No | Set to `false` to stop after selecting Social Account; defaults to `true` in the runner |
| `QASH_AUTH_USER_DATA_DIR` | For Qash auth smoke | Prepared persistent Chromium profile with Qash/Para login |
| `QASH_GOOGLE_ACCOUNT_EMAIL` | No | Already signed-in Google account to select during Qash profile preparation |
| `QASH_AUTH_ACCOUNT_EMAIL` | No | Email expected on authenticated Qash dashboard checks |
| `QASH_AUTH_CDP_ENDPOINT` | For CDP auth smoke | Chrome DevTools endpoint for an already-authenticated browser |
| `QASH_CREATE_CONTACT` | For Contact Book create flow | Set to `true` to submit a stateful employee contact creation flow |
| `QASH_CONTACT_NAME` | No | Contact name override; defaults to a unique `Pioneer E2E Contact ...` value |
| `QASH_CONTACT_EMAIL` | No | Contact email override; defaults to a unique `pioneer.e2e+...@example.com` value |
| `QASH_CONTACT_WALLET_ADDRESS` | For Contact Book create flow | Miden testnet address used for the created contact; Qash expects `mtst1...` format |
| `QASH_CONTACT_GROUP` | No | Existing Qash contact group to select; omitted runs create a unique group first |
| `QASH_CREATE_CONTACT_GROUP` | No | Set to `true` with `QASH_CONTACT_GROUP` to create the named group during the contact flow |
| `QASH_REQUEST_FAUCET_TOKENS` | For faucet request | Set to `true` to click the stateful Qash faucet request path |
| `QASH_CLAIM_PENDING_FAUCET_RECEIVE` | For existing pending faucet receive notes | Set to `true` to click the stateful Transactions -> Receive faucet `Claim` control |
| `QASH_REQUIRE_FUNDED_BALANCE` | For transaction preflight | Set to `true` to require a non-zero QASH balance without requesting tokens |
| `QASH_FAUCET_REQUEST_TIMEOUT_MS` | No | Faucet request modal settlement timeout; defaults to `180000` |
| `QASH_PENDING_FAUCET_RECEIVE_TIMEOUT_MS` | No | Continuous journey wait for the faucet receive note; defaults to `300000` |
| `QASH_FAUCET_SETTLEMENT_TIMEOUT_MS` | No | Faucet mint/sync and funding wait timeout; defaults to `300000` for request processing and `180000` for final funded-balance checks |
| `QASH_ACCOUNT_DIRECT_FUNDING_TIMEOUT_MS` | No | Short direct-funding check before opening Transactions -> Receive; defaults to `15000` |
| `QASH_PLATFORM_JOURNEY` | For direct spec runs | Set to `true` to run the continuous account -> faucet -> contact -> Payroll -> Invoice -> Payment Link journey; `yarn test:e2e:testnet:qash:platform` sets it automatically |
| `QASH_PLATFORM_CONTACT_WALLET_ADDRESS` | For platform journey | Testnet Miden `mtst1...` address used for the employee contact and Payroll recipient |
| `QASH_PLATFORM_ACCOUNT_NAME` | No | Account name override; defaults to a unique `Pioneer E2E Platform ...` value |
| `QASH_PLATFORM_CONTACT_NAME` | No | Employee contact name override; defaults to a unique platform employee value |
| `QASH_PLATFORM_CONTACT_EMAIL` | No | Employee contact email override; defaults to a unique `pioneer.platform+...@example.com` value |
| `QASH_PLATFORM_CONTACT_GROUP` | No | Existing Contact Book group to reuse; omitted runs create a unique group first |
| `QASH_PLATFORM_CREATE_CONTACT_GROUP` | No | Set to `true` with `QASH_PLATFORM_CONTACT_GROUP` to create the named group during the journey |
| `QASH_PLATFORM_PAYROLL_*` | No | Platform journey Payroll overrides; falls back to the matching `QASH_PAYROLL_*` values and randomized `1-5 QASH` defaults |
| `QASH_PLATFORM_INVOICE_CLIENT_*` | No | Platform journey Invoice Client overrides; wallet address falls back to `QASH_PLATFORM_CONTACT_WALLET_ADDRESS` when omitted |
| `QASH_PLATFORM_INVOICE_*` | No | Platform journey Invoice overrides; falls back to matching `QASH_INVOICE_*` values and randomized `1-5 QASH` amount defaults |
| `QASH_PLATFORM_PAYMENT_LINK_*` | No | Platform journey Payment Link overrides; defaults to the newly-created account and randomized `1-5 QASH` amount |
| `QASH_PLATFORM_JOURNEY_TIMEOUT_MS` | No | End-to-end journey timeout; defaults to `900000` |
| `QASH_PLATFORM_ACCOUNT_POOL_SIZE` | No | Reusable multisig-account pool size; defaults to `3`; the journey randomly reuses an existing account once the pool is full |
| `QASH_PLATFORM_MAX_ACCOUNT_COUNT` | No | Legacy alias for `QASH_PLATFORM_ACCOUNT_POOL_SIZE` when the preferred variable is unset |
| `QASH_PLATFORM_ALLOW_ACCOUNT_OVER_CAP` | No | Set to `true` only when intentionally creating accounts beyond the cap |
| `QASH_STRESS` | For direct spec runs | Set to `true` to run Qash stress; `yarn test:e2e:testnet:qash:stress` sets it automatically |
| `QASH_ACTOR_B_WALLET_ADDRESS` | For stress | Actor-b's saved testnet Miden `mtst1...` receive address; fallback for `QASH_STRESS_RECEIVER_WALLET_ADDRESS` |
| `QASH_STRESS_RECEIVER_WALLET_ADDRESS` | For stress | Actor-b's testnet Miden `mtst1...` receive address for Payroll and Invoice workload inputs |
| `QASH_STRESS_LOOPS` | Yes | User-selected number of cycles for each enabled Qash stress sub-workload |
| `QASH_STRESS_FAILURE_BUDGET` | No | Number of failed iterations allowed before the stress run fails; defaults to `0` |
| `QASH_STRESS_PAYMENT_AMOUNT` | No | Optional fixed Payroll amount; omitted runs randomize each iteration in the `1-5 QASH` range |
| `QASH_STRESS_INVOICE_AMOUNT` | No | Optional fixed Invoice amount; omitted runs randomize each iteration in the `1-5 QASH` range |
| `QASH_STRESS_PAYMENT_LINK_AMOUNT` | No | Optional fixed Payment Link amount for the opt-in Payment Link workload; omitted runs randomize each iteration in the `1-5 QASH` range |
| `QASH_STRESS_INCLUDE_MIXED_PLATFORM` | No | Include the repeated Payroll/Invoice workload plus optional Payment Link creation; defaults to `true` |
| `QASH_STRESS_INCLUDE_MONEY_MOVEMENT` | No | Include Actor A/B Payment Link settlement in Qash stress; defaults to `false` while the Qash Payment Link route is blocked |
| `QASH_STRESS_INCLUDE_PAYROLL` | No | Set to `false` only for targeted diagnostics; defaults to `true` |
| `QASH_STRESS_INCLUDE_INVOICE` | No | Set to `false` only for targeted diagnostics; defaults to `true` |
| `QASH_STRESS_INCLUDE_PAYMENT_LINK` | No | Include Payment Link creation in the mixed stress workload; defaults to `false` while the Qash Payment Link route is blocked |
| `QASH_STRESS_SKIP_FAUCET_IF_FUNDED` | No | Skip the stress setup faucet request when the selected actor-a account is already funded; defaults to `false` |
| `QASH_STRESS_EXISTING_FUNDING_TIMEOUT_MS` | No | Timeout for checking existing actor-a funding before an optional stress faucet skip |
| `QASH_STRESS_ATTEMPT_PENDING_TRANSACTIONS` | No | Set to `true` to inspect/complete visible actor-a pending transactions; defaults to `false` |
| `QASH_STRESS_COMPLETE_PENDING_TRANSACTIONS` | No | Alias for `QASH_STRESS_ATTEMPT_PENDING_TRANSACTIONS=true` |
| `QASH_STRESS_ACCOUNT_POOL_SIZE` | No | Sender account pool size for stress; defaults to `3` |
| `QASH_STRESS_TIMEOUT_MS` | No | Qash stress test timeout; defaults to `1800000` |
| `QASH_STRESS_MONEY_MOVEMENT_DIRECTION` | No | Stress alias for money movement direction; defaults to `bidirectional` |
| `QASH_STRESS_MONEY_MOVEMENT_AMOUNT` | No | Optional fixed stress money-movement Payment Link amount; omitted runs randomize each leg in the `1-5 QASH` range |
| `QASH_STRESS_MONEY_MOVEMENT_PAYMENT_TIMEOUT_MS` | No | Timeout for the public Payment Link pay mutation; defaults to `300000` |
| `QASH_STRESS_MONEY_MOVEMENT_RECEIVE_TIMEOUT_MS` | No | Timeout for receiver pending receive discovery; defaults to `300000` |
| `QASH_DURABILITY_*` | Compatibility only | Old durability variable names remain accepted as fallbacks for the matching `QASH_STRESS_*` values |
| `QASH_MONEY_MOVEMENT` | For direct diagnostic runs | Set to `true` to run only the Actor A/B money movement spec; Qash stress sets this internally for its money-movement sub-workload |
| `QASH_MONEY_MOVEMENT_LOOPS` | Yes | User-selected number of money-movement loops; `QASH_STRESS_LOOPS` and `QASH_DURABILITY_LOOPS` are accepted only as compatibility fallbacks |
| `QASH_MONEY_MOVEMENT_DIRECTION` | No | `bidirectional`, `actor-b-pays-actor-a`, or `actor-a-pays-actor-b`; defaults to `bidirectional` |
| `QASH_MONEY_MOVEMENT_AMOUNT` | No | Optional fixed Payment Link amount; omitted runs randomize each leg in the `1-5 QASH` range |
| `QASH_MONEY_MOVEMENT_CREATE_MISSING_ACCOUNTS` | No | Defaults to `false`; set to `true` only when intentionally creating a new Actor A/B Qash account if the saved one is not visible |
| `QASH_ACTOR_A_EMAIL` / `QASH_ACTOR_B_EMAIL` | For actor profile prep and money movement | Browser account emails for the two actor profiles |
| `QASH_ACTOR_A_ACCOUNT_ID` / `QASH_ACTOR_B_ACCOUNT_ID` | For money movement | Qash account IDs used as actor identity evidence |
| `QASH_ACTOR_A_WALLET_ADDRESS` / `QASH_ACTOR_B_WALLET_ADDRESS` | For actor profile prep and money movement | Miden extension wallet addresses used for wallet-connection assertions |
| `QASH_ACTOR_A_PROFILE_DIR` / `QASH_ACTOR_B_PROFILE_DIR` | No | Prepared persistent Chromium profile directories; defaults to `.auth/qash/actor-a` and `.auth/qash/actor-b` |
| `QASH_REQUIRE_FEATURE_CREATE_ACTIONS` | For account-backed feature checks | Set to `true` to require Invoice and Payment Link create actions without submitting forms |
| `QASH_FILL_INVOICE_FORM` | For Invoice form regression | Set to `true` to fill Create Invoice without submitting |
| `QASH_CREATE_INVOICE` | For Invoice creation | Set to `true` with `QASH_CREATE_INVOICE_WIZARD_EXPERIMENTAL=true` to attempt stateful Invoice creation |
| `QASH_CREATE_INVOICE_WIZARD_EXPERIMENTAL` | For Invoice creation | Extra gate because the full Invoice review/confirm path is not live-verified yet |
| `QASH_CREATE_INVOICE_CLIENT` | For Invoice client setup | Set to `true` to create a unique Client contact before filling Invoice |
| `QASH_INVOICE_CLIENT_NAME` | For Invoice without client creation | Existing Client contact name to select |
| `QASH_INVOICE_CLIENT_EMAIL` | No | Email used when creating an Invoice Client contact |
| `QASH_INVOICE_CLIENT_WALLET_ADDRESS` | For Invoice form/create | Testnet Miden `mtst1...` address used in the Invoice form |
| `QASH_INVOICE_NETWORK` | No | Invoice network option label; defaults to `Miden Testnet` |
| `QASH_INVOICE_TOKEN` | No | Invoice token option label; defaults to `QASH` |
| `QASH_INVOICE_AMOUNT` | No | Invoice amount override; defaults to randomized `1-5 QASH` |
| `QASH_INVOICE_DUE_DAY` | No | Invoice due picker label; defaults to Qash's `7 days` option |
| `QASH_INVOICE_ITEM_DESCRIPTION` | No | Invoice line item description; defaults to a unique label |
| `QASH_INVOICE_NOTE` | No | Invoice note; defaults to a unique label |
| `QASH_FILL_PAYMENT_LINK_FORM` | For Payment Link form regression | Set to `true` to fill Create Payment Link without submitting |
| `QASH_CREATE_PAYMENT_LINK` | For Payment Link creation | Set to `true` with `QASH_CREATE_PAYMENT_LINK_EXPERIMENTAL=true` to attempt stateful Payment Link creation |
| `QASH_CREATE_PAYMENT_LINK_EXPERIMENTAL` | For Payment Link creation | Extra gate because the full Payment Link creation path is not live-verified yet |
| `QASH_PAYMENT_LINK_TITLE` | No | Payment Link title override; defaults to a unique label |
| `QASH_PAYMENT_LINK_AMOUNT` | No | Payment Link amount override; defaults to randomized `1-5 QASH` |
| `QASH_PAYMENT_LINK_DESCRIPTION` | No | Payment Link description/note override; defaults to a unique label |
| `QASH_PAYMENT_LINK_ACCOUNT_NAME` | No | Receiving account card to select; defaults to the first visible account |
| `QASH_PAYMENT_LINK_NETWORK` | No | Payment Link network option label; defaults to `Miden Testnet` |
| `QASH_PAYMENT_LINK_TOKEN` | No | Payment Link token option label; defaults to `QASH` |
| `QASH_FILL_PAYROLL_FORM` | For Payroll form regression | Set to `true` to fill Create Payroll without submitting |
| `QASH_CREATE_PAYROLL` | For Payroll proposal creation | Set to `true` to click `Create now` after funded-balance and form assertions |
| `QASH_COMPLETE_PAYROLL_TRANSACTION` | For Payroll sign/execute | Set to `true` with `QASH_CREATE_PAYROLL=true` to sign and execute the visible pending transaction |
| `QASH_CREATE_PAYROLL_CONTACT` | For Payroll contact setup | Set to `true` to create a unique employee contact before filling Payroll |
| `QASH_CREATE_PAYROLL_CONTACT_GROUP` | No | Set to `true` to create the named Payroll contact group during setup |
| `QASH_PAYROLL_EMPLOYEE_NAME` | For Payroll without contact creation | Existing employee contact name to select |
| `QASH_PAYROLL_EMPLOYEE_EMAIL` | No | Email used when creating a Payroll employee contact |
| `QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS` | For Payroll form/create | Testnet Miden `mtst1...` address for the employee |
| `QASH_PAYROLL_CONTACT_GROUP` | No | Existing or created Contact Book group for Payroll employee setup |
| `QASH_PAYROLL_NETWORK` | No | Payroll network option label; defaults to `Miden Testnet` |
| `QASH_PAYROLL_TOKEN` | No | Payroll token option label; defaults to `QASH` |
| `QASH_PAYROLL_DURATION_MONTHS` | No | Payroll duration; defaults to `1` |
| `QASH_PAYROLL_MONTHLY_AMOUNT` | No | Monthly amount override; defaults to randomized `1-5 QASH` |
| `QASH_PAYROLL_PAY_DAY` | No | Scheduled pay day button; defaults to `1` |
| `QASH_PAYROLL_ITEM_DESCRIPTION` | No | Payroll item description; defaults to a unique label |
| `QASH_PAYROLL_NOTE` | No | Payroll note; defaults to a unique label |
| `APP_AUTH_USER_DATA_DIR` | No | Generic prepared app auth profile fallback |
| `APP_AUTH_CDP_ENDPOINT` | No | Generic app auth CDP endpoint fallback |
| `QASH_WINDOWS_CHROME_EXE` | For Windows profile runner overrides | WSL path to `chrome.exe` |
| `QASH_WINDOWS_CHROME_USER_DATA_DIR` | For Windows profile runner overrides | Windows Chrome user-data root |
| `QASH_WINDOWS_CHROME_PROFILE_DIRECTORY` | For Windows profile runner overrides | Chrome profile directory; defaults to `Default` |
| `QASH_WINDOWS_CHROME_DEBUG_PORT` | No | Fixed CDP debug port; defaults to an available local port |
| `QASH_WINDOWS_CHROME_DEBUG_ADDRESS` | No | Chrome remote-debugging bind address; defaults to the detected Windows WSL interface |
| `QASH_WINDOWS_CHROME_CONNECT_HOST` | No | Hostname/IP Playwright should use from WSL for the Windows Chrome CDP endpoint |
| `QASH_WINDOWS_CDP_PROXY_PORT` | No | Fixed Windows TCP proxy port; defaults to an available Windows port |
| `QASH_WINDOWS_TEMP_DIR` | No | Windows temp directory used to stage the TCP proxy helper |
| `ZOROSWAP_URL_TESTNET` | No | ZoroSwap testnet deployment URL; defaults to the public app |
| `QASH_URL_TESTNET` | No | Qash Finance testnet deployment URL; defaults to `https://app.qash.finance/` |
| `ZOROSWAP_URL` | No | Generic single-network override |
| `QASH_URL` | No | Generic single-network override |
| `ZOROSWAP_CONNECT_SELECTOR` | No | Override connect button selector |
| `QASH_LOGIN_SELECTOR` | No | Override account creation button selector |
| `E2E_KEEP_BROWSER_ON_FAILURE` | No | Keep browser profile open for debugging |

## Artifacts

Each test writes artifacts under:

```text
test-results/run-<timestamp>/<network>/<app>/<scenario>/
```

Important files:

- `report.json`: primary failure report
- `repro.md`: generated repro command and triage order
- `timeline.ndjson`: chronological event stream
- `checkpoints.json`: step status, screenshots, snapshots
- `screenshots/`: full-page screenshots
- `snapshots/`: app and wallet state snapshots
- `test-results/html/`: Playwright HTML report

## Diagnostics

Failure categories:

- `app_ui_issue`
- `wallet_connection_issue`
- `wallet_transaction_issue`
- `network_rpc_node_issue`
- `timeout_latency_issue`
- `test_setup_issue`
- `unknown_needs_manual_investigation`

Triage order:

1. Open `report.json`.
2. Read `diagnosticHints`.
3. Inspect the failed checkpoint screenshot.
4. Check `timeline.ndjson` around the failed step.
5. Open the Playwright trace.
6. Use `repro.md` to reproduce locally.

## Adding A New Pioneer App

Use [docs/app-onboarding-template.md](docs/app-onboarding-template.md) and the starter files in `templates/pioneer-app/`.

1. Add `apps/<app>/selectors.ts`.
2. Add `apps/<app>/adapter.ts`.
3. Add one read-only smoke spec in `apps/<app>/flows/`.
4. Register the app in `config/apps.ts`.
5. Add app URL and selector overrides to `.env.example`.
6. Add the app to the CI matrix.

Keep app logic in the adapter. Keep wallet, diagnostics, and reporting in shared harness modules.
