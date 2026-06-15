import { expect, type Locator, type Page, type Response } from '@playwright/test';

import { getAppConfig } from '../../config/apps';
import type { TimelineRecorder } from '../../harness/timeline-recorder';
import { BaseAppAdapter } from '../app-adapter';
import {
  parseQashAccountFundingState,
  parseQashFundingState,
  type QashAccountFundingState,
  type QashFundingState
} from './funding-state';
import {
  qashAccountStartLocators,
  qashAddContactFormLocators,
  qashAddContactStartLocators,
  qashAssetDetailsReadyLocators,
  qashAuthenticatedLocators,
  qashAuthenticatedShellLocators,
  qashContactDetailsFormLocators,
  qashContactEmailInputLocators,
  qashContactConfirmActionLocators,
  qashContactBookClientTabLocators,
  qashContactBookReadyLocators,
  qashContactGroupConfirmActionLocators,
  qashContactGroupCreatedLocators,
  qashContactGroupCreateStartLocators,
  qashContactGroupFormReadyLocators,
  qashContactGroupNameInputLocators,
  qashContactGroupOptionLocators,
  qashContactGroupSelectLocators,
  qashContactNameInputLocators,
  qashContactTypeLocators,
  qashContactWalletAddressInputLocators,
  qashCreateMultisigAccountFormLocators,
  qashCreateMultisigAccountStartLocators,
  qashCreatedContactLocators,
  qashFaucetClaimModalLocators,
  qashFaucetClaimModalCloseLocators,
  qashFaucetAccountOptionLocators,
  qashFaucetAccountSelectionLocators,
  qashFaucetConfirmActionLocators,
  qashFaucetRequestActionLocators,
  qashFaucetStartLocators,
  qashBillsReadyLocators,
  qashBillsStateLocators,
  qashClientCompanyNameInputLocators,
  qashClientContactEmailInputLocators,
  qashClientContactFormLocators,
  qashClientContactSaveActionLocators,
  qashInvoiceAddItemActionLocators,
  qashInvoiceAmountInputLocators,
  qashInvoiceClientOptionLocators,
  qashInvoiceClientPickerReadyLocators,
  qashInvoiceClientSelectLocators,
  qashInvoiceConfirmActionLocators,
  qashInvoiceCreateActionLocators,
  qashInvoiceCreateStartLocators,
  qashInvoiceCreatedSuccessLocators,
  qashInvoiceDetailsFormReadyLocators,
  qashInvoiceDueDateSelectLocators,
  qashInvoiceDueDateDayLocators,
  qashInvoiceDueDateInputLocators,
  qashInvoiceFormReadyLocators,
  qashInvoiceItemDescriptionInputLocators,
  qashInvoiceNetworkOptionLocators,
  qashInvoiceNetworkSelectLocators,
  qashInvoiceNoteInputLocators,
  qashInvoicePaymentAccountOptionLocators,
  qashInvoicePaymentDetailsReadyLocators,
  qashInvoiceRecipientFormReadyLocators,
  qashInvoiceReadyLocators,
  qashInvoiceReviewReadyLocators,
  qashInvoiceStateLocators,
  qashInvoiceTokenOptionLocators,
  qashInvoiceTokenSelectLocators,
  qashInvoiceViewCreatedActionLocators,
  qashInvoiceWizardNextLocators,
  qashInvoiceWalletAddressInputLocators,
  qashMultisigAccountDescriptionInputLocators,
  qashMultisigAccountCreatedContinueLocators,
  qashMultisigAccountCreatedLocators,
  qashMultisigAccountNameInputLocators,
  qashMultisigChooseMembersReadyLocators,
  qashMultisigNextStepLocators,
  qashMultisigAccountPrerequisiteLocators,
  qashMultisigReviewFinalActionLocators,
  qashMultisigReviewReadyLocators,
  qashParaAuthLocators,
  qashPendingFaucetReceiveClaimLocators,
  qashPendingFaucetReceiveExecuteLocators,
  qashPendingFaucetReceiveProcessingLocators,
  qashPendingFaucetReceiveReadyLocators,
  qashPendingFaucetReceiveSignLocators,
  qashPendingReceiveClaimLocators,
  qashPendingReceiveExecuteLocators,
  qashPendingReceiveProcessingLocators,
  qashPendingReceiveReadyLocators,
  qashPendingReceiveSignLocators,
  qashPostAuthOnboardingLocators,
  qashPaymentLinkAmountInputLocators,
  qashPaymentLinkAccountOptionLocators,
  qashPaymentLinkCreateActionLocators,
  qashPaymentLinkCreatedOverviewLocators,
  qashPaymentLinkDescriptionInputLocators,
  qashPaymentLinkFormReadyLocators,
  qashPaymentLinkNetworkReadyLocators,
  qashPaymentLinkCreateStartLocators,
  qashPaymentLinksReadyLocators,
  qashPaymentLinksStateLocators,
  qashPaymentLinkTitleInputLocators,
  qashPaymentLinkTokenOptionLocators,
  qashPaymentLinkTokenSelectLocators,
  qashPendingTransactionExecuteLocators,
  qashPendingTransactionProcessingLocators,
  qashPendingTransactionSignLocators,
  qashPublicPaymentLinkConnectWalletLocators,
  qashPublicPaymentLinkPayActionLocators,
  qashPublicPaymentLinkReadyLocators,
  qashPublicPaymentLinkSocialAccountOptionLocators,
  qashPublicPaymentLinkSuccessLocators,
  qashPublicPaymentLinkWalletInstallPromptLocators,
  qashPublicPaymentLinkWalletOptionLocators,
  qashPayrollConfirmActionLocators,
  qashPayrollCreateActionLocators,
  qashPayrollCreatedOverviewLocators,
  qashPayrollDurationInputLocators,
  qashPayrollEmployeeOptionLocators,
  qashPayrollEmployeeSelectLocators,
  qashPayrollFormReadyLocators,
  qashPayrollItemDescriptionInputLocators,
  qashPayrollMonthlyAmountInputLocators,
  qashPayrollNewStartLocators,
  qashPayrollNetworkOptionLocators,
  qashPayrollNetworkSelectLocators,
  qashPayrollNoteInputLocators,
  qashPayrollReadyLocators,
  qashPayrollReviewReadyLocators,
  qashPayrollScheduledPayDayLocators,
  qashPayrollTokenOptionLocators,
  qashPayrollTokenSelectLocators,
  qashPayrollTransactionStateLocators,
  qashPayrollWalletAddressInputLocators,
  qashPortfolioAssetLocators,
  qashPortfolioReadyLocators,
  qashPortfolioStartLocators,
  qashReadyLocators,
  qashSectionNavigationLocators,
  qashSectionPathPatterns,
  qashSectionReadyLocators,
  qashSettingsReadyLocators,
  qashTransactionsPendingTabLocators,
  qashTransactionsReadyLocators,
  qashTransactionsStateLocators,
  qashTransactionsAccountTabLocators,
  qashTransactionsReceiveTabLocators,
  type QashSectionName
} from './selectors';

export interface QashContactDetails {
  name: string;
  email: string;
  walletAddress: string;
  groupName?: string;
}

export interface QashClientContactDetails {
  companyName: string;
  email: string;
}

export interface QashPayrollDetails {
  employeeName: string;
  walletAddress: string;
  durationMonths: string;
  monthlyAmount: string;
  scheduledPayDay: string;
  itemDescription: string;
  note?: string;
  networkName?: string;
  tokenName?: string;
}

export interface QashInvoiceDetails {
  clientName: string;
  walletAddress: string;
  amount: string;
  dueDay: string;
  itemDescription: string;
  note?: string;
  networkName?: string;
  tokenName?: string;
}

export interface QashPaymentLinkDetails {
  title: string;
  amount: string;
  description?: string;
  accountName?: string;
  networkName?: string;
  tokenName?: string;
}

export interface QashPaymentLinkPaymentResult {
  paymentUrl: string;
  code: string;
  payerWalletAddress?: string;
  requestedNoteType?: string | undefined;
  enforcedNoteType?: string | undefined;
  noteProbe?: QashPaymentLinkNoteProbe | undefined;
  responseStatus: number;
  responseUrl: string;
  responseBody?: unknown;
  txid?: string;
  walletCompletedTxHash?: string;
}

export interface QashPaymentLinkSocialPaymentResult {
  paymentUrl: string;
  code: string;
  responseStatus: number;
  responseUrl: string;
  responseBody?: unknown;
  txid?: string;
}

export interface QashCreatedPaymentLinkInfo {
  paymentUrl?: string;
  code?: string;
  capturedAt: string;
  source: 'api-response' | 'api-list';
  responseUrl?: string;
  responseStatus?: number;
  responseBody?: unknown;
  bodyTextSample?: string;
}

export interface QashPaymentLinkNoteProbe {
  expectedNoteType: 'public' | 'private';
  patchInstalled: boolean;
  requests: QashPaymentLinkNoteRequestProbe[];
}

export interface QashPaymentLinkNoteRequestProbe {
  method: string;
  beforeNoteType?: string | undefined;
  afterNoteType?: string | undefined;
  forced: boolean;
  keys: string[];
  at: string;
}

export interface QashMultisigAccountInventory {
  count: number;
  names: string[];
  bodyTextSample: string;
}

export interface QashMultisigAccountPoolSelection {
  accountName: string;
  accountId?: string;
  createdAccount?: QashCreatedMultisigAccountInfo;
  shouldCreate: boolean;
  inventory: QashMultisigAccountInventory;
  maxAccounts: number;
  reason: 'below-cap' | 'explicit-existing' | 'explicit-existing-account-id' | 'random-reuse' | 'override';
}

export interface QashMultisigAccountPoolOptions {
  requestedAccountName: string;
  accountDescription?: string;
  maxAccounts: number;
  allowOverCap?: boolean;
}

export interface QashFaucetFundingResult {
  accountName: string;
  directFundingReady: boolean;
  fundingState?: QashFundingState;
  accountFundingState: QashAccountFundingState;
}

export interface QashPendingDrainAccountResult {
  accountName: string;
  drained: number;
  blocked: boolean;
  error?: string;
}

export interface QashPendingDrainResult {
  accounts: QashPendingDrainAccountResult[];
  drained: number;
  blocked: number;
}

export interface QashPendingTransactionAccountInventory {
  accountName: string;
  pendingCount: number;
  pendingTransactionCount: number;
  receiveCount: number;
  actions: string[];
  rowSummaries: string[];
  noPendingVisible: boolean;
  syncedAt: string;
  bodyTextSample: string;
}

export interface QashPendingTransactionsInventory {
  accounts: QashPendingTransactionAccountInventory[];
  totalPending: number;
}

export type QashCreatedMultisigAccountIdSource = 'api-response' | 'modal-dom';

export interface QashCreatedMultisigAccountInfo {
  accountName: string;
  accountId: string;
  capturedAt: string;
  source: QashCreatedMultisigAccountIdSource;
  responseUrl?: string;
  responseStatus?: number;
  bodyTextSample?: string;
}

interface QashApiAuthFailure {
  url: string;
  status: number;
  method: string;
  observedAt: string;
  bodyTextSample?: string;
}

class QashAuthSessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QashAuthSessionExpiredError';
  }
}

export type QashPendingReceiveSettlementState = 'claimed' | 'signed' | 'executed';

export class QashAdapter extends BaseAppAdapter {
  readonly config = getAppConfig('qash');
  protected readonly allowErrorDocumentStatus = true;
  private pendingMultisigAccountCreateResponse?: Promise<QashCreatedMultisigAccountInfo | undefined>;
  private pendingPaymentLinkCreateResponse?: Promise<QashCreatedPaymentLinkInfo | undefined>;
  private qashApiAuthFailure?: QashApiAuthFailure;

  constructor(page: Page, timeline: TimelineRecorder) {
    super(page, timeline);
    this.attachQashApiAuthFailureMonitor();
  }

  async assertReady(): Promise<void> {
    await this.expectAnyReadySignal(qashReadyLocators(this.page));
  }

  async startAccountCreation(): Promise<void> {
    await this.clickFirstVisible('Qash account creation control', qashAccountStartLocators(this.page));
  }

  async assertAccountCreationReady(): Promise<void> {
    await this.expectAnyReadySignal([
      ...qashParaAuthLocators(this.page),
      ...qashPostAuthOnboardingLocators(this.page),
      ...qashReadyLocators(this.page)
    ]);
  }

  async assertAuthenticatedReady(): Promise<void> {
    await this.assertAuthenticatedSessionHealthy('asserting authenticated Qash readiness');
    await this.expectAnyReadySignal(qashAuthenticatedLocators(this.page));
  }

  async assertAuthenticatedShellReady(): Promise<void> {
    await this.assertAuthenticatedSessionHealthy('asserting authenticated Qash shell readiness');
    await this.expectAnyReadySignal(qashAuthenticatedShellLocators(this.page));
  }

  async assertAuthenticatedSessionHealthy(context = 'authenticated Qash flow'): Promise<void> {
    await this.assertPreparedProfileStillAuthenticated(context);
    if (!this.qashApiAuthFailure) return;

    throw new QashAuthSessionExpiredError(
      [
        `Qash authenticated profile lost API auth while ${context}.`,
        `Observed ${this.qashApiAuthFailure.method} ${this.qashApiAuthFailure.url} -> ${this.qashApiAuthFailure.status} at ${this.qashApiAuthFailure.observedAt}.`,
        this.qashApiAuthFailure.bodyTextSample
          ? `Response sample: ${this.qashApiAuthFailure.bodyTextSample.slice(0, 240)}.`
          : null,
        ...this.qashAuthRecoveryInstructions()
      ].filter(Boolean).join(' ')
    );
  }

  async navigateToSection(section: QashSectionName): Promise<void> {
    await this.dismissBlockingDialogIfVisible();
    await this.waitForPendingFaucetReceiveClaimProcessingComplete();
    const pattern = qashSectionPathPatterns[section];
    await this.clickFirstVisible(`Qash ${section} navigation item`, qashSectionNavigationLocators(this.page, section));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    await this.page.waitForURL(url => pattern.test(url.pathname), { timeout: 5_000 }).catch(() => undefined);
  }

  async assertSectionReady(section: QashSectionName): Promise<void> {
    await this.assertAuthenticatedShellReady();

    const pattern = qashSectionPathPatterns[section];
    const path = new URL(this.page.url()).pathname;
    if (pattern.test(path)) return;

    await this.expectAnyReadySignal(qashSectionReadyLocators(this.page, section));
  }

  async assertMultisigAccountPrerequisiteVisible(): Promise<void> {
    await this.expectAnyReadySignal(qashMultisigAccountPrerequisiteLocators(this.page));
  }

  async startMultisigAccountCreation(): Promise<void> {
    try {
      await this.clickFirstVisible('Qash Create account control', qashCreateMultisigAccountStartLocators(this.page));
    } catch (error) {
      const clicked = await this.clickRenderedCreateAccountControl();
      if (!clicked) throw error;
    }
  }

  async assertMultisigAccountCreationReady(): Promise<void> {
    await this.expectAnyReadySignal(qashCreateMultisigAccountFormLocators(this.page));
  }

  async fillMultisigAccountDetails(name: string, description?: string): Promise<void> {
    await this.fillFirstVisible('Qash multisig account name', qashMultisigAccountNameInputLocators(this.page), name);
    if (description) {
      await this.fillFirstVisible(
        'Qash multisig account description',
        qashMultisigAccountDescriptionInputLocators(this.page),
        description
      );
    }
  }

  async advanceMultisigAccountCreationStep(): Promise<void> {
    await this.clickFirstVisible('Qash multisig account setup Next control', qashMultisigNextStepLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertMultisigChooseMembersReady(): Promise<void> {
    await this.expectAnyReadySignal(qashMultisigChooseMembersReadyLocators(this.page));
  }

  async assertMultisigReviewReady(accountName: string): Promise<void> {
    await this.expectAnyReadySignal(qashMultisigReviewReadyLocators(this.page, accountName));
    await this.expectAnyReadySignal(qashMultisigReviewFinalActionLocators(this.page));
  }

  async captureMultisigAccountInventory(): Promise<QashMultisigAccountInventory> {
    const bodyText = await this.page.locator('body').innerText({ timeout: 15_000 });
    return parseQashMultisigAccountInventory(bodyText);
  }

  async assertMultisigAccountCapacity(maxAccounts: number): Promise<QashMultisigAccountInventory> {
    const inventory = await this.captureMultisigAccountInventory();

    if (inventory.count >= maxAccounts) {
      throw new Error(
        [
          `Qash actor profile already has ${inventory.count} multisig accounts, which is at or above the configured cap of ${maxAccounts}.`,
          'Stop before creating another account: Qash sync time and Guardian rate-limit pressure grow with each stale account.',
          'Use a supported Qash cleanup/archive flow if the product exposes one, refresh the actor profile, or run with an explicit override only when intentionally stress-testing account scale.',
          inventory.names.length ? `Visible accounts: ${inventory.names.slice(0, 10).join(', ')}.` : null
        ].filter(Boolean).join(' ')
      );
    }

    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Qash multisig account inventory is below cap',
      data: {
        count: inventory.count,
        maxAccounts,
        names: inventory.names.slice(0, 10)
      }
    });

    return inventory;
  }

