import type { Page } from '@playwright/test';

export function zoroSwapReadyLocators(page: Page) {
  return [
    page.getByRole('button', { name: /connect|wallet/i }),
    page.getByText(/swap/i).first(),
    page.locator('[data-testid*="swap" i]').first()
  ];
}

export function zoroSwapConnectLocators(page: Page) {
  const override = process.env.ZOROSWAP_CONNECT_SELECTOR;
  return [
    ...(override ? [page.locator(override)] : []),
    page.getByRole('button', { name: /connect wallet|connect|wallet/i }),
    page.locator('button:has-text("Connect")'),
    page.locator('[data-testid*="connect" i]')
  ];
}
