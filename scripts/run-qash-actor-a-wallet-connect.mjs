#!/usr/bin/env node
import './load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  launchWindowsChromeWithCdp,
  resolveActorBrowserMode,
  resolveWindowsActorProfileDir,
  WINDOWS_CHROME_CDP_MODE,
  PLAYWRIGHT_CHROMIUM_MODE
} from './windows-chrome-cdp.mjs';

const [network = 'testnet', ...cliArgs] = process.argv.slice(2);
const isListOnly = cliArgs.includes('--list');
const configuredPaymentUrl = firstEnvValue(
  'QASH_ACTOR_A_PAYMENT_LINK_URL',
  'QASH_PAYMENT_LINK_URL',
  'QASH_REUSE_PAYMENT_LINK_URL'
);

if (network !== 'testnet') {
  console.error('Usage: node scripts/run-qash-actor-a-wallet-connect.mjs testnet [playwright args...]');
  console.error('Qash Actor A wallet-connect diagnostics are intentionally testnet-only.');
  process.exit(2);
}

const browserMode = isListOnly ? PLAYWRIGHT_CHROMIUM_MODE : resolveActorBrowserMode();
const needsActorABrowser = !isListOnly && !configuredPaymentUrl;
const actorA = {
  role: 'Actor A',
  email: firstEnvValue('QASH_ACTOR_A_EMAIL', 'QASH_AUTH_ACCOUNT_EMAIL'),
  accountId: process.env.QASH_ACTOR_A_ACCOUNT_ID?.trim(),
  walletAddress: process.env.QASH_ACTOR_A_WALLET_ADDRESS?.trim(),
  profileDir: resolveActorProfileDir('actor-a', [
    'QASH_ACTOR_A_PROFILE_DIR',
    'QASH_ACTOR_A_AUTH_USER_DATA_DIR',
    'QASH_AUTH_USER_DATA_DIR'
  ], '.auth/qash/actor-a')
};

if (!configuredPaymentUrl && (!actorA.email || !actorA.accountId || !actorA.walletAddress)) {
  console.error(
    'Actor A wallet-connect diagnostics require QASH_ACTOR_A_EMAIL, QASH_ACTOR_A_ACCOUNT_ID, and QASH_ACTOR_A_WALLET_ADDRESS unless QASH_ACTOR_A_PAYMENT_LINK_URL is set.'
  );
  process.exit(1);
}

if (needsActorABrowser && !fs.existsSync(actorA.profileDir)) {
  console.error(
    [
      `${actorA.role} profile is missing: ${actorA.profileDir}`,
      'Prepare it with yarn qash:actor-profile actor-a, complete Qash/Para login, then rerun.'
    ].join(' ')
  );
  process.exit(1);
}

console.log('Running Qash Actor A wallet-connect diagnostic on testnet.');
console.log(`Browser mode: ${browserMode}`);
console.log(`Actor A: ${actorA.email} | ${actorA.accountId} | ${actorA.walletAddress}`);
if (configuredPaymentUrl) {
  console.log(`Reusing payment link: ${configuredPaymentUrl}`);
  console.log('Actor A browser launch: skipped because the diagnostic will not create a new payment link.');
} else {
  console.log(`Actor A profile: ${actorA.profileDir}`);
}
console.log('Artifacts will be written under test-results/run-<timestamp>/testnet/qash/.');

const launchedBrowsers = [];
let result;

try {
  const env = {
    ...process.env,
    E2E_APP: 'qash',
    HEADLESS: process.env.HEADLESS || 'false',
    WALLET_PASSWORD: process.env.WALLET_PASSWORD || '',
    WALLET_SETUP_MODE: process.env.WALLET_SETUP_MODE || 'create',
    QASH_ACTOR_A_WALLET_CONNECT: 'true',
    QASH_AUTH_VIEWPORT_WIDTH: process.env.QASH_AUTH_VIEWPORT_WIDTH || '1600',
    QASH_AUTH_VIEWPORT_HEIGHT: process.env.QASH_AUTH_VIEWPORT_HEIGHT || '1100',
    QASH_ACTOR_BROWSER_MODE: browserMode,
    QASH_ACTOR_A_EMAIL: actorA.email,
    QASH_ACTOR_A_ACCOUNT_ID: actorA.accountId,
    QASH_ACTOR_A_WALLET_ADDRESS: actorA.walletAddress,
    QASH_ACTOR_A_PROFILE_DIR: actorA.profileDir
  };

  if (needsActorABrowser && browserMode === WINDOWS_CHROME_CDP_MODE) {
    console.log('Launching Windows Google Chrome Actor A browser over CDP.');
    const actorALaunch = await launchWindowsChromeWithCdp({
      source: 'qash-actor-a-wallet-connect',
      userDataDir: actorA.profileDir,
      profileDirectory: 'Default',
      initialUrl: 'about:blank',
      windowSize: { width: 1600, height: 1100 }
    });
    launchedBrowsers.push(actorALaunch);
    env.QASH_ACTOR_A_CDP_ENDPOINT = actorALaunch.cdpEndpoint;
    console.log(`Actor A CDP endpoint: ${actorALaunch.cdpEndpoint}`);
  }

  result = spawnSync(
    process.execPath,
    [
      'scripts/run-network.mjs',
      'testnet',
      'apps/qash/flows/actor-a-wallet-connect.spec.ts',
      '--grep',
      'qash-actor-a-public-payment-link-wallet-connect',
      '--reporter=list',
      ...cliArgs
    ],
    {
      stdio: 'inherit',
      env
    }
  );
} finally {
  const keepBrowser = (result?.status ?? 1) !== 0 && process.env.E2E_KEEP_BROWSER_ON_FAILURE === 'true';
  for (const launchedBrowser of launchedBrowsers.reverse()) {
    await launchedBrowser.close({ keepBrowser });
  }
}

process.exit(result?.status ?? 1);

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

function resolveActorProfileDir(role, envNames, fallback) {
  const actorSpecificProfile = firstEnvValue(...envNames);
  if (browserMode === WINDOWS_CHROME_CDP_MODE) {
    return resolveWindowsActorProfileDir(role, actorSpecificProfile).wslPath;
  }
  return resolvePath(actorSpecificProfile || fallback);
}
