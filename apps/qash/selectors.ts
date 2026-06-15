import type { Page } from '@playwright/test';

export type QashSectionName =
  | 'Dashboard'
  | 'Contact'
  | 'Payroll'
  | 'Invoice'
  | 'Bills'
  | 'Payment Link'
  | 'Transactions'
  | 'Setting';

export const qashNavigationSections: QashSectionName[] = [
  'Dashboard',
  'Contact',
  'Payroll',
  'Invoice',
  'Bills',
  'Payment Link',
  'Transactions',
  'Setting'
];

export const qashSectionPathPatterns: Record<QashSectionName, RegExp> = {
  Dashboard: /^\/(?:dashboard)?$/,
  Contact: /\/contact-book\/?$/,
  Payroll: /\/payroll\/?$/,
  Invoice: /\/invoices?\/?$/,
  Bills: /\/bills?\/?$/,
  'Payment Link': /\/payment-links?\/?$/,
  Transactions: /\/transactions?\/?$/,
  Setting: /\/settings?\/?$/
};

export const qashSectionHeadings: Record<QashSectionName, RegExp[]> = {
  Dashboard: [/^Dashboard$/i],
  Contact: [/^Contact Book$/i],
  Payroll: [/^Payroll$/i],
  Invoice: [/^Invoice$/i],
  Bills: [/^Bills$/i],
  'Payment Link': [/^Payment Link$/i],
  Transactions: [/^Transactions$/i],
  Setting: [/^Setting$/i, /^Settings$/i]
};

export function qashReadyLocators(page: Page) {
  return [
    page.getByRole('button', { name: /continue by email/i }),
    page.getByText(/get started now/i).first(),
    page.getByText(/welcome to qash/i).first(),
    page.getByText(/qash/i).first()
  ];
}

export function qashAccountStartLocators(page: Page) {
  const override = process.env.QASH_LOGIN_SELECTOR;
  return [
    ...(override ? [page.locator(override)] : []),
    page.getByRole('button', { name: /continue by email/i }),
    page.locator('button:has-text("Continue by email")')
  ];
}

export function qashParaAuthLocators(page: Page) {
  return [
    page.getByText(/sign up or login/i).first(),
    page.getByPlaceholder(/enter email/i),
    page.getByText(/para/i).first()
  ];
}

export function qashPostAuthOnboardingLocators(page: Page) {
  return [
    page.getByText(/tell us about your company/i).first(),
    page.getByText(/wallet created/i).first(),
    page.getByText(/qash x para wallet/i).first(),
    page.getByText(/company logo/i).first(),
    page.getByText(/first name/i).first(),
    page.getByText(/last name/i).first(),
    page.getByText(/company name/i).first(),
    page.getByText(/additional details/i).first(),
    page.getByRole('button', { name: /done|add funds/i })
  ];
}

export function qashAuthenticatedLocators(page: Page) {
  const expectedEmail = process.env.QASH_AUTH_ACCOUNT_EMAIL || process.env.QASH_GOOGLE_ACCOUNT_EMAIL;
  return [
    page.getByText(/total treasury balance/i).first(),
    page.getByText(/upcoming payroll/i).first(),
    page.getByText(/money in & money out/i).first(),
    page.getByText(/all accounts/i).first(),
    page.getByText(/transactions/i).first(),
    page.getByRole('button', { name: /portfolio/i }),
    ...(expectedEmail ? [page.getByText(expectedEmail, { exact: true })] : []),
    ...qashPostAuthOnboardingLocators(page)
  ];
}

export function qashAuthenticatedShellLocators(page: Page) {
  const expectedEmail = process.env.QASH_AUTH_ACCOUNT_EMAIL || process.env.QASH_GOOGLE_ACCOUNT_EMAIL;
  return [
    page.getByRole('button', { name: /portfolio/i }),
    page.getByText(/dashboard/i).first(),
    page.getByText(/contact/i).first(),
    page.getByText(/payroll/i).first(),
    ...(expectedEmail ? [page.getByText(expectedEmail, { exact: true })] : [])
  ];
}

export function qashSectionNavigationLocators(page: Page, section: QashSectionName) {
  const name = exactTextPattern(section);
  return [
    page.getByRole('button', { name }),
    page.locator('aside, nav').getByText(name).first(),
    page.getByText(name).first(),
    page.getByRole('link', { name })
  ];
}

export function qashSectionReadyLocators(page: Page, section: QashSectionName) {
  const headings = qashSectionHeadings[section];

  if (section === 'Dashboard') {
    const dashboardHeading = headings[0] ?? /^Dashboard$/i;
    return [
      page.getByRole('heading', { name: dashboardHeading }),
      page.getByText(/total treasury balance/i).first(),
      page.getByText(/upcoming payroll/i).first()
    ];
  }

  return [
    ...headings.map(name => page.getByRole('heading', { name })),
    ...headings.map(name => page.locator('main, [role=main]').getByText(name).first())
  ];
}

export function qashMultisigAccountPrerequisiteLocators(page: Page) {
  return [
    page.getByText(/you need to create a multisig account/i).first(),
    page.getByRole('button', { name: /^Create account$/i }),
    page.getByText(/^All Accounts$/i).first()
  ];
}

export function qashCreateMultisigAccountStartLocators(page: Page) {
  return [
    page.getByRole('button', { name: /Create new account/i }),
    page.getByRole('button', { name: /Wallet Create new account/i }),
    page.getByRole('button', { name: /^Create account$/i }),
    page.getByText(/^Create new account$/i).last(),
    page.getByText(/^Create account$/i).last()
  ];
}

export function qashCreateMultisigAccountFormLocators(page: Page) {
  return [
    page.getByRole('dialog').first(),
    page.getByRole('heading', { name: /create.*account|multisig/i }),
    page.getByText(/create.*account|multisig|account name|owners|threshold|signer|member/i).first(),
    page.getByRole('button', { name: /cancel|continue|confirm|create|next/i })
  ];
}

export function qashMultisigAccountNameInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/enter account name/i),
    page.getByLabel(/set account name|account name/i),
    page.locator('input').filter({ hasText: /account/i }).first(),
    page.locator('input').first()
  ];
}

export function qashMultisigAccountDescriptionInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/enter description/i),
    page.getByLabel(/description/i),
    page.locator('textarea').first()
  ];
}

export function qashMultisigNextStepLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Next$/i }),
    page.getByText(/^Next$/i).last()
  ];
}

export function qashMultisigChooseMembersReadyLocators(page: Page) {
  return [
    page.getByText(/^Choose Members$/i).first(),
    page.getByText(/member|owner|threshold|signer/i).first(),
    page.getByRole('button', { name: /back|next/i })
  ];
}

export function qashMultisigReviewReadyLocators(page: Page, accountName: string) {
  return [
    page.getByText(/^Review your account$/i).first(),
    page.getByText(/make sure everything looks correct before you proceed/i).first(),
    page.getByText(accountName, { exact: true })
  ];
}

export function qashMultisigReviewFinalActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Create$/i }),
    page.getByText(/^Create$/i).last()
  ];
}

export function qashMultisigAccountCreatedLocators(page: Page, accountName: string) {
  return [
    page.getByText(accountName, { exact: true }),
    page.getByText(/^Multisig Accounts$/i).first(),
    page.getByText(/add funds|total balance|money in & money out/i).first()
  ];
}

export function qashMultisigAccountCreatedContinueLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^View Account$/i }),
    page.getByText(/^View Account$/i).last(),
    page.getByAltText(/^close icon$/i).first()
  ];
}

export function qashPortfolioStartLocators(page: Page) {
  return [
    page.getByRole('button', { name: /portfolio/i }),
    page.getByText(/^Portfolio$/i).first()
  ];
}

export function qashPortfolioReadyLocators(page: Page) {
  const portfolio = page.locator('[data-tour="portfolio-section"]');
  return [
    portfolio.getByText(/total balance/i).first(),
    portfolio.getByText(/\bQASH\b/i).first(),
    portfolio.getByText(/faucet|add funds|receive|address/i).first()
  ];
}

export function qashPortfolioAssetLocators(page: Page, token = 'QASH') {
  const portfolio = page.locator('[data-tour="portfolio-section"]');
  const name = exactTextPattern(token);
  return [
    portfolio.getByText(name).first(),
    portfolio.locator(`text=${token}`).first()
  ];
}

export function qashAssetDetailsReadyLocators(page: Page) {
  const portfolio = page.locator('[data-tour="portfolio-section"]');
  return [
    portfolio.getByText(/faucet|add funds|receive|request|deposit/i).first(),
    portfolio.getByText(/wallet address|receive address|copy address|address/i).first(),
    portfolio.getByText(/available balance|balance|token details|asset details/i).first(),
    portfolio.getByRole('button', { name: /faucet|add funds|receive|request|deposit|copy/i })
  ];
}

export function qashFaucetStartLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Floating action button$/i }),
    page.locator('button.fab-free-token').first(),
    page.locator('button:has(img[src*="/token/qash.svg"])').last()
  ];
}

export function qashFaucetClaimModalLocators(page: Page) {
  return [
    page.getByText(/^100$/i).first(),
    page.getByText(/grab your free test tokens to start exploring qash on testnet/i).first(),
    page.getByText(/click below to claim your free tokens/i).first(),
    page.getByRole('button', { name: /^Request free tokens$/i })
  ];
}

export function qashFaucetRequestActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Request free tokens$/i }),
    page.getByText(/^Request free tokens$/i).last()
  ];
}

export function qashFaucetClaimModalCloseLocators(page: Page) {
  const faucetModal = page
    .locator('main, [role=dialog]')
    .filter({ has: page.getByRole('button', { name: /^Request free tokens$/i }) });

  return [
    faucetModal.locator('img[alt="close icon"]').first(),
    page.getByAltText(/^close icon$/i).first(),
    page.locator('img[alt="close icon"]').first()
  ];
}

export function qashFaucetAccountSelectionLocators(page: Page, accountName?: string) {
  return [
    page.getByText(/^Choose an account$/i).first(),
    ...(accountName ? [page.getByText(accountName, { exact: true }).first()] : []),
    page.getByText(/pioneer e2e confirm|created by pioneer e2e testnet automation/i).first(),
    page.getByRole('button', { name: /^Confirm$/i })
  ];
}

export function qashFaucetAccountOptionLocators(page: Page, accountName?: string) {
  const accountNamePattern = accountName ? new RegExp(escapeRegExp(accountName), 'i') : undefined;

  return [
    ...(accountNamePattern
      ? [
          page.getByRole('button', { name: accountNamePattern }),
          page.locator('button').filter({ hasText: accountNamePattern }).first(),
          page.getByText(accountNamePattern).first()
        ]
      : []),
    page.getByRole('button', { name: /pioneer e2e confirm|created by pioneer e2e testnet automation/i }),
    page.getByText(/pioneer e2e confirm/i).first(),
    page.locator('button').filter({ hasText: /created by pioneer e2e testnet automation/i }).first()
  ];
}

export function qashFaucetConfirmActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Confirm$/i }),
    page.getByText(/^Confirm$/i).last()
  ];
}

export function qashTransactionsReceiveTabLocators(page: Page) {
  const receiveTabName = /^Receive(?:\s+\d+)?$/i;
  const transactionsSurface = page.locator('main, [role=main]');

  return [
    transactionsSurface.getByText(receiveTabName).first(),
    page.getByRole('button', { name: receiveTabName }),
    transactionsSurface.getByRole('button', { name: receiveTabName }),
    page.getByText(receiveTabName).first(),
    transactionsSurface.getByRole('tab', { name: receiveTabName }),
    page.getByRole('tab', { name: receiveTabName })
  ];
}

export function qashTransactionsPendingTabLocators(page: Page) {
  const pendingTabName = /^Pending Transactions(?:\s+\d+)?$/i;
  const transactionsSurface = page.locator('main, [role=main]');

  return [
    transactionsSurface.getByText(pendingTabName).first(),
    page.getByRole('button', { name: pendingTabName }),
    transactionsSurface.getByRole('button', { name: pendingTabName }),
    page.getByText(pendingTabName).first(),
    transactionsSurface.getByRole('tab', { name: pendingTabName }),
    page.getByRole('tab', { name: pendingTabName })
  ];
}

export function qashTransactionsAccountTabLocators(page: Page, accountName: string) {
  const accountNamePattern = exactTextPattern(accountName);
  const transactionsSurface = page.locator('main, [role=main]');

  return [
    page.getByRole('button', { name: accountNamePattern }).first(),
    transactionsSurface.getByRole('tab', { name: accountNamePattern }).first(),
    transactionsSurface.getByRole('button', { name: accountNamePattern }).first(),
    page.locator(
      `xpath=//*[normalize-space(.)=${xpathLiteral(accountName)}]/ancestor::button[1]`
    ),
    transactionsSurface.locator(
      `xpath=//*[normalize-space(.)=${xpathLiteral(accountName)}][self::button or @role="tab" or @role="button" or contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ")][1]`
    ),
    page.locator(
      `xpath=//*[normalize-space(.)="Transactions"]/following::button[normalize-space(.)=${xpathLiteral(accountName)}][1]`
    ),
    transactionsSurface.getByText(accountNamePattern).first()
  ];
}

export function qashPendingFaucetReceiveReadyLocators(page: Page) {
  const qashAmountPattern = /\b(?:100(?:\.0+)?|[1-9]\d*(?:\.\d+)?)\s*QASH\b/i;

  return [
    page.getByText(/QASH Faucet/i).first(),
    page.getByText(qashAmountPattern).first(),
    page.getByRole('button', { name: /^Claim$/i }).first()
  ];
}

export function qashPendingReceiveReadyLocators(page: Page, expectedAmount?: string) {
  const transactionsSurface = page.locator('main, [role=main]');
  const amountPattern = expectedAmount ? qashAmountPattern(expectedAmount) : /\b[1-9]\d*(?:\.\d+)?\s*QASH\b/i;

  return [
    transactionsSurface.getByText(amountPattern).first(),
    transactionsSurface.getByRole('button', { name: /^Claim$/i }).first()
  ];
}

export function qashPendingFaucetReceiveClaimLocators(page: Page) {
  return qashPendingReceiveClaimLocators(page);
}

