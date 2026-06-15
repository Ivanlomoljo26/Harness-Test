import type {
  QashClientContactDetails,
  QashContactDetails,
  QashInvoiceDetails,
  QashPaymentLinkDetails,
  QashPayrollDetails
} from './adapter';

export interface QashPayrollScenario {
  payroll: QashPayrollDetails;
  contact?: QashContactDetails;
}

export interface QashPlatformJourneyScenario {
  accountName: string;
  accountDescription: string;
  contact: QashContactDetails;
  createContactGroup: boolean;
  payroll: QashPayrollDetails;
  invoiceClient: QashClientContactDetails;
  invoice: QashInvoiceDetails;
  paymentLink: QashPaymentLinkDetails;
}

export interface QashUserPaymentStressScenario {
  accountName: string;
  accountDescription: string;
  contact: QashContactDetails;
  createContactGroup: boolean;
  loopCount: number;
  failureBudget: number;
  accountPoolSize: number;
  attemptPendingTransactions: boolean;
  includePayroll: boolean;
  includeInvoice: boolean;
  includePaymentLink: boolean;
  iterations: QashDurabilityWorkloadIteration[];
}

export interface QashDurabilityWorkloadIteration {
  index: number;
  payrollContact: QashContactDetails;
  payroll: QashPayrollDetails;
  invoiceClient: QashClientContactDetails;
  invoice: QashInvoiceDetails;
  paymentLink: QashPaymentLinkDetails;
}

export interface QashInvoiceScenario {
  invoice: QashInvoiceDetails;
  contact?: QashClientContactDetails;
}

export interface QashPaymentLinkScenario {
  paymentLink: QashPaymentLinkDetails;
}

export function buildQashPayrollScenario(options: {
  uniqueSuffix?: string;
  shouldCreateContact?: boolean;
} = {}): QashPayrollScenario {
  const uniqueSuffix = options.uniqueSuffix ?? Date.now().toString();
  const shouldCreateContact = options.shouldCreateContact ?? envFlag('QASH_CREATE_PAYROLL_CONTACT');
  const employeeName = envValue('QASH_PAYROLL_EMPLOYEE_NAME') ??
    (shouldCreateContact ? `Pioneer E2E Payroll ${uniqueSuffix}` : '');
  const walletAddress = firstEnvValue('QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS', 'QASH_CONTACT_WALLET_ADDRESS') ?? '';
  const groupName = firstEnvValue('QASH_PAYROLL_CONTACT_GROUP', 'QASH_CONTACT_GROUP') ??
    (shouldCreateContact ? `Pioneer E2E Payroll Group ${uniqueSuffix}` : undefined);

  const payroll: QashPayrollDetails = {
    employeeName,
    walletAddress,
    networkName: envValue('QASH_PAYROLL_NETWORK') ?? 'Miden Testnet',
    tokenName: envValue('QASH_PAYROLL_TOKEN') ?? 'QASH',
    durationMonths: envValue('QASH_PAYROLL_DURATION_MONTHS') ?? '1',
    monthlyAmount: envValue('QASH_PAYROLL_MONTHLY_AMOUNT') ?? randomQashAmount(),
    scheduledPayDay: envValue('QASH_PAYROLL_PAY_DAY') ?? '1',
    itemDescription: envValue('QASH_PAYROLL_ITEM_DESCRIPTION') ?? `Pioneer E2E Payroll ${uniqueSuffix}`,
    note: envValue('QASH_PAYROLL_NOTE') ?? `Pioneer E2E payroll regression ${uniqueSuffix}`
  };

  const contact = shouldCreateContact
    ? {
        name: employeeName,
        email: envValue('QASH_PAYROLL_EMPLOYEE_EMAIL') ?? `pioneer.payroll+${uniqueSuffix}@example.com`,
        walletAddress,
        ...(groupName ? { groupName } : {})
      }
    : undefined;

  return {
    payroll,
    ...(contact ? { contact } : {})
  };
}

