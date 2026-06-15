import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { QashAdapter } from '../adapter';
import { buildQashPaymentLinkScenario } from '../scenarios';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance Payment Link', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );

  test('payment-link-overview-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
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

  test('payment-link-create-form-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_payment_link_create_form', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openPaymentLinks();
      await app.startCreatePaymentLink();
      await app.assertCreatePaymentLinkFormReady();
    }, {
      screenshots: [{ name: 'payment-link-create-form', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test.describe('Payment Link form fill regression', () => {
    const scenario = buildQashPaymentLinkScenario();

    test.skip(
      !shouldRunPaymentLinkFormFill(),
      'Set QASH_FILL_PAYMENT_LINK_FORM=true or QASH_CREATE_PAYMENT_LINK=true to fill the Qash Payment Link form.'
    );

    test('payment-link-form-fill-regression', async ({ authenticatedAppPage, steps, timeline }) => {
      const app = new QashAdapter(authenticatedAppPage, timeline);

      await steps.step('open_payment_link_create_form', async () => {
        await app.open();
        await app.assertAuthenticatedShellReady();
        await app.openPaymentLinks();
        await app.startCreatePaymentLink();
        await app.assertCreatePaymentLinkFormReady();
      }, {
        screenshots: [{ name: 'payment-link-create-form', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('fill_payment_link_form', async () => {
        await app.fillPaymentLinkDetails(scenario.paymentLink);
        await app.assertPaymentLinkReadyToSubmit(scenario.paymentLink);
      }, {
        screenshots: [{ name: 'payment-link-form-filled', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    });
  });

  test.describe('Payment Link creation regression', () => {
    const scenario = buildQashPaymentLinkScenario();

    test.skip(
      process.env.QASH_CREATE_PAYMENT_LINK !== 'true' ||
        process.env.QASH_CREATE_PAYMENT_LINK_EXPERIMENTAL !== 'true',
      'Set QASH_CREATE_PAYMENT_LINK=true and QASH_CREATE_PAYMENT_LINK_EXPERIMENTAL=true to attempt stateful Payment Link creation.'
    );

    test('payment-link-create-regression', async ({ authenticatedAppPage, steps, timeline }) => {
      const app = new QashAdapter(authenticatedAppPage, timeline);

      await steps.step('open_payment_link_create_form', async () => {
        await app.open();
        await app.assertAuthenticatedShellReady();
        await app.openPaymentLinks();
        await app.startCreatePaymentLink();
        await app.assertCreatePaymentLinkFormReady();
      }, {
        screenshots: [{ name: 'payment-link-create-form', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('fill_payment_link_form', async () => {
        await app.fillPaymentLinkDetails(scenario.paymentLink);
        await app.assertPaymentLinkReadyToSubmit(scenario.paymentLink);
      }, {
        screenshots: [{ name: 'payment-link-form-filled', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('submit_payment_link_create', async () => {
        await app.submitPaymentLinkCreate();
        await app.assertPaymentLinkCreated(scenario.paymentLink);
      }, {
        screenshots: [{ name: 'payment-link-created-overview', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    });
  });
});

function shouldRunPaymentLinkFormFill(): boolean {
  return process.env.QASH_FILL_PAYMENT_LINK_FORM === 'true' || process.env.QASH_CREATE_PAYMENT_LINK === 'true';
}
