#!/usr/bin/env node
import './load-env.mjs';
import { spawnSync } from 'node:child_process';

const validNetworks = new Set(['devnet', 'testnet', 'localhost']);
const cliArgs = process.argv.slice(2);
const firstArg = cliArgs[0];
const network = firstArg && validNetworks.has(firstArg) ? cliArgs.shift() : 'testnet';

if (firstArg && !validNetworks.has(firstArg) && !firstArg.startsWith('-')) {
  console.error('Usage: node scripts/run-qash-platform-journey.mjs [devnet|testnet|localhost] [playwright args...]');
  process.exit(2);
}

const contactWalletAddress = firstEnvValue(
  'QASH_PLATFORM_CONTACT_WALLET_ADDRESS',
  'QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS',
  'QASH_CONTACT_WALLET_ADDRESS'
);

if (!contactWalletAddress || !/^mtst1/i.test(contactWalletAddress)) {
  console.error(
    [
      'Qash continuous platform journey requires a testnet Miden employee wallet address.',
      'Set QASH_PLATFORM_CONTACT_WALLET_ADDRESS=mtst1... in your shell or .env.',
      'Fallbacks are QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS and QASH_CONTACT_WALLET_ADDRESS.'
    ].join(' ')
  );
  process.exit(1);
}

console.log(`Running Qash continuous platform journey on ${network}.`);
console.log('Chromium is launched once by the authenticated Qash runner and closed after Payment Link completes or fails.');
console.log('Artifacts will be written under test-results/run-<timestamp>/<network>/qash/.');

const result = spawnSync(
  process.execPath,
  [
    'scripts/run-qash-chromium-authenticated.mjs',
    network,
    'apps/qash/flows/platform-journey.spec.ts',
    '--grep',
    'qash-platform-account-to-payroll-invoice-payment-link-journey',
    '--reporter=list',
    ...cliArgs
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_APP: 'qash',
      QASH_PLATFORM_JOURNEY: 'true'
    }
  }
);

process.exit(result.status ?? 1);

function firstEnvValue(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}
