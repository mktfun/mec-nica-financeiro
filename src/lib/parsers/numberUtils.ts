export function roundCurrency(value: number): number {
  if (isNaN(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function extractNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : roundCurrency(val);

  let rawStr = String(val).trim();
  if (rawStr.endsWith('%')) return 0; // Ignora colunas de taxa percentual (ex: 2.04%)
  if (rawStr === '-' || rawStr === '') return 0;

  // Remove "R$" and any other currency symbols, spaces, etc.
  let str = rawStr.replace(/[^\d.,-]/g, '');

  if (!str) return 0;

  const lastCommaIndex = str.lastIndexOf(',');
  const lastDotIndex = str.lastIndexOf('.');

  if (lastCommaIndex > -1 && lastDotIndex > -1) {
    // Both are present
    if (lastCommaIndex > lastDotIndex) {
      // Comma is decimal separator (e.g. 1.234,56)
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal separator (e.g. 1,234.56)
      str = str.replace(/,/g, '');
    }
  } else if (lastCommaIndex > -1) {
    // Only comma
    const parts = str.split(',');
    const lastPart = parts[parts.length - 1];
    if (parts.length > 2 || lastPart.length === 3) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/,/g, '.');
    }
  } else if (lastDotIndex > -1) {
    // Only dot
    const parts = str.split('.');
    const lastPart = parts[parts.length - 1];
    if (parts.length > 2 || lastPart.length === 3) {
      str = str.replace(/\./g, '');
    } else {
      // Dot is already decimal separator, keep as is
    }
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : roundCurrency(parsed);
}
