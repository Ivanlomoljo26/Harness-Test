#!/usr/bin/env node
import './load-env.mjs';
import { spawnSync } from 'node:child_process';
import { appChoicesLabel, isAppName } from './app-registry.mjs';

const [app, network, ...rest] = process.argv.slice(2);

if (!app || !isAppName(app)) {
  console.error(`Usage: node scripts/run-app-network.mjs <${appChoicesLabel()}> <devnet|testnet|localhost> [playwright args...]`);
  process.exit(2);
}

if (!network || !['devnet', 'testnet', 'localhost'].includes(network)) {
  console.error(`Usage: node scripts/run-app-network.mjs <${appChoicesLabel()}> <devnet|testnet|localhost> [playwright args...]`);
  process.exit(2);
}

const defaultPath = `apps/${app}/flows`;
const args = [defaultPath, ...rest];
const result = spawnSync(process.execPath, ['scripts/run-network.mjs', network, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    E2E_APP: app
  }
});

process.exit(result.status ?? 1);
