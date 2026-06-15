#!/usr/bin/env node
import './load-env.mjs';
import fs from 'node:fs';
import path from 'node:path';

const app = process.env.E2E_APP || 'all';
const network = process.env.E2E_NETWORK || 'testnet';
const extensionPath = resolveWalletExtensionPath(network);
const walletPassword = process.env.WALLET_PASSWORD;
const seed = process.env.TEST_ACCOUNT_SEED;
const userDataDir = process.env.WALLET_USER_DATA_DIR;
const walletSetupMode = process.env.WALLET_SETUP_MODE || (userDataDir ? 'profile' : seed ? 'import' : 'create');

const APP_CONFIGS = {
  zoroswap: {
    displayName: 'ZoroSwap',
    envPrefix: 'ZOROSWAP',
    defaultUrl: 'https://app.zoroswap.com/',
    requiresMidenWallet: true,
    networkUrls: {
      testnet: 'https://app.zoroswap.com/'
    }
  },
  qash: {
    displayName: 'Qash Finance',
    envPrefix: 'QASH',
    defaultUrl: 'https://app.qash.finance/',
    requiresMidenWallet: false,
    networkUrls: {
      testnet: 'https://app.qash.finance/'
    }
  }
};

const errors = [];
let appUrls = {};
let requiresMidenWallet = true;
let appAuthProfiles = {};

if (!['all', 'zoroswap', 'qash'].includes(app)) {
  errors.push(`E2E_APP must be all, zoroswap, or qash. Got ${app}.`);
}

if (!['devnet', 'testnet', 'localhost'].includes(network)) {
  errors.push(`E2E_NETWORK must be devnet, testnet, or localhost. Got ${network}.`);
}

if (['all', 'zoroswap', 'qash'].includes(app) && ['devnet', 'testnet', 'localhost'].includes(network)) {
  requiresMidenWallet = selectedAppNames(app).some(appName => APP_CONFIGS[appName].requiresMidenWallet);
  appUrls = resolveAppUrls(network, app);
  appAuthProfiles = resolveAppAuthProfiles(app);
  for (const info of Object.values(appUrls)) {
    if (!info.requiresNetworkUrl) continue;
    const genericNote = info.source === 'generic-env'
      ? ` The generic ${info.urlEnv} is set to ${info.url}, but network parity requires ${info.networkUrlEnv}.`
      : '';
    errors.push(
      `${info.networkUrlEnv} is required for ${info.displayName} on ${network}. ` +
        `No source-backed default ${network} deployment is configured for this app, and the harness must not ` +
        `treat another network's URL as ${network} coverage.${genericNote}`
    );
  }
}

if (process.env.E2E_REQUIRE_APP_AUTH_PROFILE === 'true') {
  for (const [appName, profile] of Object.entries(appAuthProfiles)) {
    if (!profile.path && !profile.cdpEndpoint) {
      errors.push(
        `${profile.appEnv}, APP_AUTH_USER_DATA_DIR, ${profile.cdpEndpointEnv}, ` +
          `or APP_AUTH_CDP_ENDPOINT is required for authenticated ${profile.displayName} runs.`
      );
    } else if (profile.path && !profile.cdpEndpoint && !fs.existsSync(profile.path)) {
      errors.push(`App auth user data dir does not exist for ${profile.displayName}: ${profile.path}`);
    }
  }
} else {
  for (const profile of Object.values(appAuthProfiles)) {
    if (profile.path && !profile.cdpEndpoint && !fs.existsSync(profile.path)) {
      errors.push(`App auth user data dir does not exist for ${profile.displayName}: ${profile.path}`);
    }
  }
}

for (const profile of Object.values(appAuthProfiles)) {
  if (profile.cdpEndpoint && !/^(https?|wss?):\/\//.test(profile.cdpEndpoint)) {
    errors.push(
      `${profile.cdpEndpointEnv} or APP_AUTH_CDP_ENDPOINT must be an http(s) or ws(s) URL. ` +
        `Current value for ${profile.displayName}: ${profile.cdpEndpoint}`
    );
  }
}

