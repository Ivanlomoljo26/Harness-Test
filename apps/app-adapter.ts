import type { Locator, Page, Response } from '@playwright/test';
import { expect } from '@playwright/test';

import type { PioneerAppConfig } from '../config/apps';
import type { TimelineRecorder } from '../harness/timeline-recorder';

export interface AppAdapter {
  readonly config: PioneerAppConfig;
  open(): Promise<void>;
  assertReady(): Promise<void>;
  connectWallet?(): Promise<void>;
  assertWalletConnected?(): Promise<void>;
  captureAppState(): Promise<unknown>;
}

export abstract class BaseAppAdapter implements AppAdapter {
  abstract readonly config: PioneerAppConfig;
  protected readonly allowErrorDocumentStatus: boolean = false;

  protected constructor(
    protected readonly page: Page,
    protected readonly timeline: TimelineRecorder
  ) {}

  async open(): Promise<void> {
    const response = await this.navigateToAppUrl();
    const status = response?.status() ?? 0;
    if (status >= 400) {
      const message =
        `App availability warning: ${this.config.displayName} returned HTTP ${status} for ${this.config.url}. ` +
        `Readiness selectors will determine whether the hydrated app is usable.`;
      if (!this.allowErrorDocumentStatus) {
        throw new Error(
          `App availability failure: ${this.config.displayName} returned HTTP ${status} for ${this.config.url}. ` +
            `Check ${this.config.networkUrlEnv} or ${this.config.urlEnv} if this app has a network-specific deployment.`
        );
      }
      this.timeline.emit({
        category: 'app_availability',
        severity: 'warn',
        source: this.config.name,
        message,
        data: { url: this.config.url, status }
      });
    }
    await this.page.locator('body').waitFor({ timeout: 60_000 });
    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: `${this.config.displayName} opened`,
      data: { url: this.page.url(), status }
    });
  }

  protected async navigateToAppUrl(): Promise<Response | null | undefined> {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('net::ERR_ABORTED')) throw error;

        const blankDocument = await this.isBlankDocument();
        const canRetry = blankDocument && attempt < maxAttempts;
        this.timeline.emit({
          category: 'app_availability',
          severity: 'warn',
          source: this.config.name,
          message:
            `Navigation to ${this.config.url} was aborted by the browser. ` +
            (canRetry
              ? 'Retrying because the page is still blank.'
              : 'Continuing because hydrated app readiness selectors will determine usability.'),
          data: {
            attempt,
            blankDocument,
            url: this.page.url()
          }
        });

        if (canRetry) continue;
        if (blankDocument) {
          throw new Error(
            `App availability failure: ${this.config.displayName} navigation to ${this.config.url} ` +
              `was aborted and the page remained blank after ${attempt} attempts.`
          );
        }
        return undefined;
      }
    }

    return undefined;
  }

  private async isBlankDocument(): Promise<boolean> {
    if (this.page.url() === 'about:blank') return true;

    return this.page.evaluate(() => {
      const bodyText = document.body?.innerText.trim() ?? '';
      const visibleAppElements = document.querySelectorAll('button, a, input, textarea, img, [role], script, link');
      return bodyText.length === 0 && visibleAppElements.length === 0;
    }).catch(() => false);
  }

  abstract assertReady(): Promise<void>;
  async assertWalletConnected(): Promise<void> {
    const permission = await this.page.waitForFunction(
      () => {
        const wallet = (window as any).midenWallet;
        if (!wallet?.address) return false;
        return {
          address: wallet.address,
          network: wallet.network ?? null,
          permission: wallet.permission ?? null
        };
      },
      { timeout: 90_000 }
    );

    const value = await permission.jsonValue();
    this.timeline.emit({
      category: 'dapp_bridge',
      severity: 'info',
      source: this.config.name,
      message: 'App has wallet permission through window.midenWallet',
      data: value as Record<string, unknown>
    });
  }

  async captureAppState(): Promise<unknown> {
    return this.page.evaluate(() => {
      const wallet = (window as any).midenWallet;
      const methodNames = wallet
        ? ['connect', 'request', 'requestPermission', 'getAccount', 'getState', 'signTransaction', 'sendTransaction']
            .filter(name => typeof wallet[name] === 'function')
        : [];
      return {
        url: window.location.href,
        title: document.title,
        bodyTextSample: document.body.innerText.slice(0, 2_000),
        interactiveElements: Array.from(document.querySelectorAll('button, a, [role="button"], input, textarea, img'))
          .map(element => {
            const rect = element.getBoundingClientRect();
            const htmlElement = element as HTMLElement;
            return {
              tagName: element.tagName.toLowerCase(),
              text: htmlElement.innerText?.trim().slice(0, 120) || null,
              ariaLabel: element.getAttribute('aria-label'),
              role: element.getAttribute('role'),
              id: element.id || null,
              className: typeof htmlElement.className === 'string' ? htmlElement.className.slice(0, 160) : null,
              src: element instanceof HTMLImageElement ? element.currentSrc || element.src || null : null,
              href: element instanceof HTMLAnchorElement ? element.href || null : null,
              visible: rect.width > 0 && rect.height > 0,
              rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            };
          })
          .filter(element => element.visible)
          .slice(0, 120),
        walletBridge: wallet
          ? {
              address: wallet.address ?? null,
              network: wallet.network ?? null,
              permission: wallet.permission ?? null,
              ownKeys: Object.keys(wallet).sort(),
              methodNames
            }
          : null
      };
    });
  }

  protected async clickFirstVisible(description: string, locators: Locator[]): Promise<void> {
    const errors: string[] = [];

    for (const locator of locators) {
      const candidate = locator.first();
      const isVisible = await candidate.isVisible({ timeout: 500 }).catch(() => false);
      if (!isVisible) {
        continue;
      }

      try {
        await candidate.click({ timeout: 2_000 });
        this.timeline.emit({
          category: 'app_ui',
          severity: 'info',
          source: this.config.name,
          message: `Clicked ${description}`
        });
        return;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    for (const locator of locators) {
      try {
        await locator.first().click({ timeout: 7_500 });
        this.timeline.emit({
          category: 'app_ui',
          severity: 'info',
          source: this.config.name,
          message: `Clicked ${description}`
        });
        return;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    throw new Error(
      `Could not click ${description} in ${this.config.displayName}. ` +
        `Set an app-specific selector override if the UI changed. Errors: ${errors.slice(0, 3).join(' | ')}`
    );
  }

  protected async fillFirstVisible(description: string, locators: Locator[], value: string): Promise<void> {
    const errors: string[] = [];
    for (const locator of locators) {
      try {
        await locator.first().fill(value, { timeout: 7_500 });
        this.timeline.emit({
          category: 'app_ui',
          severity: 'info',
          source: this.config.name,
          message: `Filled ${description}`,
          data: { valueLength: value.length }
        });
        return;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    throw new Error(
      `Could not fill ${description} in ${this.config.displayName}. ` +
        `Set an app-specific selector override if the UI changed. Errors: ${errors.slice(0, 3).join(' | ')}`
    );
  }

  protected async expectAnyReadySignal(locators: Locator[]): Promise<void> {
    if (locators.length === 0) {
      throw new Error(`${this.config.displayName} adapter has no readiness locators.`);
    }

    const errors: string[] = [];
    for (const locator of locators) {
      if (await locator.first().isVisible({ timeout: 500 }).catch(() => false)) return;
    }

    for (const locator of locators) {
      try {
        await expect(locator.first()).toBeVisible({ timeout: 10_000 });
        return;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    throw new Error(
      `${this.config.displayName} did not expose a known readiness signal. ` +
        `Errors: ${errors.slice(0, 3).join(' | ')}`
    );
  }
}