export function qashPendingReceiveClaimLocators(page: Page) {
  const transactionsSurface = page.locator('main, [role=main]');

  return [
    transactionsSurface.getByRole('button', { name: /^Claim$/i }).first(),
    page.getByRole('button', { name: /^Claim$/i }).first()
  ];
}

export function qashPendingReceiveSignLocators(page: Page) {
  return qashPendingTransactionSignLocators(page);
}

export function qashPendingFaucetReceiveSignLocators(page: Page) {
  return qashPendingTransactionSignLocators(page);
}

export function qashPendingTransactionSignLocators(page: Page) {
  const transactionsSurface = page.locator('main, [role=main]');

  return [
    transactionsSurface.getByRole('button', { name: /^Sign$/i }).first(),
    page.getByRole('button', { name: /^Sign$/i }).first()
  ];
}

export function qashPendingFaucetReceiveExecuteLocators(page: Page) {
  return qashPendingTransactionExecuteLocators(page);
}

export function qashPendingReceiveExecuteLocators(page: Page) {
  return qashPendingTransactionExecuteLocators(page);
}

export function qashPendingTransactionExecuteLocators(page: Page) {
  const transactionsSurface = page.locator('main, [role=main]');

  return [
    transactionsSurface.getByRole('button', { name: /^Execute$/i }).first(),
    page.getByRole('button', { name: /^Execute$/i }).first()
  ];
}

export function qashPendingFaucetReceiveProcessingLocators(page: Page) {
  return qashPendingTransactionProcessingLocators(page);
}

export function qashPendingReceiveProcessingLocators(page: Page) {
  return qashPendingTransactionProcessingLocators(page);
}

export function qashPendingTransactionProcessingLocators(page: Page) {
  return [
    page.getByText(/processing your action/i).first(),
    page.getByText(/interacting with blockchain/i).first()
  ];
}

export function qashContactBookReadyLocators(page: Page) {
  return [
    page.getByRole('heading', { name: /^Contact Book$/i }),
    page.getByRole('button', { name: /add contact/i }),
    page.getByText(/^Employee$/i).first(),
    page.getByText(/^Client$/i).first(),
    page.getByText(/^All groups$/i).first(),
    page.getByText(/0 contacts/i).first(),
    page.getByText(/no results found/i).first()
  ];
}

export function qashContactBookClientTabLocators(page: Page) {
  return [
    page.locator('xpath=//*[normalize-space(.)="Contact Book"]/following::*[normalize-space(.)="Client"][1]'),
    page.getByText(/^Client$/i).first()
  ];
}

export function qashPayrollReadyLocators(page: Page) {
  return [
    page.getByText(/^Payroll$/i).last(),
    page.getByRole('button', { name: /^Wallet New payroll$/i }),
    page.getByText(/^Overview$/i).first(),
    page.getByText(/create payroll for your employees/i).first(),
    page.getByRole('columnheader', { name: /^Employee name$/i }),
    page.getByRole('columnheader', { name: /^Group$/i }),
    page.getByRole('columnheader', { name: /^Amount$/i }),
    page.getByRole('columnheader', { name: /^Payday$/i }),
    page.getByRole('columnheader', { name: /^Contract Term$/i }),
    page.getByRole('columnheader', { name: /^Actions$/i }),
    page.getByPlaceholder(/search by name/i)
  ];
}

export function qashPayrollNewStartLocators(page: Page) {
  const payrollSurface = page.locator('main, [role=main]');

  return [
    page.getByRole('button', { name: /^Wallet New payroll$/i }),
    payrollSurface.getByRole('button', { name: /^New payroll$/i }),
    payrollSurface.getByText(/^New payroll$/i).last(),
    page.getByRole('button', { name: /^New payroll$/i })
  ];
}

export function qashPayrollFormReadyLocators(page: Page) {
  return [
    page.getByText(/^Create new payroll$/i).last(),
    page.getByText(/^Basic Information$/i).first(),
    page.getByText(/^Select employee$/i).first(),
    page.getByText(/^Select network$/i).first(),
    page.getByText(/^Select token$/i).first(),
    page.getByText(/^Wallet address$/i).first(),
    page.getByText(/^Contract Term$/i).first(),
    page.getByText(/^Amount \(Monthly\)$/i).first(),
    page.getByText(/^Scheduled pay date$/i).first(),
    page.getByText(/^Item description$/i).first(),
    page.getByText(/^Note \(Optional\)$/i).first(),
    page.getByRole('button', { name: /^Create now$/i })
  ];
}

export function qashPayrollEmployeeSelectLocators(page: Page) {
  return payrollDropdownLocators(page, 'Select employee');
}

export function qashPayrollNetworkSelectLocators(page: Page) {
  return payrollDropdownLocators(page, 'Select network');
}

export function qashPayrollTokenSelectLocators(page: Page) {
  return payrollDropdownLocators(page, 'Select token');
}

export function qashPayrollEmployeeOptionLocators(page: Page, employeeName: string) {
  const employeePattern = exactTextPattern(employeeName);
  const employeeContainsPattern = containsTextPattern(employeeName);
  return [
    page
      .locator(
        `xpath=//*[contains(normalize-space(.), ${xpathLiteral(employeeName)})]/ancestor::*[@role="button" or contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ")][1]`
      )
      .first(),
    page.getByRole('option', { name: employeePattern }).first(),
    page.getByRole('menuitem', { name: employeePattern }).first(),
    page.locator('[role="listbox"], [role="menu"]').getByText(employeePattern).first(),
    page.getByText(employeeContainsPattern).last()
  ];
}

export function qashPayrollNetworkOptionLocators(page: Page, networkName: string) {
  return payrollOptionLocators(page, networkName);
}

export function qashPayrollTokenOptionLocators(page: Page, tokenName: string) {
  return tokenModalOptionLocators(page, tokenName);
}

export function qashPayrollWalletAddressInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/wallet address/i),
    page.getByLabel(/wallet address/i),
    page.locator('input[name="walletAddress"]').first(),
    page.locator('input[name="wallet_address"]').first(),
    inputAfterText(page, 'Wallet address')
  ];
}

export function qashPayrollDurationInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/duration/i),
    page.getByLabel(/^Duration$/i),
    page.locator('input[name="duration"]').first(),
    inputAfterText(page, 'Duration')
  ];
}

export function qashPayrollMonthlyAmountInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/amount/i),
    page.getByLabel(/amount/i),
    page.locator('input[name="amount"]').first(),
    page.locator('input[name="monthlyAmount"]').first(),
    inputAfterText(page, 'Amount (Monthly)')
  ];
}

export function qashPayrollScheduledPayDayLocators(page: Page, day: string) {
  const dayPattern = exactTextPattern(day);
  return [
    page.locator(`xpath=//*[normalize-space(.)="Scheduled pay date"]/following::button[normalize-space(.)=${xpathLiteral(day)}][1]`),
    page.getByRole('button', { name: dayPattern }).first()
  ];
}

export function qashPayrollItemDescriptionInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/item description|description/i),
    page.getByLabel(/item description/i),
    page.locator('input[name="itemDescription"]').first(),
    page.locator('textarea[name="itemDescription"]').first(),
    inputAfterText(page, 'Item description')
  ];
}

