// A small CSV reader and writer for the cosmetologist's tables (content/cosmetologist/*.csv).
// Excel in a Ukrainian or Polish locale saves with ";", Google Sheets exports with ",":
// the separator is detected from the header line. A UTF-8 BOM (Excel) is removed.
// Quoted cells may hold the separator, quotes ("" inside quotes) and line breaks.

const SEPARATORS = [';', ',', '\t'] as const;

export function detectSeparator(headerLine: string): string {
  let best: string = ';';
  let bestCount = 0;
  for (const separator of SEPARATORS) {
    const count = headerLine.split(separator).length - 1;
    if (count > bestCount) {
      best = separator;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const firstBreak = text.search(/\r?\n/);
  const separator = detectSeparator(firstBreak < 0 ? text : text.slice(0, firstBreak));

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (quoted) {
      if (char === '"') {
        if (text.charAt(index + 1) === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === separator) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text.charAt(index + 1) === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // fully empty lines (Excel leaves them at the end) are not rows
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/** CSV for Excel: a BOM and ";". Line ends are LF, as everywhere in the repository. */
export function toCsv(rows: readonly (readonly string[])[], separator = ';'): string {
  const cell = (value: string) =>
    /[";,\t\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return `\uFEFF${rows.map((cells) => cells.map(cell).join(separator)).join('\n')}\n`;
}
