export type ProviderKind = 'midnight-indexer' | 'midnight-testnet' | 'blockfrost';

export interface ProviderConfig {
  id: string;
  kind: ProviderKind;
  baseUrl: string;
  authHeaderName?: string;
  authHeaderValue?: string;
}

export interface NormalizedBlock {
  hash: string;
  height: number;
  timestamp: string; // ISO string
  txCount: number;
  size?: number | null;
}

export interface NormalizedTx {
  hash: string;
  size?: number | null;
}

export interface LatestBlockAndTxs {
  provider: ProviderConfig;
  block: NormalizedBlock;
  txs: NormalizedTx[];
}

const normalizeBase = (url = ''): string => url.trim().replace(/\/+$/, '');

const isTruthy = (value: string | undefined): boolean => {
  if (!value) return false;
  return value.toLowerCase() === 'true' || value === '1';
};

export const isBlockfrostAllowed = (): boolean => {
  return isTruthy(process.env.REACT_APP_ALLOW_BLOCKFROST_FALLBACK) && Boolean(process.env.REACT_APP_BLOCKFROST_KEY);
};

const buildHeaders = (provider: ProviderConfig): HeadersInit => {
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  };

  if (provider.authHeaderName && provider.authHeaderValue) {
    headers[provider.authHeaderName] = provider.authHeaderValue;
  }

  return headers;
};

const fetchJson = async <T>(url: string, provider: ProviderConfig): Promise<T> => {
  const res = await fetch(url, { headers: buildHeaders(provider) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${body}`);
  }
  return res.json();
};

const normalizeBlock = (provider: ProviderConfig, raw: any): NormalizedBlock => {
  switch (provider.kind) {
    case 'midnight-indexer':
    case 'midnight-testnet': {
      const time = raw?.time ?? raw?.timestamp;
      const timestamp = typeof time === 'number' ? new Date(time * 1000).toISOString() : time ?? '';
      const txCount = raw?.tx_count ?? raw?.txCount ?? raw?.transaction_count ?? raw?.transactions?.length ?? 0;
      return {
        hash: raw?.hash,
        height: raw?.height ?? raw?.block_height ?? raw?.blockHeight,
        timestamp,
        txCount,
        size: raw?.size ?? null
      };
    }
    case 'blockfrost': {
      const timestamp = raw?.time ? new Date(raw.time * 1000).toISOString() : '';
      return {
        hash: raw?.hash,
        height: raw?.height,
        timestamp,
        txCount: raw?.tx_count ?? 0,
        size: raw?.size ?? null
      };
    }
    default:
      return {
        hash: raw?.hash,
        height: raw?.height,
        timestamp: '',
        txCount: 0,
        size: null
      };
  }
};

const normalizeTxs = (provider: ProviderConfig, raw: any): NormalizedTx[] => {
  if (provider.kind === 'blockfrost') {
    return (raw as string[]).map((hash) => ({ hash, size: null }));
  }

  if (Array.isArray(raw)) {
    return raw.map((tx) => ({
      hash: tx?.hash ?? tx?.id,
      size: tx?.size ?? null
    }));
  }

  return [];
};

const normalizeEpoch = (provider: ProviderConfig, raw: any) => {
  const baseEpoch = raw?.epoch ?? raw?.number ?? 0;
  const endTime = raw?.end_time ?? raw?.endTime ?? raw?.epochEndTime;
  return {
    provider,
    epochNumber: baseEpoch,
    blockCount: raw?.block_count ?? raw?.blocks ?? raw?.blockCount ?? 0,
    txCount: raw?.tx_count ?? raw?.transactions_count ?? raw?.txCount ?? raw?.transactionCount ?? 0,
    epochEndTime: typeof endTime === 'number' ? new Date(endTime * 1000).toISOString() : endTime ?? null
  };
};

export function buildProviderOrder(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  const indexerUrl = normalizeBase(process.env.REACT_APP_MIDNIGHT_INDEXER_URL ?? '');
  const indexerAuthHeader = process.env.REACT_APP_MIDNIGHT_INDEXER_AUTH_HEADER;
  const indexerKey = process.env.REACT_APP_MIDNIGHT_INDEXER_KEY;

  if (indexerUrl) {
    providers.push({
      id: 'midnight-indexer',
      kind: 'midnight-indexer',
      baseUrl: indexerUrl,
      authHeaderName: indexerAuthHeader,
      authHeaderValue: indexerKey
    });
  }

  const testnetUrl = normalizeBase(process.env.REACT_APP_MIDNIGHT_TESTNET_URL ?? 'https://testnet-02.midnight.network/api/v1');
  const testnetAuthHeader = process.env.REACT_APP_MIDNIGHT_TESTNET_AUTH_HEADER;
  const testnetKey = process.env.REACT_APP_MIDNIGHT_TESTNET_KEY;

  providers.push({
    id: 'midnight-testnet',
    kind: 'midnight-testnet',
    baseUrl: testnetUrl,
    authHeaderName: testnetAuthHeader,
    authHeaderValue: testnetKey
  });

  if (isBlockfrostAllowed()) {
    providers.push({
      id: 'blockfrost',
      kind: 'blockfrost',
      baseUrl: 'https://cardano-preprod.blockfrost.io/api/v0',
      authHeaderName: 'project_id',
      authHeaderValue: process.env.REACT_APP_BLOCKFROST_KEY
    });
  }

  return providers;
}

export async function fetchLatestBlockAndTxs(): Promise<LatestBlockAndTxs> {
  const providers = buildProviderOrder();
  const failures: string[] = [];

  for (const provider of providers) {
    try {
      const block = normalizeBlock(provider, await fetchJson<any>(`${provider.baseUrl}/blocks/latest`, provider));
      if (!block.hash) throw new Error('Missing block hash');
      const txs = normalizeTxs(provider, await fetchJson<any>(`${provider.baseUrl}/blocks/${block.hash}/txs`, provider));
      console.info(`[providers] using ${provider.id} for latest block ${block.height}`);
      return { provider, block, txs };
    } catch (err: any) {
      console.warn(`[providers] ${provider.id} failed: ${err?.message ?? err}`);
      failures.push(`${provider.id}: ${err?.message ?? err}`);
    }
  }

  console.error('[providers] all providers failed', failures);
  throw new Error(`All providers failed: ${failures.join(' | ')}`);
}

export async function fetchLatestEpoch(): Promise<{
  provider: ProviderConfig;
  epochNumber: number;
  blockCount: number;
  txCount: number;
  epochEndTime?: string | null;
}> {
  const providers = buildProviderOrder();
  const failures: string[] = [];

  for (const provider of providers) {
    try {
      const epoch = normalizeEpoch(provider, await fetchJson<any>(`${provider.baseUrl}/epochs/latest`, provider));
      console.info(`[providers] using ${provider.id} for epoch ${epoch.epochNumber}`);
      return epoch;
    } catch (err: any) {
      console.warn(`[providers] ${provider.id} epoch failed: ${err?.message ?? err}`);
      failures.push(`${provider.id}: ${err?.message ?? err}`);
    }
  }

  console.error('[providers] all providers failed for epoch', failures);
  throw new Error(`All providers failed: ${failures.join(' | ')}`);
}
