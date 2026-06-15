import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { QashAdapter } from '../adapter';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance authenticated profile', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );

  test('authenticated-session-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_authenticated_app', async () => {
      await app.open();
      await app.assertAuthenticatedReady();
    }, {
      screenshots: [{ name: 'authenticated-app', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });
});