export function qashPayrollNoteInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/note/i),
    page.getByLabel(/note/i),
    page.locator('input[name="note"]').first(),
    page.locator('textarea[name="note"]').first(),
    inputAfterText(page, 'Note (Optional)')
  ];
}

export function qashPayrollCreateActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Create now$/i }),
    page.getByText(/^Create now$/i).last()
  ];
}

export function qashPayrollConfirmActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /confirm and create/i }),
    page.getByRole('button', { name: /^Confirm$/i }),
    page.getByRole('button', { name: /^Create payroll$/i }),
    page.getByRole('button', { name: /^Create$/i }),
    page.getByText(/^Confirm and create$/i).last()
  ];
}

export function qashPayrollReviewReadyLocators(page: Page, payroll: { employeeName: string }) {
  return [
    page.getByText(/^Review payroll$/i).first(),
    page.getByText(/review & confirm/i).first(),
    page.getByText(containsTextPattern(payroll.employeeName)).first(),
    page.getByRole('button', { name: /edit payroll/i }),
    page.getByRole('button', { name: /confirm and create/i })
  ];
}

export function qashPayrollCreatedOverviewLocators(
  page: Page,
  payroll: { employeeName: string; monthlyAmount: string }
) {
  const employeePattern = containsTextPattern(payroll.employeeName);
  const row = page
    .locator(
      `xpath=//*[self::tr or @role="row" or self::li or self::article or self::div][contains(normalize-space(.), ${xpathLiteral(payroll.employeeName)})][not(.//*[self::tr or @role="row" or self::li or self::article or self::div][contains(normalize-space(.), ${xpathLiteral(payroll.employeeName)})])]`
    )
    .first();

  return [
    page.getByRole('row', { name: employeePattern }).first(),
    row,
    page.getByText(/^Payroll$/i).last(),
    page.getByText(employeePattern).first(),
    page.getByText(containsTextPattern(`${payroll.monthlyAmount} QASH`)).first()
  ];
}

export function qashPayrollTransactionStateLocators(page: Page, payroll: { employeeName: string; itemDescription: string }) {
  return [
    page.getByText(/pending transactions/i).first(),
    page.getByRole('button', { name: /sign|execute/i }).first(),
    page.getByText(payroll.itemDescription, { exact: true }).first(),
    page.getByText(payroll.employeeName, { exact: true }).first(),
    page.getByText(/processing your action|interacting with blockchain/i).first()
  ];
}

export function qashInvoiceReadyLocators(page: Page) {
  return [
    page.getByText(/^Invoices$/i).first(),
    page.getByText(/^All invoices$/i).first(),
    page.getByText(/^Draft$/i).first(),
    page.getByText(/manage all the invoices/i).first()
  ];
}

export function qashInvoiceStateLocators(page: Page) {
  return [
    ...qashInvoiceCreateStartLocators(page),
    page.getByText(/you need to create a multisig account/i).first(),
    page.getByText(/no results found/i).first(),
    page.getByRole('columnheader', { name: /^Creation date$/i }),
    page.getByRole('columnheader', { name: /^Invoice$/i }),
    page.getByRole('columnheader', { name: /^Name$/i }),
    page.getByRole('columnheader', { name: /^Email$/i }),
    page.getByRole('columnheader', { name: /^Amount$/i }),
    page.getByRole('columnheader', { name: /^Due Date$/i }),
    page.getByRole('columnheader', { name: /^Status$/i }),
    page.getByRole('columnheader', { name: /^Actions$/i })
  ];
}

export function qashInvoiceCreateStartLocators(page: Page) {
  return [
    page.getByRole('button', { name: /create invoice/i }),
    page.getByText(/^Create invoice$/i).first()
  ];
}

export function qashInvoiceFormReadyLocators(page: Page) {
  return [
    page.getByText(/^Check your information$/i).first(),
    page.getByText(/^Name$/i).first(),
    page.getByText(/^Company name$/i).first(),
    page.getByText(/^Email$/i).first(),
    page.getByText(/^Invoice No$/i).first(),
    page.getByRole('button', { name: /^Next$/i })
  ];
}

export function qashInvoiceWizardNextLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Next$/i }).last(),
    page.getByText(/^Next$/i).last()
  ];
}

export function qashInvoiceRecipientFormReadyLocators(page: Page) {
  return [
    page.getByText(/^Who this invoice for\?$/i).first(),
    page.getByText(/^Company name$/i).first(),
    page.getByPlaceholder(/^Select contact$/i).first(),
    page.getByText(/^Email$/i).first(),
    page.getByRole('button', { name: /^Next$/i })
  ];
}

export function qashInvoiceClientSelectLocators(page: Page) {
  return [
    page.locator(
      'xpath=//input[@placeholder="Select contact"]/following::img[@alt="icon"][1]/ancestor::*[contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ")][1]'
    ),
    page.locator('xpath=//input[@placeholder="Select contact"]/following::img[@alt="icon"][1]'),
    page.locator(
      'xpath=//input[@placeholder="Select contact"]/following::*[contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ")][.//img[@alt="icon"]][1]'
    )
  ];
}

export function qashInvoiceClientPickerReadyLocators(page: Page) {
  return [
    page.getByText(/^Select client from contact$/i).first(),
    page.getByText(/^\d+\s+contacts$/i).first()
  ];
}

export function qashInvoiceNetworkSelectLocators(page: Page) {
  return invoiceReadonlyPickerLocators(page, 'Select network');
}

export function qashInvoiceTokenSelectLocators(page: Page) {
  return invoiceReadonlyPickerLocators(page, 'Select token');
}

export function qashInvoiceClientOptionLocators(page: Page, clientName: string) {
  const clientPattern = exactTextPattern(clientName);
  const clientContainsPattern = containsTextPattern(clientName);
  return [
    page
      .locator(
        `xpath=//*[contains(normalize-space(.), ${xpathLiteral(clientName)}) and contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ")]`
      )
      .first(),
    page
      .locator(
        `xpath=//*[contains(normalize-space(.), ${xpathLiteral(clientName)})]/ancestor::*[@role="button" or contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ")][1]`
      )
      .first(),
    page.getByRole('option', { name: clientPattern }).first(),
    page.getByRole('menuitem', { name: clientPattern }).first(),
    page.locator('[role="listbox"], [role="menu"]').getByText(clientPattern).first(),
    page.getByText(clientContainsPattern).last()
  ];
}

export function qashInvoiceDetailsFormReadyLocators(page: Page) {
  return [
    page.getByText(/^Invoice details$/i).first(),
    page.getByText(/^Invoice number$/i).first(),
    page.getByText(/^Due in$/i).first(),
    page.getByText(/^Receive payment in$/i).first(),
    page.getByPlaceholder(/^Select token$/i).first(),
    page.getByText(/^Network$/i).first(),
    page.getByPlaceholder(/^Select network$/i).first(),
    page.getByText(/^Add items$/i).first(),
    page.getByRole('button', { name: /add item/i }),
    page.getByPlaceholder(/^Add note$/i).first()
  ];
}

export function qashInvoiceAddItemActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /add item/i }),
    page.getByText(/^Add item$/i).last()
  ];
}

