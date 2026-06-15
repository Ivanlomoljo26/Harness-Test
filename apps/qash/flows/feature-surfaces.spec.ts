import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { QashAdapter } from '../adapter';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance feature surfaces', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );

  test('invoice-overview-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_invoice', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openInvoice();
    }, {
      screenshots: [{ name: 'invoice-overview', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test('bills-overview-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_bills', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openBills();
    }, {
      screenshots: [{ name: 'bills-overview', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test('payment-links-overview-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_payment_links', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openPaymentLinks();
    }, {
      screenshots: [{ name: 'payment-links-overview', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test.describe('Account-backed feature actions', () => {
    test.skip(
      process.env.QASH_REQUIRE_FEATURE_CREATE_ACTIONS !== 'true',
      'Set QASH_REQUIRE_FEATURE_CREATE_ACTIONS=true to require Invoice and Payment Link create actions.'
    );

    test('invoice-create-action-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
      const app = new QashAdapter(authenticatedAppPage, timeline);

      await steps.step('open_invoice_create_action', async () => {
        await app.open();
        await app.assertAuthenticatedShellReady();
        await app.openInvoice();
        await app.assertInvoiceCreateAvailable();
      }, {
        screenshots: [{ name: 'invoice-create-action', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    });

    test('payment-link-create-action-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
      const app = new QashAdapter(authenticatedAppPage, timeline);

      await steps.step('open_payment_link_create_action', async () => {
        await app.open();
        await app.assertAuthenticatedShellReady();
        await app.openPaymentLinks();
        await app.assertPaymentLinkCreateAvailable();
      }, {
        screenshots: [{ name: 'payment-link-create-action', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    });
  });

  test('transactions-overview-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_transactions', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openTransactions();
    }, {
      screenshots: [{ name: 'transactions-overview', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test('settings-account-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_settings', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openSettings();
    }, {
      screenshots: [{ name: 'settings-account', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });
});
