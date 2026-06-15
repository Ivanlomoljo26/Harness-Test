import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import type { StepOptions } from '../../../harness/types';
import { QashAdapter, type QashMultisigAccountPoolSelection, type QashPaymentLinkDetails } from '../adapter';
import {
  buildQashUserPaymentStressScenario,
  isTestnetMidenAddress,
  resolvePositiveNumber
} from '../scenarios';

type QashPendingTransactionState = 'none' | 'pending' | 'signed' | 'executed';
type QashDurabilityOperationName =
  | 'payroll-contact-group'
  | 'payroll-contact'
  | 'payroll'
  | 'pending-transaction-observation'
  | 'invoice-client'
  | 'invoice'
  | 'payment-link';

interface QashDurabilityOperationResult {
  operation: QashDurabilityOperationName;
  status: 'passed' | 'failed';
  durationMs: number;
  details?: Record<string, unknown>;
  error?: string;
}

interface QashDurabilityIterationResult {
  index: number;
  status: 'passed' | 'failed';
  operations: QashDurabilityOperationResult[];
}

const actorAProfileDir = process.env.QASH_AUTH_USER_DATA_DIR || process.env.APP_AUTH_USER_DATA_DIR;
const userSelectedLoopCount = process.env.QASH_STRESS_LOOPS ||
  process.env.QASH_DURABILITY_LOOPS ||
  process.env.QASH_DURABILITY_PAYMENT_LOOPS;
const scenario = buildQashUserPaymentStressScenario();
const skipFaucetIfFunded = process.env.QASH_STRESS_SKIP_FAUCET_IF_FUNDED === 'true' ||
  process.env.QASH_DURABILITY_SKIP_FAUCET_IF_FUNDED === 'true';

