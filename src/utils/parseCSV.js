/**
 * Parseer een CSV-string naar een array van objecten.
 * Detecteert automatisch of komma of puntkomma als scheidingsteken wordt gebruikt.
 * Ondersteunt geciteerde velden met komma's, puntkomma's en newlines.
 */
export function parseCSV(tekst) {
  const genormaliseerd = tekst.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Auto-detecteer scheidingsteken op basis van de eerste rij
  const eersteLijn = genormaliseerd.split('\n')[0] || '';
  const aantalKommas    = (eersteLijn.match(/,/g)  || []).length;
  const aantalPuntkommas = (eersteLijn.match(/;/g) || []).length;
  const sep = aantalPuntkommas >= aantalKommas ? ';' : ',';

  const regels = [];
  let huidigVeld = '';
  let inAanhalingstekens = false;
  let rijVelden = [];

  for (let i = 0; i < genormaliseerd.length; i++) {
    const c = genormaliseerd[i];

    if (inAanhalingstekens) {
      if (c === '"' && genormaliseerd[i + 1] === '"') {
        huidigVeld += '"';
        i++;
      } else if (c === '"') {
        inAanhalingstekens = false;
      } else {
        huidigVeld += c;
      }
    } else {
      if (c === '"') {
        inAanhalingstekens = true;
      } else if (c === sep) {
        rijVelden.push(huidigVeld.trim());
        huidigVeld = '';
      } else if (c === '\n') {
        rijVelden.push(huidigVeld.trim());
        huidigVeld = '';
        if (rijVelden.some(v => v !== '')) regels.push(rijVelden);
        rijVelden = [];
      } else {
        huidigVeld += c;
      }
    }
  }
  // Laatste veld/rij
  rijVelden.push(huidigVeld.trim());
  if (rijVelden.some(v => v !== '')) regels.push(rijVelden);

  if (regels.length < 2) return [];

  const headers = regels[0].map(h => h.trim());
  return regels.slice(1).map(rij => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = rij[i] ?? ''; });
    return obj;
  });
}
