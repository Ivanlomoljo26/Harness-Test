import * as fs from 'node:fs';
import * as path from 'node:path';

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';

import type { RuntimeConfig } from '../../config/schema';
import { attachContextNetworkDiagnostics, attachPageDiagnostics } from '../../harness/network-capture';
import type { TimelineRecorder } from '../../harness/timeline-recorder';
import { launchWalletBrowser, type WalletBrowser, type WalletBrowserLaunchOptions } from '../../wallet/wallet-extension';
import { QashAdapter } from './adapter';

export interface QashActorIdentity {
  role: 'actor-a' | 'actor-b';
  email: string;
  accountId: string;
  walletAddress: string;
  profileDir: string;
}

export interface QashActorRuntime {
  identity: QashActorIdentity;
  browser?: WalletBrowser;
  page: Page;
  app: QashAdapter;
  close(status?: 'passed' | 'failed'): Promise<void>;
}

export interface QashPayerWalletRuntime extends QashActorRuntime {
  browser: WalletBrowser;
}

export interface QashPayerWalletProvisioning {
  setupMode: NonNullable<WalletBrowserLaunchOptions['walletSetupMode']>;
  fundingSource: 'fresh-create' | 'seed-import' | 'profile';
  seedPhrase?: string[];
  userDataDir?: string;
}

export async function launchQashActorRuntime(options: {
  identity: QashActorIdentity;
  runtimeConfig: RuntimeConfig;
  timeline: TimelineRecorder;
  viewport: { width: number; height: number };
  walletMode?: 'auth-only' | 'wallet-enabled';
}): Promise<QashActorRuntime> {
  const { identity, runtimeConfig, timeline, viewport } = options;
  const walletMode = options.walletMode ?? 'wallet-enabled';
  assertActorRuntimePrerequisites(identity, runtimeConfig, walletMode === 'wallet-enabled');
  if (walletMode === 'auth-only') {
    return launchQashAuthOnlyActorRuntime({ identity, runtimeConfig, timeline, viewport });
  }

  const cdpEndpoint = resolveActorCdpEndpoint(identity.role);

  const launchOptions: WalletBrowserLaunchOptions = {
    userDataDir: identity.profileDir,
    walletSetupMode: resolveActorWalletSetupMode(identity.role),
    source: `qash-${identity.role}`,
    headless: process.env.HEADLESS === 'true',
    viewport
  };
  if (cdpEndpoint) launchOptions.cdpEndpoint = cdpEndpoint;
  if (runtimeConfig.walletExtensionId) launchOptions.walletExtensionId = runtimeConfig.walletExtensionId;

  const browser = await launchWalletBrowser(runtimeConfig, timeline, launchOptions);

  await browser.wallet.prepareWallet();
  await browser.wallet.assertNetwork(runtimeConfig.network.name);
  const runtimeIdentity = await captureRuntimeWalletIdentity({
    identity,
    browser,
    timeline,
    freshWalletSession: isFreshActorWalletSession()
  });

  const app = new QashAdapter(browser.appPage, timeline);
  await app.open();
  await assertActorQashApiAuthenticated(browser.appPage, runtimeIdentity, timeline);
  return {
    identity: runtimeIdentity,
    browser,
    page: browser.appPage,
    app,
    close: browser.close
  };
}

