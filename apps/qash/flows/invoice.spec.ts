import type { Page } from '@playwright/test';

import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import type { TestStepRunner } from '../../../harness/test-step';
import { QashAdapter, type QashClientContactDetails } from '../adapter';
import { buildQashInvoiceScenario, isTestnetMidenAddress } from '../scenarios';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance Invoice', () => {
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

  test('invoice-create-form-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

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
  });

  test.describe('Invoice form fill regression', () => {
    const scenario = buildQashInvoiceScenario();

    test.skip(
      !shouldRunInvoiceFormFill(),
      'Set QASH_FILL_INVOICE_FORM=true or QASH_CREATE_INVOICE=true to fill the state-aware Qash Invoice form.'
    );
    test.skip(
      !scenario.invoice.clientName,
      'QASH_INVOICE_CLIENT_NAME is required unless QASH_CREATE_INVOICE_CLIENT=true creates a unique client.'
    );
    test.skip(
      !isTestnetMidenAddress(scenario.invoice.walletAddress),
      'QASH_INVOICE_CLIENT_WALLET_ADDRESS or QASH_CONTACT_WALLET_ADDRESS must be a testnet Miden mtst1... address.'
    );

    test('invoice-form-fill-regression', async ({ authenticatedAppPage, steps, timeline }) => {
      const app = new QashAdapter(authenticatedAppPage, timeline);

      await ensureInvoiceClientContact(app, scenario.contact, steps, authenticatedAppPage);

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
        await app.fillInvoiceDetails(scenario.invoice);
        await app.assertInvoiceReadyToSubmit(scenario.invoice);
      }, {
        screenshots: [{ name: 'invoice-form-filled', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    });
  });

  test.describe('Invoice creation regression', () => {
    const scenario = buildQashInvoiceScenario();

    test.skip(
      process.env.QASH_CREATE_INVOICE !== 'true' || process.env.QASH_CREATE_INVOICE_WIZARD_EXPERIMENTAL !== 'true',
      'Set QASH_CREATE_INVOICE=true and QASH_CREATE_INVOICE_WIZARD_EXPERIMENTAL=true to attempt the stateful Qash Invoice creation wizard.'
    );
    test.skip(
      !scenario.invoice.clientName,
      'QASH_INVOICE_CLIENT_NAME is required unless QASH_CREATE_INVOICE_CLIENT=true creates a unique client.'
    );
    test.skip(
      !isTestnetMidenAddress(scenario.invoice.walletAddress),
      'QASH_INVOICE_CLIENT_WALLET_ADDRESS or QASH_CONTACT_WALLET_ADDRESS must be a testnet Miden mtst1... address.'
    );

    test('invoice-create-transaction-regression', async ({ authenticatedAppPage, steps, timeline }) => {
      const app = new QashAdapter(authenticatedAppPage, timeline);

      await ensureInvoiceClientContact(app, scenario.contact, steps, authenticatedAppPage);

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
        await app.fillInvoiceDetails(scenario.invoice);
        await app.assertInvoiceReadyToSubmit(scenario.invoice);
      }, {
        screenshots: [{ name: 'invoice-form-filled', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('open_invoice_review', async () => {
        await app.submitInvoiceCreate();
        await app.assertInvoiceReviewReady(scenario.invoice);
      }, {
        screenshots: [{ name: 'invoice-review', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('confirm_invoice_create', async () => {
        await app.confirmInvoiceCreate();
        await app.assertInvoiceCreated(scenario.invoice);
      }, {
        screenshots: [{ name: 'invoice-created-overview', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    });
  });
});

function shouldRunInvoiceFormFill(): boolean {
  return process.env.QASH_FILL_INVOICE_FORM === 'true' || process.env.QASH_CREATE_INVOICE === 'true';
}

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
