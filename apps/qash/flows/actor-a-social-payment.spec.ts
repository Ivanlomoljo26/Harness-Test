import * as fs from 'node:fs';
import * as path from 'node:path';

import type { Page } from '@playwright/test';

import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import type { TimelineRecorder } from '../../../harness/timeline-recorder';
import type { StepOptions } from '../../../harness/types';
import { QashAdapter, type QashPaymentLinkDetails, type QashPaymentLinkSocialPaymentResult } from '../adapter';
import { resolvePositiveInteger } from '../scenarios';

interface ActorIdentity {
  role: 'actor-a';
  email: string;
  accountId: string;
  walletAddress: string;
  profileDir: string;
}

const actorA = resolveActorAIdentity();
const actorAProfileExists = fs.existsSync(actorA.profileDir);
const configuredPaymentUrl = resolveActorAPaymentLinkUrl();
const useWalletContext = process.env.QASH_ACTOR_A_SOCIAL_PAYMENT_WALLET_CONTEXT === 'true';

test.describe('Qash Finance Actor A Social Account payment diagnostic', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    process.env.QASH_ACTOR_A_SOCIAL_PAYMENT !== 'true',
    'Set QASH_ACTOR_A_SOCIAL_PAYMENT=true to run the focused Actor A Social Account payment diagnostic.'
  );
  test.skip(!configuredPaymentUrl, 'Set QASH_ACTOR_A_PAYMENT_LINK_URL to reuse an existing public Payment Link.');

  test.describe('authenticated Actor A profile context', () => {
    test.skip(useWalletContext, 'Set QASH_ACTOR_A_SOCIAL_PAYMENT_WALLET_CONTEXT=false or unset it for Actor A auth-profile context.');
    test.skip(!actorAProfileExists, `Actor A profile is not prepared: ${actorA.profileDir}`);

    test('qash-actor-a-public-payment-link-social-account-payment', async ({ authenticatedAppPage, artifacts, steps, timeline }) => {
      await runSocialAccountPaymentDiagnostic({
        page: authenticatedAppPage,
        artifacts,
        steps,
        timeline,
        contextLabel: 'actor-a-auth-profile',
        artifactName: 'actor-a-social-payment'
      });
    });
  });

  test.describe('extension-loaded wallet context', () => {
    test.skip(!useWalletContext, 'Set QASH_ACTOR_A_SOCIAL_PAYMENT_WALLET_CONTEXT=true to probe Social Account with Miden extension loaded.');

    test('qash-public-payment-link-social-account-wallet-context', async ({ runtimeConfig, walletBrowser, artifacts, steps, timeline }) => {
      await walletBrowser.wallet.prepareWallet();
      await walletBrowser.wallet.assertNetwork(runtimeConfig.network.name);
      await runSocialAccountPaymentDiagnostic({
        page: walletBrowser.appPage,
        artifacts,
        steps,
        timeline,
        contextLabel: 'extension-loaded-wallet',
        artifactName: 'actor-a-social-payment-wallet-context'
      });
    });
  });
});

async function runSocialAccountPaymentDiagnostic(options: {
  page: Page;
  artifacts: { writeJson(relativePath: string, value: unknown): string };
  steps: { step(name: string, fn: () => Promise<void>, options?: StepOptions): Promise<void> };
  timeline: TimelineRecorder;
  contextLabel: string;
  artifactName: string;
}): Promise<void> {
  const { page, artifacts, steps, timeline, contextLabel, artifactName } = options;
  test.setTimeout(resolvePositiveInteger(process.env.QASH_ACTOR_A_SOCIAL_PAYMENT_TIMEOUT_MS, 300_000));

  const app = new QashAdapter(page, timeline);
  const paymentLink = buildPaymentLink();
  const shouldSubmitPayment = isSocialPayEnabled();
  let paymentResult: QashPaymentLinkSocialPaymentResult | undefined;

  timeline.emit({
    category: 'test_lifecycle',
    severity: 'info',
    source: 'qash-actor-a-social-payment',
    message: 'Qash Actor A Social Account payment diagnostic resolved',
    data: {
      contextLabel,
      actorA,
      paymentUrl: configuredPaymentUrl,
      paymentLink,
      shouldSubmitPayment
    }
  });

  await steps.step(`open_payment_link_as_${contextLabel}_social_payer`, async () => {
    await app.openPublicPaymentLink(configuredPaymentUrl ?? '', paymentLink);
  }, appStepArtifacts(app, page, `${contextLabel}-social-payment-link-ready`));

  await steps.step(`connect_${contextLabel}_social_account`, async () => {
    await app.connectPublicPaymentLinkSocialAccount();
  }, appStepArtifacts(app, page, `${contextLabel}-social-account-selected`));

  if (shouldSubmitPayment) {
    await steps.step(`pay_${contextLabel}_payment_link_with_social_account`, async () => {
      paymentResult = await app.submitPublicPaymentLinkSocialPayment(configuredPaymentUrl ?? '', paymentLink, {
        timeoutMs: resolvePositiveInteger(process.env.QASH_ACTOR_A_SOCIAL_PAYMENT_TIMEOUT_MS, 300_000)
      });
    }, appStepArtifacts(app, page, `${contextLabel}-social-payment-submitted`));
  }

  artifacts.writeJson(`${artifactName}.json`, {
    actorA,
    contextLabel,
    paymentUrl: configuredPaymentUrl,
    paymentLink,
    paymentAttempted: shouldSubmitPayment,
    paymentResult,
    appState: await app.captureAppState()
  });
}

function appStepArtifacts(app: QashAdapter, page: Page, name: string): StepOptions {
  return {
    screenshots: [{ name, page }],
    snapshots: [
      { name: `${name}-app-state`, capture: () => app.captureAppState() }
    ]
  };
}

function resolveActorAIdentity(): ActorIdentity {
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

function buildPaymentLink(): QashPaymentLinkDetails {
  return {
    title: firstEnvValue('QASH_ACTOR_A_PAYMENT_LINK_TITLE') ??
      `Pioneer E2E Actor A Social Account payment ${Date.now()}`,
    amount: firstEnvValue(
      'QASH_ACTOR_A_PAYMENT_LINK_AMOUNT',
      'QASH_ACTOR_A_SOCIAL_PAYMENT_AMOUNT',
      'QASH_MONEY_MOVEMENT_AMOUNT'
    ) ?? '1.28',
    description: 'Pioneer E2E Actor A focused Social Account payment diagnostic',
    networkName: firstEnvValue('QASH_ACTOR_A_SOCIAL_PAYMENT_NETWORK', 'QASH_PAYMENT_LINK_NETWORK') ?? 'Miden Testnet',
    tokenName: firstEnvValue('QASH_ACTOR_A_SOCIAL_PAYMENT_TOKEN', 'QASH_PAYMENT_LINK_TOKEN') ?? 'QASH'
  };
}

function resolveActorAPaymentLinkUrl(): string | undefined {
  return firstEnvValue(
    'QASH_ACTOR_A_PAYMENT_LINK_URL',
    'QASH_PAYMENT_LINK_URL',
    'QASH_REUSE_PAYMENT_LINK_URL'
  );
}

function isSocialPayEnabled(): boolean {
  const configured = firstEnvValue('QASH_ACTOR_A_SOCIAL_PAYMENT_PAY');
  if (!configured) return true;
  return !['0', 'false', 'no', 'off'].includes(configured.toLowerCase());
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