test.describe('Qash Finance stress', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !actorAProfileDir,
    'QASH_AUTH_USER_DATA_DIR or APP_AUTH_USER_DATA_DIR is required for the actor-a sender profile.'
  );
  test.skip(
    process.env.QASH_STRESS !== 'true' && process.env.QASH_DURABILITY_STRESS !== 'true',
    'Use `yarn test:e2e:testnet:qash:stress` or set QASH_STRESS=true to run Qash stress.'
  );
  test.skip(
    !userSelectedLoopCount || !/^[1-9]\d*$/.test(userSelectedLoopCount),
    'QASH_STRESS_LOOPS must be a user-selected positive integer; QASH_DURABILITY_LOOPS is only a compatibility alias.'
  );
  test.skip(
    !isTestnetMidenAddress(scenario.contact.walletAddress),
    'QASH_STRESS_RECEIVER_WALLET_ADDRESS or QASH_ACTOR_B_WALLET_ADDRESS must be actor-b\'s testnet Miden mtst1... receive address.'
  );
  test.skip(
    !scenario.includePayroll && !scenario.includeInvoice && !scenario.includePaymentLink,
    'At least one Qash stress workload surface must be enabled.'
  );

  test('qash-mixed-platform-stress', async ({ authenticatedAppPage, artifacts, steps, timeline }) => {
    test.setTimeout(resolvePositiveNumber(
      process.env.QASH_STRESS_TIMEOUT_MS || process.env.QASH_DURABILITY_TIMEOUT_MS,
      1_800_000
    ));

    const app = new QashAdapter(authenticatedAppPage, timeline);
    let activeAccountName = scenario.accountName;
    let accountSelection: QashMultisigAccountPoolSelection | undefined;
    const iterationResults: QashDurabilityIterationResult[] = [];
    let failures = 0;

    const runOperation = async (
      operation: QashDurabilityOperationName,
      stepName: string,
      action: () => Promise<void>,
      options: StepOptions = {},
      details: Record<string, unknown> = {}
    ): Promise<QashDurabilityOperationResult> => {
      const startedAt = Date.now();
      try {
        await app.assertAuthenticatedSessionHealthy(`before ${stepName}`);
        await steps.step(stepName, action, options);
        await app.assertAuthenticatedSessionHealthy(`after ${stepName}`);
        const passed = {
          operation,
          status: 'passed' as const,
          durationMs: Date.now() - startedAt
        };
        return Object.keys(details).length > 0 ? { ...passed, details } : passed;
      } catch (error) {
        const failed = {
          operation,
          status: 'failed' as const,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error)
        };
        return Object.keys(details).length > 0 ? { ...failed, details } : failed;
      }
    };

    timeline.emit({
      category: 'test_lifecycle',
      severity: 'info',
      source: 'qash-stress',
      message: 'Qash mixed platform stress workload resolved',
      data: {
        actorAProfileDir,
        accountName: scenario.accountName,
        receiverName: scenario.contact.name,
        receiverWalletAddress: scenario.contact.walletAddress,
        receiverSettlementRequired: false,
        contactGroup: scenario.contact.groupName,
        createContactGroup: scenario.createContactGroup,
        loopCount: scenario.loopCount,
        failureBudget: scenario.failureBudget,
        accountPoolSize: scenario.accountPoolSize,
        attemptPendingTransactions: scenario.attemptPendingTransactions,
        skipFaucetIfFunded,
        includePayroll: scenario.includePayroll,
        includeInvoice: scenario.includeInvoice,
        includePaymentLink: scenario.includePaymentLink,
        payrollContactGroups: scenario.iterations.map(iteration => iteration.payrollContact.groupName),
        payrollContactNames: scenario.iterations.map(iteration => iteration.payrollContact.name),
        payrollAmounts: scenario.iterations.map(iteration => iteration.payroll.monthlyAmount),
        invoiceAmounts: scenario.iterations.map(iteration => iteration.invoice.amount),
        paymentLinkAmounts: scenario.iterations.map(iteration => iteration.paymentLink.amount)
      }
    });

    await steps.step('setup_actor_a_account', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.assertSectionReady('Dashboard');
      await app.assertAuthenticatedSessionHealthy('before resolving Actor A account pool');
      accountSelection = await app.resolveOrCreateMultisigAccountFromPool({
        requestedAccountName: scenario.accountName,
        accountDescription: scenario.accountDescription,
        maxAccounts: scenario.accountPoolSize,
        allowOverCap: process.env.QASH_STRESS_ALLOW_ACCOUNT_OVER_CAP === 'true' ||
          process.env.QASH_DURABILITY_ALLOW_ACCOUNT_OVER_CAP === 'true'
      });
      activeAccountName = accountSelection.accountName;
      if (accountSelection.createdAccount) {
        artifacts.writeJson('accounts/actor-a-created-multisig-account.json', accountSelection.createdAccount);
      }
      await app.assertAuthenticatedSessionHealthy('after resolving Actor A account pool');
    }, {
      screenshots: [{ name: 'actor-a-account-ready', page: authenticatedAppPage }],
      snapshots: [{ name: 'actor-a-app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('setup_actor_a_faucet_funding', async () => {
      if (skipFaucetIfFunded) {
        const alreadyFunded = await app.hasAccountFundedBalanceReady(activeAccountName, {
          timeoutMs: resolvePositiveNumber(process.env.QASH_STRESS_EXISTING_FUNDING_TIMEOUT_MS, 30_000)
        });

        if (alreadyFunded) {
          timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: 'qash-stress',
            message: 'Skipped Qash stress faucet setup because the selected account is already funded',
            data: {
              accountName: activeAccountName,
              reason: 'QASH_STRESS_SKIP_FAUCET_IF_FUNDED'
            }
          });
          await app.assertAuthenticatedSessionHealthy('after skipping Actor A faucet funding setup');
          return;
        }
      }

      await app.requestAndSettleFaucetFunding(activeAccountName);
      await app.assertAuthenticatedSessionHealthy('after Actor A faucet funding setup');
    }, {
      screenshots: [{ name: 'actor-a-faucet-settled', page: authenticatedAppPage }],
      snapshots: [
        { name: 'actor-a-app-state', capture: () => app.captureAppState() },
        { name: 'actor-a-funding-state', capture: () => app.captureFaucetFundingState() },
        {
          name: 'actor-a-account-funding-state',
          capture: () => app.captureAccountFundingState(activeAccountName)
        }
      ]
    });

    for (const iteration of scenario.iterations) {
      const operations: QashDurabilityOperationResult[] = [];
      let iterationStatus: QashDurabilityIterationResult['status'] = 'passed';
      let failureToThrow: Error | undefined;

      const recordOperation = async (
        operation: QashDurabilityOperationName,
        stepName: string,
        action: () => Promise<void>,
        options: StepOptions,
        details: Record<string, unknown>
      ): Promise<boolean> => {
        const result = await runOperation(operation, stepName, action, options, details);
        operations.push(result);
        if (result.status === 'passed') return true;

        failures += 1;
        iterationStatus = 'failed';
        timeline.emit({
          category: 'error',
          severity: failures > scenario.failureBudget ? 'error' : 'warn',
          source: 'qash-stress',
          message: `Qash stress operation failed: loop ${iteration.index} ${operation}`,
          data: {
            iteration: iteration.index,
            operation,
            failures,
            failureBudget: scenario.failureBudget,
            error: result.error
          }
        });
        if (failures > scenario.failureBudget) {
          failureToThrow = new Error(
            `Qash stress failure budget exceeded at loop ${iteration.index} ${operation}: ${result.error}`
          );
        }
        return false;
      };

      if (scenario.includePayroll) {
        const contactGroupReady = iteration.payrollContact.groupName
          ? await recordOperation(
              'payroll-contact-group',
              `loop_${iteration.index}_create_payroll_contact_group`,
              async () => {
                await app.openContactBook();
                await app.createContactGroup(iteration.payrollContact.groupName as string);
              },
              {
                screenshots: [{ name: `loop-${iteration.index}-payroll-contact-group-created`, page: authenticatedAppPage }],
                snapshots: [{ name: 'actor-a-app-state', capture: () => app.captureAppState() }]
              },
              {
                groupName: iteration.payrollContact.groupName
              }
            )
          : true;

        let payrollContactReady = false;
        if (contactGroupReady && !failureToThrow) {
          payrollContactReady = await recordOperation(
            'payroll-contact',
            `loop_${iteration.index}_create_payroll_employee_contact`,
            async () => {
              await app.openContactBook();
              await app.startAddContact();
              await app.assertAddContactFormReady();
              await app.selectContactType('Employee');
              await app.assertContactDetailsFormReady();
              await app.fillContactDetails(iteration.payrollContact);
              await app.assertContactReadyToSubmit();
              await app.submitContact();
              await app.assertContactCreated(iteration.payrollContact);
            },
            {
              screenshots: [{ name: `loop-${iteration.index}-payroll-contact-created`, page: authenticatedAppPage }],
              snapshots: [{ name: 'actor-a-app-state', capture: () => app.captureAppState() }]
            },
            {
              employeeName: iteration.payrollContact.name,
              employeeEmail: iteration.payrollContact.email,
              groupName: iteration.payrollContact.groupName,
              receiverWalletAddress: iteration.payrollContact.walletAddress
            }
          );
        }

        let payrollReady = false;
        if (contactGroupReady && payrollContactReady && !failureToThrow) {
          payrollReady = await recordOperation(
            'payroll',
            `loop_${iteration.index}_create_payroll`,
            async () => {
              await app.openPayroll();
              await app.startNewPayroll();
              await app.assertNewPayrollFormReady();
              await app.fillPayrollDetails(iteration.payroll);
              await app.assertPayrollReadyToSubmit();
              await app.submitPayrollCreate();
              await app.assertPayrollReviewReady(iteration.payroll);
              await app.confirmPayrollCreate();
              await app.assertPayrollCreated(iteration.payroll);
            },
            {
              screenshots: [{ name: `loop-${iteration.index}-payroll-created`, page: authenticatedAppPage }],
              snapshots: [{ name: 'actor-a-app-state', capture: () => app.captureAppState() }]
            },
            {
              employeeName: iteration.payroll.employeeName,
              amount: iteration.payroll.monthlyAmount,
              receiverWalletAddress: iteration.payroll.walletAddress
            }
          );
        }

        if (payrollReady && scenario.attemptPendingTransactions) {
          let pendingTransactionState: QashPendingTransactionState = 'none';
          const pendingTransactionDetails: Record<string, unknown> = { pendingTransactionState };
          await recordOperation(
            'pending-transaction-observation',
            `loop_${iteration.index}_observe_pending_transaction`,
            async () => {
              pendingTransactionState = await app.completeVisiblePendingTransaction();
              pendingTransactionDetails.pendingTransactionState = pendingTransactionState;
            },
            {
              screenshots: [{ name: `loop-${iteration.index}-pending-transaction`, page: authenticatedAppPage }],
              snapshots: [{ name: 'actor-a-app-state', capture: () => app.captureAppState() }]
            },
            pendingTransactionDetails
          );
        }
      }

      if (!failureToThrow && iterationStatus === 'passed' && scenario.includeInvoice) {
        const clientReady = await recordOperation(
          'invoice-client',
          `loop_${iteration.index}_create_invoice_client`,
          async () => {
            await app.openContactBook();
            await app.startAddContact();
            await app.assertAddContactFormReady();
            await app.selectContactType('Client');
            await app.assertClientContactFormReady();
            await app.fillClientContactDetails(iteration.invoiceClient);
            await app.assertClientContactReadyToSubmit();
            await app.submitClientContact();
            await app.assertClientContactCreated(iteration.invoiceClient);
          },
          {
            screenshots: [{ name: `loop-${iteration.index}-invoice-client-created`, page: authenticatedAppPage }],
            snapshots: [{ name: 'actor-a-app-state', capture: () => app.captureAppState() }]
          },
          {
            clientName: iteration.invoiceClient.companyName,
            clientEmail: iteration.invoiceClient.email
          }
        );

        if (clientReady) {
          await recordOperation(
            'invoice',
            `loop_${iteration.index}_create_invoice`,
            async () => {
              await app.openInvoice();
              await app.startCreateInvoice();
              await app.assertCreateInvoiceFormReady();
              await app.fillInvoiceDetails(iteration.invoice);
              await app.assertInvoiceReadyToSubmit(iteration.invoice);
              await app.submitInvoiceCreate();
              await app.assertInvoiceReviewReady(iteration.invoice);
              await app.confirmInvoiceCreate();
              await app.assertInvoiceCreated(iteration.invoice);
              await app.viewCreatedInvoiceForVerification(iteration.invoice, 1_000);
              await app.returnToInvoiceDashboardAfterVerification(iteration.invoice, 1_000);
            },
            {
              screenshots: [{ name: `loop-${iteration.index}-invoice-created`, page: authenticatedAppPage }],
              snapshots: [{ name: 'actor-a-app-state', capture: () => app.captureAppState() }]
            },
            {
              clientName: iteration.invoice.clientName,
              amount: iteration.invoice.amount,
              receiverWalletAddress: iteration.invoice.walletAddress
            }
          );
        }
      }

      if (!failureToThrow && iterationStatus === 'passed' && scenario.includePaymentLink) {
        const paymentLink: QashPaymentLinkDetails = {
          ...iteration.paymentLink,
          accountName: activeAccountName
        };
        await recordOperation(
          'payment-link',
          `loop_${iteration.index}_create_payment_link`,
          async () => {
            await app.openPaymentLinks();
            await app.startCreatePaymentLink();
            await app.assertCreatePaymentLinkFormReady();
            await app.fillPaymentLinkDetails(paymentLink);
            await app.assertPaymentLinkReadyToSubmit(paymentLink);
            await app.submitPaymentLinkCreate();
            await app.assertPaymentLinkCreated(paymentLink);
          },
          {
            screenshots: [{ name: `loop-${iteration.index}-payment-link-created`, page: authenticatedAppPage }],
            snapshots: [{ name: 'actor-a-app-state', capture: () => app.captureAppState() }]
          },
          {
            title: paymentLink.title,
            amount: paymentLink.amount,
            accountName: activeAccountName
          }
        );
      }

      await app.assertAuthenticatedSessionHealthy(`before loop ${iteration.index} artifact capture`);
      const loopArtifact = {
        index: iteration.index,
        status: iterationStatus,
        accountName: activeAccountName,
        receiverName: scenario.contact.name,
        receiverWalletAddress: scenario.contact.walletAddress,
        payrollContact: iteration.payrollContact,
        receiverSettlementRequired: false,
        operations,
        senderAccountFundingState: await app.captureAccountFundingState(activeAccountName)
      };
      artifacts.writeJson(`stress/loop-${iteration.index}.json`, loopArtifact);
      artifacts.writeJson(`durability/loop-${iteration.index}.json`, loopArtifact);
      await app.assertAuthenticatedSessionHealthy(`after loop ${iteration.index} artifact capture`);
      iterationResults.push({
        index: iteration.index,
        status: iterationStatus,
        operations
      });

      if (failureToThrow) throw failureToThrow;
    }

    const summary = {
      workload: 'mixed-platform',
      accountName: activeAccountName,
      accountSelection,
      receiverName: scenario.contact.name,
      receiverWalletAddress: scenario.contact.walletAddress,
      receiverSettlementRequired: false,
      loopCount: scenario.loopCount,
      failureBudget: scenario.failureBudget,
      failures,
      includePayroll: scenario.includePayroll,
      includeInvoice: scenario.includeInvoice,
      includePaymentLink: scenario.includePaymentLink,
      skipFaucetIfFunded,
      attemptPendingTransactions: scenario.attemptPendingTransactions,
      results: iterationResults,
      totals: summarizeDurabilityResults(iterationResults)
    };
    artifacts.writeJson('qash-stress-summary.json', summary);
    artifacts.writeJson('qash-durability-stress-summary.json', summary);
  });
});

function summarizeDurabilityResults(iterations: QashDurabilityIterationResult[]) {
  const operations = iterations.flatMap(iteration => iteration.operations);
  const passedOperations = operations.filter(operation => operation.status === 'passed');
  const failedOperations = operations.filter(operation => operation.status === 'failed');
  const durationByOperation = new Map<QashDurabilityOperationName, number[]>();

  for (const operation of operations) {
    const durations = durationByOperation.get(operation.operation) ?? [];
    durations.push(operation.durationMs);
    durationByOperation.set(operation.operation, durations);
  }

  return {
    loops: iterations.length,
    passedLoops: iterations.filter(iteration => iteration.status === 'passed').length,
    failedLoops: iterations.filter(iteration => iteration.status === 'failed').length,
    operations: operations.length,
    passedOperations: passedOperations.length,
    failedOperations: failedOperations.length,
    operationDurationMs: Object.fromEntries(
      Array.from(durationByOperation.entries()).map(([operation, durations]) => [
        operation,
        {
          min: Math.min(...durations),
          max: Math.max(...durations),
          average: Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
        }
      ])
    )
  };
}
