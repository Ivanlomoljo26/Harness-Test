#!/usr/bin/env node
import './load-env.mjs';
import { spawnSync } from 'node:child_process';

const [network = 'testnet', ...rest] = process.argv.slice(2);

if (!['devnet', 'testnet', 'localhost'].includes(network)) {
  console.error('Usage: node scripts/run-qash-authenticated.mjs [devnet|testnet|localhost] [playwright args...]');
  process.exit(2);
}

const defaultSpecs = [
  'apps/qash/flows/authenticated-profile.spec.ts',
  'apps/qash/flows/authenticated-navigation.spec.ts',
  'apps/qash/flows/contact-book.spec.ts'
];
const hasExplicitSpec = rest.some(arg => /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(arg));
const playwrightArgs = hasExplicitSpec ? rest : [...defaultSpecs, ...rest];

const result = spawnSync(
  process.execPath,
  [
    'scripts/run-network.mjs',
    network,
    ...playwrightArgs
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_APP: 'qash',
      E2E_REQUIRE_APP_AUTH_PROFILE: 'true'
    }
  }
);

process.exit(result.status ?? 1);