if (requiresMidenWallet && !fs.existsSync(path.join(extensionPath, 'manifest.json'))) {
  errors.push(
    `Wallet extension path does not contain manifest.json: ${extensionPath}. ` +
      `Run yarn wallet:build:${network} or set WALLET_EXTENSION_PATH_${network.toUpperCase()}.`
  );
} else if (requiresMidenWallet && process.env.E2E_STRICT_WALLET_NETWORK !== 'false' && network !== 'localhost') {
  const extensionInfo = detectWalletExtensionNetwork(extensionPath);
  if (extensionInfo.detectedNetwork !== network) {
    errors.push(
      `Wallet extension network mismatch: E2E_NETWORK=${network}, but ${extensionPath} appears to be ` +
        `${extensionInfo.detectedNetwork}. Run yarn wallet:build:${network} or set WALLET_EXTENSION_PATH_${network.toUpperCase()}. ` +
        `Evidence: ${extensionInfo.evidence.join(', ') || 'no RPC endpoint marker found'}`
    );
  }
}

if (requiresMidenWallet && !walletPassword) {
  errors.push('WALLET_PASSWORD is required.');
}

if (requiresMidenWallet && !['create', 'import', 'profile'].includes(walletSetupMode)) {
  errors.push(`WALLET_SETUP_MODE must be create, import, or profile. Got ${walletSetupMode}.`);
}

if (requiresMidenWallet && walletSetupMode === 'import' && !seed) {
  errors.push('WALLET_SETUP_MODE=import requires TEST_ACCOUNT_SEED.');
}

if (requiresMidenWallet && walletSetupMode === 'profile' && !userDataDir) {
  errors.push('WALLET_SETUP_MODE=profile requires WALLET_USER_DATA_DIR.');
}

if (requiresMidenWallet && seed && seed.trim().split(/\s+/).length < 12) {
  errors.push('TEST_ACCOUNT_SEED must contain at least 12 words.');
}

if (requiresMidenWallet && userDataDir && !fs.existsSync(path.resolve(userDataDir))) {
  errors.push(`WALLET_USER_DATA_DIR does not exist: ${path.resolve(userDataDir)}`);
}

