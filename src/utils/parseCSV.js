/**
 * Parseer een CSV-string naar een array van objecten.
 * Ondersteunt komma- en puntkommascheidingstekens, geciteerde velden met newlines.
 */
export function parseCSV(tekst) {
  const regels = [];
  let huidigVeld = '';
  let inAanhalingstekens = false;
  let rijVelden = [];
  const chars = tekst.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];

    if (inAanhalingstekens) {
      if (c === '"' && chars[i + 1] === '"') {
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
      } else if (c === ',' || c === ';') {
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
    headers.forEach((h, i) => {
      obj[h] = rij[i] ?? '';
    });
    return obj;
  });
}
