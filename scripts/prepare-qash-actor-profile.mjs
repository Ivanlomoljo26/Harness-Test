#!/usr/bin/env node
import './load-env.mjs';
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  isQashApiAuthenticated,
  qashAuthenticatedSurfacePattern,
  resolveQashUrl,
  verifyQashAuthProfile
} from './qash-auth-profile.mjs';
import {
  OFFICIAL_MIDEN_WALLET_EXTENSION_ID,
  WINDOWS_CHROME_CDP_MODE,
  isWindowsBackedPath,
  launchWindowsChromeWithCdp,
  resolveActorBrowserMode,
  resolveInstalledExtensionPathForUserDataDir,
  resolveSeededActorProfileDirectory,
  resolveWindowsActorProfileDir,
  seedWindowsActorProfileFromInstalledChrome
} from './windows-chrome-cdp.mjs';

const DEFAULT_MIDEN_WALLET_EXTENSION_ID = OFFICIAL_MIDEN_WALLET_EXTENSION_ID;
const DEFAULT_MIDEN_WALLET_WEBSTORE_URL =
  'https://chromewebstore.google.com/detail/miden-wallet/ablmompanofnodfdkgchkpmphailefpb?pli=1';
const role = (process.argv[2] || process.env.QASH_ACTOR_ROLE || 'actor-b').trim().toLowerCase();

if (!['actor-a', 'actor-b'].includes(role)) {
  console.error('Usage: node scripts/prepare-qash-actor-profile.mjs [actor-a|actor-b]');
  process.exit(2);
}

const browserMode = resolveActorBrowserMode();
const actor = resolveActor(role);
const qashUrl = resolveQashUrl();
const useInstalledWebStoreWallet = browserMode === WINDOWS_CHROME_CDP_MODE &&
  process.env.QASH_ACTOR_LOAD_UNPACKED_EXTENSION !== 'true';
const verifyActorWallet = resolveVerifyActorWallet();
if (!actor.email) {
  console.error(`Qash ${role} profile prep requires ${role === 'actor-a' ? 'QASH_ACTOR_A_EMAIL' : 'QASH_ACTOR_B_EMAIL'}.`);
  process.exit(1);
}
if (verifyActorWallet && !/^mtst1/i.test(actor.walletAddress || '')) {
  console.error(
    `Qash ${role} wallet verification requires ${role === 'actor-a' ? 'QASH_ACTOR_A_WALLET_ADDRESS' : 'QASH_ACTOR_B_WALLET_ADDRESS'}=mtst1....`
  );
  process.exit(1);
}
const loadUnpackedWalletExtension = !useInstalledWebStoreWallet;
const walletExtensionId = useInstalledWebStoreWallet ? resolveWalletExtensionId() : undefined;
const walletWebStoreUrl = process.env.QASH_WALLET_WEBSTORE_URL?.trim() || DEFAULT_MIDEN_WALLET_WEBSTORE_URL;
const seedResult = useInstalledWebStoreWallet
  ? seedWindowsActorProfileFromInstalledChrome({
      role,
      email: actor.email,
      walletAddress: actor.walletAddress,
      targetUserDataDir: actor.profileDir,
      extensionId: walletExtensionId,
      requireWallet: verifyActorWallet,
      force: process.env.QASH_ACTOR_PROFILE_SEED_FORCE === 'true'
    })
  : undefined;
const installedWalletExtensionPath = useInstalledWebStoreWallet
  ? resolveInstalledExtensionPathForUserDataDir(actor.profileDir, walletExtensionId)
  : undefined;
const walletExtensionPath = verifyActorWallet
  ? (loadUnpackedWalletExtension ? resolveWalletExtensionPath() : installedWalletExtensionPath)
  : undefined;
const manifestPath = loadUnpackedWalletExtension && walletExtensionPath
  ? path.join(walletExtensionPath, 'manifest.json')
  : undefined;

if (loadUnpackedWalletExtension && manifestPath && !fs.existsSync(manifestPath)) {
  console.error(
    [
      'Qash actor profile prep requires a built Miden wallet extension.',
      `No manifest.json found at ${walletExtensionPath}.`,
      'Build the testnet wallet extension first or set WALLET_EXTENSION_PATH_TESTNET.'
    ].join(' ')
  );
  process.exit(1);
}

