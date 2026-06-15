export interface QashBalanceCandidate {
  source: 'inline-qash' | 'standalone-qash';
  amount: number;
  raw: string;
  lineIndex: number;
}

export interface QashFundingState {
  qashBalance: number;
  mintingVisible: boolean;
  pendingFaucetReceiveVisible: boolean;
  syncingVisible: boolean;
  balanceCandidates: QashBalanceCandidate[];
  bodyTextSample: string;
}

export interface QashAccountBalanceCandidate {
  amount: number;
  raw: string;
  lineIndex: number;
}

export interface QashAccountFundingState {
  accountName: string;
  accountBalance: number;
  mintingVisible: boolean;
  pendingFaucetReceiveVisible: boolean;
  syncingVisible: boolean;
  accountBalanceCandidates: QashAccountBalanceCandidate[];
  bodyTextSample: string;
}

export function parseQashFundingState(bodyText: string): QashFundingState {
  const lines = normalizeBodyLines(bodyText);
  const balanceCandidates = collectQashBalanceCandidates(lines);
  const qashBalance = balanceCandidates.reduce((max, candidate) => Math.max(max, candidate.amount), 0);

  return {
    qashBalance,
    mintingVisible: lines.some(line => /^Minting\.\.\.$/i.test(line) || /\bMinting\.\.\./i.test(line)),
    pendingFaucetReceiveVisible: hasPendingFaucetReceive(lines),
    syncingVisible: lines.some(line => /syncing wallet data/i.test(line)),
    balanceCandidates,
    bodyTextSample: bodyText.slice(0, 2_000)
  };
}

export function parseQashAccountFundingState(bodyText: string, accountName: string): QashAccountFundingState {
  const lines = normalizeBodyLines(bodyText);
  const accountBalanceCandidates = collectAccountBalanceCandidates(lines, accountName);
  const accountBalance = accountBalanceCandidates.reduce((max, candidate) => Math.max(max, candidate.amount), 0);

  return {
    accountName,
    accountBalance,
    mintingVisible: lines.some(line => /^Minting\.\.\.$/i.test(line) || /\bMinting\.\.\./i.test(line)),
    pendingFaucetReceiveVisible: hasPendingFaucetReceive(lines),
    syncingVisible: lines.some(line => /syncing wallet data/i.test(line)),
    accountBalanceCandidates,
    bodyTextSample: bodyText.slice(0, 2_000)
  };
}

function collectQashBalanceCandidates(lines: string[]): QashBalanceCandidate[] {
  const startIndex = findFundingSectionStart(lines);
  if (startIndex < 0) return [];

  const scopedLines = lines.slice(startIndex);
  const candidates: QashBalanceCandidate[] = [];

  scopedLines.forEach((line, scopedIndex) => {
    for (const match of line.matchAll(/\b((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*QASH\b/gi)) {
      const amount = parseTokenAmount(match[1] ?? '');
      if (amount === null) continue;
      if (isPendingFaucetReceiveCandidate(lines, startIndex + scopedIndex)) continue;

      candidates.push({
        source: 'inline-qash',
        amount,
        raw: line,
        lineIndex: startIndex + scopedIndex
      });
    }

    if (!/^QASH$/i.test(line)) return;

    for (let offset = 1; offset <= 3; offset += 1) {
      const previousLine = scopedLines[scopedIndex - offset];
      if (!previousLine) continue;

      const amount = parseStandaloneTokenAmount(previousLine);
      if (amount === null) continue;
      if (isPendingFaucetReceiveCandidate(lines, startIndex + scopedIndex)) continue;

      candidates.push({
        source: 'standalone-qash',
        amount,
        raw: `${previousLine}\n${line}`,
        lineIndex: startIndex + scopedIndex
      });
      break;
    }
  });

  return candidates;
}

function collectAccountBalanceCandidates(lines: string[], accountName: string): QashAccountBalanceCandidate[] {
  const startIndex = lines.findIndex(line => /^All Accounts$/i.test(line));
  if (startIndex < 0) return [];

  const normalizedAccountName = accountName.toLocaleLowerCase();
  const candidates: QashAccountBalanceCandidate[] = [];

  for (let lineIndex = startIndex + 1; lineIndex < lines.length; lineIndex += 1) {
    if (lines[lineIndex]?.toLocaleLowerCase() !== normalizedAccountName) continue;

    const nearbyLines = lines.slice(lineIndex + 1, lineIndex + 10);
    for (const [offset, nearbyLine] of nearbyLines.entries()) {
      const amount = parseCurrencyAmount(nearbyLine);
      if (amount === null) continue;

      candidates.push({
        amount,
        raw: `${lines[lineIndex]}\n${nearbyLine}`,
        lineIndex: lineIndex + offset + 1
      });
      break;
    }
  }

  return candidates;
}

function findFundingSectionStart(lines: string[]): number {
  const markerPatterns = [
    /^Total Treasury Balance$/i,
    /^Total Balance$/i,
    /^All Accounts$/i
  ];

  return lines.findIndex(line => markerPatterns.some(pattern => pattern.test(line)));
}

function hasPendingFaucetReceive(lines: string[]): boolean {
  const text = lines.join(' ');
  return /\bQASH Faucet\b/i.test(text) && /\bClaim\b/i.test(text) && /\b\d+(?:\.\d+)?\s*QASH\b/i.test(text);
}

function isPendingFaucetReceiveCandidate(lines: string[], lineIndex: number): boolean {
  const nearbyText = lines.slice(Math.max(0, lineIndex - 6), lineIndex + 7).join(' ');
  return /\bQASH Faucet\b/i.test(nearbyText);
}

function normalizeBodyLines(bodyText: string): string[] {
  return bodyText
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseStandaloneTokenAmount(value: string): number | null {
  const normalized = value.replace(/,/g, '');
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) return null;
  return parseTokenAmount(normalized);
}

function parseCurrencyAmount(value: string): number | null {
  const match = /^\$\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)$/.exec(value);
  if (!match) return null;
  return parseTokenAmount(match[1] ?? '');
}

function parseTokenAmount(value: string): number | null {
  const amount = Number(value.replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : null;
}
