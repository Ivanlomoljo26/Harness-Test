import type { FailureCategory, FailureReport } from './types';

export function classifyError(error: unknown): FailureCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const stack = error instanceof Error ? error.stack?.toLowerCase() ?? '' : '';

  if (message.includes('returned http') || message.includes('app availability')) {
    return 'app_availability_issue';
  }
  if (message.includes('network mismatch') || message.includes('wrong app network')) {
    return 'app_network_mismatch';
  }
  if (message.includes('wallet') && (message.includes('connect') || message.includes('permission'))) {
    return 'wallet_connection_issue';
  }
  if (message.includes('transaction') || message.includes('approval') || message.includes('pending')) {
    return 'wallet_transaction_issue';
  }
  if (message.includes('net::') || message.includes('econn') || message.includes('rpc') || message.includes('fetch')) {
    return 'network_rpc_node_issue';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout_latency_issue';
  }
  if (message.includes('authenticated profile') || message.includes('not logged in')) {
    return 'test_setup_issue';
  }
  if (message.includes('selector') || message.includes('locator') || stack.includes('@playwright/test')) {
    return 'app_ui_issue';
  }
  if (message.includes('configuration') || message.includes('env') || message.includes('manifest')) {
    return 'test_setup_issue';
  }
  return 'unknown_needs_manual_investigation';
}

export function computeDiagnosticHints(report: FailureReport): string[] {
  const hints: string[] = [];

  if (report.failureCategory === 'app_ui_issue') {
    hints.push('APP_UI: The app page did not reach the expected UI state. Check screenshots, app console errors, and whether selectors still match the app.');
  }

  if (report.failureCategory === 'app_availability_issue') {
    hints.push('APP_AVAILABILITY: The app URL did not load successfully. Verify the app deployment, route, auth gate, and CDN/backend status before changing wallet code.');
  }

  if (report.failureCategory === 'app_network_mismatch') {
    hints.push('APP_NETWORK: The app loaded, but its visible/runtime network does not match E2E_NETWORK. Use a network-specific app URL or fix the deployment configuration.');
  }

  if (report.failureCategory === 'wallet_connection_issue') {
    hints.push('WALLET_CONNECTION: The app did not complete wallet permission flow. Check dApp bridge events and wallet confirmation screenshots.');
  }

  if (report.failureCategory === 'wallet_transaction_issue') {
    hints.push('WALLET_TRANSACTION: A wallet approval, pending transaction, consuming note, or completion state failed. Inspect wallet snapshots and transaction artifacts.');
  }

  if (report.networkErrors.length > 0) {
    hints.push(`NETWORK: ${report.networkErrors.length} failed network event(s) were captured. Check RPC/prover/transport availability for ${report.network}.`);
  }

  if (report.consoleErrors.length > 0) {
    hints.push(`CONSOLE: ${report.consoleErrors.length} browser console error(s) were captured. Check console artifacts before changing selectors.`);
  }

  if (report.failureCategory === 'timeout_latency_issue') {
    hints.push('TIMEOUT: Distinguish a true stuck state from slow testnet latency. Review timeline polling events and transaction status snapshots.');
  }

  if (report.failureCategory === 'test_setup_issue') {
    hints.push('SETUP: Validate WALLET_EXTENSION_PATH, WALLET_PASSWORD, TEST_ACCOUNT_SEED or WALLET_USER_DATA_DIR, app URL, E2E_NETWORK, and prepared app auth profiles.');
  }

  if (hints.length === 0) {
    hints.push('UNKNOWN: No diagnostic pattern matched. Start with report.json, timeline.ndjson, screenshots, and traces.');
  }

  return hints;
}
