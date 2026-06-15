#!/usr/bin/env node
import './load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [network = 'testnet', ...cliArgs] = process.argv.slice(2);
const configuredPaymentUrl = firstEnvValue(
  'QASH_ACTOR_A_PAYMENT_LINK_URL',
  'QASH_PAYMENT_LINK_URL',
  'QASH_REUSE_PAYMENT_LINK_URL'
);
const useWalletContext = process.env.QASH_ACTOR_A_SOCIAL_PAYMENT_WALLET_CONTEXT === 'true';

if (network !== 'testnet') {
  console.error('Usage: node scripts/run-qash-actor-a-social-payment.mjs testnet [playwright args...]');
  console.error('Qash Actor A Social Account payment diagnostics are intentionally testnet-only.');
  process.exit(2);
}

if (!configuredPaymentUrl) {
  console.error('QASH_ACTOR_A_PAYMENT_LINK_URL is required for the Social Account payment diagnostic.');
  process.exit(1);
}

const actorA = {
  role: 'Actor A',
  email: firstEnvValue('QASH_ACTOR_A_EMAIL', 'QASH_AUTH_ACCOUNT_EMAIL'),
  accountId: process.env.QASH_ACTOR_A_ACCOUNT_ID?.trim(),
  walletAddress: process.env.QASH_ACTOR_A_WALLET_ADDRESS?.trim(),
  profileDir: resolvePath(
    firstEnvValue('QASH_ACTOR_A_PROFILE_DIR', 'QASH_ACTOR_A_AUTH_USER_DATA_DIR', 'QASH_AUTH_USER_DATA_DIR') ||
      '.auth/qash/actor-a'
  )
};

if (!useWalletContext && (!actorA.email || !actorA.accountId || !actorA.walletAddress)) {
  console.error(
    'Actor A Social Account diagnostics require QASH_ACTOR_A_EMAIL, QASH_ACTOR_A_ACCOUNT_ID, and QASH_ACTOR_A_WALLET_ADDRESS for the authenticated profile context.'
  );
  process.exit(1);
}

if (!useWalletContext && !fs.existsSync(actorA.profileDir)) {
  console.error(
    [
      `${actorA.role} profile is missing: ${actorA.profileDir}`,
      'Prepare it with yarn qash:actor-profile actor-a, complete Qash/Para login, then rerun.'
    ].join(' ')
  );
  process.exit(1);
}

console.log('Running Qash Actor A Social Account payment diagnostic on testnet.');
console.log(`Actor A: ${actorA.email} | ${actorA.accountId} | ${actorA.walletAddress}`);
if (useWalletContext) {
  console.log('Context: extension-loaded fresh wallet browser');
} else {
  console.log(`Actor A profile: ${actorA.profileDir}`);
}
console.log(`Reusing payment link: ${configuredPaymentUrl}`);
console.log('Artifacts will be written under test-results/run-<timestamp>/testnet/qash/.');

const env = {
  ...process.env,
  E2E_APP: 'qash',
  HEADLESS: process.env.HEADLESS || 'false',
  WALLET_PASSWORD: process.env.WALLET_PASSWORD || '',
  WALLET_SETUP_MODE: process.env.WALLET_SETUP_MODE || 'create',
  QASH_ACTOR_A_SOCIAL_PAYMENT: 'true',
  ...(useWalletContext ? {} : { QASH_AUTH_USER_DATA_DIR: actorA.profileDir }),
  QASH_AUTH_VIEWPORT_WIDTH: process.env.QASH_AUTH_VIEWPORT_WIDTH || '1600',
  QASH_AUTH_VIEWPORT_HEIGHT: process.env.QASH_AUTH_VIEWPORT_HEIGHT || '1100',
  QASH_ACTOR_A_EMAIL: actorA.email,
  QASH_ACTOR_A_ACCOUNT_ID: actorA.accountId,
  QASH_ACTOR_A_WALLET_ADDRESS: actorA.walletAddress,
  QASH_ACTOR_A_PROFILE_DIR: actorA.profileDir
};

const result = spawnSync(
  process.execPath,
  [
    'scripts/run-network.mjs',
    'testnet',
    'apps/qash/flows/actor-a-social-payment.spec.ts',
    '--grep',
    useWalletContext
      ? 'qash-public-payment-link-social-account-wallet-context'
      : 'qash-actor-a-public-payment-link-social-account-payment',
    '--reporter=list',
    ...cliArgs
  ],
  {
    stdio: 'inherit',
    env
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

function resolvePath(value) {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}