export function qashInvoiceDueDateSelectLocators(page: Page) {
  return [
    page.getByRole('button', { name: /due in/i }).first(),
    page.locator('xpath=//*[normalize-space(.)="Due in"]/ancestor::button[1]'),
    page.locator('xpath=//*[normalize-space(.)="Due in"]/following::*[normalize-space(.)="Select date"][1]')
  ];
}

export function qashInvoiceNetworkOptionLocators(page: Page, networkName: string) {
  return payrollOptionLocators(page, networkName);
}

export function qashInvoiceTokenOptionLocators(page: Page, tokenName: string) {
  return tokenModalOptionLocators(page, tokenName);
}

export function qashInvoiceWalletAddressInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/wallet address/i),
    page.getByLabel(/wallet address/i),
    page.locator('input[name="walletAddress"]').first(),
    page.locator('input[name="wallet_address"]').first(),
    inputAfterText(page, 'Wallet address')
  ];
}

export function qashInvoiceAmountInputLocators(page: Page) {
  return [
    page.locator(`xpath=//*[normalize-space(.)="Add items"]/following::input`).nth(1),
    page.getByPlaceholder(/price/i),
    page.getByLabel(/^Price$/i),
    page.locator('input[name="price"]').first(),
    inputAfterText(page, 'Price')
  ];
}

export function qashInvoiceDueDateInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/due date/i),
    page.getByLabel(/due date/i),
    page.locator('input[name="dueDate"]').first(),
    page.locator('input[name="due_date"]').first(),
    page.locator('input[type="date"]').first(),
    inputAfterText(page, 'Due Date')
  ];
}

export function qashInvoiceDueDateDayLocators(page: Page, day: string) {
  const dayPattern = exactTextPattern(day);
  return [
    page.locator(`xpath=//*[normalize-space(.)="Due Date"]/following::button[normalize-space(.)=${xpathLiteral(day)}][1]`),
    page.getByRole('button', { name: dayPattern }).first()
  ];
}

export function qashInvoiceItemDescriptionInputLocators(page: Page) {
  return [
    page.locator(`xpath=//*[normalize-space(.)="Add items"]/following::input`).first(),
    page.getByPlaceholder(/item description|description|item name|name/i),
    page.getByLabel(/item description|item name/i),
    page.locator('input[name="itemDescription"]').first(),
    page.locator('textarea[name="itemDescription"]').first(),
    page.locator('input[name="description"]').first(),
    inputAfterText(page, 'Item name'),
    inputAfterText(page, 'Item'),
    inputAfterText(page, 'Item description')
  ];
}

export function qashInvoiceNoteInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/note/i),
    page.getByLabel(/note/i),
    page.locator('input[name="note"]').first(),
    page.locator('textarea[name="note"]').first(),
    inputAfterText(page, 'Note (Optional)')
  ];
}

export function qashInvoiceCreateActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Create now$/i }),
    page.getByText(/^Create now$/i).last(),
    page.getByRole('button', { name: /^Next$/i }).last(),
    page.getByText(/^Next$/i).last()
  ];
}

export function qashInvoicePaymentDetailsReadyLocators(page: Page) {
  return [
    page.getByText(/^Payment details$/i).first(),
    page.getByText(/choose account you want to receive your funds/i).first(),
    page.getByText(/^Payment method$/i).first()
  ];
}

export function qashInvoicePaymentAccountOptionLocators(page: Page) {
  return [
    page
      .locator(
        'xpath=//*[normalize-space(.)="Payment details"]/following::button[.//*[contains(normalize-space(.), "0x")]][1]'
      )
      .first(),
    page.getByRole('button', { name: /0x[0-9a-f]+/i }).first()
  ];
}

export function qashInvoiceReviewReadyLocators(
  page: Page,
  invoice: { clientName: string; itemDescription: string; amount: string }
) {
  const reviewHeading = new RegExp(`${escapeRegExp(invoice.amount)}\\s+QASH\\s+to\\s+${escapeRegExp(invoice.clientName)}`, 'i');
  return [
    page.getByText(/^Send invoice for$/i).first(),
    page.getByRole('heading', { name: reviewHeading }).first(),
    page.getByText(invoice.clientName, { exact: true }).first(),
    page.getByText(invoice.itemDescription, { exact: true }).first(),
    page.getByRole('button', { name: /^Send Invoice$/i })
  ];
}

export function qashInvoiceConfirmActionLocators(page: Page) {
  return [
    page.locator('button').filter({ hasText: /^Send Invoice$/i }).last(),
    page.getByRole('button', { name: /^Send Invoice$/i }).last(),
    page.getByRole('button', { name: /^Confirm and create$/i }),
    page.getByText(/^Confirm and create$/i).last()
  ];
}

export function qashInvoiceViewCreatedActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /View Invoice/i }),
    page.getByText(/^View Invoice$/i).last()
  ];
}

export function qashInvoiceCreatedOverviewLocators(
  page: Page,
  invoice: { clientName: string; itemDescription: string; amount: string }
) {
  return [
    page.getByText(invoice.clientName, { exact: true }).first(),
    page.getByText(invoice.itemDescription, { exact: true }).first(),
    page.getByText(new RegExp(escapeRegExp(invoice.amount))).first()
  ];
}

export function qashInvoiceCreatedEvidenceLocators(
  page: Page,
  invoice: { clientName: string; amount: string }
) {
  const clientName = flexibleTextPattern(invoice.clientName);
  const amount = new RegExp(`\\b${escapeRegExp(invoice.amount)}\\b`, 'i');
  return [
    page.locator('tr').filter({ hasText: clientName }).filter({ hasText: amount }).first(),
    page.locator('[role="row"]').filter({ hasText: clientName }).filter({ hasText: amount }).first(),
    page.locator('body').filter({ hasText: clientName }).filter({ hasText: amount }).first()
  ];
}

export function qashInvoiceCreatedSuccessLocators(
  page: Page,
  invoice: { clientName: string; itemDescription: string; amount: string }
) {
  return [
    page.getByText(/^Invoice sent successfully$/i).first(),
    page.getByText(new RegExp(`Send invoice of\\s+${escapeRegExp(invoice.amount)}\\s+QASH\\s+has been sent`, 'i')).first(),
    page.getByText(invoice.clientName, { exact: true }).first(),
    page.getByText(invoice.itemDescription, { exact: true }).first(),
    page.getByRole('button', { name: /View Invoice/i }),
    page.getByRole('button', { name: /Copy Link/i }),
    page.getByText(new RegExp(`${escapeRegExp(invoice.amount)}\\s+QASH`, 'i')).first()
  ];
}

export function qashBillsReadyLocators(page: Page) {
  return [
    page.getByText(/^Bill$/i).first(),
    page.getByText(/^All bills$/i).first(),
    page.getByText(/^Overdue$/i).first(),
    page.getByText(/manage all the invoices you received from vendors, clients and employees/i).first()
  ];
}

export function qashBillsStateLocators(page: Page) {
  return [
    page.getByText(/you need to create a multisig account/i).first(),
    page.getByText(/no results found/i).first(),
    page.getByRole('columnheader', { name: /^Creation date$/i }),
    page.getByRole('columnheader', { name: /^Invoice$/i }),
    page.getByRole('columnheader', { name: /^Name$/i }),
    page.getByRole('columnheader', { name: /^Group$/i }),
    page.getByRole('columnheader', { name: /^Amount$/i }),
    page.getByRole('columnheader', { name: /^Due Date$/i }),
    page.getByRole('columnheader', { name: /^Status$/i }),
    page.getByRole('columnheader', { name: /^Actions$/i })
  ];
}

