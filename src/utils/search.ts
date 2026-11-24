export type SearchScope = 'all' | 'posts' | 'fatawa';
export type SearchMatchMode = 'all' | 'any';

export interface TextRange {
  start: number;
  end: number;
}

const ARABIC_DIACRITIC_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

function normalizeChar(ch: string): string {
  if (ARABIC_DIACRITIC_RE.test(ch)) return '';
  switch (ch) {
    case 'أ':
    case 'إ':
    case 'آ':
    case 'ٱ':
      return 'ا';
    case 'ى':
      return 'ي';
    case 'ة':
      return 'ه';
    case 'ؤ':
      return 'و';
    case 'ئ':
      return 'ي';
    default:
      return ch.toLowerCase();
  }
}

export function normalizeForSearch(input: string): {normalized: string; indexMap: number[]} {
  let normalized = '';
  const indexMap: number[] = [];

  for (let i = 0; i < input.length; i += 1) {
    const mapped = normalizeChar(input[i]);
    if (!mapped) continue;
    for (let j = 0; j < mapped.length; j += 1) {
      normalized += mapped[j];
      indexMap.push(i);
    }
  }

  return {normalized, indexMap};
}

export function normalizePlainText(input: string): string {
  return normalizeForSearch(input).normalized;
}

export function parseSearchKeywords(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens: string[] = [];
  const seen = new Set<string>();
  const tokenRegex = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(trimmed)) !== null) {
    const raw = (match[1] ?? match[2] ?? '').trim();
    if (!raw) continue;
    const norm = normalizePlainText(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    tokens.push(raw);
  }

  return tokens;
}

export function matchesKeywordsInFields(
  fields: Array<string | undefined | null>,
  keywords: string[],
  mode: SearchMatchMode = 'all',
): boolean {
  if (keywords.length === 0) return true;

  const normalizedCombined = normalizePlainText(
    fields.filter((f): f is string => typeof f === 'string' && f.length > 0).join(' \n '),
  );
  if (!normalizedCombined) return false;

  const normalizedKeywords = keywords.map(normalizePlainText).filter(Boolean);
  if (normalizedKeywords.length === 0) return true;

  if (mode === 'any') {
    return normalizedKeywords.some((kw) => normalizedCombined.includes(kw));
  }
  return normalizedKeywords.every((kw) => normalizedCombined.includes(kw));
}

export function matchesKeywords(
  text: string | undefined | null,
  keywords: string[],
  mode: SearchMatchMode = 'all',
): boolean {
  if (!text) return keywords.length === 0;
  return matchesKeywordsInFields([text], keywords, mode);
}

export function findHighlightRanges(text: string, keywords: string[]): TextRange[] {
  if (!text || keywords.length === 0) return [];

  const {normalized, indexMap} = normalizeForSearch(text);
  if (!normalized) return [];

  const normalizedKeywords = Array.from(
    new Set(keywords.map(normalizePlainText).filter((kw) => kw.length > 0)),
  );
  if (normalizedKeywords.length === 0) return [];

  const rawRanges: TextRange[] = [];

  for (const kw of normalizedKeywords) {
    let fromIdx = 0;
    while (fromIdx <= normalized.length - kw.length) {
      const idx = normalized.indexOf(kw, fromIdx);
      if (idx === -1) break;

      const origStart = indexMap[idx];
      const lastNormIdx = idx + kw.length - 1;
      let origEnd = (indexMap[lastNormIdx] ?? origStart) + 1;

      while (origEnd < text.length && ARABIC_DIACRITIC_RE.test(text[origEnd])) {
        origEnd += 1;
      }

      rawRanges.push({start: origStart, end: origEnd});
      fromIdx = idx + kw.length;
    }
  }

  if (rawRanges.length === 0) return [];

  rawRanges.sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: TextRange[] = [rawRanges[0]];
  for (let i = 1; i < rawRanges.length; i += 1) {
    const current = rawRanges[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      if (current.end > last.end) {
        last.end = current.end;
      }
    } else {
      merged.push({...current});
    }
  }

  return merged;
}

export function extractMatchSnippet(
  text: string,
  keywords: string[],
  beforeChars = 85,
  afterChars = 155,
): {snippet: string; hasMatch: boolean} {
  if (!text) return {snippet: '', hasMatch: false};
  if (keywords.length === 0) {
    return {snippet: text, hasMatch: false};
  }

  const ranges = findHighlightRanges(text, keywords);
  if (ranges.length === 0) {
    return {snippet: text, hasMatch: false};
  }

  const first = ranges[0];
  let start = Math.max(0, first.start - beforeChars);
  let end = Math.min(text.length, first.end + afterChars);

  if (start > 0) {
    const nextSpace = text.indexOf(' ', start);
    if (nextSpace !== -1 && nextSpace < first.start) {
      start = nextSpace + 1;
    }
  }

  if (end < text.length) {
    const prevSpace = text.lastIndexOf(' ', end);
    if (prevSpace > first.end) {
      end = prevSpace;
    }
  }

  const prefix = start > 0 ? '… ' : '';
  const suffix = end < text.length ? ' …' : '';
  return {
    snippet: `${prefix}${text.slice(start, end).trim()}${suffix}`,
    hasMatch: true,
  };
}
