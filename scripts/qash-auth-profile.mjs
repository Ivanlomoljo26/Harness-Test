import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const qashAuthenticatedSurfacePattern =
  /tell us about your company|wallet created|qash x para wallet|total treasury balance|upcoming payroll|money in & money out|all accounts/i;

export function resolveQashAuthProfileDir(profileDirArg) {
  return path.resolve(
    profileDirArg ||
      process.env.QASH_AUTH_USER_DATA_DIR ||
      process.env.APP_AUTH_USER_DATA_DIR ||
      path.resolve(process.cwd(), '.auth/qash')
  );
}

export function resolveQashUrl() {
  return process.env.QASH_URL_TESTNET || process.env.QASH_URL || 'https://app.qash.finance/';
}

export function resolveQashAuthPreflightTimeoutMs() {
  const parsed = Number(process.env.QASH_AUTH_PREFLIGHT_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 45_000;
}

export function resolveQashAuthAutoLoginTimeoutMs() {
  const parsed = Number(process.env.QASH_AUTH_AUTO_LOGIN_TIMEOUT_MS || process.env.QASH_AUTH_RECOVERY_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120_000;
}

export function isQashAuthProfilePreflightEnabled() {
  return !/^(?:0|false|no|off)$/i.test(process.env.QASH_AUTH_PREFLIGHT ?? 'true');
}

export function isQashAuthAutoLoginEnabled() {
  return !/^(?:0|false|no|off|never)$/i.test(process.env.QASH_AUTH_AUTO_LOGIN ?? 'true');
}

export function shouldAutoPrepareQashAuthProfile() {
  const override = process.env.QASH_AUTH_AUTO_PREP;
  if (/^(?:1|true|yes|on|always)$/i.test(override ?? '')) return true;
  if (/^(?:0|false|no|off|never)$/i.test(override ?? '')) return false;

  return process.env.CI !== 'true' && process.env.HEADLESS === 'false';
}

export async function probeQashApiAuth(page) {
  return page.evaluate(async () => {
    const response = await fetch('https://api.qash.finance/auth/me', { credentials: 'include' });
    const body = await response.text();
    return { status: response.status, body: body.slice(0, 500) };
  }).catch(error => ({
    status: 'ERR',
    body: error instanceof Error ? error.message : String(error)
  }));
}

export async function isQashApiAuthenticated(page) {
  const probe = await probeQashApiAuth(page);
  return typeof probe.status === 'number' && probe.status >= 200 && probe.status < 300;
}

export async function verifyQashAuthProfile({ profileDir, qashUrl = resolveQashUrl(), timeoutMs = 45_000 }) {
  fs.mkdirSync(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(qashUrl, { waitUntil: 'domcontentloaded' });

    const found = await waitForQashAuthenticatedSurface(context, timeoutMs);
    await context.storageState({ path: path.join(profileDir, 'storage-state.json') }).catch(() => undefined);
    return found;
  } finally {
    await context.close();
  }
}

export async function recoverQashAuthProfile({
  profileDir = resolveQashAuthProfileDir(),
  qashUrl = resolveQashUrl(),
  timeoutMs = resolveQashAuthAutoLoginTimeoutMs(),
  headless = process.env.HEADLESS !== 'false'
} = {}) {
  fs.mkdirSync(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    headless,
    args: [
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(qashUrl, { waitUntil: 'domcontentloaded' });
    await waitForQashAuthEntryPoint(context, page, Math.min(timeoutMs, 45_000));

    if (await waitForQashAuthenticatedSurface(context, 5_000)) {
      await saveQashAuthStorageState(context, profileDir);
      return { ok: true, mode: 'already-authenticated' };
    }

    const clicked = await clickQashContinueByEmail(page);
    if (!clicked) {
      return {
        ok: false,
        reason: `Qash Continue by email was not visible. ${await summarizeQashAuthPages(context)}`
      };
    }

    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);

    if (await waitForQashAuthenticatedSurface(context, timeoutMs)) {
      await saveQashAuthStorageState(context, profileDir);
      return { ok: true, mode: 'continue-by-email' };
    }

    return {
      ok: false,
      reason: `Qash did not reach an authenticated dashboard/onboarding surface after Continue by email. ${await summarizeQashAuthPages(context)}`
    };
  } finally {
    await context.close();
  }
}

export function openStandaloneQashProfile({ profileDir, qashUrl = resolveQashUrl() }) {
  const executablePath = process.env.QASH_PROFILE_CHROMIUM_EXECUTABLE || chromium.executablePath();
  const args = [
    '--new-window',
    '--no-first-run',
    '--no-default-browser-check',
    '--password-store=basic',
    `--user-data-dir=${profileDir}`,
    qashUrl
  ];

  console.log(`Opening standalone Chromium: ${executablePath}`);
  console.log('Complete Qash/Para login manually in that window, then close Chromium so this helper can verify the profile.');

  return spawnSync(executablePath, args, {
    stdio: 'inherit',
    env: process.env
  });
}

export async function waitForQashAuthenticatedSurface(browserContext, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const candidate of browserContext.pages()) {
      const text = await candidate.locator('body').innerText({ timeout: 1_000 }).catch(() => '');
      if (qashAuthenticatedSurfacePattern.test(text) && await isQashApiAuthenticated(candidate)) {
        return true;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2_000));
  }
  return false;
}

async function clickQashContinueByEmail(page) {
  const candidates = [
    page.getByRole('button', { name: /continue by email/i }).first(),
    page.getByText(/continue by email/i).first()
  ];

  for (const candidate of candidates) {
    if (await candidate.isVisible({ timeout: 20_000 }).catch(() => false)) {
      await candidate.click({ timeout: 10_000 });
      return true;
    }
  }

  return false;
}

async function waitForQashAuthEntryPoint(browserContext, page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const candidate of browserContext.pages()) {
      const text = await candidate.locator('body').innerText({ timeout: 1_000 }).catch(() => '');
      if (qashAuthenticatedSurfacePattern.test(text) || /continue by email/i.test(text)) return;
    }

    if (await page.getByRole('button', { name: /continue by email/i }).first().isVisible({ timeout: 500 }).catch(() => false)) {
      return;
    }

    await page.waitForLoadState('domcontentloaded', { timeout: 2_000 }).catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
}

async function saveQashAuthStorageState(browserContext, profileDir) {
  await browserContext.storageState({ path: path.join(profileDir, 'storage-state.json') }).catch(() => undefined);
}

async function summarizeQashAuthPages(browserContext) {
  const summaries = [];

  for (const page of browserContext.pages()) {
    const url = page.url();
    const text = await page.locator('body').innerText({ timeout: 1_000 }).catch(() => '');
    const blocker = [
      /password/i,
      /2-step verification/i,
      /verify it.?s you/i,
      /enter a code/i,
      /recovery/i
    ].some(pattern => pattern.test(text));
    summaries.push(
      [
        `url=${url || 'unknown'}`,
        blocker ? 'blocker=password-or-verification' : null,
        `body=${JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 240))}`
      ].filter(Boolean).join(' ')
    );
  }

  return summaries.length ? summaries.join(' | ') : 'No browser pages were available for diagnosis.';
}