export function qashPaymentLinksReadyLocators(page: Page) {
  return [
    page.getByText(/^Payment Links$/i).first(),
    page.getByText(/^All payment links$/i).first(),
    page.getByText(/^Active links$/i).first(),
    page.getByText(/^Deactivated links$/i).first(),
    page.getByText(/^All links$/i).first(),
    page.getByText(/share these links for payments/i).first()
  ];
}

export function qashPaymentLinksStateLocators(page: Page) {
  return [
    ...qashPaymentLinkCreateStartLocators(page),
    page.getByText(/you need to create a multisig account/i).first(),
    page.getByText(/failed to load payment links/i).first(),
    page.getByText(/no results found/i).first(),
    page.getByRole('columnheader', { name: /^Link$/i }),
    page.getByRole('columnheader', { name: /^Title$/i }),
    page.getByRole('columnheader', { name: /^Timestamp$/i }),
    page.getByRole('columnheader', { name: /^Amount$/i }),
    page.getByRole('columnheader', { name: /^Status$/i }),
    page.getByRole('columnheader', { name: /^Action$/i })
  ];
}

export function qashPaymentLinkCreateStartLocators(page: Page) {
  return [
    page.getByRole('button', { name: /create payment link/i }),
    page.getByText(/^Create payment link$/i).first()
  ];
}

export function qashPaymentLinkFormReadyLocators(page: Page) {
  return [
    page.getByText(/^Create payment link$/i).first(),
    page.getByText(/^Title$/i).first(),
    page.getByText(/^Amount$/i).first(),
    page.getByRole('button', { name: /create|generate|save/i }).first()
  ];
}

export function qashPaymentLinkTitleInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/title|payment link title/i).first(),
    page.getByLabel(/^Title$/i).first(),
    page.locator('input[name="title"]').first(),
    inputAfterText(page, 'Title')
  ];
}

export function qashPaymentLinkAmountInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/amount/i).first(),
    page.getByLabel(/^Amount$/i).first(),
    page.locator('input[name="amount"]').first(),
    inputAfterText(page, 'Amount')
  ];
}

export function qashPaymentLinkDescriptionInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/description|note/i).first(),
    page.getByLabel(/description|note/i).first(),
    page.locator('textarea[name="description"]').first(),
    page.locator('input[name="description"]').first(),
    page.locator('textarea[name="note"]').first(),
    page.locator('input[name="note"]').first(),
    inputAfterText(page, 'Description'),
    inputAfterText(page, 'Note')
  ];
}

export function qashPaymentLinkNetworkReadyLocators(page: Page, networkName: string) {
  return [
    page.getByText(/^Accept payment on Miden Network$/i).first(),
    page
      .locator(
        `xpath=//*[normalize-space(.)="Network"]/following::*[normalize-space(.)=${xpathLiteral(networkName)}][1]`
      )
      .first(),
    page.getByText(exactTextPattern(networkName)).first()
  ];
}

export function qashPaymentLinkAccountOptionLocators(page: Page, accountName?: string) {
  const accountPattern = accountName ? containsTextPattern(accountName) : /0x[0-9a-f]+/i;
  return [
    ...(accountName
      ? [
          page.getByRole('button', { name: accountPattern }).first(),
          page
            .locator(
              `xpath=//*[normalize-space(.)="Accept payment on Miden Network"]/following::button[contains(normalize-space(.), ${xpathLiteral(accountName)})][1]`
            )
            .first()
        ]
      : []),
    page
      .locator(
        'xpath=//*[normalize-space(.)="Accept payment on Miden Network"]/following::button[.//*[contains(normalize-space(.), "0x")]][1]'
      )
      .first(),
    page.getByRole('button', { name: accountPattern }).first()
  ];
}

export function qashPaymentLinkNetworkSelectLocators(page: Page) {
  return invoiceReadonlyPickerLocators(page, 'Select network');
}

export function qashPaymentLinkNetworkOptionLocators(page: Page, networkName: string) {
  return payrollOptionLocators(page, networkName);
}

export function qashPaymentLinkTokenSelectLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Select token$/i }).first(),
    page
      .locator(
        'xpath=//*[normalize-space(.)="Accept payment on Miden Network"]/following::*[normalize-space(.)="Select token" and (self::button or contains(concat(" ", normalize-space(@class), " "), " cursor-pointer "))][1]'
      )
      .first(),
    page
      .locator(
        'xpath=//*[normalize-space(.)="Accept payment on Miden Network"]/following::*[normalize-space(.)="Select token"]/ancestor::*[self::button or contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ")][1]'
      )
      .first(),
    ...invoiceReadonlyPickerLocators(page, 'Select token')
  ];
}

export function qashPaymentLinkTokenOptionLocators(page: Page, tokenName: string) {
  return tokenModalOptionLocators(page, tokenName);
}

export function qashPaymentLinkCreateActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Create payment link$/i }),
    page.getByRole('button', { name: /^Generate link$/i }),
    page.getByRole('button', { name: /^Create now$/i }),
    page.getByText(/^Create payment link$/i).last(),
    page.getByText(/^Generate link$/i).last(),
    page.getByText(/^Create now$/i).last()
  ];
}

export function qashPaymentLinkCreatedOverviewLocators(
  page: Page,
  paymentLink: { title: string; amount: string }
) {
  return [
    page.getByText(paymentLink.title, { exact: true }).first(),
    page.getByText(new RegExp(escapeRegExp(paymentLink.amount))).first(),
    page.getByText(/active|deactivated/i).first()
  ];
}

export function qashPublicPaymentLinkReadyLocators(
  page: Page,
  paymentLink: { title: string; amount: string }
) {
  return [
    page.getByText(/^Payment Link$/i).first(),
    page.getByText(paymentLink.title, { exact: true }).first(),
    page.getByText(qashAmountPattern(paymentLink.amount)).first(),
    page.getByText(/^Transfer Details$/i).first(),
    page.getByText(/^Total payable amount$/i).first()
  ];
}

export function qashPublicPaymentLinkConnectWalletLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Connect Wallet$/i }).first(),
    page.locator('button').filter({ hasText: /^Connect Wallet$/i }).first(),
    page.getByText(/^Connect Wallet$/i).last()
  ];
}

