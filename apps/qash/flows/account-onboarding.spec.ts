import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { QashAdapter } from '../adapter';

test.describe('Qash Finance account onboarding', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');

  test('account-onboarding-smoke', async ({ appPage, steps, timeline }) => {
    const app = new QashAdapter(appPage, timeline);

    await steps.step('open_app', async () => {
      await app.open();
      await app.assertReady();
    }, {
      screenshots: [{ name: 'app', page: appPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('start_account_creation', async () => {
      await app.startAccountCreation();
      await app.assertAccountCreationReady();
    }, {
      screenshots: [{ name: 'auth-or-onboarding', page: appPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });
});
