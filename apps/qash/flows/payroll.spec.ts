import type { Page } from '@playwright/test';

import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import type { TestStepRunner } from '../../../harness/test-step';
import { QashAdapter, type QashContactDetails } from '../adapter';
import { buildQashPayrollScenario as buildPayrollScenario, isTestnetMidenAddress } from '../scenarios';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance Payroll', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );

  test('payroll-overview-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_payroll', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openPayroll();
    }, {
      screenshots: [{ name: 'payroll-overview', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test('payroll-new-payroll-form-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_payroll', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openPayroll();
    }, {
      screenshots: [{ name: 'payroll-overview', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('open_new_payroll_form', async () => {
      await app.startNewPayroll();
      await app.assertNewPayrollFormReady();
    }, {
      screenshots: [{ name: 'new-payroll-form', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test.describe('Payroll form fill regression', () => {
    const scenario = buildPayrollScenario();

    test.skip(
      !shouldRunPayrollFormFill(),
      'Set QASH_FILL_PAYROLL_FORM=true or QASH_CREATE_PAYROLL=true to fill the state-aware Qash Payroll form.'
    );
    test.skip(
      !scenario.payroll.employeeName,
      'QASH_PAYROLL_EMPLOYEE_NAME is required unless QASH_CREATE_PAYROLL_CONTACT=true creates a unique employee.'
    );
    test.skip(
      !isTestnetMidenAddress(scenario.payroll.walletAddress),
      'QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS or QASH_CONTACT_WALLET_ADDRESS must be a testnet Miden mtst1... address.'
    );

    test('payroll-form-fill-regression', async ({ authenticatedAppPage, steps, timeline }) => {
      const app = new QashAdapter(authenticatedAppPage, timeline);

      await ensurePayrollEmployeeContact(app, scenario.contact, steps, authenticatedAppPage);

      await steps.step('open_new_payroll_form', async () => {
        await app.open();
        await app.assertAuthenticatedShellReady();
        await app.openPayroll();
        await app.startNewPayroll();
        await app.assertNewPayrollFormReady();
      }, {
        screenshots: [{ name: 'new-payroll-form', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('fill_payroll_form', async () => {
        await app.fillPayrollDetails(scenario.payroll);
        await app.assertPayrollReadyToSubmit();
      }, {
        screenshots: [{ name: 'payroll-form-filled', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    });
  });

  test.describe('Payroll transaction regression', () => {
    const scenario = buildPayrollScenario();

    test.skip(
      process.env.QASH_CREATE_PAYROLL !== 'true',
      'Set QASH_CREATE_PAYROLL=true to submit the stateful Qash Payroll creation flow.'
    );
    test.skip(
      !scenario.payroll.employeeName,
      'QASH_PAYROLL_EMPLOYEE_NAME is required unless QASH_CREATE_PAYROLL_CONTACT=true creates a unique employee.'
    );
    test.skip(
      !isTestnetMidenAddress(scenario.payroll.walletAddress),
      'QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS or QASH_CONTACT_WALLET_ADDRESS must be a testnet Miden mtst1... address.'
    );

    test('payroll-create-transaction-regression', async ({ authenticatedAppPage, steps, timeline }) => {
      const app = new QashAdapter(authenticatedAppPage, timeline);

      await steps.step('require_funded_balance', async () => {
        await app.open();
        await app.assertAuthenticatedShellReady();
        await app.waitForFundedBalanceReady();
      }, {
        screenshots: [{ name: 'funded-balance-ready', page: authenticatedAppPage }],
        snapshots: [
          { name: 'app-state', capture: () => app.captureAppState() },
          { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
        ]
      });

      await ensurePayrollEmployeeContact(app, scenario.contact, steps, authenticatedAppPage);

      await steps.step('open_new_payroll_form', async () => {
        await app.openPayroll();
        await app.startNewPayroll();
        await app.assertNewPayrollFormReady();
      }, {
        screenshots: [{ name: 'new-payroll-form', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('fill_payroll_form', async () => {
        await app.fillPayrollDetails(scenario.payroll);
        await app.assertPayrollReadyToSubmit();
      }, {
        screenshots: [{ name: 'payroll-form-filled', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('open_payroll_review', async () => {
        await app.submitPayrollCreate();
        await app.assertPayrollReviewReady(scenario.payroll);
      }, {
        screenshots: [{ name: 'payroll-review', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      await steps.step('confirm_payroll_create', async () => {
        await app.confirmPayrollCreate();
        await app.assertPayrollCreated(scenario.payroll);
      }, {
        screenshots: [{ name: 'payroll-created-overview', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });

      if (process.env.QASH_COMPLETE_PAYROLL_TRANSACTION === 'true') {
        await steps.step('complete_pending_payroll_transaction', async () => {
          const finalState = await app.completeVisiblePendingTransaction();
          timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: 'qash',
            message: 'Qash payroll pending transaction completion attempted',
            data: { finalState }
          });
        }, {
          screenshots: [{ name: 'payroll-transaction-completed', page: authenticatedAppPage }],
          snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
        });
      }
    });
  });
});

function shouldRunPayrollFormFill(): boolean {
  return process.env.QASH_FILL_PAYROLL_FORM === 'true' || process.env.QASH_CREATE_PAYROLL === 'true';
}

async function ensurePayrollEmployeeContact(
  app: QashAdapter,
  contact: QashContactDetails | undefined,
  steps: TestStepRunner,
  page: Page
): Promise<void> {
  if (!contact) return;

  await steps.step('create_payroll_employee_contact', async () => {
    await app.open();
    await app.assertAuthenticatedShellReady();
    await app.openContactBook();

    const shouldCreateGroup =
      !process.env.QASH_PAYROLL_CONTACT_GROUP ||
      process.env.QASH_CREATE_PAYROLL_CONTACT_GROUP === 'true' ||
      process.env.QASH_CREATE_CONTACT_GROUP === 'true';

    if (contact.groupName && shouldCreateGroup) {
      await app.createContactGroup(contact.groupName);
    }

    await app.startAddContact();
    await app.assertAddContactFormReady();
    await app.selectContactType('Employee');
    await app.assertContactDetailsFormReady();
    await app.fillContactDetails(contact);
    await app.assertContactReadyToSubmit();
    await app.submitContact();
    await app.assertContactCreated(contact);
  }, {
    screenshots: [{ name: 'payroll-employee-contact-created', page }],
    snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
  });
}