export function buildQashPlatformJourneyScenario(): QashPlatformJourneyScenario {
  const uniqueSuffix = Date.now().toString();
  const accountName = firstEnvValue('QASH_PLATFORM_ACCOUNT_NAME', 'QASH_MULTISIG_ACCOUNT_NAME') ??
    `Pioneer E2E Platform ${uniqueSuffix}`;
  const walletAddress = firstEnvValue(
    'QASH_PLATFORM_CONTACT_WALLET_ADDRESS',
    'QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS',
    'QASH_CONTACT_WALLET_ADDRESS'
  ) ?? '';
  const contactName = firstEnvValue('QASH_PLATFORM_CONTACT_NAME', 'QASH_PAYROLL_EMPLOYEE_NAME') ??
    `Pioneer E2E Platform Employee ${uniqueSuffix}`;
  const contactGroup = firstEnvValue(
    'QASH_PLATFORM_CONTACT_GROUP',
    'QASH_PAYROLL_CONTACT_GROUP',
    'QASH_CONTACT_GROUP'
  ) ?? `Pioneer E2E Platform Group ${uniqueSuffix}`;
  const hasExplicitContactGroup = Boolean(firstEnvValue(
    'QASH_PLATFORM_CONTACT_GROUP',
    'QASH_PAYROLL_CONTACT_GROUP',
    'QASH_CONTACT_GROUP'
  ));

  const contact: QashContactDetails = {
    name: contactName,
    email: firstEnvValue('QASH_PLATFORM_CONTACT_EMAIL', 'QASH_PAYROLL_EMPLOYEE_EMAIL') ??
      `pioneer.platform+${uniqueSuffix}@example.com`,
    walletAddress,
    groupName: contactGroup
  };
  const invoiceClientName = firstEnvValue('QASH_PLATFORM_INVOICE_CLIENT_NAME', 'QASH_INVOICE_CLIENT_NAME') ??
    `Pioneer E2E Platform Invoice Client ${uniqueSuffix}`;
  const invoiceWalletAddress = firstEnvValue(
    'QASH_PLATFORM_INVOICE_CLIENT_WALLET_ADDRESS',
    'QASH_INVOICE_CLIENT_WALLET_ADDRESS',
    'QASH_PLATFORM_CONTACT_WALLET_ADDRESS',
    'QASH_PAYROLL_EMPLOYEE_WALLET_ADDRESS',
    'QASH_CONTACT_WALLET_ADDRESS'
  ) ?? '';
  const paymentLinkAccountName = firstEnvValue(
    'QASH_PLATFORM_PAYMENT_LINK_ACCOUNT_NAME',
    'QASH_PAYMENT_LINK_ACCOUNT_NAME'
  ) ?? accountName;

  return {
    accountName,
    accountDescription: envValue('QASH_PLATFORM_ACCOUNT_DESCRIPTION') ??
      `Created by Pioneer E2E continuous platform journey ${uniqueSuffix}.`,
    contact,
    createContactGroup:
      !hasExplicitContactGroup ||
      envFlag('QASH_PLATFORM_CREATE_CONTACT_GROUP') ||
      envFlag('QASH_CREATE_PAYROLL_CONTACT_GROUP') ||
      envFlag('QASH_CREATE_CONTACT_GROUP'),
    payroll: {
      employeeName: contactName,
      walletAddress,
      networkName: firstEnvValue('QASH_PLATFORM_PAYROLL_NETWORK', 'QASH_PAYROLL_NETWORK') ?? 'Miden Testnet',
      tokenName: firstEnvValue('QASH_PLATFORM_PAYROLL_TOKEN', 'QASH_PAYROLL_TOKEN') ?? 'QASH',
      durationMonths: firstEnvValue('QASH_PLATFORM_PAYROLL_DURATION_MONTHS', 'QASH_PAYROLL_DURATION_MONTHS') ?? '1',
      monthlyAmount:
        firstEnvValue('QASH_PLATFORM_PAYROLL_MONTHLY_AMOUNT', 'QASH_PAYROLL_MONTHLY_AMOUNT') ?? randomQashAmount(),
      scheduledPayDay: firstEnvValue('QASH_PLATFORM_PAYROLL_PAY_DAY', 'QASH_PAYROLL_PAY_DAY') ?? '1',
      itemDescription: firstEnvValue('QASH_PLATFORM_PAYROLL_ITEM_DESCRIPTION', 'QASH_PAYROLL_ITEM_DESCRIPTION') ??
        `Pioneer E2E Platform Payroll ${uniqueSuffix}`,
      note: firstEnvValue('QASH_PLATFORM_PAYROLL_NOTE', 'QASH_PAYROLL_NOTE') ??
        `Pioneer E2E platform journey ${uniqueSuffix}`
    },
    invoiceClient: {
      companyName: invoiceClientName,
      email: firstEnvValue('QASH_PLATFORM_INVOICE_CLIENT_EMAIL', 'QASH_INVOICE_CLIENT_EMAIL') ??
        `pioneer.platform.invoice+${uniqueSuffix}@example.com`
    },
    invoice: {
      clientName: invoiceClientName,
      walletAddress: invoiceWalletAddress,
      networkName: firstEnvValue('QASH_PLATFORM_INVOICE_NETWORK', 'QASH_INVOICE_NETWORK') ?? 'Miden Testnet',
      tokenName: firstEnvValue('QASH_PLATFORM_INVOICE_TOKEN', 'QASH_INVOICE_TOKEN') ?? 'QASH',
      amount: firstEnvValue('QASH_PLATFORM_INVOICE_AMOUNT', 'QASH_INVOICE_AMOUNT') ?? randomQashAmount(),
      dueDay: firstEnvValue('QASH_PLATFORM_INVOICE_DUE_DAY', 'QASH_INVOICE_DUE_DAY') ?? '7 days',
      itemDescription: firstEnvValue('QASH_PLATFORM_INVOICE_ITEM_DESCRIPTION', 'QASH_INVOICE_ITEM_DESCRIPTION') ??
        `Pioneer E2E Platform Invoice ${uniqueSuffix}`,
      note: firstEnvValue('QASH_PLATFORM_INVOICE_NOTE', 'QASH_INVOICE_NOTE') ??
        `Pioneer E2E platform invoice ${uniqueSuffix}`
    },
    paymentLink: {
      title: firstEnvValue('QASH_PLATFORM_PAYMENT_LINK_TITLE', 'QASH_PAYMENT_LINK_TITLE') ??
        `Pioneer E2E Platform Payment Link ${uniqueSuffix}`,
      amount: firstEnvValue('QASH_PLATFORM_PAYMENT_LINK_AMOUNT', 'QASH_PAYMENT_LINK_AMOUNT') ?? randomQashAmount(),
      description: firstEnvValue('QASH_PLATFORM_PAYMENT_LINK_DESCRIPTION', 'QASH_PAYMENT_LINK_DESCRIPTION') ??
        `Pioneer E2E platform payment link ${uniqueSuffix}`,
      accountName: paymentLinkAccountName,
      networkName: firstEnvValue('QASH_PLATFORM_PAYMENT_LINK_NETWORK', 'QASH_PAYMENT_LINK_NETWORK') ?? 'Miden Testnet',
      tokenName: firstEnvValue('QASH_PLATFORM_PAYMENT_LINK_TOKEN', 'QASH_PAYMENT_LINK_TOKEN') ?? 'QASH'
    }
  };
}

