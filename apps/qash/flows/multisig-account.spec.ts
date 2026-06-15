import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { QashAdapter } from '../adapter';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance multisig account setup', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );

  test('create-account-entry-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_dashboard_account_prerequisite', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.assertSectionReady('Dashboard');
      await app.assertMultisigAccountPrerequisiteVisible();
    }, {
      screenshots: [{ name: 'dashboard-account-prerequisite', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('open_create_account_flow', async () => {
      await app.startMultisigAccountCreation();
      await app.assertMultisigAccountCreationReady();
    }, {
      screenshots: [{ name: 'create-account-flow', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test('create-account-details-to-members-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    test.skip(
      process.env.QASH_CREATE_MULTISIG_ACCOUNT !== 'true',
      'Set QASH_CREATE_MULTISIG_ACCOUNT=true to run the stateful multisig account setup flow.'
    );

    const app = new QashAdapter(authenticatedAppPage, timeline);
    const accountName = process.env.QASH_MULTISIG_ACCOUNT_NAME || `Pioneer E2E ${Date.now()}`;

    await steps.step('open_create_account_flow', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.assertSectionReady('Dashboard');
      await app.assertMultisigAccountPrerequisiteVisible();
      await app.startMultisigAccountCreation();
      await app.assertMultisigAccountCreationReady();
    }, {
      screenshots: [{ name: 'create-account-flow', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('fill_account_details', async () => {
      await app.fillMultisigAccountDetails(accountName, 'Created by Pioneer E2E testnet automation.');
      await app.advanceMultisigAccountCreationStep();
      await app.assertMultisigChooseMembersReady();
    }, {
      screenshots: [{ name: 'choose-members', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test('create-account-review-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    test.skip(
      process.env.QASH_CREATE_MULTISIG_ACCOUNT !== 'true',
      'Set QASH_CREATE_MULTISIG_ACCOUNT=true to run the stateful multisig account setup flow.'
    );

    const app = new QashAdapter(authenticatedAppPage, timeline);
    const accountName = process.env.QASH_MULTISIG_ACCOUNT_NAME || `Pioneer E2E ${Date.now()}`;

    await steps.step('open_create_account_flow', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.assertSectionReady('Dashboard');
      await app.assertMultisigAccountPrerequisiteVisible();
      await app.startMultisigAccountCreation();
      await app.assertMultisigAccountCreationReady();
    }, {
      screenshots: [{ name: 'create-account-flow', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('fill_account_details', async () => {
      await app.fillMultisigAccountDetails(accountName, 'Created by Pioneer E2E testnet automation.');
      await app.advanceMultisigAccountCreationStep();
      await app.assertMultisigChooseMembersReady();
    }, {
      screenshots: [{ name: 'choose-members', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('review_account_creation', async () => {
      await app.advanceMultisigAccountCreationStep();
      await app.assertMultisigReviewReady(accountName);
    }, {
      screenshots: [{ name: 'review-account-creation', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test('create-account-confirmed', async ({ authenticatedAppPage, artifacts, steps, timeline }) => {
    test.skip(
      process.env.QASH_CREATE_MULTISIG_ACCOUNT !== 'true',
      'Set QASH_CREATE_MULTISIG_ACCOUNT=true to run the stateful multisig account setup flow.'
    );
    test.skip(
      process.env.QASH_CONFIRM_MULTISIG_ACCOUNT_CREATE !== 'true',
      'Set QASH_CONFIRM_MULTISIG_ACCOUNT_CREATE=true to click the final Qash multisig account Create control.'
    );

    const app = new QashAdapter(authenticatedAppPage, timeline);
    const accountName = process.env.QASH_MULTISIG_ACCOUNT_NAME || `Pioneer E2E Confirm ${Date.now()}`;

    await steps.step('open_create_account_flow', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.assertSectionReady('Dashboard');
      await app.assertMultisigAccountPrerequisiteVisible();
      await app.startMultisigAccountCreation();
      await app.assertMultisigAccountCreationReady();
    }, {
      screenshots: [{ name: 'create-account-flow', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('fill_account_details', async () => {
      await app.fillMultisigAccountDetails(accountName, 'Created by Pioneer E2E testnet automation.');
      await app.advanceMultisigAccountCreationStep();
      await app.assertMultisigChooseMembersReady();
    }, {
      screenshots: [{ name: 'choose-members', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('review_account_creation', async () => {
      await app.advanceMultisigAccountCreationStep();
      await app.assertMultisigReviewReady(accountName);
    }, {
      screenshots: [{ name: 'review-account-creation', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('confirm_account_creation', async () => {
      await app.submitMultisigAccountCreation();
      const createdAccount = await app.assertMultisigAccountCreated(accountName);
      artifacts.writeJson('accounts/created-multisig-account.json', createdAccount);
    }, {
      screenshots: [{ name: 'account-created', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });
});
