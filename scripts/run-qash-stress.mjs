#!/usr/bin/env node
import './load-env.mjs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [network = 'testnet', ...cliArgs] = process.argv.slice(2);
const isListOnly = cliArgs.includes('--list');

if (network !== 'testnet') {
  console.error('Usage: node scripts/run-qash-stress.mjs testnet [playwright args...]');
  console.error('Qash stress is intentionally testnet-only.');
  process.exit(2);
}

const receiverWalletAddress = firstEnvValue(
  'QASH_STRESS_RECEIVER_WALLET_ADDRESS',
  'QASH_DURABILITY_RECEIVER_WALLET_ADDRESS',
  'QASH_ACTOR_B_WALLET_ADDRESS',
  'QASH_PLATFORM_CONTACT_WALLET_ADDRESS'
);
const workloadLoops = firstEnvValue(
  'QASH_STRESS_LOOPS',
  'QASH_DURABILITY_LOOPS',
  'QASH_DURABILITY_PAYMENT_LOOPS'
);
const includeMixedPlatform = envFlag('QASH_STRESS_INCLUDE_MIXED_PLATFORM', true);
const includeMoneyMovement = envFlag('QASH_STRESS_INCLUDE_MONEY_MOVEMENT', false);
const includePaymentLink = envFlagFrom(
  ['QASH_STRESS_INCLUDE_PAYMENT_LINK', 'QASH_DURABILITY_INCLUDE_PAYMENT_LINK'],
  false
);

if (!receiverWalletAddress || !/^mtst1/i.test(receiverWalletAddress)) {
  console.error(
    [
      'Qash stress requires actor-b\'s testnet Miden receive address.',
      'Set QASH_STRESS_RECEIVER_WALLET_ADDRESS=mtst1... or QASH_ACTOR_B_WALLET_ADDRESS=mtst1....',
      'QASH_DURABILITY_RECEIVER_WALLET_ADDRESS remains accepted as a compatibility alias.'
    ].join(' ')
  );
  process.exit(1);
}

if (!workloadLoops || !/^[1-9]\d*$/.test(workloadLoops)) {
  console.error(
    [
      'Qash stress requires the user-selected loop count.',
      'Set QASH_STRESS_LOOPS to a positive integer.',
      'QASH_DURABILITY_LOOPS and QASH_DURABILITY_PAYMENT_LOOPS are still accepted as compatibility aliases.'
    ].join(' ')
  );
  process.exit(1);
}

if (!includeMixedPlatform && !includeMoneyMovement) {
  console.error(
    [
      'Qash stress has no enabled workload surfaces.',
      'Leave QASH_STRESS_INCLUDE_MIXED_PLATFORM=true for the current public stress path,',
      'or set QASH_STRESS_INCLUDE_MONEY_MOVEMENT=true only when the Payment Link platform route is healthy.'
    ].join(' ')
  );
  process.exit(1);
}

const configuredActorAProfileDir = process.env.QASH_AUTH_USER_DATA_DIR || process.env.APP_AUTH_USER_DATA_DIR;
const actorAProfileDir = configuredActorAProfileDir ||
  (isListOnly ? undefined : path.resolve(process.cwd(), '.auth/qash/actor-a'));

const commonEnv = {
  ...process.env,
  E2E_APP: 'qash',
  QASH_STRESS_RECEIVER_WALLET_ADDRESS: receiverWalletAddress,
  QASH_DURABILITY_RECEIVER_WALLET_ADDRESS: receiverWalletAddress,
  QASH_ACTOR_B_WALLET_ADDRESS: firstEnvValue('QASH_ACTOR_B_WALLET_ADDRESS') || receiverWalletAddress,
  QASH_STRESS_LOOPS: workloadLoops,
  QASH_DURABILITY_LOOPS: workloadLoops,
  QASH_STRESS_INCLUDE_PAYMENT_LINK: includePaymentLink ? 'true' : 'false',
  QASH_DURABILITY_INCLUDE_PAYMENT_LINK: includePaymentLink ? 'true' : 'false',
  QASH_STRESS_INCLUDE_MONEY_MOVEMENT: includeMoneyMovement ? 'true' : 'false',
  QASH_AUTH_VIEWPORT_WIDTH: process.env.QASH_AUTH_VIEWPORT_WIDTH || '1600',
  QASH_AUTH_VIEWPORT_HEIGHT: process.env.QASH_AUTH_VIEWPORT_HEIGHT || '1100',
  QASH_STRESS: 'true',
  QASH_DURABILITY_STRESS: 'true'
};
if (actorAProfileDir) {
  commonEnv.QASH_AUTH_USER_DATA_DIR = actorAProfileDir;
}
if (isListOnly && !process.env.QASH_AUTH_PREFLIGHT) {
  commonEnv.QASH_AUTH_PREFLIGHT = 'false';
}

console.log('Running Qash stress on testnet.');
console.log(`Actor A profile: ${actorAProfileDir || 'not required for --list'}`);
console.log(`Receiver wallet address: ${receiverWalletAddress}`);
console.log(`Stress loop count: ${workloadLoops}`);
console.log(`Mixed platform workload: ${includeMixedPlatform ? 'enabled' : 'disabled'}`);
console.log(`Mixed platform Payment Link creation: ${includePaymentLink ? 'enabled' : 'disabled'}`);
console.log(`Actor A/B money movement workload: ${includeMoneyMovement ? 'enabled' : 'disabled'}`);
if (!includePaymentLink || !includeMoneyMovement) {
  console.log('Payment Link surfaces are disabled by default until the upstream Qash Payment Link route is healthy.');
}
console.log('Artifacts will be written under test-results/run-<timestamp>/testnet/qash/.');

let result;

if (includeMixedPlatform) {
  const mixedPlatformRunner = isListOnly
    ? 'scripts/run-network.mjs'
    : 'scripts/run-qash-chromium-authenticated.mjs';
  result = runSubWorkload('mixed platform stress', [
    mixedPlatformRunner,
    'testnet',
    'apps/qash/flows/durability-stress.spec.ts',
    '--grep',
    'qash-mixed-platform-stress',
    '--reporter=list',
    ...cliArgs
  ], commonEnv);

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (includeMoneyMovement) {
  result = runSubWorkload('Actor A/B money movement stress', [
    'scripts/run-qash-money-movement.mjs',
    'testnet',
    ...cliArgs
  ], {
    ...commonEnv,
    QASH_MONEY_MOVEMENT_LOOPS: workloadLoops,
    QASH_MONEY_MOVEMENT: 'true'
  });
}

process.exit(result.status ?? 1);

function runSubWorkload(label, args, env) {
  console.log(`\n=== Qash stress sub-workload: ${label} ===`);
  return spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env
  });
}

function firstEnvValue(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function envFlag(name, fallback) {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  if (/^(?:1|true|yes|on)$/i.test(value)) return true;
  if (/^(?:0|false|no|off)$/i.test(value)) return false;
  return fallback;
}

function envFlagFrom(names, fallback) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (!value) continue;
    if (/^(?:1|true|yes|on)$/i.test(value)) return true;
    if (/^(?:0|false|no|off)$/i.test(value)) return false;
  }
  return fallback;
}
