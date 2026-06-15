#!/usr/bin/env node
import './load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  OFFICIAL_MIDEN_WALLET_EXTENSION_ID,
  PLAYWRIGHT_CHROMIUM_MODE,
  WINDOWS_CHROME_CDP_MODE,
  isWindowsBackedPath,
  launchWindowsChromeWithCdp,
  resolveActorBrowserMode,
  resolveSeededActorProfileDirectory,
  resolveWindowsActorProfileDir,
  seedWindowsActorProfileFromInstalledChrome
} from './windows-chrome-cdp.mjs';

const DEFAULT_MIDEN_WALLET_EXTENSION_ID = OFFICIAL_MIDEN_WALLET_EXTENSION_ID;
const [network = 'testnet', ...cliArgs] = process.argv.slice(2);
const isListOnly = cliArgs.includes('--list');

if (network !== 'testnet') {
  console.error('Usage: node scripts/run-qash-money-movement.mjs testnet [playwright args...]');
  console.error('Qash Actor A/B money movement is intentionally testnet-only.');
  process.exit(2);
}

const loopCount = firstEnvValue('QASH_MONEY_MOVEMENT_LOOPS', 'QASH_STRESS_LOOPS', 'QASH_DURABILITY_LOOPS');
const direction = firstEnvValue('QASH_STRESS_MONEY_MOVEMENT_DIRECTION', 'QASH_MONEY_MOVEMENT_DIRECTION') ||
  'bidirectional';
const browserMode = isListOnly ? PLAYWRIGHT_CHROMIUM_MODE : resolveActorBrowserMode();
const freshPayerWalletEachLeg = !isListOnly && resolveFreshPayerWalletEachLeg(browserMode);
const actorA = {
  role: 'Actor A',
  email: firstEnvValue('QASH_ACTOR_A_EMAIL', 'QASH_AUTH_ACCOUNT_EMAIL'),
  accountId: process.env.QASH_ACTOR_A_ACCOUNT_ID?.trim(),
  walletAddress: process.env.QASH_ACTOR_A_WALLET_ADDRESS?.trim(),
  profileDir: resolveActorProfileDir('actor-a', [
    'QASH_ACTOR_A_PROFILE_DIR',
    'QASH_ACTOR_A_AUTH_USER_DATA_DIR'
  ], '.auth/qash/actor-a', { includeGenericAuthProfile: true })
};
const actorB = {
  role: 'Actor B',
  email: process.env.QASH_ACTOR_B_EMAIL?.trim(),
  accountId: process.env.QASH_ACTOR_B_ACCOUNT_ID?.trim(),
  walletAddress: firstEnvValue(
    'QASH_ACTOR_B_WALLET_ADDRESS',
    'QASH_STRESS_RECEIVER_WALLET_ADDRESS',
    'QASH_DURABILITY_RECEIVER_WALLET_ADDRESS'
  ),
  profileDir: resolveActorProfileDir('actor-b', [
    'QASH_ACTOR_B_PROFILE_DIR',
    'QASH_ACTOR_B_AUTH_USER_DATA_DIR'
  ], '.auth/qash/actor-b')
};

if (!loopCount || !/^[1-9]\d*$/.test(loopCount)) {
  console.error(
    [
      'Qash Actor A/B money movement requires the user-selected loop count.',
      'Set QASH_MONEY_MOVEMENT_LOOPS to a positive integer.',
      'QASH_STRESS_LOOPS and QASH_DURABILITY_LOOPS are accepted only as compatibility fallbacks.'
    ].join(' ')
  );
  process.exit(1);
}

if (!isSupportedDirection(direction)) {
  console.error(
    'QASH_MONEY_MOVEMENT_DIRECTION must be bidirectional, both, actor-b-pays-actor-a, b-to-a, actor-a-pays-actor-b, or a-to-b.'
  );
  process.exit(1);
}

if (sameProfileDir(actorA.profileDir, actorB.profileDir)) {
  console.error(
    [
      'Actor A and Actor B must use different clean browser profile directories.',
      `Actor A profile: ${actorA.profileDir}`,
      `Actor B profile: ${actorB.profileDir}`
    ].join(' ')
  );
  process.exit(1);
}

