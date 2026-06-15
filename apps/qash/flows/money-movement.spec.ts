import * as fs from 'node:fs';
import * as path from 'node:path';

import { expect } from '@playwright/test';

import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import type { StepOptions } from '../../../harness/types';
import {
  launchQashFreshPayerWalletRuntime,
  launchQashActorRuntime,
  resolveQashPayerWalletProvisioning,
  type QashActorIdentity,
  type QashPayerWalletProvisioning,
  type QashPayerWalletRuntime,
  type QashActorRuntime
} from '../actor-runtime';
import type {
  QashMultisigAccountPoolSelection,
  QashPaymentLinkDetails,
  QashPaymentLinkPaymentResult,
  QashPendingReceiveSettlementState
} from '../adapter';
import { resolvePositiveInteger, resolvePositiveNumber } from '../scenarios';

type QashMoneyMovementDirection = 'actor-b-pays-actor-a' | 'actor-a-pays-actor-b';

interface QashPayerWalletProvisioningSummary {
  setupMode: QashPayerWalletProvisioning['setupMode'];
  fundingSource: QashPayerWalletProvisioning['fundingSource'];
  userDataDir?: string;
}

interface QashMoneyMovementLegResult {
  loop: number;
  direction: QashMoneyMovementDirection;
  creatorRole: QashActorIdentity['role'];
  payerRole: QashActorIdentity['role'];
  receiverRole: QashActorIdentity['role'];
  receiverAccountName: string;
  paymentLink: QashPaymentLinkDetails;
  paymentUrl: string;
  payerWalletAddress: string;
  configuredPayerWalletAddress: string;
  noteType: 'public' | 'private';
  payerWalletProvisioning: QashPayerWalletProvisioningSummary;
  payerWalletUserDataDir?: string;
  payerWalletExtensionId?: string;
  receiverBefore?: unknown;
  paymentResult?: QashPaymentLinkPaymentResult;
  receiverReceiveState?: QashPendingReceiveSettlementState;
  receiverAfter?: unknown;
}

const actorA = resolveActorIdentity('actor-a');
const actorB = resolveActorIdentity('actor-b');
const loopCount = resolvePositiveInteger(
  firstEnvValue('QASH_MONEY_MOVEMENT_LOOPS', 'QASH_STRESS_LOOPS', 'QASH_DURABILITY_LOOPS'),
  1
);
const directions = resolveMoneyMovementDirections();
const actorAProfileExists = fs.existsSync(actorA.profileDir);
const actorBProfileExists = fs.existsSync(actorB.profileDir);
const actorProfilesAreSeparate = path.resolve(actorA.profileDir) !== path.resolve(actorB.profileDir);
const actorIdentitiesConfigured = Boolean(
  actorA.email &&
    actorA.accountId &&
    actorA.walletAddress &&
    actorB.email &&
    actorB.accountId &&
    actorB.walletAddress
);

