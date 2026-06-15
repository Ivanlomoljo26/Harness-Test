import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { ExampleAppAdapter } from '../adapter';

test.describe('Example App Smoke', () => {
  test.skip(!shouldRunApp('example-app' as never), 'E2E_APP does not include Example App');

  test('app-shell-smoke', async ({ appPage, steps, timeline }) => {
    const app = new ExampleAppAdapter(appPage, timeline);

    await steps.step('open_app', async () => {
      await app.open();
      await app.assertReady();
    }, {
      screenshots: [{ name: 'app-shell', page: appPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });
});
