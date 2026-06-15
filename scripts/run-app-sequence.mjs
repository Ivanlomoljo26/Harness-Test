#!/usr/bin/env node
import './load-env.mjs';
import { spawnSync } from 'node:child_process';
import { appChoicesLabel, isAppName } from './app-registry.mjs';

const [app, ...args] = process.argv.slice(2);

if (!app || (app !== 'all' && !isAppName(app))) {
  console.error(`Usage: node scripts/run-app-sequence.mjs <${appChoicesLabel({ includeAll: true })}> [testnet|localhost|devnet ...]`);
  process.exit(2);
}

const firstPlaywrightArgIndex = args.findIndex(arg => !['devnet', 'testnet', 'localhost'].includes(arg));
const explicitNetworks = firstPlaywrightArgIndex === -1 ? args : args.slice(0, firstPlaywrightArgIndex);
const playwrightArgs = firstPlaywrightArgIndex === -1 ? [] : args.slice(firstPlaywrightArgIndex);
const order = explicitNetworks.length > 0 ? explicitNetworks : ['testnet'];

let finalStatus = 0;

for (const network of order) {
  console.log(`\n=== Pioneer E2E: app=${app} network=${network} ===\n`);
  const result = spawnSync(process.execPath, ['scripts/run-network.mjs', network, ...playwrightArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_APP: app
    }
  });
  if ((result.status ?? 1) !== 0) {
    finalStatus = result.status ?? 1;
  }
}

process.exit(finalStatus);