test.describe('Qash Finance Actor A/B money movement', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    process.env.QASH_MONEY_MOVEMENT !== 'true' && process.env.QASH_STRESS !== 'true',
    'Use `yarn test:e2e:testnet:qash:stress`, `yarn test:e2e:testnet:qash:money-movement`, or set QASH_MONEY_MOVEMENT=true.'
  );
  test.skip(
    !actorIdentitiesConfigured,
    'Set QASH_ACTOR_A_EMAIL, QASH_ACTOR_A_ACCOUNT_ID, QASH_ACTOR_A_WALLET_ADDRESS, QASH_ACTOR_B_EMAIL, QASH_ACTOR_B_ACCOUNT_ID, and QASH_ACTOR_B_WALLET_ADDRESS.'
  );
  test.skip(!actorAProfileExists, `Actor A profile is not prepared: ${actorA.profileDir}`);
  test.skip(!actorBProfileExists, `Actor B profile is not prepared: ${actorB.profileDir}`);
  test.skip(
    !actorProfilesAreSeparate,
    `Actor A and Actor B must use different clean browser profiles. Both resolved to ${actorA.profileDir}.`
  );
  test.skip(
    directions.length === 0,
    'QASH_STRESS_MONEY_MOVEMENT_DIRECTION / QASH_MONEY_MOVEMENT_DIRECTION resolved to no supported directions.'
  );

  test('qash-actor-payment-link-money-movement', async ({ runtimeConfig, artifacts, steps, timeline }) => {
    test.setTimeout(resolvePositiveNumber(
      firstEnvValue(
        'QASH_STRESS_MONEY_MOVEMENT_TIMEOUT_MS',
        'QASH_MONEY_MOVEMENT_TIMEOUT_MS',
        'QASH_STRESS_TIMEOUT_MS'
      ),
      1_800_000
    ));

    const viewport = resolveActorViewport();
    let actorARuntime: QashActorRuntime | undefined;
    let actorBRuntime: QashActorRuntime | undefined;
    let status: 'passed' | 'failed' = 'failed';
    const accountSelections: Partial<Record<QashActorIdentity['role'], QashMultisigAccountPoolSelection>> = {};
    const accountNames: Record<QashActorIdentity['role'], string> = {
      'actor-a': firstEnvValue('QASH_ACTOR_A_PAYMENT_ACCOUNT_NAME', 'QASH_ACTOR_A_ACCOUNT_NAME') ?? 'Actor A account',
      'actor-b': firstEnvValue('QASH_ACTOR_B_PAYMENT_ACCOUNT_NAME', 'QASH_ACTOR_B_ACCOUNT_NAME') ?? 'Actor B account'
    };
    const results: QashMoneyMovementLegResult[] = [];

    timeline.emit({
      category: 'test_lifecycle',
      severity: 'info',
      source: 'qash-money-movement',
      message: 'Qash Actor A/B money movement scenario resolved',
      data: {
        loopCount,
        directions,
        actorA,
        actorB,
        accountNames,
        accountPoolSize: resolveAccountPoolSize()
      }
    });

    try {
      actorARuntime = await launchQashActorRuntime({
        identity: actorA,
        runtimeConfig,
        timeline,
        viewport,
        walletMode: 'auth-only'
      });
      actorBRuntime = await launchQashActorRuntime({
        identity: actorB,
        runtimeConfig,
        timeline,
        viewport,
        walletMode: 'auth-only'
      });

      await steps.step('prepare_actor_a_qash_account', async () => {
        accountSelections['actor-a'] = await prepareActorAccount(actorARuntime as QashActorRuntime, accountNames['actor-a']);
        accountNames['actor-a'] = accountSelections['actor-a']?.accountName ?? accountNames['actor-a'];
        if (accountSelections['actor-a']?.createdAccount) {
          artifacts.writeJson('accounts/actor-a-created-multisig-account.json', accountSelections['actor-a']?.createdAccount);
        }
      }, actorStepArtifacts(actorARuntime, 'actor-a-account-ready'));

      await steps.step('prepare_actor_b_qash_account', async () => {
        accountSelections['actor-b'] = await prepareActorAccount(actorBRuntime as QashActorRuntime, accountNames['actor-b']);
        accountNames['actor-b'] = accountSelections['actor-b']?.accountName ?? accountNames['actor-b'];
        if (accountSelections['actor-b']?.createdAccount) {
          artifacts.writeJson('accounts/actor-b-created-multisig-account.json', accountSelections['actor-b']?.createdAccount);
        }
      }, actorStepArtifacts(actorBRuntime, 'actor-b-account-ready'));

      for (let loop = 1; loop <= loopCount; loop += 1) {
        for (const direction of directions) {
          const leg = resolveLeg(direction, actorARuntime, actorBRuntime, accountNames);
          const result = await runPaymentLinkMoneyMovementLeg({
            loop,
            direction,
            creator: leg.creator,
            payer: leg.payer,
            receiver: leg.receiver,
            receiverAccountName: leg.receiverAccountName,
            runtimeConfig,
            timeline,
            viewport,
            steps,
            artifacts
          });
          results.push(result);
          artifacts.writeJson(`money-movement/loop-${loop}-${direction}.json`, result);
        }
      }

      artifacts.writeJson('qash-money-movement-summary.json', {
        loopCount,
        directions,
        actorA: actorARuntime?.identity ?? actorA,
        actorB: actorBRuntime?.identity ?? actorB,
        accountSelections,
        accountNames,
        results,
        totals: {
          legs: results.length,
          paymentMutations: results.filter(result => result.paymentResult).length,
          receiverSettlements: results.filter(result => result.receiverReceiveState === 'executed').length
        }
      });
      status = 'passed';
    } finally {
      await actorBRuntime?.close(status);
      await actorARuntime?.close(status);
    }
  });
});

