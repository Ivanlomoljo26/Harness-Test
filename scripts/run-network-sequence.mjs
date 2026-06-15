#!/usr/bin/env node
import './load-env.mjs';
import { spawnSync } from 'node:child_process';

const networks = process.argv.slice(2);
const firstPlaywrightArgIndex = networks.findIndex(network => !['devnet', 'testnet', 'localhost'].includes(network));
const explicitNetworks = firstPlaywrightArgIndex === -1 ? networks : networks.slice(0, firstPlaywrightArgIndex);
const playwrightArgs = firstPlaywrightArgIndex === -1 ? [] : networks.slice(firstPlaywrightArgIndex);
const order = explicitNetworks.length > 0 ? explicitNetworks : ['testnet'];

for (const network of order) {
  if (!['devnet', 'testnet', 'localhost'].includes(network)) {
    console.error(`Invalid network: ${network}`);
    process.exit(2);
  }
}

let finalStatus = 0;

for (const network of order) {
  console.log(`\n=== Pioneer E2E: ${network} ===\n`);
  const result = spawnSync(process.execPath, ['scripts/run-network.mjs', network, ...playwrightArgs], {
    stdio: 'inherit',
    env: process.env
  });
  if ((result.status ?? 1) !== 0) {
    finalStatus = result.status ?? 1;
  }
}

process.exit(finalStatus);
