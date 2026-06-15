import { expect, type Page } from '@playwright/test';

import { getAppConfig } from '../../config/apps';
import type { TimelineRecorder } from '../../harness/timeline-recorder';
import { BaseAppAdapter } from '../app-adapter';
import {
  appAuthenticatedShellLocators,
  appPrimaryActionLocators,
  appReadyLocators
} from './selectors';

export class ExampleAppAdapter extends BaseAppAdapter {
  readonly config = getAppConfig('example-app' as never);

  constructor(page: Page, timeline: TimelineRecorder) {
    super(page, timeline);
  }

  async assertReady(): Promise<void> {
    await this.expectAnyReadySignal(appReadyLocators(this.page));
  }

  async assertAuthenticatedShellReady(): Promise<void> {
    await this.expectAnyReadySignal(appAuthenticatedShellLocators(this.page));
  }

  async startPrimaryAction(): Promise<void> {
    await this.clickFirstVisible('Example app primary action', appPrimaryActionLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertPrimaryActionReady(): Promise<void> {
    await expect(this.page.getByText(/replace with real action heading/i).first()).toBeVisible({ timeout: 15_000 });
  }
}