async function prepareActorAccount(
  actor: QashActorRuntime,
  requestedAccountName: string
): Promise<QashMultisigAccountPoolSelection> {
  await actor.app.open();
  await actor.app.assertAuthenticatedShellReady();
  await expect(actor.page.getByText(actor.identity.email, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await actor.app.assertSectionReady('Dashboard');

  if (
    process.env.QASH_MONEY_MOVEMENT_CREATE_MISSING_ACCOUNTS !== 'true' &&
    process.env.QASH_STRESS_MONEY_MOVEMENT_CREATE_MISSING_ACCOUNTS !== 'true'
  ) {
    return actor.app.resolveExistingMultisigAccountReference({
      requestedAccountName,
      accountId: actor.identity.accountId,
      maxAccounts: resolveAccountPoolSize()
    });
  }

  return actor.app.resolveOrCreateMultisigAccountFromPool({
    requestedAccountName,
    accountDescription: `Created by Pioneer E2E money movement for ${actor.identity.role}.`,
    maxAccounts: resolveAccountPoolSize(),
    allowOverCap: process.env.QASH_MONEY_MOVEMENT_ALLOW_ACCOUNT_OVER_CAP === 'true' ||
      process.env.QASH_STRESS_ALLOW_ACCOUNT_OVER_CAP === 'true'
  });
}

async function runPaymentLinkMoneyMovementLeg(options: {
  loop: number;
  direction: QashMoneyMovementDirection;
  creator: QashActorRuntime;
  payer: QashActorRuntime;
  receiver: QashActorRuntime;
  receiverAccountName: string;
  runtimeConfig: Parameters<typeof launchQashFreshPayerWalletRuntime>[0]['runtimeConfig'];
  timeline: Parameters<typeof launchQashFreshPayerWalletRuntime>[0]['timeline'];
  viewport: Parameters<typeof launchQashFreshPayerWalletRuntime>[0]['viewport'];
  steps: { step(name: string, fn: () => Promise<void>, options?: StepOptions): Promise<void> };
  artifacts: { writeJson(relativePath: string, value: unknown): string };
}): Promise<QashMoneyMovementLegResult> {
  const { loop, direction, creator, payer, receiver, receiverAccountName, runtimeConfig, timeline, viewport, steps } = options;
  const paymentLink = buildLegPaymentLink(loop, direction, receiverAccountName);
  let payerWalletRuntime: QashPayerWalletRuntime | undefined;
  let payerWalletStatus: 'passed' | 'failed' = 'failed';
  const noteType = resolveMoneyMovementNoteType();
  const payerWalletProvisioning = resolveQashPayerWalletProvisioning(payer.identity.role);
  const payerWalletProvisioningSummary: QashPayerWalletProvisioningSummary = {
    setupMode: payerWalletProvisioning.setupMode,
    fundingSource: payerWalletProvisioning.fundingSource
  };
  if (payerWalletProvisioning.userDataDir) {
    payerWalletProvisioningSummary.userDataDir = payerWalletProvisioning.userDataDir;
  }
  const result: QashMoneyMovementLegResult = {
    loop,
    direction,
    creatorRole: creator.identity.role,
    payerRole: payer.identity.role,
    receiverRole: receiver.identity.role,
    receiverAccountName,
    paymentLink,
    paymentUrl: '',
    payerWalletAddress: payer.identity.walletAddress,
    configuredPayerWalletAddress: payer.identity.walletAddress,
    noteType,
    payerWalletProvisioning: payerWalletProvisioningSummary
  };

  assertPayerWalletProvisioningForPayment(payerWalletProvisioning, paymentLink, payer.identity.role);

  try {
    await steps.step(`${direction}_loop_${loop}_create_payment_link`, async () => {
      await creator.app.openPaymentLinks();
      await creator.app.startCreatePaymentLink();
      await creator.app.assertCreatePaymentLinkFormReady();
      await creator.app.fillPaymentLinkDetails(paymentLink);
      await creator.app.assertPaymentLinkReadyToSubmit(paymentLink);
      await creator.app.submitPaymentLinkCreate(paymentLink);
      await creator.app.assertPaymentLinkCreated(paymentLink);
      result.paymentUrl = await creator.app.extractPaymentLinkUrl(paymentLink);
    }, actorStepArtifacts(creator, `${direction}-loop-${loop}-payment-link-created`));

    await steps.step(`${direction}_loop_${loop}_capture_receiver_before`, async () => {
      await receiver.app.openFundingBalanceSurface();
      result.receiverBefore = await receiver.app.captureAccountFundingState(receiverAccountName);
    }, actorStepArtifacts(receiver, `${direction}-loop-${loop}-receiver-before`));

    await steps.step(`${direction}_loop_${loop}_create_fresh_payer_wallet`, async () => {
      payerWalletRuntime = await launchQashFreshPayerWalletRuntime({
        identity: payer.identity,
        runtimeConfig,
        timeline,
        viewport,
        source: `qash-${payer.identity.role}-fresh-payer-wallet-loop-${loop}`
      });
      result.payerWalletAddress = payerWalletRuntime.identity.walletAddress;
      result.payerWalletUserDataDir = payerWalletRuntime.browser.userDataDir;
      result.payerWalletExtensionId = payerWalletRuntime.browser.extensionId;
    }, actorStepArtifacts(payerWalletRuntime, `${direction}-loop-${loop}-fresh-payer-wallet-created`));

    await steps.step(`${direction}_loop_${loop}_assert_payer_wallet_funded`, async () => {
      assertPayerWalletRuntime(payerWalletRuntime);
      await payerWalletRuntime.browser.wallet.waitForTokenBalance(
        paymentLink.tokenName ?? 'QASH',
        parseQashAmount(paymentLink.amount),
        {
          label: `Qash ${direction} loop ${loop} payment link pay`,
          timeoutMs: resolvePositiveNumber(
            firstEnvValue(
              'QASH_PAYER_WALLET_BALANCE_TIMEOUT_MS',
              'QASH_STRESS_MONEY_MOVEMENT_PAYER_BALANCE_TIMEOUT_MS',
              'QASH_MONEY_MOVEMENT_PAYER_BALANCE_TIMEOUT_MS'
            ),
            120_000
          )
        }
      );
    }, actorStepArtifacts(payerWalletRuntime, `${direction}-loop-${loop}-payer-wallet-funded`));

    await steps.step(`${direction}_loop_${loop}_open_payment_link_as_payer`, async () => {
      assertPayerWalletRuntime(payerWalletRuntime);
      await payerWalletRuntime.app.openPublicPaymentLink(result.paymentUrl, paymentLink);
      await payerWalletRuntime.browser.wallet.assertDappBridgeInjected(payerWalletRuntime.page);
    }, actorStepArtifacts(payerWalletRuntime, `${direction}-loop-${loop}-payer-payment-link-ready`));

    await steps.step(`${direction}_loop_${loop}_connect_payer_wallet`, async () => {
      assertPayerWalletRuntime(payerWalletRuntime);
      const approvalPromise = payerWalletRuntime.browser.wallet.confirmations.approveNext('connect');
      await payerWalletRuntime.app.connectPublicPaymentLinkWallet();
      await approvalPromise;
      const permission = await payerWalletRuntime.browser.wallet.waitForDappPermission(payerWalletRuntime.page);
      payerWalletRuntime.identity.walletAddress = permission.address;
      result.payerWalletAddress = permission.address;
      await payerWalletRuntime.app.assertPublicPaymentLinkWalletConnected(permission.address);
    }, actorStepArtifacts(payerWalletRuntime, `${direction}-loop-${loop}-payer-wallet-connected`));

    await steps.step(`${direction}_loop_${loop}_pay_payment_link`, async () => {
      assertPayerWalletRuntime(payerWalletRuntime);
      const paymentTimeoutMs = resolvePositiveNumber(
        firstEnvValue('QASH_STRESS_MONEY_MOVEMENT_PAYMENT_TIMEOUT_MS', 'QASH_MONEY_MOVEMENT_PAYMENT_TIMEOUT_MS'),
        300_000
      );
      const previousTxHash = await payerWalletRuntime.browser.wallet.readLastCompletedTxHash();
      const walletTransactionPromise = payerWalletRuntime.browser.wallet.waitForNextCompletedTransaction({
        label: `Qash ${direction} loop ${loop} payment link pay`,
        previousTxHash,
        timeoutMs: paymentTimeoutMs
      });
      const approvalPromise = payerWalletRuntime.browser.wallet.confirmations.approveNext('transaction');
      const paymentPromise = payerWalletRuntime.app.submitPublicPaymentLinkPayment(result.paymentUrl, paymentLink, {
        payerWalletAddress: result.payerWalletAddress,
        expectedNoteType: noteType,
        timeoutMs: paymentTimeoutMs
      });
      const [paymentResult, , walletCompletedTxHash] = await Promise.all([
        paymentPromise,
        approvalPromise,
        walletTransactionPromise
      ]);
      paymentResult.walletCompletedTxHash = walletCompletedTxHash;
      result.paymentResult = paymentResult;
    }, actorStepArtifacts(payerWalletRuntime, `${direction}-loop-${loop}-payer-payment-submitted`));

    await steps.step(`${direction}_loop_${loop}_receiver_claims_payment`, async () => {
      await receiver.app.waitForPendingReceiveReady({
        expectedAmount: paymentLink.amount,
        accountName: receiverAccountName,
        timeoutMs: resolvePositiveNumber(
          firstEnvValue('QASH_STRESS_MONEY_MOVEMENT_RECEIVE_TIMEOUT_MS', 'QASH_MONEY_MOVEMENT_RECEIVE_TIMEOUT_MS'),
          300_000
        )
      });
      result.receiverReceiveState = await receiver.app.completePendingReceive(receiverAccountName);
      await receiver.app.openFundingBalanceSurface();
      result.receiverAfter = await receiver.app.captureAccountFundingState(receiverAccountName);
    }, actorStepArtifacts(receiver, `${direction}-loop-${loop}-receiver-claimed-payment`));

    if (result.receiverReceiveState !== 'executed') {
      throw new Error(
        `Qash ${direction} loop ${loop} did not fully execute receiver settlement. ` +
          `Final state: ${result.receiverReceiveState ?? 'none'}.`
      );
    }

    payerWalletStatus = 'passed';
  } finally {
    await payerWalletRuntime?.close(payerWalletStatus);
  }

  return result;
}

function resolveLeg(
  direction: QashMoneyMovementDirection,
  actorA: QashActorRuntime,
  actorB: QashActorRuntime,
  accountNames: Record<QashActorIdentity['role'], string>
) {
  if (direction === 'actor-b-pays-actor-a') {
    return {
      creator: actorA,
      payer: actorB,
      receiver: actorA,
      receiverAccountName: accountNames['actor-a']
    };
  }

  return {
    creator: actorB,
    payer: actorA,
    receiver: actorB,
    receiverAccountName: accountNames['actor-b']
  };
}

function buildLegPaymentLink(
  loop: number,
  direction: QashMoneyMovementDirection,
  accountName: string
): QashPaymentLinkDetails {
  const suffix = `${Date.now()}-${loop}-${direction}`;
  return {
    title: `Pioneer E2E ${direction} ${suffix}`,
    amount: firstEnvValue(
      'QASH_STRESS_MONEY_MOVEMENT_AMOUNT',
      'QASH_MONEY_MOVEMENT_AMOUNT',
      'QASH_STRESS_PAYMENT_LINK_AMOUNT',
      'QASH_DURABILITY_PAYMENT_LINK_AMOUNT'
    ) ?? randomQashAmount(),
    description: `Pioneer E2E money movement ${direction} loop ${loop}`,
    accountName,
    networkName: firstEnvValue('QASH_MONEY_MOVEMENT_NETWORK', 'QASH_PAYMENT_LINK_NETWORK') ?? 'Miden Testnet',
    tokenName: firstEnvValue('QASH_MONEY_MOVEMENT_TOKEN', 'QASH_PAYMENT_LINK_TOKEN') ?? 'QASH'
  };
}

function resolveMoneyMovementNoteType(): 'public' | 'private' {
  const configured = firstEnvValue('QASH_MONEY_MOVEMENT_NOTE_TYPE', 'QASH_PAYMENT_LINK_NOTE_TYPE')?.toLowerCase();
  if (!configured || configured === 'random') {
    return Math.random() < 0.5 ? 'public' : 'private';
  }
  if (configured === 'public' || configured === 'private') return configured;
  throw new Error(
    `QASH_MONEY_MOVEMENT_NOTE_TYPE must be public, private, or random. Got: ${configured}.`
  );
}

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
    throw new Error('Fresh payer wallet runtime was not created before the payer step.');
  }
}

