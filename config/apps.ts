import './load-env';
import { getEnvironmentConfig, type MidenNetworkName } from './environments';

export type PioneerAppName = 'zoroswap' | 'qash';
export type AppUrlSource = 'network-env' | 'generic-env' | 'known-network-default' | 'default-fallback';

export interface PioneerAppConfig {
  name: PioneerAppName;
  displayName: string;
  defaultUrl: string;
  urlEnv: string;
  networkUrlEnv: string;
  url: string;
  urlSource: AppUrlSource;
  envPrefix: string;
  primaryScenarios: string[];
  requiresNetworkUrl: boolean;
  requiresMidenWallet: boolean;
}

interface PioneerAppBaseConfig {
  name: PioneerAppName;
  displayName: string;
  defaultUrl: string;
  envPrefix: string;
  primaryScenarios: string[];
  networkUrls: Partial<Record<MidenNetworkName, string>>;
  requiresMidenWallet: boolean;
}

export const APP_BASE_CONFIGS: Record<PioneerAppName, PioneerAppBaseConfig> = {
  zoroswap: {
    name: 'zoroswap',
    displayName: 'ZoroSwap',
    defaultUrl: 'https://app.zoroswap.com/',
    envPrefix: 'ZOROSWAP',
    primaryScenarios: ['connect-wallet-smoke', 'swap-smoke'],
    requiresMidenWallet: true,
    networkUrls: {
      testnet: 'https://app.zoroswap.com/'
    }
  },
  qash: {
    name: 'qash',
    displayName: 'Qash Finance',
    defaultUrl: 'https://app.qash.finance/',
    envPrefix: 'QASH',
    primaryScenarios: ['account-onboarding-smoke', 'programmable-payment-smoke'],
    requiresMidenWallet: false,
    networkUrls: {
      testnet: 'https://app.qash.finance/'
    }
  }
};

export function getAppConfig(name: PioneerAppName, networkName = getEnvironmentConfig().name): PioneerAppConfig {
  const base = APP_BASE_CONFIGS[name];
  const resolvedUrl = resolveAppUrl(name, networkName);

  return {
    name: base.name,
    displayName: base.displayName,
    defaultUrl: base.defaultUrl,
    envPrefix: base.envPrefix,
    urlEnv: resolvedUrl.urlEnv,
    networkUrlEnv: resolvedUrl.networkUrlEnv,
    url: resolvedUrl.url,
    urlSource: resolvedUrl.source,
    primaryScenarios: base.primaryScenarios,
    requiresNetworkUrl: requiresExplicitNetworkUrl(name, networkName),
    requiresMidenWallet: base.requiresMidenWallet
  };
}

export function resolveAppUrl(
  name: PioneerAppName,
  networkName: MidenNetworkName
): {
  url: string;
  urlEnv: string;
  networkUrlEnv: string;
  source: AppUrlSource;
} {
  const base = APP_BASE_CONFIGS[name];
  const genericUrlEnv = `${base.envPrefix}_URL`;
  const networkUrlEnv = `${base.envPrefix}_URL_${networkName.toUpperCase()}`;

  if (process.env[networkUrlEnv]) {
    return { url: process.env[networkUrlEnv], urlEnv: genericUrlEnv, networkUrlEnv, source: 'network-env' };
  }

  if (process.env[genericUrlEnv]) {
    return { url: process.env[genericUrlEnv], urlEnv: genericUrlEnv, networkUrlEnv, source: 'generic-env' };
  }

  if (base.networkUrls[networkName]) {
    return { url: base.networkUrls[networkName], urlEnv: genericUrlEnv, networkUrlEnv, source: 'known-network-default' };
  }

  return { url: base.defaultUrl, urlEnv: genericUrlEnv, networkUrlEnv, source: 'default-fallback' };
}

export function requiresExplicitNetworkUrl(name: PioneerAppName, networkName: MidenNetworkName): boolean {
  if (networkName === 'localhost') return false;
  const base = APP_BASE_CONFIGS[name];
  const networkUrlEnv = `${base.envPrefix}_URL_${networkName.toUpperCase()}`;
  return !base.networkUrls[networkName] && !process.env[networkUrlEnv];
}

export function selectedAppNames(selected = process.env.E2E_APP ?? 'all'): PioneerAppName[] {
  if (selected === 'all') return ['zoroswap', 'qash'];
  if (selected === 'zoroswap' || selected === 'qash') return [selected];
  throw new Error(`E2E_APP must be all, zoroswap, or qash. Got ${selected}.`);
}

export function inferAppNameFromFile(filePath: string): PioneerAppName {
  if (filePath.includes('/apps/zoroswap/')) return 'zoroswap';
  if (filePath.includes('/apps/qash/')) return 'qash';
  throw new Error(`Cannot infer Pioneer app from test file path: ${filePath}`);
}

export function shouldRunApp(name: PioneerAppName, selected = process.env.E2E_APP ?? 'all'): boolean {
  return selected === 'all' || selected === name;
}
