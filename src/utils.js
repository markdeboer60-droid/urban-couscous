export const FIELDS = [
  { key: 'spaarrekeningen', label: 'Privé spaarrekeningen' },
  { key: 'traderspublic', label: 'Traderspublic' },
  { key: 'meesman', label: 'Meesman beleggingen' },
  { key: 'degiro', label: 'Degiro beleggingen' },
  { key: 'woning', label: 'Waarde woning' },
  { key: 'hypotheek', label: 'Hypotheek schuld' },
];

export function calcTotaal(entry) {
  return (
    (entry.spaarrekeningen || 0) +
    (entry.traderspublic || 0) +
    (entry.meesman || 0) +
    (entry.degiro || 0) +
    (entry.woning || 0) -
    (entry.hypotheek || 0)
  );
}

export function formatEur(value) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMonth(yyyymm) {
  const [year, month] = yyyymm.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' });
}
