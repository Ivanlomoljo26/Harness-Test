import * as fs from 'node:fs';
import * as path from 'node:path';

import { expect } from '@playwright/test';

import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import type { StepOptions } from '../../../harness/types';
import {
  launchQashActorRuntime,
  launchQashFreshPayerWalletRuntime,
  resolveQashPayerWalletProvisioning,
  type QashActorIdentity,
  type QashActorRuntime,
  type QashPayerWalletProvisioning,
  type QashPayerWalletRuntime
} from '../actor-runtime';
import type {
  QashMultisigAccountPoolSelection,
  QashPaymentLinkDetails,
  QashPaymentLinkPaymentResult
} from '../adapter';
import { resolvePositiveInteger } from '../scenarios';

const actorA = resolveActorAIdentity();
const actorAProfileExists = fs.existsSync(actorA.profileDir);
const configuredPaymentUrl = resolveActorAPaymentLinkUrl();
const actorAConfigured = Boolean(actorA.email && actorA.accountId && actorA.walletAddress);

test.describe('Qash Finance Actor A wallet connect diagnostic', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    process.env.QASH_ACTOR_A_WALLET_CONNECT !== 'true',
    'Set QASH_ACTOR_A_WALLET_CONNECT=true to run the focused Actor A wallet-connect diagnostic.'
  );
  test.skip(
    !actorAProfileExists && !configuredPaymentUrl,
    `Actor A profile is not prepared: ${actorA.profileDir}. Set QASH_ACTOR_A_PAYMENT_LINK_URL to reuse an existing link without Actor A login.`
  );
  test.skip(
    !actorAConfigured && !configuredPaymentUrl,
    'Set QASH_ACTOR_A_EMAIL, QASH_ACTOR_A_ACCOUNT_ID, and QASH_ACTOR_A_WALLET_ADDRESS, or set QASH_ACTOR_A_PAYMENT_LINK_URL to reuse an existing link.'
  );

  test('qash-actor-a-public-payment-link-wallet-connect', async ({ runtimeConfig, artifacts, steps, timeline }) => {
    test.setTimeout(resolvePositiveInteger(process.env.QASH_ACTOR_A_WALLET_CONNECT_TIMEOUT_MS, 600_000));

    const viewport = resolveActorViewport();
    const accountName = firstEnvValue('QASH_ACTOR_A_PAYMENT_ACCOUNT_NAME', 'QASH_ACTOR_A_ACCOUNT_NAME') ??
      'Actor A account';
    const paymentLink = buildPaymentLink(accountName);
    const shouldCreatePaymentLink = !configuredPaymentUrl;
    let actorRuntime: QashActorRuntime | undefined;
    let payerWalletRuntime: QashPayerWalletRuntime | undefined;
    let actorStatus: 'passed' | 'failed' = 'failed';
    let payerStatus: 'passed' | 'failed' = 'failed';
    let accountSelection: QashMultisigAccountPoolSelection | undefined;
    let paymentUrl = '';
    let connectedWalletAddress = '';
    let paymentResult: QashPaymentLinkPaymentResult | undefined;
    const shouldPayPaymentLink = isActorAWalletPayEnabled();
    const paymentNoteType = resolveActorAWalletPayNoteType();
    const payerWalletProvisioning = resolveQashPayerWalletProvisioning(actorA.role);
    const payerWalletProvisioningSummary = {
      setupMode: payerWalletProvisioning.setupMode,
      fundingSource: payerWalletProvisioning.fundingSource,
      userDataDir: payerWalletProvisioning.userDataDir
    };

    timeline.emit({
      category: 'test_lifecycle',
      severity: 'info',
      source: 'qash-actor-a-wallet-connect',
      message: 'Qash Actor A wallet-connect diagnostic resolved',
      data: { actorA, accountName, paymentLink, payerWalletProvisioning: payerWalletProvisioningSummary }
    });

    try {
      if (shouldPayPaymentLink) {
        assertPayerWalletProvisioningForPayment(payerWalletProvisioning, paymentLink);
      }

      if (shouldCreatePaymentLink) {
        actorRuntime = await launchQashActorRuntime({
          identity: actorA,
          runtimeConfig,
          timeline,
          viewport,
          walletMode: 'auth-only'
        });

        await steps.step('prepare_actor_a_qash_account', async () => {
          assertActorRuntime(actorRuntime);
          await actorRuntime.app.open();
          await actorRuntime.app.assertAuthenticatedShellReady();
          await expect(actorRuntime.page.getByText(actorA.email, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
          await actorRuntime.app.assertSectionReady('Dashboard');
          accountSelection = await actorRuntime.app.resolveExistingMultisigAccountReference({
            requestedAccountName: accountName,
            accountId: actorA.accountId,
            maxAccounts: resolveAccountPoolSize()
          });
        }, actorStepArtifacts(actorRuntime, 'actor-a-account-ready'));

        paymentLink.accountName = accountSelection?.accountName ?? accountName;

        await steps.step('create_actor_a_payment_link', async () => {
          assertActorRuntime(actorRuntime);
          await actorRuntime.app.openPaymentLinks();
          await actorRuntime.app.startCreatePaymentLink();
          await actorRuntime.app.assertCreatePaymentLinkFormReady();
          await actorRuntime.app.fillPaymentLinkDetails(paymentLink);
          await actorRuntime.app.assertPaymentLinkReadyToSubmit(paymentLink);
          await actorRuntime.app.submitPaymentLinkCreate(paymentLink);
          await actorRuntime.app.assertPaymentLinkCreated(paymentLink);
          paymentUrl = await actorRuntime.app.extractPaymentLinkUrl(paymentLink);
        }, actorStepArtifacts(actorRuntime, 'actor-a-payment-link-created'));
      } else {
        paymentUrl = configuredPaymentUrl ?? '';
        timeline.emit({
          category: 'test_lifecycle',
          severity: 'info',
          source: 'qash-actor-a-wallet-connect',
          message: 'Reusing configured Qash payment link',
          data: { paymentUrl, paymentLink }
        });
      }

      await steps.step('create_fresh_actor_a_payer_wallet', async () => {
        payerWalletRuntime = await launchQashFreshPayerWalletRuntime({
          identity: actorA,
          runtimeConfig,
          timeline,
          viewport,
          source: 'qash-actor-a-fresh-payer-wallet-connect'
        });
      }, actorStepArtifacts(payerWalletRuntime, 'actor-a-fresh-payer-wallet-created'));

      if (shouldPayPaymentLink) {
        await steps.step('assert_actor_a_payer_wallet_funded', async () => {
          assertPayerWalletRuntime(payerWalletRuntime);
          await payerWalletRuntime.browser.wallet.waitForTokenBalance(
            paymentLink.tokenName ?? 'QASH',
            parseQashAmount(paymentLink.amount),
            {
              label: 'Actor A payment link pay',
              timeoutMs: resolvePositiveInteger(process.env.QASH_PAYER_WALLET_BALANCE_TIMEOUT_MS, 120_000)
            }
          );
        }, actorStepArtifacts(payerWalletRuntime, 'actor-a-payer-wallet-funded'));
      }

      await steps.step('open_payment_link_as_actor_a_payer', async () => {
        assertPayerWalletRuntime(payerWalletRuntime);
        await payerWalletRuntime.app.openPublicPaymentLink(paymentUrl, paymentLink);
        await payerWalletRuntime.browser.wallet.assertDappBridgeInjected(payerWalletRuntime.page);
      }, actorStepArtifacts(payerWalletRuntime, 'actor-a-payer-payment-link-ready'));

      await steps.step('connect_actor_a_payer_wallet', async () => {
        assertPayerWalletRuntime(payerWalletRuntime);
        const approvalPromise = payerWalletRuntime.browser.wallet.confirmations.approveNext('connect');
        await payerWalletRuntime.app.connectPublicPaymentLinkWallet();
        await approvalPromise;
        const permission = await payerWalletRuntime.browser.wallet.waitForDappPermission(payerWalletRuntime.page);
        connectedWalletAddress = permission.address;
        await payerWalletRuntime.app.assertPublicPaymentLinkWalletConnected(permission.address);
      }, actorStepArtifacts(payerWalletRuntime, 'actor-a-payer-wallet-connected'));

      if (shouldPayPaymentLink) {
        await steps.step('pay_actor_a_payment_link', async () => {
          assertPayerWalletRuntime(payerWalletRuntime);
          const paymentTimeoutMs = resolvePositiveInteger(process.env.QASH_ACTOR_A_WALLET_PAY_TIMEOUT_MS, 300_000);
          const previousTxHash = await payerWalletRuntime.browser.wallet.readLastCompletedTxHash();
          const walletTransactionPromise = payerWalletRuntime.browser.wallet.waitForNextCompletedTransaction({
            label: 'Actor A payment link pay',
            previousTxHash,
            timeoutMs: paymentTimeoutMs
          });
          const approvalPromise = payerWalletRuntime.browser.wallet.confirmations.approveNext('transaction');
          const paymentPromise = payerWalletRuntime.app.submitPublicPaymentLinkPayment(paymentUrl, paymentLink, {
            payerWalletAddress: connectedWalletAddress,
            expectedNoteType: paymentNoteType,
            timeoutMs: paymentTimeoutMs
          });
          const [submittedPayment, , walletCompletedTxHash] = await Promise.all([
            paymentPromise,
            approvalPromise,
            walletTransactionPromise
          ]);
          submittedPayment.walletCompletedTxHash = walletCompletedTxHash;
          paymentResult = submittedPayment;
        }, actorStepArtifacts(payerWalletRuntime, 'actor-a-payer-payment-submitted'));
      }

      artifacts.writeJson('actor-a-wallet-connect.json', {
        actorA,
        accountSelection,
        paymentLink,
        paymentUrl,
        paymentLinkSource: shouldCreatePaymentLink ? 'created' : 'configured',
        payerWalletProvisioning: payerWalletProvisioningSummary,
        connectedWalletAddress,
        paymentAttempted: shouldPayPaymentLink,
        paymentNoteType,
        paymentResult,
        payerWalletUserDataDir: payerWalletRuntime?.browser.userDataDir,
        payerWalletExtensionId: payerWalletRuntime?.browser.extensionId
      });

      actorStatus = 'passed';
      payerStatus = 'passed';
    } finally {
      await payerWalletRuntime?.close(payerStatus);
      await actorRuntime?.close(actorStatus);
    }
  });
});

