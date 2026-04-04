/**
 * Decoder voor het 16-cijferige betalingskenmerk van de Nederlandse Belastingdienst.
 *
 * Opbouw betalingskenmerk (1-gebaseerde posities):
 *  Pos  1      : Checksum (mod-11 controlegetal)
 *  Pos  2– 9  : Eerste 8 cijfers van het BSN of RSIN
 *  Pos 10      : Middelcode (belastingsoort) → letter
 *  Pos 11      : Laatste cijfer van het jaartal
 *  Pos 12–13  : Subnummer / aanslagsoort (2 cijfers)
 *  Pos 14–15  : Tijdvak (2 cijfers)
 *  Pos 16      : Volgnummer (vrijwel altijd 0)
 */

// ── Middelcode-mapping ──────────────────────────────────────────────────────
// Voeg hier nieuwe codes toe zonder iets anders aan te passen.
export const MIDDELCODE_MAP = {
  0: { letter: 'A', omschrijving: 'Naheffing Loonbelasting' },
  1: { letter: 'B', omschrijving: 'Aangifte Omzetbelasting' },
  5: { letter: 'F', omschrijving: 'Naheffing Omzetbelasting' },
  6: { letter: 'L', omschrijving: 'Aangifte Loonbelasting' },
};

// ── BSN/RSIN reconstructie via de 11-proef ──────────────────────────────────
/**
 * Gegeven 8 BSN-cijfers (array van integers), berekent het 9e cijfer
 * zodat het volledige 9-cijferige BSN voldoet aan de 11-proef.
 *
 * Formule:
 *   som = (9×c1) + (8×c2) + (7×c3) + (6×c4) + (5×c5) + (4×c6) + (3×c7) + (2×c8)
 *   c9  = som % 11
 */
export function bereken9ecijfer(digits8) {
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  const som = digits8.reduce((acc, d, i) => acc + weights[i] * d, 0);
  return som % 11;
}

// ── Checksum ─────────────────────────────────────────────────────────────────
// Het exacte gewichtenpatroon voor de checksum (positie 1) is niet publiek
// gedocumenteerd door de Belastingdienst. We lezen het cijfer wel uit, maar
// valideren het niet — om te voorkomen dat geldige kenmerken als ongeldig
// worden weergegeven.

// ── Hoofdfunctie ─────────────────────────────────────────────────────────────
/**
 * Decodeert een 16-cijferig betalingskenmerk naar zijn losse onderdelen
 * en het samengestelde aanslagnummer.
 *
 * @param {string} kenmerk  - 16-cijferige string
 * @returns {object}        - Gedecodeerde onderdelen + aanslagnummer, of { fout }
 */
export function decodeerBetalingskenmerk(kenmerk) {
  const cleaned = kenmerk.replace(/\s/g, '');

  if (!/^\d{16}$/.test(cleaned)) {
    return { fout: 'Voer precies 16 cijfers in.' };
  }

  // ── Stap 1: Uitpakken van de velden ──────────────────────────────────────
  const checksum   = parseInt(cleaned[0], 10);
  const bsn8str    = cleaned.slice(1, 9);           // 8 cijfers als string (met voorloopnullen)
  const bsn8digits = bsn8str.split('').map(Number);
  const middelCode = parseInt(cleaned[9], 10);
  const jaarDigit  = cleaned[10];
  const subnummer  = cleaned.slice(11, 13);
  const tijdvak    = cleaned.slice(13, 15);
  const volgnummer = cleaned[15];

  // ── Stap 2: BSN/RSIN reconstrueren via de 11-proef ───────────────────────
  const c9 = bereken9ecijfer(bsn8digits);
  // c9 = 10 betekent dat het BSN niet als geldig 9-cijferig getal te
  // reconstrueren is (10 is geen enkel cijfer).
  const bsnOngeldig = c9 === 10;
  const bsn9 = bsnOngeldig ? bsn8str + '?' : bsn8str + c9;

  // ── Stap 3: Middelcode omzetten naar letter ───────────────────────────────
  const middelInfo = MIDDELCODE_MAP[middelCode] ?? {
    letter: `(${middelCode})`,
    omschrijving: 'Onbekende belastingsoort',
  };

  // ── Stap 4: Jaar reconstrueren (huidig decennium voorplakken) ────────────
  const huidigJaar = new Date().getFullYear();           // bijv. 2026
  const decenniumPrefix = String(huidigJaar).slice(2, 3); // "2" voor 2020-2029
  const jaarTweecijferig = decenniumPrefix + jaarDigit;   // bijv. "2" + "3" = "23"

  // ── Stap 5: Aanslagnummer samenstellen ───────────────────────────────────
  // Formaat: [BSN9][MiddelLetter][Subnummer][JaarTweecijferig][Tijdvak][Volgnummer]
  const aanslagnummer = `${bsn9}${middelInfo.letter}${subnummer}${jaarTweecijferig}${tijdvak}${volgnummer}`;

  return {
    // Ruwe velden
    checksum,
    bsn8: bsn8str,
    bsn9,
    bsnOngeldig,
    middelCode,
    middelLetter: middelInfo.letter,
    middelOmschrijving: middelInfo.omschrijving,
    jaarDigit,
    jaarTweecijferig,
    subnummer,
    tijdvak,
    volgnummer,
    // Eindresultaat
    aanslagnummer,
  };
}

