// CSV met ; als scheidingsteken (Nederlands Excel). Beschermt tegen formule-injectie.
const cell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (header, rows) => `\uFEFF${[header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')}\r\n`;