export function buildQashUserPaymentStressScenario(): QashUserPaymentStressScenario {
  const uniqueSuffix = Date.now().toString();
  const loopCount = resolvePositiveInteger(
    firstEnvValue('QASH_STRESS_LOOPS', 'QASH_DURABILITY_LOOPS', 'QASH_DURABILITY_PAYMENT_LOOPS'),
    2
  );
  const receiverWalletAddress = firstEnvValue(
    'QASH_STRESS_RECEIVER_WALLET_ADDRESS',
    'QASH_DURABILITY_RECEIVER_WALLET_ADDRESS',
    'QASH_ACTOR_B_WALLET_ADDRESS',
    'QASH_PLATFORM_CONTACT_WALLET_ADDRESS'
  ) ?? '';
  const contactName = firstEnvValue('QASH_STRESS_RECEIVER_NAME', 'QASH_DURABILITY_RECEIVER_NAME', 'QASH_ACTOR_B_CONTACT_NAME') ??
    `Pioneer E2E Stress Receiver ${uniqueSuffix}`;
  const contactGroup = firstEnvValue('QASH_STRESS_CONTACT_GROUP', 'QASH_DURABILITY_CONTACT_GROUP', 'QASH_PLATFORM_CONTACT_GROUP') ??
    `Pioneer E2E Stress Group ${uniqueSuffix}`;
  const hasExplicitContactGroup = Boolean(firstEnvValue(
    'QASH_STRESS_CONTACT_GROUP',
    'QASH_DURABILITY_CONTACT_GROUP',
    'QASH_PLATFORM_CONTACT_GROUP'
  ));
  const amountOverride = firstEnvValue('QASH_STRESS_PAYMENT_AMOUNT', 'QASH_DURABILITY_PAYMENT_AMOUNT');
  const invoiceAmountOverride = firstEnvValue(
    'QASH_STRESS_INVOICE_AMOUNT',
    'QASH_DURABILITY_INVOICE_AMOUNT',
    'QASH_PLATFORM_INVOICE_AMOUNT'
  );
  const paymentLinkAmountOverride = firstEnvValue(
    'QASH_STRESS_PAYMENT_LINK_AMOUNT',
    'QASH_DURABILITY_PAYMENT_LINK_AMOUNT',
    'QASH_PLATFORM_PAYMENT_LINK_AMOUNT'
  );
  const includePayroll = firstEnvValue('QASH_STRESS_INCLUDE_PAYROLL', 'QASH_DURABILITY_INCLUDE_PAYROLL') !== 'false';
  const includeInvoice = firstEnvValue('QASH_STRESS_INCLUDE_INVOICE', 'QASH_DURABILITY_INCLUDE_INVOICE') !== 'false';
  const includePaymentLink = firstEnvValue(
    'QASH_STRESS_INCLUDE_PAYMENT_LINK',
    'QASH_DURABILITY_INCLUDE_PAYMENT_LINK'
  ) !== 'false';

  return {
    accountName: firstEnvValue('QASH_STRESS_SENDER_ACCOUNT_NAME', 'QASH_DURABILITY_SENDER_ACCOUNT_NAME', 'QASH_PLATFORM_ACCOUNT_NAME') ??
      `Pioneer E2E Stress Sender ${uniqueSuffix}`,
    accountDescription: firstEnvValue('QASH_STRESS_SENDER_ACCOUNT_DESCRIPTION', 'QASH_DURABILITY_SENDER_ACCOUNT_DESCRIPTION') ??
      `Created by Pioneer E2E Qash stress ${uniqueSuffix}.`,
    contact: {
      name: contactName,
      email: firstEnvValue('QASH_STRESS_RECEIVER_EMAIL', 'QASH_DURABILITY_RECEIVER_EMAIL') ??
        `pioneer.stress.receiver+${uniqueSuffix}@example.com`,
      walletAddress: receiverWalletAddress,
      groupName: contactGroup
    },
    createContactGroup:
      !hasExplicitContactGroup ||
      envFlag('QASH_STRESS_CREATE_CONTACT_GROUP') ||
      envFlag('QASH_DURABILITY_CREATE_CONTACT_GROUP') ||
      envFlag('QASH_PLATFORM_CREATE_CONTACT_GROUP'),
    loopCount,
    failureBudget: resolveNonNegativeInteger(
      process.env.QASH_STRESS_FAILURE_BUDGET || process.env.QASH_DURABILITY_FAILURE_BUDGET,
      0
    ),
    accountPoolSize: resolvePositiveInteger(
      process.env.QASH_STRESS_ACCOUNT_POOL_SIZE ||
        process.env.QASH_DURABILITY_ACCOUNT_POOL_SIZE ||
        process.env.QASH_PLATFORM_ACCOUNT_POOL_SIZE ||
        process.env.QASH_PLATFORM_MAX_ACCOUNT_COUNT,
      3
    ),
    attemptPendingTransactions:
      process.env.QASH_STRESS_ATTEMPT_PENDING_TRANSACTIONS === 'true' ||
      process.env.QASH_STRESS_COMPLETE_PENDING_TRANSACTIONS === 'true' ||
      process.env.QASH_DURABILITY_ATTEMPT_PENDING_TRANSACTIONS === 'true' ||
      process.env.QASH_DURABILITY_COMPLETE_PENDING_TRANSACTIONS === 'true',
    includePayroll,
    includeInvoice,
    includePaymentLink,
    iterations: Array.from({ length: loopCount }, (_, index) => {
      const iteration = index + 1;
      const iterationSuffix = `${uniqueSuffix}-${iteration}`;
      const payrollContactName = `${contactName} ${iteration}`;
      const payrollContactGroup = `${contactGroup} ${iteration}`;
      const invoiceClientName = `Pioneer E2E Stress Client ${iterationSuffix}`;

      return {
        index: iteration,
        payrollContact: {
          name: payrollContactName,
          email: `pioneer.stress.receiver+${iterationSuffix}@example.com`,
          walletAddress: receiverWalletAddress,
          groupName: payrollContactGroup
        },
        payroll: {
          employeeName: payrollContactName,
          walletAddress: receiverWalletAddress,
          networkName: firstEnvValue('QASH_STRESS_PAYMENT_NETWORK', 'QASH_DURABILITY_PAYMENT_NETWORK', 'QASH_PAYROLL_NETWORK') ??
            'Miden Testnet',
          tokenName: firstEnvValue('QASH_STRESS_PAYMENT_TOKEN', 'QASH_DURABILITY_PAYMENT_TOKEN', 'QASH_PAYROLL_TOKEN') ??
            'QASH',
          durationMonths: firstEnvValue(
            'QASH_STRESS_PAYMENT_DURATION_MONTHS',
            'QASH_DURABILITY_PAYMENT_DURATION_MONTHS',
            'QASH_PAYROLL_DURATION_MONTHS'
          ) ?? '1',
          monthlyAmount: amountOverride ?? randomQashAmount(),
          scheduledPayDay: firstEnvValue('QASH_STRESS_PAYMENT_DAY', 'QASH_DURABILITY_PAYMENT_DAY', 'QASH_PAYROLL_PAY_DAY') ??
            '1',
          itemDescription: `Pioneer E2E stress payroll ${iterationSuffix}`,
          note: `Pioneer E2E Qash stress Payroll ${iteration} of ${loopCount}`
        },
        invoiceClient: {
          companyName: invoiceClientName,
          email: `pioneer.stress.invoice+${iterationSuffix}@example.com`
        },
        invoice: {
          clientName: invoiceClientName,
          walletAddress: receiverWalletAddress,
          networkName: firstEnvValue('QASH_STRESS_INVOICE_NETWORK', 'QASH_DURABILITY_INVOICE_NETWORK', 'QASH_PLATFORM_INVOICE_NETWORK') ??
            'Miden Testnet',
          tokenName: firstEnvValue('QASH_STRESS_INVOICE_TOKEN', 'QASH_DURABILITY_INVOICE_TOKEN', 'QASH_PLATFORM_INVOICE_TOKEN') ??
            'QASH',
          amount: invoiceAmountOverride ?? randomQashAmount(),
          dueDay: firstEnvValue('QASH_STRESS_INVOICE_DUE_DAY', 'QASH_DURABILITY_INVOICE_DUE_DAY', 'QASH_PLATFORM_INVOICE_DUE_DAY') ??
            '7 days',
          itemDescription: `Pioneer E2E stress invoice ${iterationSuffix}`,
          note: `Pioneer E2E Qash stress Invoice ${iteration} of ${loopCount}`
        },
        paymentLink: {
          title: `Pioneer E2E Stress Link ${iterationSuffix}`,
          amount: paymentLinkAmountOverride ?? randomQashAmount(),
          description: `Pioneer E2E Qash stress Payment Link ${iteration} of ${loopCount}`,
          networkName: firstEnvValue(
            'QASH_STRESS_PAYMENT_LINK_NETWORK',
            'QASH_DURABILITY_PAYMENT_LINK_NETWORK',
            'QASH_PLATFORM_PAYMENT_LINK_NETWORK'
          ) ??
            'Miden Testnet',
          tokenName: firstEnvValue(
            'QASH_STRESS_PAYMENT_LINK_TOKEN',
            'QASH_DURABILITY_PAYMENT_LINK_TOKEN',
            'QASH_PLATFORM_PAYMENT_LINK_TOKEN'
          ) ?? 'QASH'
        }
      };
    })
  };
}

