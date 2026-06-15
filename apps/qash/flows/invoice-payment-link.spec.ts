import type { Page } from '@playwright/test';

import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import type { TestStepRunner } from '../../../harness/test-step';
import { QashAdapter, type QashClientContactDetails } from '../adapter';
import { buildQashInvoiceScenario, buildQashPaymentLinkScenario, isTestnetMidenAddress } from '../scenarios';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance Invoice to Payment Link', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );

  test.describe('Combined creation regression', () => {
    const invoiceScenario = buildQashInvoiceScenario({ shouldCreateClient: true });
    const paymentLinkScenario = buildQashPaymentLinkScenario();

    test.skip(
      process.env.QASH_CREATE_INVOICE_AND_PAYMENT_LINK !== 'true' ||
        process.env.QASH_CREATE_INVOICE_WIZARD_EXPERIMENTAL !== 'true' ||
        process.env.QASH_CREATE_PAYMENT_LINK_EXPERIMENTAL !== 'true',
      'Set QASH_CREATE_INVOICE_AND_PAYMENT_LINK=true, QASH_CREATE_INVOICE_WIZARD_EXPERIMENTAL=true, and QASH_CREATE_PAYMENT_LINK_EXPERIMENTAL=true to run the combined mutation flow.'
    );
    test.skip(
      !isTestnetMidenAddress(invoiceScenario.invoice.walletAddress),
      'QASH_INVOICE_CLIENT_WALLET_ADDRESS or QASH_CONTACT_WALLET_ADDRESS must be a testnet Miden mtst1... address.'
    );

    test('invoice-to-payment-link-create-regression', async ({ authenticatedAppPage, steps, timeline }) => {
      const app = new QashAdapter(authenticatedAppPage, timeline);

      await ensureInvoiceClientContact(app, invoiceScenario.contact, steps, authenticatedAppPage);

      await steps.step('open_invoice_create_form', async () => {
        await app.open();
        await app.assertAuthenticatedShellReady();
        await app.openInvoice();
        await app.startCreateInvoice();
        await app.assertCreateInvoiceFormReady();
      }, {
        screenshots: [{ name: 'invoice-create-form', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('fill_invoice_form', async () => {
        await app.fillInvoiceDetails(invoiceScenario.invoice);
        await app.assertInvoiceReadyToSubmit(invoiceScenario.invoice);
      }, {
        screenshots: [{ name: 'invoice-form-filled', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('open_invoice_review', async () => {
        await app.submitInvoiceCreate();
        await app.assertInvoiceReviewReady(invoiceScenario.invoice);
      }, {
        screenshots: [{ name: 'invoice-review', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('confirm_and_view_invoice', async () => {
        await app.confirmInvoiceCreate();
        await app.assertInvoiceCreated(invoiceScenario.invoice);
        await app.viewCreatedInvoiceForVerification(invoiceScenario.invoice, 3_000);
      }, {
        screenshots: [{ name: 'invoice-created-and-viewed', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('return_to_invoice_dashboard', async () => {
        await app.returnToInvoiceDashboardAfterVerification(invoiceScenario.invoice, 2_000);
      }, {
        screenshots: [{ name: 'invoice-dashboard-verified', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('open_payment_link_create_form', async () => {
        await app.openPaymentLinks();
        await app.startCreatePaymentLink();
        await app.assertCreatePaymentLinkFormReady();
      }, {
        screenshots: [{ name: 'payment-link-create-form', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('fill_payment_link_form', async () => {
        await app.fillPaymentLinkDetails(paymentLinkScenario.paymentLink);
        await app.assertPaymentLinkReadyToSubmit(paymentLinkScenario.paymentLink);
      }, {
        screenshots: [{ name: 'payment-link-form-filled', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('submit_payment_link_create', async () => {
        await app.submitPaymentLinkCreate();
        await app.assertPaymentLinkCreated(paymentLinkScenario.paymentLink);
      }, {
        screenshots: [{ name: 'payment-link-created-overview', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    });
  });
});

async function ensureInvoiceClientContact(
  app: QashAdapter,
  contact: QashClientContactDetails | undefined,
  steps: TestStepRunner,
  page: Page
): Promise<void> {
  if (!contact) return;

  await steps.step('create_invoice_client_contact', async () => {
    await app.open();
    await app.assertAuthenticatedShellReady();
    await app.openContactBook();

    await app.startAddContact();
    await app.assertAddContactFormReady();
    await app.selectContactType('Client');
    await app.assertClientContactFormReady();
    await app.fillClientContactDetails(contact);
    await app.assertClientContactReadyToSubmit();
    await app.submitClientContact();
    await app.assertClientContactCreated(contact);
  }, {
    screenshots: [{ name: 'invoice-client-contact-created', page }],
    snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
  });
}