export function qashPublicPaymentLinkWalletOptionLocators(page: Page) {
  const walletModal = page.locator('.wallet-adapter-modal, [class*="wallet-adapter-modal"]').first();
  return [
    page.locator('button.wallet-adapter-button').filter({ hasText: /^Miden Wallet\s*Installed$/i }).first(),
    walletModal.locator('button.wallet-adapter-button').filter({ hasText: /^Miden Wallet\s*Installed$/i }).first(),
    page.locator('button.wallet-adapter-button').filter({ hasText: /^Miden Wallet$/i }).first(),
    walletModal.locator('button.wallet-adapter-button').filter({ hasText: /Miden Wallet/i }).first(),
    page.getByRole('button', { name: /^Miden Wallet\s*(?:Installed)?$/i }).first(),
    page.getByText(/^Miden Wallet$/i).first(),
    page
      .locator('xpath=//*[normalize-space(.)="Connect a Wallet"]/following::*[normalize-space(.)="Miden Wallet"][1]')
      .first(),
    page
      .locator(
        'xpath=//*[normalize-space(.)="Connect a Wallet"]/following::*[normalize-space(.)="Miden Wallet"][1]/ancestor::*[(self::button or @role="button" or contains(concat(" ", normalize-space(@class), " "), " wallet-adapter-button ") or contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ") or contains(@class, "rounded")) and not(.//*[normalize-space(.)="Social Account"])][1]'
      )
      .first(),
    page
      .locator('xpath=//*[normalize-space(.)="Connect Wallet"]/following::*[normalize-space(.)="Miden Wallet"][1]')
      .first(),
    page
      .locator(
        'xpath=//*[normalize-space(.)="Connect Wallet"]/following::*[normalize-space(.)="Miden Wallet"][1]/ancestor::*[(self::button or @role="button" or contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ") or contains(@class, "rounded")) and not(.//*[normalize-space(.)="Social Account"])][1]'
      )
      .first(),
    page
      .locator(
        'xpath=//*[normalize-space(.)="Miden Wallet" and not(.//*[normalize-space(.)="Social Account"])]/ancestor::*[.//img[contains(@src, "miden")] and not(.//*[normalize-space(.)="Social Account"])][1]'
      )
      .first()
  ];
}

export function qashPublicPaymentLinkSocialAccountOptionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Social Account$/i }).first(),
    page.locator('button').filter({ hasText: /^Social Account$/i }).first(),
    page
      .locator(
        'xpath=//*[normalize-space(.)="Social Account"]/ancestor::*[(self::button or @role="button" or contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ") or contains(@class, "rounded"))][1]'
      )
      .first(),
    page.getByText(/^Social Account$/i).first()
  ];
}

export function qashPublicPaymentLinkWalletInstallPromptLocators(page: Page) {
  return [
    page.getByRole('heading', { name: /^Discover Miden$/i }).first(),
    page.getByText(/install the miden wallet/i).first(),
    page.getByRole('link', { name: /available in the chrome web store/i }).first(),
    page.getByText(/available in the chrome web store/i).first()
  ];
}

export function qashPublicPaymentLinkPayActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Pay now$/i }).first(),
    page.locator('button').filter({ hasText: /^Pay now$/i }).first(),
    page.getByText(/^Pay now$/i).last()
  ];
}

export function qashPublicPaymentLinkSuccessLocators(
  page: Page,
  paymentLink: { title: string; amount: string }
) {
  return [
    page.getByText(/^Payment successful$/i).first(),
    page.getByText(new RegExp(`successfully sent\\s+${escapeRegExp(paymentLink.amount)}\\s+QASH`, 'i')).first(),
    page.getByText(paymentLink.title, { exact: true }).first()
  ];
}

export function qashTransactionsReadyLocators(page: Page) {
  return [
    page.getByText(/^Transactions$/i).first()
  ];
}

export function qashTransactionsStateLocators(page: Page) {
  return [
    page.getByText(/^Pending Transactions(?:\s+\d+)?$/i).first(),
    page.getByText(/^History$/i).first(),
    page.getByText(/^Receive(?:\s+\d+)?$/i).first(),
    page.getByText(/no multisig accounts found/i).first()
  ];
}

export function qashSettingsReadyLocators(page: Page) {
  return [
    page.getByRole('heading', { name: /^Settings$/i }),
    page.getByText(/^General$/i).first(),
    page.getByRole('heading', { name: /^Account$/i }),
    page.getByText(/^Company$/i).first(),
    page.getByText(/^Team$/i).first(),
    page.getByText(/^My team$/i).first(),
    page.getByText(/^Upload photo$/i).first(),
    page.getByText(/^Name$/i).first(),
    page.getByText(/^Email$/i).first(),
    page.getByText(/^Role$/i).first()
  ];
}

export function qashAddContactStartLocators(page: Page) {
  return [
    page.getByRole('button', { name: /add contact/i }),
    page.getByText(/^Add contact$/i).first()
  ];
}

export function qashAddContactFormLocators(page: Page) {
  return [
    page.getByText(/^Choose type$/i).first(),
    page.getByText(/^Employee$/i).last(),
    page.getByText(/^Client$/i).last()
  ];
}

export function qashContactTypeLocators(page: Page, type: 'Employee' | 'Client') {
  if (type === 'Employee') {
    return [
      page.getByText(/add your company's employees/i).first(),
      page.getByText(/^Employee$/i).last()
    ];
  }

  return [
    page.getByText(/add your clients/i).first(),
    page.getByText(/^Client$/i).last()
  ];
}

export function qashContactDetailsFormLocators(page: Page) {
  return [
    page.getByRole('heading', { name: /employee|client|contact/i }),
    page.getByText(/wallet address/i).first(),
    page.getByText(/email/i).first(),
    page.getByText(/group/i).first(),
    page.getByRole('button', { name: /save|add|create|confirm/i })
  ];
}

export function qashClientContactFormLocators(page: Page) {
  return [
    page.getByRole('heading', { name: /add new client/i }),
    page.getByText(/^Email$/i).first(),
    page.getByText(/^Company name$/i).first(),
    page.getByRole('button', { name: /^Save changes$/i })
  ];
}

export function qashClientContactEmailInputLocators(page: Page) {
  return [
    contactModalInputAt(page, 0),
    page.getByPlaceholder(/enter email/i),
    page.getByLabel(/^Email$/i),
    page.locator('input[type="email"]').first(),
    page.locator('input[name="email"]').first()
  ];
}

export function qashClientCompanyNameInputLocators(page: Page) {
  return [
    contactModalInputAt(page, 1),
    page.getByPlaceholder(/enter company name/i),
    page.getByLabel(/company name/i),
    page.locator('input[name="companyName"]').first(),
    page.locator('input[name="company_name"]').first(),
    page.locator('input[name="name"]').first()
  ];
}

export function qashContactNameInputLocators(page: Page) {
  return [
    contactModalInputAt(page, 0),
    page.getByPlaceholder(/enter contact name/i),
    page.getByLabel(/^Name$/i),
    page.locator('input[name="name"]').first()
  ];
}

export function qashContactEmailInputLocators(page: Page) {
  return [
    contactModalInputAt(page, 1),
    page.getByPlaceholder(/enter email/i),
    page.getByLabel(/^Email$/i),
    page.locator('input[type="email"]').first(),
    page.locator('input[name="email"]').first()
  ];
}

export function qashContactWalletAddressInputLocators(page: Page) {
  return [
    contactModalInputAt(page, 2),
    page.getByPlaceholder(/enter wallet address/i),
    page.getByLabel(/wallet address/i),
    page.locator('input[name="walletAddress"]').first(),
    page.locator('input[name="wallet_address"]').first()
  ];
}

export function qashContactGroupSelectLocators(page: Page) {
  return [
    page.getByRole('button', { name: /select group|select a group/i }),
    page.getByText(/^Select a group$/i).first()
  ];
}

export function qashContactGroupCreateStartLocators(page: Page) {
  return [
    page.getByRole('button', { name: /add group|create group|new group/i }),
    page.locator('xpath=//*[normalize-space(.)="All groups"]/following::img[contains(@src, "plus-icon")][1]')
  ];
}

export function qashContactGroupFormReadyLocators(page: Page) {
  return [
    page.getByText(/add group|create group|new group/i).first(),
    page.getByText(/group name|name/i).first(),
    page.getByRole('button', { name: /confirm|create|save|add/i })
  ];
}

export function qashContactGroupNameInputLocators(page: Page) {
  return [
    page.getByPlaceholder(/enter group name/i),
    page.getByLabel(/group name|name/i),
    page.locator('input[name="groupName"]').first(),
    page.locator('input[name="group_name"]').first(),
    page.locator('input[name="name"]').last()
  ];
}

export function qashContactGroupConfirmActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Confirm$/i }),
    page.getByRole('button', { name: /^Create$/i }),
    page.getByRole('button', { name: /^Save$/i }),
    page.getByRole('button', { name: /^Add$/i })
  ];
}

