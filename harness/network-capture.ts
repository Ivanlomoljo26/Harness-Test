import type { BrowserContext, ConsoleMessage, Page, Request } from '@playwright/test';

import type { TimelineRecorder } from './timeline-recorder';

const MIDEN_URL_PATTERN = /miden|rpc\.|tx-prover|transport|localhost:(57291|57292|50051)/i;

export function attachPageDiagnostics(page: Page, source: string, timeline: TimelineRecorder): void {
  page.on('console', (message: ConsoleMessage) => {
    timeline.emit({
      category: 'browser_console',
      severity: consoleSeverity(message.type()),
      source,
      message: `[${source}] ${message.type()}: ${message.text()}`,
      data: {
        type: message.type(),
        text: message.text(),
        location: message.location(),
        url: page.url()
      }
    });
  });

  page.on('pageerror', error => {
    timeline.emit({
      category: 'browser_console',
      severity: 'error',
      source,
      message: `[${source}] uncaught: ${error.message}`,
      data: {
        name: error.name,
        stack: error.stack,
        url: page.url()
      }
    });
  });
}

export function attachContextNetworkDiagnostics(context: BrowserContext, source: string, timeline: TimelineRecorder): void {
  context.on('requestfinished', async (request: Request) => {
    if (!shouldCaptureRequest(request.url())) return;
    const response = await request.response();
    const status = response?.status() ?? 0;
    timeline.emit({
      category: 'network_request',
      severity: status >= 400 ? 'error' : 'info',
      source,
      message: `${request.method()} ${request.url()} -> ${status}`,
      data: {
        url: request.url(),
        method: request.method(),
        status,
        timing: request.timing()
      }
    });
  });

  context.on('requestfailed', request => {
    if (!shouldCaptureRequest(request.url())) return;
    timeline.emit({
      category: 'network_request',
      severity: 'error',
      source,
      message: `FAILED ${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown'}`,
      data: {
        url: request.url(),
        method: request.method(),
        failureText: request.failure()?.errorText
      }
    });
  });
}

function shouldCaptureRequest(url: string): boolean {
  return MIDEN_URL_PATTERN.test(url) || url.includes('zoroswap') || url.includes('qash');
}

function consoleSeverity(type: string): 'debug' | 'info' | 'warn' | 'error' {
  if (type === 'error') return 'error';
  if (type === 'warning') return 'warn';
  if (type === 'debug') return 'debug';
  return 'info';
}
