export function normalizeCurrencyInput(value: string, precision = 2) {
  const sanitized = value.replace(',', '.').replace(/[^\d.]/g, '');
  const separatorIndex = sanitized.indexOf('.');

  if (separatorIndex === -1) return sanitized;

  const integer = sanitized.slice(0, separatorIndex);
  const fraction = sanitized
    .slice(separatorIndex + 1)
    .replace(/\./g, '')
    .slice(0, precision);

  return `${integer}.${fraction}`;
}

export function currencyMajorToMinor(value: string, precision = 2) {
  if (!new RegExp(`^\\d+(?:\\.\\d{0,${precision}})?$`).test(value)) return '';

  const [integer, fraction = ''] = value.split('.');
  const paddedFraction = fraction.padEnd(precision, '0');
  const minorUnits = `${integer}${paddedFraction}`.replace(/^0+(?=\d)/, '');

  return minorUnits || '0';
}
