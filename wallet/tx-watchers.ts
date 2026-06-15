import type { Page } from '@playwright/test';

import type { TimelineRecorder } from '../harness/timeline-recorder';

export interface DappTransactionStatus {
  status: 'pending' | 'consuming' | 'failed' | 'committed' | 'timeout' | 'unknown';
  transactionId?: string;
  noteIds?: string[];
  observedText?: string;
}

export async function waitForAppTransactionStatus(
  page: Page,
  timeline: TimelineRecorder,
  timeoutMs: number
): Promise<DappTransactionStatus> {
  const deadline = Date.now() + timeoutMs;
  let lastText = '';

  while (Date.now() < deadline) {
    lastText = ((await page.locator('body').textContent().catch(() => '')) ?? '').slice(0, 2_000);
    const lower = lastText.toLowerCase();
    const txId = lastText.match(/\b(?:tx|transaction)[\s:#-]*([a-f0-9]{16,})\b/i)?.[1];
    const noteIds = Array.from(lastText.matchAll(/\b(?:note)[\s:#-]*([a-f0-9]{16,})\b/gi)).map(match => match[1] ?? '');

    if (/failed|error|rejected/.test(lower)) return statusResult('failed', txId, noteIds, lastText);
    if (/consuming|consume/.test(lower)) {
      timeline.emit({ category: 'wallet_transaction', severity: 'info', message: 'App shows consuming state' });
      return statusResult('consuming', txId, noteIds, lastText);
    }
    if (/success|complete|completed|confirmed|committed/.test(lower)) {
      return statusResult('committed', txId, noteIds, lastText);
    }
    if (/pending|processing|submitting|waiting/.test(lower)) {
      timeline.emit({ category: 'wallet_transaction', severity: 'info', message: 'App transaction still pending' });
    }

    await page.waitForTimeout(2_500);
  }

  return { status: 'timeout', observedText: lastText };
}

function statusResult(
  status: DappTransactionStatus['status'],
  transactionId: string | undefined,
  noteIds: string[],
  observedText: string
): DappTransactionStatus {
  const result: DappTransactionStatus = { status, observedText };
  if (transactionId) result.transactionId = transactionId;
  if (noteIds.length > 0) result.noteIds = noteIds;
  return result;
}