function actorStepArtifacts(actor: QashActorRuntime | undefined, name: string): StepOptions {
  if (!actor) return {};
  const snapshots: NonNullable<StepOptions['snapshots']> = [
    { name: `${name}-app-state`, capture: () => actor.app.captureAppState() }
  ];
  const walletBrowser = actor.browser;
  if (walletBrowser) {
    snapshots.push({
      name: `${name}-wallet-state`,
      capture: () => walletBrowser.wallet.captureWalletState(actor.page)
    });
  }

  return {
    screenshots: [{ name, page: actor.page }],
    snapshots
  };
}

function assertPayerWalletRuntime(
  runtime: QashPayerWalletRuntime | undefined
): asserts runtime is QashPayerWalletRuntime {
  if (!runtime) {
    throw new Error('Fresh Actor A payer wallet runtime was not created before the payer step.');
  }
}

function assertActorRuntime(
  runtime: QashActorRuntime | undefined
): asserts runtime is QashActorRuntime {
  if (!runtime) {
    throw new Error('Actor A runtime was not created before the Actor A step.');
  }
}

function resolveActorAIdentity(): QashActorIdentity {
  return {
    role: 'actor-a',
    email: firstEnvValue('QASH_ACTOR_A_EMAIL', 'QASH_AUTH_ACCOUNT_EMAIL') ?? '',
    accountId: firstEnvValue('QASH_ACTOR_A_ACCOUNT_ID') ?? '',
    walletAddress: firstEnvValue('QASH_ACTOR_A_WALLET_ADDRESS') ?? '',
    profileDir: resolveProfileDir(
      firstEnvValue('QASH_ACTOR_A_PROFILE_DIR', 'QASH_ACTOR_A_AUTH_USER_DATA_DIR', 'QASH_AUTH_USER_DATA_DIR') ??
        '.auth/qash/actor-a'
    )
  };
}