export function qashContactGroupCreatedLocators(page: Page, groupName: string) {
  return [
    page.getByText(groupName, { exact: true }),
    page.getByRole('button', { name: exactTextPattern(groupName) })
  ];
}

export function qashContactGroupOptionLocators(page: Page, groupName?: string) {
  const optionPattern = groupName ? exactTextPattern(groupName) : /^(?!Select a group$).+/i;
  const activeModal = page.locator('[role="dialog"], div.fixed.inset-0').last();

  return [
    ...(groupName
      ? [
          page
            .locator(
              `xpath=//*[normalize-space(.)="Add a new group"]/preceding::*[normalize-space(.)=${xpathLiteral(groupName)}][1]`
            )
            .first()
        ]
      : []),
    activeModal.getByRole('option', { name: optionPattern }).first(),
    activeModal.getByRole('menuitem', { name: optionPattern }).first(),
    activeModal.locator('[role="listbox"], [role="menu"]').getByText(optionPattern).first(),
    activeModal.getByText(optionPattern).last()
  ];
}

export function qashContactConfirmActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Confirm$/i }),
    page.getByText(/^Confirm$/i).last()
  ];
}

export function qashClientContactSaveActionLocators(page: Page) {
  return [
    page.getByRole('button', { name: /^Save changes$/i }),
    page.getByText(/^Save changes$/i).last()
  ];
}

export function qashCreatedContactLocators(
  page: Page,
  contact: { name: string; email: string; groupName?: string }
) {
  const requiredTextPredicates = [
    `contains(normalize-space(.), ${xpathLiteral(contact.name)})`,
    `contains(normalize-space(.), ${xpathLiteral(contact.email)})`,
    ...(contact.groupName ? [`contains(normalize-space(.), ${xpathLiteral(contact.groupName)})`] : [])
  ];
  const rowContainerPredicate = 'self::tr or @role="row" or self::li or self::article or self::div';
  const rowPredicate = requiredTextPredicates.join(' and ');
  const rowLocator = page
    .locator(
      `xpath=//*[${rowContainerPredicate}][${rowPredicate}][not(.//*[${rowContainerPredicate}][${rowPredicate}])]`
    )
    .first();

  return [
    rowLocator,
    page.getByText(contact.name, { exact: true }),
    page.getByText(contact.email, { exact: true }),
    ...(contact.groupName ? [page.getByText(contact.groupName, { exact: true })] : [])
  ];
}

function exactTextPattern(value: string): RegExp {
  return new RegExp(`^${escapeRegExp(value)}$`, 'i');
}

function qashAmountPattern(value: string): RegExp {
  const parsed = Number(value);
  const variants = new Set([value.trim()]);
  if (Number.isFinite(parsed)) {
    variants.add(String(parsed));
    variants.add(parsed.toFixed(2));
  }
  const alternatives = [...variants].filter(Boolean).map(escapeRegExp);
  return new RegExp(`\\b(?:${alternatives.join('|')})\\s*QASH\\b`, 'i');
}

function containsTextPattern(value: string): RegExp {
  return new RegExp(escapeRegExp(value), 'i');
}

function inputAfterText(page: Page, label: string) {
  return page.locator(`xpath=//*[normalize-space(.)=${xpathLiteral(label)}]/following::input[1]`);
}

function contactModalInputAt(page: Page, index: number) {
  return page.locator('[role="dialog"], div.fixed.inset-0').last().locator('input').nth(index);
}

function payrollDropdownLocators(page: Page, label: string) {
  const labelPattern = exactTextPattern(label);

  return [
    page.getByText(labelPattern).first(),
    page.locator(`xpath=//*[normalize-space(.)=${xpathLiteral(label)}][@role="button" or @role="combobox"][1]`),
    page.locator(
      `xpath=//*[normalize-space(.)=${xpathLiteral(label)}][contains(@class, "cursor-pointer") or .//img[contains(@src, "chevron")]][1]`
    ),
    page.getByRole('button', { name: labelPattern }),
    page.getByRole('combobox', { name: labelPattern })
  ];
}

function invoiceReadonlyPickerLocators(page: Page, placeholder: string) {
  return [
    page.locator(`xpath=//input[@placeholder=${xpathLiteral(placeholder)}]/following::img[@alt="icon"][1]`),
    page.locator(`xpath=//input[@placeholder=${xpathLiteral(placeholder)}]/ancestor::*[contains(@class, "border")][1]`),
    page.getByPlaceholder(exactTextPattern(placeholder)).first()
  ];
}

function tokenModalOptionLocators(page: Page, tokenName: string) {
  const tokenPattern = exactTextPattern(tokenName);
  return [
    page
      .locator(
        `xpath=//div[contains(concat(" ", normalize-space(@class), " "), " fixed ") and .//*[normalize-space(.)="Select token"]]//*[normalize-space(.)=${xpathLiteral(tokenName)}]/ancestor::*[contains(concat(" ", normalize-space(@class), " "), " rounded-lg ") or contains(concat(" ", normalize-space(@class), " "), " rounded-xl ") or contains(concat(" ", normalize-space(@class), " "), " cursor-pointer ")][1]`
      )
      .first(),
    page
      .locator(
        `xpath=//*[normalize-space(.)="Select token"]/following::*[normalize-space(.)=${xpathLiteral(tokenName)}][1]/ancestor::*[contains(concat(" ", normalize-space(@class), " "), " border ")][1]`
      )
      .first(),
    page.getByRole('dialog').getByText(tokenPattern).first(),
    page.getByRole('option', { name: tokenPattern }).first(),
    page.getByRole('menuitem', { name: tokenPattern }).first()
  ];
}

function payrollOptionLocators(page: Page, optionName: string) {
  const optionPattern = containsTextPattern(optionName);
  return [
    page.getByRole('option', { name: optionPattern }).first(),
    page.getByRole('menuitem', { name: optionPattern }).first(),
    page.locator('[role="listbox"], [role="menu"]').getByText(optionPattern).first(),
    page.getByText(optionPattern).last()
  ];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function flexibleTextPattern(value: string): RegExp {
  return new RegExp(escapeRegExp(value).replace(/\s+/g, '\\s+'), 'i');
}

function xpathLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat(${value.split("'").map(part => `'${part}'`).join(`, "'", `)})`;
}