fs.mkdirSync(actor.profileDir, { recursive: true });

console.log(`Preparing Qash ${role} profile: ${actor.profileDir}`);
console.log(`Expected email: ${actor.email}`);
console.log(`Expected wallet address: ${actor.walletAddress || 'not configured'}`);
console.log(`Browser mode: ${browserMode}`);
console.log(`Actor profile wallet verification: ${verifyActorWallet ? 'enabled' : 'disabled'}`);
if (walletExtensionId) {
  console.log(`Wallet extension ID: ${walletExtensionId}`);
  console.log(`Official wallet source: ${seedResult?.sourceProfileDirectory ?? 'existing actor profile'}`);
  if (walletExtensionPath) console.log(`Official wallet package: ${walletExtensionPath}`);
  console.log(`Wallet Web Store URL: ${walletWebStoreUrl}`);
}
console.log(
  browserMode === WINDOWS_CHROME_CDP_MODE
    ? 'Opening Windows Google Chrome with Qash actor auth profile.'
    : 'Opening Chromium with Qash actor auth profile.'
);
console.log(
  !verifyActorWallet
    ? 'The helper will verify Qash auth only. Fresh payer wallets are created by the money-movement run.'
    : walletExtensionId
    ? 'The helper will unlock and verify the seeded official Miden Wallet before waiting for Qash readiness.'
    : 'The helper will unlock/import/create the wallet when it can do so from configured actor wallet inputs.'
);
console.log('Complete Qash/Para login manually if needed, then wait for the dashboard/onboarding surface.');

const profileState = await prepareActorProfile();
writeProfileState(actor.profileDir, profileState);

if (!profileState.qashReady || (verifyActorWallet && !profileState.walletReady)) {
  console.error(
    `Qash ${role} profile was not fully verified after the browser closed. ` +
      `qashReady=${profileState.qashReady} walletReady=${profileState.walletReady}. ` +
      (
        verifyActorWallet
          ? 'Re-run this helper and finish Qash login plus Miden wallet setup before closing the browser.'
          : 'Re-run this helper and finish Qash login before closing the browser.'
      )
  );
  process.exit(1);
}

const qashVerifiedAfterClose = browserMode === WINDOWS_CHROME_CDP_MODE
  ? profileState.qashReady
  : await verifyQashAuthProfile({
      profileDir: actor.profileDir,
      qashUrl,
      timeoutMs: 45_000
    }).catch(() => false);

if (!qashVerifiedAfterClose) {
  writeProfileState(actor.profileDir, buildProfileState({
    ...profileState,
    qashReady: false
  }));
  console.error(
    `Qash ${role} auth was visible before Chromium closed but was not persisted into the profile. ` +
      'Re-run this helper and close the browser only after the authenticated Qash surface is stable.'
  );
  process.exit(1);
}

console.log(`Qash ${role} profile saved: ${actor.profileDir}`);
console.log(`Profile state: ${path.join(actor.profileDir, 'qash-actor-profile-state.json')}`);

function buildProfileState(overrides) {
  return {
    role,
    email: actor.email,
    accountId: actor.accountId,
    walletAddress: actor.walletAddress,
    profileDir: actor.profileDir,
    extensionId: null,
    qashReady: false,
    walletReady: false,
    readinessVersion: 2,
    capturedAt: new Date().toISOString(),
    ...overrides
  };
}

async function prepareActorProfile() {
  if (browserMode === WINDOWS_CHROME_CDP_MODE) {
    return prepareActorProfileWithWindowsChromeCdp();
  }
  return prepareActorProfileWithChromium();
}