function resolveActorIdentity(role: QashActorIdentity['role']): QashActorIdentity {
  if (role === 'actor-a') {
    return {
      role,
      email: firstEnvValue('QASH_ACTOR_A_EMAIL', 'QASH_AUTH_ACCOUNT_EMAIL') ?? '',
      accountId: firstEnvValue('QASH_ACTOR_A_ACCOUNT_ID') ?? '',
      walletAddress: firstEnvValue('QASH_ACTOR_A_WALLET_ADDRESS') ?? '',
      profileDir: resolveProfileDir(
        firstEnvValue('QASH_ACTOR_A_PROFILE_DIR', 'QASH_ACTOR_A_AUTH_USER_DATA_DIR', 'QASH_AUTH_USER_DATA_DIR') ??
          '.auth/qash/actor-a'
      )
    };
  }

  return {
    role,
    email: firstEnvValue('QASH_ACTOR_B_EMAIL') ?? '',
    accountId: firstEnvValue('QASH_ACTOR_B_ACCOUNT_ID') ?? '',
    walletAddress: firstEnvValue(
      'QASH_ACTOR_B_WALLET_ADDRESS',
      'QASH_STRESS_RECEIVER_WALLET_ADDRESS',
      'QASH_DURABILITY_RECEIVER_WALLET_ADDRESS'
    ) ?? '',
    profileDir: resolveProfileDir(
      firstEnvValue('QASH_ACTOR_B_PROFILE_DIR', 'QASH_ACTOR_B_AUTH_USER_DATA_DIR') ?? '.auth/qash/actor-b'
    )
  };
}

