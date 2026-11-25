import { DEFAULT_INCI_CONFIG, type InciConfig } from '../config';
import { normalizeText } from './normalizeText';
import type { ParsedItem, ParseResult, ParseWarningCode } from './types';

// Splits a pasted composition into positions. Pure text work, no content needed.
//
// What it does (see docs/decisions.md, Stage 7):
// - cuts the label prefix ("Ingredients:", "INCI:", "Composition:", Ukrainian and Russian "Склад:");
// - splits on commas, semicolons, new lines and bullets; commas inside brackets do not split;
// - drops footnotes ("*з органічного землеробства"), asterisks and the final period;
// - "Aqua (Water)" and "Aqua/Water" give one item with two names;
// - "Name 5%" keeps the concentration as written. It is a label claim, not a checked value.

const PREFIX = /(?<![\p{L}\p{N}])(?:ingredients?|inci|composition|склад|состав)\s*:/giu;
// 5%, 0.5 %, 0,5-2%
const CONCENTRATION = /\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*%/u;
const OPENERS: Readonly<Record<string, string>> = { '(': ')', '[': ']', '{': '}' };
const CLOSERS = new Set(Object.values(OPENERS));

type Pair = { open: number; close: number };

/** Bracket pairs that really match. An unmatched bracket is an ordinary character. */
function findPairs(text: string): Pair[] {
  const stack: { char: string; index: number }[] = [];
  const pairs: Pair[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char in OPENERS) {
      stack.push({ char, index });
    } else if (CLOSERS.has(char)) {
      const top = stack[stack.length - 1];
      if (top && OPENERS[top.char] === char) {
        stack.pop();
        pairs.push({ open: top.index, close: index });
      }
    }
  }
  return pairs.sort((x, y) => x.open - y.open);
}

/** The pairs that are not inside another pair. */
function outerPairs(pairs: readonly Pair[]): Pair[] {
  const result: Pair[] = [];
  let end = -1;
  for (const pair of pairs) {
    if (pair.open > end) {
      result.push(pair);
      end = pair.close;
    }
  }
  return result;
}

function insideMask(text: string): boolean[] {
  const mask = new Array<boolean>(text.length).fill(false);
  for (const pair of findPairs(text)) {
    for (let index = pair.open; index <= pair.close; index += 1) mask[index] = true;
  }
  return mask;
}

/** "0,5%": a comma between two digits is a decimal comma, not a list separator. */
function isDecimalComma(text: string, index: number): boolean {
  return (
    text.charAt(index) === ',' &&
    /\d/u.test(text.charAt(index - 1)) &&
    /\d/u.test(text.charAt(index + 1))
  );
}

/** Splits on delimiters that are outside brackets. */
function splitTopLevel(text: string, delimiters: ReadonlySet<string>): string[] {
  const mask = insideMask(text);
  const parts: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (!mask[index] && delimiters.has(text.charAt(index)) && !isDecimalComma(text, index)) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

const ITEM_DELIMITERS = new Set([',', ';', '\n', '\r', '•', '·']);
const INNER_DELIMITERS = new Set([',', ';']);

function wordCount(text: string): number {
  return text.split(/\s+/u).filter(Boolean).length;
}

/** The first list of the text, and whether there was more than one list. */
function pickList(text: string): { list: string; multiple: boolean } {
  const prefixes = [...text.matchAll(PREFIX)];
  const first = prefixes[0];
  if (!first) return { list: text, multiple: false };
  const second = prefixes[1];
  const from = (first.index ?? 0) + first[0].length;
  const to = second?.index ?? text.length;
  return { list: text.slice(from, to), multiple: prefixes.length > 1 };
}

const LEADING_MARKER = /^(?:\s*(?:[-–—]\s+|[•·]\s*|\*\s+))+/u;
const FOOTNOTE_AFTER_PERIOD = /\.\s*\*/u;

// `last`: a footnote started inside this piece, so the pieces after it are footnote text.
type Cleaned =
  { kind: 'item'; raw: string; last: boolean } | { kind: 'footnote' } | { kind: 'empty' };

function cleanPiece(piece: string): Cleaned {
  let text = piece.replace(LEADING_MARKER, '').trim();
  if (text === '') return { kind: 'empty' };
  // "*text" with several words is a footnote; "*Aqua" is an ingredient with a mark
  if (text.startsWith('*') && wordCount(text) >= 2) return { kind: 'footnote' };
  const cut = text.search(FOOTNOTE_AFTER_PERIOD);
  if (cut >= 0) text = text.slice(0, cut);
  const last = cut >= 0;
  text = text
    .replace(/\*+/gu, '')
    .replace(/[.\s]+$/u, '')
    .trim();
  return text === '' ? { kind: 'empty' } : { kind: 'item', raw: text, last };
}

/** All names in a text: the part outside brackets split on "/", then the bracket contents. */
function collectNames(text: string): { outside: string; names: string[] } {
  const pairs = outerPairs(findPairs(text));
  let outside = '';
  let cursor = 0;
  const inner: string[] = [];
  for (const pair of pairs) {
    outside += `${text.slice(cursor, pair.open)} `;
    cursor = pair.close + 1;
    inner.push(text.slice(pair.open + 1, pair.close));
  }
  outside += text.slice(cursor);

  const names: string[] = [];
  for (const part of outside.split('/')) names.push(part);
  for (const content of inner) {
    for (const piece of splitTopLevel(content, INNER_DELIMITERS)) {
      names.push(...collectNames(piece).names);
    }
  }
  return { outside, names };
}

function parseItem(raw: string, position: number): ParsedItem | null {
  const match = CONCENTRATION.exec(raw);
  const declaredConcentration = match ? match[0].trim() : null;
  const withoutConcentration = match ? raw.replace(CONCENTRATION, ' ') : raw;

  const { outside, names } = collectNames(withoutConcentration);
  const normalized: string[] = [];
  for (const name of names) {
    const value = normalizeText(name);
    if (value !== '' && !normalized.includes(value)) normalized.push(value);
  }
  const [name, ...altNames] = normalized;
  if (name === undefined) return null;
  return {
    position,
    raw,
    name,
    altNames,
    fullName: normalizeText(outside) || name,
    declaredConcentration,
  };
}

export function parseInci(text: string, config: InciConfig = DEFAULT_INCI_CONFIG): ParseResult {
  const warnings: ParseWarningCode[] = [];
  const { list, multiple } = pickList(text);
  if (multiple) warnings.push('multiple_lists_detected');

  const items: ParsedItem[] = [];
  for (const piece of splitTopLevel(list, ITEM_DELIMITERS)) {
    const cleaned = cleanPiece(piece);
    if (cleaned.kind === 'footnote') break; // everything after a footnote is footnote text
    if (cleaned.kind === 'empty') continue;
    const item = parseItem(cleaned.raw, items.length + 1);
    if (item) items.push(item);
    if (cleaned.last) break;
  }

  if (items.length > config.maxParsedItems) warnings.push('too_long');
  return { items, warnings };
}