export function buildQashInvoiceScenario(options: {
  uniqueSuffix?: string;
  shouldCreateClient?: boolean;
} = {}): QashInvoiceScenario {
  const uniqueSuffix = options.uniqueSuffix ?? Date.now().toString();
  const shouldCreateClient = options.shouldCreateClient ?? envFlag('QASH_CREATE_INVOICE_CLIENT');
  const clientName = envValue('QASH_INVOICE_CLIENT_NAME') ??
    (shouldCreateClient ? `Pioneer E2E Invoice Client ${uniqueSuffix}` : '');
  const walletAddress = firstEnvValue('QASH_INVOICE_CLIENT_WALLET_ADDRESS', 'QASH_CONTACT_WALLET_ADDRESS') ?? '';

  const invoice: QashInvoiceDetails = {
    clientName,
    walletAddress,
    networkName: envValue('QASH_INVOICE_NETWORK') ?? 'Miden Testnet',
    tokenName: envValue('QASH_INVOICE_TOKEN') ?? 'QASH',
    amount: envValue('QASH_INVOICE_AMOUNT') ?? randomQashAmount(),
    dueDay: envValue('QASH_INVOICE_DUE_DAY') ?? '7 days',
    itemDescription: envValue('QASH_INVOICE_ITEM_DESCRIPTION') ?? `Pioneer E2E Invoice ${uniqueSuffix}`,
    note: envValue('QASH_INVOICE_NOTE') ?? `Pioneer E2E invoice regression ${uniqueSuffix}`
  };

  const contact = shouldCreateClient
    ? {
        companyName: clientName,
        email: envValue('QASH_INVOICE_CLIENT_EMAIL') ?? `pioneer.invoice+${uniqueSuffix}@example.com`
      }
    : undefined;

  return {
    invoice,
    ...(contact ? { contact } : {})
  };
}

