import type { Page } from '@playwright/test';

import { getAppConfig } from '../../config/apps';
import { getEnvironmentConfig } from '../../config/environments';
import type { TimelineRecorder } from '../../harness/timeline-recorder';
import { BaseAppAdapter } from '../app-adapter';
import { zoroSwapConnectLocators, zoroSwapReadyLocators } from './selectors';

export class ZoroSwapAdapter extends BaseAppAdapter {
  readonly config = getAppConfig('zoroswap');

  constructor(page: Page, timeline: TimelineRecorder) {
    super(page, timeline);
  }

  async assertReady(): Promise<void> {
    await this.acceptOpenAlphaDisclaimerIfPresent();
    await this.expectAnyReadySignal(zoroSwapReadyLocators(this.page));
    await this.assertNetworkCompatible();
  }

  async connectWallet(): Promise<void> {
    await this.acceptOpenAlphaDisclaimerIfPresent();
    await this.clickFirstVisible('ZoroSwap wallet connect control', zoroSwapConnectLocators(this.page));
    await this.selectMidenWalletIfPickerOpen();
  }

  private async acceptOpenAlphaDisclaimerIfPresent(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"][aria-labelledby="disclaimer-title"]').first();
    const visible = await dialog.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!visible) return;

    await dialog.getByRole('button', { name: /i understand and want to continue/i }).click({ timeout: 15_000 });
    await dialog.waitFor({ state: 'hidden', timeout: 15_000 });
    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Accepted ZoroSwap Open Alpha disclaimer'
    });
  }

  private async assertNetworkCompatible(): Promise<void> {
    const expectedNetwork = getEnvironmentConfig().name;
    if (expectedNetwork === 'localhost') return;

    const bodyText = await this.page.locator('body').innerText({ timeout: 10_000 });
    const hasTestnetMarker = /\btestnet\b/i.test(bodyText);
    const hasDevnetMarker = /\bdevnet\b/i.test(bodyText);

    if (expectedNetwork === 'devnet' && hasTestnetMarker && !hasDevnetMarker) {
      throw new Error(
        'ZoroSwap app network mismatch: E2E_NETWORK=devnet, but the loaded app advertises testnet. ' +
          'Set ZOROSWAP_URL_DEVNET to a devnet deployment before treating devnet coverage as working.'
      );
    }

    if (expectedNetwork === 'testnet' && hasDevnetMarker && !hasTestnetMarker) {
      throw new Error(
        'ZoroSwap app network mismatch: E2E_NETWORK=testnet, but the loaded app advertises devnet. ' +
          'Set ZOROSWAP_URL_TESTNET to a testnet deployment before treating testnet coverage as working.'
      );
    }
  }

  private async selectMidenWalletIfPickerOpen(): Promise<void> {
    const midenWalletOption = this.midenWalletPickerOption();
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const visible = await midenWalletOption.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!visible) return;

      await midenWalletOption.click({ timeout: 15_000 });
      this.timeline.emit({
        category: 'app_ui',
        severity: 'info',
        source: this.config.name,
        message: `Selected Miden Wallet in ZoroSwap wallet picker, attempt ${attempt}`
      });
      await this.page.waitForTimeout(1_000);
    }

    if (await midenWalletOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      throw new Error(
        'ZoroSwap wallet connect picker remained open after selecting Miden Wallet three times. ' +
          'The app did not advance to a wallet confirmation request; check app bridge console errors and ZoroSwap backend availability.'
      );
    }
  }

  private firstVisibleLocator(locators: ReturnType<Page['locator']>[]): ReturnType<Page['locator']> {
    return locators.reduce((candidate, locator) => candidate.or(locator)).first();
  }

  private midenWalletPickerOption(): ReturnType<Page['locator']> {
    return this.firstVisibleLocator([
      this.page.locator('.wallet-adapter-modal .wallet-adapter-button').filter({ hasText: /miden wallet/i }),
      this.page.locator('button').filter({ hasText: /miden wallet/i }),
      this.page.getByText(/miden wallet/i)
    ]);
  }
}
