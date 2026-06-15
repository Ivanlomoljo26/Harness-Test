import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { QashAdapter } from '../adapter';
import { qashNavigationSections, type QashSectionName } from '../selectors';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance authenticated navigation', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );

  test('authenticated-sidebar-navigation-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_authenticated_app', async () => {
      await app.open();
      await app.assertAuthenticatedReady();
    }, {
      screenshots: [{ name: 'authenticated-app', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    for (const section of qashNavigationSections) {
      await steps.step(`navigate_${sectionSlug(section)}`, async () => {
        await app.navigateToSection(section);
        await app.assertSectionReady(section);
      }, {
        screenshots: [{ name: sectionSlug(section), page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    }
  });
});

function sectionSlug(section: QashSectionName): string {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