for (const actor of [actorA, actorB]) {
  const prefix = actor.role === 'Actor A' ? 'QASH_ACTOR_A' : 'QASH_ACTOR_B';
  if (!actor.email) {
    console.error(`${actor.role} email is required. Set ${prefix}_EMAIL.`);
    process.exit(1);
  }
  if (!actor.accountId) {
    console.error(`${actor.role} account ID is required. Set ${prefix}_ACCOUNT_ID.`);
    process.exit(1);
  }
  if (!actor.walletAddress) {
    console.error(`${actor.role} wallet address is required. Set ${prefix}_WALLET_ADDRESS.`);
    process.exit(1);
  }
  if (!/^0x[0-9a-f]{24,}$/i.test(actor.accountId)) {
    console.error(`${actor.role} account ID is invalid or missing: ${actor.accountId}`);
    process.exit(1);
  }
  if (!/^mtst1/i.test(actor.walletAddress)) {
    console.error(`${actor.role} wallet address must be a testnet Miden address. Got: ${actor.walletAddress}`);
    process.exit(1);
  }
}

if (!isListOnly && browserMode === WINDOWS_CHROME_CDP_MODE) {
  const walletExtensionId = resolveWalletExtensionId();
  for (const actor of [actorA, actorB]) {
    const seedResult = seedWindowsActorProfileFromInstalledChrome({
      role: actor.role === 'Actor A' ? 'actor-a' : 'actor-b',
      email: actor.email,
      walletAddress: actor.walletAddress,
      targetUserDataDir: actor.profileDir,
      extensionId: walletExtensionId,
      requireWallet: false,
      force: process.env.QASH_ACTOR_PROFILE_SEED_FORCE === 'true'
    });
    console.log(
      `${actor.role} profile seed: ${seedResult.reason} from ${seedResult.sourceProfileDirectory} -> ${seedResult.targetUserDataDir}`
    );
  }
}

for (const actor of [actorA, actorB]) {
  if (!isListOnly && !fs.existsSync(actor.profileDir)) {
    console.error(
      [
        `${actor.role} profile is missing: ${actor.profileDir}`,
        `Prepare it with yarn qash:actor-profile ${actor.role === 'Actor A' ? 'actor-a' : 'actor-b'},`,
        'complete Qash/Para login and Miden wallet setup/import, then close the browser before rerunning.'
      ].join(' ')
    );
    process.exit(1);
  }
}

