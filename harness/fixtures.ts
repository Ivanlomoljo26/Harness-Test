import { chromium, test as base, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { getAppConfig, inferAppNameFromFile } from '../config/apps';
import { getEnvironmentConfig } from '../config/environments';
import { getRuntimeConfig, type RuntimeConfig } from '../config/schema';
import { launchWalletBrowser, type WalletBrowser } from '../wallet/wallet-extension';
import { ArtifactWriter } from './artifact-writer';
import { buildFailureReport, saveFailureReport } from './failure-report';
import { attachContextNetworkDiagnostics, attachPageDiagnostics } from './network-capture';
import { TestStepRunner } from './test-step';
import { TimelineRecorder } from './timeline-recorder';

interface PioneerFixtures {
  runtimeConfig: RuntimeConfig;
  artifacts: ArtifactWriter;
  timeline: TimelineRecorder;
  steps: TestStepRunner;
  appPage: Page;
  authenticatedAppPage: Page;
  walletBrowser: WalletBrowser;
  _failureReporter: void;
}

export const test = base.extend<PioneerFixtures>({
  runtimeConfig: async ({}, use, testInfo) => {
    const appName = inferAppNameFromFile(testInfo.file);
    const app = getAppConfig(appName);
    const config = getRuntimeConfig({ appName, requireWallet: app.requiresMidenWallet });
    await use(config);
  },

  artifacts: async ({ runtimeConfig }, use, testInfo) => {
    const artifacts = new ArtifactWriter({
      rootDir: process.cwd(),
      appName: runtimeConfig.appName,
      scenarioName: testInfo.titlePath.join(' '),
      networkName: runtimeConfig.network.name
    });
    artifacts.writeJson('run-context.json', {
      app: getAppConfig(runtimeConfig.appName),
      network: getEnvironmentConfig(runtimeConfig.network.name),
      testFile: testInfo.file,
      testTitle: testInfo.title
    });
    await use(artifacts);
  },

  timeline: async ({ artifacts }, use, testInfo) => {
    const timeline = new TimelineRecorder(artifacts.identity.outputDir);
    timeline.emit({
      category: 'test_lifecycle',
      severity: 'info',
      source: 'playwright',
      message: `Test started: ${testInfo.title}`,
      data: {
        file: testInfo.file,
        titlePath: testInfo.titlePath
      }
    });

    await use(timeline);

    timeline.emit({
      category: 'test_lifecycle',
      severity: testInfo.status === 'passed' ? 'info' : 'error',
      source: 'playwright',
      message: `Test finished with status ${testInfo.status}`,
      data: {
        status: testInfo.status,
        expectedStatus: testInfo.expectedStatus,
        duration: testInfo.duration
      }
    });
    await timeline.close();
  },

  steps: async ({ timeline, artifacts }, use) => {
    const runner = new TestStepRunner(timeline, artifacts);
    await use(runner);
    runner.save();
  },

  appPage: async ({ page, context, timeline }, use) => {
    attachContextNetworkDiagnostics(context, 'browser-context', timeline);
    attachPageDiagnostics(page, 'app-page', timeline);
    await use(page);
  },

  authenticatedAppPage: async ({ runtimeConfig, timeline }, use) => {
    if (!runtimeConfig.appAuthUserDataDir && !runtimeConfig.appAuthCdpEndpoint) {
      throw new Error(
        'Authenticated app page requires QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, ' +
          'QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT. Run `yarn qash:profile` first, ' +
          'or use a CDP runner for an existing browser profile.'
      );
    }

    if (runtimeConfig.appAuthCdpEndpoint) {
      const browser = await chromium.connectOverCDP(runtimeConfig.appAuthCdpEndpoint);
      const { context, page, createdContext } = await pickCdpAppPage(browser, runtimeConfig.appUrl);

      attachContextNetworkDiagnostics(context, 'authenticated-cdp-browser-context', timeline);
      attachPageDiagnostics(page, 'authenticated-cdp-app-page', timeline);

      timeline.emit({
        category: 'test_lifecycle',
        severity: 'info',
        source: 'app-auth-cdp',
        message: 'Authenticated app browser connected over CDP',
        data: {
          endpoint: runtimeConfig.appAuthCdpEndpoint,
          appUrl: runtimeConfig.appUrl,
          createdContext
        }
      });

      try {
        await use(page);
      } finally {
        await browser.close();
      }
      return;
    }

    const userDataDir = runtimeConfig.appAuthUserDataDir;
    if (!userDataDir) {
      throw new Error('Authenticated app page requires a prepared app auth user-data directory.');
    }

    const authenticatedViewport = resolveAuthenticatedViewport();
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: process.env.HEADLESS !== 'false',
      viewport: authenticatedViewport,
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        `--window-size=${authenticatedViewport.width},${authenticatedViewport.height}`
      ]
    });

    attachContextNetworkDiagnostics(context, 'authenticated-browser-context', timeline);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.setViewportSize(authenticatedViewport);
    attachPageDiagnostics(page, 'authenticated-app-page', timeline);

    timeline.emit({
      category: 'test_lifecycle',
      severity: 'info',
      source: 'app-auth-profile',
      message: 'Authenticated app browser launched',
      data: {
        userDataDir
      }
    });

    try {
      await use(page);
    } finally {
      await context.close();
    }
  },

  _failureReporter: [async ({ steps, timeline, artifacts }, use, testInfo) => {
    let caughtError: unknown;
    try {
      await use();
    } catch (error) {
      caughtError = error;
      throw error;
    } finally {
      const error = caughtError ?? (testInfo.error ? new Error(testInfo.error.message) : undefined);
      if (testInfo.status !== 'passed' && error) {
        const report = buildFailureReport({
          error,
          checkpoints: steps.all(),
          timeline,
          artifacts,
          testTimeoutMs: testInfo.timeout
        });
        saveFailureReport(report, artifacts);
      }
    }
  }, { auto: true }],

  walletBrowser: async ({ runtimeConfig, timeline }, use, testInfo) => {
    const walletBrowser = await launchWalletBrowser(runtimeConfig, timeline);
    let testFailed = false;

    try {
      await use(walletBrowser);
      testFailed = testInfo.status !== 'passed';
    } catch (error) {
      testFailed = true;
      throw error;
    } finally {
      await walletBrowser.close(testFailed ? 'failed' : 'passed');
    }
  }
});

export { expect };

function resolveAuthenticatedViewport(): { width: number; height: number } {
  const width = Number(process.env.APP_AUTH_VIEWPORT_WIDTH ?? process.env.QASH_AUTH_VIEWPORT_WIDTH ?? 1440);
  const height = Number(process.env.APP_AUTH_VIEWPORT_HEIGHT ?? process.env.QASH_AUTH_VIEWPORT_HEIGHT ?? 1000);

  return {
    width: Number.isFinite(width) && width > 0 ? width : 1440,
    height: Number.isFinite(height) && height > 0 ? height : 1000
  };
}

async function pickCdpAppPage(browser: Browser, appUrl: string): Promise<{
  context: BrowserContext;
  page: Page;
  createdContext: boolean;
}> {
  const contexts = browser.contexts();
  const existingContext = contexts[0];
  const context = existingContext ?? (await browser.newContext());
  const appOrigin = new URL(appUrl).origin;
  const existingAppPage = context.pages().find(candidate => {
    const url = candidate.url();
    return url === appUrl || url.startsWith(`${appOrigin}/`);
  });

  return {
    context,
    page: existingAppPage ?? context.pages()[0] ?? (await context.newPage()),
    createdContext: !existingContext
  };
}