async function prepareActorProfileWithChromium() {
  if (verifyActorWallet && !walletExtensionPath) {
    throw new Error('Chromium profile prep requires a local wallet extension path.');
  }
  const args = verifyActorWallet
    ? [
        `--disable-extensions-except=${walletExtensionPath}`,
        `--load-extension=${walletExtensionPath}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-session-crashed-bubble',
        '--hide-crash-restore-bubble',
        '--password-store=basic',
        '--window-size=1600,1100'
      ]
    : [
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-session-crashed-bubble',
        '--hide-crash-restore-bubble',
        '--password-store=basic',
        '--window-size=1600,1100'
      ];
  const context = await chromium.launchPersistentContext(actor.profileDir, {
    headless: false,
    args,
    ignoreDefaultArgs: ['--disable-extensions'],
    viewport: { width: 1600, height: 1100 }
  });

  let closed = false;
  context.on('close', () => {
    closed = true;
  });

  return monitorActorProfileContext(context, () => closed);
}

async function prepareActorProfileWithWindowsChromeCdp() {
  const launchOptions = {
    source: `qash-${role}-profile`,
    userDataDir: actor.profileDir,
    profileDirectory: resolveSeededActorProfileDirectory(actor.profileDir),
    initialUrl: 'about:blank',
    windowSize: { width: 1600, height: 1100 }
  };
  if (loadUnpackedWalletExtension && walletExtensionPath) {
    launchOptions.extensionPath = walletExtensionPath;
    launchOptions.extensionLabel = `qash-${role}-wallet`;
  }
  const launchedChrome = await launchWindowsChromeWithCdp(launchOptions);
  const browser = await chromium.connectOverCDP(launchedChrome.cdpEndpoint);
  const context = browser.contexts()[0];
  if (!context) {
    await launchedChrome.close();
    throw new Error(`Connected to ${launchedChrome.cdpEndpoint}, but no persistent browser context was available.`);
  }

  let closed = false;
  browser.on('disconnected', () => {
    closed = true;
  });
  context.on('close', () => {
    closed = true;
  });

  try {
    return await monitorActorProfileContext(context, () => closed);
  } finally {
    await browser.close().catch(() => undefined);
    await launchedChrome.close();
  }
}

async function monitorActorProfileContext(context, isClosed) {
  const extensionId = verifyActorWallet
    ? walletExtensionId ?? new URL((await waitForExtensionServiceWorker(context)).url()).host
    : null;
  const qashPage = await prepareQashPage(context, extensionId);

  let walletReady = !verifyActorWallet;
  let walletPage;
  if (verifyActorWallet && extensionId) {
    walletPage = await openWalletPageIfInstalled(context, extensionId);
    if (!walletPage) {
      throw new Error(
        [
          `Miden Wallet extension ${extensionId} is not available in the ${role} actor profile.`,
          useInstalledWebStoreWallet
            ? `Expected an installed official Chrome Web Store extension seeded from ${seedResult?.sourceProfileDirectory ?? 'a source profile'}.`
            : `Expected a loaded unpacked wallet extension from ${walletExtensionPath}.`,
          useInstalledWebStoreWallet
            ? `Install source: ${walletWebStoreUrl}`
            : 'Build the wallet extension or set WALLET_EXTENSION_PATH_TESTNET.'
        ].join(' ')
      );
    }
    await ensureWalletPrepared(walletPage, extensionId);
    walletReady = await isWalletReady(walletPage) && await isExpectedWalletAddressVisible(walletPage);
    await walletPage.close().catch(() => undefined);
    walletPage = undefined;
  }

  await qashPage.goto(qashUrl, { waitUntil: 'domcontentloaded' });
  await qashPage.bringToFront();

  let lastState = buildProfileState({ extensionId, qashReady: false, walletReady: false });
  let readyMessagePrinted = false;
  let readyStableCount = 0;
  const waitForManualClose = process.env.QASH_ACTOR_PROFILE_WAIT_FOR_MANUAL_CLOSE === 'true';

  while (!isClosed()) {
    lastState = {
      ...lastState,
      qashReady: await isQashReady(context),
      walletReady,
      capturedAt: new Date().toISOString()
    };
    writeProfileState(actor.profileDir, lastState);
    if (lastState.qashReady && (!verifyActorWallet || lastState.walletReady)) {
      readyStableCount += 1;
      if (!readyMessagePrinted) {
        console.log(
          waitForManualClose
            ? (verifyActorWallet
                ? 'Qash auth and wallet readiness signals are visible. Close the browser when you are done reviewing.'
                : 'Qash auth signals are visible. Close the browser when you are done reviewing.')
            : (verifyActorWallet
                ? 'Qash auth and wallet readiness signals are visible. The helper will close this actor browser automatically after a stable check.'
                : 'Qash auth signals are visible. The helper will close this actor browser automatically after a stable check.')
        );
        readyMessagePrinted = true;
      }
      if (!waitForManualClose && readyStableCount >= 2) {
        await writeBrowserStorageState(context);
        return {
          ...lastState,
          capturedAt: new Date().toISOString()
        };
      }
    } else {
      readyStableCount = 0;
    }
    await new Promise(resolve => setTimeout(resolve, 2_000));
  }

  return {
    ...lastState,
    capturedAt: new Date().toISOString()
  };
}

async function writeBrowserStorageState(context) {
  await context.storageState({
    path: path.join(actor.profileDir, 'storage-state.json')
  }).catch(error => {
    console.warn(`Could not write Qash ${role} storage state: ${error instanceof Error ? error.message : String(error)}`);
  });
}

async function prepareQashPage(browserContext, extensionId) {
  let qashPage;
  for (const page of browserContext.pages()) {
    if (extensionId && page.url().startsWith(`chrome-extension://${extensionId}/`)) continue;
    if (!qashPage) {
      qashPage = page;
      continue;
    }
    await page.close().catch(() => undefined);
  }
  return qashPage ?? browserContext.newPage();
}