export function buildQashPaymentLinkScenario(options: {
  uniqueSuffix?: string;
} = {}): QashPaymentLinkScenario {
  const uniqueSuffix = options.uniqueSuffix ?? Date.now().toString();
  const accountName = envValue('QASH_PAYMENT_LINK_ACCOUNT_NAME');

  return {
    paymentLink: {
      title: envValue('QASH_PAYMENT_LINK_TITLE') ?? `Pioneer E2E Payment Link ${uniqueSuffix}`,
      amount: envValue('QASH_PAYMENT_LINK_AMOUNT') ?? randomQashAmount(),
      description: envValue('QASH_PAYMENT_LINK_DESCRIPTION') ?? `Pioneer E2E payment link ${uniqueSuffix}`,
      networkName: envValue('QASH_PAYMENT_LINK_NETWORK') ?? 'Miden Testnet',
      tokenName: envValue('QASH_PAYMENT_LINK_TOKEN') ?? 'QASH',
      ...(accountName ? { accountName } : {})
    }
  };
}

export function isTestnetMidenAddress(value: string): boolean {
  return /^mtst1/i.test(value);
}

export function resolvePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolvePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Math.floor(resolvePositiveNumber(value, fallback));
  return parsed > 0 ? parsed : fallback;
}

export function resolveNonNegativeInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function firstEnvValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = envValue(name);
    if (value) return value;
  }
  return undefined;
}

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function envFlag(name: string): boolean {
  return process.env[name] === 'true';
}

function randomQashAmount(): string {
  return (1 + Math.random() * 4).toFixed(2);
}
