import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { QashAdapter } from '../adapter';
import {
  buildQashPlatformJourneyScenario,
  isTestnetMidenAddress,
  resolvePositiveNumber
} from '../scenarios';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

const scenario = buildQashPlatformJourneyScenario();

test.describe('Qash Finance continuous platform journey', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );
  test.skip(
    process.env.QASH_PLATFORM_JOURNEY !== 'true',
    'Use `yarn test:e2e:testnet:qash:platform` or set QASH_PLATFORM_JOURNEY=true to run the continuous Qash product journey.'
  );
  test.skip(
    !isTestnetMidenAddress(scenario.contact.walletAddress),
    'QASH_PLATFORM_CONTACT_WALLET_ADDRESS, QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS, or QASH_CONTACT_WALLET_ADDRESS must be a testnet Miden mtst1... address.'
  );
  test.skip(
    !isTestnetMidenAddress(scenario.invoice.walletAddress),
    'QASH_PLATFORM_INVOICE_CLIENT_WALLET_ADDRESS, QASH_INVOICE_CLIENT_WALLET_ADDRESS, QASH_PLATFORM_CONTACT_WALLET_ADDRESS, or QASH_CONTACT_WALLET_ADDRESS must be a testnet Miden mtst1... address.'
  );

  test('qash-platform-account-to-payroll-invoice-payment-link-journey', async ({
    authenticatedAppPage,
    artifacts,
    steps,
    timeline
  }) => {
    test.setTimeout(resolvePositiveNumber(process.env.QASH_PLATFORM_JOURNEY_TIMEOUT_MS, 900_000));

    const app = new QashAdapter(authenticatedAppPage, timeline);
    const accountPoolSize = resolvePositiveNumber(
      process.env.QASH_PLATFORM_ACCOUNT_POOL_SIZE || process.env.QASH_PLATFORM_MAX_ACCOUNT_COUNT,
      3
    );
    let activeAccountName = scenario.accountName;
    let faucetRequestSubmitted = false;
    const activePaymentLink = () => ({
      ...scenario.paymentLink,
      accountName: activeAccountName
    });

    timeline.emit({
      category: 'test_lifecycle',
      severity: 'info',
      source: 'qash-platform-journey',
      message: 'Qash continuous platform journey scenario resolved',
      data: {
        accountName: scenario.accountName,
        contactName: scenario.contact.name,
        contactGroup: scenario.contact.groupName,
        createContactGroup: scenario.createContactGroup,
        payrollAmount: scenario.payroll.monthlyAmount,
        payrollDurationMonths: scenario.payroll.durationMonths,
        payrollPayDay: scenario.payroll.scheduledPayDay,
        invoiceClientName: scenario.invoice.clientName,
        invoiceAmount: scenario.invoice.amount,
        paymentLinkTitle: scenario.paymentLink.title,
        paymentLinkAmount: scenario.paymentLink.amount,
        paymentLinkAccountName: scenario.paymentLink.accountName,
        accountPoolSize
      }
    });

    await steps.step('drain_pending_transactions', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.assertSectionReady('Dashboard');

      const inventory = await app.captureMultisigAccountInventory();
      if (inventory.count > inventory.names.length) {
        throw new Error(
          [
            `Qash account inventory reported ${inventory.count} account(s), but only ${inventory.names.length} visible account name(s) were parsed.`,
            'The platform journey will not continue because it cannot prove every account was checked for pending transactions.',
            `Visible accounts: ${inventory.names.join(', ') || 'none'}.`
          ].join(' ')
        );
      }

      const preDrainPending = await app.capturePendingTransactionsInventory(inventory.names);
      let drain:
        | Awaited<ReturnType<QashAdapter['drainPendingFaucetReceives']>>
        | undefined;
      let postDrainPending:
        | Awaited<ReturnType<QashAdapter['capturePendingTransactionsInventory']>>
        | undefined;

      if (process.env.QASH_PLATFORM_PENDING_AUDIT_ONLY !== 'true') {
        drain = await app.drainPendingFaucetReceives(inventory.names, {
          maxPerAccount: resolvePositiveNumber(process.env.QASH_PENDING_DRAIN_MAX_PER_ACCOUNT, 10)
        });
        postDrainPending = await app.capturePendingTransactionsInventory(inventory.names);
      }

      artifacts.writeJson('pending/pending-drain-summary.json', {
        capturedAt: new Date().toISOString(),
        inventory,
        preDrainPending,
        drain,
        postDrainPending
      });

      if (process.env.QASH_PLATFORM_PENDING_AUDIT_ONLY === 'true') return;

      if (!drain || !postDrainPending) {
        throw new Error('Qash pending transaction drain did not produce a post-drain account inventory.');
      }

      if (drain.blocked > 0 || postDrainPending.totalPending > 0) {
        throw new Error(
          [
            `Qash pending transaction drain blocked on ${drain.blocked} account(s) after clearing ${drain.drained} row(s); ${postDrainPending.totalPending} pending row(s) remain across ${postDrainPending.accounts.length} checked account(s).`,
            'The platform journey will not continue because starting with stale executable rows can create more stuck pending transactions.',
            'Inspect artifacts/pending/pending-drain-summary.json for the account-level error.'
          ].join(' ')
        );
      }
    }, {
      screenshots: [{ name: 'pending-drain', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    if (process.env.QASH_PLATFORM_PENDING_AUDIT_ONLY === 'true') {
      timeline.emit({
        category: 'test_lifecycle',
        severity: 'info',
        source: 'qash-platform-journey',
        message: 'Qash platform pending audit-only mode completed before cleanup and product journey steps'
      });
      return;
    }

    if (process.env.QASH_PLATFORM_DRAIN_ONLY === 'true') {
      timeline.emit({
        category: 'test_lifecycle',
        severity: 'info',
        source: 'qash-platform-journey',
        message: 'Qash platform pending drain-only mode completed before product journey steps'
      });
      return;
    }

    await steps.step('resolve_or_create_multisig_account', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.assertSectionReady('Dashboard');
      const selection = await app.resolveMultisigAccountPoolSelection({
        requestedAccountName: scenario.accountName,
        maxAccounts: accountPoolSize,
        allowOverCap: process.env.QASH_PLATFORM_ALLOW_ACCOUNT_OVER_CAP === 'true'
      });
      activeAccountName = selection.accountName;

      if (!selection.shouldCreate) {
        return;
      }

      await app.startMultisigAccountCreation();
      await app.assertMultisigAccountCreationReady();
      await app.fillMultisigAccountDetails(activeAccountName, scenario.accountDescription);
      await app.advanceMultisigAccountCreationStep();
      await app.assertMultisigChooseMembersReady();
      await app.advanceMultisigAccountCreationStep();
      await app.assertMultisigReviewReady(activeAccountName);
      await app.submitMultisigAccountCreation();
      const createdAccount = await app.assertMultisigAccountCreated(activeAccountName);
      artifacts.writeJson('accounts/created-multisig-account.json', createdAccount);
      await app.continueFromMultisigAccountCreated();
    }, {
      screenshots: [{ name: 'account-ready', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('request_faucet_funding', async () => {
      await app.openFaucetClaimModal();
      await app.assertFaucetClaimModalReady();
      await app.requestFaucetTokens();
      await app.assertFaucetAccountSelectionReady(activeAccountName);
      await app.selectFaucetAccount(activeAccountName);
      await app.confirmFaucetRequest();
      faucetRequestSubmitted = true;
    }, {
      screenshots: [{ name: 'faucet-request-submitted', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });

    await steps.step('settle_faucet_funding', async () => {
      if (!faucetRequestSubmitted) return;

      const accountAlreadyFunded = await app.hasAccountFundedBalanceReady(activeAccountName, {
        timeoutMs: resolvePositiveNumber(process.env.QASH_ACCOUNT_DIRECT_FUNDING_TIMEOUT_MS, 15_000)
      });

      if (!accountAlreadyFunded) {
        await app.waitForPendingFaucetReceiveReady({
          timeoutMs: resolvePositiveNumber(process.env.QASH_PENDING_FAUCET_RECEIVE_TIMEOUT_MS, 300_000),
          accountName: activeAccountName
        });
        await app.completePendingFaucetReceive(activeAccountName);
      }
    }, {
      screenshots: [{ name: 'faucet-funding-settled', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });

    await steps.step('confirm_funded_balance', async () => {
      await app.waitForAccountFundedBalanceReady(activeAccountName);
    }, {
      screenshots: [{ name: 'funded-balance-ready', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() },
        { name: 'account-funding-state', capture: () => app.captureAccountFundingState(activeAccountName) }
      ]
    });

    await steps.step('open_contacts_tab', async () => {
      await app.openContactBook();
    }, {
      screenshots: [{ name: 'contact-book', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    const contactGroup = scenario.contact.groupName;
    if (scenario.createContactGroup && contactGroup) {
      await steps.step('create_contact_group', async () => {
        await app.createContactGroup(contactGroup);
      }, {
        screenshots: [{ name: 'contact-group-created', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    }

    await steps.step('create_employee_contact', async () => {
      await app.startAddContact();
      await app.assertAddContactFormReady();
      await app.selectContactType('Employee');
      await app.assertContactDetailsFormReady();
      await app.fillContactDetails(scenario.contact);
      await app.assertContactReadyToSubmit();
      await app.submitContact();
      await app.assertContactCreated(scenario.contact);
    }, {
      screenshots: [{ name: 'employee-contact-created', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('open_payroll_tab', async () => {
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

    await steps.step('confirm_and_create_payroll', async () => {
      await app.confirmPayrollCreate();
      await app.assertPayrollCreated(scenario.payroll);
    }, {
      screenshots: [{ name: 'payroll-created-overview', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('create_invoice_client_contact', async () => {
      await app.openContactBook();
      await app.startAddContact();
      await app.assertAddContactFormReady();
      await app.selectContactType('Client');
      await app.assertClientContactFormReady();
      await app.fillClientContactDetails(scenario.invoiceClient);
      await app.assertClientContactReadyToSubmit();
      await app.submitClientContact();
      await app.assertClientContactCreated(scenario.invoiceClient);
    }, {
      screenshots: [{ name: 'invoice-client-contact-created', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('open_invoice_create_form', async () => {
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

    await steps.step('confirm_and_view_invoice', async () => {
      await app.confirmInvoiceCreate();
      await app.assertInvoiceCreated(scenario.invoice);
      await app.viewCreatedInvoiceForVerification(scenario.invoice, 3_000);
    }, {
      screenshots: [{ name: 'invoice-created-and-viewed', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('return_to_invoice_dashboard', async () => {
      await app.returnToInvoiceDashboardAfterVerification(scenario.invoice, 2_000);
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
      await app.fillPaymentLinkDetails(activePaymentLink());
      await app.assertPaymentLinkReadyToSubmit(activePaymentLink());
    }, {
      screenshots: [{ name: 'payment-link-form-filled', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('submit_payment_link_create', async () => {
      await app.submitPaymentLinkCreate();
      await app.assertPaymentLinkCreated(activePaymentLink());
    }, {
      screenshots: [{ name: 'payment-link-created-overview', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });
});