export async function launchQashFreshPayerWalletRuntime(options: {
  identity: QashActorIdentity;
  runtimeConfig: RuntimeConfig;
  timeline: TimelineRecorder;
  viewport: { width: number; height: number };
  source?: string;
}): Promise<QashPayerWalletRuntime> {
  const { identity, runtimeConfig, timeline, viewport } = options;
  const manifestPath = path.join(runtimeConfig.walletExtensionPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Fresh Qash payer wallet requires a built Miden wallet extension. ` +
        `No manifest.json found at ${runtimeConfig.walletExtensionPath}. ` +
        'Build the wallet harness extension first, then rerun.'
    );
  }

  const provisioning = resolveQashPayerWalletProvisioning(identity.role);
  const launchOptions: WalletBrowserLaunchOptions = {
    walletSetupMode: provisioning.setupMode,
    source: options.source ?? `qash-${identity.role}-fresh-payer-wallet`,
    headless: process.env.HEADLESS === 'true',
    viewport,
    detectExtensionId: true
  };
  if (provisioning.seedPhrase) launchOptions.seedPhrase = provisioning.seedPhrase;
  if (provisioning.userDataDir) launchOptions.userDataDir = provisioning.userDataDir;

  const browser = await launchWalletBrowser(runtimeConfig, timeline, launchOptions);

  await browser.wallet.prepareWallet();
  await browser.wallet.assertNetwork(runtimeConfig.network.name);

  const walletAddress = await browser.wallet.currentWalletAddress();
  if (!walletAddress) {
    throw new Error(`Fresh payer wallet for ${identity.role} did not expose a runtime wallet address after creation.`);
  }

  const runtimeIdentity = { ...identity, walletAddress };
  timeline.emit({
    category: 'wallet_ui',
    severity: 'info',
    source: `qash-${identity.role}-fresh-payer-wallet`,
    message: 'Fresh Qash payer wallet created with harness lifecycle',
    data: {
      role: identity.role,
      email: identity.email,
      accountId: identity.accountId,
      configuredWalletAddress: identity.walletAddress,
      runtimeWalletAddress: walletAddress,
      walletSetupMode: provisioning.setupMode,
      fundingSource: provisioning.fundingSource,
      extensionId: browser.extensionId,
      userDataDir: browser.userDataDir
    }
  });

  return {
    identity: runtimeIdentity,
    browser,
    page: browser.appPage,
    app: new QashAdapter(browser.appPage, timeline),
    close: browser.close
  };
}

export function resolveQashPayerWalletProvisioning(
  role: QashActorIdentity['role']
): QashPayerWalletProvisioning {
  const rolePrefix = role === 'actor-a' ? 'QASH_ACTOR_A' : 'QASH_ACTOR_B';
  const configured = firstEnvValue(
    `${rolePrefix}_PAYER_WALLET_SETUP_MODE`,
    'QASH_PAYER_WALLET_SETUP_MODE'
  );
  const seedPhrase = resolveQashPayerWalletSeedPhrase(role);
  const userDataDir = resolveQashPayerWalletUserDataDir(role);

  if (configured) {
    if (configured !== 'create' && configured !== 'import' && configured !== 'profile') {
      throw new Error(
        `${rolePrefix}_PAYER_WALLET_SETUP_MODE must be create, import, or profile. Got: ${configured}.`
      );
    }
    if (configured === 'import' && !seedPhrase) {
      throw new Error(
        `Qash ${role} payer wallet import mode requires a seed. Set ${rolePrefix}_PAYER_TEST_ACCOUNT_SEED, QASH_PAYER_TEST_ACCOUNT_SEED, or TEST_ACCOUNT_SEED.`
      );
    }
    if (configured === 'profile' && !userDataDir) {
      throw new Error(
        `Qash ${role} payer wallet profile mode requires ${rolePrefix}_PAYER_WALLET_USER_DATA_DIR or QASH_PAYER_WALLET_USER_DATA_DIR.`
      );
    }
    return {
      setupMode: configured,
      fundingSource: configured === 'import' ? 'seed-import' : configured === 'profile' ? 'profile' : 'fresh-create',
      ...(seedPhrase ? { seedPhrase } : {}),
      ...(userDataDir ? { userDataDir } : {})
    };
  }

  if (seedPhrase) {
    return {
      setupMode: 'import',
      fundingSource: 'seed-import',
      seedPhrase
    };
  }

  if (userDataDir) {
    return {
      setupMode: 'profile',
      fundingSource: 'profile',
      userDataDir
    };
  }

  return {
    setupMode: 'create',
    fundingSource: 'fresh-create'
  };
}

function resolveQashPayerWalletSeedPhrase(role: QashActorIdentity['role']): string[] | undefined {
  const rolePrefix = role === 'actor-a' ? 'QASH_ACTOR_A' : 'QASH_ACTOR_B';
  const seed = firstEnvValue(
    `${rolePrefix}_PAYER_TEST_ACCOUNT_SEED`,
    `${rolePrefix}_PAYER_SEED_PHRASE`,
    `${rolePrefix}_PAYER_WALLET_SEED`,
    'QASH_PAYER_TEST_ACCOUNT_SEED',
    'QASH_PAYER_WALLET_SEED',
    `${rolePrefix}_TEST_ACCOUNT_SEED`,
    `${rolePrefix}_SEED_PHRASE`,
    `${rolePrefix}_WALLET_SEED`,
    'QASH_ACTOR_TEST_ACCOUNT_SEED',
    'QASH_ACTOR_WALLET_SEED',
    'TEST_ACCOUNT_SEED'
  );
  if (!seed) return undefined;
  const words = seed.split(/\s+/).map(word => word.trim()).filter(Boolean);
  if (words.length < 12) {
    throw new Error(`Qash ${role} payer wallet seed must contain at least 12 words. Got ${words.length}.`);
  }
  return words;
}

function resolveQashPayerWalletUserDataDir(role: QashActorIdentity['role']): string | undefined {
  const rolePrefix = role === 'actor-a' ? 'QASH_ACTOR_A' : 'QASH_ACTOR_B';
  const value = firstEnvValue(
    `${rolePrefix}_PAYER_WALLET_USER_DATA_DIR`,
    'QASH_PAYER_WALLET_USER_DATA_DIR',
    'WALLET_USER_DATA_DIR'
  );
  return value ? path.resolve(value) : undefined;
}

async function launchQashAuthOnlyActorRuntime(options: {
  identity: QashActorIdentity;
  runtimeConfig: RuntimeConfig;
  timeline: TimelineRecorder;
  viewport: { width: number; height: number };
}): Promise<QashActorRuntime> {
  const { identity, runtimeConfig, timeline, viewport } = options;
  const cdpEndpoint = resolveActorCdpEndpoint(identity.role);
  const source = `qash-${identity.role}-auth`;
  let cdpBrowser: Browser | undefined;
  let context: BrowserContext;

  if (cdpEndpoint) {
    cdpBrowser = await chromium.connectOverCDP(cdpEndpoint);
    const defaultContext = cdpBrowser.contexts()[0];
    if (!defaultContext) {
      await cdpBrowser.close().catch(() => undefined);
      throw new Error(`Connected to ${cdpEndpoint}, but no persistent browser context was available.`);
    }
    context = defaultContext;
  } else {
    context = await chromium.launchPersistentContext(identity.profileDir, {
      headless: process.env.HEADLESS === 'true',
      viewport,
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        `--window-size=${viewport.width},${viewport.height}`
      ]
    });
  }

  attachContextNetworkDiagnostics(context, `${source}-browser-context`, timeline);
  const page = await pickQashAppPage(context, runtimeConfig.appUrl);
  await page.setViewportSize(viewport).catch(() => undefined);
  attachPageDiagnostics(page, `${source}-app-page`, timeline);
  await restoreActorStorageState({
    context,
    page,
    identity,
    appUrl: runtimeConfig.appUrl,
    timeline
  });

  timeline.emit({
    category: 'test_lifecycle',
    severity: 'info',
    source,
    message: 'Qash auth-only actor browser launched',
    data: {
      role: identity.role,
      email: identity.email,
      accountId: identity.accountId,
      profileDir: identity.profileDir,
      launchMode: cdpEndpoint ? 'cdp' : 'persistent-context',
      cdpEndpoint
    }
  });

  const app = new QashAdapter(page, timeline);
  await app.open();
  await assertActorQashApiAuthenticated(page, identity, timeline);

  return {
    identity,
    page,
    app,
    close: async () => {
      if (cdpBrowser) {
        await cdpBrowser.close().catch(() => undefined);
      } else {
        await context.close().catch(() => undefined);
      }
    }
  };
}

async function restoreActorStorageState(options: {
  context: BrowserContext;
  page: Page;
  identity: QashActorIdentity;
  appUrl: string;
  timeline: TimelineRecorder;
}): Promise<void> {
  const { context, page, identity, appUrl, timeline } = options;
  const storageStatePath = path.join(identity.profileDir, 'storage-state.json');
  if (!fs.existsSync(storageStatePath)) return;

  const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf8')) as {
    cookies?: Array<Parameters<BrowserContext['addCookies']>[0][number]>;
    origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }>;
  };

  if (storageState.cookies?.length) {
    await context.addCookies(storageState.cookies).catch(error => {
      timeline.emit({
        category: 'app_ui',
        severity: 'warn',
        source: `qash-${identity.role}-auth`,
        message: 'Could not restore Qash actor cookies from saved storage state',
        data: { error: error instanceof Error ? error.message : String(error), storageStatePath }
      });
    });
  }

  const appOrigin = new URL(appUrl).origin;
  const originState = storageState.origins?.find(origin => origin.origin === appOrigin);
  if (originState?.localStorage?.length) {
    await page.goto(appOrigin, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await page.evaluate(entries => {
      for (const entry of entries) {
        window.localStorage.setItem(entry.name, entry.value);
      }
    }, originState.localStorage).catch(error => {
      timeline.emit({
        category: 'app_ui',
        severity: 'warn',
        source: `qash-${identity.role}-auth`,
        message: 'Could not restore Qash actor localStorage from saved storage state',
        data: { error: error instanceof Error ? error.message : String(error), storageStatePath }
      });
    });
  }

  timeline.emit({
    category: 'app_ui',
    severity: 'info',
    source: `qash-${identity.role}-auth`,
    message: 'Qash actor storage state restored before auth preflight',
    data: {
      storageStatePath,
      cookieCount: storageState.cookies?.length ?? 0,
      originCount: storageState.origins?.length ?? 0
    }
  });
}

async function pickQashAppPage(context: BrowserContext, appUrl: string): Promise<Page> {
  const appOrigin = new URL(appUrl).origin;
  const existing = context.pages().find(candidate => {
    const url = candidate.url();
    return url === appUrl || url.startsWith(`${appOrigin}/`);
  });
  return existing ?? context.pages()[0] ?? (await context.newPage());
}

function resolveActorCdpEndpoint(role: QashActorIdentity['role']): string | undefined {
  const rolePrefix = role === 'actor-a' ? 'QASH_ACTOR_A' : 'QASH_ACTOR_B';
  return process.env[`${rolePrefix}_CDP_ENDPOINT`]?.trim() ||
    process.env.QASH_ACTOR_CDP_ENDPOINT?.trim() ||
    undefined;
}

function resolveActorWalletSetupMode(
  role: QashActorIdentity['role']
): NonNullable<WalletBrowserLaunchOptions['walletSetupMode']> {
  const rolePrefix = role === 'actor-a' ? 'QASH_ACTOR_A' : 'QASH_ACTOR_B';
  const configured = process.env[`${rolePrefix}_WALLET_SETUP_MODE`]?.trim() ||
    process.env.QASH_ACTOR_WALLET_SETUP_MODE?.trim();
  if (configured) {
    if (configured === 'create' || configured === 'import' || configured === 'profile') return configured;
    throw new Error(`Unsupported ${rolePrefix}_WALLET_SETUP_MODE: ${configured}. Use create, import, or profile.`);
  }
  return isFreshActorWalletSession() ? 'create' : 'profile';
}

async function captureRuntimeWalletIdentity(options: {
  identity: QashActorIdentity;
  browser: WalletBrowser;
  timeline: TimelineRecorder;
  freshWalletSession: boolean;
}): Promise<QashActorIdentity> {
  const { identity, browser, timeline, freshWalletSession } = options;
  const walletAddress = await browser.wallet.currentWalletAddress();
  const runtimeIdentity = freshWalletSession && walletAddress
    ? { ...identity, walletAddress }
    : identity;

  timeline.emit({
    category: 'wallet_ui',
    severity: walletAddress ? 'info' : 'warn',
    source: `qash-${identity.role}`,
    message: walletAddress
      ? 'Qash actor runtime wallet address captured'
      : 'Qash actor runtime wallet address was not exposed before app connection',
    data: {
      role: identity.role,
      email: identity.email,
      accountId: identity.accountId,
      profileDir: identity.profileDir,
      configuredWalletAddress: identity.walletAddress,
      runtimeWalletAddress: walletAddress ?? null,
      freshWalletSession
    }
  });

  if (freshWalletSession && walletAddress) {
    writeRuntimeWalletState(identity.profileDir, {
      role: identity.role,
      email: identity.email,
      accountId: identity.accountId,
      profileDir: identity.profileDir,
      extensionId: browser.extensionId,
      walletAddress,
      configuredWalletAddress: identity.walletAddress,
      freshWalletSession,
      capturedAt: new Date().toISOString()
    });
  }

  return runtimeIdentity;
}

function writeRuntimeWalletState(profileDir: string, value: unknown): void {
  fs.writeFileSync(
    path.join(profileDir, 'qash-runtime-wallet-state.json'),
    `${JSON.stringify(value, null, 2)}\n`
  );
}

function isFreshActorWalletSession(): boolean {
  const configured = process.env.QASH_ACTOR_FRESH_WALLET_EACH_SESSION?.trim() ||
    process.env.QASH_FRESH_WALLET_EACH_SESSION?.trim();
  if (!configured) return false;
  return !['0', 'false', 'no', 'off'].includes(configured.toLowerCase());
}

function firstEnvValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function assertActorRuntimePrerequisites(
  identity: QashActorIdentity,
  runtimeConfig: RuntimeConfig,
  requireWallet: boolean
): void {
  if (!fs.existsSync(identity.profileDir)) {
    throw new Error(
      `Qash ${identity.role} profile does not exist: ${identity.profileDir}. ` +
        `Prepare it with yarn qash:actor-profile ${identity.role}.`
    );
  }

  const manifestPath = path.join(runtimeConfig.walletExtensionPath, 'manifest.json');
  if (requireWallet && !runtimeConfig.walletExtensionId && !fs.existsSync(manifestPath)) {
    throw new Error(
      `Qash ${identity.role} payment requires a built Miden wallet extension. ` +
        `No manifest.json found at ${runtimeConfig.walletExtensionPath}.`
    );
  }
}

async function assertActorQashApiAuthenticated(
  page: Page,
  identity: QashActorIdentity,
  timeline: TimelineRecorder
): Promise<void> {
  const probe = await page.evaluate(async () => {
    const response = await fetch('https://api.qash.finance/auth/me', { credentials: 'include' });
    const body = await response.text();
    return { status: response.status, body: body.slice(0, 500) };
  }).catch(error => ({
    status: 'ERR',
    body: error instanceof Error ? error.message : String(error)
  }));

  timeline.emit({
    category: 'network_request',
    severity: typeof probe.status === 'number' && probe.status >= 200 && probe.status < 300 ? 'info' : 'error',
    source: `qash-${identity.role}`,
    message: 'Qash actor API auth preflight completed',
    data: {
      role: identity.role,
      email: identity.email,
      accountId: identity.accountId,
      profileDir: identity.profileDir,
      status: probe.status,
      body: probe.body
    }
  });

  if (typeof probe.status === 'number' && probe.status >= 200 && probe.status < 300) return;

  throw new Error(
    [
      `Qash ${identity.role} profile is not API-authenticated for ${identity.email}.`,
      `GET https://api.qash.finance/auth/me returned ${probe.status}.`,
      probe.body ? `Response sample: ${probe.body}` : null,
      `Refresh this actor with: yarn qash:actor-profile ${identity.role}`,
      'Complete Qash/Para login in the opened Chrome window, wait for the helper to verify Qash auth, then rerun the money-movement command immediately.'
    ].filter(Boolean).join(' ')
  );
}