function buildPaymentLink(accountName: string): QashPaymentLinkDetails {
  const suffix = Date.now();
  return {
    title: firstEnvValue('QASH_ACTOR_A_PAYMENT_LINK_TITLE') ??
      `Pioneer E2E Actor A wallet connect ${suffix}`,
    amount: firstEnvValue(
      'QASH_ACTOR_A_PAYMENT_LINK_AMOUNT',
      'QASH_ACTOR_A_WALLET_CONNECT_AMOUNT',
      'QASH_MONEY_MOVEMENT_AMOUNT'
    ) ?? randomQashAmount(),
    description: 'Pioneer E2E Actor A focused wallet-connect diagnostic',
    accountName,
    networkName: firstEnvValue('QASH_ACTOR_A_WALLET_CONNECT_NETWORK', 'QASH_PAYMENT_LINK_NETWORK') ?? 'Miden Testnet',
    tokenName: firstEnvValue('QASH_ACTOR_A_WALLET_CONNECT_TOKEN', 'QASH_PAYMENT_LINK_TOKEN') ?? 'QASH'
  };
}

function resolveAccountPoolSize(): number {
  return resolvePositiveInteger(
    firstEnvValue(
      'QASH_MONEY_MOVEMENT_ACCOUNT_POOL_SIZE',
      'QASH_STRESS_ACCOUNT_POOL_SIZE',
      'QASH_PLATFORM_ACCOUNT_POOL_SIZE'
    ),
    3
  );
}

