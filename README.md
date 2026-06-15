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

- Node.js 22+
- Yarn 1.x
- Playwright Chromium
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

## Qash Authenticated Runs

Qash authenticated tests use a local Chromium profile. The harness does not automate Google credentials.

```bash
yarn qash:profile
yarn test:e2e:testnet:qash:auth:chromium -- --reporter=list
```

After running `yarn qash:profile`, finish Qash/Para login in the opened browser, wait for a post-login Qash page, then close the browser.

## Qash Platform Journey

```bash
yarn test:e2e:testnet:qash:platform
```

This is the one-pass account-to-product journey: account setup, faucet settlement, Contact Book, Payroll, Invoice, and Payment Link creation.

Known status: Qash testnet can currently retain a stale faucet receive proposal after the PSM/Miden side has no executable proposal. The platform journey fails safely after the pending gate and three bounded Execute attempts. Treat that as an upstream Qash/testnet blocker, not a green harness pass.

## Qash Stress

```bash
yarn qash:actor-profile actor-a
yarn test:e2e:testnet:qash:stress
```

Set the stress loop count and receiver testnet wallet address in `.env` before running stress. The public/default stress path runs repeated Payroll and Invoice mutations. Payment Link creation and Actor A/B Payment Link money movement are disabled by default until the Qash Payment Link route is healthy again.

Use `-- --list` to verify stress discovery without a prepared auth profile:

```bash
yarn test:e2e:testnet:qash:stress -- --list
```

## ZoroSwap Wallet Smoke

Clone the Miden wallet repo next to this repo, then build the testnet extension:

```bash
git clone https://github.com/0xMiden/wallet.git ../wallet
yarn wallet:build:testnet
yarn test:e2e:testnet:zoroswap -- --reporter=list
```

## Artifacts

Runs write diagnostics under `test-results/`, including:

- `report.json`
- `repro.md`
- `timeline.ndjson`
- screenshots, snapshots, and Playwright traces

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
