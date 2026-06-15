import './load-env';

export type MidenNetworkName = 'devnet' | 'testnet' | 'localhost';

export interface EnvironmentConfig {
  name: MidenNetworkName;
  rpcUrl: string;
  provingUrl?: string;
  transportUrl?: string;
  pollIntervalMs: number;
  transactionTimeoutMs: number;
}

export const NETWORK_ORDER: MidenNetworkName[] = ['devnet', 'testnet'];

export const ENVIRONMENTS: Record<MidenNetworkName, EnvironmentConfig> = {
  devnet: {
    name: 'devnet',
    rpcUrl: 'https://rpc.devnet.miden.io',
    provingUrl: 'https://tx-prover.devnet.miden.io',
    pollIntervalMs: 5_000,
    transactionTimeoutMs: 180_000
  },
  testnet: {
    name: 'testnet',
    rpcUrl: 'https://rpc.testnet.miden.io',
    provingUrl: 'https://tx-prover.testnet.miden.io',
    transportUrl: 'https://transport.miden.io',
    pollIntervalMs: 5_000,
    transactionTimeoutMs: 180_000
  },
  localhost: {
    name: 'localhost',
    rpcUrl: 'http://localhost:57291',
    provingUrl: 'http://localhost:50051',
    transportUrl: 'http://127.0.0.1:57292',
    pollIntervalMs: 2_000,
    transactionTimeoutMs: 60_000
  }
};

export function getEnvironmentConfig(env = process.env.E2E_NETWORK ?? 'testnet'): EnvironmentConfig {
  if (!isMidenNetworkName(env)) {
    throw new Error(`Unknown E2E_NETWORK="${env}". Valid values: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  return ENVIRONMENTS[env];
}

export function isMidenNetworkName(value: string): value is MidenNetworkName {
  return value === 'devnet' || value === 'testnet' || value === 'localhost';
}
