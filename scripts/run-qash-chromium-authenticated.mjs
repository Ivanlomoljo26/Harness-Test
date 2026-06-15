#!/usr/bin/env node
import './load-env.mjs';
import { spawnSync } from 'node:child_process';
import {
  isQashAuthProfilePreflightEnabled,
  isQashAuthAutoLoginEnabled,
  recoverQashAuthProfile,
  resolveQashAuthAutoLoginTimeoutMs,
  resolveQashAuthPreflightTimeoutMs,
  resolveQashAuthProfileDir,
  resolveQashUrl,
  shouldAutoPrepareQashAuthProfile,
  verifyQashAuthProfile
} from './qash-auth-profile.mjs';

const [network = 'testnet', ...rest] = process.argv.slice(2);

if (!['devnet', 'testnet', 'localhost'].includes(network)) {
  console.error('Usage: node scripts/run-qash-chromium-authenticated.mjs [devnet|testnet|localhost] [playwright args...]');
  process.exit(2);
}

const profileDir = resolveQashAuthProfileDir();
const qashUrl = resolveQashUrl();
const runnerEnv = {
  ...process.env,
  QASH_AUTH_USER_DATA_DIR: profileDir
};

await ensureQashProfileReady();

const result = spawnSync(
  process.execPath,
  ['scripts/run-qash-authenticated.mjs', network, ...rest],
  {
    stdio: 'inherit',
    env: runnerEnv
  }
);

process.exit(result.status ?? 1);

async function ensureQashProfileReady() {
  if (!isQashAuthProfilePreflightEnabled()) return;
  if (process.env.QASH_AUTH_CDP_ENDPOINT || process.env.APP_AUTH_CDP_ENDPOINT) return;

  const timeoutMs = resolveQashAuthPreflightTimeoutMs();
  console.log(`Verifying Qash auth profile before test run: ${profileDir}`);
  if (await verifyProfile({ timeoutMs, phase: 'initial' })) return;

  if (isQashAuthAutoLoginEnabled()) {
    console.log('Qash auth profile is not logged in. Trying Playwright-driven login recovery.');
    const recovered = await recoverProfile();
    if (recovered) {
      console.log(`Re-verifying Qash auth profile before test run: ${profileDir}`);
      if (await verifyProfile({ timeoutMs, phase: 'post-auto-login' })) return;
      console.warn('Qash automated login recovery appeared to complete, but the saved profile did not verify.');
    }
  }

  if (!shouldAutoPrepareQashAuthProfile()) {
    console.error(
      [
        `Qash auth profile is not logged in: ${profileDir}`,
        'Automated Playwright login recovery did not reach a verified Qash dashboard/onboarding surface.',
        'If Google asks for password or 2FA, refresh the saved browser account session with `yarn qash:profile`, then rerun.',
        'For headed local runs, QASH_AUTH_AUTO_LOGIN=true is the default; set QASH_AUTH_AUTO_LOGIN=false only to disable this recovery.'
      ].join(' ')
    );
    process.exit(1);
  }

  console.log('Qash auth profile is not logged in. Opening profile prep before launching the test run.');
  const prep = spawnSync(process.execPath, ['scripts/prepare-qash-profile.mjs', profileDir], {
    stdio: 'inherit',
    env: runnerEnv
  });

  if ((prep.status ?? 1) !== 0) {
    process.exit(prep.status ?? 1);
  }

  console.log(`Re-verifying Qash auth profile before test run: ${profileDir}`);
  if (await verifyProfile({ timeoutMs, phase: 'post-prep' })) return;

  console.error(`Qash auth profile was still not verified after profile prep: ${profileDir}`);
  process.exit(1);
}

async function verifyProfile({ timeoutMs, phase }) {
  try {
    return await verifyQashAuthProfile({ profileDir, qashUrl, timeoutMs });
  } catch (error) {
    console.error(
      `Qash auth profile ${phase} verification could not launch or inspect Chromium: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}

async function recoverProfile() {
  try {
    const result = await recoverQashAuthProfile({
      profileDir,
      qashUrl,
      timeoutMs: resolveQashAuthAutoLoginTimeoutMs(),
      headless: process.env.HEADLESS !== 'false'
    });

    if (result.ok) {
      console.log(`Qash automated login recovery completed: ${result.mode}.`);
      return true;
    }

    console.warn(`Qash automated login recovery did not complete: ${result.reason}`);
    return false;
  } catch (error) {
    console.warn(
      `Qash automated login recovery could not launch or inspect Chromium: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}