  async resolveMultisigAccountPoolSelection(options: {
    requestedAccountName: string;
    maxAccounts: number;
    allowOverCap?: boolean;
  }): Promise<QashMultisigAccountPoolSelection> {
    const inventory = await this.captureMultisigAccountInventory();
    const existingRequestedAccount = inventory.names.find(name => name === options.requestedAccountName);

    if (existingRequestedAccount) {
      return this.emitMultisigAccountPoolSelection({
        accountName: existingRequestedAccount,
        shouldCreate: false,
        inventory,
        maxAccounts: options.maxAccounts,
        reason: 'explicit-existing'
      });
    }

    if (options.allowOverCap) {
      return this.emitMultisigAccountPoolSelection({
        accountName: options.requestedAccountName,
        shouldCreate: true,
        inventory,
        maxAccounts: options.maxAccounts,
        reason: 'override'
      });
    }

    if (inventory.count < options.maxAccounts) {
      return this.emitMultisigAccountPoolSelection({
        accountName: options.requestedAccountName,
        shouldCreate: true,
        inventory,
        maxAccounts: options.maxAccounts,
        reason: 'below-cap'
      });
    }

    if (!inventory.names.length) {
      throw new Error(
        [
          `Qash actor profile already has ${inventory.count} multisig accounts, which is at or above the configured pool size of ${options.maxAccounts}.`,
          'The journey should reuse an existing account at the cap, but no visible account names were parsed from the Qash sidebar.',
          `Body sample: ${inventory.bodyTextSample}`
        ].join(' ')
      );
    }

    const reusableAccountName = inventory.names[Math.floor(Math.random() * inventory.names.length)];
    if (!reusableAccountName) {
      throw new Error('Qash account reuse selection failed even though visible account names were parsed.');
    }

    return this.emitMultisigAccountPoolSelection({
      accountName: reusableAccountName,
      shouldCreate: false,
      inventory,
      maxAccounts: options.maxAccounts,
      reason: 'random-reuse'
    });
  }

  async resolveOrCreateMultisigAccountFromPool(
    options: QashMultisigAccountPoolOptions
  ): Promise<QashMultisigAccountPoolSelection> {
    const poolOptions: {
      requestedAccountName: string;
      maxAccounts: number;
      allowOverCap?: boolean;
    } = {
      requestedAccountName: options.requestedAccountName,
      maxAccounts: options.maxAccounts
    };
    if (options.allowOverCap !== undefined) poolOptions.allowOverCap = options.allowOverCap;

    const selection = await this.resolveMultisigAccountPoolSelection(poolOptions);

    if (!selection.shouldCreate) return selection;

    await this.startMultisigAccountCreation();
    await this.assertMultisigAccountCreationReady();
    await this.fillMultisigAccountDetails(selection.accountName, options.accountDescription);
    await this.advanceMultisigAccountCreationStep();
    await this.assertMultisigChooseMembersReady();
    await this.advanceMultisigAccountCreationStep();
    await this.assertMultisigReviewReady(selection.accountName);
    await this.submitMultisigAccountCreation();
    const createdAccount = await this.assertMultisigAccountCreated(selection.accountName);
    await this.continueFromMultisigAccountCreated();

    return {
      ...selection,
      accountId: createdAccount.accountId,
      createdAccount
    };
  }

  async resolveExistingMultisigAccountReference(options: {
    requestedAccountName?: string;
    accountId?: string;
    maxAccounts: number;
  }): Promise<QashMultisigAccountPoolSelection> {
    const inventory = await this.captureMultisigAccountInventory();
    const bodyText = await this.page.locator('body').innerText({ timeout: 15_000 });
    const candidates = [options.requestedAccountName, options.accountId]
      .map(value => value?.trim())
      .filter((value): value is string => Boolean(value));

    for (const candidate of candidates) {
      const exactName = inventory.names.find(name => name === candidate);
      if (exactName) {
        const selection: QashMultisigAccountPoolSelection = {
          accountName: exactName,
          shouldCreate: false,
          inventory,
          maxAccounts: options.maxAccounts,
          reason: 'explicit-existing'
        };
        const accountId = normalizeQashAccountId(options.accountId);
        if (accountId) selection.accountId = accountId;
        return this.emitMultisigAccountPoolSelection(selection);
      }
    }

    const accountId = normalizeQashAccountId(options.accountId);
    if (accountId && bodyText.toLowerCase().includes(accountId)) {
      return this.emitMultisigAccountPoolSelection({
        accountName: accountId,
        accountId,
        shouldCreate: false,
        inventory,
        maxAccounts: options.maxAccounts,
        reason: 'explicit-existing-account-id'
      });
    }

    throw new Error(
      [
        `Qash existing multisig account was not found for ${options.accountId ?? options.requestedAccountName ?? 'unknown account'}.`,
        options.requestedAccountName ? `Requested account label: ${options.requestedAccountName}.` : null,
        accountId ? `Saved account ID: ${accountId}.` : null,
        inventory.names.length ? `Visible account labels: ${inventory.names.slice(0, 10).join(', ')}.` : 'No visible account labels were parsed.',
        'Money movement does not create replacement Actor A/B accounts by default.',
        'Set QASH_ACTOR_A_PAYMENT_ACCOUNT_NAME or QASH_ACTOR_B_PAYMENT_ACCOUNT_NAME to the exact visible account label, or set QASH_MONEY_MOVEMENT_CREATE_MISSING_ACCOUNTS=true when intentionally creating a new actor account.'
      ].filter(Boolean).join(' ')
    );
  }

  async submitMultisigAccountCreation(): Promise<void> {
    this.pendingMultisigAccountCreateResponse = this.waitForMultisigAccountCreateResponse();
    await this.clickFirstVisible(
      'Qash multisig account Review Create control',
      qashMultisigReviewFinalActionLocators(this.page)
    );
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertMultisigAccountCreated(accountName: string): Promise<QashCreatedMultisigAccountInfo> {
    const maxAttempts = Math.max(1, Math.floor(resolvePositiveNumber(process.env.QASH_ACCOUNT_CREATE_RETRY_ATTEMPTS, 3)));
    const retryDelayMs = resolvePositiveNumber(process.env.QASH_ACCOUNT_CREATE_RETRY_DELAY_MS, 5_000);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await expect(this.page.getByText(/^Review your account$/i).first()).toBeHidden({ timeout: 90_000 });
        await this.expectAnyReadySignal(qashMultisigAccountCreatedLocators(this.page, accountName));
        await expect(this.page.getByText(/Your account is ready/i).first()).toBeVisible({ timeout: 30_000 });
        const createdAccount = await this.captureCreatedMultisigAccountId(accountName);
        this.timeline.emit({
          category: 'app_ui',
          severity: 'info',
          source: this.config.name,
          message: 'Qash multisig account ID captured',
          data: {
            accountName,
            accountId: createdAccount.accountId,
            source: createdAccount.source,
            responseUrl: createdAccount.responseUrl,
            responseStatus: createdAccount.responseStatus
          }
        });
        return createdAccount;
      } catch (error) {
        lastError = error;

        const reviewStillVisible = await this.page
          .getByText(/^Review your account$/i)
          .first()
          .isVisible({ timeout: 1_000 })
          .catch(() => false);

        if (!reviewStillVisible || attempt === maxAttempts) throw error;

        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Qash multisig account creation stayed on review screen; retrying Create',
          data: { accountName, attempt, maxAttempts, retryDelayMs }
        });

        await this.page.waitForTimeout(retryDelayMs);
        await this.submitMultisigAccountCreation();
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  async captureCreatedMultisigAccountId(accountName: string): Promise<QashCreatedMultisigAccountInfo> {
    const responseCapture = await this.pendingMultisigAccountCreateResponse;
    if (responseCapture) {
      return {
        ...responseCapture,
        accountName
      };
    }

    const modalCapture = await this.captureCreatedMultisigAccountIdFromModal(accountName);
    if (modalCapture) return modalCapture;

    throw new Error(
      [
        `Qash created account ID was not captured for "${accountName}".`,
        'Account creation is incomplete because the automation needs the full 0x account ID for future Actor A/B durability flows.',
        'The modal/body text may be truncated; capture must come from the account creation response or a full modal DOM value.'
      ].join(' ')
    );
  }