if (errors.length > 0) {
  console.error('Pioneer E2E preflight failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Pioneer E2E preflight passed.');
console.log(JSON.stringify({
  app,
  network,
  requiresMidenWallet,
  extensionPath: requiresMidenWallet ? extensionPath : null,
  walletSetupMode: requiresMidenWallet ? walletSetupMode : null,
  appAuthProfiles,
  appUrls
}, null, 2));

function resolveWalletExtensionPath(networkName) {
  const specific = process.env[`WALLET_EXTENSION_PATH_${networkName.toUpperCase()}`];
  if (specific) return path.resolve(specific);

  const localBuild = path.resolve(process.cwd(), '.wallet-builds', networkName, 'chrome_unpacked');
  if (fs.existsSync(path.join(localBuild, 'manifest.json'))) return localBuild;

  return path.resolve(process.env.WALLET_EXTENSION_PATH || path.join('.wallet-builds', networkName, 'chrome_unpacked'));
}

function resolveAppUrls(networkName, selectedApp) {
  const result = {};
  for (const appName of selectedAppNames(selectedApp)) {
    result[appName] = resolveAppUrlInfo(appName, networkName);
  }
  return result;
}

function selectedAppNames(selectedApp) {
  if (selectedApp === 'all') return ['zoroswap', 'qash'];
  return [selectedApp];
}

function resolveAppAuthProfiles(selectedApp) {
  const result = {};
  for (const appName of selectedAppNames(selectedApp)) {
    const config = APP_CONFIGS[appName];
    const appEnv = `${config.envPrefix}_AUTH_USER_DATA_DIR`;
    const cdpEndpointEnv = `${config.envPrefix}_AUTH_CDP_ENDPOINT`;
    const raw = process.env[appEnv] || process.env.APP_AUTH_USER_DATA_DIR;
    const rawCdpEndpoint = process.env[cdpEndpointEnv] || process.env.APP_AUTH_CDP_ENDPOINT;
    result[appName] = {
      displayName: config.displayName,
      appEnv,
      genericEnv: 'APP_AUTH_USER_DATA_DIR',
      cdpEndpointEnv,
      genericCdpEndpointEnv: 'APP_AUTH_CDP_ENDPOINT',
      path: raw ? path.resolve(raw) : null,
      source: process.env[appEnv] ? appEnv : process.env.APP_AUTH_USER_DATA_DIR ? 'APP_AUTH_USER_DATA_DIR' : null,
      cdpEndpoint: rawCdpEndpoint?.trim() || null,
      cdpSource: process.env[cdpEndpointEnv] ? cdpEndpointEnv : process.env.APP_AUTH_CDP_ENDPOINT ? 'APP_AUTH_CDP_ENDPOINT' : null
    };
  }
  return result;
}

function resolveAppUrlInfo(appName, networkName) {
  const config = APP_CONFIGS[appName];
  const urlEnv = `${config.envPrefix}_URL`;
  const networkUrlEnv = `${config.envPrefix}_URL_${networkName.toUpperCase()}`;
  const networkUrl = process.env[networkUrlEnv];
  const genericUrl = process.env[urlEnv];
  const knownNetworkUrl = config.networkUrls[networkName];

  if (networkUrl) {
    return {
      displayName: config.displayName,
      url: networkUrl,
      urlEnv,
      networkUrlEnv,
      source: 'network-env',
      requiresNetworkUrl: false
    };
  }

  if (genericUrl) {
    return {
      displayName: config.displayName,
      url: genericUrl,
      urlEnv,
      networkUrlEnv,
      source: 'generic-env',
      requiresNetworkUrl: networkName !== 'localhost' && !knownNetworkUrl
    };
  }

  if (knownNetworkUrl) {
    return {
      displayName: config.displayName,
      url: knownNetworkUrl,
      urlEnv,
      networkUrlEnv,
      source: 'known-network-default',
      requiresNetworkUrl: false
    };
  }

  return {
    displayName: config.displayName,
    url: config.defaultUrl,
    urlEnv,
    networkUrlEnv,
    source: 'default-fallback',
    requiresNetworkUrl: networkName !== 'localhost'
  };
}

function detectWalletExtensionNetwork(extensionPath) {
  const evidence = [];
  let defaultNetwork;
  let sawDevnet = false;
  let sawTestnet = false;

  for (const filePath of collectFiles(extensionPath)) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.json')) continue;
    const relativePath = path.relative(extensionPath, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const defaultMatch = content.match(/\bDEFAULT_NETWORK\s*=\s*["'](devnet|testnet)["']/);
    if (defaultMatch?.[1] === 'devnet' || defaultMatch?.[1] === 'testnet') {
      defaultNetwork = defaultMatch[1];
      evidence.unshift(`${relativePath}:DEFAULT_NETWORK=${defaultNetwork}`);
    }

    if (content.includes('rpc.devnet.miden.io') || content.includes('MIDEN_NETWORK:devnet')) {
      sawDevnet = true;
      evidence.push(`${relativePath}:devnet`);
    }

    if (content.includes('rpc.testnet.miden.io') || content.includes('MIDEN_NETWORK:testnet')) {
      sawTestnet = true;
      evidence.push(`${relativePath}:testnet`);
    }
  }

  return {
    detectedNetwork: defaultNetwork ?? (sawDevnet && !sawTestnet ? 'devnet' : sawTestnet && !sawDevnet ? 'testnet' : 'unknown'),
    evidence: evidence.slice(0, 8)
  };
}

function collectFiles(root) {
  if (!fs.existsSync(root)) return [];

  const result = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        pending.push(child);
      } else if (dirent.isFile()) {
        result.push(child);
      }
    }
  }

  return result;
}
