import type { Page } from '@playwright/test';

export function appReadyLocators(page: Page) {
  return [
    page.getByRole('heading', { name: /replace with real app heading/i }),
    page.getByText(/replace with stable landing text/i).first()
  ];
}

export function appAuthenticatedShellLocators(page: Page) {
  return [
    page.getByText(/replace with dashboard text/i).first(),
    page.getByRole('navigation').first()
  ];
}

export function appPrimaryActionLocators(page: Page) {
  const override = process.env.EXAMPLE_APP_PRIMARY_ACTION_SELECTOR;
  return [
    ...(override ? [page.locator(override)] : []),
    page.getByRole('button', { name: /replace with action name/i }),
    page.getByText(/replace with action name/i).first()
  ];
}
