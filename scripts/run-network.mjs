#!/usr/bin/env node
import './load-env.mjs';
import { spawnSync } from 'node:child_process';

const [network, ...rest] = process.argv.slice(2);

if (!network || !['devnet', 'testnet', 'localhost'].includes(network)) {
  console.error('Usage: node scripts/run-network.mjs <devnet|testnet|localhost> [playwright args...]');
  process.exit(2);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const isListOnly = rest.includes('--list');
const preflightEnv = {
  ...process.env,
  E2E_NETWORK: network
};

if (isListOnly) {
  preflightEnv.E2E_PREFLIGHT_LIST_ONLY = 'true';
}

const preflight = spawnSync(process.execPath, ['scripts/preflight.mjs'], {
  stdio: 'inherit',
  env: preflightEnv
});

if ((preflight.status ?? 1) !== 0) {
  process.exit(preflight.status ?? 1);
}

const result = spawnSync(npx, ['playwright', 'test', ...rest], {
  stdio: 'inherit',
  env: {
    ...process.env,
    E2E_NETWORK: network
  }
});

process.exit(result.status ?? 1);
