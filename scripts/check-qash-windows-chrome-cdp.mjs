#!/usr/bin/env node
import './load-env.mjs';
import { chromium } from '@playwright/test';
import {
  launchWindowsChromeWithCdp,
  resolveInstalledExtensionPathForUserDataDir,
  resolveSeededActorProfileDirectory,
  resolveWindowsActorProfileDir,
  resolveWindowsPathPair
} from './windows-chrome-cdp.mjs';
import { probeQashApiAuth, qashAuthenticatedSurfacePattern, resolveQashUrl } from './qash-auth-profile.mjs';

const walletExtensionId = process.env.QASH_WALLET_EXTENSION_ID ||
  process.env.WALLET_EXTENSION_ID ||
  'ablmompanofnodfdkgchkpmphailefpb';
const walletWebStoreUrl = process.env.QASH_WALLET_WEBSTORE_URL ||
  'https://chromewebstore.google.com/detail/miden-wallet/ablmompanofnodfdkgchkpmphailefpb?pli=1';
const profile = resolveCheckProfile();
const explicitWalletPackagePath = process.env.QASH_WALLET_EXTENSION_PACKAGE_PATH?.trim();
const installedWalletExtensionPath = explicitWalletPackagePath ||
  resolveInstalledExtensionPathForUserDataDir(profile.wslPath, walletExtensionId);
const shouldStageWalletExtension = Boolean(explicitWalletPackagePath) ||
  process.env.QASH_CHECK_STAGE_WALLET_EXTENSION === 'true';
const launchedChrome = await launchWindowsChromeWithCdp({
  source: 'qash-launch-check',
  userDataDir: profile.wslPath,
  profileDirectory: resolveSeededActorProfileDirectory(profile.wslPath),
  extensionPath: shouldStageWalletExtension ? installedWalletExtensionPath || undefined : undefined,
  extensionLabel: 'qash-launch-check-wallet',
  initialUrl: resolveQashUrl(),
  windowSize: { width: 1200, height: 900 }
});

let browser;
try {
  browser = await chromium.connectOverCDP(launchedChrome.cdpEndpoint);
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error('Connected over CDP, but no persistent browser context was available.');
  }

  const cdpSession = await browser.newBrowserCDPSession();
  const targets = await cdpSession.send('Target.getTargets');
  printExtensionTargets('before wallet open', targets.targetInfos);

  const installed = await canOpenWalletPage(context, walletExtensionId);
  const qashReady = await canOpenQashAuthenticatedSurface(context);
  const targetsAfterOpen = await cdpSession.send('Target.getTargets');
  printExtensionTargets('after wallet open', targetsAfterOpen.targetInfos);
  console.log(`Windows Chrome CDP launch check passed.`);
  console.log(`Profile: ${profile.wslPath}`);
  console.log(`CDP endpoint: ${launchedChrome.cdpEndpoint}`);
  console.log(`Expected Miden Wallet extension ID: ${walletExtensionId}`);
  console.log(`Official wallet package path: ${installedWalletExtensionPath || '(not found)'}`);
  console.log(`Staged wallet package path: ${launchedChrome.extensionWindowsPath || '(not staged)'}`);
  console.log(`Miden Wallet installed in this profile: ${installed ? 'yes' : 'no'}`);
  console.log(`Qash authenticated surface visible: ${qashReady ? 'yes' : 'no'}`);
  if (!installed) console.log(`Install URL: ${walletWebStoreUrl}`);
} finally {
  await browser?.close().catch(() => undefined);
  await launchedChrome.close();
}

async function canOpenWalletPage(context, extensionId) {
  const page = await context.newPage();
  try {
    let lastError;
    for (const walletUrl of [
      `chrome-extension://${extensionId}/fullpage.html#/`,
      `chrome-extension://${extensionId}/desktop.html#/`,
      `chrome-extension://${extensionId}/popup.html#/`
    ]) {
      try {
        await page.goto(walletUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        await page.waitForSelector('#root', { timeout: 10_000 }).catch(() => undefined);
        return true;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  } catch (error) {
    console.log(`Wallet page open failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function canOpenQashAuthenticatedSurface(context) {
  const qashUrl = resolveQashUrl();
  const page = context.pages().find(candidate => candidate.url().startsWith(qashUrl)) ?? await context.newPage();
  try {
    await page.goto(qashUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const text = await page.locator('body').innerText({ timeout: 20_000 }).catch(() => '');
    const authProbe = await probeQashApiAuth(page);
    const ready = qashAuthenticatedSurfacePattern.test(text) &&
      typeof authProbe.status === 'number' &&
      authProbe.status >= 200 &&
      authProbe.status < 300;
    if (!ready) {
      console.log(`Qash body sample: ${text.replace(/\s+/g, ' ').slice(0, 800)}`);
      console.log(`Qash auth/me probe: ${JSON.stringify(authProbe)}`);
    }
    return ready;
  } catch (error) {
    console.log(`Qash authenticated surface check failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function printExtensionTargets(label, targetInfos) {
  const extensionTargets = targetInfos.filter(target => target.url.includes('chrome-extension://'));
  console.log(`Chrome extension targets ${label}: ${extensionTargets.length}`);
  for (const target of extensionTargets) {
    console.log(`Chrome extension target: ${target.type} ${target.url}`);
  }
}

function resolveCheckProfile() {
  const configured = process.env.QASH_ACTOR_PROFILE_DIR ||
    process.env.QASH_WINDOWS_CHROME_USER_DATA_DIR ||
    process.argv[2];
  if (configured?.trim()) {
    const value = configured.trim();
    if (value === 'actor-a' || value === 'actor-b' || value === 'launch-check') {
      return resolveWindowsActorProfileDir(value);
    }
    return resolveWindowsPathPair(value);
  }
  return resolveWindowsActorProfileDir('launch-check');
}