function resolveMoneyMovementDirections(): QashMoneyMovementDirection[] {
  const raw = (firstEnvValue('QASH_STRESS_MONEY_MOVEMENT_DIRECTION', 'QASH_MONEY_MOVEMENT_DIRECTION') ?? 'bidirectional')
    .trim()
    .toLowerCase();
  if (raw === 'bidirectional' || raw === 'both') return ['actor-b-pays-actor-a', 'actor-a-pays-actor-b'];
  if (raw === 'actor-b-pays-actor-a' || raw === 'b-to-a') return ['actor-b-pays-actor-a'];
  if (raw === 'actor-a-pays-actor-b' || raw === 'a-to-b') return ['actor-a-pays-actor-b'];
  return [];
}

function resolveAccountPoolSize(): number {
  return resolvePositiveInteger(
    firstEnvValue(
      'QASH_MONEY_MOVEMENT_ACCOUNT_POOL_SIZE',
      'QASH_STRESS_ACCOUNT_POOL_SIZE',
      'QASH_DURABILITY_ACCOUNT_POOL_SIZE',
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

function assertPayerWalletProvisioningForPayment(
  provisioning: QashPayerWalletProvisioning,
  paymentLink: QashPaymentLinkDetails,
  payerRole: QashActorIdentity['role']
): void {
  if (provisioning.fundingSource !== 'fresh-create') return;

  const rolePrefix = payerRole === 'actor-a' ? 'QASH_ACTOR_A' : 'QASH_ACTOR_B';
  throw new Error(
    [
      `Qash money movement payer ${payerRole} requires a funded external payer Miden wallet.`,
      `The current payer wallet provisioning resolves to ${provisioning.setupMode}, which creates a new 0-QASH wallet.`,
      `The payment link requires ${paymentLink.amount} ${paymentLink.tokenName ?? 'QASH'}.`,
      'Qash faucet funding is account-scoped inside Qash and does not fund arbitrary public payer wallet addresses.',
      `Set ${rolePrefix}_PAYER_TEST_ACCOUNT_SEED or QASH_PAYER_TEST_ACCOUNT_SEED to import a funded wallet into a fresh profile each run,`,
      `or set ${rolePrefix}_PAYER_WALLET_USER_DATA_DIR / QASH_PAYER_WALLET_USER_DATA_DIR for a prepared funded payer wallet profile.`
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

function resolveProfileDir(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function firstEnvValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function randomQashAmount(): string {
  return (1 + Math.random() * 4).toFixed(2);
}
