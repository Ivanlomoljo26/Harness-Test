import * as fs from 'node:fs';
import * as path from 'node:path';

import './load-env';
import { getAppConfig, type PioneerAppName } from './apps';
import { getEnvironmentConfig } from './environments';
import { detectWalletExtensionInfo, getNetworkSpecificWalletExtensionPath } from './wallet-extension-info';

export interface RuntimeConfig {
  appName: PioneerAppName;
  appUrl: string;
  network: ReturnType<typeof getEnvironmentConfig>;
  walletExtensionPath: string;
  walletExtensionId?: string;
  walletPassword: string;
  walletSetupMode: WalletSetupMode;
  testAccountSeed?: string[];
  walletUserDataDir?: string;
  appAuthUserDataDir?: string;
  appAuthCdpEndpoint?: string;
  keepBrowserOnFailure: boolean;
}

export type WalletSetupMode = 'create' | 'import' | 'profile';

export interface ValidationOptions {
  appName: PioneerAppName;
  requireWallet: boolean;
}

export function getRuntimeConfig(options: ValidationOptions): RuntimeConfig {
  const network = getEnvironmentConfig();
  const app = getAppConfig(options.appName, network.name);
  const walletExtensionPath = resolveWalletExtensionPath(network.name);
  const walletExtensionId = resolveWalletExtensionId(app);
  const appAuthUserDataDir = resolveAppAuthUserDataDir(app);
  const appAuthCdpEndpoint = resolveAppAuthCdpEndpoint(app);
  const walletUserDataDir = options.requireWallet && process.env.WALLET_USER_DATA_DIR
    ? path.resolve(process.env.WALLET_USER_DATA_DIR)
    : undefined;
  const testAccountSeed = options.requireWallet ? parseSeed(process.env.TEST_ACCOUNT_SEED) : undefined;
  const setupInput: { walletUserDataDir?: string; testAccountSeed?: string[] } = {};
  if (walletUserDataDir) setupInput.walletUserDataDir = walletUserDataDir;
  if (testAccountSeed) setupInput.testAccountSeed = testAccountSeed;
  const walletSetupMode = resolveWalletSetupMode(setupInput);

  const errors: string[] = [];

  if (options.requireWallet) {
    const manifestPath = path.join(walletExtensionPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      errors.push(
        `Wallet extension path must point to a built wallet extension with manifest.json. ` +
          `Current value: ${walletExtensionPath}. Build the wallet first, for example: ` +
          `yarn wallet:build:${network.name}, or set WALLET_EXTENSION_PATH_${network.name.toUpperCase()}.`
      );
    } else if (process.env.E2E_STRICT_WALLET_NETWORK !== 'false' && network.name !== 'localhost') {
      const extensionInfo = detectWalletExtensionInfo(walletExtensionPath);
      if (extensionInfo.detectedNetwork !== network.name) {
        errors.push(
          `Wallet extension network mismatch: E2E_NETWORK=${network.name}, but ${walletExtensionPath} appears to be ` +
            `${extensionInfo.detectedNetwork}. Build a network-specific extension with ` +
            `yarn wallet:build:${network.name}, or set WALLET_EXTENSION_PATH_${network.name.toUpperCase()}. ` +
            `Evidence: ${extensionInfo.evidence.join(', ') || 'no RPC endpoint marker found'}`
        );
      }
    }

    if (walletSetupMode === 'import' && !testAccountSeed) {
      errors.push(
        'WALLET_SETUP_MODE=import requires TEST_ACCOUNT_SEED.'
      );
    }

    if (walletSetupMode === 'profile' && !walletUserDataDir) {
      errors.push(
        'WALLET_SETUP_MODE=profile requires WALLET_USER_DATA_DIR.'
      );
    }

    if (walletUserDataDir && !fs.existsSync(walletUserDataDir)) {
      errors.push(`WALLET_USER_DATA_DIR does not exist: ${walletUserDataDir}`);
    }
  }

  if (process.env.E2E_REQUIRE_APP_AUTH_PROFILE === 'true' && !appAuthUserDataDir && !appAuthCdpEndpoint) {
    errors.push(
      `${app.envPrefix}_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, ` +
        `${app.envPrefix}_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required for authenticated ${app.displayName} runs.`
    );
  }

  if (appAuthUserDataDir && !appAuthCdpEndpoint && !fs.existsSync(appAuthUserDataDir)) {
    errors.push(`App auth user data dir does not exist: ${appAuthUserDataDir}`);
  }

  if (appAuthCdpEndpoint && !isHttpOrWsUrl(appAuthCdpEndpoint)) {
    errors.push(
      `${app.envPrefix}_AUTH_CDP_ENDPOINT or APP_AUTH_CDP_ENDPOINT must be an http(s) or ws(s) URL. ` +
        `Current value: ${appAuthCdpEndpoint}`
    );
  }

  if (options.requireWallet && !process.env.WALLET_PASSWORD) {
    errors.push('WALLET_PASSWORD is required.');
  }

  if (!app.url.startsWith('http://') && !app.url.startsWith('https://')) {
    errors.push(`${app.urlEnv} must be an absolute http(s) URL. Current value: ${app.url}`);
  }

  if (app.requiresNetworkUrl) {
    const genericNote = app.urlSource === 'generic-env'
      ? ` The generic ${app.urlEnv} is set to ${app.url}, but network parity requires ${app.networkUrlEnv}.`
      : '';
    errors.push(
      `${app.networkUrlEnv} is required for ${app.displayName} on ${network.name}. ` +
        `No source-backed default ${network.name} deployment is configured for this app, and the harness must not ` +
        `treat another network's URL as ${network.name} coverage.${genericNote}`
    );
  }

  if (errors.length > 0) {
    throw new Error(`Invalid Pioneer E2E configuration:\n- ${errors.join('\n- ')}`);
  }

  const config: RuntimeConfig = {
    appName: options.appName,
    appUrl: app.url,
    network,
    walletExtensionPath,
    walletPassword: process.env.WALLET_PASSWORD || '',
    walletSetupMode,
    keepBrowserOnFailure: process.env.E2E_KEEP_BROWSER_ON_FAILURE === 'true'
  };

  if (testAccountSeed) config.testAccountSeed = testAccountSeed;
  if (walletExtensionId) config.walletExtensionId = walletExtensionId;
  if (walletUserDataDir) config.walletUserDataDir = walletUserDataDir;
  if (appAuthUserDataDir) config.appAuthUserDataDir = appAuthUserDataDir;
  if (appAuthCdpEndpoint) config.appAuthCdpEndpoint = appAuthCdpEndpoint;

  return config;
}