function resolveActor(actorRole) {
  if (actorRole === 'actor-a') {
    return {
      email: firstEnvValue('QASH_ACTOR_A_EMAIL', 'QASH_AUTH_ACCOUNT_EMAIL'),
      accountId: process.env.QASH_ACTOR_A_ACCOUNT_ID?.trim(),
      walletAddress: process.env.QASH_ACTOR_A_WALLET_ADDRESS?.trim(),
      profileDir: resolveActorProfileDir('actor-a', [
        'QASH_ACTOR_A_PROFILE_DIR',
        'QASH_ACTOR_A_AUTH_USER_DATA_DIR'
      ], '.auth/qash/actor-a', { includeGenericAuthProfile: true })
    };
  }

  return {
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
}

function resolveWalletExtensionPath() {
  const configured = process.env.WALLET_EXTENSION_PATH_TESTNET || process.env.WALLET_EXTENSION_PATH;
  if (configured) return resolvePath(configured);
  const localBuild = path.resolve(process.cwd(), '.wallet-builds/testnet/chrome_unpacked');
  if (fs.existsSync(path.join(localBuild, 'manifest.json'))) return localBuild;
  return localBuild;
}

function resolveWalletExtensionId() {
  return firstEnvValue('QASH_WALLET_EXTENSION_ID', 'WALLET_EXTENSION_ID') || DEFAULT_MIDEN_WALLET_EXTENSION_ID;
}

function resolveVerifyActorWallet() {
  const configured = firstEnvValue('QASH_ACTOR_PROFILE_VERIFY_WALLET', 'QASH_ACTOR_VERIFY_WALLET');
  if (!configured) return false;
  return !['0', 'false', 'no', 'off'].includes(configured.toLowerCase());
}

async function waitForExtensionServiceWorker(browserContext) {
  const existing = browserContext.serviceWorkers().find(worker => {
    if (!walletExtensionId) return worker.url().startsWith('chrome-extension://');
    return new URL(worker.url()).host === walletExtensionId;
  });
  if (existing) return existing;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const worker = browserContext.serviceWorkers().find(candidate => {
      if (!walletExtensionId) return candidate.url().startsWith('chrome-extension://');
      return new URL(candidate.url()).host === walletExtensionId;
    });
    if (worker) return worker;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return browserContext.waitForEvent('serviceworker', {
    timeout: 30_000,
    predicate: worker => !walletExtensionId || new URL(worker.url()).host === walletExtensionId
  });
}

async function openWalletPageIfInstalled(browserContext, extensionId) {
  const existing = browserContext.pages().find(page => page.url().startsWith(`chrome-extension://${extensionId}/`));
  if (existing) return existing;

  const page = await browserContext.newPage();
  try {
    await gotoWalletHome(page, extensionId, 5_000);
    return page;
  } catch {
    await page.close().catch(() => undefined);
    return undefined;
  }
}

async function ensureWalletPrepared(page, extensionId) {
  await gotoWalletHome(page, extensionId, 60_000);

  if (await isWalletReady(page)) {
    await assertExpectedWalletAddress(page);
    return;
  }

  if (await isWalletLocked(page)) {
    await unlockWallet(page);
    await assertExpectedWalletAddress(page);
    return;
  }

  const welcome = page.getByTestId('onboarding-welcome');
  if (await welcome.isVisible({ timeout: 10_000 }).catch(() => false)) {
    const setupMode = resolveActorWalletSetupMode();
    const seedPhrase = resolveActorSeedPhrase();
    if (setupMode === 'import' && seedPhrase) {
      await importWallet(page, seedPhrase);
      await assertExpectedWalletAddress(page);
      return;
    }
    if (setupMode === 'create') {
      await createWallet(page);
      await assertExpectedWalletAddress(page);
      return;
    }
    throw new Error(
      [
        `Miden Wallet for ${role} is on onboarding, but no actor seed was configured.`,
        `Expected fixed wallet address: ${actor.walletAddress}`,
        `Set ${role === 'actor-a' ? 'QASH_ACTOR_A_TEST_ACCOUNT_SEED' : 'QASH_ACTOR_B_TEST_ACCOUNT_SEED'} to import it,`,
        'or seed the official Chrome Web Store wallet from a known-good Chrome profile.'
      ].join(' ')
    );
  }

  throw new Error('Miden Wallet did not reach ready, locked, or onboarding state.');
}

async function gotoWalletHome(page, extensionId, timeout) {
  let lastError;
  for (const walletUrl of [
    `chrome-extension://${extensionId}/fullpage.html#/`,
    `chrome-extension://${extensionId}/desktop.html#/`,
    `chrome-extension://${extensionId}/popup.html#/`
  ]) {
    try {
      await page.goto(walletUrl, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForSelector('#root > *', { timeout }).catch(() => undefined);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function importWallet(page, seedPhrase) {
  const welcome = page.getByTestId('onboarding-welcome');
  await welcome.getByRole('button', { name: /i already have a wallet/i }).click();
  const importType = page.getByTestId('import-select-type');
  await importType.waitFor({ timeout: 30_000 });
  await importType.getByText(/import with seed phrase/i).click();

  for (let index = 0; index < seedPhrase.length; index += 1) {
    await page.locator(`#seed-phrase-input-${index}`).fill(seedPhrase[index] ?? '');
  }

  await page.getByRole('button', { name: /continue/i }).click();
  await page.waitForURL(/create-password/, { timeout: 30_000 });
  await fillWalletPassword(page);
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByText(/your wallet is ready/i).waitFor({ timeout: 120_000 });
  await page.getByRole('button', { name: /get started/i }).click();
  await page.getByText(/send/i).first().waitFor({ timeout: 120_000 });
}

async function createWallet(page) {
  const welcome = page.getByTestId('onboarding-welcome');
  await welcome.waitFor({ timeout: 30_000 });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await page.getByText(/back up your wallet/i).isVisible({ timeout: 1_000 }).catch(() => false)) break;
    await welcome.getByRole('button', { name: /create a new wallet/i }).click({ timeout: 15_000 });
    if (await page.getByText(/back up your wallet/i).isVisible({ timeout: 10_000 }).catch(() => false)) break;
    if (attempt === 9) throw new Error('Wallet create flow did not reach seed backup screen.');
    await page.waitForTimeout(3_000);
  }

  await page.getByRole('button', { name: /show/i }).click();
  await page.waitForTimeout(500);

  const seedWords = await readSeedWordsFromBackupScreen(page);
  if (seedWords.length < 12) {
    throw new Error(`Wallet create flow could not read seed phrase. Got ${seedWords.length} words.`);
  }

  await page.getByRole('button', { name: /continue/i }).click();
  const verifyContainer = page.getByTestId('verify-seed-phrase');
  await verifyContainer.waitFor({ timeout: 30_000 });
  const buttons = verifyContainer.locator('article button');
  const buttonTexts = await buttons.evaluateAll(elements => elements.map(item => (item.textContent ?? '').trim()));

  const firstWord = seedWords[0];
  const lastWord = seedWords.at(-1);
  const firstIndex = buttonTexts.indexOf(firstWord);
  let lastIndex = buttonTexts.indexOf(lastWord);
  if (lastIndex === firstIndex && lastIndex >= 0) {
    lastIndex = buttonTexts.indexOf(lastWord, firstIndex + 1);
  }
  if (firstIndex < 0 || lastIndex < 0) {
    throw new Error(`Seed verification words not found in grid. Needed ${firstWord}/${lastWord}.`);
  }

  await buttons.nth(firstIndex).click();
  await buttons.nth(lastIndex).click();
  await verifyContainer.getByRole('button', { name: /continue/i }).click();

  await page.waitForURL(/create-password/, { timeout: 30_000 });
  await fillWalletPassword(page);
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByText(/your wallet is ready/i).waitFor({ timeout: 120_000 });
  await page.getByRole('button', { name: /get started/i }).click();
  await page.getByText(/send/i).first().waitFor({ timeout: 120_000 });
}

async function readSeedWordsFromBackupScreen(page) {
  return page.evaluate(() => {
    const article = document.querySelector('article');
    if (!article) return [];
    const chips = article.querySelectorAll(':scope > label');
    const words = [];
    chips.forEach(chip => {
      const paragraphs = chip.querySelectorAll('p');
      const word = paragraphs[paragraphs.length - 1]?.textContent?.trim() ?? '';
      if (word && !/^\d+\.?$/.test(word)) words.push(word);
    });
    return words;
  });
}

async function unlockWallet(page) {
  await page.locator('input[type="password"], input[placeholder*="password" i]').first().fill(resolveWalletPassword());
  await page.getByRole('button', { name: /unlock|continue|sign in/i }).click();
  await page.getByText(/send/i).first().waitFor({ timeout: 60_000 });
}

async function fillWalletPassword(page) {
  await page.locator('input[placeholder="Enter password"]').first().fill(resolveWalletPassword());
  await page.locator('input[placeholder="Enter password again"]').first().fill(resolveWalletPassword());
}

async function isQashReady(browserContext) {
  for (const candidate of browserContext.pages()) {
    if (!isQashApplicationPage(candidate)) continue;
    const text = await candidate.locator('body').innerText({ timeout: 500 }).catch(() => '');
    if (qashAuthenticatedSurfacePattern.test(text) && await isQashApiAuthenticated(candidate)) return true;
  }
  return false;
}

function isQashApplicationPage(page) {
  try {
    return new URL(page.url()).origin === new URL(qashUrl).origin;
  } catch {
    return false;
  }
}

async function isWalletReady(page) {
  const storeReady = await page.evaluate(() => {
    const store = globalThis.__TEST_STORE__;
    const status = store?.getState?.().status;
    return status === 2 || status === 'Ready';
  }).catch(() => false);
  if (storeReady) return true;
  return page.getByText(/send/i).first().isVisible({ timeout: 500 }).catch(() => false);
}

async function isWalletLocked(page) {
  const storeLocked = await page.evaluate(() => {
    const store = globalThis.__TEST_STORE__;
    const status = store?.getState?.().status;
    return status === 1 || status === 'Locked';
  }).catch(() => false);
  if (storeLocked) return true;
  return page.locator('input[type="password"], input[placeholder*="password" i]').first()
    .isVisible({ timeout: 1_000 })
    .catch(() => false);
}

async function assertExpectedWalletAddress(page) {
  const visible = await isExpectedWalletAddressVisible(page);
  if (!visible) {
    const state = await captureWalletAccountState(page);
    if (hasSeededOfficialWalletAddress() && !state.currentAccount && state.accounts.length === 0) return;
    throw new Error(
      [
        `Miden Wallet for ${role} is ready but does not expose the expected actor wallet address.`,
        `Expected: ${actor.walletAddress}`,
        `Current account: ${state.currentAccount ?? 'none'}`,
        `Accounts: ${state.accounts.join(', ') || 'none'}`
      ].join(' ')
    );
  }
}

async function isExpectedWalletAddressVisible(page) {
  const state = await captureWalletAccountState(page);
  if (state.currentAccount === actor.walletAddress || state.accounts.includes(actor.walletAddress)) return true;
  if (hasSeededOfficialWalletAddress() && !state.currentAccount && state.accounts.length === 0) return true;
  return page.getByText(actor.walletAddress, { exact: true }).first()
    .isVisible({ timeout: 500 })
    .catch(() => false);
}

async function captureWalletAccountState(page) {
  return page.evaluate(() => {
    const store = globalThis.__TEST_STORE__;
    const state = store?.getState?.() ?? {};
    const accounts = Array.isArray(state.accounts)
      ? state.accounts.map(account => account?.publicKey).filter(Boolean)
      : [];
    return {
      status: state.status ?? null,
      selectedNetworkId: state.selectedNetworkId ?? null,
      currentAccount: state.currentAccount?.publicKey ?? null,
      accounts
    };
  }).catch(() => ({
    status: null,
    selectedNetworkId: null,
    currentAccount: null,
    accounts: []
  }));
}

function resolveWalletPassword() {
  return firstEnvValue(
    role === 'actor-a' ? 'QASH_ACTOR_A_WALLET_PASSWORD' : 'QASH_ACTOR_B_WALLET_PASSWORD',
    'QASH_ACTOR_WALLET_PASSWORD',
    'WALLET_PASSWORD'
  ) || '';
}

function resolveActorWalletSetupMode() {
  const configured = firstEnvValue(
    role === 'actor-a' ? 'QASH_ACTOR_A_WALLET_SETUP_MODE' : 'QASH_ACTOR_B_WALLET_SETUP_MODE',
    'QASH_ACTOR_WALLET_SETUP_MODE'
  );
  if (configured) {
    if (['profile', 'import', 'create'].includes(configured)) return configured;
    throw new Error(`Qash actor wallet setup mode must be profile, import, or create. Got: ${configured}`);
  }
  return resolveActorSeedPhrase() ? 'import' : 'profile';
}

function resolveActorSeedPhrase() {
  const seed = firstEnvValue(
    role === 'actor-a' ? 'QASH_ACTOR_A_TEST_ACCOUNT_SEED' : 'QASH_ACTOR_B_TEST_ACCOUNT_SEED',
    role === 'actor-a' ? 'QASH_ACTOR_A_SEED_PHRASE' : 'QASH_ACTOR_B_SEED_PHRASE',
    role === 'actor-a' ? 'QASH_ACTOR_A_WALLET_SEED' : 'QASH_ACTOR_B_WALLET_SEED',
    'QASH_ACTOR_TEST_ACCOUNT_SEED',
    'QASH_ACTOR_WALLET_SEED',
    'TEST_ACCOUNT_SEED'
  );
  if (!seed) return undefined;
  const words = seed.split(/\s+/).map(word => word.trim()).filter(Boolean);
  if (words.length < 12) {
    throw new Error(`Actor wallet seed must contain at least 12 words. Got ${words.length}.`);
  }
  return words;
}

function hasSeededOfficialWalletAddress() {
  return useInstalledWebStoreWallet && Boolean(walletExtensionPath);
}

function isClosedBrowserError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /target page, context or browser has been closed|browser has been closed|target closed/i.test(message);
}

function writeProfileState(profileDir, value) {
  fs.writeFileSync(path.join(profileDir, 'qash-actor-profile-state.json'), JSON.stringify(value, null, 2));
}

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

function resolveActorProfileDir(actorRole, envNames, fallback, options = {}) {
  const actorSpecificProfile = firstEnvValue(...envNames);
  const genericAuthProfile = options.includeGenericAuthProfile ? firstEnvValue('QASH_AUTH_USER_DATA_DIR') : undefined;

  if (browserMode === WINDOWS_CHROME_CDP_MODE) {
    const configuredProfile = actorSpecificProfile ||
      (genericAuthProfile && isWindowsBackedPath(genericAuthProfile) ? genericAuthProfile : undefined);
    return resolveWindowsActorProfileDir(actorRole, configuredProfile).wslPath;
  }

  return resolvePath(actorSpecificProfile || genericAuthProfile || fallback);
}
