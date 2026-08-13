const eps = Number.EPSILON;
function roundCurrency(value) {
  if (isNaN(value)) return 0;
  return Math.round((value + eps) * 100) / 100;
}
console.log('2358.5519000000004 ->', roundCurrency(2358.5519000000004));
console.log('12.34 - 10.01 ->', roundCurrency(12.34 - 10.01));