function resolveWalletExtensionId(app: ReturnType<typeof getAppConfig>): string | undefined {
  const raw = process.env[`${app.envPrefix}_WALLET_EXTENSION_ID`] || process.env.WALLET_EXTENSION_ID;
  return raw?.trim() || undefined;
}

function resolveAppAuthUserDataDir(app: ReturnType<typeof getAppConfig>): string | undefined {
  const raw = process.env[`${app.envPrefix}_AUTH_USER_DATA_DIR`] || process.env.APP_AUTH_USER_DATA_DIR;
  return raw ? path.resolve(raw) : undefined;
}

function resolveAppAuthCdpEndpoint(app: ReturnType<typeof getAppConfig>): string | undefined {
  const raw = process.env[`${app.envPrefix}_AUTH_CDP_ENDPOINT`] || process.env.APP_AUTH_CDP_ENDPOINT;
  return raw?.trim() || undefined;
}

function isHttpOrWsUrl(value: string): boolean {
  return /^(https?|wss?):\/\//.test(value);
}

function resolveWalletExtensionPath(networkName: ReturnType<typeof getEnvironmentConfig>['name']): string {
  return (
    getNetworkSpecificWalletExtensionPath(networkName) ??
    path.resolve(process.env.WALLET_EXTENSION_PATH || path.join('.wallet-builds', networkName, 'chrome_unpacked'))
  );
}

function resolveWalletSetupMode(input: {
  walletUserDataDir?: string;
  testAccountSeed?: string[];
}): WalletSetupMode {
  const explicit = process.env.WALLET_SETUP_MODE;
  if (explicit) {
    if (explicit === 'create' || explicit === 'import' || explicit === 'profile') return explicit;
    throw new Error(`WALLET_SETUP_MODE must be create, import, or profile. Got ${explicit}.`);
  }
  if (input.walletUserDataDir) return 'profile';
  if (input.testAccountSeed) return 'import';
  return 'create';
}

function parseSeed(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const words = raw
    .trim()
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean);
  if (words.length < 12) {
    throw new Error(`TEST_ACCOUNT_SEED must contain at least 12 words. Got ${words.length}.`);
  }
  return words;
}