  async continueFromMultisigAccountCreated(): Promise<void> {
    await this.clickFirstVisible(
      'Qash account-created View Account control',
      qashMultisigAccountCreatedContinueLocators(this.page)
    );
    await expect(this.page.getByText(/Your account is ready/i).first()).toBeHidden({ timeout: 30_000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async openPortfolio(): Promise<void> {
    await this.clickFirstVisible('Qash Portfolio control', qashPortfolioStartLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertPortfolioReady(): Promise<void> {
    await this.expectAnyReadySignal(qashPortfolioReadyLocators(this.page));
  }

  async openPortfolioAsset(token = 'QASH'): Promise<void> {
    await this.clickFirstVisible(`Qash ${token} portfolio asset`, qashPortfolioAssetLocators(this.page, token));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertAssetDetailsReady(): Promise<void> {
    await this.expectAnyReadySignal(qashAssetDetailsReadyLocators(this.page));
  }

  async openFaucetClaimModal(): Promise<void> {
    const requestButton = this.page.getByRole('button', { name: /^Request free tokens$/i });
    if (await requestButton.isVisible({ timeout: 1_000 }).catch(() => false)) return;

    await this.clickFirstVisible('Qash faucet floating action button', qashFaucetStartLocators(this.page));
  }

  async assertFaucetClaimModalReady(): Promise<void> {
    for (const locator of qashFaucetClaimModalLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async requestFaucetTokens(): Promise<void> {
    await this.clickFirstVisible('Qash Request free tokens control', qashFaucetRequestActionLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertFaucetAccountSelectionReady(accountName?: string): Promise<void> {
    await this.expectAnyReadySignal(qashFaucetAccountSelectionLocators(this.page, accountName));
  }

  async selectFaucetAccount(accountName?: string): Promise<void> {
    await this.clickFirstVisible('Qash faucet account option', qashFaucetAccountOptionLocators(this.page, accountName));
  }

  async confirmFaucetRequest(): Promise<void> {
    await this.clickFirstVisible('Qash faucet Confirm control', qashFaucetConfirmActionLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    await this.waitForFaucetRequestSubmissionComplete();
    await this.waitForFaucetRequestProcessingComplete();
  }

  async selectTransactionsAccount(accountName: string): Promise<void> {
    await this.clickFirstVisible(
      `Qash Transactions account ${accountName}`,
      qashTransactionsAccountTabLocators(this.page, accountName)
    );
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Selected Qash Transactions account',
      data: { accountName }
    });
  }

  async openTransactionsReceiveTab(accountName?: string): Promise<void> {
    await this.dismissFaucetClaimModalIfVisible();
    await this.navigateToSection('Transactions');
    await this.assertSectionReady('Transactions');
    if (accountName) await this.selectTransactionsAccount(accountName);
    await this.clickFirstVisible('Qash Transactions Receive tab', qashTransactionsReceiveTabLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async openTransactionsPendingTab(accountName?: string): Promise<void> {
    await this.dismissFaucetClaimModalIfVisible();
    await this.navigateToSection('Transactions');
    await this.assertSectionReady('Transactions');
    if (accountName) await this.selectTransactionsAccount(accountName);
    await this.clickFirstVisible('Qash Transactions Pending Transactions tab', qashTransactionsPendingTabLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async openPendingFaucetReceiveWorkflow(accountName?: string): Promise<void> {
    await this.dismissFaucetClaimModalIfVisible();
    await this.navigateToSection('Transactions');
    await this.assertSectionReady('Transactions');
    if (accountName) await this.selectTransactionsAccount(accountName);

    await this.clickFirstVisible('Qash Transactions Pending Transactions tab', qashTransactionsPendingTabLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    if (await this.isAnyLocatorVisible(this.pendingFaucetActionLocators(), 1_000)) return;

    await this.clickFirstVisible('Qash Transactions Receive tab', qashTransactionsReceiveTabLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async openPendingReceiveWorkflow(accountName?: string): Promise<void> {
    await this.dismissFaucetClaimModalIfVisible();
    await this.navigateToSection('Transactions');
    await this.assertSectionReady('Transactions');
    if (accountName) await this.selectTransactionsAccount(accountName);

    await this.clickFirstVisible('Qash Transactions Pending Transactions tab', qashTransactionsPendingTabLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    if (await this.isAnyLocatorVisible(this.pendingReceiveActionLocators(), 1_000)) return;

    await this.clickFirstVisible('Qash Transactions Receive tab', qashTransactionsReceiveTabLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertPendingFaucetReceiveReady(timeoutMs = 60_000): Promise<void> {
    if (await this.isAnyLocatorVisible(this.pendingFaucetActionLocators(), 1_000)) return;

    for (const locator of qashPendingFaucetReceiveReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: timeoutMs });
    }
  }

  async hasPendingFaucetReceiveReady(timeoutMs = 10_000): Promise<boolean> {
    if (await this.isAnyLocatorVisible(this.pendingFaucetActionLocators(), 1_000)) return true;

    for (const locator of qashPendingFaucetReceiveReadyLocators(this.page)) {
      if (!(await locator.first().isVisible({ timeout: timeoutMs }).catch(() => false))) return false;
    }

    return true;
  }

  async hasPendingReceiveReady(options: { expectedAmount?: string; timeoutMs?: number } = {}): Promise<boolean> {
    if (await this.isAnyLocatorVisible(this.pendingReceiveActionLocators(), 1_000)) return true;

    const timeoutMs = options.timeoutMs ?? 10_000;
    for (const locator of qashPendingReceiveReadyLocators(this.page, options.expectedAmount)) {
      if (!(await locator.first().isVisible({ timeout: timeoutMs }).catch(() => false))) return false;
    }

    return true;
  }

  async waitForPendingFaucetReceiveReady(
    options: { timeoutMs?: number; intervalMs?: number; accountName?: string } = {}
  ): Promise<QashFundingState | undefined> {
    const timeoutMs = options.timeoutMs ?? resolvePositiveNumber(process.env.QASH_PENDING_FAUCET_RECEIVE_TIMEOUT_MS, 300_000);
    const intervalMs = options.intervalMs ?? 5_000;
    const startedAt = Date.now();
    let lastState: QashFundingState | undefined;
    let lastError: string | undefined;
    let attempt = 0;

    while (Date.now() - startedAt <= timeoutMs) {
      attempt += 1;
      await this.assertAuthenticatedSessionHealthy('waiting for pending faucet receive');

      try {
        await this.openPendingFaucetReceiveWorkflow(options.accountName);

        if (await this.hasPendingFaucetReceiveReady(2_000)) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Qash pending faucet receive is ready',
            data: {
              attempt,
              accountName: options.accountName,
              qashBalance: lastState?.qashBalance,
              mintingVisible: lastState?.mintingVisible,
              pendingFaucetReceiveVisible: lastState?.pendingFaucetReceiveVisible
            }
          });
          return lastState;
        }

        lastState = await this.captureFaucetFundingState();
        lastError = undefined;

        if (attempt === 1 || attempt % 3 === 0) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Waiting for Qash pending faucet receive',
            data: {
              attempt,
              accountName: options.accountName,
              qashBalance: lastState.qashBalance,
              mintingVisible: lastState.mintingVisible,
              pendingFaucetReceiveVisible: lastState.pendingFaucetReceiveVisible,
              syncingVisible: lastState.syncingVisible,
              balanceCandidates: lastState.balanceCandidates.slice(0, 5)
            }
          });
        }
      } catch (error) {
        if (error instanceof QashAuthSessionExpiredError) throw error;
        lastError = error instanceof Error ? error.message : String(error);
        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Could not inspect Qash pending faucet receive while waiting',
          data: { attempt, accountName: options.accountName, error: lastError }
        });
      }

      await this.page.waitForTimeout(intervalMs);
    }

    throw new Error(
      [
        `Qash pending faucet receive did not become ready within ${timeoutMs}ms.`,
        'The platform journey creates the account first, then requests faucet funding, then waits for the faucet receive note under Transactions -> Receive before claiming/signing/executing it.',
        options.accountName ? `Expected account: ${options.accountName}.` : null,
        lastState
          ? `Last funding state: qashBalance=${lastState.qashBalance}, mintingVisible=${lastState.mintingVisible}, pendingFaucetReceiveVisible=${lastState.pendingFaucetReceiveVisible}, syncingVisible=${lastState.syncingVisible}, candidates=${JSON.stringify(lastState.balanceCandidates.slice(0, 5))}.`
          : 'No funding state was captured.',
        lastError ? `Last wait error: ${lastError}` : null
      ].filter(Boolean).join(' ')
    );
  }

  async waitForPendingReceiveReady(
    options: { timeoutMs?: number; intervalMs?: number; expectedAmount?: string; accountName?: string } = {}
  ): Promise<QashFundingState | undefined> {
    const timeoutMs = options.timeoutMs ?? 300_000;
    const intervalMs = options.intervalMs ?? 5_000;
    const startedAt = Date.now();
    let lastState: QashFundingState | undefined;
    let lastError: string | undefined;
    let attempt = 0;

    while (Date.now() - startedAt <= timeoutMs) {
      attempt += 1;
      await this.assertAuthenticatedSessionHealthy('waiting for pending receive');

      try {
        await this.openPendingReceiveWorkflow(options.accountName);

        const readyOptions: { expectedAmount?: string; timeoutMs?: number } = { timeoutMs: 2_000 };
        if (options.expectedAmount !== undefined) readyOptions.expectedAmount = options.expectedAmount;

        if (await this.hasPendingReceiveReady(readyOptions)) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Qash pending receive is ready',
            data: {
              attempt,
              accountName: options.accountName,
              expectedAmount: options.expectedAmount,
              qashBalance: lastState?.qashBalance,
              pendingFaucetReceiveVisible: lastState?.pendingFaucetReceiveVisible
            }
          });
          return lastState;
        }

        lastState = await this.captureFaucetFundingState();
        lastError = undefined;

        if (attempt === 1 || attempt % 3 === 0) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Waiting for Qash pending receive',
            data: {
              attempt,
              accountName: options.accountName,
              expectedAmount: options.expectedAmount,
              qashBalance: lastState.qashBalance,
              pendingFaucetReceiveVisible: lastState.pendingFaucetReceiveVisible,
              syncingVisible: lastState.syncingVisible,
              balanceCandidates: lastState.balanceCandidates.slice(0, 5)
            }
          });
        }
      } catch (error) {
        if (error instanceof QashAuthSessionExpiredError) throw error;
        lastError = error instanceof Error ? error.message : String(error);
        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Could not inspect Qash pending receive while waiting',
          data: { attempt, accountName: options.accountName, expectedAmount: options.expectedAmount, error: lastError }
        });
      }

      await this.page.waitForTimeout(intervalMs);
    }

    throw new Error(
      [
        `Qash pending receive did not become ready within ${timeoutMs}ms.`,
        'The durability run requires actor-b to see the incoming receive note after actor-a executes the payment transaction.',
        options.accountName ? `Expected account: ${options.accountName}.` : null,
        options.expectedAmount ? `Expected amount: ${options.expectedAmount} QASH.` : null,
        lastState
          ? `Last funding state: qashBalance=${lastState.qashBalance}, pendingFaucetReceiveVisible=${lastState.pendingFaucetReceiveVisible}, syncingVisible=${lastState.syncingVisible}, candidates=${JSON.stringify(lastState.balanceCandidates.slice(0, 5))}.`
          : 'No funding state was captured.',
        lastError ? `Last wait error: ${lastError}` : null
      ].filter(Boolean).join(' ')
    );
  }

  async claimPendingFaucetReceive(): Promise<void> {
    await this.clickFirstVisible('Qash pending faucet receive Claim control', qashPendingFaucetReceiveClaimLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async claimPendingReceive(): Promise<void> {
    await this.clickFirstVisible('Qash pending receive Claim control', qashPendingReceiveClaimLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async signPendingFaucetReceive(): Promise<void> {
    await this.clickFirstVisible('Qash pending faucet receive Sign control', qashPendingFaucetReceiveSignLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async signPendingReceive(): Promise<void> {
    await this.clickFirstVisible('Qash pending receive Sign control', qashPendingReceiveSignLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async executePendingFaucetReceive(): Promise<void> {
    await this.clickFirstVisible('Qash pending faucet receive Execute control', qashPendingFaucetReceiveExecuteLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async executePendingReceive(): Promise<void> {
    await this.clickFirstVisible('Qash pending receive Execute control', qashPendingReceiveExecuteLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async drainPendingFaucetReceives(
    accountNames: string[],
    options: { maxPerAccount?: number } = {}
  ): Promise<QashPendingDrainResult> {
    const maxPerAccount = Math.max(1, Math.floor(options.maxPerAccount ?? 10));
    const accounts: QashPendingDrainAccountResult[] = [];

    for (const accountName of accountNames) {
      let drained = 0;
      let blocked = false;
      let error: string | undefined;

      for (let attempt = 1; attempt <= maxPerAccount; attempt += 1) {
        await this.openTransactionsPendingTab(accountName);
        await this.waitForTransactionsAccountSyncSettled(accountName);

        if (!(await this.isAnyLocatorVisible(this.pendingFaucetActionLocators(), 2_000))) {
          await this.openTransactionsReceiveTab(accountName);
          await this.waitForTransactionsAccountSyncSettled(accountName);
          if (!(await this.isAnyLocatorVisible(this.pendingFaucetActionLocators(), 2_000))) {
            break;
          }
        }

        try {
          await this.completePendingFaucetReceive(accountName, { requireNoRemainingAction: true });
          drained += 1;
        } catch (drainError) {
          blocked = true;
          error = drainError instanceof Error ? drainError.message : String(drainError);
          break;
        }
      }

      const result: QashPendingDrainAccountResult = { accountName, drained, blocked };
      if (error) result.error = error;
      accounts.push(result);

      this.timeline.emit({
        category: 'app_ui',
        severity: blocked ? 'warn' : 'info',
        source: this.config.name,
        message: 'Qash pending faucet receive drain account result',
        data: {
          accountName: result.accountName,
          drained: result.drained,
          blocked: result.blocked,
          error: result.error
        }
      });
    }

    return {
      accounts,
      drained: accounts.reduce((total, account) => total + account.drained, 0),
      blocked: accounts.filter(account => account.blocked).length
    };
  }

  async capturePendingTransactionsInventory(accountNames: string[]): Promise<QashPendingTransactionsInventory> {
    const accounts: QashPendingTransactionAccountInventory[] = [];

    for (const accountName of accountNames) {
      await this.openTransactionsPendingTab(accountName);
      await this.waitForTransactionsAccountSyncSettled(accountName);
      const pendingSnapshot = await this.captureVisibleTransactionActionSnapshot();

      await this.openTransactionsReceiveTab(accountName);
      await this.waitForTransactionsAccountSyncSettled(accountName);
      const receiveSnapshot = await this.captureVisibleTransactionActionSnapshot();

      const pendingTransactionCount = pendingSnapshot.noPendingVisible ? 0 : pendingSnapshot.actions.length;
      const receiveCount = receiveSnapshot.noPendingVisible ? 0 : receiveSnapshot.actions.length;

      const accountInventory: QashPendingTransactionAccountInventory = {
        accountName,
        pendingCount: pendingTransactionCount + receiveCount,
        pendingTransactionCount,
        receiveCount,
        actions: [
          ...pendingSnapshot.actions.map(action => `Pending Transactions:${action}`),
          ...receiveSnapshot.actions.map(action => `Receive:${action}`)
        ],
        rowSummaries: [
          ...pendingSnapshot.rowSummaries.map(summary => `Pending Transactions: ${summary}`),
          ...receiveSnapshot.rowSummaries.map(summary => `Receive: ${summary}`)
        ],
        noPendingVisible: pendingSnapshot.noPendingVisible && receiveSnapshot.noPendingVisible,
        syncedAt: new Date().toISOString(),
        bodyTextSample: receiveSnapshot.bodyTextSample || pendingSnapshot.bodyTextSample
      };

      accounts.push(accountInventory);
      this.timeline.emit({
        category: 'app_ui',
        severity: accountInventory.pendingCount > 0 ? 'warn' : 'info',
        source: this.config.name,
        message: 'Qash pending transaction account inventory captured',
        data: {
          accountName: accountInventory.accountName,
          pendingCount: accountInventory.pendingCount,
          pendingTransactionCount: accountInventory.pendingTransactionCount,
          receiveCount: accountInventory.receiveCount,
          actions: accountInventory.actions,
          noPendingVisible: accountInventory.noPendingVisible,
          rowSummaries: accountInventory.rowSummaries.slice(0, 3)
        }
      });
    }

    return {
      accounts,
      totalPending: accounts.reduce((total, account) => total + account.pendingCount, 0)
    };
  }

  async completePendingFaucetReceive(
    accountName?: string,
    options: { requireNoRemainingAction?: boolean } = {}
  ): Promise<void> {
    const requireNoRemainingAction = options.requireNoRemainingAction ?? true;
    let acted = false;

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await this.dismissBlockingDialogIfVisible();
      if (accountName) await this.openPendingFaucetReceiveWorkflow(accountName);

      if (await this.isAnyLocatorVisible(qashPendingFaucetReceiveClaimLocators(this.page), 1_000)) {
        await this.claimPendingFaucetReceive();
        acted = true;
      }

      await this.openTransactionsPendingTab(accountName);

      if (await this.isAnyLocatorVisible(qashPendingFaucetReceiveSignLocators(this.page), 1_000)) {
        await this.signPendingFaucetReceive();
        await this.waitForPendingFaucetReceiveClaimProcessingComplete();
        acted = true;
        continue;
      }

      if (await this.isAnyLocatorVisible(qashPendingFaucetReceiveExecuteLocators(this.page), 30_000)) {
        await this.executePendingActionWithBoundedRetries(
          'Qash pending faucet receive Execute',
          () => this.executePendingFaucetReceive(),
          () => this.waitForPendingFaucetReceiveClaimProcessingComplete()
        );
        acted = true;
        if (requireNoRemainingAction) {
          await this.waitForNoPendingFaucetReceiveAction(accountName);
        }
        return;
      }

      if (acted) {
        await this.waitForPendingFaucetReceiveClaimProcessingComplete();
        await this.page.waitForTimeout(2_000);
        continue;
      }
    }

    if (!acted) {
      throw new Error(
        'Qash faucet receive is not actionable: no Claim, Sign, or Execute control is visible in Transactions.'
      );
    }

    await this.waitForPendingFaucetReceiveClaimProcessingComplete();
    await this.assertNoPendingTransactionExecutionFailure('Qash pending faucet receive settlement');
    if (requireNoRemainingAction) {
      await this.waitForNoPendingFaucetReceiveAction(accountName);
    }
  }

  async completePendingReceive(accountName?: string): Promise<QashPendingReceiveSettlementState> {
    let state: QashPendingReceiveSettlementState | undefined;

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await this.dismissBlockingDialogIfVisible();
      if (accountName) await this.openPendingReceiveWorkflow(accountName);

      if (await this.isAnyLocatorVisible(qashPendingReceiveClaimLocators(this.page), 1_000)) {
        await this.claimPendingReceive();
        await this.waitForPendingReceiveProcessingComplete();
        state = 'claimed';
      }

      await this.openTransactionsPendingTab(accountName);

      if (await this.isAnyLocatorVisible(qashPendingReceiveSignLocators(this.page), 1_000)) {
        await this.signPendingReceive();
        await this.waitForPendingReceiveProcessingComplete();
        state = 'signed';
        continue;
      }

      if (await this.isAnyLocatorVisible(qashPendingReceiveExecuteLocators(this.page), 30_000)) {
        await this.executePendingActionWithBoundedRetries(
          'Qash pending receive Execute',
          () => this.executePendingReceive(),
          () => this.waitForPendingReceiveProcessingComplete()
        );
        state = 'executed';
        return state;
      }

      if (state === 'signed' || state === 'claimed') {
        await this.page.waitForTimeout(2_000);
      }
    }

    if (!state) {
      throw new Error(
        'Qash receive is not actionable: no Claim, Sign, or Execute control is visible in Transactions.'
      );
    }

    await this.waitForPendingReceiveProcessingComplete();
    await this.assertNoPendingTransactionExecutionFailure('Qash pending receive settlement');
    return state;
  }

  async waitForPendingFaucetReceiveClaimProcessingComplete(timeoutMs = 180_000): Promise<void> {
    const processingLocators = qashPendingFaucetReceiveProcessingLocators(this.page);
    if (!(await this.isAnyLocatorVisible(processingLocators, 1_000))) return;

    for (const locator of processingLocators) {
      await expect(locator.first()).toBeHidden({ timeout: timeoutMs });
    }
  }

  async waitForNoPendingFaucetReceiveAction(accountName?: string, timeoutMs = 30_000): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt <= timeoutMs) {
      await this.assertNoPendingTransactionExecutionFailure('waiting for Qash pending faucet receive action to clear');
      await this.assertAuthenticatedSessionHealthy('waiting for Qash pending faucet receive action to clear');
      if (accountName) await this.openTransactionsPendingTab(accountName);

      if (!(await this.isAnyLocatorVisible(this.pendingFaucetActionLocators(), 1_000))) {
        return;
      }

      await this.page.waitForTimeout(2_000);
    }

    throw new Error(
      [
        'Qash pending faucet receive remained actionable after settlement.',
        accountName ? `Account: ${accountName}.` : null,
        'The row must disappear or stop exposing Claim/Sign/Execute before the harness records faucet settlement as successful.'
      ].filter(Boolean).join(' ')
    );
  }

  async waitForPendingReceiveProcessingComplete(timeoutMs = 180_000): Promise<void> {
    const processingLocators = qashPendingReceiveProcessingLocators(this.page);
    if (!(await this.isAnyLocatorVisible(processingLocators, 1_000))) return;

    for (const locator of processingLocators) {
      await expect(locator.first()).toBeHidden({ timeout: timeoutMs });
    }
  }

  async captureFaucetFundingState(): Promise<QashFundingState> {
    const bodyText = await this.page.locator('body').innerText({ timeout: 15_000 });
    return parseQashFundingState(bodyText);
  }

  async captureAccountFundingState(accountName: string): Promise<QashAccountFundingState> {
    const bodyText = await this.page.locator('body').innerText({ timeout: 15_000 });
    return parseQashAccountFundingState(bodyText, accountName);
  }

  async waitForFundedBalanceReady(options: { timeoutMs?: number; intervalMs?: number } = {}): Promise<QashFundingState> {
    const timeoutMs = options.timeoutMs ?? resolvePositiveNumber(process.env.QASH_FAUCET_SETTLEMENT_TIMEOUT_MS, 180_000);
    const intervalMs = options.intervalMs ?? 5_000;
    const startedAt = Date.now();
    let lastState: QashFundingState | undefined;
    let lastError: string | undefined;
    let attempt = 0;

    await this.openFundingBalanceSurface();

    while (Date.now() - startedAt <= timeoutMs) {
      attempt += 1;
      await this.assertAuthenticatedSessionHealthy('waiting for funded balance');

      try {
        lastState = await this.captureFaucetFundingState();
        lastError = undefined;

        if (!lastState.mintingVisible && lastState.qashBalance > 0) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Qash funded balance is ready',
            data: {
              qashBalance: lastState.qashBalance,
              pendingFaucetReceiveVisible: lastState.pendingFaucetReceiveVisible,
              balanceCandidates: lastState.balanceCandidates
            }
          });
          return lastState;
        }

        if (attempt === 1 || attempt % 3 === 0) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Waiting for Qash funded balance',
            data: {
              qashBalance: lastState.qashBalance,
              mintingVisible: lastState.mintingVisible,
              pendingFaucetReceiveVisible: lastState.pendingFaucetReceiveVisible,
              syncingVisible: lastState.syncingVisible,
              balanceCandidates: lastState.balanceCandidates.slice(0, 5)
            }
          });
        }
      } catch (error) {
        if (error instanceof QashAuthSessionExpiredError) throw error;
        lastError = error instanceof Error ? error.message : String(error);
        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Could not capture Qash funding state while waiting for funded balance',
          data: { error: lastError }
        });
      }

      await this.page.waitForTimeout(intervalMs);
    }

    throw new Error(
      [
        `Qash funded balance did not become ready within ${timeoutMs}ms.`,
        'The faucet request is only considered settled after the Minting state is gone and a non-zero dashboard/portfolio QASH balance is visible.',
        'If a QASH Faucet receive note is pending, claim it from Transactions -> Receive before rerunning the funded-balance check.',
        lastState
          ? `Last funding state: qashBalance=${lastState.qashBalance}, mintingVisible=${lastState.mintingVisible}, pendingFaucetReceiveVisible=${lastState.pendingFaucetReceiveVisible}, syncingVisible=${lastState.syncingVisible}, candidates=${JSON.stringify(lastState.balanceCandidates.slice(0, 5))}.`
          : 'No funding state was captured.',
        lastError ? `Last capture error: ${lastError}` : null
      ].filter(Boolean).join(' ')
    );
  }

  async waitForAccountFundedBalanceReady(
    accountName: string,
    options: { timeoutMs?: number; intervalMs?: number } = {}
  ): Promise<QashAccountFundingState> {
    const timeoutMs = options.timeoutMs ?? resolvePositiveNumber(process.env.QASH_FAUCET_SETTLEMENT_TIMEOUT_MS, 180_000);
    const intervalMs = options.intervalMs ?? 5_000;
    const startedAt = Date.now();
    let lastState: QashAccountFundingState | undefined;
    let lastError: string | undefined;
    let attempt = 0;

    await this.openFundingBalanceSurface();

    while (Date.now() - startedAt <= timeoutMs) {
      attempt += 1;
      await this.assertAuthenticatedSessionHealthy('waiting for account funded balance');

      try {
        lastState = await this.captureAccountFundingState(accountName);
        lastError = undefined;

        if (!lastState.mintingVisible && lastState.accountBalance > 0) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Qash account funded balance is ready',
            data: {
              accountName,
              accountBalance: lastState.accountBalance,
              pendingFaucetReceiveVisible: lastState.pendingFaucetReceiveVisible,
              balanceCandidates: lastState.accountBalanceCandidates
            }
          });
          return lastState;
        }

        if (attempt === 1 || attempt % 3 === 0) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Waiting for Qash account funded balance',
            data: {
              accountName,
              accountBalance: lastState.accountBalance,
              mintingVisible: lastState.mintingVisible,
              pendingFaucetReceiveVisible: lastState.pendingFaucetReceiveVisible,
              syncingVisible: lastState.syncingVisible,
              balanceCandidates: lastState.accountBalanceCandidates.slice(0, 5)
            }
          });
        }
      } catch (error) {
        if (error instanceof QashAuthSessionExpiredError) throw error;
        lastError = error instanceof Error ? error.message : String(error);
        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Could not capture Qash account funding state while waiting for funded balance',
          data: { accountName, error: lastError }
        });
      }

      await this.page.waitForTimeout(intervalMs);
    }

    throw new Error(
      [
        `Qash account "${accountName}" did not show a funded balance within ${timeoutMs}ms.`,
        'The continuous journey requires the freshly created account row under Dashboard -> All Accounts to show a non-zero balance after faucet claim/sign/execute.',
        lastState
          ? `Last account funding state: accountBalance=${lastState.accountBalance}, mintingVisible=${lastState.mintingVisible}, pendingFaucetReceiveVisible=${lastState.pendingFaucetReceiveVisible}, syncingVisible=${lastState.syncingVisible}, candidates=${JSON.stringify(lastState.accountBalanceCandidates.slice(0, 5))}.`
          : 'No account funding state was captured.',
        lastError ? `Last capture error: ${lastError}` : null
      ].filter(Boolean).join(' ')
    );
  }

  async hasAccountFundedBalanceReady(
    accountName: string,
    options: { timeoutMs?: number; intervalMs?: number } = {}
  ): Promise<boolean> {
    const timeoutMs = options.timeoutMs ?? 15_000;
    const intervalMs = options.intervalMs ?? 3_000;
    const startedAt = Date.now();

    await this.openFundingBalanceSurface();

    while (Date.now() - startedAt <= timeoutMs) {
      await this.assertAuthenticatedSessionHealthy('checking direct account funded balance');
      const state = await this.captureAccountFundingState(accountName);
      if (!state.mintingVisible && state.accountBalance > 0) return true;
      await this.page.waitForTimeout(intervalMs);
    }

    return false;
  }

  async requestAndSettleFaucetFunding(accountName: string): Promise<QashFaucetFundingResult> {
    await this.assertAuthenticatedSessionHealthy('starting Actor A faucet funding setup');
    await this.openFaucetClaimModal();
    await this.assertFaucetClaimModalReady();
    await this.requestFaucetTokens();
    await this.assertFaucetAccountSelectionReady(accountName);
    await this.selectFaucetAccount(accountName);
    await this.confirmFaucetRequest();
    await this.assertAuthenticatedSessionHealthy('after Actor A faucet request submission');

    const directFundingReady = await this.hasAccountFundedBalanceReady(accountName, {
      timeoutMs: resolvePositiveNumber(process.env.QASH_ACCOUNT_DIRECT_FUNDING_TIMEOUT_MS, 15_000)
    });

    let fundingState: QashFundingState | undefined;
    if (!directFundingReady) {
      fundingState = await this.waitForPendingFaucetReceiveReady({
        timeoutMs: resolvePositiveNumber(process.env.QASH_PENDING_FAUCET_RECEIVE_TIMEOUT_MS, 300_000),
        accountName
      });
      await this.completePendingFaucetReceive(accountName);
      await this.assertAuthenticatedSessionHealthy('after Actor A faucet receive settlement');
    }

    const accountFundingState = await this.waitForAccountFundedBalanceReady(accountName);

    return {
      accountName,
      directFundingReady,
      ...(fundingState ? { fundingState } : {}),
      accountFundingState
    };
  }

  async openFundingBalanceSurface(): Promise<void> {
    await this.navigateToSection('Dashboard');
    await this.expectAnyReadySignal(qashSectionReadyLocators(this.page, 'Dashboard'));
  }

  async waitForFaucetRequestSubmissionComplete(timeoutMs = resolvePositiveNumber(
    process.env.QASH_FAUCET_REQUEST_TIMEOUT_MS,
    180_000
  )): Promise<void> {
    const startedAt = Date.now();
    const modalText = this.page.getByText(/grab your free test tokens to start exploring qash on testnet/i).first();

    while (Date.now() - startedAt <= timeoutMs) {
      await this.assertAuthenticatedSessionHealthy('waiting for faucet request submission');
      if (!(await modalText.isVisible({ timeout: 1_000 }).catch(() => false))) {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
        return;
      }
      await this.page.waitForTimeout(2_000);
    }

    throw new Error(`Qash faucet request submission did not complete within ${timeoutMs}ms.`);
  }

  async waitForFaucetRequestProcessingComplete(
    options: { timeoutMs?: number; intervalMs?: number } = {}
  ): Promise<QashFundingState> {
    const timeoutMs = options.timeoutMs ?? resolvePositiveNumber(process.env.QASH_FAUCET_SETTLEMENT_TIMEOUT_MS, 300_000);
    const intervalMs = options.intervalMs ?? 5_000;
    const startedAt = Date.now();
    let lastState: QashFundingState | undefined;
    let lastError: string | undefined;
    let attempt = 0;

    await this.page.waitForTimeout(2_000);

    while (Date.now() - startedAt <= timeoutMs) {
      attempt += 1;
      await this.assertAuthenticatedSessionHealthy('waiting for faucet request processing');

      try {
        lastState = await this.captureFaucetFundingState();
        lastError = undefined;

        if (!lastState.mintingVisible && !lastState.syncingVisible) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Qash faucet request processing is settled',
            data: {
              qashBalance: lastState.qashBalance,
              pendingFaucetReceiveVisible: lastState.pendingFaucetReceiveVisible,
              balanceCandidates: lastState.balanceCandidates.slice(0, 5)
            }
          });
          return lastState;
        }

        if (attempt === 1 || attempt % 3 === 0) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Waiting for Qash faucet request processing',
            data: {
              attempt,
              qashBalance: lastState.qashBalance,
              mintingVisible: lastState.mintingVisible,
              pendingFaucetReceiveVisible: lastState.pendingFaucetReceiveVisible,
              syncingVisible: lastState.syncingVisible,
              balanceCandidates: lastState.balanceCandidates.slice(0, 5)
            }
          });
        }
      } catch (error) {
        if (error instanceof QashAuthSessionExpiredError) throw error;
        lastError = error instanceof Error ? error.message : String(error);
        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Could not inspect Qash faucet request processing',
          data: { attempt, error: lastError }
        });
      }

      await this.page.waitForTimeout(intervalMs);
    }

    throw new Error(
      [
        `Qash faucet request processing did not settle within ${timeoutMs}ms.`,
        'The runner stays on the dashboard after confirming faucet funding until Minting and wallet sync are no longer visible.',
        lastState
          ? `Last funding state: qashBalance=${lastState.qashBalance}, mintingVisible=${lastState.mintingVisible}, pendingFaucetReceiveVisible=${lastState.pendingFaucetReceiveVisible}, syncingVisible=${lastState.syncingVisible}, candidates=${JSON.stringify(lastState.balanceCandidates.slice(0, 5))}.`
          : 'No funding state was captured.',
        lastError ? `Last wait error: ${lastError}` : null
      ].filter(Boolean).join(' ')
    );
  }

  private async dismissFaucetClaimModalIfVisible(): Promise<void> {
    for (const locator of qashFaucetClaimModalCloseLocators(this.page)) {
      const closeControl = locator.first();
      if (await closeControl.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await closeControl.click({ timeout: 5_000 });
        await expect(this.page.getByRole('button', { name: /^Request free tokens$/i })).toBeHidden({ timeout: 10_000 });
        return;
      }
    }
  }

  private async dismissBlockingDialogIfVisible(): Promise<boolean> {
    const controls = [
      this.page.getByRole('button', { name: /^I understand$/i }).first(),
      this.page.getByText(/^I understand$/i).last(),
      this.page.getByAltText(/^close icon$/i).first()
    ];

    for (const control of controls) {
      if (await control.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await control.click({ timeout: 5_000 });
        await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
        return true;
      }
    }

    return false;
  }

  private async assertNoBlockingDialogAfterPendingExecute(context: string): Promise<void> {
    const bodyText = await this.page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
    const hasBlockingFailureText = /something went wrong|failed to execute transaction|failed to execute proposal|pending_proposal_exists|guardian public key commitment mismatch/i.test(bodyText);
    const hasBlockingAcknowledgement = await this.page
      .getByRole('button', { name: /^I understand$/i })
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);

    if (!hasBlockingFailureText && !hasBlockingAcknowledgement) return;

    const failureSample = bodyText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 12)
      .join(' | ');

    throw new Error(
      [
        `${context} opened a blocking Qash dialog after Execute attempt.`,
        failureSample ? `Dialog/body sample: ${failureSample}.` : null,
        'This attempt cannot be counted as a cleared pending row.'
      ].filter(Boolean).join(' ')
    );
  }

  private async executePendingActionWithBoundedRetries(
    context: string,
    executeAction: () => Promise<void>,
    waitForProcessingComplete: () => Promise<void>
  ): Promise<void> {
    const maxAttempts = Math.max(
      3,
      Math.floor(resolvePositiveNumber(process.env.QASH_PENDING_EXECUTE_RETRY_ATTEMPTS, 3))
    );
    const retryDelayMs = resolvePositiveNumber(process.env.QASH_PENDING_EXECUTE_RETRY_DELAY_MS, 5_000);
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await executeAction();
        await waitForProcessingComplete();
        await this.assertNoPendingTransactionExecutionFailure(context);
        await this.assertNoBlockingDialogAfterPendingExecute(context);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Qash pending Execute attempt failed',
          data: {
            context,
            attempt,
            maxAttempts,
            error: lastError
          }
        });

        if (attempt >= maxAttempts) {
          await this.dismissBlockingDialogIfVisible();
          throw new Error(
            [
              `${context} failed after ${maxAttempts} Execute attempt(s).`,
              lastError ? `Last failure: ${lastError}` : null,
              'The final blocking dialog was dismissed after the last failed attempt.',
              'The pending gate remains blocked until Qash product/testnet state is reconciled or a supported cleanup path succeeds.'
            ].filter(Boolean).join(' ')
          );
        }

        await this.dismissBlockingDialogIfVisible();
        await this.page.waitForTimeout(retryDelayMs);
      }
    }
  }

  private pendingFaucetActionLocators(): Locator[] {
    return [
      ...qashPendingFaucetReceiveClaimLocators(this.page),
      ...qashPendingFaucetReceiveSignLocators(this.page),
      ...qashPendingFaucetReceiveExecuteLocators(this.page)
    ];
  }

  private pendingReceiveActionLocators(): Locator[] {
    return [
      ...qashPendingReceiveClaimLocators(this.page),
      ...qashPendingReceiveSignLocators(this.page),
      ...qashPendingReceiveExecuteLocators(this.page)
    ];
  }

  private async captureVisibleTransactionActionSnapshot(): Promise<{
    actions: string[];
    rowSummaries: string[];
    noPendingVisible: boolean;
    bodyTextSample: string;
  }> {
    return this.page.locator('body').evaluate(root => {
      const readVisibleText = (node: Element) => {
        if (node instanceof HTMLElement) return node.innerText;
        return node.textContent ?? '';
      };
      const normalize = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
      const text = normalize(readVisibleText(root));
      const controls = Array.from(root.querySelectorAll('button, [role="button"]'))
        .map(control => {
          const label = normalize(readVisibleText(control)) || normalize(control.getAttribute('aria-label'));
          const match = /^(Claim|Sign|Execute)$/i.exec(label);
          if (!match) return undefined;

          let summary = label;
          let node: Element | null = control;

          for (let depth = 0; depth < 8 && node; depth += 1) {
            const candidate = normalize(readVisibleText(node));
            if (candidate && /\bQASH\b/i.test(candidate)) {
              summary = candidate;
              break;
            }
            node = node.parentElement;
          }

          return {
            action: match[1] ?? label,
            summary: summary.slice(0, 300)
          };
        })
        .filter((control): control is { action: string; summary: string } => Boolean(control));

      return {
        actions: controls.map(control => control.action),
        rowSummaries: controls.map(control => control.summary),
        noPendingVisible: /no pending transactions|no receive transactions|no received transactions/i.test(text),
        bodyTextSample: text.slice(0, 2_000)
      };
    });
  }

  private async waitForTransactionsAccountSyncSettled(accountName: string): Promise<void> {
    const timeoutMs = resolvePositiveNumber(process.env.QASH_PENDING_ACCOUNT_SYNC_TIMEOUT_MS, 120_000);
    const settleMs = resolvePositiveNumber(process.env.QASH_PENDING_ACCOUNT_SETTLE_MS, 5_000);
    const intervalMs = resolvePositiveNumber(process.env.QASH_PENDING_ACCOUNT_SYNC_INTERVAL_MS, 2_000);
    const startedAt = Date.now();
    let stableStartedAt: number | undefined;
    let lastBodyTextSample = '';
    let attempt = 0;

    while (Date.now() - startedAt <= timeoutMs) {
      attempt += 1;
      await this.assertAuthenticatedSessionHealthy('waiting for Qash account sync before pending audit');
      const bodyText = await this.page.locator('body').innerText({ timeout: 15_000 });
      lastBodyTextSample = bodyText.slice(0, 2_000);
      const syncingVisible = /syncing wallet data/i.test(bodyText);

      if (!syncingVisible) {
        stableStartedAt ??= Date.now();
        if (Date.now() - stableStartedAt >= settleMs) {
          this.timeline.emit({
            category: 'app_ui',
            severity: 'info',
            source: this.config.name,
            message: 'Qash Transactions account sync settled before pending audit',
            data: {
              accountName,
              attempt,
              stableMs: Date.now() - stableStartedAt,
              settleMs
            }
          });
          return;
        }
      } else {
        stableStartedAt = undefined;
      }

      if (attempt === 1 || attempt % 5 === 0) {
        this.timeline.emit({
          category: 'app_ui',
          severity: 'info',
          source: this.config.name,
          message: 'Waiting for Qash Transactions account sync before pending audit',
          data: {
            accountName,
            attempt,
            syncingVisible,
            stableMs: stableStartedAt ? Date.now() - stableStartedAt : 0,
            settleMs
          }
        });
      }

      await this.page.waitForTimeout(intervalMs);
    }

    throw new Error(
      [
        `Qash Transactions account "${accountName}" did not finish syncing within ${timeoutMs}ms before pending audit.`,
        'The platform journey will not count pending transactions from a stale or still-syncing account view.',
        `Body sample: ${lastBodyTextSample}`
      ].join(' ')
    );
  }

  private async assertNoPendingTransactionExecutionFailure(context: string): Promise<void> {
    const bodyText = await this.page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
    const failureLine = bodyText
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(line => /failed to execute transaction|failed to execute proposal|guardian public key commitment mismatch/i.test(line));

    if (!failureLine) return;

    throw new Error(
      [
        `${context} failed in Qash UI.`,
        `Failure: ${failureLine}.`,
        'This pending row cannot be treated as cleared; it usually needs a compatible signer/profile or product-side cleanup.'
      ].join(' ')
    );
  }

  private async clickRenderedCreateAccountControl(): Promise<boolean> {
    const clicked = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(candidate => {
        const text = candidate.textContent?.trim().replace(/\s+/g, ' ') ?? '';
        const ariaLabel = candidate.getAttribute('aria-label') ?? '';
        const rect = candidate.getBoundingClientRect();
        return (
          /Create new account|Create account/i.test(`${ariaLabel} ${text}`) &&
          rect.width > 0 &&
          rect.height > 0
        );
      });

      if (!button) return false;
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return true;
    });

    if (clicked) {
      this.timeline.emit({
        category: 'app_ui',
        severity: 'info',
        source: this.config.name,
        message: 'Clicked Qash rendered Create account control'
      });
    }

    return clicked;
  }

  async openPayroll(): Promise<void> {
    await this.navigateToSection('Payroll');
    await this.assertPayrollReady();
  }

  async assertPayrollReady(): Promise<void> {
    await this.assertAuthenticatedShellReady();
    for (const locator of qashPayrollReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async startNewPayroll(): Promise<void> {
    await this.clickFirstVisible('Qash New payroll control', qashPayrollNewStartLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertNewPayrollFormReady(): Promise<void> {
    await this.page.waitForURL(url => /\/payroll\/create\/?$/.test(url.pathname), { timeout: 15_000 });
    for (const locator of qashPayrollFormReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async fillPayrollDetails(payroll: QashPayrollDetails): Promise<void> {
    if (payroll.networkName) {
      await this.selectDropdownOption(
        'Qash payroll network',
        qashPayrollNetworkSelectLocators(this.page),
        qashPayrollNetworkOptionLocators(this.page, payroll.networkName)
      );
    }

    if (payroll.tokenName) {
      await this.selectDropdownOption(
        'Qash payroll token',
        qashPayrollTokenSelectLocators(this.page),
        qashPayrollTokenOptionLocators(this.page, payroll.tokenName)
      );
    }

    await this.selectDropdownOption(
      'Qash payroll employee',
      qashPayrollEmployeeSelectLocators(this.page),
      qashPayrollEmployeeOptionLocators(this.page, payroll.employeeName)
    );

    await this.fillFirstVisible(
      'Qash payroll wallet address',
      qashPayrollWalletAddressInputLocators(this.page),
      payroll.walletAddress
    );
    await this.fillFirstVisible(
      'Qash payroll duration',
      qashPayrollDurationInputLocators(this.page),
      payroll.durationMonths
    );
    await this.fillFirstVisible(
      'Qash payroll monthly amount',
      qashPayrollMonthlyAmountInputLocators(this.page),
      payroll.monthlyAmount
    );
    await this.clickFirstVisible(
      `Qash payroll scheduled pay day ${payroll.scheduledPayDay}`,
      qashPayrollScheduledPayDayLocators(this.page, payroll.scheduledPayDay)
    );
    await this.fillFirstVisible(
      'Qash payroll item description',
      qashPayrollItemDescriptionInputLocators(this.page),
      payroll.itemDescription
    );

    if (payroll.note) {
      await this.fillFirstVisible('Qash payroll note', qashPayrollNoteInputLocators(this.page), payroll.note);
    }
  }

  async assertPayrollReadyToSubmit(): Promise<void> {
    const [createAction] = qashPayrollCreateActionLocators(this.page);
    if (!createAction) throw new Error('Qash payroll Create now action has no configured locators.');
    await expect(createAction.first()).toBeEnabled({ timeout: 10_000 });
  }

  async submitPayrollCreate(): Promise<void> {
    await this.clickFirstVisible('Qash Create now payroll control', qashPayrollCreateActionLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertPayrollReviewReady(payroll: QashPayrollDetails): Promise<void> {
    for (const locator of qashPayrollReviewReadyLocators(this.page, payroll)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async confirmPayrollCreate(): Promise<void> {
    await this.clickFirstVisible('Qash payroll confirmation control', qashPayrollConfirmActionLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertPayrollCreated(payroll: QashPayrollDetails): Promise<void> {
    await this.waitForPendingTransactionProcessingComplete(180_000);
    await this.page.waitForURL(url => /\/payroll\/?$/.test(url.pathname), { timeout: 60_000 }).catch(() => undefined);
    await this.assertPayrollReady();
    for (const locator of qashPayrollCreatedOverviewLocators(this.page, payroll)) {
      await expect(locator.first()).toBeVisible({ timeout: 30_000 });
    }
  }

  async assertPayrollTransactionState(payroll: QashPayrollDetails): Promise<void> {
    await this.waitForPendingTransactionProcessingComplete(180_000);
    await this.expectAnyReadySignal(qashPayrollTransactionStateLocators(this.page, payroll));
  }

  async completeVisiblePendingTransaction(): Promise<'none' | 'pending' | 'signed' | 'executed'> {
    await this.openTransactionsPendingTab();

    let state: 'none' | 'pending' | 'signed' | 'executed' = 'none';

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      if (await this.page.getByText(/no pending transactions/i).first().isVisible({ timeout: 1_000 }).catch(() => false)) {
        return state;
      }

      if (await this.isAnyLocatorVisible(qashPendingTransactionSignLocators(this.page), 1_000)) {
        await this.clickFirstVisible('Qash pending transaction Sign control', qashPendingTransactionSignLocators(this.page));
        await this.waitForPendingTransactionProcessingComplete(180_000);
        state = 'signed';
        continue;
      }

      if (await this.isAnyLocatorVisible(qashPendingTransactionExecuteLocators(this.page), 1_000)) {
        await this.clickFirstVisible(
          'Qash pending transaction Execute control',
          qashPendingTransactionExecuteLocators(this.page)
        );
        await this.waitForPendingTransactionProcessingComplete(180_000);
        state = 'executed';
        break;
      }

      await this.page.waitForTimeout(2_000);
    }

    return state;
  }

  async openInvoice(): Promise<void> {
    await this.navigateToSection('Invoice');
    await this.assertInvoiceReady();
  }

  async assertInvoiceReady(): Promise<void> {
    await this.assertAuthenticatedShellReady();
    for (const locator of qashInvoiceReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
    await this.expectAnyReadySignal(qashInvoiceStateLocators(this.page));
  }

  async assertInvoiceCreateAvailable(): Promise<void> {
    await this.expectAnyReadySignal(qashInvoiceCreateStartLocators(this.page));
  }

  async startCreateInvoice(): Promise<void> {
    await this.clickFirstVisible('Qash Create invoice control', qashInvoiceCreateStartLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertCreateInvoiceFormReady(): Promise<void> {
    await this.page.waitForURL(url => /\/invoices?\/create\/?$/.test(url.pathname), { timeout: 15_000 }).catch(() => undefined);
    for (const locator of qashInvoiceFormReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async fillInvoiceDetails(invoice: QashInvoiceDetails): Promise<void> {
    await this.advanceInvoiceWizard('Qash invoice company info Next control');
    await this.assertInvoiceRecipientFormReady();
    await this.selectInvoiceClient(invoice.clientName);
    await expect(this.page.getByPlaceholder(/^Select contact$/i).first()).toHaveValue(invoice.clientName, {
      timeout: 10_000
    });
    await expect(this.page.getByPlaceholder(/qashcompany@gmail\.com/i).first()).toHaveValue(/.+@.+/, {
      timeout: 10_000
    });

    await this.advanceInvoiceWizard('Qash invoice recipient Next control');
    await this.assertInvoiceDetailsFormReady();

    if (invoice.networkName) {
      await this.selectDropdownOption(
        'Qash invoice network',
        qashInvoiceNetworkSelectLocators(this.page),
        qashInvoiceNetworkOptionLocators(this.page, invoice.networkName)
      );
    }

    if (invoice.tokenName) {
      await this.selectDropdownOption(
        'Qash invoice token',
        qashInvoiceTokenSelectLocators(this.page),
        qashInvoiceTokenOptionLocators(this.page, invoice.tokenName)
      );
    }

    await this.setInvoiceDueDate(invoice.dueDay);
    await this.tryFillFirstVisible(
      'Qash invoice wallet address',
      qashInvoiceWalletAddressInputLocators(this.page),
      invoice.walletAddress
    );
    await this.clickFirstVisible('Qash invoice Add item control', qashInvoiceAddItemActionLocators(this.page));
    await this.fillFirstVisible('Qash invoice amount', qashInvoiceAmountInputLocators(this.page), invoice.amount);
    await this.fillFirstVisible(
      'Qash invoice item description',
      qashInvoiceItemDescriptionInputLocators(this.page),
      invoice.itemDescription
    );

    if (invoice.note) {
      await this.tryFillFirstVisible('Qash invoice note', qashInvoiceNoteInputLocators(this.page), invoice.note);
    }
  }

  async assertInvoiceReadyToSubmit(invoice: QashInvoiceDetails): Promise<void> {
    await this.assertInvoiceDetailsFormReady();
    await expect(this.page.getByPlaceholder(/^Select contact$/i).first()).toBeHidden({ timeout: 1_000 }).catch(
      () => undefined
    );
    await expect(this.page.getByText(/^Invoice details$/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByText(invoice.amount).first()).toBeVisible({ timeout: 10_000 });
  }

  async submitInvoiceCreate(): Promise<void> {
    await this.clickFirstVisible('Qash Create now invoice control', qashInvoiceCreateActionLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    if (await this.isAnyLocatorVisible(qashInvoicePaymentDetailsReadyLocators(this.page), 3_000)) {
      await this.clickFirstVisible('Qash invoice receiving account', qashInvoicePaymentAccountOptionLocators(this.page));
      await this.clickFirstVisible('Qash invoice payment details Next control', qashInvoiceCreateActionLocators(this.page));
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    }
  }

  async assertInvoiceReviewReady(invoice: QashInvoiceDetails): Promise<void> {
    for (const locator of qashInvoiceReviewReadyLocators(this.page, invoice)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async confirmInvoiceCreate(): Promise<void> {
    await this.installInvoiceSubmitProbe();
    await this.emitInvoiceSubmitProbe('before_send_invoice_click');

    try {
      await this.clickInvoiceSendInvoiceButton();
    } catch (error) {
      await this.emitInvoiceSubmitProbe('after_failed_send_invoice_click');
      throw error;
    }
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    await this.page.waitForTimeout(2_000);
    await this.emitInvoiceSubmitProbe('after_send_invoice_click');
  }

  async assertInvoiceCreated(invoice: QashInvoiceDetails): Promise<void> {
    await this.waitForPendingTransactionProcessingComplete(180_000);
    if (await this.assertInvoiceCreatedSuccessPageIfVisible(invoice)) return;

    const pathname = new URL(this.page.url()).pathname;
    if (/\/invoices?\/create\/?$/.test(pathname)) {
      const successHeading = qashInvoiceCreatedSuccessLocators(this.page, invoice)[0];
      await successHeading?.first().waitFor({ state: 'visible', timeout: 45_000 }).catch(() => undefined);
      if (await this.assertInvoiceCreatedSuccessPageIfVisible(invoice)) return;
      await this.emitInvoiceSubmitProbe('invoice_create_route_without_success');
      throw new Error('Qash Invoice creation stayed on the create route without showing the success page.');
    }

    if (!/\/invoices?(?:\/|$)/.test(pathname)) {
      this.timeline.emit({
        category: 'app_ui',
        severity: 'warn',
        source: this.config.name,
        message: 'Qash returned outside Invoice after submit; opening Invoice tab to verify created invoice',
        data: { url: this.page.url() }
      });
      await this.openInvoice();
    }

    await this.assertCreatedInvoiceEvidence(invoice);
  }

  async viewCreatedInvoiceForVerification(invoice: QashInvoiceDetails, durationMs = 3_000): Promise<void> {
    if (await this.isAnyLocatorVisible(qashInvoiceCreatedSuccessLocators(this.page, invoice), 1_000)) {
      await this.clickFirstVisible('Qash View invoice control', qashInvoiceViewCreatedActionLocators(this.page));
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    } else if (!/\/invoices?(?:\/|$)/.test(new URL(this.page.url()).pathname)) {
      await this.openInvoice();
    }

    await this.assertCreatedInvoiceEvidence(invoice);

    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Qash created invoice viewed before continuing',
      data: {
        url: this.page.url(),
        clientName: invoice.clientName,
        itemDescription: invoice.itemDescription,
        amount: invoice.amount,
        durationMs
      }
    });
    await this.page.waitForTimeout(durationMs);
  }

  async returnToInvoiceDashboardAfterVerification(invoice: QashInvoiceDetails, durationMs = 2_000): Promise<void> {
    await this.dismissInvoicePreviewIfVisible();
    await this.page.goto(new URL('/invoice', this.page.url()).toString(), { waitUntil: 'domcontentloaded' });
    await this.assertInvoiceReady();
    await this.assertCreatedInvoiceEvidence(invoice);
    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Qash returned to Invoice dashboard with created invoice visible',
      data: {
        url: this.page.url(),
        clientName: invoice.clientName,
        amount: invoice.amount,
        durationMs
      }
    });
    await this.page.waitForTimeout(durationMs);
  }

  async openBills(): Promise<void> {
    await this.navigateToSection('Bills');
    await this.assertBillsReady();
  }

  async assertBillsReady(): Promise<void> {
    await this.assertAuthenticatedShellReady();
    for (const locator of qashBillsReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
    await this.expectAnyReadySignal(qashBillsStateLocators(this.page));
  }

  async openPaymentLinks(): Promise<void> {
    await this.navigateToSection('Payment Link');
    await this.assertPaymentLinksReady();
  }

  async assertPaymentLinksReady(): Promise<void> {
    await this.assertAuthenticatedShellReady();
    for (const locator of qashPaymentLinksReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
    await this.expectAnyReadySignal(qashPaymentLinksStateLocators(this.page));
  }

  async assertPaymentLinkCreateAvailable(): Promise<void> {
    await this.expectAnyReadySignal(qashPaymentLinkCreateStartLocators(this.page));
  }

  async startCreatePaymentLink(): Promise<void> {
    await this.clickFirstVisible('Qash Create payment link control', qashPaymentLinkCreateStartLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertCreatePaymentLinkFormReady(): Promise<void> {
    await this.page.waitForURL(url => /\/payment-links?\/create\/?$/.test(url.pathname), { timeout: 15_000 }).catch(
      () => undefined
    );
    await this.expectAnyReadySignal(qashPaymentLinkFormReadyLocators(this.page));
    await this.expectAnyReadySignal(qashPaymentLinkTitleInputLocators(this.page));
    await this.expectAnyReadySignal(qashPaymentLinkAmountInputLocators(this.page));
  }

  async fillPaymentLinkDetails(paymentLink: QashPaymentLinkDetails): Promise<void> {
    if (paymentLink.networkName) {
      await this.expectAnyReadySignal(qashPaymentLinkNetworkReadyLocators(this.page, paymentLink.networkName));
    }

    await this.selectPaymentLinkAccount(paymentLink.accountName);

    if (paymentLink.tokenName) {
      await this.selectDropdownOption(
        'Qash payment link token',
        qashPaymentLinkTokenSelectLocators(this.page),
        qashPaymentLinkTokenOptionLocators(this.page, paymentLink.tokenName)
      );
    }

    await this.fillFirstVisible('Qash payment link title', qashPaymentLinkTitleInputLocators(this.page), paymentLink.title);
    await this.fillFirstVisible(
      'Qash payment link amount',
      qashPaymentLinkAmountInputLocators(this.page),
      paymentLink.amount
    );

    if (paymentLink.description) {
      await this.tryFillFirstVisible(
        'Qash payment link description',
        qashPaymentLinkDescriptionInputLocators(this.page),
        paymentLink.description
      );
    }
  }

  async assertPaymentLinkReadyToSubmit(paymentLink: QashPaymentLinkDetails): Promise<void> {
    await this.assertCreatePaymentLinkFormReady();
    await expect(this.page.getByText(paymentLink.title, { exact: true }).first()).toBeVisible({ timeout: 10_000 }).catch(
      () => undefined
    );
    const errors: string[] = [];
    for (const locator of qashPaymentLinkCreateActionLocators(this.page)) {
      try {
        await expect(locator.first()).toBeEnabled({ timeout: 2_000 });
        return;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    throw new Error(`Qash payment link create action was not enabled. Errors: ${errors.slice(0, 3).join(' | ')}`);
  }

  async submitPaymentLinkCreate(paymentLink?: QashPaymentLinkDetails): Promise<void> {
    this.pendingPaymentLinkCreateResponse = this.waitForPaymentLinkCreateResponse(paymentLink);
    await this.clickFirstVisible('Qash Create payment link submit control', qashPaymentLinkCreateActionLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertPaymentLinkCreated(paymentLink: QashPaymentLinkDetails): Promise<void> {
    await this.waitForPendingTransactionProcessingComplete(180_000);
    await this.page.waitForURL(url => /\/payment-links?\/?$/.test(url.pathname), { timeout: 60_000 }).catch(
      () => undefined
    );
    await this.assertPaymentLinksReady();
    await this.expectAnyReadySignal(qashPaymentLinkCreatedOverviewLocators(this.page, paymentLink));
  }

  async extractPaymentLinkUrl(paymentLink: QashPaymentLinkDetails): Promise<string> {
    const created = await this.pendingPaymentLinkCreateResponse;
    if (created?.paymentUrl) {
      return this.emitPaymentLinkUrlExtracted(created.paymentUrl, paymentLink, created);
    }

    const apiListUrl = await this.fetchPaymentLinkUrlFromApiList(paymentLink).catch(error => {
      this.timeline.emit({
        category: 'app_ui',
        severity: 'warn',
        source: this.config.name,
        message: 'Qash Payment Link URL was not found from authenticated API list',
        data: {
          title: paymentLink.title,
          amount: paymentLink.amount,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return undefined;
    });
    if (apiListUrl) {
      return this.emitPaymentLinkUrlExtracted(apiListUrl, paymentLink, {
        paymentUrl: apiListUrl,
        capturedAt: new Date().toISOString(),
        source: 'api-list'
      });
    }

    await this.assertPaymentLinksReady();
    const bodyText = await this.page.locator('body').innerText({ timeout: 15_000 });
    const paymentUrl = extractPaymentLinkUrlFromText(bodyText, paymentLink);

    if (!paymentUrl) {
      throw new Error(
        `Qash Payment Link URL was not found for "${paymentLink.title}" (${paymentLink.amount} QASH). ` +
          'The created row must expose a /payment/<code> link before actor-to-actor settlement can continue.'
      );
    }

    return this.emitPaymentLinkUrlExtracted(paymentUrl, paymentLink);
  }

  private emitPaymentLinkUrlExtracted(
    paymentUrl: string,
    paymentLink: QashPaymentLinkDetails,
    sourceInfo?: QashCreatedPaymentLinkInfo
  ): string {
    const normalizedUrl = normalizePaymentLinkUrl(paymentUrl);
    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Qash Payment Link URL extracted',
      data: {
        title: paymentLink.title,
        amount: paymentLink.amount,
        paymentUrl: normalizedUrl,
        source: sourceInfo?.source ?? 'ui-text',
        responseUrl: sourceInfo?.responseUrl,
        responseStatus: sourceInfo?.responseStatus,
        code: sourceInfo?.code
      }
    });
    return normalizedUrl;
  }

  async openPublicPaymentLink(paymentUrl: string, paymentLink: QashPaymentLinkDetails): Promise<void> {
    const normalizedUrl = normalizePaymentLinkUrl(paymentUrl);
    const response = await this.page.goto(normalizedUrl, { waitUntil: 'domcontentloaded' });
    const status = response?.status() ?? 0;
    if (status >= 400) {
      this.timeline.emit({
        category: 'app_availability',
        severity: 'warn',
        source: this.config.name,
        message: `Qash public Payment Link route returned HTTP ${status}; hydrated readiness will determine usability`,
        data: { paymentUrl: normalizedUrl, status }
      });
    }
    await this.assertPublicPaymentLinkReady(paymentLink);
  }

  async assertPublicPaymentLinkReady(paymentLink: QashPaymentLinkDetails): Promise<void> {
    await this.expectAnyReadySignal(qashPublicPaymentLinkReadyLocators(this.page, paymentLink));
  }

  async connectPublicPaymentLinkWallet(): Promise<void> {
    await this.emitPublicPaymentLinkWalletBridgeProbe('before-connect-wallet-click');
    await this.clickFirstVisible(
      'Qash public Payment Link Connect Wallet control',
      qashPublicPaymentLinkConnectWalletLocators(this.page)
    );
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    await this.emitPublicPaymentLinkWalletBridgeProbe('after-connect-wallet-click');

    const walletOptionLocators = qashPublicPaymentLinkWalletOptionLocators(this.page);
    const walletOptionVisible = await this.isAnyLocatorVisible(walletOptionLocators, 15_000);
    const walletModalVisible = await this.page
      .getByText(/^Connect (?:a )?Wallet$/i)
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);

    if (walletOptionVisible || walletModalVisible) {
      await this.clickPublicPaymentLinkMidenWalletOption();
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
      await this.emitPublicPaymentLinkWalletBridgeProbe('after-miden-wallet-option-click');
      return;
    }

    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Qash public Payment Link did not show a wallet adapter modal after Connect Wallet; waiting for direct wallet confirmation'
    });
  }

  async connectPublicPaymentLinkSocialAccount(): Promise<void> {
    await this.clickFirstVisible(
      'Qash public Payment Link Connect Wallet control',
      qashPublicPaymentLinkConnectWalletLocators(this.page)
    );
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);

    await this.clickFirstVisible(
      'Qash public Payment Link Social Account option',
      qashPublicPaymentLinkSocialAccountOptionLocators(this.page)
    );
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    await this.page.waitForTimeout(1_000);
    await this.assertSocialAccountDidNotRouteToMidenWalletRequirement();

    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Qash public Payment Link Social Account option clicked',
      data: {
        url: this.page.url(),
        bodyText: (await this.page.locator('body').innerText({ timeout: 2_000 }).catch(() => '')).slice(0, 2_000)
      }
    });
  }

  private async assertSocialAccountDidNotRouteToMidenWalletRequirement(): Promise<void> {
    const installPromptVisible = await this.isAnyLocatorVisible(
      qashPublicPaymentLinkWalletInstallPromptLocators(this.page),
      2_000
    );
    const bodyText = await this.page.locator('body').innerText({ timeout: 2_000 }).catch(() => '');
    if (installPromptVisible) {
      this.timeline.emit({
        category: 'app_ui',
        severity: 'error',
        source: this.config.name,
        message: 'Qash public Payment Link Social Account routed to Miden wallet install prompt',
        data: {
          url: this.page.url(),
          bodyText: bodyText.slice(0, 2_000)
        }
      });
      throw new Error(
        [
          'Qash public Payment Link Social Account did not provide a Qash/Para-funded payment path.',
          'After selecting Social Account, the page showed the Miden Wallet install prompt ("Discover Miden").',
          'This workaround is not viable unless Qash changes the Social Account route or the browser has a usable Miden wallet extension.'
        ].join(' ')
      );
    }

    const midenWalletOptionVisible = await this.isAnyLocatorVisible(
      qashPublicPaymentLinkWalletOptionLocators(this.page),
      2_000
    );
    if (!midenWalletOptionVisible) return;

    this.timeline.emit({
      category: 'app_ui',
      severity: 'error',
      source: this.config.name,
      message: 'Qash public Payment Link Social Account routed back to Miden wallet selection',
      data: {
        url: this.page.url(),
        bodyText: bodyText.slice(0, 2_000)
      }
    });
    throw new Error(
      [
        'Qash public Payment Link Social Account did not provide a Qash/Para-funded payment path.',
        'After selecting Social Account, the page returned to a Miden Wallet selection prompt.',
        'This workaround is not viable unless Qash changes the Social Account route to complete payment without the Miden wallet payer path.'
      ].join(' ')
    );
  }

  private async clickPublicPaymentLinkMidenWalletOption(): Promise<void> {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const option = await this.findVisiblePublicPaymentLinkMidenWalletOption();
      if (!option) {
        if (attempt === 1) break;
        return;
      }

      const buttonText = await option.innerText({ timeout: 1_000 }).catch(() => '');
      const pagesBeforeClick = new Set(this.page.context().pages());
      await option.click({ timeout: 30_000 });
      this.timeline.emit({
        category: 'app_ui',
        severity: 'info',
        source: this.config.name,
        message: 'Qash public Payment Link Miden wallet option clicked',
        data: { attempt, text: buttonText }
      });

      await this.page.waitForTimeout(750);
      if (this.hasNewWalletConfirmationPage(pagesBeforeClick)) return;

      const nextOption = await this.findVisiblePublicPaymentLinkMidenWalletOption(1_000);
      if (!nextOption) return;

      this.timeline.emit({
        category: 'app_ui',
        severity: 'info',
        source: this.config.name,
        message: 'Qash public Payment Link wallet picker still requires another Miden Wallet selection',
        data: {
          attempt,
          nextText: await nextOption.innerText({ timeout: 1_000 }).catch(() => '')
        }
      });
    }

    throw new Error(
      'Qash public Payment Link wallet adapter modal stayed open after repeated exact Miden Wallet selections.'
    );
  }

  private async findVisiblePublicPaymentLinkMidenWalletOption(timeoutMs = 5_000): Promise<Locator | undefined> {
    const walletOptionLocators = qashPublicPaymentLinkWalletOptionLocators(this.page);

    for (const locator of walletOptionLocators) {
      const option = locator.first();
      if (!(await option.isVisible({ timeout: timeoutMs }).catch(() => false))) continue;

      const buttonText = await option.innerText({ timeout: 1_000 }).catch(() => '');
      if (/Social Account/i.test(buttonText)) {
        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Skipping broad Qash public Payment Link wallet option candidate',
          data: { text: buttonText }
        });
        continue;
      }

      return option;
    }

    return undefined;
  }

  private hasNewWalletConfirmationPage(pagesBeforeClick: Set<Page>): boolean {
    return this.page.context().pages().some(page => {
      if (pagesBeforeClick.has(page)) return false;
      const url = page.url();
      return url.startsWith('chrome-extension://') && !url.includes('fullpage.html');
    });
  }

  private async emitPublicPaymentLinkWalletBridgeProbe(stage: string): Promise<void> {
    const probe = await this.page.evaluate(async () => {
      const wallet = (window as any).midenWallet;
      if (!wallet) {
        return {
          injected: false,
          available: null,
          ownKeys: [],
          methodNames: []
        };
      }

      const prototype = Object.getPrototypeOf(wallet);
      const methodNames = Array.from(
        new Set([
          ...Object.keys(wallet),
          ...(prototype ? Object.getOwnPropertyNames(prototype) : [])
        ])
      )
        .filter(name => name !== 'constructor' && typeof wallet[name] === 'function')
        .sort();

      let available: boolean | null = null;
      let error: string | undefined;

      if (typeof wallet.isAvailable === 'function') {
        try {
          const result = await Promise.race([
            wallet.isAvailable(),
            new Promise(resolve => setTimeout(() => resolve('__timeout__'), 1_500))
          ]);
          if (result === '__timeout__') {
            available = false;
            error = 'midenWallet.isAvailable timed out';
          } else {
            available = result === true;
          }
        } catch (probeError) {
          available = false;
          error = probeError instanceof Error ? probeError.message : String(probeError);
        }
      } else {
        available = false;
        error = 'midenWallet.isAvailable is not a function';
      }

      return {
        injected: true,
        available,
        error,
        ownKeys: Object.keys(wallet).sort(),
        methodNames,
        address: typeof wallet.address === 'string' ? wallet.address : null,
        network: wallet.network ?? null
      };
    }).catch(error => ({
      injected: false,
      available: false,
      error: error instanceof Error ? error.message : String(error),
      ownKeys: [],
      methodNames: []
    }));

    this.timeline.emit({
      category: 'dapp_bridge',
      severity: probe.injected && probe.available === true ? 'info' : 'warn',
      source: this.config.name,
      message: 'Qash public Payment Link wallet bridge probe',
      data: { stage, ...probe }
    });
  }

  async assertPublicPaymentLinkWalletConnected(expectedWalletAddress?: string): Promise<void> {
    const walletState = await this.page
      .waitForFunction(
        () => {
          const wallet = (window as Window & { midenWallet?: { address?: unknown; network?: unknown } }).midenWallet;
          const address = typeof wallet?.address === 'string' ? wallet.address : '';
          if (!address) return false;
          return {
            address,
            network: typeof wallet?.network === 'string' ? wallet.network : null
          };
        },
        { timeout: 90_000 }
      )
      .then(handle => handle.jsonValue() as Promise<{ address: string; network?: string | null }>);

    if (expectedWalletAddress && walletState.address !== expectedWalletAddress) {
      throw new Error(
        `Qash public Payment Link connected wallet ${walletState.address}, expected ${expectedWalletAddress}.`
      );
    }

    this.timeline.emit({
      category: 'dapp_bridge',
      severity: 'info',
      source: this.config.name,
      message: 'Qash public Payment Link wallet connected',
      data: walletState
    });
  }

  async submitPublicPaymentLinkPayment(
    paymentUrl: string,
    paymentLink: QashPaymentLinkDetails,
    options: { payerWalletAddress?: string; timeoutMs?: number; expectedNoteType?: 'public' | 'private' } = {}
  ): Promise<QashPaymentLinkPaymentResult> {
    const code = extractPaymentLinkCode(paymentUrl);
    const expectedNoteType = options.expectedNoteType ?? resolvePaymentLinkNoteType();
    await this.installPublicPaymentLinkNoteGuard(expectedNoteType);
    const timeoutMs = options.timeoutMs ?? resolvePositiveNumber(
      process.env.QASH_STRESS_MONEY_MOVEMENT_PAYMENT_TIMEOUT_MS || process.env.QASH_MONEY_MOVEMENT_PAYMENT_TIMEOUT_MS,
      300_000
    );
    const responsePromise = this.page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        isQashPaymentLinkPayResponseUrl(response.url(), code) &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: timeoutMs }
    );

    await this.clickFirstVisible('Qash public Payment Link Pay now control', qashPublicPaymentLinkPayActionLocators(this.page));
    const response = await responsePromise;
    const responseText = await response.text().catch(() => '');
    const responseBody = parseJsonIfPossible(responseText);
    const txid = extractTxidFromUnknown(responseBody) ?? extractTxidFromUnknown(responseText);

    await this.expectAnyReadySignal(qashPublicPaymentLinkSuccessLocators(this.page, paymentLink));
    const noteProbe = await this.readPublicPaymentLinkNoteProbe();
    const lastNoteRequest = noteProbe?.requests.at(-1);

    if (!lastNoteRequest) {
      throw new Error(
        [
          'Qash public Payment Link pay completed, but the harness did not observe a Miden wallet send request note type.',
          `Expected note type: ${expectedNoteType}.`,
          'Do not claim receiver note proof until the payer transaction is verified as public-note mode.'
        ].join(' ')
      );
    }

    if (lastNoteRequest.afterNoteType?.toLowerCase() !== expectedNoteType) {
      throw new Error(
        `Qash public Payment Link requested note type ${lastNoteRequest.afterNoteType ?? 'unknown'}, expected ${expectedNoteType}.`
      );
    }

    const result: QashPaymentLinkPaymentResult = {
      paymentUrl: normalizePaymentLinkUrl(paymentUrl),
      code,
      requestedNoteType: lastNoteRequest.beforeNoteType,
      enforcedNoteType: lastNoteRequest.afterNoteType,
      noteProbe,
      responseStatus: response.status(),
      responseUrl: response.url()
    };
    if (options.payerWalletAddress) result.payerWalletAddress = options.payerWalletAddress;
    if (responseText) result.responseBody = responseBody;
    if (txid) result.txid = txid;

    this.timeline.emit({
      category: 'network_request',
      severity: 'info',
      source: this.config.name,
      message: 'Qash public Payment Link pay mutation completed',
      data: result as unknown as Record<string, unknown>
    });
    return result;
  }

  async submitPublicPaymentLinkSocialPayment(
    paymentUrl: string,
    paymentLink: QashPaymentLinkDetails,
    options: { timeoutMs?: number } = {}
  ): Promise<QashPaymentLinkSocialPaymentResult> {
    const code = extractPaymentLinkCode(paymentUrl);
    const timeoutMs = options.timeoutMs ?? resolvePositiveNumber(
      process.env.QASH_ACTOR_A_SOCIAL_PAYMENT_TIMEOUT_MS ||
        process.env.QASH_STRESS_MONEY_MOVEMENT_PAYMENT_TIMEOUT_MS ||
        process.env.QASH_MONEY_MOVEMENT_PAYMENT_TIMEOUT_MS,
      300_000
    );
    const responsePromise = this.page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        isQashPaymentLinkPayResponseUrl(response.url(), code) &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: timeoutMs }
    );

    await this.clickFirstVisible('Qash public Payment Link Pay now control', qashPublicPaymentLinkPayActionLocators(this.page));
    const response = await responsePromise;
    const responseText = await response.text().catch(() => '');
    const responseBody = parseJsonIfPossible(responseText);
    const txid = extractTxidFromUnknown(responseBody) ?? extractTxidFromUnknown(responseText);

    await this.expectAnyReadySignal(qashPublicPaymentLinkSuccessLocators(this.page, paymentLink));

    const result: QashPaymentLinkSocialPaymentResult = {
      paymentUrl: normalizePaymentLinkUrl(paymentUrl),
      code,
      responseStatus: response.status(),
      responseUrl: response.url()
    };
    if (responseText) result.responseBody = responseBody;
    if (txid) result.txid = txid;

    this.timeline.emit({
      category: 'network_request',
      severity: 'info',
      source: this.config.name,
      message: 'Qash public Payment Link Social Account pay mutation completed',
      data: result as unknown as Record<string, unknown>
    });
    return result;
  }

  private async installPublicPaymentLinkNoteGuard(expectedNoteType: 'public' | 'private'): Promise<void> {
    await this.page.evaluate((expectedNoteTypeValue) => {
      const win = window as Window & {
        midenWallet?: Record<string, unknown>;
        __qashPaymentLinkNoteProbe?: QashPaymentLinkNoteProbe;
        __qashPaymentLinkNoteGuardInterval?: ReturnType<typeof setInterval> | undefined;
      };

      const probe: QashPaymentLinkNoteProbe = win.__qashPaymentLinkNoteProbe ?? {
        expectedNoteType: expectedNoteTypeValue,
        patchInstalled: false,
        requests: []
      };
      probe.expectedNoteType = expectedNoteTypeValue;
      win.__qashPaymentLinkNoteProbe = probe;

      const normalizeTransaction = (transaction: unknown, method: string): unknown => {
        if (!transaction || typeof transaction !== 'object') return transaction;
        const mutable = transaction as Record<string, unknown>;
        const before = typeof mutable.noteType === 'string' ? mutable.noteType : undefined;
        if (before?.toLowerCase() !== expectedNoteTypeValue) {
          mutable.noteType = expectedNoteTypeValue;
        }
        const after = typeof mutable.noteType === 'string' ? mutable.noteType : undefined;
        probe.requests.push({
          method,
          beforeNoteType: before,
          afterNoteType: after,
          forced: before?.toLowerCase() !== expectedNoteTypeValue,
          keys: Object.keys(mutable).sort(),
          at: new Date().toISOString()
        });
        return transaction;
      };

      const maybeNormalizeRequestArgument = (argument: unknown, method: string): unknown => {
        if (!argument || typeof argument !== 'object') return argument;
        const mutable = argument as Record<string, unknown>;
        if (mutable.transaction) {
          mutable.transaction = normalizeTransaction(mutable.transaction, method);
          return argument;
        }
        const params = mutable.params;
        if (params && typeof params === 'object' && (params as Record<string, unknown>).transaction) {
          (params as Record<string, unknown>).transaction = normalizeTransaction(
            (params as Record<string, unknown>).transaction,
            method
          );
        }
        return argument;
      };

      const patchWallet = (): boolean => {
        const wallet = win.midenWallet as (Record<string, unknown> & { __qashPaymentLinkNoteGuardPatched?: boolean }) | undefined;
        if (!wallet || wallet.__qashPaymentLinkNoteGuardPatched) return Boolean(wallet);

        for (const methodName of ['requestSend', 'sendTransaction'] as const) {
          const original = wallet[methodName];
          if (typeof original !== 'function') continue;
          wallet[methodName] = function (this: unknown, transaction: unknown, ...rest: unknown[]) {
            return Reflect.apply(original, this, [normalizeTransaction(transaction, methodName), ...rest]);
          };
        }

        const originalRequest = wallet.request;
        if (typeof originalRequest === 'function') {
          wallet.request = function (this: unknown, ...args: unknown[]) {
            return Reflect.apply(
              originalRequest,
              this,
              args.map((arg, index) => maybeNormalizeRequestArgument(arg, `request:${index}`))
            );
          };
        }

        wallet.__qashPaymentLinkNoteGuardPatched = true;
        probe.patchInstalled = true;
        return true;
      };

      if (win.__qashPaymentLinkNoteGuardInterval) {
        clearInterval(win.__qashPaymentLinkNoteGuardInterval);
      }

      if (!patchWallet()) {
        win.__qashPaymentLinkNoteGuardInterval = setInterval(() => {
          if (patchWallet() && win.__qashPaymentLinkNoteGuardInterval) {
            clearInterval(win.__qashPaymentLinkNoteGuardInterval);
            win.__qashPaymentLinkNoteGuardInterval = undefined;
          }
        }, 250);
      }
    }, expectedNoteType);
  }

  private async readPublicPaymentLinkNoteProbe(): Promise<QashPaymentLinkNoteProbe | undefined> {
    return this.page.evaluate(() => {
      const win = window as Window & { __qashPaymentLinkNoteProbe?: QashPaymentLinkNoteProbe };
      return win.__qashPaymentLinkNoteProbe;
    }).catch(() => undefined);
  }

  async openTransactions(): Promise<void> {
    await this.navigateToSection('Transactions');
    await this.assertTransactionsReady();
  }

  async assertTransactionsReady(): Promise<void> {
    await this.assertAuthenticatedShellReady();
    for (const locator of qashTransactionsReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
    await this.expectAnyReadySignal(qashTransactionsStateLocators(this.page));
  }

  async openSettings(): Promise<void> {
    await this.navigateToSection('Setting');
    await this.assertSettingsReady();
  }

  async assertSettingsReady(): Promise<void> {
    await this.assertAuthenticatedShellReady();
    for (const locator of qashSettingsReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async openContactBook(): Promise<void> {
    await this.navigateToSection('Contact');
    await this.assertContactBookReady();
  }

  async assertContactBookReady(): Promise<void> {
    await this.assertAuthenticatedShellReady();
    await this.expectAnyReadySignal(qashContactBookReadyLocators(this.page));
  }

  async startAddContact(): Promise<void> {
    await this.clickFirstVisible('Qash Add contact control', qashAddContactStartLocators(this.page));
  }

  async assertAddContactFormReady(): Promise<void> {
    await this.expectAnyReadySignal(qashAddContactFormLocators(this.page));
  }

  async selectContactType(type: 'Employee' | 'Client'): Promise<void> {
    await this.clickFirstVisible(`Qash ${type} contact type`, qashContactTypeLocators(this.page, type));
  }

  async assertContactDetailsFormReady(): Promise<void> {
    await this.expectAnyReadySignal(qashContactDetailsFormLocators(this.page));
  }

  async assertClientContactFormReady(): Promise<void> {
    for (const locator of qashClientContactFormLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  async createContactGroup(groupName: string): Promise<void> {
    await this.clickFirstVisible('Qash contact group Create control', qashContactGroupCreateStartLocators(this.page));
    await this.expectAnyReadySignal(qashContactGroupFormReadyLocators(this.page));
    await this.fillFirstVisible('Qash contact group name', qashContactGroupNameInputLocators(this.page), groupName);
    await expect(this.page.getByRole('button', { name: /confirm|create|save|add/i }).last()).toBeEnabled({
      timeout: 10_000
    });
    const createGroupResponsePromise = this.page.waitForResponse(
      response =>
        response.request().method() === 'POST' &&
        response.url().includes('/employees/group') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 15_000 }
    );
    await this.clickFirstVisible('Qash contact group confirm control', qashContactGroupConfirmActionLocators(this.page));
    const response = await createGroupResponsePromise;
    this.timeline.emit({
      category: 'network_request',
      severity: 'info',
      source: this.config.name,
      message: `Created Qash contact group ${groupName}`,
      data: { status: response.status() }
    });
    await this.page
      .waitForResponse(
        response =>
          response.request().method() === 'GET' &&
          response.url().includes('/employees/groups') &&
          response.status() >= 200 &&
          response.status() < 300,
        { timeout: 10_000 }
      )
      .catch(() => undefined);
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
    await this.assertContactBookReady();
  }

  async assertContactGroupVisible(groupName: string): Promise<void> {
    await this.expectAnyReadySignal(qashContactGroupCreatedLocators(this.page, groupName));
  }

  async fillContactDetails(contact: QashContactDetails): Promise<void> {
    await this.fillFirstVisible('Qash contact name', qashContactNameInputLocators(this.page), contact.name);
    await this.fillFirstVisible('Qash contact email', qashContactEmailInputLocators(this.page), contact.email);
    await this.fillFirstVisible(
      'Qash contact wallet address',
      qashContactWalletAddressInputLocators(this.page),
      contact.walletAddress
    );

    if (contact.groupName) {
      await this.selectContactGroup(contact.groupName);
    }
  }

  async fillClientContactDetails(contact: QashClientContactDetails): Promise<void> {
    await this.fillFirstVisible('Qash client email', qashClientContactEmailInputLocators(this.page), contact.email);
    await this.fillFirstVisible(
      'Qash client company name',
      qashClientCompanyNameInputLocators(this.page),
      contact.companyName
    );
  }

  async selectContactGroup(groupName?: string): Promise<boolean> {
    await this.clickFirstVisible('Qash contact group selector', qashContactGroupSelectLocators(this.page));
    const optionLocators = qashContactGroupOptionLocators(this.page, groupName);

    for (const locator of optionLocators) {
      const option = locator.first();
      if (!(await option.isVisible({ timeout: 1_000 }).catch(() => false))) continue;

      await option.click({ timeout: 7_500 });
      this.timeline.emit({
        category: 'app_ui',
        severity: 'info',
        source: this.config.name,
        message: `Clicked ${groupName ? `Qash contact group option ${groupName}` : 'first available Qash contact group option'}`
      });
      return true;
    }

    if (groupName) {
      throw new Error(`Qash contact group "${groupName}" was not visible in the Select group dropdown.`);
    }

    await this.page.keyboard.press('Escape').catch(() => undefined);
    this.timeline.emit({
      category: 'app_ui',
      severity: 'warn',
      source: this.config.name,
      message: 'No Qash contact group option was visible; continuing without selecting a group.'
    });
    return false;
  }

  async assertContactReadyToSubmit(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /^Confirm$/i })).toBeEnabled({ timeout: 10_000 });
  }

  async assertClientContactReadyToSubmit(): Promise<void> {
    const [saveAction] = qashClientContactSaveActionLocators(this.page);
    if (!saveAction) throw new Error('Qash client Save changes action has no configured locators.');
    await expect(saveAction.first()).toBeEnabled({ timeout: 10_000 });
  }

  async submitContact(): Promise<void> {
    await this.clickFirstVisible('Qash contact Confirm control', qashContactConfirmActionLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async submitClientContact(): Promise<void> {
    await this.clickFirstVisible('Qash client Save changes control', qashClientContactSaveActionLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  async assertContactCreated(contact: QashContactDetails): Promise<void> {
    await expect(this.page.getByText(/^Add new contact$/i).first()).toBeHidden({ timeout: 30_000 });
    for (const locator of qashCreatedContactLocators(this.page, contact)) {
      await expect(locator.first()).toBeVisible({ timeout: 30_000 });
    }
  }

  async assertClientContactCreated(contact: QashClientContactDetails): Promise<void> {
    await expect(this.page.getByText(/^Add new client$/i).first()).toBeHidden({ timeout: 30_000 });
    await this.openContactBookClientList();
    for (const locator of qashCreatedContactLocators(this.page, {
      name: contact.companyName,
      email: contact.email
    })) {
      await expect(locator.first()).toBeVisible({ timeout: 30_000 });
    }
  }

  async openContactBookClientList(): Promise<void> {
    await this.clickFirstVisible('Qash Contact Book Client tab', qashContactBookClientTabLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  private async assertInvoiceRecipientFormReady(): Promise<void> {
    for (const locator of qashInvoiceRecipientFormReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  private async assertInvoiceDetailsFormReady(): Promise<void> {
    for (const locator of qashInvoiceDetailsFormReadyLocators(this.page)) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }
  }

  private async advanceInvoiceWizard(description: string): Promise<void> {
    await this.clickFirstVisible(description, qashInvoiceWizardNextLocators(this.page));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  private attachQashApiAuthFailureMonitor(): void {
    this.page.on('response', response => {
      void this.captureQashApiAuthFailure(response);
    });
  }

  private async captureQashApiAuthFailure(response: Response): Promise<void> {
    if (this.qashApiAuthFailure) return;
    const status = response.status();
    if (status !== 401 && status !== 403) return;
    if (!isQashApiResponseUrl(response.url())) return;

    const failure: QashApiAuthFailure = {
      url: response.url(),
      status,
      method: response.request().method(),
      observedAt: new Date().toISOString()
    };

    if (status === 401) {
      const bodyText = await response.text().catch(() => '');
      this.recordQashApiAuthFailure(bodyText
        ? { ...failure, bodyTextSample: normalizeInlineText(bodyText).slice(0, 500) }
        : failure);
      return;
    }

    const bodyText = await response.text().catch(() => '');
    if (!/auth|token|unauthori[sz]ed|session|forbidden/i.test(bodyText)) return;
    this.recordQashApiAuthFailure({
      ...failure,
      bodyTextSample: normalizeInlineText(bodyText).slice(0, 500)
    });
  }

  private recordQashApiAuthFailure(failure: QashApiAuthFailure): void {
    if (this.qashApiAuthFailure) return;
    this.qashApiAuthFailure = failure;
    this.timeline.emit({
      category: 'network_request',
      severity: 'error',
      source: this.config.name,
      message: 'Qash API auth failure detected',
      data: { ...failure }
    });
  }

  private async assertPreparedProfileStillAuthenticated(context: string): Promise<void> {
    const loginLocators = qashAccountStartLocators(this.page);
    if (!(await this.isAnyLocatorVisible(loginLocators, 1_000))) return;

    await this.page.waitForTimeout(2_000);
    if (!(await this.isAnyLocatorVisible(loginLocators, 1_000))) return;

    const path = new URL(this.page.url()).pathname;
    this.timeline.emit({
      category: 'app_ui',
      severity: 'error',
      source: this.config.name,
      message: 'Qash authenticated profile is on the login page',
      data: { url: this.page.url(), path }
    });

    throw new QashAuthSessionExpiredError(
      [
        `Qash authenticated profile is not logged in while ${context}: the app is on the login page with Continue by email visible.`,
        ...this.qashAuthRecoveryInstructions()
      ].join(' ')
    );
  }

  private qashAuthRecoveryInstructions(): string[] {
    const profileDir = process.env.QASH_AUTH_USER_DATA_DIR || process.env.APP_AUTH_USER_DATA_DIR || '.auth/qash/actor-a';
    return [
      `Refresh the prepared profile with: QASH_AUTH_USER_DATA_DIR=${profileDir} yarn qash:profile`,
      'Complete the Qash/Para login in the opened Chromium window, close Chromium after the dashboard appears, then rerun the same Qash command.'
    ];
  }

  private async selectDropdownOption(
    description: string,
    triggerLocators: Locator[],
    optionLocators: Locator[]
  ): Promise<void> {
    await this.clickFirstVisible(`${description} selector`, triggerLocators);
    await this.page.waitForTimeout(500);
    await this.clickFirstVisible(`${description} option`, optionLocators);
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  private async selectInvoiceClient(clientName: string): Promise<void> {
    await this.clickFirstVisible('Qash invoice client selector', qashInvoiceClientSelectLocators(this.page));
    await this.expectAnyReadySignal(qashInvoiceClientPickerReadyLocators(this.page));
    await this.clickFirstVisible('Qash invoice client option', qashInvoiceClientOptionLocators(this.page, clientName));
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  private async selectPaymentLinkAccount(accountName?: string): Promise<void> {
    await this.clickFirstVisible(
      accountName ? `Qash payment link account ${accountName}` : 'first Qash payment link account',
      qashPaymentLinkAccountOptionLocators(this.page, accountName)
    );
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  }

  private async clickInvoiceSendInvoiceButton(): Promise<void> {
    const button = qashInvoiceConfirmActionLocators(this.page)[0];
    if (!button) {
      throw new Error('Qash Invoice confirmation selector is not configured.');
    }
    await button.scrollIntoViewIfNeeded({ timeout: 10_000 });
    await expect(button).toBeVisible({ timeout: 15_000 });
    await expect(button).toBeEnabled({ timeout: 15_000 });
    await button.click({ timeout: 15_000, noWaitAfter: true });
    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Clicked Qash invoice Send Invoice button'
    });
  }

  private async assertCreatedInvoiceEvidence(invoice: QashInvoiceDetails, timeoutMs = 90_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastBodyText = '';

    while (Date.now() < deadline) {
      lastBodyText = await this.page.locator('body').innerText({ timeout: 2_000 }).catch(() => '');
      if (this.hasInvoiceEvidenceText(lastBodyText, invoice)) {
        this.timeline.emit({
          category: 'app_ui',
          severity: 'info',
          source: this.config.name,
          message: 'Qash created invoice evidence confirmed',
          data: {
            url: this.page.url(),
            clientName: invoice.clientName,
            amount: invoice.amount
          }
        });
        return;
      }

      await this.page.waitForTimeout(1_000);
    }

    throw new Error(
      `Qash Invoice creation was not verified for ${invoice.clientName} (${invoice.amount} QASH). ` +
        `The flow must show the success page or the created invoice in the Invoice tab before continuing. ` +
        `Last visible text sample: ${lastBodyText.replace(/\s+/g, ' ').slice(0, 500)}`
    );
  }

  private hasInvoiceEvidenceText(bodyText: string, invoice: QashInvoiceDetails): boolean {
    const normalized = bodyText.replace(/\s+/g, ' ').trim();
    const normalizedClient = invoice.clientName.replace(/\s+/g, ' ').trim();
    if (!normalized.includes(normalizedClient)) return false;

    const amount = Number(invoice.amount);
    const amountVariants = new Set([invoice.amount, amount.toFixed(2), amount.toFixed(1), String(amount)]);
    return Array.from(amountVariants).some(variant => new RegExp(`(^|\\D)${escapeRegExpLocal(variant)}(\\D|$)`).test(normalized));
  }

  private async dismissInvoicePreviewIfVisible(): Promise<void> {
    const previewHeading = this.page.getByText(/^Invoice INV-\d+/i).first();
    if (!(await previewHeading.isVisible({ timeout: 1_000 }).catch(() => false))) return;

    await this.page.keyboard.press('Escape').catch(() => undefined);
    await expect(previewHeading).toBeHidden({ timeout: 3_000 }).catch(() => undefined);

    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Qash invoice preview dismissed before returning to Invoice dashboard',
      data: { url: this.page.url() }
    });
  }

  private async assertInvoiceCreatedSuccessPageIfVisible(invoice: QashInvoiceDetails): Promise<boolean> {
    const locators = qashInvoiceCreatedSuccessLocators(this.page, invoice);
    const successHeading = locators[0];
    if (!successHeading) return false;
    if (!(await successHeading.first().isVisible({ timeout: 1_000 }).catch(() => false))) return false;

    for (const locator of locators) {
      await expect(locator.first()).toBeVisible({ timeout: 15_000 });
    }

    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: 'Qash invoice creation success page confirmed',
      data: {
        url: this.page.url(),
        clientName: invoice.clientName,
        itemDescription: invoice.itemDescription,
        amount: invoice.amount
      }
    });
    return true;
  }

  private async installInvoiceSubmitProbe(): Promise<void> {
    await this.page.evaluate(() => {
      const win = window as typeof window & {
        __qashInvoiceSubmitProbe?: {
          installed: boolean;
          clicks: unknown[];
          submits: unknown[];
          fetches: unknown[];
          xhrs: unknown[];
          errors: unknown[];
          unhandledRejections: unknown[];
        };
      };

      if (win.__qashInvoiceSubmitProbe?.installed) return;

      const probe = {
        installed: true,
        clicks: [] as unknown[],
        submits: [] as unknown[],
        fetches: [] as unknown[],
        xhrs: [] as unknown[],
        errors: [] as unknown[],
        unhandledRejections: [] as unknown[]
      };
      win.__qashInvoiceSubmitProbe = probe;

      const describeElement = (element: EventTarget | null) => {
        if (!(element instanceof HTMLElement)) return null;
        const rect = element.getBoundingClientRect();
        const form = element.closest('form');
        return {
          tagName: element.tagName.toLowerCase(),
          text: element.innerText?.trim().slice(0, 240) || null,
          ariaLabel: element.getAttribute('aria-label'),
          role: element.getAttribute('role'),
          type: element.getAttribute('type'),
          disabled: 'disabled' in element ? Boolean((element as HTMLButtonElement).disabled) : false,
          className: typeof element.className === 'string' ? element.className.slice(0, 240) : null,
          html: element.outerHTML.slice(0, 500),
          form: form
            ? {
                action: form.getAttribute('action'),
                method: form.getAttribute('method'),
                html: form.outerHTML.slice(0, 500)
              }
            : null,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        };
      };

      document.addEventListener(
        'click',
        event => {
          probe.clicks.push({
            at: new Date().toISOString(),
            url: window.location.href,
            target: describeElement(event.target)
          });
        },
        true
      );

      document.addEventListener(
        'submit',
        event => {
          probe.submits.push({
            at: new Date().toISOString(),
            url: window.location.href,
            target: describeElement(event.target)
          });
        },
        true
      );

      window.addEventListener('error', event => {
        probe.errors.push({
          at: new Date().toISOString(),
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', event => {
        probe.unhandledRejections.push({
          at: new Date().toISOString(),
          reason: event.reason instanceof Error ? event.reason.message : String(event.reason)
        });
      });

      const originalFetch = window.fetch.bind(window);
      window.fetch = (async (...args) => {
        const input = args[0];
        const init = args[1];
        const request =
          typeof input === 'string'
            ? { url: input, method: init?.method ?? 'GET' }
            : input instanceof Request
              ? { url: input.url, method: init?.method ?? input.method }
              : { url: String(input), method: init?.method ?? 'GET' };
        const entry = {
          at: new Date().toISOString(),
          phase: 'request',
          url: request.url,
          method: request.method
        };
        probe.fetches.push(entry);
        try {
          const response = await originalFetch(...args);
          probe.fetches.push({
            at: new Date().toISOString(),
            phase: 'response',
            url: response.url || request.url,
            method: request.method,
            status: response.status
          });
          return response;
        } catch (error) {
          probe.fetches.push({
            at: new Date().toISOString(),
            phase: 'error',
            url: request.url,
            method: request.method,
            message: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }) as typeof window.fetch;

      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null
      ) {
        (this as XMLHttpRequest & { __qashInvoiceRequest?: { method: string; url: string } }).__qashInvoiceRequest = {
          method: String(method),
          url: String(url)
        };
        if (async === undefined) {
          Reflect.apply(originalOpen, this, [method, url]);
          return;
        }
        Reflect.apply(originalOpen, this, [method, url, async, username, password]);
      };
      XMLHttpRequest.prototype.send = function (...args) {
        const request = (this as XMLHttpRequest & { __qashInvoiceRequest?: { method: string; url: string } })
          .__qashInvoiceRequest;
        if (request) {
          probe.xhrs.push({
            at: new Date().toISOString(),
            phase: 'request',
            method: request.method,
            url: request.url
          });
          this.addEventListener('loadend', () => {
            probe.xhrs.push({
              at: new Date().toISOString(),
              phase: 'response',
              method: request.method,
              url: request.url,
              status: this.status
            });
          });
        }
        return originalSend.apply(this, args);
      };
    });
  }

  private async emitInvoiceSubmitProbe(label: string): Promise<void> {
    const snapshot = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
        .filter(button => /send invoice|back to dashboard|back/i.test(button.innerText ?? ''))
        .map(button => {
          const rect = button.getBoundingClientRect();
          const form = button.closest('form');
          return {
            text: button.innerText.trim().slice(0, 240),
            ariaLabel: button.getAttribute('aria-label'),
            type: button.getAttribute('type'),
            disabled: button.disabled,
            className: button.className.slice(0, 240),
            html: button.outerHTML.slice(0, 500),
            form: form
              ? {
                  action: form.getAttribute('action'),
                  method: form.getAttribute('method'),
                  html: form.outerHTML.slice(0, 500)
                }
              : null,
            rect: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          };
        });

      return {
        url: window.location.href,
        bodyTextSample: document.body.innerText.slice(0, 1_000),
        buttons,
        probe: (window as typeof window & { __qashInvoiceSubmitProbe?: unknown }).__qashInvoiceSubmitProbe ?? null
      };
    });

    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: `Qash invoice submit probe: ${label}`,
      data: { label, ...snapshot }
    });
  }

  private waitForMultisigAccountCreateResponse(): Promise<QashCreatedMultisigAccountInfo | undefined> {
    const timeoutMs = resolvePositiveNumber(process.env.QASH_ACCOUNT_ID_RESPONSE_TIMEOUT_MS, 30_000);

    return this.page
      .waitForResponse(
        response =>
          response.request().method() === 'POST' &&
          response.status() >= 200 &&
          response.status() < 300 &&
          isQashMultisigAccountCreateResponseUrl(response.url()),
        { timeout: timeoutMs }
      )
      .then(response => this.captureCreatedMultisigAccountIdFromResponse(response))
      .catch(error => {
        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Qash multisig account create response was not captured before timeout',
          data: {
            timeoutMs,
            error: error instanceof Error ? error.message : String(error)
          }
        });
        return undefined;
      });
  }

  private waitForPaymentLinkCreateResponse(
    paymentLink?: QashPaymentLinkDetails
  ): Promise<QashCreatedPaymentLinkInfo | undefined> {
    const timeoutMs = resolvePositiveNumber(process.env.QASH_PAYMENT_LINK_RESPONSE_TIMEOUT_MS, 60_000);

    return this.page
      .waitForResponse(
        response =>
          response.request().method() === 'POST' &&
          response.status() >= 200 &&
          response.status() < 300 &&
          isQashPaymentLinkCreateResponseUrl(response.url()),
        { timeout: timeoutMs }
      )
      .then(response => this.captureCreatedPaymentLinkFromResponse(response, paymentLink))
      .catch(error => {
        this.timeline.emit({
          category: 'app_ui',
          severity: 'warn',
          source: this.config.name,
          message: 'Qash payment link create response was not captured before timeout',
          data: {
            timeoutMs,
            error: error instanceof Error ? error.message : String(error)
          }
        });
        return undefined;
      });
  }

  private async captureCreatedPaymentLinkFromResponse(
    response: Response,
    paymentLink?: QashPaymentLinkDetails
  ): Promise<QashCreatedPaymentLinkInfo | undefined> {
    const bodyText = await response.text().catch(() => '');
    const parsedBody = parseJsonIfPossible(bodyText);
    const paymentUrl = extractPaymentLinkUrlFromUnknown(parsedBody, paymentLink) ??
      extractPaymentLinkUrlFromUnknown(bodyText, paymentLink);
    const code = paymentUrl
      ? extractPaymentLinkCode(paymentUrl)
      : extractPaymentLinkCodeFromUnknown(parsedBody, paymentLink);

    if (!paymentUrl && !code) {
      this.timeline.emit({
        category: 'app_ui',
        severity: 'warn',
        source: this.config.name,
        message: 'Qash payment link create response did not include a public payment code or URL',
        data: {
          responseUrl: response.url(),
          responseStatus: response.status(),
          bodyTextSample: bodyText.slice(0, 1_000)
        }
      });
      return undefined;
    }

    const info: QashCreatedPaymentLinkInfo = {
      paymentUrl: paymentUrl ?? `https://app.qash.finance/payment/${code}`,
      capturedAt: new Date().toISOString(),
      source: 'api-response',
      responseUrl: response.url(),
      responseStatus: response.status(),
      responseBody: parsedBody,
      bodyTextSample: bodyText.slice(0, 1_000)
    };
    if (code) info.code = code;
    return info;
  }

  private async fetchPaymentLinkUrlFromApiList(paymentLink: QashPaymentLinkDetails): Promise<string | undefined> {
    const result = await this.page.evaluate(async () => {
      const response = await fetch('https://api.qash.finance/payment-link', { credentials: 'include' });
      const text = await response.text();
      return {
        status: response.status,
        url: response.url,
        text: text.slice(0, 100_000)
      };
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`GET ${result.url} returned ${result.status}: ${result.text.slice(0, 500)}`);
    }

    const parsedBody = parseJsonIfPossible(result.text);
    return extractPaymentLinkUrlFromUnknown(parsedBody, paymentLink) ??
      extractPaymentLinkUrlFromUnknown(result.text, paymentLink);
  }

  private async captureCreatedMultisigAccountIdFromResponse(
    response: Response
  ): Promise<QashCreatedMultisigAccountInfo | undefined> {
    const bodyText = await response.text().catch(() => '');
    const parsedBody = parseJsonIfPossible(bodyText);
    const accountId = extractQashAccountIdFromUnknown(parsedBody) ?? extractQashAccountIdFromUnknown(bodyText);

    if (!accountId) {
      this.timeline.emit({
        category: 'app_ui',
        severity: 'warn',
        source: this.config.name,
        message: 'Qash multisig account create response did not include a full account ID',
        data: {
          responseUrl: response.url(),
          responseStatus: response.status(),
          bodyTextSample: bodyText.slice(0, 500)
        }
      });
      return undefined;
    }

    return {
      accountName: '',
      accountId,
      capturedAt: new Date().toISOString(),
      source: 'api-response',
      responseUrl: response.url(),
      responseStatus: response.status()
    };
  }

  private async captureCreatedMultisigAccountIdFromModal(
    accountName: string
  ): Promise<QashCreatedMultisigAccountInfo | undefined> {
    const result = await this.page
      .evaluate(() => {
        const accountIdPattern = /\b0x[0-9a-fA-F]{24,40}\b/g;
        const rootCandidates = Array.from(
          document.querySelectorAll('[role="dialog"], [aria-modal="true"], [data-radix-portal], body')
        );
        const root =
          rootCandidates.find(element =>
            /Your account is ready|Account ID/i.test(
              ((element as HTMLElement).innerText || element.textContent || '').replace(/\s+/g, ' ')
            )
          ) ?? document.body;
        const values: string[] = [];
        const elements = [root, ...Array.from(root.querySelectorAll('*'))];

        for (const element of elements) {
          const htmlElement = element as HTMLElement & { value?: string };
          values.push(htmlElement.innerText ?? '');
          values.push(htmlElement.textContent ?? '');
          if (htmlElement.value) values.push(String(htmlElement.value));

          for (const attribute of Array.from(element.attributes ?? [])) {
            if (/account|id|value|copy|clipboard|title|label/i.test(attribute.name) || /^0x/i.test(attribute.value)) {
              values.push(attribute.value);
            }
          }
        }

        for (const value of values) {
          for (const match of value.matchAll(accountIdPattern)) {
            const candidate = match[0];
            const endIndex = (match.index ?? 0) + candidate.length;
            if (candidate && !candidate.includes('...') && value.slice(endIndex, endIndex + 3) !== '...') {
              return {
                accountId: candidate.toLowerCase(),
                bodyTextSample: ((root as HTMLElement).innerText || root.textContent || '').slice(0, 1_000)
              };
            }
          }
        }

        return {
          accountId: undefined,
          bodyTextSample: ((root as HTMLElement).innerText || root.textContent || '').slice(0, 1_000)
        };
      })
      .catch(() => undefined);

    if (!result?.accountId) return undefined;

    return {
      accountName,
      accountId: result.accountId,
      capturedAt: new Date().toISOString(),
      source: 'modal-dom',
      bodyTextSample: result.bodyTextSample
    };
  }

  private async setInvoiceDueDate(day: string): Promise<void> {
    if (await this.tryFillFirstVisible('Qash invoice due date', qashInvoiceDueDateInputLocators(this.page), day)) return;

    await this.clickFirstVisible('Qash invoice due date selector', qashInvoiceDueDateSelectLocators(this.page));
    await this.clickFirstVisible(`Qash invoice due date ${day}`, qashInvoiceDueDateDayLocators(this.page, day));
  }

  private async tryFillFirstVisible(description: string, locators: Locator[], value: string): Promise<boolean> {
    for (const locator of locators) {
      try {
        await locator.first().fill(value, { timeout: 2_000 });
        this.timeline.emit({
          category: 'app_ui',
          severity: 'info',
          source: this.config.name,
          message: `Filled ${description}`,
          data: { valueLength: value.length }
        });
        return true;
      } catch {
        // Try the next locator; this helper is for optional/fallback form fields.
      }
    }

    return false;
  }

  private async waitForPendingTransactionProcessingComplete(timeoutMs = 180_000): Promise<void> {
    const processingLocators = qashPendingTransactionProcessingLocators(this.page);
    if (!(await this.isAnyLocatorVisible(processingLocators, 1_000))) return;

    for (const locator of processingLocators) {
      await expect(locator.first()).toBeHidden({ timeout: timeoutMs });
    }
  }

  private async isAnyLocatorVisible(locators: Locator[], timeout: number): Promise<boolean> {
    for (const locator of locators) {
      if (await locator.first().isVisible({ timeout: 500 }).catch(() => false)) return true;
    }

    for (const locator of locators) {
      if (await locator.first().isVisible({ timeout }).catch(() => false)) return true;
    }
    return false;
  }

  private emitMultisigAccountPoolSelection(
    selection: QashMultisigAccountPoolSelection
  ): QashMultisigAccountPoolSelection {
    this.timeline.emit({
      category: 'app_ui',
      severity: 'info',
      source: this.config.name,
      message: selection.shouldCreate
        ? 'Qash platform journey will create a multisig account'
        : 'Qash platform journey will reuse a multisig account',
      data: {
        accountName: selection.accountName,
        shouldCreate: selection.shouldCreate,
        reason: selection.reason,
        count: selection.inventory.count,
        maxAccounts: selection.maxAccounts,
        names: selection.inventory.names.slice(0, 10)
      }
    });

    return selection;
  }
}

function parseQashMultisigAccountInventory(bodyText: string): QashMultisigAccountInventory {
  const lines = bodyText
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const startIndex = lines.findIndex(line => /^Multisig Accounts$/i.test(line));
  if (startIndex < 0) {
    return {
      count: 0,
      names: [],
      bodyTextSample: bodyText.slice(0, 2_000)
    };
  }

  const endIndex = lines.findIndex((line, index) => index > startIndex && /^Welcome to Qash$/i.test(line));
  const scopedLines = lines.slice(startIndex + 1, endIndex > startIndex ? endIndex : undefined);
  const explicitCountLine = scopedLines.find(line => /^\d+$/.test(line));
  const explicitCount = explicitCountLine ? Number(explicitCountLine) : undefined;
  const names: string[] = [];

  for (let index = 0; index < scopedLines.length - 2; index += 1) {
    const candidate = scopedLines[index];
    const membersLine = scopedLines[index + 1];
    const actionLine = scopedLines[index + 2];

    if (!candidate || /^\d+$/.test(candidate)) continue;
    if (!/^\d+\s+members?$/i.test(membersLine ?? '')) continue;
    if (!/^View$/i.test(actionLine ?? '')) continue;
    if (!names.includes(candidate)) names.push(candidate);
  }

  return {
    count: explicitCount ?? names.length,
    names,
    bodyTextSample: bodyText.slice(0, 2_000)
  };
}

function extractPaymentLinkUrlFromText(bodyText: string, paymentLink: { title: string; amount: string }): string | undefined {
  const normalizedTitle = paymentLink.title.replace(/\s+/g, ' ').trim();
  const lines = bodyText
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const urlPattern = /https?:\/\/app\.qash\.finance\/+payment\/[A-Za-z0-9]+/g;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (!line.includes(normalizedTitle)) continue;

    const windowText = lines.slice(Math.max(0, index - 3), Math.min(lines.length, index + 4)).join(' ');
    if (!amountAppearsInText(windowText, paymentLink.amount)) continue;

    const url = windowText.match(urlPattern)?.[0];
    if (url) return url;
  }

  const titleIndex = bodyText.indexOf(paymentLink.title);
  if (titleIndex >= 0) {
    const beforeTitle = bodyText.slice(Math.max(0, titleIndex - 500), titleIndex + 500);
    if (amountAppearsInText(beforeTitle, paymentLink.amount)) {
      const url = beforeTitle.match(urlPattern)?.[0];
      if (url) return url;
    }
  }

  return undefined;
}

function extractPaymentLinkUrlFromUnknown(value: unknown, paymentLink?: { title: string; amount: string }): string | undefined {
  const records = paymentLink
    ? findPaymentLinkRecords(value, paymentLink, new Set<object>())
    : [value];

  for (const record of records) {
    const directUrl = extractPaymentLinkUrlString(record, new Set<object>());
    if (directUrl) return directUrl;
    const code = extractPaymentLinkCodeFromUnknown(record);
    if (code) return `https://app.qash.finance/payment/${code}`;
  }

  return undefined;
}

function findPaymentLinkRecords(
  value: unknown,
  paymentLink: { title: string; amount: string },
  seen: Set<object>
): unknown[] {
  if (!value || typeof value !== 'object') return [];
  if (seen.has(value)) return [];
  seen.add(value);

  const records: unknown[] = [];
  if (paymentLinkRecordMatches(value, paymentLink)) records.push(value);

  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const child of children) {
    records.push(...findPaymentLinkRecords(child, paymentLink, seen));
  }

  return records;
}

function paymentLinkRecordMatches(value: object, paymentLink: { title: string; amount: string }): boolean {
  const textValues = collectPrimitiveTextValues(value, new Set<object>()).join(' ');
  return textValues.includes(paymentLink.title) && amountAppearsInText(textValues, paymentLink.amount);
}

function collectPrimitiveTextValues(value: unknown, seen: Set<object>): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  if (typeof value !== 'object') return [];
  if (seen.has(value)) return [];
  seen.add(value);

  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  return children.flatMap(child => collectPrimitiveTextValues(child, seen));
}

function extractPaymentLinkUrlString(value: unknown, seen: Set<object>): string | undefined {
  if (typeof value === 'string') {
    const match = value.match(/https?:\/\/app\.qash\.finance\/+payment\/[A-Za-z0-9]+/i) ??
      value.match(/\/+payment\/[A-Za-z0-9]+/i);
    return match?.[0];
  }

  if (!value || typeof value !== 'object') return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const child of children) {
    const url = extractPaymentLinkUrlString(child, seen);
    if (url) return url;
  }
  return undefined;
}

function extractPaymentLinkCodeFromUnknown(
  value: unknown,
  paymentLink?: { title: string; amount: string }
): string | undefined {
  const records = paymentLink
    ? findPaymentLinkRecords(value, paymentLink, new Set<object>())
    : [value];

  for (const record of records) {
    const code = extractPaymentLinkCodeFromRecord(record, new Set<object>());
    if (code) return code;
  }

  return undefined;
}

function extractPaymentLinkCodeFromRecord(value: unknown, seen: Set<object>): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);

  for (const [key, child] of entries) {
    if (
      typeof child === 'string' &&
      /(?:^|_|\b)(?:code|slug|paymentCode|paymentLinkCode|payment_link_code|paymentId|payment_id)(?:$|_|\b)/i.test(key) &&
      /^[A-Za-z0-9]{6,16}$/.test(child)
    ) {
      return child;
    }
  }

  for (const [, child] of entries) {
    const code = extractPaymentLinkCodeFromRecord(child, seen);
    if (code) return code;
  }

  return undefined;
}

function amountAppearsInText(value: string, amount: string): boolean {
  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber)) return value.includes(amount);
  const amountPattern = new RegExp(`\\b${escapeRegExpLocal(amountNumber.toFixed(2))}\\b|\\b${escapeRegExpLocal(amount)}\\b`);
  return amountPattern.test(value);
}

function normalizePaymentLinkUrl(value: string): string {
  const url = new URL(value, 'https://app.qash.finance/');
  const code = extractPaymentLinkCode(url.href);
  url.pathname = `/payment/${code}`;
  return url.toString();
}

function resolvePaymentLinkNoteType(): 'public' | 'private' {
  const value = (
    process.env.QASH_STRESS_MONEY_MOVEMENT_NOTE_TYPE ||
    process.env.QASH_MONEY_MOVEMENT_NOTE_TYPE ||
    'public'
  ).trim().toLowerCase();
  if (value === 'public' || value === 'private') return value;
  throw new Error(`QASH_MONEY_MOVEMENT_NOTE_TYPE must be public or private. Got: ${value}`);
}

function extractPaymentLinkCode(value: string): string {
  const match = value.match(/\/payment\/+([A-Za-z0-9]+)/i) ?? value.match(/\/+payment\/([A-Za-z0-9]+)/i);
  const code = match?.[1];
  if (!code) {
    throw new Error(`Could not extract Qash Payment Link code from ${value}.`);
  }
  return code;
}

function isQashPaymentLinkPayResponseUrl(value: string, code: string): boolean {
  try {
    const url = new URL(value);
    return /^api\.qash\.finance$/i.test(url.hostname) && url.pathname === `/payment-link/${code}/pay`;
  } catch {
    return false;
  }
}

function extractTxidFromUnknown(value: unknown): string | undefined {
  return extractTxidFromUnknownInner(value, new Set<object>());
}

function extractTxidFromUnknownInner(value: unknown, seen: Set<object>): string | undefined {
  if (typeof value === 'string') {
    const match = value.match(/\b0x[0-9a-fA-F]{16,}\b|\b[0-9a-fA-F]{32,}\b/);
    return match?.[0];
  }
  if (typeof value !== 'object' || value === null) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const txid = extractTxidFromUnknownInner(item, seen);
      if (txid) return txid;
    }
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const txidEntries = entries.filter(([key]) => /^(txid|tx_id|transactionId|transaction_id|hash|txHash)$/i.test(key));
  for (const [, child] of txidEntries) {
    const txid = extractTxidFromUnknownInner(child, seen);
    if (txid) return txid;
  }

  for (const [, child] of entries) {
    const txid = extractTxidFromUnknownInner(child, seen);
    if (txid) return txid;
  }

  return undefined;
}

export function extractQashAccountIdFromUnknown(value: unknown): string | undefined {
  return extractQashAccountIdFromUnknownInner(value, new Set<object>());
}

function normalizeQashAccountId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return /^0x[0-9a-fA-F]{24,40}$/.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

function extractQashAccountIdFromUnknownInner(value: unknown, seen: Set<object>): string | undefined {
  if (typeof value === 'string') return extractQashAccountIdFromString(value);
  if (typeof value !== 'object' || value === null) return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const accountId = extractQashAccountIdFromUnknownInner(item, seen);
      if (accountId) return accountId;
    }
    return undefined;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const accountIdKeyEntries = entries.filter(([key]) => /^(account_?id|miden_?account_?id|wallet_?account_?id)$/i.test(key));
  for (const [, child] of accountIdKeyEntries) {
    const accountId = extractQashAccountIdFromUnknownInner(child, seen);
    if (accountId) return accountId;
  }

  const genericIdEntries = entries.filter(([key]) => /^id$/i.test(key));
  for (const [, child] of genericIdEntries) {
    const accountId = extractQashAccountIdFromUnknownInner(child, seen);
    if (accountId) return accountId;
  }

  for (const [, child] of entries) {
    const accountId = extractQashAccountIdFromUnknownInner(child, seen);
    if (accountId) return accountId;
  }

  return undefined;
}

function extractQashAccountIdFromString(value: string): string | undefined {
  const accountIdPattern = /\b0x[0-9a-fA-F]{24,40}\b/g;

  for (const match of value.matchAll(accountIdPattern)) {
    const accountId = match[0];
    const endIndex = (match.index ?? 0) + accountId.length;
    if (accountId && !accountId.includes('...') && value.slice(endIndex, endIndex + 3) !== '...') {
      return accountId.toLowerCase();
    }
  }

  return undefined;
}

function parseJsonIfPossible(value: string): unknown {
  if (!value.trim()) return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isQashMultisigAccountCreateResponseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return /^\/multisig(?:\/companies\/[^/]+)?\/accounts\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function isQashPaymentLinkCreateResponseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return /^api\.qash\.finance$/i.test(url.hostname) && /^\/payment-link\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function isQashApiResponseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return /^api\.qash\.finance$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function normalizeInlineText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function resolvePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeRegExpLocal(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
