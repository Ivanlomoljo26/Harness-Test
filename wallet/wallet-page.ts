import type { BrowserContext, ConsoleMessage, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { MidenNetworkName } from '../config/environments';
import type { TimelineRecorder } from '../harness/timeline-recorder';
import { DappConfirmationController } from './dapp-confirmation';

const OFFICIAL_MIDEN_WALLET_EXTENSION_ID = 'ablmompanofnodfdkgchkpmphailefpb';

interface DappBridgeProbe {
  injected: boolean;
  available: boolean | null;
  error?: string | undefined;
  ownKeys: string[];
  methodNames: string[];
  address?: string | null | undefined;
  network?: unknown | undefined;
}

interface CompletedTransactionWaitOptions {
  label?: string;
  previousTxHash?: string | null;
  timeoutMs?: number;
}

export interface WalletTokenBalance {
  tokenId?: string;
  tokenSlug?: string;
  symbol?: string;
  name?: string;
  rawBalance: number;
  decimals?: number;
  displayBalance: number;
}

export class WalletPage {
  readonly confirmations: DappConfirmationController;

  constructor(
    private readonly opts: {
      page: Page;
      context: BrowserContext;
      extensionId: string;
      password: string;
      setupMode: 'create' | 'import' | 'profile';
      seedPhrase: string[] | undefined;
      timeline: TimelineRecorder;
    }
  ) {
    this.confirmations = new DappConfirmationController(opts.context, opts.extensionId, opts.timeline);
  }

  get page(): Page {
    return this.opts.page;
  }

  get extensionId(): string {
    return this.opts.extensionId;
  }

  async prepareWallet(): Promise<void> {
    await this.navigateHome();

    if (await this.isReady()) {
      this.opts.timeline.emit({
        category: 'wallet_ui',
        severity: 'info',
        source: 'wallet',
        message: 'Wallet is already ready'
      });
      return;
    }

    if (await this.isLocked()) {
      await this.unlock();
      return;
    }

    const welcome = this.page.getByTestId('onboarding-welcome');
    if (await welcome.isVisible({ timeout: 10_000 }).catch(() => false)) {
      if (this.opts.setupMode === 'create') {
        await this.createWallet();
        return;
      }

      if (this.opts.setupMode === 'import' && this.opts.seedPhrase) {
        await this.importWallet(this.opts.seedPhrase);
        return;
      }

      if (this.opts.setupMode === 'profile') {
        throw new Error(
          'Wallet profile is on onboarding screen. WALLET_SETUP_MODE=profile requires a prepared wallet profile that is already onboarded.'
        );
      }
    }

    throw new Error('Wallet did not reach ready, locked, or onboarding state. Check wallet screenshot and console logs.');
  }

  async navigateHome(): Promise<void> {
    let lastError: unknown;
    for (const walletUrl of [
      `chrome-extension://${this.extensionId}/fullpage.html#/`,
      `chrome-extension://${this.extensionId}/desktop.html#/`,
      `chrome-extension://${this.extensionId}/popup.html#/`
    ]) {
      try {
        await this.page.goto(walletUrl, { waitUntil: 'domcontentloaded' });
        await this.page.waitForSelector('#root > *', { timeout: 60_000 });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  async assertDappBridgeInjected(appPage: Page): Promise<void> {
    const attempts = 3;
    let lastProbe: DappBridgeProbe | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const deadline = Date.now() + 20_000;

      while (Date.now() < deadline) {
        const probe = await this.readDappBridgeProbe(appPage);
        lastProbe = probe;

        if (probe.injected && probe.available === true) {
          this.opts.timeline.emit({
            category: 'dapp_bridge',
            severity: 'info',
            source: 'app-page',
            message: 'window.midenWallet bridge is available',
            data: { attempt, ...probe }
          });
          return;
        }

        await appPage.waitForTimeout(500);
      }

      this.opts.timeline.emit({
        category: 'dapp_bridge',
        severity: 'warn',
        source: 'app-page',
        message: 'window.midenWallet bridge is not available yet',
        data: { attempt, lastProbe }
      });

      if (attempt < attempts) {
        await appPage.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await appPage.waitForTimeout(1_000);
      }
    }

    throw new Error(
      'window.midenWallet bridge did not become available after reload retries. ' +
        `Last probe: ${JSON.stringify(lastProbe)}`
    );
  }

  private async readDappBridgeProbe(appPage: Page): Promise<DappBridgeProbe> {
    return appPage.evaluate(async () => {
      const wallet = (window as any).midenWallet;
      if (!wallet) {
        return {
          injected: false,
          available: null,
          ownKeys: [],
          methodNames: []
        };
      }

      const prototype = Object.getPrototypeOf(wallet);
      const methodNames = Array.from(
        new Set([
          ...Object.keys(wallet),
          ...(prototype ? Object.getOwnPropertyNames(prototype) : [])
        ])
      )
        .filter(name => name !== 'constructor' && typeof wallet[name] === 'function')
        .sort();

      let available: boolean | null = null;
      let error: string | undefined;

      if (typeof wallet.isAvailable === 'function') {
        try {
          const result = await Promise.race([
            wallet.isAvailable(),
            new Promise(resolve => setTimeout(() => resolve('__timeout__'), 1_500))
          ]);
          if (result === '__timeout__') {
            available = false;
            error = 'midenWallet.isAvailable timed out';
          } else {
            available = result === true;
          }
        } catch (probeError) {
          available = false;
          error = probeError instanceof Error ? probeError.message : String(probeError);
        }
      } else {
        available = false;
        error = 'midenWallet.isAvailable is not a function';
      }

      return {
        injected: true,
        available,
        error,
        ownKeys: Object.keys(wallet).sort(),
        methodNames,
        address: typeof wallet.address === 'string' ? wallet.address : null,
        network: wallet.network ?? null
      };
    });
  }

  async assertDappBridgeInjectedOnly(appPage: Page): Promise<void> {
    await appPage.waitForFunction(
      () => Boolean((window as Window & { midenWallet?: unknown }).midenWallet),
      { timeout: 60_000 }
    );
    this.opts.timeline.emit({
      category: 'dapp_bridge',
      severity: 'info',
      source: 'app-page',
      message: 'window.midenWallet is available'
    });
  }

  async captureWalletState(appPage?: Page): Promise<unknown> {
    const walletStore = await this.page.evaluate(() => {
      const store = (globalThis as { __TEST_STORE__?: { getState(): unknown } }).__TEST_STORE__;
      return store?.getState?.() ?? null;
    }).catch(error => ({ error: error instanceof Error ? error.message : String(error) }));

    const dappBridge = appPage
      ? await appPage.evaluate(() => {
          const wallet = (window as any).midenWallet;
          if (!wallet) return null;
          const methodNames = ['connect', 'request', 'requestPermission', 'getAccount', 'getState', 'signTransaction', 'sendTransaction']
            .filter(name => typeof wallet[name] === 'function');
          return {
            address: wallet.address ?? null,
            network: wallet.network ?? null,
            publicKeyType: wallet.publicKey ? typeof wallet.publicKey : null,
            permission: wallet.permission ?? null,
            ownKeys: Object.keys(wallet).sort(),
            methodNames
          };
        }).catch(error => ({ error: error instanceof Error ? error.message : String(error) }))
      : null;

    return {
      capturedAt: new Date().toISOString(),
      extensionId: this.extensionId,
      walletUrl: this.page.url(),
      walletStore,
      dappBridge
    };
  }

  async readLastCompletedTxHash(): Promise<string | null> {
    return this.page.evaluate(() => {
      const store = (globalThis as {
        __TEST_STORE__?: { getState(): { lastCompletedTxHash?: unknown } };
      }).__TEST_STORE__;
      const value = store?.getState?.().lastCompletedTxHash;
      return typeof value === 'string' && value.length > 0 ? value : null;
    }).catch(() => null);
  }

  async readTokenBalances(address?: string): Promise<WalletTokenBalance[]> {
    return this.page.evaluate(addressInput => {
      const store = (globalThis as {
        __TEST_STORE__?: {
          getState(): {
            currentAccount?: { publicKey?: unknown };
            balances?: Record<string, unknown>;
          };
        };
      }).__TEST_STORE__;
      const state = store?.getState?.();
      const currentAddress = typeof state?.currentAccount?.publicKey === 'string'
        ? state.currentAccount.publicKey
        : undefined;
      const selectedAddress = addressInput || currentAddress;
      if (!selectedAddress) return [];
      const balances = state?.balances?.[selectedAddress];
      if (!Array.isArray(balances)) return [];

      return balances.map(item => {
        const value = item as {
          tokenId?: unknown;
          tokenSlug?: unknown;
          metadata?: { symbol?: unknown; name?: unknown; decimals?: unknown };
          balance?: unknown;
        };
        const rawBalance = parseNumericBalance(value.balance);
        const decimals = parseNumericBalance(value.metadata?.decimals);
        const displayBalance = Number.isFinite(decimals) && decimals > 0
          ? rawBalance / Math.pow(10, decimals)
          : rawBalance;
        const result: WalletTokenBalance = {
          rawBalance,
          displayBalance
        };
        if (typeof value.tokenId === 'string') result.tokenId = value.tokenId;
        if (typeof value.tokenSlug === 'string') result.tokenSlug = value.tokenSlug;
        if (typeof value.metadata?.symbol === 'string') result.symbol = value.metadata.symbol;
        if (typeof value.metadata?.name === 'string') result.name = value.metadata.name;
        if (Number.isFinite(decimals)) result.decimals = decimals;
        return result;
      });

      function parseNumericBalance(value: unknown): number {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'string') {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      }
    }, address).catch(() => []);
  }

  async waitForTokenBalance(
    token: string,
    minimumDisplayAmount: number,
    options: { timeoutMs?: number; intervalMs?: number; label?: string } = {}
  ): Promise<WalletTokenBalance> {
    const timeoutMs = options.timeoutMs ?? 120_000;
    const intervalMs = options.intervalMs ?? 1_000;
    const label = options.label ?? `${token} balance`;
    const deadline = Date.now() + timeoutMs;
    let lastBalances: WalletTokenBalance[] = [];

    while (Date.now() < deadline) {
      lastBalances = await this.readTokenBalances();
      const balance = findWalletTokenBalance(lastBalances, token);
      if (balance && balance.displayBalance >= minimumDisplayAmount) {
        this.opts.timeline.emit({
          category: 'wallet_transaction',
          severity: 'info',
          source: 'wallet',
          message: 'Wallet token balance is ready',
          data: {
            label,
            token,
            minimumDisplayAmount,
            balance
          }
        });
        return balance;
      }
      await this.waitAndReopenIfNeeded(intervalMs);
    }

    throw new Error(
      [
        `Wallet does not have enough ${token} for ${label}.`,
        `Required at least ${minimumDisplayAmount} ${token}.`,
        `Observed balances: ${formatWalletBalances(lastBalances)}.`,
        'Qash faucet funding is account-scoped inside Qash and does not fund arbitrary external payer wallets.',
        'Use a fresh wallet profile imported from a funded seed/profile, or fund the connected payer wallet before paying.'
      ].join(' ')
    );
  }

  async waitForNextCompletedTransaction(options: CompletedTransactionWaitOptions = {}): Promise<string> {
    const timeoutMs = options.timeoutMs ?? 180_000;
    const label = options.label ?? 'wallet transaction';
    const previousTxHash = options.previousTxHash ?? await this.readLastCompletedTxHash();
    const deadline = Date.now() + timeoutMs;
    const consoleErrors: string[] = [];
    const baselineTimelineEventCount = this.opts.timeline.all().length;

    const consoleHandler = (message: ConsoleMessage) => {
      if (message.type() === 'error' && isWalletTransactionExecutionError(message.text())) {
        consoleErrors.push(message.text());
      }
    };

    const baselineServiceWorkerErrors = new Set(await this.readServiceWorkerTransactionErrors());
    this.page.on('console', consoleHandler);

    try {
      while (Date.now() < deadline) {
        const currentTxHash = await this.readLastCompletedTxHash();
        if (currentTxHash && currentTxHash !== previousTxHash) {
          this.opts.timeline.emit({
            category: 'wallet_transaction',
            severity: 'info',
            source: 'wallet',
            message: 'Wallet transaction completed',
            data: { label, transactionHash: currentTxHash, previousTxHash }
          });
          return currentTxHash;
        }

        const serviceWorkerErrors = (await this.readServiceWorkerTransactionErrors())
          .filter(error => !baselineServiceWorkerErrors.has(error));
        const timelineErrors = this.opts.timeline
          .all()
          .slice(baselineTimelineEventCount)
          .map(event => event.message)
          .filter(isWalletTransactionExecutionError);
        const errors = [...consoleErrors, ...serviceWorkerErrors, ...timelineErrors];
        if (errors.length > 0) {
          throw new Error(
            `Wallet transaction execution failed while waiting for ${label}: ${errors.at(-1)}`
          );
        }

        await this.waitAndReopenIfNeeded(500);
      }
    } finally {
      this.page.removeListener('console', consoleHandler);
    }

    throw new Error(
      `Wallet transaction did not report a completed transaction hash for ${label} within ${timeoutMs}ms. ` +
        `Previous lastCompletedTxHash=${previousTxHash ?? 'none'}.`
    );
  }

  async currentWalletAddress(): Promise<string | undefined> {
    const address = await this.page.evaluate(() => {
      const store = (globalThis as { __TEST_STORE__?: { getState(): unknown } }).__TEST_STORE__;
      const state = store?.getState?.();
      const seen = new Set<unknown>();
      const queue: unknown[] = [state];
      const addressPattern = /\bmtst1[a-z0-9_]+\b/i;

      while (queue.length > 0) {
        const value = queue.shift();
        if (!value || seen.has(value)) continue;
        seen.add(value);

        if (typeof value === 'string') {
          const match = value.match(addressPattern);
          if (match) return match[0];
          continue;
        }

        if (Array.isArray(value)) {
          for (const item of value) queue.push(item);
          continue;
        }

        if (typeof value === 'object') {
          for (const item of Object.values(value as Record<string, unknown>)) {
            queue.push(item);
          }
        }
      }

      return undefined;
    }).catch(() => undefined);

    return address || undefined;
  }

  async waitForDappPermission(appPage: Page): Promise<{ address: string; network?: string }> {
    const handle = await appPage.waitForFunction(
      () => {
        const wallet = (window as any).midenWallet;
        if (!wallet?.address) return false;
        return { address: wallet.address, network: wallet.network };
      },
      { timeout: 90_000 }
    );
    return handle.jsonValue() as Promise<{ address: string; network?: string }>;
  }

  async assertNetwork(expectedNetwork: MidenNetworkName): Promise<void> {
    const selectedNetworkId = await this.page.evaluate(() => {
      const store = (globalThis as { __TEST_STORE__?: { getState(): { selectedNetworkId?: unknown } } }).__TEST_STORE__;
      return store?.getState?.().selectedNetworkId ?? null;
    });
    const expectedStoreNetwork = expectedNetwork === 'localhost' ? 'localnet' : expectedNetwork;

    if (
      selectedNetworkId === null &&
      this.extensionId === OFFICIAL_MIDEN_WALLET_EXTENSION_ID &&
      expectedNetwork === 'testnet'
    ) {
      this.opts.timeline.emit({
        category: 'wallet_ui',
        severity: 'warn',
        source: 'wallet',
        message: 'Official Miden Wallet does not expose selectedNetworkId through __TEST_STORE__; accepting testnet official-extension profile',
        data: { extensionId: this.extensionId, expectedNetwork }
      });
      return;
    }

    if (selectedNetworkId !== expectedStoreNetwork) {
      throw new Error(
        `Wallet extension network mismatch: E2E_NETWORK=${expectedNetwork}, wallet selectedNetworkId=${String(selectedNetworkId)}. ` +
          'Build and load the matching network-specific wallet extension.'
      );
    }

    this.opts.timeline.emit({
      category: 'wallet_ui',
      severity: 'info',
      source: 'wallet',
      message: `Wallet selected network matches ${expectedNetwork}`,
      data: { selectedNetworkId, expectedNetwork }
    });
  }

  private async importWallet(seedPhrase: string[]): Promise<void> {
    const welcome = this.page.getByTestId('onboarding-welcome');
    await welcome.getByRole('button', { name: /i already have a wallet/i }).click();
    const importType = this.page.getByTestId('import-select-type');
    await importType.waitFor({ timeout: 30_000 });
    await importType.getByText(/import with seed phrase/i).click();

    for (let index = 0; index < seedPhrase.length; index += 1) {
      await this.page.locator(`#seed-phrase-input-${index}`).fill(seedPhrase[index] ?? '');
    }

    await this.page.getByRole('button', { name: /continue/i }).click();
    await expect(this.page).toHaveURL(/create-password/, { timeout: 30_000 });
    await this.page.locator('input[placeholder="Enter password"]').first().fill(this.opts.password);
    await this.page.locator('input[placeholder="Enter password again"]').first().fill(this.opts.password);
    await this.page.getByRole('button', { name: /continue/i }).click();
    await expect(this.page.getByText(/your wallet is ready/i)).toBeVisible({ timeout: 120_000 });
    await this.completeOnboardingFromReadyScreen(60_000);
  }

  private async createWallet(): Promise<void> {
    const welcome = this.page.getByTestId('onboarding-welcome');
    await welcome.waitFor({ timeout: 30_000 });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const backupVisibleBeforeClick = await this.page.getByText(/back up your wallet/i).isVisible({ timeout: 1_000 }).catch(() => false);
      if (backupVisibleBeforeClick) break;

      try {
        await welcome.getByRole('button', { name: /create a new wallet/i }).click({ timeout: 15_000 });
      } catch (error) {
        const reachedBackupScreen = await this.page.getByText(/back up your wallet/i).isVisible({ timeout: 2_000 }).catch(() => false);
        if (!reachedBackupScreen) throw error;
      }

      const backupVisible = await this.page.getByText(/back up your wallet/i).isVisible({ timeout: 10_000 }).catch(() => false);
      if (backupVisible) break;
      if (attempt === 9) throw new Error('Wallet create flow did not reach seed backup screen.');
      await this.page.waitForTimeout(3_000);
    }

    await this.page.getByRole('button', { name: /show/i }).click();
    await this.page.waitForTimeout(500);

    const seedWords = await this.readSeedWordsFromBackupScreen();
    if (seedWords.length < 12) {
      throw new Error(`Wallet create flow could not read seed phrase. Got ${seedWords.length} words.`);
    }

    const firstWord = seedWords[0]!;
    const lastWord = seedWords[seedWords.length - 1]!;

    await this.page.getByRole('button', { name: /continue/i }).click();

    const verifyContainer = this.page.getByTestId('verify-seed-phrase');
    await verifyContainer.waitFor({ timeout: 30_000 });
    const buttons = verifyContainer.locator('article button');
    const buttonTexts = await buttons.evaluateAll(elements => elements.map(item => (item.textContent ?? '').trim()));

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

    await expect(this.page).toHaveURL(/create-password/, { timeout: 30_000 });
    await this.page.locator('input[placeholder="Enter password"]').first().fill(this.opts.password);
    await this.page.locator('input[placeholder="Enter password again"]').first().fill(this.opts.password);
    await this.page.getByRole('button', { name: /continue/i }).click();
    await expect(this.page.getByText(/your wallet is ready/i)).toBeVisible({ timeout: 120_000 });
    await this.completeOnboardingFromReadyScreen(120_000);
  }

  private async readSeedWordsFromBackupScreen(): Promise<string[]> {
    return this.page.evaluate(() => {
      const article = document.querySelector('article');
      if (!article) return [];
      const chips = article.querySelectorAll(':scope > label');
      const words: string[] = [];
      chips.forEach(chip => {
        const paragraphs = chip.querySelectorAll('p');
        const word = paragraphs[paragraphs.length - 1]?.textContent?.trim() ?? '';
        if (word && !/^\d+\.?$/.test(word)) words.push(word);
      });
      return words;
    });
  }

  private async unlock(): Promise<void> {
    const passwordInput = this.page.locator('input[type="password"], input[placeholder*="password" i]').first();
    await passwordInput.fill(this.opts.password);
    await this.page.getByRole('button', { name: /unlock|continue|sign in/i }).click();
    await this.waitForReadyState(60_000);
  }

  private async completeOnboardingFromReadyScreen(timeoutMs: number): Promise<void> {
    const consoleMessages: string[] = [];
    const consoleHandler = (message: { type(): string; text(): string }) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleMessages.push(`[${message.type()}] ${message.text()}`);
      }
    };
    this.page.on('console', consoleHandler);

    try {
      await this.clickReadyScreenContinue();
      if (await this.waitForExploreOrAddress(timeoutMs)) return;

      const currentUrl = this.page.isClosed() ? 'closed' : this.page.url();
      const bodyText = this.page.isClosed()
        ? ''
        : await this.page.locator('body').textContent({ timeout: 1_000 }).catch(() => '');
      const buttonLoading = this.page.isClosed()
        ? false
        : await this.page.evaluate(() => {
            const button = document.querySelector('button');
            return button?.getAttribute('data-loading') === 'true' ||
              button?.querySelector('.animate-spin') !== null;
          }).catch(() => false);

      this.opts.timeline.emit({
        category: 'wallet_ui',
        severity: 'warn',
        source: 'wallet',
        message: 'Wallet onboarding did not naturally navigate after ready screen click',
        data: {
          currentUrl,
          buttonLoading,
          consoleMessages: consoleMessages.slice(-20),
          bodyText: bodyText?.slice(0, 500) ?? ''
        }
      });

      for (let attempt = 0; attempt < 15; attempt += 1) {
        await this.waitAndReopenIfNeeded(3_000);
        await this.reloadWalletPage();
        await this.waitAndReopenIfNeeded(3_000);

        if (await this.isExploreVisible() || await this.currentWalletAddress()) return;

        const welcomeVisible = await this.page
          .getByTestId('onboarding-welcome')
          .isVisible({ timeout: 500 })
          .catch(() => false);
        if (welcomeVisible && attempt > 5) {
          await this.createWalletWithDirectIntercom().catch(error => {
            this.opts.timeline.emit({
              category: 'wallet_ui',
              severity: 'warn',
              source: 'wallet',
              message: 'Direct wallet intercom fallback failed',
              data: { error: error instanceof Error ? error.message : String(error) }
            });
          });
          await this.waitAndReopenIfNeeded(5_000);
          await this.reloadWalletPage();
          await this.waitAndReopenIfNeeded(3_000);
          if (await this.isExploreVisible() || await this.currentWalletAddress()) return;
        }
      }

      throw new Error(
        [
          'Wallet onboarding did not complete after ready-screen click, reload retries, and intercom fallback.',
          `Console messages: ${consoleMessages.join(' | ') || 'none'}`
        ].join(' ')
      );
    } finally {
      this.page.removeListener('console', consoleHandler);
    }
  }

  private async clickReadyScreenContinue(): Promise<void> {
    const namedButton = this.page.getByRole('button', { name: /get started/i }).last();
    if (await namedButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await namedButton.click();
      return;
    }

    await this.page.getByRole('button').last().click();
  }

  private async waitForExploreOrAddress(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.page.isClosed()) await this.reopenWalletPage();
      if (await this.isExploreVisible()) return true;
      if (await this.currentWalletAddress()) return true;
      await this.waitAndReopenIfNeeded(1_000);
    }
    return false;
  }

  private async waitForReadyState(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.page.isClosed()) {
        await this.reopenWalletPage();
      }
      if (await this.isReady()) return;
      if (await this.currentWalletAddress()) return;
      await this.page.waitForTimeout(1_000).catch(error => {
        if (isClosedPageError(error)) return;
        throw error;
      });
    }
    throw new Error('Wallet did not expose a ready state or account address before timeout.');
  }

  private async waitForWalletAddress(timeoutMs: number): Promise<string | undefined> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.page.isClosed()) await this.reopenWalletPage();
      const address = await this.currentWalletAddress();
      if (address) return address;
      await this.waitAndReopenIfNeeded(1_000);
    }
    return undefined;
  }

  private async isExploreVisible(): Promise<boolean> {
    if (this.page.isClosed()) await this.reopenWalletPage();
    return this.page
      .getByText('Send')
      .or(this.page.getByText('Receive'))
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
  }

  private async reloadWalletPage(): Promise<void> {
    if (this.page.isClosed()) {
      await this.reopenWalletPage();
      return;
    }
    await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(async error => {
      if (!isClosedPageError(error)) throw error;
      await this.reopenWalletPage();
    });
  }

  private async waitAndReopenIfNeeded(timeoutMs: number): Promise<void> {
    if (this.page.isClosed()) {
      await this.reopenWalletPage();
      return;
    }
    await this.page.waitForTimeout(timeoutMs).catch(async error => {
      if (!isClosedPageError(error)) throw error;
      await this.reopenWalletPage();
    });
  }

  private async readServiceWorkerTransactionErrors(): Promise<string[]> {
    const workers = this.opts.context.serviceWorkers().filter(worker => {
      try {
        return new URL(worker.url()).host === this.extensionId;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(workers.map(worker =>
      worker.evaluate(() => {
        const errors = (globalThis as unknown as { __e2e_errors?: unknown }).__e2e_errors;
        return Array.isArray(errors) ? errors.map(String) : [];
      }).catch(() => [])
    ));

    return results.flat().filter(isWalletTransactionExecutionError);
  }

  private async createWalletWithDirectIntercom(): Promise<void> {
    if (this.page.isClosed()) await this.reopenWalletPage();
    await this.page.evaluate(async password => {
      const intercom = (window as unknown as {
        __TEST_INTERCOM__?: { request(input: unknown): Promise<unknown> };
      }).__TEST_INTERCOM__;
      if (!intercom) throw new Error('No __TEST_INTERCOM__');
      await intercom.request({
        type: 'NEW_WALLET_REQUEST',
        password,
        mnemonic: undefined,
        ownMnemonic: false
      });
    }, this.opts.password);
  }

  private async reopenWalletPage(): Promise<void> {
    const existing = this.opts.context.pages().find(page =>
      !page.isClosed() && page.url().startsWith(`chrome-extension://${this.extensionId}/`)
    );
    this.opts.page = existing ?? await this.opts.context.newPage();
    await this.navigateHome();
  }

  private async isReady(): Promise<boolean> {
    const storeReady = await this.page.evaluate(() => {
      const store = (globalThis as { __TEST_STORE__?: { getState(): { status?: unknown } } }).__TEST_STORE__;
      const status = store?.getState?.().status;
      return status === 2 || status === 'Ready';
    }).catch(() => false);
    if (storeReady) return true;
    return this.page.getByText(/send/i).first().isVisible({ timeout: 2_000 }).catch(() => false);
  }

  private async isLocked(): Promise<boolean> {
    const storeLocked = await this.page.evaluate(() => {
      const store = (globalThis as { __TEST_STORE__?: { getState(): { status?: unknown } } }).__TEST_STORE__;
      const status = store?.getState?.().status;
      return status === 1 || status === 'Locked';
    }).catch(() => false);
    if (storeLocked) return true;
    return this.page.locator('input[type="password"], input[placeholder*="password" i]').first().isVisible({ timeout: 2_000 }).catch(() => false);
  }
}

function isClosedPageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /target page, context or browser has been closed|target closed/i.test(message);
}

function isWalletTransactionExecutionError(message: string): boolean {
  return /executeTransaction|failed to execute transaction|asset error|underflow/i.test(message);
}

function findWalletTokenBalance(
  balances: WalletTokenBalance[],
  token: string
): WalletTokenBalance | undefined {
  const expected = token.trim().toLowerCase();
  return balances.find(balance =>
    [balance.symbol, balance.tokenSlug, balance.name, balance.tokenId]
      .filter((value): value is string => Boolean(value))
      .some(value => value.toLowerCase() === expected)
  );
}

function formatWalletBalances(balances: WalletTokenBalance[]): string {
  if (balances.length === 0) return 'none';
  return balances.map(balance => {
    const label = balance.symbol || balance.tokenSlug || balance.name || balance.tokenId || 'unknown-token';
    return `${label}=${balance.displayBalance}`;
  }).join(', ');
}
