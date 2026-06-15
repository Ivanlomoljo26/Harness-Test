import { chromium, type Browser, type BrowserContext, type Page, type Worker } from '@playwright/test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { RuntimeConfig } from '../config/schema';
import { attachContextNetworkDiagnostics, attachPageDiagnostics } from '../harness/network-capture';
import type { TimelineRecorder } from '../harness/timeline-recorder';
import { WalletPage } from './wallet-page';

export interface WalletBrowser {
  context: BrowserContext;
  appPage: Page;
  wallet: WalletPage;
  extensionId: string;
  userDataDir: string;
  close: (status?: 'passed' | 'failed') => Promise<void>;
}

export interface WalletBrowserLaunchOptions {
  userDataDir?: string;
  cdpEndpoint?: string;
  walletExtensionId?: string;
  detectExtensionId?: boolean;
  walletSetupMode?: RuntimeConfig['walletSetupMode'];
  seedPhrase?: string[];
  source?: string;
  headless?: boolean;
  viewport?: { width: number; height: number };
}

export async function launchWalletBrowser(
  config: RuntimeConfig,
  timeline: TimelineRecorder,
  options: WalletBrowserLaunchOptions = {}
): Promise<WalletBrowser> {
  const userDataDir = options.userDataDir ?? config.walletUserDataDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'pioneer-wallet-'));
  const setupMode = options.walletSetupMode ?? config.walletSetupMode;
  const source = options.source ?? 'wallet';
  let cdpBrowser: Browser | undefined;
  let context: BrowserContext;

  if (options.cdpEndpoint) {
    cdpBrowser = await chromium.connectOverCDP(options.cdpEndpoint);
    const defaultContext = cdpBrowser.contexts()[0];
    if (!defaultContext) {
      await cdpBrowser.close().catch(() => undefined);
      throw new Error(`Connected to ${options.cdpEndpoint}, but no persistent browser context was available.`);
    }
    context = defaultContext;
  } else {
    const launchOptions: NonNullable<Parameters<typeof chromium.launchPersistentContext>[1]> = {
      headless: options.headless ?? false,
      args: [
        `--disable-extensions-except=${config.walletExtensionPath}`,
        `--load-extension=${config.walletExtensionPath}`,
        '--no-first-run',
        '--no-default-browser-check',
        ...(options.viewport ? [`--window-size=${options.viewport.width},${options.viewport.height}`] : [])
      ],
      ignoreDefaultArgs: ['--disable-extensions']
    };
    if (options.viewport) launchOptions.viewport = options.viewport;

    context = await chromium.launchPersistentContext(userDataDir, launchOptions);
  }

  attachContextNetworkDiagnostics(context, `${source}-browser-context`, timeline);

  const configuredExtensionId = options.detectExtensionId
    ? undefined
    : options.walletExtensionId ?? config.walletExtensionId;
  const extensionId = configuredExtensionId ?? new URL((await waitForExtensionServiceWorker(context)).url()).host;
  const serviceWorker = await waitForExtensionServiceWorker(context, extensionId, configuredExtensionId ? 10_000 : 90_000)
    .catch(() => undefined);

  serviceWorker?.on('console', message => {
    timeline.emit({
      category: 'browser_console',
      severity: message.type() === 'error' ? 'error' : message.type() === 'warning' ? 'warn' : 'info',
      source: `${source}-wallet-service-worker`,
      message: `[${source}-wallet-service-worker] ${message.type()}: ${message.text()}`,
      data: { text: message.text(), type: message.type() }
    });
  });
  await serviceWorker?.evaluate(() => {
    (globalThis as unknown as { __e2e_errors?: string[] }).__e2e_errors = [];
    globalThis.addEventListener('error', event => {
      (globalThis as unknown as { __e2e_errors: string[] }).__e2e_errors.push(
        `error: ${event.message || String(event)}`
      );
    });
    globalThis.addEventListener('unhandledrejection', event => {
      const reason = event.reason as { stack?: string; message?: string } | undefined;
      (globalThis as unknown as { __e2e_errors: string[] }).__e2e_errors.push(
        `rejection: ${String(reason?.stack || reason?.message || event.reason || 'unknown')}`
      );
    });
  }).catch(() => undefined);

  const walletPage = options.cdpEndpoint
    ? await openWalletPage(context, extensionId)
    : await openFreshExtensionWalletPage(context, extensionId, source, timeline, serviceWorker);
  attachPageDiagnostics(walletPage, `${source}-wallet-page`, timeline);

  const appPage = await context.newPage();
  if (options.viewport) {
    await appPage.setViewportSize(options.viewport);
  }
  attachPageDiagnostics(appPage, `${source}-app-page`, timeline);

  const wallet = new WalletPage({
    page: walletPage,
    context,
    extensionId,
    password: config.walletPassword,
    setupMode,
    seedPhrase: options.seedPhrase ?? config.testAccountSeed,
    timeline
  });

  timeline.emit({
    category: 'test_lifecycle',
    severity: 'info',
    source,
    message: 'Wallet browser launched',
    data: {
      extensionId,
      userDataDir,
      launchMode: options.cdpEndpoint ? 'cdp' : 'persistent-context',
      cdpEndpoint: options.cdpEndpoint,
      reusedUserDataDir: Boolean(options.userDataDir ?? config.walletUserDataDir)
    }
  });

  return {
    context,
    appPage,
    wallet,
    extensionId,
    userDataDir,
    close: async status => {
      if (status === 'failed' && config.keepBrowserOnFailure) {
        timeline.emit({
          category: 'test_lifecycle',
          severity: 'warn',
          source,
          message: 'Keeping browser open after failure because E2E_KEEP_BROWSER_ON_FAILURE=true',
          data: { userDataDir, extensionId }
        });
        return;
      }

      if (cdpBrowser) {
        await cdpBrowser.close().catch(() => undefined);
      } else {
        await context.close();
      }
      if (!options.userDataDir && !config.walletUserDataDir) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      }
    }
  };
}

