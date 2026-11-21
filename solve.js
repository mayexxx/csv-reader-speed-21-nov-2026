// Fast drop-in for csv-reader 1.0.0 (make.fun's own CSV reader).
// run(input) returns exactly csv-reader's answer for {text, header}:
// {columns, rows, errors}. Single pass; fields are extracted with slice()
// (one allocation per field) and delimiters are found with a regex, so there
// is no per-character string building.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

const RE_UNQUOTED = /[,\r\n]/g;
const RE_QUOTED = /["\r\n]/g;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  const len = text.length;
  let pos = 0;
  let line = 1;
  if (len > 0 && text.charCodeAt(0) === 0xFEFF) pos = 1;

  let recordLine = 1;
  let recordRow = null;

  function pushError(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // Read an unquoted field from pos, starting from `initial` ('' normally,
  // the quoted value for quote junk, '"' for an unterminated quote).
  // Returns {value, ended, added}: added counts the characters appended
  // after the initial value (stray CRs are dropped, not counted).
  function readUnquoted(initial) {
    const initLen = initial.length;
    let value = initial;
    let segStart = pos;
    let segments = null;
    RE_UNQUOTED.lastIndex = pos;
    for (;;) {
      const m = RE_UNQUOTED.exec(text);
      if (m === null) {
        const tail = text.slice(segStart, len);
        if (segments) { segments.push(tail); value = segments.join(''); }
        else value += tail;
        pos = len;
        return { value, ended: END, added: value.length - initLen };
      }
      const idx = m.index;
      const ch = text.charCodeAt(idx);
      if (ch === 44 || ch === 10 || (ch === 13 && idx + 1 < len && text.charCodeAt(idx + 1) === 10)) {
        const tail = text.slice(segStart, idx);
        if (segments) { segments.push(tail); value = segments.join(''); }
        else value += tail;
        if (ch === 44) {
          pos = idx + 1;
          return { value, ended: COMMA, added: value.length - initLen };
        }
        line += 1;
        pos = ch === 10 ? idx + 1 : idx + 2;
        return { value, ended: LINE_BREAK, added: value.length - initLen };
      }
      // Stray CR: dropped, error, field continues.
      pushError('stray_cr');
      if (segments === null) segments = [initial];
      segments.push(text.slice(segStart, idx));
      pos = idx + 1;
      segStart = idx + 1;
      RE_UNQUOTED.lastIndex = pos;
    }
  }

  // Read a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let segStart = pos + 1;
    let segments = null;
    RE_QUOTED.lastIndex = pos + 1;
    for (;;) {
      const m = RE_QUOTED.exec(text);
      if (m === null) {
        // The quote never closes: literal character, text after it re-read
        // as an unquoted field.
        pos = open + 1;
        line = openLine;
        pushError('unterminated_quote');
        return readUnquoted('"');
      }
      const idx = m.index;
      const ch = text.charCodeAt(idx);
      if (ch === 34) {
        if (idx + 1 < len && text.charCodeAt(idx + 1) === 34) {
          // Doubled quote: one literal quote.
          if (segments === null) segments = [];
          segments.push(text.slice(segStart, idx));
          segments.push('"');
          segStart = idx + 2;
          RE_QUOTED.lastIndex = idx + 2;
          continue;
        }
        // Closing quote.
        const tail = text.slice(segStart, idx);
        let value;
        if (segments) { segments.push(tail); value = segments.join(''); }
        else value = tail;
        pos = idx + 1;
        if (pos >= len) return { value, ended: END };
        const c = text.charCodeAt(pos);
        if (c === 44) { pos += 1; return { value, ended: COMMA }; }
        if (c === 10) { pos += 1; line += 1; return { value, ended: LINE_BREAK }; }
        if (c === 13 && pos + 1 < len && text.charCodeAt(pos + 1) === 10) {
          pos += 2; line += 1; return { value, ended: LINE_BREAK };
        }
        // What follows the closing quote is appended as it stands.
        const junk = readUnquoted(value);
        if (junk.added > 0) pushError('quote_junk');
        return junk;
      }
      if (ch === 13) {
        // CRLF or a lone CR inside quotes: one LF in the value.
        if (segments === null) segments = [];
        segments.push(text.slice(segStart, idx));
        segments.push('\n');
        line += 1;
        const adv = (idx + 1 < len && text.charCodeAt(idx + 1) === 10) ? 2 : 1;
        segStart = idx + adv;
        RE_QUOTED.lastIndex = idx + adv;
        continue;
      }
      // LF inside quotes: kept in the value, line++.
      line += 1;
    }
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos += 1; line += 1; }
      else if (c === 13 && pos + 1 < len && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= len) break;
    recordLine = line;
    recordRow = (header && columns === null) ? null : rows.length;
    const fields = [];
    let field;
    let quoted = false;
    do {
      quoted = pos < len && text.charCodeAt(pos) === 34;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);
    // A line that held only stray CRs is left with no characters: no record.
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    if (width < 0) width = fields.length;
    if (header && columns === null) { columns = fields; continue; }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
