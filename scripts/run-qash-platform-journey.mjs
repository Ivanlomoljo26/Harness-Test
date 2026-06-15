#!/usr/bin/env node
import './load-env.mjs';
import { spawnSync } from 'node:child_process';

const validNetworks = new Set(['devnet', 'testnet', 'localhost']);
const cliArgs = process.argv.slice(2);
const firstArg = cliArgs[0];
const network = firstArg && validNetworks.has(firstArg) ? cliArgs.shift() : 'testnet';
const isListOnly = cliArgs.includes('--list');

if (firstArg && !validNetworks.has(firstArg) && !firstArg.startsWith('-')) {
  console.error('Usage: node scripts/run-qash-platform-journey.mjs [devnet|testnet|localhost] [playwright args...]');
  process.exit(2);
}

const contactWalletAddress = firstEnvValue(
  'QASH_PLATFORM_CONTACT_WALLET_ADDRESS',
  'QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS',
  'QASH_CONTACT_WALLET_ADDRESS'
);
const resolvedContactWalletAddress = contactWalletAddress ||
  (isListOnly ? 'mtst1example000000000000000000000000000000_qr7qqq9wr6w' : undefined);

if (!resolvedContactWalletAddress || !/^mtst1/i.test(resolvedContactWalletAddress)) {
  console.error(
    [
      'Qash continuous platform journey requires a testnet Miden employee wallet address.',
      'Set QASH_PLATFORM_CONTACT_WALLET_ADDRESS=mtst1... in your shell or .env.',
      'Fallbacks are QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS and QASH_CONTACT_WALLET_ADDRESS.'
    ].join(' ')
  );
  process.exit(1);
}

console.log(`${isListOnly ? 'Listing' : 'Running'} Qash continuous platform journey on ${network}.`);
if (isListOnly) {
  console.log('Auth profile and contact wallet prerequisites are not required for --list discovery.');
} else {
  console.log('Chromium is launched once by the authenticated Qash runner and closed after Payment Link completes or fails.');
}
console.log('Artifacts will be written under test-results/run-<timestamp>/<network>/qash/.');

const runnerScript = isListOnly
  ? 'scripts/run-network.mjs'
  : 'scripts/run-qash-chromium-authenticated.mjs';
const runnerEnv = {
  ...process.env,
  E2E_APP: 'qash',
  QASH_PLATFORM_JOURNEY: 'true',
  QASH_PLATFORM_CONTACT_WALLET_ADDRESS: resolvedContactWalletAddress
};

if (isListOnly && !process.env.QASH_AUTH_PREFLIGHT) {
  runnerEnv.QASH_AUTH_PREFLIGHT = 'false';
}

const result = spawnSync(
  process.execPath,
  [
    runnerScript,
    network,
    'apps/qash/flows/platform-journey.spec.ts',
    '--grep',
    'qash-platform-account-to-payroll-invoice-payment-link-journey',
    '--reporter=list',
    ...cliArgs
  ],
  {
    stdio: 'inherit',
    env: runnerEnv
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