console.log('Running Qash Actor A/B money movement on testnet.');
console.log(`Browser mode: ${browserMode}`);
console.log(`Direction: ${direction}`);
console.log(`Loop count: ${loopCount}`);
console.log(`Fresh payer wallet each leg: ${freshPayerWalletEachLeg ? 'enabled' : 'disabled'}`);
console.log(`Actor A: ${actorA.email} | ${actorA.accountId} | ${actorA.walletAddress}`);
console.log(`Actor A profile: ${actorA.profileDir}`);
console.log(`Actor B: ${actorB.email} | ${actorB.accountId} | ${actorB.walletAddress}`);
console.log(`Actor B profile: ${actorB.profileDir}`);
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
    QASH_MONEY_MOVEMENT: 'true',
    QASH_MONEY_MOVEMENT_LOOPS: loopCount,
    QASH_MONEY_MOVEMENT_DIRECTION: direction,
    QASH_STRESS_MONEY_MOVEMENT_DIRECTION: direction,
    QASH_ACTOR_FRESH_WALLET_EACH_SESSION: freshPayerWalletEachLeg ? 'true' : 'false',
    QASH_ACTOR_WALLET_SETUP_MODE: process.env.QASH_ACTOR_WALLET_SETUP_MODE || 'profile',
    QASH_PAYER_FRESH_WALLET_EACH_LEG: freshPayerWalletEachLeg ? 'true' : 'false',
    QASH_AUTH_VIEWPORT_WIDTH: process.env.QASH_AUTH_VIEWPORT_WIDTH || '1600',
    QASH_AUTH_VIEWPORT_HEIGHT: process.env.QASH_AUTH_VIEWPORT_HEIGHT || '1100',
    QASH_ACTOR_BROWSER_MODE: browserMode,
    QASH_ACTOR_A_EMAIL: actorA.email,
    QASH_ACTOR_A_ACCOUNT_ID: actorA.accountId,
    QASH_ACTOR_A_WALLET_ADDRESS: actorA.walletAddress,
    QASH_ACTOR_A_PROFILE_DIR: actorA.profileDir,
    QASH_ACTOR_B_EMAIL: actorB.email,
    QASH_ACTOR_B_ACCOUNT_ID: actorB.accountId,
    QASH_ACTOR_B_WALLET_ADDRESS: actorB.walletAddress,
    QASH_ACTOR_B_PROFILE_DIR: actorB.profileDir
  };

  if (!isListOnly && browserMode === WINDOWS_CHROME_CDP_MODE) {
    console.log('Launching separate Windows Google Chrome actor browsers over CDP.');
    const actorALaunch = await launchWindowsChromeWithCdp(buildActorChromeLaunchOptions({
      source: 'qash-actor-a',
      userDataDir: actorA.profileDir,
      extensionLabel: 'qash-actor-a-wallet'
    }));
    launchedBrowsers.push(actorALaunch);

    const actorBLaunch = await launchWindowsChromeWithCdp(buildActorChromeLaunchOptions({
      source: 'qash-actor-b',
      userDataDir: actorB.profileDir,
      extensionLabel: 'qash-actor-b-wallet'
    }));
    launchedBrowsers.push(actorBLaunch);

    env.QASH_ACTOR_A_CDP_ENDPOINT = actorALaunch.cdpEndpoint;
    env.QASH_ACTOR_B_CDP_ENDPOINT = actorBLaunch.cdpEndpoint;
    console.log(`Actor A CDP endpoint: ${actorALaunch.cdpEndpoint}`);
    console.log(`Actor B CDP endpoint: ${actorBLaunch.cdpEndpoint}`);
  }

  result = spawnSync(
    process.execPath,
    [
      'scripts/run-network.mjs',
      'testnet',
      'apps/qash/flows/money-movement.spec.ts',
      '--grep',
      'qash-actor-payment-link-money-movement',
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

function resolveActorProfileDir(role, envNames, fallback, options = {}) {
  const actorSpecificProfile = firstEnvValue(...envNames);
  const genericAuthProfile = options.includeGenericAuthProfile ? firstEnvValue('QASH_AUTH_USER_DATA_DIR') : undefined;

  if (browserMode === WINDOWS_CHROME_CDP_MODE) {
    const configuredProfile = actorSpecificProfile ||
      (genericAuthProfile && isWindowsBackedPath(genericAuthProfile) ? genericAuthProfile : undefined);
    return resolveWindowsActorProfileDir(role, configuredProfile).wslPath;
  }

  return resolvePath(actorSpecificProfile || genericAuthProfile || fallback);
}

function resolveWalletExtensionPath() {
  const configured = process.env.WALLET_EXTENSION_PATH_TESTNET || process.env.WALLET_EXTENSION_PATH;
  if (configured) return resolvePath(configured);

  const localBuild = path.resolve(process.cwd(), '.wallet-builds/testnet/chrome_unpacked');
  if (fs.existsSync(path.join(localBuild, 'manifest.json'))) return localBuild;

  return path.resolve(process.cwd(), '.wallet-builds/testnet/chrome_unpacked');
}

function resolveWalletExtensionId() {
  return process.env.QASH_WALLET_EXTENSION_ID ||
    process.env.WALLET_EXTENSION_ID ||
    DEFAULT_MIDEN_WALLET_EXTENSION_ID;
}

function buildActorChromeLaunchOptions({ source, userDataDir, extensionLabel }) {
  const launchOptions = {
    source,
    userDataDir,
    profileDirectory: resolveSeededActorProfileDirectory(userDataDir),
    initialUrl: 'about:blank',
    windowSize: {
      width: Number(process.env.QASH_AUTH_VIEWPORT_WIDTH || 1600),
      height: Number(process.env.QASH_AUTH_VIEWPORT_HEIGHT || 1100)
    }
  };

  if (process.env.QASH_ACTOR_LOAD_UNPACKED_EXTENSION === 'true') {
    launchOptions.extensionPath = resolveWalletExtensionPath();
    launchOptions.extensionLabel = extensionLabel;
  }

  return launchOptions;
}

function resolveFreshPayerWalletEachLeg(mode) {
  const configured = firstEnvValue(
    'QASH_PAYER_FRESH_WALLET_EACH_LEG',
    'QASH_ACTOR_FRESH_WALLET_EACH_SESSION',
    'QASH_FRESH_WALLET_EACH_SESSION'
  );
  if (configured) return !['0', 'false', 'no', 'off'].includes(configured.toLowerCase());
  return mode === WINDOWS_CHROME_CDP_MODE;
}

function sameProfileDir(left, right) {
  return path.resolve(left) === path.resolve(right);
}

function isSupportedDirection(value) {
  return [
    'bidirectional',
    'both',
    'actor-b-pays-actor-a',
    'b-to-a',
    'actor-a-pays-actor-b',
    'a-to-b'
  ].includes(value.toLowerCase());
}
