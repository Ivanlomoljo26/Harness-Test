import type { BrowserContext, Page } from '@playwright/test';

import type { TimelineRecorder } from '../harness/timeline-recorder';

export class DappConfirmationController {
  constructor(
    private readonly context: BrowserContext,
    private readonly extensionId: string,
    private readonly timeline: TimelineRecorder
  ) {}

  async approveNext(kind: 'connect' | 'transaction' | 'consume' | 'sign' = 'connect'): Promise<void> {
    const page = await this.findConfirmationPage(kind);
    await page.bringToFront();

    this.timeline.emit({
      category: 'wallet_ui',
      severity: 'info',
      source: 'wallet-confirmation',
      message: `Approving wallet ${kind} confirmation`,
      data: { url: page.url() }
    });

    const approve = page.getByRole('button', { name: /approve|allow|connect|confirm|continue|sign/i }).first();
    await approve.click({ timeout: 60_000 });
    await page.waitForTimeout(500).catch(error => {
      if (isClosedPageError(error)) return;
      throw error;
    });
  }

  async rejectNext(kind: 'connect' | 'transaction' | 'consume' | 'sign' = 'connect'): Promise<void> {
    const page = await this.findConfirmationPage(kind);
    await page.bringToFront();
    this.timeline.emit({
      category: 'wallet_ui',
      severity: 'info',
      source: 'wallet-confirmation',
      message: `Rejecting wallet ${kind} confirmation`,
      data: { url: page.url() }
    });
    await page.getByRole('button', { name: /reject|deny|cancel|decline/i }).first().click({ timeout: 60_000 });
  }

  private async findConfirmationPage(kind: 'connect' | 'transaction' | 'consume' | 'sign'): Promise<Page> {
    const existing = this.context.pages().find(page => this.isWalletConfirmationPage(page));
    if (existing) return existing;

    const timeoutMs = 120_000;
    const page = await this.context.waitForEvent('page', {
      timeout: timeoutMs,
      predicate: candidate => this.isWalletConfirmationPage(candidate)
    }).catch(error => {
      const originalMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Wallet ${kind} confirmation page did not open within ${timeoutMs}ms. ` +
          'The app may not have emitted a dApp wallet request, or the wallet content-script bridge may be disconnected. ' +
          `Original error: ${originalMessage}`
      );
    });
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    return page;
  }

  private isWalletConfirmationPage(page: Page): boolean {
    const url = page.url();
    return url.startsWith(`chrome-extension://${this.extensionId}/`) && !url.includes('fullpage.html');
  }
}

function isClosedPageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /target page, context or browser has been closed|target closed/i.test(message);
}