function resolveActorViewport(): { width: number; height: number } {
  return {
    width: resolvePositiveInteger(process.env.QASH_AUTH_VIEWPORT_WIDTH, 1600),
    height: resolvePositiveInteger(process.env.QASH_AUTH_VIEWPORT_HEIGHT, 1100)
  };
}

function resolveProfileDir(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function randomQashAmount(): string {
  return (1 + Math.random() * 4).toFixed(2);
}

function isActorAWalletPayEnabled(): boolean {
  const configured = firstEnvValue('QASH_ACTOR_A_WALLET_PAY');
  if (!configured) return false;
  return !['0', 'false', 'no', 'off'].includes(configured.toLowerCase());
}

function resolveActorAPaymentLinkUrl(): string | undefined {
  return firstEnvValue(
    'QASH_ACTOR_A_PAYMENT_LINK_URL',
    'QASH_PAYMENT_LINK_URL',
    'QASH_REUSE_PAYMENT_LINK_URL'
  );
}

function resolveActorAWalletPayNoteType(): 'public' | 'private' {
  const configured = firstEnvValue(
    'QASH_ACTOR_A_WALLET_PAY_NOTE_TYPE',
    'QASH_MONEY_MOVEMENT_NOTE_TYPE',
    'QASH_PAYMENT_LINK_NOTE_TYPE'
  )?.toLowerCase();
  if (!configured || configured === 'random') {
    return Math.random() < 0.5 ? 'public' : 'private';
  }
  if (configured === 'public' || configured === 'private') return configured;
  throw new Error(
    `QASH_ACTOR_A_WALLET_PAY_NOTE_TYPE must be public, private, or random. Got: ${configured}.`
  );
}

function assertPayerWalletProvisioningForPayment(
  provisioning: QashPayerWalletProvisioning,
  paymentLink: QashPaymentLinkDetails
): void {
  if (provisioning.fundingSource !== 'fresh-create') return;

  throw new Error(
    [
      'Qash Actor A payment execution requires a funded external payer Miden wallet.',
      `The current payer wallet provisioning resolves to ${provisioning.setupMode}, which creates a new 0-QASH wallet.`,
      `The payment link requires ${paymentLink.amount} ${paymentLink.tokenName ?? 'QASH'}.`,
      'Qash faucet funding is account-scoped inside Qash and does not fund arbitrary public payer wallet addresses.',
      'Set QASH_ACTOR_A_PAYER_TEST_ACCOUNT_SEED or QASH_PAYER_TEST_ACCOUNT_SEED to import a funded wallet into a fresh profile each run,',
      'or set QASH_ACTOR_A_PAYER_WALLET_USER_DATA_DIR / QASH_PAYER_WALLET_USER_DATA_DIR for a prepared funded payer wallet profile.',
      'For connect-only diagnostics, leave QASH_ACTOR_A_WALLET_PAY unset.'
    ].join(' ')
  );
}

function parseQashAmount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Qash payment amount must be a positive number. Got: ${value}.`);
  }
  return parsed;
}

function firstEnvValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}
