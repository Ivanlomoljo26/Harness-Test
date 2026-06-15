#!/usr/bin/env node
import './load-env.mjs';
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  isQashAuthAutoLoginEnabled,
  openStandaloneQashProfile,
  recoverQashAuthProfile,
  resolveQashAuthAutoLoginTimeoutMs,
  resolveQashAuthProfileDir,
  resolveQashUrl,
  verifyQashAuthProfile,
  waitForQashAuthenticatedSurface
} from './qash-auth-profile.mjs';

const profileDir = resolveQashAuthProfileDir(process.argv[2]);
const qashUrl = resolveQashUrl();
const googleAccountEmail = process.env.QASH_GOOGLE_ACCOUNT_EMAIL;
const profilePrepMode = process.env.QASH_PROFILE_PREP_MODE || 'chromium';

fs.mkdirSync(profileDir, { recursive: true });

console.log(`Preparing Qash auth profile: ${profileDir}`);

if (isQashAuthAutoLoginEnabled()) {
  console.log('Trying Playwright-driven Qash login recovery before opening manual profile prep.');
  const recovered = await recoverProfile();
  if (recovered) {
    process.exit(0);
  }
}

if (profilePrepMode !== 'playwright') {
  await prepareWithStandaloneChromium();
  process.exit(0);
}

console.log('A Playwright-controlled browser window will open. Complete Qash/Para login manually.');
console.log('Stop when Qash shows post-login onboarding such as "Tell us about your company" or "Wallet Created".');

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  args: [
    '--no-first-run',
    '--no-default-browser-check'
  ]
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto(qashUrl, { waitUntil: 'domcontentloaded' });

await page.getByRole('button', { name: /continue by email/i }).click({ timeout: 20_000 }).catch(() => undefined);

if (googleAccountEmail) {
  const result = await tryGoogleAccountLogin(page, googleAccountEmail);
  if (!result.ok) {
    await context.close();
    console.error(result.reason);
    process.exit(1);
  }

  const found = await waitForQashAuthenticatedSurface(context, 2 * 60_000);
  await context.storageState({ path: path.join(profileDir, 'storage-state.json') }).catch(() => undefined);
  await context.close();

  if (!found) {
    console.error(
      'Google account selection completed, but Qash did not reach a recognized post-login/onboarding surface. ' +
        'Open the saved profile manually with `yarn qash:profile` to finish any remaining onboarding.'
    );
    process.exit(1);
  }

  console.log(`Qash auth profile saved: ${profileDir}`);
  console.log(`Selected Google account: ${googleAccountEmail}`);
  console.log('Use it with:');
  console.log(`  QASH_AUTH_USER_DATA_DIR=${profileDir} yarn test:e2e:testnet:qash:auth`);
  process.exit(0);
}

const rl = readline.createInterface({ input, output });
const enterPromise = rl.question('Press Enter here after Qash is logged in, or wait for auto-detection...\n');
const autoDetectedPromise = waitForQashAuthenticatedSurface(context, 30 * 60_000);

const result = await Promise.race([
  enterPromise.then(() => ({ mode: 'manual' })),
  autoDetectedPromise.then(found => ({ mode: found ? 'auto-detected' : 'timeout' }))
]);

rl.close();

await context.storageState({ path: path.join(profileDir, 'storage-state.json') }).catch(() => undefined);
await context.close();

console.log(`Qash auth profile saved: ${profileDir}`);
console.log(`Detection mode: ${result.mode}`);
console.log('Use it with:');
console.log(`  QASH_AUTH_USER_DATA_DIR=${profileDir} yarn test:e2e:testnet:qash:auth`);

