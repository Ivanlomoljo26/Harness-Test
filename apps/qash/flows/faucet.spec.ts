import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { QashAdapter } from '../adapter';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance faucet funding', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );

  test('testnet-faucet-modal-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_faucet_claim_modal', async () => {
      await app.open();
      await app.assertAuthenticatedReady();
      await app.openFaucetClaimModal();
      await app.assertFaucetClaimModalReady();
    }, {
      screenshots: [{ name: 'faucet-claim-modal', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test('request-free-test-tokens', async ({ authenticatedAppPage, steps, timeline }) => {
    test.skip(
      process.env.QASH_REQUEST_FAUCET_TOKENS !== 'true',
      'Set QASH_REQUEST_FAUCET_TOKENS=true to click the Qash faucet Request free tokens control.'
    );

    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_faucet_claim_modal', async () => {
      await app.open();
      await app.assertAuthenticatedReady();
      await app.openFaucetClaimModal();
      await app.assertFaucetClaimModalReady();
    }, {
      screenshots: [{ name: 'faucet-claim-modal', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('request_faucet_tokens', async () => {
      await app.requestFaucetTokens();
      await app.assertFaucetAccountSelectionReady();
    }, {
      screenshots: [{ name: 'faucet-account-selection', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('confirm_faucet_request', async () => {
      await app.selectFaucetAccount();
      await app.confirmFaucetRequest();
    }, {
      screenshots: [{ name: 'faucet-request-submitted', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });

    let pendingFaucetReceiveVisible = false;

    await steps.step('open_pending_faucet_receive', async () => {
      await app.openPendingFaucetReceiveWorkflow();
      pendingFaucetReceiveVisible = await app.hasPendingFaucetReceiveReady();
    }, {
      screenshots: [{ name: 'faucet-receive-pending', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });

    if (pendingFaucetReceiveVisible) {
      await steps.step('claim_faucet_receive', async () => {
        await app.completePendingFaucetReceive();
      }, {
        screenshots: [{ name: 'faucet-receive-claim-submitted', page: authenticatedAppPage }],
        snapshots: [
          { name: 'app-state', capture: () => app.captureAppState() },
          { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
        ]
      });
    }

    await steps.step('wait_for_funded_balance', async () => {
      await app.waitForFundedBalanceReady();
    }, {
      screenshots: [{ name: 'faucet-funded-balance', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });
  });

  test('claim-pending-faucet-receive', async ({ authenticatedAppPage, steps, timeline }) => {
    test.skip(
      process.env.QASH_CLAIM_PENDING_FAUCET_RECEIVE !== 'true',
      'Set QASH_CLAIM_PENDING_FAUCET_RECEIVE=true to click an existing Qash Transactions -> Receive faucet Claim control.'
    );

    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_pending_faucet_receive', async () => {
      await app.open();
      await app.assertAuthenticatedReady();
      await app.openPendingFaucetReceiveWorkflow();
      await app.assertPendingFaucetReceiveReady();
    }, {
      screenshots: [{ name: 'faucet-receive-pending', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });

    await steps.step('claim_faucet_receive', async () => {
      await app.completePendingFaucetReceive();
    }, {
      screenshots: [{ name: 'faucet-receive-claim-submitted', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });

    await steps.step('wait_for_funded_balance', async () => {
      await app.waitForFundedBalanceReady();
    }, {
      screenshots: [{ name: 'faucet-funded-balance', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });
  });

  test('funded-balance-readiness', async ({ authenticatedAppPage, steps, timeline }) => {
    test.skip(
      process.env.QASH_REQUIRE_FUNDED_BALANCE !== 'true',
      'Set QASH_REQUIRE_FUNDED_BALANCE=true to require a non-zero QASH balance before transaction flows.'
    );

    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('assert_funded_balance', async () => {
      await app.open();
      await app.assertAuthenticatedReady();
      await app.waitForFundedBalanceReady();
    }, {
      screenshots: [{ name: 'funded-balance', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });
  });

  test('create-account-and-claim-faucet-token-journey', async ({ authenticatedAppPage, artifacts, steps, timeline }) => {
    test.skip(
      process.env.QASH_ACCOUNT_TO_FAUCET_JOURNEY !== 'true',
      'Set QASH_ACCOUNT_TO_FAUCET_JOURNEY=true to create a fresh account and claim faucet tokens in one run.'
    );
    test.skip(
      process.env.QASH_CONFIRM_MULTISIG_ACCOUNT_CREATE !== 'true',
      'Set QASH_CONFIRM_MULTISIG_ACCOUNT_CREATE=true to click the final Qash multisig account Create control.'
    );

    test.setTimeout(resolvePositiveNumber(process.env.QASH_ACCOUNT_TO_FAUCET_TIMEOUT_MS, 600_000));

    const app = new QashAdapter(authenticatedAppPage, timeline);
    const accountName = process.env.QASH_MULTISIG_ACCOUNT_NAME || `Pioneer E2E Live ${Date.now()}`;

    await steps.step('create_multisig_account', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.assertSectionReady('Dashboard');
      await app.startMultisigAccountCreation();
      await app.assertMultisigAccountCreationReady();
      await app.fillMultisigAccountDetails(accountName, 'Created by Pioneer E2E live account-to-faucet journey.');
      await app.advanceMultisigAccountCreationStep();
      await app.assertMultisigChooseMembersReady();
      await app.advanceMultisigAccountCreationStep();
      await app.assertMultisigReviewReady(accountName);
      await app.submitMultisigAccountCreation();
      const createdAccount = await app.assertMultisigAccountCreated(accountName);
      artifacts.writeJson('accounts/created-multisig-account.json', createdAccount);
      await app.continueFromMultisigAccountCreated();
    }, {
      screenshots: [{ name: 'account-created', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('request_faucet_tokens', async () => {
      await app.openFaucetClaimModal();
      await app.assertFaucetClaimModalReady();
      await app.requestFaucetTokens();
      await app.assertFaucetAccountSelectionReady(accountName);
      await app.selectFaucetAccount(accountName);
      await app.confirmFaucetRequest();
    }, {
      screenshots: [{ name: 'faucet-request-submitted', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });

    let pendingFaucetReceiveVisible = false;

    await steps.step('open_pending_faucet_receive', async () => {
      await app.openPendingFaucetReceiveWorkflow(accountName);
      pendingFaucetReceiveVisible = await app.hasPendingFaucetReceiveReady();
    }, {
      screenshots: [{ name: 'faucet-receive-pending', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });

    if (pendingFaucetReceiveVisible) {
      await steps.step('claim_sign_execute_faucet_receive', async () => {
        await app.completePendingFaucetReceive(accountName);
      }, {
        screenshots: [{ name: 'faucet-receive-completed', page: authenticatedAppPage }],
        snapshots: [
          { name: 'app-state', capture: () => app.captureAppState() },
          { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
        ]
      });
    }

    await steps.step('wait_for_funded_balance', async () => {
      await app.waitForFundedBalanceReady();
    }, {
      screenshots: [{ name: 'faucet-funded-balance', page: authenticatedAppPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'funding-state', capture: () => app.captureFaucetFundingState() }
      ]
    });
  });
});

function resolvePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