async function waitForExtensionServiceWorker(
  context: BrowserContext,
  extensionId?: string,
  timeoutMs = 90_000
): Promise<Worker> {
  const existing = context.serviceWorkers().find(worker => {
    if (!extensionId) return worker.url().startsWith('chrome-extension://');
    return new URL(worker.url()).host === extensionId;
  });
  if (existing) return existing;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const worker = context.serviceWorkers().find(candidate => {
      if (!extensionId) return candidate.url().startsWith('chrome-extension://');
      return new URL(candidate.url()).host === extensionId;
    });
    if (worker) return worker;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return context.waitForEvent('serviceworker', {
    timeout: 30_000,
    predicate: worker => !extensionId || new URL(worker.url()).host === extensionId
  });
}

async function openWalletPage(context: BrowserContext, extensionId: string): Promise<Page> {
  const existing = context.pages().find(page => page.url().startsWith(`chrome-extension://${extensionId}/`));
  const page = existing ?? (await context.newPage());
  return gotoWalletHome(page, extensionId);
}

async function openFreshExtensionWalletPage(
  context: BrowserContext,
  extensionId: string,
  source: string,
  timeline: TimelineRecorder,
  serviceWorker?: Worker
): Promise<Page> {
  await new Promise(resolve => setTimeout(resolve, 3_000));

  let page = context.pages().find(candidate => candidate.url().includes(extensionId));
  if (!page) {
    page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/fullpage.html`, { waitUntil: 'domcontentloaded' });
  }

  for (const candidate of context.pages()) {
    if (candidate !== page) await candidate.close().catch(() => undefined);
  }

  const earlyErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') earlyErrors.push(message.text());
  });

  const maxLoadAttempts = 3;
  const attemptTimeoutMs = 90_000;

  for (let attempt = 1; attempt <= maxLoadAttempts; attempt += 1) {
    timeline.emit({
      category: 'test_lifecycle',
      severity: 'info',
      source,
      message: `Waiting for fresh wallet to initialize (attempt ${attempt}/${maxLoadAttempts})`
    });

    try {
      await page
        .locator('[data-testid="onboarding-welcome"]')
        .or(page.locator('[data-testid="receive-page"]'))
        .or(page.getByText('Send'))
        .first()
        .waitFor({ timeout: attemptTimeoutMs });

      timeline.emit({
        category: 'test_lifecycle',
        severity: 'info',
        source,
        message: `Fresh wallet initialized on attempt ${attempt}`
      });
      return page;
    } catch {
      const serviceWorkerErrors = await readServiceWorkerErrors(serviceWorker);
      if (serviceWorkerErrors.length > 0) {
        timeline.emit({
          category: 'browser_console',
          severity: 'error',
          source: `${source}-wallet-service-worker`,
          message: `Fresh wallet service worker errors: ${serviceWorkerErrors.join(' | ')}`
        });
      }

      if (attempt === maxLoadAttempts) {
        throw new Error(
          `Fresh wallet failed to initialize after ${maxLoadAttempts} attempts ` +
            `(${(maxLoadAttempts * attemptTimeoutMs) / 1000}s total). ` +
            `Console errors: ${earlyErrors.join('; ') || 'none'}.`
        );
      }

      timeline.emit({
        category: 'test_lifecycle',
        severity: 'warn',
        source,
        message: `Fresh wallet still loading on attempt ${attempt}; reloading before retry`,
        data: {
          earlyErrors: [...earlyErrors],
          serviceWorkerErrors
        }
      });
      earlyErrors.length = 0;
      await new Promise(resolve => setTimeout(resolve, 3_000));
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('#root > *', { timeout: 15_000 }).catch(() => undefined);
    }
  }

  return page;
}

async function readServiceWorkerErrors(serviceWorker?: Worker): Promise<string[]> {
  if (!serviceWorker) return [];
  return serviceWorker.evaluate(() => {
    const errors = (globalThis as unknown as { __e2e_errors?: unknown }).__e2e_errors;
    return Array.isArray(errors) ? errors.slice(0, 10).map(String) : [];
  }).catch(() => []);
}

async function gotoWalletHome(page: Page, extensionId: string): Promise<Page> {
  let lastError: unknown;
  for (const walletUrl of [
    `chrome-extension://${extensionId}/fullpage.html#/`,
    `chrome-extension://${extensionId}/desktop.html#/`,
    `chrome-extension://${extensionId}/popup.html#/`
  ]) {
    try {
      await page.goto(walletUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#root > *', { timeout: 60_000 }).catch(() => undefined);
      return page;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