async function prepareWithStandaloneChromium() {
  const result = openStandaloneQashProfile({ profileDir, qashUrl });

  if (result.error) {
    console.error(`Failed to open standalone Chromium: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== null && result.status !== 0) {
    console.error(`Standalone Chromium exited with status ${result.status}.`);
    process.exit(result.status);
  }

  const found = await verifySavedProfile();
  if (!found) {
    console.error(
      'Qash auth profile was not verified after Chromium closed. ' +
        'Re-run `yarn qash:profile`, complete Qash/Para login, then close the Chromium window once the dashboard or onboarding screen is visible.'
    );
    process.exit(1);
  }

  console.log(`Qash auth profile saved: ${profileDir}`);
  console.log('Detection mode: standalone-chromium');
  console.log('Use it with:');
  console.log(`  QASH_AUTH_USER_DATA_DIR=${profileDir} yarn test:e2e:testnet:qash:auth`);
}

async function verifySavedProfile() {
  return verifyQashAuthProfile({ profileDir, qashUrl, timeoutMs: 45_000 });
}

async function recoverProfile() {
  try {
    const result = await recoverQashAuthProfile({
      profileDir,
      qashUrl,
      timeoutMs: resolveQashAuthAutoLoginTimeoutMs(),
      headless: false
    });

    if (!result.ok) {
      console.warn(`Qash automated login recovery did not complete: ${result.reason}`);
      return false;
    }

    const verified = await verifySavedProfile();
    if (!verified) {
      console.warn('Qash automated login recovery appeared to complete, but the saved profile did not verify.');
      return false;
    }

    console.log(`Qash auth profile saved: ${profileDir}`);
    console.log(`Detection mode: automated-${result.mode}`);
    console.log('Use it with:');
    console.log(`  QASH_AUTH_USER_DATA_DIR=${profileDir} yarn test:e2e:testnet:qash:auth`);
    return true;
  } catch (error) {
    console.warn(
      `Qash automated login recovery could not launch or inspect Chromium: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}

async function tryGoogleAccountLogin(page, email) {
  await page.getByText(/sign up or login/i).waitFor({ timeout: 20_000 });

  const popupPromise = page.waitForEvent('popup', { timeout: 15_000 }).catch(() => null);
  await page.locator('[data-testid=para-oauth-google]').click({ timeout: 10_000 });
  const popup = await popupPromise;
  if (!popup) {
    return { ok: false, reason: 'Google OAuth did not open a popup.' };
  }

  await popup.waitForURL(url => url.href !== 'about:blank', { timeout: 30_000 }).catch(() => undefined);
  await popup.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  await waitForGoogleAuthPage(popup, 45_000);

  const accountLocator = popup.getByText(email, { exact: true });
  if (await accountLocator.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await accountLocator.click();
  } else if (await popup.getByLabel(/email or phone/i).isVisible({ timeout: 1_000 }).catch(() => false)) {
    return {
      ok: false,
      reason:
        `Google is asking for an email/password login, not offering ${email} as an already signed-in account. ` +
        'Manual login is required.'
    };
  } else {
    return {
      ok: false,
      reason:
        `Google account chooser did not show ${email}. ` +
        `Current popup URL: ${popup.url()}`
    };
  }

  await popup.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  await clickGoogleConsentIfPresent(popup);

  if (await popup.getByLabel(/password/i).isVisible({ timeout: 1_000 }).catch(() => false)) {
    return {
      ok: false,
      reason: 'Google selected the account but is asking for a password. Manual login is required.'
    };
  }

  if (await popup.getByText(/verify it.?s you|2-step verification|enter a code|recovery/i).isVisible({ timeout: 1_000 }).catch(() => false)) {
    return {
      ok: false,
      reason: 'Google selected the account but is asking for additional verification. Manual login is required.'
    };
  }

  return { ok: true };
}

async function waitForGoogleAuthPage(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    const bodyText = await page.locator('body').innerText({ timeout: 1_000 }).catch(() => '');
    if (url.includes('accounts.google.com') || /sign in with google|choose an account|email or phone/i.test(bodyText)) {
      return;
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
}

async function clickGoogleConsentIfPresent(page) {
  for (const name of [/continue/i, /allow/i]) {
    const button = page.getByRole('button', { name }).first();
    if (await button.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await button.click();
      await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
      return;
    }
  }
}
