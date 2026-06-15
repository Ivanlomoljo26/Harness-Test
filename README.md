# Miden Pioneer App E2E Framework

[![Pioneer E2E](https://github.com/Ivanlomoljo26/Harness-Test/actions/workflows/pioneer-e2e.yml/badge.svg)](https://github.com/Ivanlomoljo26/Harness-Test/actions/workflows/pioneer-e2e.yml)

Playwright automation for Pioneer ecosystem apps, currently focused on Qash Finance and ZoroSwap on testnet.

The harness keeps app logic in `apps/`, shared diagnostics in `harness/`, and Miden wallet helpers in `wallet/`. Detailed setup and configuration live in [docs/github-repository-guide.md](docs/github-repository-guide.md).

## Apps

| App | Coverage |
|---|---|
| Qash Finance | Public onboarding, authenticated navigation, account setup, Contact Book, Payroll, Invoice, Payment Link forms, platform journey, and stress runner |
| ZoroSwap | Wallet connection smoke through the Miden wallet extension |

## Requirements

- Node.js 22 LTS, matching CI
- Yarn 1.x
- Playwright `1.60.0` Chromium
- Miden wallet repo only for wallet-backed ZoroSwap or Qash payer-wallet diagnostics

## Setup

```bash
git clone https://github.com/Ivanlomoljo26/Harness-Test.git
cd Harness-Test
yarn install --frozen-lockfile
npx playwright install --with-deps chromium
cp .env.example .env
```

The default `.env.example` is Qash-first, so a new clone can run public Qash checks before configuring wallet-backed tests.

## Quick Checks

```bash
yarn ts
yarn preflight
npx playwright test --list
```

Public Qash smoke:

```bash
npx playwright test apps/qash/flows/account-onboarding.spec.ts --reporter=list
```

## Run Selection

```bash
# Current app aliases
yarn test:e2e:testnet:qash -- --list
yarn test:e2e:testnet:zoroswap -- --list

# Generic registered-app runner
node scripts/run-app-network.mjs qash testnet --list

# Specific flows
yarn qash-platform-e2e -- --list
yarn qash-stress -- --list
npx playwright test apps/qash/flows/platform-journey.spec.ts --list
```

Registered apps are controlled in `config/apps.json`; set an app's `enabled` flag to `false` to exclude it from `all` runs without removing its module.

## Qash Authenticated Runs

Qash authenticated tests use a local Chromium profile. The harness does not automate Google credentials.

```bash
yarn qash:profile
yarn test:e2e:testnet:qash:auth:chromium -- --reporter=list
```

After running `yarn qash:profile`, finish Qash/Para login in the opened browser, wait for a post-login Qash page, then close the browser.

## Qash Platform Journey

This is an authenticated, mutating testnet flow. A clean clone can list it immediately, but a real run needs a saved Qash/Para profile and a testnet Miden recipient address.

```bash
QASH_AUTH_USER_DATA_DIR=.auth/qash yarn qash:profile
```

Set this in `.env`:

```bash
QASH_AUTH_USER_DATA_DIR=.auth/qash
QASH_PLATFORM_CONTACT_WALLET_ADDRESS=mtst1...
```

Run:

```bash
HEADLESS=false yarn qash-platform-e2e
```

Discovery without auth/profile setup:

```bash
yarn qash-platform-e2e -- --list
```

This is the one-pass account-to-product journey: account setup, faucet settlement, Contact Book, Payroll, Invoice, and Payment Link creation.

Known status: Qash testnet can currently retain a stale faucet receive proposal after the PSM/Miden side has no executable proposal. The platform journey fails safely after the pending gate and three bounded Execute attempts. Treat that as an upstream Qash/testnet blocker, not a green harness pass.

## Qash Stress

This is separate from `qash-platform-e2e`. The public/default stress path runs repeated Payroll and Invoice mutations. Payment Link creation and Actor A/B Payment Link money movement are disabled by default until the Qash Payment Link route is healthy again.

Prepare the actor-a Qash profile:

```bash
QASH_AUTH_USER_DATA_DIR=.auth/qash/actor-a yarn qash:profile
```

Set this in `.env`:

```bash
QASH_AUTH_USER_DATA_DIR=.auth/qash/actor-a
QASH_STRESS_LOOPS=1
QASH_STRESS_RECEIVER_WALLET_ADDRESS=mtst1...
QASH_STRESS_INCLUDE_PAYMENT_LINK=false
QASH_STRESS_INCLUDE_MONEY_MOVEMENT=false
```

Run:

```bash
HEADLESS=false yarn qash-stress
```

Discovery without auth/profile setup:

```bash
yarn qash-stress -- --list
```

## Qash Flow Readiness

```bash
yarn qash-platform-e2e
yarn qash-stress
```

Both commands are expected to fail fast from a copied `.env.example` until the required profile and `mtst1...` values above are configured. Normal run artifacts are written only after the Playwright spec starts.

## ZoroSwap Wallet Smoke

Clone the Miden wallet repo next to this repo, then build the testnet extension:

```bash
git clone https://github.com/0xMiden/wallet.git ../wallet
yarn wallet:build:testnet
yarn test:e2e:testnet:zoroswap -- --reporter=list
```

## Artifacts

Runs write diagnostics under `test-results/`, including:

- `checkpoints.json`
- `run-context.json`
- `timeline.ndjson`
- screenshots, snapshots, and Playwright traces
- failure-only `report.json` and `repro.md`

## CI

The GitHub workflow runs repository health checks on `main` and pull requests:

```bash
yarn install --frozen-lockfile
yarn ts
npx playwright test --list
yarn preflight
```

Manual testnet E2E runs are available through GitHub Actions when the required local/test account inputs are configured.

## More Docs

- [GitHub repository guide](docs/github-repository-guide.md)
- [App onboarding template](docs/app-onboarding-template.md)
- [.env.example](.env.example)
