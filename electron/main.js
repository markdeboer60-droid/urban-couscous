import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { exec, execFile } from 'child_process';
import { randomUUID } from 'crypto';
import os from 'os';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

// ── Paden ─────────────────────────────────────────────────────────────────────
const dataDir = app.getPath('userData');
const metaFile = path.join(dataDir, 'templates.json');
const settingsFile = path.join(dataDir, 'instellingen.json');
const veldDir = path.join(dataDir, 'velden');
const historyFile = path.join(dataDir, 'history.json');
const geschiedenisDir = path.join(dataDir, 'geschiedenis');
const klantenFile = path.join(dataDir, 'klanten.json');
const conceptenFile = path.join(dataDir, 'concepten.json');
const standaardTekstenFile = path.join(dataDir, 'standaard_teksten.json');
const handtekeningDir = path.join(dataDir, 'handtekeningen');

// 1×1 transparante PNG als fallback wanneer een sjabloon {%handtekening} bevat
// maar er geen handtekening beschikbaar is — voorkomt render-fout.
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const defaultOndertekenaars = [
  'Drs. M.R. de Boer AA',
  'Drs. M.R. Wijnia',
  'Drs. G.O. Visser RA',
];

// ── Seed-data standaard teksten ───────────────────────────────────────────────
// Nieuw items worden bij elke start toegevoegd als ze nog niet bestaan (migratie-veilig).
const SEED_STANDAARD_TEKSTEN = [
  // ── Visionplanner (originele 8) ──
  { categorie: 'Visionplanner', vraag: 'Voeg de documentatie voor cliëntacceptatie/continuatie (inclusief Wwft) toe', antwoord: 'Getoetst via Grub. Geen signalen integriteit of verhoogd Wwft-risico. Identificatie en verificatie vastgelegd conform art. 33 Wwft. Opdracht kan worden gecontinueerd.' },
  { categorie: 'Visionplanner', vraag: 'Voeg de documentatie voor opdrachtacceptatie/continuatie toe', antwoord: 'Vanuit Grub en teambespreking vastgesteld dat geen bedreigingen of belemmeringen zijn geconstateerd. Opdrachtbevestiging actueel. Voldoende deskundigheid, tijd en capaciteit beschikbaar. Opdracht wordt gecontinueerd.' },
  { categorie: 'Visionplanner', vraag: 'Wwft risicoprofiel', antwoord: 'Vastgesteld op gemiddeld. Geen indicatoren voor bijstelling naar verhoogd risico. Vastgelegd in Grub.' },
  { categorie: 'Visionplanner', vraag: 'Opdrachtteam competentie', antwoord: 'Het opdrachtteam beschikt collectief over de passende competentie en capaciteiten. Vereiste branchekennis en kennis van Titel 9 BW2 zijn binnen het team aanwezig.' },
  { categorie: 'Visionplanner', vraag: 'Stel vast welke significante aangelegenheden er zijn', antwoord: '1. Waardering MVA / afschrijvingen (fiscale grondslagen, bodemwaarde)\n2. Interne verhuur OG (zakelijkheid, indexatie)\n3. Huurovereenkomsten (actualiteit)\n4. Investeringsaftrek (geen FE, verhuur kwalificeert niet)\n5. Toerekening huisvestingskosten (eigenaar vs gebruiker)\n6. Deelneming NVW (aansluiting vermogen en resultaat)' },
  { categorie: 'Visionplanner', vraag: 'Beoordeel continuïteit', antwoord: 'Resultaat en vermogen uitstekend. Geen aanwijzingen die de continuïteit in gevaar brengen. Geen significante aangelegenheid.' },
  { categorie: 'Visionplanner', vraag: 'Controleer volledigheid aangeleverde administratie', antwoord: 'Saldibalans, jaarrekening deelneming, huurovereenkomsten, MVA-staat en overige bescheiden aanwezig en volledig. Voorraadlijsten niet van toepassing.' },
  { categorie: 'Visionplanner', vraag: 'Zijn de grondslagen gewijzigd ten opzichte van vorig jaar?', antwoord: 'Geen wijziging in grondslagen. Geen stelsel- of schattingswijziging. Nadere toelichting in jaarrekening niet vereist.' },

  // ── Debiteuren ──
  { categorie: 'Debiteuren', vraag: 'Risico / motivatie', antwoord: 'Debiteuren zijn afhankelijk van schattingen door het management over de inbaarheid van openstaande vorderingen. Het risico bestaat dat oninbare of twijfelachtige debiteuren niet of onvoldoende zijn afgewaardeerd, waardoor de balanspost te hoog is gepresenteerd. Daarnaast kunnen concentratierisico\'s (grote klanten) en vorderingen op gelieerde partijen een kwalitatief significante aangelegenheid vormen, ook als de kwantitatieve omvang op zichzelf bescheiden is (zie NBA-handreiking 1136, Par. 3.4 en A50 Std. 4410).' },
  { categorie: 'Debiteuren', vraag: 'Aansluiting postenlijst op balanspost', antwoord: 'Stel vast dat de openstaande postenlijst debiteuren per balansdatum aansluit op de balanspost en ga na of de aansluiting zonder onverklaard verschil sluit.' },
  { categorie: 'Debiteuren', vraag: 'Betalingsachterstand — voorziening dubieuze debiteuren', antwoord: 'Ga na of er debiteuren zijn met een betalingsachterstand en bespreek met het management of hiervoor een voorziening dubieuze debiteuren is getroffen.' },
  { categorie: 'Debiteuren', vraag: 'Debiteuren ouder dan 90 dagen', antwoord: 'Stel vast of debiteuren ouder dan 90 dagen specifiek zijn besproken met het management en ga na of de inschatting van inbaarheid aannemelijk is gezien de kennis van de onderneming.' },
  { categorie: 'Debiteuren', vraag: 'Concentratierisico grote klanten', antwoord: 'Ga na of er sprake is van een concentratierisico (een of enkele grote debiteuren die een belangrijk deel van de post vertegenwoordigen) en bespreek dit met het management.' },
  { categorie: 'Debiteuren', vraag: 'Vorderingen op gelieerde partijen', antwoord: 'Stel vast of vorderingen op gelieerde partijen (DGA, groepsmaatschappijen) afzonderlijk zijn gepresenteerd en ga na of de voorwaarden zakelijk zijn.' },
  { categorie: 'Debiteuren', vraag: 'Documenteren voorziening dubieuze debiteuren', antwoord: 'Leg de uitgangspunten en berekening van de voorziening dubieuze debiteuren vast en bespreek de uitkomst met het management zodat zij de verantwoordelijkheid kunnen dragen.' },
  { categorie: 'Debiteuren', vraag: 'Materiële afwijking — correctie of teruggave opdracht', antwoord: 'Stel vast of het management een correctie wil aanbrengen indien de afwijking materieel is; bij weigering: voorstel tot aanpassing vastleggen en zo nodig opdracht teruggeven (Par. 34 en 35 Std. 4410).' },
  { categorie: 'Debiteuren', vraag: 'Consistentie waarderingsgrondslag', antwoord: 'Ga na of de gehanteerde grondslag voor de waardering van debiteuren consistent is toegepast ten opzichte van voorgaand jaar.' },
  { categorie: 'Debiteuren', vraag: 'Toelichting in jaarrekening', antwoord: 'Stel vast of de debiteuren juist en volledig zijn toegelicht in de jaarrekening, inclusief eventuele zekerheden, pandrechten of vorderingen op gelieerde partijen.' },

  // ── Voorraad ──
  { categorie: 'Voorraad', vraag: 'Risico / motivatie', antwoord: 'Voorraad is een post waarbij de waardering sterk afhankelijk is van schattingen door het management, zoals de inschatting van incourantheid en de netto-opbrengstwaarde. De kwaliteit van de voorradadministratie en de wijze waarop de klant tot zijn voorraadopgave komt, zijn bepalend voor de betrouwbaarheid van de aangeleverde informatie (Fiscount 2017). Onjuiste waardering kan leiden tot een afwijking van materieel belang in de jaarrekening.' },
  { categorie: 'Voorraad', vraag: 'Aansluiting eindstand op saldibalans', antwoord: 'Stel vast dat de eindstand voorraad per balansdatum aansluit op de saldibalans en ga na hoe de klant tot zijn voorraadopgave is gekomen (fysieke inventarisatie, systeem of schatting).' },
  { categorie: 'Voorraad', vraag: 'Aansluiting openingsbalanswaarde vorig jaar', antwoord: 'Ga na of de openingsbalanswaarde overeenkomt met de slotstand van het vorige boekjaar en stel vast dat er geen onverklaard verschil bestaat.' },
  { categorie: 'Voorraad', vraag: 'Voorziening of afwaardering incourante voorraad', antwoord: 'Bespreek met het management of een voorziening of afwaardering voor incourante voorraad is getroffen.' },
  { categorie: 'Voorraad', vraag: 'Onderbouwing incourantheid', antwoord: 'Ga na of de onderbouwing van de incourantheid aannemelijk is: ouderdom, omloopsnelheid, marktontwikkeling en afzetmogelijkheden.' },
  { categorie: 'Voorraad', vraag: 'Documenteren afwaardering voorraad', antwoord: 'Leg de uitgangspunten en berekening van de afwaardering vast en bespreek de uitkomst met het management zodat zij de verantwoordelijkheid kunnen dragen.' },
  { categorie: 'Voorraad', vraag: 'Materiële afwijking — correctie of teruggave opdracht', antwoord: 'Stel vast of het management een correctie wil aanbrengen indien de afwijking materieel is; bij weigering: voorstel tot aanpassing vastleggen en zo nodig opdracht teruggeven (Par. 34 en 35 Std. 4410).' },
  { categorie: 'Voorraad', vraag: 'Brutomarge aansluiting bij voorgaande jaren', antwoord: 'Ga na of de brutomarge aansluit bij voorgaande jaren en bij branchegemiddelden; een significante afwijking kan duiden op een onjuiste voorraadwaardering.' },
  { categorie: 'Voorraad', vraag: 'Omloopsnelheid en verhouding tot omzet', antwoord: 'Stel vast of de balanspost voorraad in verhouding staat tot de omzet en inkoopkosten en ga na of de omloopsnelheid aannemelijk is.' },
  { categorie: 'Voorraad', vraag: 'Toelichting grondslagen voorraadwaardering', antwoord: 'Stel vast of de grondslagen voor de voorraadwaardering juist zijn toegelicht in de jaarrekening en consistent zijn met voorgaand jaar.' },
  { categorie: 'Voorraad', vraag: 'Onzekerheden — benadrukkingsparagraaf', antwoord: 'Ga na of eventuele onzekerheden in de waardering zijn toegelicht; overweeg een benadrukkingsparagraaf in de samenstellingsverklaring (Par. 8.1.3 handreiking 1136).' },

  // ── Onderhanden projecten ──
  { categorie: 'Onderhanden projecten', vraag: 'Risico / motivatie', antwoord: 'Onderhanden projecten bevatten complexe schattingen over voortgang, verwachte kosten bij voltooiing en te verwachten winstgevendheid per project. De betrouwbaarheid van de post is volledig afhankelijk van de kwaliteit van de projectadministratie en inschattingen van het management. Zowel kwantitatieve onjuistheden (verkeerde winstneming) als kwalitatieve risico\'s (lopende claims, geschillen met opdrachtgevers) kunnen aanleiding zijn voor een significante aangelegenheid.' },
  { categorie: 'Onderhanden projecten', vraag: 'Projectenoverzicht volledig en aansluitend', antwoord: 'Bespreek met het management welke projecten per balansdatum nog niet zijn opgeleverd en stel vast dat het projectenoverzicht volledig is en aansluit op de balanspost.' },
  { categorie: 'Onderhanden projecten', vraag: 'Consistentie verwerkingsmethode', antwoord: 'Ga na of de gehanteerde verwerkingsmethode (percentage of completion of completed contract) consistent is toegepast ten opzichte van voorgaand jaar.' },
  { categorie: 'Onderhanden projecten', vraag: 'Onderbouwing projectkosten en opbrengsten', antwoord: 'Stel vast dat de geraamde totale projectkosten en opbrengsten per project zijn onderbouwd door het management en ga na of de inschattingen aannemelijk zijn.' },
  { categorie: 'Onderhanden projecten', vraag: 'Verlieslatende projecten — verliesvoorziening', antwoord: 'Bespreek met het management of er projecten zijn met een verwacht verlies en ga na of hiervoor een verliesvoorziening is getroffen.' },
  { categorie: 'Onderhanden projecten', vraag: 'Documenteren voortgangspercentages', antwoord: 'Leg de uitgangspunten en berekening van de voortgangspercentages vast en bespreek de uitkomsten met het management zodat zij de verantwoordelijkheid kunnen dragen.' },
  { categorie: 'Onderhanden projecten', vraag: 'Presentatie actief- en passiefprojecten', antwoord: 'Ga na of de presentatie van onderhanden projecten correct is: stel vast of projecten met een actief saldo als vordering en projecten met een passief saldo als schuld zijn gepresenteerd.' },
  { categorie: 'Onderhanden projecten', vraag: 'Materiële afwijking — correctie of teruggave opdracht', antwoord: 'Stel vast of het management een correctie wil aanbrengen indien de afwijking materieel is; bij weigering: voorstel tot aanpassing vastleggen en zo nodig opdracht teruggeven (Par. 34 en 35 Std. 4410).' },
  { categorie: 'Onderhanden projecten', vraag: 'Omzetverantwoording en gefactureerde termijnen', antwoord: 'Ga na of de omzetverantwoording uit onderhanden projecten aansluit bij de gehanteerde methode en of gefactureerde termijnen correct zijn verwerkt.' },
  { categorie: 'Onderhanden projecten', vraag: 'Brutomarge per project — afwijkende marge', antwoord: 'Ga na of de brutomarge per project en in totaliteit aansluit bij de verwachtingen op basis van kennis van de onderneming en de branche; een afwijkende marge duidt mogelijk op een onjuiste waardering.' },
  { categorie: 'Onderhanden projecten', vraag: 'Toelichting grondslagen in jaarrekening', antwoord: 'Stel vast of de grondslagen voor onderhanden projecten juist en volledig zijn toegelicht in de jaarrekening.' },
  { categorie: 'Onderhanden projecten', vraag: 'Claims en geschillen — benadrukkingsparagraaf', antwoord: 'Ga na of eventuele onzekerheden zoals claims of geschillen met opdrachtgevers zijn toegelicht; overweeg een benadrukkingsparagraaf in de samenstellingsverklaring (Par. 8.1.3 handreiking 1136).' },

  // ── Omzet en brutomarge ──
  { categorie: 'Omzet en brutomarge', vraag: 'Risico / motivatie', antwoord: 'Omzet en brutomarge zijn significant omdat onjuiste omzetverantwoording of kostenallocatie direct de gepresenteerde resultaten beïnvloeden. De post is gevoelig voor vroeg- of laat-verantwoording en voor het vermengen van omzet met derden-opbrengsten.' },
  { categorie: 'Omzet en brutomarge', vraag: 'Aansluiting omzet op grootboek en aangifte omzetbelasting', antwoord: 'Stel vast dat de in de jaarrekening verantwoorde omzet aansluit op het grootboek en ga na of er een aansluiting is gemaakt met de ingediende omzetbelastingaangiften; verklaar eventuele verschillen (vrijgestelde omzet, buitenlandse omzet, kasstelsel).' },
  { categorie: 'Omzet en brutomarge', vraag: 'Brutomarge vergelijking met voorgaande jaren en branche', antwoord: 'Vergelijk de brutomarge (in percentage) met voorgaande jaren en met branchegemiddelden. Bespreek significante afwijkingen met het management en beoordeel of de verklaring aannemelijk is.' },
  { categorie: 'Omzet en brutomarge', vraag: 'Cut-off: omzet rond balansdatum', antwoord: 'Ga na of omzet rondom balansdatum in de juiste periode is verantwoord. Stel voor een periode van minimaal twee weken voor en na balansdatum vast of leveringen/diensten correct zijn toegerekend.' },
  { categorie: 'Omzet en brutomarge', vraag: 'Niet-reguliere of éénmalige opbrengsten', antwoord: 'Stel vast of er niet-reguliere of éénmalige opbrengsten (subsidies, schadevergoedingen, vrijval voorzieningen) zijn en ga na of deze correct zijn gepresenteerd en toegelicht.' },
  { categorie: 'Omzet en brutomarge', vraag: 'Inkoopkosten en kostprijsverantwoording', antwoord: 'Ga na of de inkoopkosten en kostprijs van de omzet volledig en juist zijn verantwoord en of de gehanteerde kostprijsmethode consistent is met voorgaand jaar.' },
  { categorie: 'Omzet en brutomarge', vraag: 'Documenteren verklaring brutomarge', antwoord: 'Leg de analyse van de brutomarge vast in het dossier, inclusief de verklaring van het management voor eventuele afwijkingen, zodat het dossier inzichtelijk is voor een externe kwaliteitsbeoordelaar.' },
  { categorie: 'Omzet en brutomarge', vraag: 'Materiële afwijking — correctie of teruggave opdracht', antwoord: 'Stel vast of het management een correctie wil aanbrengen indien de afwijking materieel is; bij weigering: voorstel tot aanpassing vastleggen en zo nodig opdracht teruggeven (Par. 34 en 35 Std. 4410).' },
  { categorie: 'Omzet en brutomarge', vraag: 'Toelichting in jaarrekening', antwoord: 'Stel vast of de omzet en de grondslagen voor omzetverantwoording juist en volledig zijn toegelicht in de jaarrekening, inclusief gesegmenteerde omzet indien van toepassing.' },

  // ── Personeelskosten ──
  { categorie: 'Personeelskosten', vraag: 'Risico / motivatie', antwoord: 'Personeelskosten vormen vaak de grootste kostenpost en zijn significant vanwege het risico op onjuiste verwerking van salarissen, bonussen, vakantiedagen, pensioenpremies en onkostenvergoedingen. Fouten kunnen leiden tot een materieel onjuist beeld van het resultaat.' },
  { categorie: 'Personeelskosten', vraag: 'Aansluiting loonadministratie op grootboek', antwoord: 'Stel vast dat de totale loonkosten in de loonadministratie aansluiten op de in het grootboek verantwoorde personeelskosten en verklaar eventuele verschillen.' },
  { categorie: 'Personeelskosten', vraag: 'Aansluiting loonaangiften op grootboek', antwoord: 'Ga na of de ingediende loonaangiften (loonheffingen) aansluiten op de in het grootboek verantwoorde loonheffingslasten en balanspost schuld loonheffingen.' },
  { categorie: 'Personeelskosten', vraag: 'Gemiddeld salaris per medewerker — plausibiliteitstoets', antwoord: 'Voer een plausibiliteitstoets uit: verdeel de totale loonkosten door het gemiddeld aantal medewerkers en toets of het gemiddeld salaris aannemelijk is gezien de functiestructuur van de onderneming.' },
  { categorie: 'Personeelskosten', vraag: 'Vakantiedagenverplichting en overige personeelsverplichtingen', antwoord: 'Ga na of een voorziening of schuld voor opgebouwde vakantiedagen, bonussen en andere personeelsverplichtingen per balansdatum is opgenomen en of de berekening aannemelijk is.' },
  { categorie: 'Personeelskosten', vraag: 'Pensioenpremies — aansluiting en achterstanden', antwoord: 'Stel vast dat de pensioenpremies correct zijn verantwoord en ga na of er sprake is van achterstallige premiebetaling aan het pensioenfonds.' },
  { categorie: 'Personeelskosten', vraag: 'DGA-beloning en gebruikelijk loon', antwoord: 'Ga na of de DGA een salaris ontvangt dat voldoet aan de gebruikelijkloonregeling en stel vast of de DGA-beloning correct is verwerkt in de loonadministratie en de jaarrekening.' },
  { categorie: 'Personeelskosten', vraag: 'Documenteren plausibiliteitstoets personeelskosten', antwoord: 'Leg de uitgangspunten en uitkomsten van de plausibiliteitstoets vast in het dossier en bespreek eventuele afwijkingen met het management.' },
  { categorie: 'Personeelskosten', vraag: 'Materiële afwijking — correctie of teruggave opdracht', antwoord: 'Stel vast of het management een correctie wil aanbrengen indien de afwijking materieel is; bij weigering: voorstel tot aanpassing vastleggen en zo nodig opdracht teruggeven (Par. 34 en 35 Std. 4410).' },
  { categorie: 'Personeelskosten', vraag: 'Toelichting in jaarrekening', antwoord: 'Stel vast of het gemiddeld aantal medewerkers (in fte) en de DGA-beloning correct zijn toegelicht in de jaarrekening conform de vereisten van Titel 9 BW2.' },

  // ── Voorziening groot onderhoud ──
  { categorie: 'Voorziening groot onderhoud', vraag: 'Risico / motivatie', antwoord: 'Een voorziening groot onderhoud is significant omdat de hoogte sterk afhangt van schattingen van toekomstige kosten en de technische staat van de activa. Onjuiste dotaties of vrijvallen kunnen het resultaat materieel beïnvloeden.' },
  { categorie: 'Voorziening groot onderhoud', vraag: 'Onderbouwing berekening voorziening', antwoord: 'Stel vast op welke basis de voorziening groot onderhoud is berekend (onderhoudsplan, ervaringscijfers of offerte) en ga na of de uitgangspunten aannemelijk zijn en consistent zijn met voorgaand jaar.' },
  { categorie: 'Voorziening groot onderhoud', vraag: 'Meerjarenonderhoudsplan aanwezig', antwoord: 'Ga na of de onderneming beschikt over een actueel meerjarenonderhoudsplan (MJOP) en of de dotatie aansluit op de in het plan voorziene kosten voor het komende jaar.' },
  { categorie: 'Voorziening groot onderhoud', vraag: 'Aansluiting openings- en slotstand voorziening', antwoord: 'Stel vast dat de openingsstand van de voorziening aansluit op de slotstand van het vorige boekjaar en dat de mutaties (dotatie, onttrekking, vrijval) correct zijn verantwoord.' },
  { categorie: 'Voorziening groot onderhoud', vraag: 'Onttrekkingen: zijn uitgevoerde werkzaamheden ten laste van de voorziening gebracht', antwoord: 'Ga na of de in het boekjaar uitgevoerde groot-onderhoudswerkzaamheden ten laste van de voorziening zijn gebracht en niet als direct resultaatkosten zijn verantwoord.' },
  { categorie: 'Voorziening groot onderhoud', vraag: 'Documenteren onderbouwing voorziening', antwoord: 'Leg de uitgangspunten en de berekening van de voorziening vast in het dossier en bespreek de uitkomst met het management zodat zij de verantwoordelijkheid kunnen dragen.' },
  { categorie: 'Voorziening groot onderhoud', vraag: 'Materiële afwijking — correctie of teruggave opdracht', antwoord: 'Stel vast of het management een correctie wil aanbrengen indien de afwijking materieel is; bij weigering: voorstel tot aanpassing vastleggen en zo nodig opdracht teruggeven (Par. 34 en 35 Std. 4410).' },
  { categorie: 'Voorziening groot onderhoud', vraag: 'Toelichting in jaarrekening', antwoord: 'Stel vast of de voorziening groot onderhoud inclusief het gehanteerde berekeningsmodel correct is toegelicht in de toelichting op de jaarrekening.' },

  // ── Voorziening latente belastingen ──
  { categorie: 'Voorziening latente belastingen', vraag: 'Risico / motivatie', antwoord: 'Latente belastingen kunnen een materieel effect hebben op het eigen vermogen en het resultaat. Het risico bestaat dat tijdelijke verschillen niet zijn geïdentificeerd of dat actieve latenties worden opgevoerd terwijl toekomstige realisatie onzeker is.' },
  { categorie: 'Voorziening latente belastingen', vraag: 'Identificatie van tijdelijke verschillen', antwoord: 'Stel vast welke tijdelijke verschillen bestaan tussen de fiscale en commerciële waardering van activa en passiva (o.a. fiscale afschrijvingen, herinvesteringsreserve, egalisatiereserve, pensioenverplichtingen) en ga na of hiervoor een latentie is opgenomen.' },
  { categorie: 'Voorziening latente belastingen', vraag: 'Berekening en tarief latentie', antwoord: 'Ga na of de latentie is berekend tegen het toepasselijke Vpb-tarief (of het gewogen gemiddelde bij meerdere tariefschijven) en of de berekening aansluit op de tijdelijke verschillen.' },
  { categorie: 'Voorziening latente belastingen', vraag: 'Actieve latentie — aannemelijkheid toekomstige realisatie', antwoord: 'Indien een actieve latentie (te verrekenen verlies of toekomstig voordeel) is opgenomen, stel vast of realisatie voldoende aannemelijk is op basis van toekomstige belastbare winsten.' },
  { categorie: 'Voorziening latente belastingen', vraag: 'Aansluiting openings- en slotstand latentie', antwoord: 'Stel vast dat de openingsstand aansluit op de slotstand van het vorige boekjaar en dat mutaties correct zijn verantwoord in het resultaat of rechtstreeks in het eigen vermogen.' },
  { categorie: 'Voorziening latente belastingen', vraag: 'Documenteren berekening latentie', antwoord: 'Leg de berekening van de latente belasting, de geïdentificeerde tijdelijke verschillen en het gehanteerde tarief vast in het dossier.' },
  { categorie: 'Voorziening latente belastingen', vraag: 'Materiële afwijking — correctie of teruggave opdracht', antwoord: 'Stel vast of het management een correctie wil aanbrengen indien de afwijking materieel is; bij weigering: voorstel tot aanpassing vastleggen en zo nodig opdracht teruggeven (Par. 34 en 35 Std. 4410).' },
  { categorie: 'Voorziening latente belastingen', vraag: 'Toelichting in jaarrekening', antwoord: 'Stel vast of de latente belastingverplichtingen en -vorderingen correct zijn toegelicht in de jaarrekening, inclusief de aard van de tijdelijke verschillen en het gehanteerde belastingtarief.' },

  // ── Rekening-courant verhoudingen ──
  { categorie: 'Rekening-courant verhoudingen', vraag: 'Risico / motivatie', antwoord: 'Rekening-courantverhoudingen met DGA of gelieerde vennootschappen zijn significant vanwege het risico op onzakelijke transacties, niet-verantwoorde rente en onjuiste presentatie (lang- of kortlopend). Ze vragen om extra aandacht in verband met mogelijke verkapte dividenduitkeringen of leningen.' },
  { categorie: 'Rekening-courant verhoudingen', vraag: 'Aansluiting rekening-courant op opgave wederpartij', antwoord: 'Stel vast dat het saldo van de rekening-courant aansluit op de opgave van de wederpartij (DGA of gelieerde vennootschap) en verklaar eventuele intercompany-verschillen.' },
  { categorie: 'Rekening-courant verhoudingen', vraag: 'Rente op rekening-courant DGA', antwoord: 'Ga na of over de rekening-courant met de DGA een zakelijke rente is berekend en correct is verantwoord in de resultatenrekening van beide partijen.' },
  { categorie: 'Rekening-courant verhoudingen', vraag: 'Wet Excessief lenen — drempeltoets', antwoord: 'Stel vast of het saldo van schulden van de DGA aan de eigen vennootschap(pen) de drempel van € 500.000 (wet excessief lenen) al dan niet overschrijdt en bespreek eventuele fiscale gevolgen met de klant.' },
  { categorie: 'Rekening-courant verhoudingen', vraag: 'Zakelijkheid en onderbouwing transacties', antwoord: 'Ga na of de transacties die via de rekening-courant lopen zakelijk van aard zijn en of er schriftelijke overeenkomsten (leningsovereenkomsten, leveringscontracten) aanwezig zijn.' },
  { categorie: 'Rekening-courant verhoudingen', vraag: 'Presentatie: lang- of kortlopend', antwoord: 'Stel vast of de rekening-courantverhouding correct is gepresenteerd als kortlopend (< 1 jaar) of langlopend (≥ 1 jaar) op basis van de daadwerkelijke aflossingsverplichting.' },
  { categorie: 'Rekening-courant verhoudingen', vraag: 'Documenteren afstemming rekening-courant', antwoord: 'Leg de afstemming van de rekening-courant, de renteverrekening en eventuele afspraken over aflossing vast in het dossier.' },
  { categorie: 'Rekening-courant verhoudingen', vraag: 'Materiële afwijking — correctie of teruggave opdracht', antwoord: 'Stel vast of het management een correctie wil aanbrengen indien de afwijking materieel is; bij weigering: voorstel tot aanpassing vastleggen en zo nodig opdracht teruggeven (Par. 34 en 35 Std. 4410).' },
  { categorie: 'Rekening-courant verhoudingen', vraag: 'Toelichting in jaarrekening', antwoord: 'Stel vast of de rekening-courantverhoudingen met gelieerde partijen correct zijn toegelicht, inclusief rente, zekerheden en aflossingsverplichtingen.' },

  // ── Deelnemingen ──
  { categorie: 'Deelnemingen', vraag: 'Risico / motivatie', antwoord: 'Deelnemingen zijn significant omdat de waarderingsmethode (kostprijs, nettovermogenswaarde of actuele waarde) een materieel effect heeft op het eigen vermogen. Het risico bestaat dat waardeverminderingen niet tijdig worden onderkend of dat de consolidatieplicht over het hoofd wordt gezien.' },
  { categorie: 'Deelnemingen', vraag: 'Aansluiting waardering deelneming op gekozen methode', antwoord: 'Stel vast of de gekozen waarderingsmethode (kostprijs of nettovermogenswaarde) consistent is toegepast en of de slotstand aansluit op de openingsstand plus mutaties (resultaat, dividend, kapitaalstortingen).' },
  { categorie: 'Deelnemingen', vraag: 'Nettovermogenswaarde — aansluiting op jaarrekening deelneming', antwoord: 'Indien de deelneming is gewaardeerd tegen nettovermogenswaarde, stel vast dat de berekening aansluit op de (voorlopige) jaarrekening van de deelneming en dat het aandeel correct is bepaald op basis van het belang.' },
  { categorie: 'Deelnemingen', vraag: 'Signalen van bijzondere waardevermindering', antwoord: 'Ga na of er signalen zijn van bijzondere waardevermindering van de deelneming (verlieslatend, negatief eigen vermogen, marktomstandigheden) en bespreek dit met het management.' },
  { categorie: 'Deelnemingen', vraag: 'Consolidatieplicht', antwoord: 'Ga na of de onderneming een consolidatieplicht heeft op basis van de wettelijke criteria (zeggenschap, meerderheidsbelang) en of, indien van toepassing, een geconsolideerde jaarrekening is opgesteld of een beroep op een vrijstelling is gedaan.' },
  { categorie: 'Deelnemingen', vraag: 'Dividendinkomsten verantwoord in juiste periode', antwoord: 'Stel vast of ontvangen of te ontvangen dividenden van deelnemingen in de juiste periode zijn verantwoord en correct zijn gepresenteerd (resultaat of vermindering boekwaarde afhankelijk van methode).' },
  { categorie: 'Deelnemingen', vraag: 'Documenteren waardering deelneming', antwoord: 'Leg de onderbouwing van de waardering van de deelneming, inclusief de verkregen financiële informatie van de deelneming, vast in het dossier.' },
  { categorie: 'Deelnemingen', vraag: 'Materiële afwijking — correctie of teruggave opdracht', antwoord: 'Stel vast of het management een correctie wil aanbrengen indien de afwijking materieel is; bij weigering: voorstel tot aanpassing vastleggen en zo nodig opdracht teruggeven (Par. 34 en 35 Std. 4410).' },
  { categorie: 'Deelnemingen', vraag: 'Toelichting in jaarrekening', antwoord: 'Stel vast of de deelnemingen correct zijn toegelicht in de jaarrekening, inclusief de gehanteerde waarderingsmethode, het belang, de naam en vestigingsplaats van de deelneming.' },

  // ── Continuïteit ──
  { categorie: 'Continuïteit', vraag: 'Risico / motivatie', antwoord: 'Bij de samenstelling van een jaarrekening dient de accountant na te gaan of het continuïteitsuitgangspunt aanvaardbaar is. Wanneer er twijfel bestaat over de continuïteit van de onderneming kan de going-concern-basis niet zonder meer worden gehanteerd en zijn bijzondere toelichtingen vereist.' },
  { categorie: 'Continuïteit', vraag: 'Signalen die wijzen op continuïteitsrisico', antwoord: 'Ga na of er signalen zijn die wijzen op continuïteitsrisico: negatief eigen vermogen, teruglopende omzet, liquiditeitstekorten, aanzegging van krediet, achterstallige belastingschulden, lopende rechtszaken of afhankelijkheid van één klant of leverancier.' },
  { categorie: 'Continuïteit', vraag: 'Bespreking continuïteit met management', antwoord: 'Bespreek eventuele continuïteitssignalen met het management en ga na welke maatregelen zij treffen om de continuïteit te waarborgen. Leg deze bespreking en de managementreactie vast in het dossier.' },
  { categorie: 'Continuïteit', vraag: 'Beoordeling aanvaardbaarheid going-concern-basis', antwoord: 'Beoordeel op basis van de verkregen informatie of het continuïteitsuitgangspunt aanvaardbaar is voor de opstelling van de jaarrekening en leg deze beoordeling vast.' },
  { categorie: 'Continuïteit', vraag: 'Toelichting continuïteitsrisico in jaarrekening', antwoord: 'Indien er sprake is van een materiële onzekerheid over de continuïteit, stel vast of het management een adequate toelichting heeft opgenomen in de jaarrekening over de aard van de onzekerheid en de geplande maatregelen.' },
  { categorie: 'Continuïteit', vraag: 'Benadrukkingsparagraaf in samenstellingsverklaring', antwoord: 'Overweeg of een benadrukkingsparagraaf in de samenstellingsverklaring vereist is indien de continuïteit onzeker is maar het continuïteitsuitgangspunt nog aanvaardbaar is (Par. 8.1.3 handreiking 1136).' },
  { categorie: 'Continuïteit', vraag: 'Wijziging grondslag — liquidatiewaarde', antwoord: 'Indien de continuïteitsveronderstelling niet langer aanvaardbaar is, stel vast of de jaarrekening is opgesteld op basis van liquidatiewaarden en of dit correct is toegelicht, of overweeg teruggave van de opdracht.' },
  { categorie: 'Continuïteit', vraag: 'Documenteren continuïteitsbeoordeling', antwoord: 'Leg de uitgevoerde continuïteitsbeoordeling, de verkregen informatie, de bespreking met het management en de conclusie volledig vast in het dossier zodat het dossier inzichtelijk is voor een externe kwaliteitsbeoordelaar.' },
];

function initStandaardTeksten() {
  const nu = new Date().toISOString();
  if (!fs.existsSync(standaardTekstenFile)) {
    // Eerste keer: alles seeden
    const items = SEED_STANDAARD_TEKSTEN.map(item => ({
      ...item, id: randomUUID(), aangemaakt: nu, bijgewerkt: nu,
    }));
    fs.writeFileSync(standaardTekstenFile, JSON.stringify(items, null, 2));
  } else {
    // Bestaand bestand: alleen ontbrekende items toevoegen (migratie-veilig)
    let bestaand;
    try { bestaand = JSON.parse(fs.readFileSync(standaardTekstenFile, 'utf-8')); }
    catch { bestaand = []; }
    // Migratie: hernoem categorie 'Algemeen' → 'Visionplanner' voor de originele 8 items
    let gewijzigd = false;
    bestaand = bestaand.map(item => {
      if (item.categorie === 'Algemeen') { gewijzigd = true; return { ...item, categorie: 'Visionplanner' }; }
      return item;
    });
    const nieuw = SEED_STANDAARD_TEKSTEN
      .filter(s => !bestaand.some(b => b.categorie === s.categorie && b.vraag === s.vraag))
      .map(item => ({ ...item, id: randomUUID(), aangemaakt: nu, bijgewerkt: nu }));
    if (nieuw.length > 0 || gewijzigd) {
      fs.writeFileSync(standaardTekstenFile, JSON.stringify([...bestaand, ...nieuw], null, 2));
    }
  }
}

function ensureDirs() {
  [dataDir, veldDir, geschiedenisDir, handtekeningDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
  if (!fs.existsSync(metaFile)) fs.writeFileSync(metaFile, '[]');
  if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, '[]');
  if (!fs.existsSync(klantenFile)) fs.writeFileSync(klantenFile, '[]');
  if (!fs.existsSync(conceptenFile)) fs.writeFileSync(conceptenFile, '[]');
  initStandaardTeksten();
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({
      templateDir: path.join(dataDir, 'docx'),
      kantoorNaam: '',
      logoPad: '',
      ondertekenaars: defaultOndertekenaars,
    }, null, 2));
  } else {
    // Migratie: normaliseer Drs-spelling en voeg Drs. G.O. Visser RA toe indien ontbreekt
    try {
      const s = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      let gewijzigd = false;
      const ondertekenaars = (s.ondertekenaars || []).map(o => {
        const genormaliseerd = o.replace(/^Drs\s+/i, 'Drs. ');
        if (genormaliseerd !== o) gewijzigd = true;
        return genormaliseerd;
      });
      if (!ondertekenaars.some(o => o.includes('Visser'))) {
        ondertekenaars.push('Drs. G.O. Visser RA');
        gewijzigd = true;
      }
      if (gewijzigd) {
        const bijgewerkt = { ...s, ondertekenaars };
        fs.writeFileSync(settingsFile, JSON.stringify(bijgewerkt, null, 2));
        _settingsCache = bijgewerkt;
      }
    } catch {}
  }
}

function readMeta() {
  ensureDirs();
  return JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
}
function writeMeta(data) {
  fs.writeFileSync(metaFile, JSON.stringify(data, null, 2));
}
let _settingsCache = null;
function readSettings() {
  if (!_settingsCache) {
    ensureDirs();
    _settingsCache = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  }
  return _settingsCache;
}
function writeSettings(data) {
  _settingsCache = data;
  fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2));
}
function readVelden(templateId) {
  const f = path.join(veldDir, `${templateId}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : [];
}
function writeVelden(templateId, velden) {
  fs.writeFileSync(path.join(veldDir, `${templateId}.json`), JSON.stringify(velden, null, 2));
}
function readKlanten() { ensureDirs(); return JSON.parse(fs.readFileSync(klantenFile, 'utf-8')); }
function writeKlanten(data) { fs.writeFileSync(klantenFile, JSON.stringify(data, null, 2)); }
function readConcepten() { ensureDirs(); return JSON.parse(fs.readFileSync(conceptenFile, 'utf-8')); }
function writeConcepten(data) { fs.writeFileSync(conceptenFile, JSON.stringify(data, null, 2)); }
function readStandaardTeksten() { ensureDirs(); return JSON.parse(fs.readFileSync(standaardTekstenFile, 'utf-8')); }
function writeStandaardTeksten(data) { fs.writeFileSync(standaardTekstenFile, JSON.stringify(data, null, 2)); }

function getTemplateDocxPath(templateId, versie) {
  const settings = readSettings();
  const dir = settings.templateDir || path.join(dataDir, 'docx');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${templateId}_v${versie}.docx`);
}

// ── App info ──────────────────────────────────────────────────────────────────
ipcMain.handle('app:getVersion', () => app.getVersion());

// ── Template handlers ─────────────────────────────────────────────────────────
ipcMain.handle('templates:getAll', () => readMeta());

ipcMain.handle('templates:getById', (_, id) => {
  const meta = readMeta().find(t => t.id === id);
  if (!meta) return null;
  return { ...meta, velden: readVelden(id) };
});

ipcMain.handle('templates:create', (_, { meta, velden }) => {
  const all = readMeta();
  if (all.find(t => t.id === meta.id)) throw new Error('ID al in gebruik');
  all.push({ ...meta, aangemaakt: new Date().toISOString(), bijgewerkt: new Date().toISOString() });
  writeMeta(all);
  writeVelden(meta.id, velden || []);
  return { ok: true };
});

ipcMain.handle('templates:update', (_, { id, meta, velden }) => {
  const all = readMeta();
  const idx = all.findIndex(t => t.id === id);
  if (idx < 0) throw new Error('Template niet gevonden');
  all[idx] = { ...all[idx], ...meta, bijgewerkt: new Date().toISOString() };
  writeMeta(all);
  if (velden !== undefined) writeVelden(id, velden);
  return { ok: true };
});

ipcMain.handle('templates:delete', (_, id) => {
  writeMeta(readMeta().filter(t => t.id !== id));
  const veldFile = path.join(veldDir, `${id}.json`);
  if (fs.existsSync(veldFile)) fs.unlinkSync(veldFile);
  return { ok: true };
});

ipcMain.handle('templates:selectDocx', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Selecteer Word-sjabloon',
    filters: [{ name: 'Word document', extensions: ['docx'] }],
    properties: ['openFile'],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('templates:copyDocx', (_, { srcPath, templateId, versie }) => {
  const dest = getTemplateDocxPath(templateId, versie);
  fs.copyFileSync(srcPath, dest);
  return dest;
});

ipcMain.handle('templates:duplicate', (_, id) => {
  const all = readMeta();
  const orig = all.find(t => t.id === id);
  if (!orig) throw new Error('Template niet gevonden');
  const nieuwId = id + '-kopie-' + Date.now();
  const nieuw = { ...orig, id: nieuwId, naam: orig.naam + ' (kopie)', aangemaakt: new Date().toISOString(), bijgewerkt: new Date().toISOString() };
  all.push(nieuw);
  writeMeta(all);
  writeVelden(nieuwId, readVelden(id));
  const srcDocx = getTemplateDocxPath(id, orig.versie);
  if (fs.existsSync(srcDocx)) fs.copyFileSync(srcDocx, getTemplateDocxPath(nieuwId, nieuw.versie));
  return nieuwId;
});

ipcMain.handle('templates:toggleFavoriet', (_, id) => {
  const all = readMeta();
  const idx = all.findIndex(t => t.id === id);
  if (idx < 0) throw new Error('Template niet gevonden');
  all[idx].favoriet = !all[idx].favoriet;
  writeMeta(all);
  return all[idx].favoriet;
});

// ── Klanten handlers ──────────────────────────────────────────────────────────
ipcMain.handle('klanten:getAll', () => readKlanten());

ipcMain.handle('klanten:save', (_, klant) => {
  const all = readKlanten();
  const idx = all.findIndex(k => k.id === klant.id);
  if (idx >= 0) {
    all[idx] = { ...klant, bijgewerkt: new Date().toISOString() };
  } else {
    all.push({ ...klant, id: randomUUID(), aangemaakt: new Date().toISOString(), bijgewerkt: new Date().toISOString() });
  }
  writeKlanten(all);
  return { ok: true };
});

ipcMain.handle('klanten:delete', (_, id) => {
  writeKlanten(readKlanten().filter(k => k.id !== id));
  return { ok: true };
});

ipcMain.handle('klanten:selecteerCsv', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Klanten importeren via CSV',
    filters: [{ name: 'CSV-bestand', extensions: ['csv'] }],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return null;
  return fs.readFileSync(filePaths[0], 'utf-8');
});

// ── Concepten handlers ────────────────────────────────────────────────────────
ipcMain.handle('concepten:getAll', () => readConcepten());

ipcMain.handle('concepten:getByTemplate', (_, templateId) => {
  return readConcepten().find(c => c.templateId === templateId) || null;
});

ipcMain.handle('concepten:save', (_, { templateId, templateNaam, waarden }) => {
  const all = readConcepten().filter(c => c.templateId !== templateId);
  all.push({ id: randomUUID(), templateId, templateNaam, waarden, datum: new Date().toISOString() });
  writeConcepten(all);
  return { ok: true };
});

ipcMain.handle('concepten:delete', (_, templateId) => {
  writeConcepten(readConcepten().filter(c => c.templateId !== templateId));
  return { ok: true };
});

// ── Standaard teksten ─────────────────────────────────────────────────────────
ipcMain.handle('standaardTeksten:getAll', () => readStandaardTeksten());

ipcMain.handle('standaardTeksten:save', (_, item) => {
  const all = readStandaardTeksten();
  const idx = all.findIndex(t => t.id === item.id);
  const nu = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...item, bijgewerkt: nu };
  } else {
    all.push({ ...item, id: randomUUID(), aangemaakt: nu, bijgewerkt: nu });
  }
  writeStandaardTeksten(all);
  return { ok: true };
});

ipcMain.handle('standaardTeksten:delete', (_, id) => {
  writeStandaardTeksten(readStandaardTeksten().filter(t => t.id !== id));
  return { ok: true };
});

ipcMain.handle('standaardTeksten:reorderAll', (_, items) => {
  writeStandaardTeksten(items);
  return { ok: true };
});

ipcMain.handle('templates:getCategorieen', () => {
  const all = readMeta();
  return [...new Set(all.map(t => t.categorie).filter(Boolean))].sort();
});

// ── Docxtemplater hulpfunctie ─────────────────────────────────────────────────
/**
 * Word kan sjabloontags (bv. {Boekjaar}) splitsen over meerdere XML-runs,
 * wat Docxtemplater "unclosed_tag" fouten veroorzaakt.
 * Deze functie voegt aangrenzende runs samen zodat de tag in één
 * <w:t>-element terechtkomt.
 */
function fixSplitTemplateTags(zip) {
  // Verwerk alle relevante XML-bestanden in het word/-gedeelte van de docx
  const doelBestanden = Object.keys(zip.files).filter(name =>
    !zip.files[name].dir &&
    name.startsWith('word/') &&
    name.endsWith('.xml') &&
    !name.includes('_rels')
  );
  for (const naam of doelBestanden) {
    let xml;
    try { xml = zip.files[naam].asText(); } catch { continue; }

    // Stap 1: verwijder zelf-sluitende inline-elementen die Word tussen runs plaatst
    // (spellingmarkeringen, bladwijzers) — ze beïnvloeden de documentinhoud niet
    xml = xml.replace(/<w:(?:proofErr|bookmarkStart|bookmarkEnd)[^>]*\/?>/g, '');

    // Stap 2: voeg opeenvolgende runs samen waar de tekst een { heeft maar nog geen }
    // Iteratief totdat er geen wijzigingen meer zijn (voor tags gesplitst over 3+ runs)
    let vorige;
    do {
      vorige = xml;
      xml = xml.replace(
        /(<w:t(?:[^>]*)>[^<]*\{[^}<]*)<\/w:t><\/w:r><w:r(?:[^>]*)?>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t(?:[^>]*)?>/g,
        '$1'
      );
    } while (xml !== vorige);

    zip.file(naam, xml);
  }
  return zip;
}

/**
 * Na het renderen verwijdert deze functie opeenvolgende lege alinea's uit het
 * document. Dit voorkomt witte gaten die ontstaan wanneer conditionele blokken
 * ({#rente_euribor}...{/rente_euribor}) niet worden gerenderd.
 * Reeksen van 2+ lege alinea's (geen <w:r>-elementen) worden teruggebracht naar 1.
 */
function compacteerLegeAlineas(zip) {
  const doelBestanden = Object.keys(zip.files).filter(name =>
    !zip.files[name].dir &&
    /^word\/(document|header\d*|footer\d*)\.xml$/.test(name)
  );
  for (const naam of doelBestanden) {
    let xml;
    try { xml = zip.files[naam].asText(); } catch { continue; }
    let aantalLeeg = 0;
    xml = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (match) => {
      // Een alinea is leeg als hij geen tekstrun (<w:r>) bevat
      if (!/<w:r[\s>]/.test(match)) {
        aantalLeeg++;
        return aantalLeeg <= 1 ? match : '';
      }
      aantalLeeg = 0;
      return match;
    });
    zip.file(naam, xml);
  }
}

// ── Export helpers ────────────────────────────────────────────────────────────
async function genereerDocxImpl({ templateId, values, ondertekekenaarNaam, skipVolgnummer }) {
  const all = readMeta();
  const meta = all.find(t => t.id === templateId);
  if (!meta) throw new Error('Template niet gevonden');

  const docxPath = getTemplateDocxPath(templateId, meta.versie);
  if (!fs.existsSync(docxPath)) throw new Error('DOCX bestand niet gevonden: ' + docxPath);

  let renderValues = { ...values };

  // Volgnummer ophogen en injecteren als {volgnummer}
  if (!skipVolgnummer && meta.volgnummerActief) {
    const prefix  = meta.volgnummerPrefix  || '';
    const padding = meta.volgnummerPadding || 4;
    const huidig  = meta.volgnummerHuidig  || 1;
    renderValues.volgnummer = `${prefix}${String(huidig).padStart(padding, '0')}`;
  }

  // Handtekening-afbeelding bepalen voor {%handtekening}
  // Volgorde: 1) tekenDocument-knop (ondertekekenaarNaam)
  //           2) digitaal_ondertekenen='ja' + Behandelaar/ondertekenaar in values
  //           3) transparante fallback (1×1 px)
  const settings = readSettings();
  const handtekeningPaden = settings.handtekeningPaden || {};
  let sigNaam = ondertekekenaarNaam || null;
  if (!sigNaam) {
    const digi = (values.digitaal_ondertekenen || '').toLowerCase().trim();
    if (digi === 'ja') {
      sigNaam = values.ondertekenaar || values.Behandelaar || values.behandelaar || null;
    }
  }
  const sigPad = sigNaam && handtekeningPaden[sigNaam] ? handtekeningPaden[sigNaam] : null;
  renderValues.handtekening = sigPad;
  // Wis de controlevariabele zodat deze niet als tekst in het document verschijnt
  renderValues.digitaal_ondertekenen = '';

  // Kantoorvariabelen auto-invullen vanuit instellingen (overschrijft NIET als al ingevuld)
  renderValues.kantoor_naam            = renderValues.kantoor_naam            || settings.kantoorNaam     || '';
  renderValues.kantoor_adres           = renderValues.kantoor_adres           || settings.kantoorAdres    || '';
  renderValues.kantoor_postcode_plaats = renderValues.kantoor_postcode_plaats || [settings.kantoorPostcode, settings.kantoorPlaats].filter(Boolean).join('  ') || '';
  renderValues.kantoor_telefoon        = renderValues.kantoor_telefoon        || settings.kantoorTelefoon || '';
  renderValues.kantoor_email           = renderValues.kantoor_email           || settings.kantoorEmail    || '';
  renderValues.kantoor_website         = renderValues.kantoor_website         || settings.kantoorWebsite  || '';
  renderValues.kantoor_kvk             = renderValues.kantoor_kvk             || settings.kantoorKvk      || '';
  renderValues.kantoor_btw             = renderValues.kantoor_btw             || settings.kantoorBtw      || '';

  const PizZip = require('pizzip');
  const Docxtemplater = require('docxtemplater');
  const ImageModule = require('docxtemplater-image-module-free');

  const imageModule = new ImageModule({
    centered: false,
    getImage(tagValue) {
      if (!tagValue) return TRANSPARENT_PNG;
      try { return fs.readFileSync(tagValue); } catch { return TRANSPARENT_PNG; }
    },
    getSize(img) {
      if (img === TRANSPARENT_PNG) return [1, 1];
      return [200, 80]; // breedte × hoogte in pixels
    },
  });

  const content = fs.readFileSync(docxPath, 'binary');
  let buf;
  try {
    const zip = fixSplitTemplateTags(new PizZip(content));
    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
      stripInvalidXMLChars: true,
      nullGetter: (part) => part.module ? [] : '',
    });
    doc.render(renderValues);
    const renderedZip = doc.getZip();
    compacteerLegeAlineas(renderedZip);
    buf = renderedZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  } catch (e) {
    const errors = e.properties?.errors;
    let details = '';
    if (Array.isArray(errors) && errors.length > 0) {
      details = errors.map(err => {
        const uitleg = err.properties?.explanation;
        const tag   = err.properties?.xtag;
        const id    = err.properties?.id;
        return [uitleg, tag ? `tag: {${tag}}` : '', id ? `(${id})` : '']
          .filter(Boolean).join(' ');
      }).filter(Boolean).join('; ');
    }
    throw new Error(`Documentfout: ${details || e.message || String(e)}`);
  }

  // Na succesvolle render: volgnummer verhogen
  if (!skipVolgnummer && meta.volgnummerActief) {
    const idx = all.findIndex(t => t.id === templateId);
    if (idx >= 0) {
      all[idx].volgnummerHuidig = (meta.volgnummerHuidig || 1) + 1;
      writeMeta(all);
    }
  }

  const suffix = ondertekekenaarNaam ? '_getekend' : '';
  const outName = `${meta.naam.replace(/[^a-zA-Z0-9]/g, '_')}${suffix}_${Date.now()}.docx`;
  const outPath = path.join(os.tmpdir(), outName);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

// ── Export handlers ───────────────────────────────────────────────────────────
ipcMain.handle('export:generateDocx', async (_, payload) =>
  genereerDocxImpl({ ...payload, skipVolgnummer: false })
);

ipcMain.handle('export:tekenDocument', async (_, { templateId, values, ondertekekenaarNaam }) =>
  genereerDocxImpl({ templateId, values, ondertekekenaarNaam, skipVolgnummer: true })
);

ipcMain.handle('export:openInWord', (_, filePath) => {
  shell.openPath(filePath);
  return { ok: true };
});

ipcMain.handle('export:exportPdf', async (_, docxPath) => {
  const pdfPath = docxPath.replace(/\.docx$/, '.pdf');
  if (process.platform === 'win32') {
    const ed = docxPath.replace(/'/g, "''");
    const ep = pdfPath.replace(/'/g, "''");
    const ps = `$w=New-Object -ComObject Word.Application;$w.Visible=$false;$d=$w.Documents.Open('${ed}');$d.SaveAs([ref]'${ep}',[ref]17);$d.Close();$w.Quit()`;
    await new Promise((resolve, reject) =>
      execFile('powershell', ['-NoProfile', '-Command', ps], err => err ? reject(err) : resolve())
    );
  } else {
    await new Promise((resolve, reject) =>
      exec(`soffice --headless --convert-to pdf --outdir "${path.dirname(docxPath)}" "${docxPath}"`, err => err ? reject(err) : resolve())
    );
  }
  return pdfPath;
});

ipcMain.handle('export:openPdf', (_, pdfPath) => {
  shell.openPath(pdfPath);
  return { ok: true };
});

ipcMain.handle('export:print', (_, filePath) => {
  if (process.platform === 'win32') {
    const fp = filePath.replace(/'/g, "''");
    execFile('powershell', [
      '-NoProfile', '-Command',
      `Start-Process -FilePath '${fp}' -Verb Print`,
    ], () => {});
  } else {
    shell.openPath(filePath);
  }
  return { ok: true };
});

ipcMain.handle('export:sendEmail', (_, { bijlagePad }) => {
  if (process.platform === 'win32') {
    const ep = bijlagePad.replace(/'/g, "''");
    const ps = `$o=New-Object -ComObject Outlook.Application;$m=$o.CreateItem(0);$m.Attachments.Add('${ep}');$m.Display()`;
    execFile('powershell', ['-NoProfile', '-Command', ps], () => {});
  } else {
    shell.openExternal('mailto:?subject=Document');
  }
  return { ok: true };
});

ipcMain.handle('export:saveDocxToDir', (_, { srcPath, opslagMap, naam }) => {
  if (!srcPath || !fs.existsSync(srcPath)) throw new Error('Bronbestand niet gevonden');
  if (!fs.existsSync(opslagMap)) fs.mkdirSync(opslagMap, { recursive: true });
  const doel = path.join(opslagMap, naam);
  fs.copyFileSync(srcPath, doel);
  return doel;
});

ipcMain.handle('export:bulkGenereer', async (_, { templateId, rijen, opslagMap }) => {
  const meta = readMeta().find(t => t.id === templateId);
  if (!meta) throw new Error('Template niet gevonden');
  const docxPath = getTemplateDocxPath(templateId, meta.versie);
  if (!fs.existsSync(docxPath)) throw new Error('DOCX bestand niet gevonden: ' + docxPath);

  const PizZip = require('pizzip');
  const Docxtemplater = require('docxtemplater');
  const content = fs.readFileSync(docxPath, 'binary');

  if (!fs.existsSync(opslagMap)) fs.mkdirSync(opslagMap, { recursive: true });

  const paden = [];
  const fouten = [];

  for (let i = 0; i < rijen.length; i++) {
    const values = rijen[i];
    try {
      const zip = fixSplitTemplateTags(new PizZip(content));
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true, linebreaks: true, stripInvalidXMLChars: true,
        nullGetter: (part) => part.module ? [] : '',
      });
      doc.render(values);
      const renderedZip = doc.getZip();
      compacteerLegeAlineas(renderedZip);
      const buf = renderedZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      const naamBase = Object.values(values).filter(Boolean).slice(0, 2).join('_').replace(/[^a-zA-Z0-9_\-]/g, '_') || `rij_${i + 1}`;
      const uitvoerNaam = `${meta.naam.replace(/[^a-zA-Z0-9]/g, '_')}_${naamBase}_${i + 1}.docx`;
      const uitvoerPad = path.join(opslagMap, uitvoerNaam);
      fs.writeFileSync(uitvoerPad, buf);
      paden.push(uitvoerPad);
    } catch (e) {
      fouten.push({ rij: i + 1, fout: e.message || String(e) });
    }
  }

  return { paden, fouten };
});

ipcMain.handle('export:saveDocxAs', async (_, { srcPath, standaardNaam, defaultDir }) => {
  if (!srcPath || !fs.existsSync(srcPath)) throw new Error('Bronbestand niet gevonden');
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Opslaan als Word-document',
    defaultPath: defaultDir ? path.join(defaultDir, standaardNaam) : standaardNaam,
    filters: [{ name: 'Word document', extensions: ['docx'] }],
  });
  if (canceled) return null;
  fs.copyFileSync(srcPath, filePath);
  return filePath;
});

ipcMain.handle('export:savePdfAs', async (_, { srcPath, standaardNaam, defaultDir }) => {
  if (!srcPath || !fs.existsSync(srcPath)) throw new Error('Bronbestand niet gevonden');
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Opslaan als PDF',
    defaultPath: defaultDir ? path.join(defaultDir, standaardNaam) : standaardNaam,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled) return null;
  fs.copyFileSync(srcPath, filePath);
  return filePath;
});

// ── Instellingen handlers ─────────────────────────────────────────────────────
ipcMain.handle('settings:get', () => readSettings());

ipcMain.handle('settings:set', (_, updates) => {
  writeSettings({ ...readSettings(), ...updates });
  return { ok: true };
});

ipcMain.handle('settings:selectDir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Selecteer map voor sjablonen',
    properties: ['openDirectory'],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('settings:selectLogo', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Selecteer logo',
    filters: [{ name: 'Afbeelding', extensions: ['png', 'jpg', 'jpeg'] }],
    properties: ['openFile'],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('settings:selectHandtekening', async (_, naam) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: `Handtekening selecteren voor ${naam}`,
    filters: [{ name: 'Afbeelding', extensions: ['png', 'jpg', 'jpeg'] }],
    properties: ['openFile'],
  });
  if (canceled) return null;
  const src = filePaths[0];
  const ext = path.extname(src).toLowerCase() || '.png';
  const safe = naam.replace(/[^a-zA-Z0-9]/g, '_');
  const dest = path.join(handtekeningDir, `${safe}${ext}`);
  fs.copyFileSync(src, dest);
  return dest;
});

ipcMain.handle('settings:getOneDrivePad', () => {
  const home = os.homedir();
  // Scan homedirectory op OneDrive-mappen (OneDrive, OneDrive - Bedrijf, etc.)
  try {
    const entries = fs.readdirSync(home, { withFileTypes: true });
    const oneDriveMappen = entries
      .filter(e => e.isDirectory() && e.name.toLowerCase().startsWith('onedrive'))
      .map(e => path.join(home, e.name));
    if (oneDriveMappen.length > 0) return oneDriveMappen[0];
  } catch {}
  return null;
});

// ── Geschiedenis handlers ─────────────────────────────────────────────────────
function readHistory() {
  if (!fs.existsSync(historyFile)) return [];
  return JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
}
function writeHistory(data) {
  fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
}

ipcMain.handle('history:getAll', () => readHistory());

ipcMain.handle('history:add', (_, entry) => {
  const ext = path.extname(entry.docxPad || '.docx');
  const bestandsnaam = `${entry.templateId}_${Date.now()}${ext}`;
  const persistentPad = path.join(geschiedenisDir, bestandsnaam);
  let savedDocxPad = null;
  if (entry.docxPad && fs.existsSync(entry.docxPad)) {
    try {
      fs.copyFileSync(entry.docxPad, persistentPad);
      savedDocxPad = persistentPad;
    } catch {}
  }

  // Ondertitel samenstellen uit gemarkeerde velden of bekende sleutels
  let ondertitel = '';
  try {
    const velden = readVelden(entry.templateId);
    const gemarkeerd = velden.filter(v => v.toonInGeschiedenisTitel);
    if (gemarkeerd.length > 0) {
      ondertitel = gemarkeerd
        .map(v => entry.values?.[v.sleutel])
        .filter(Boolean)
        .join(' — ');
    } else {
      // Fallback op bekende sleutelnamen
      const kandidaten = [
        'bedrijfsnaam', 'klantnaam', 'naam_client', 'naam_cliënt', 'naam',
        'klantnummer', 'relatienummer', 'kvk_nummer', 'debiteurnummer',
      ];
      const gevonden = kandidaten.map(k => entry.values?.[k]).filter(Boolean);
      ondertitel = gevonden.slice(0, 2).join(' — ');
    }
  } catch {}

  const nieuwEntry = {
    id: randomUUID(),
    templateId: entry.templateId,
    templateNaam: entry.templateNaam,
    categorie: entry.categorie,
    datum: new Date().toISOString(),
    values: entry.values,
    docxPad: savedDocxPad,
    ondertitel,
  };
  const history = readHistory();
  history.unshift(nieuwEntry);
  if (history.length > 200) history.length = 200;
  writeHistory(history);
  return nieuwEntry;
});

ipcMain.handle('history:delete', (_, id) => {
  const history = readHistory();
  const entry = history.find(e => e.id === id);
  if (entry?.docxPad && fs.existsSync(entry.docxPad)) {
    try { fs.unlinkSync(entry.docxPad); } catch {}
  }
  writeHistory(history.filter(e => e.id !== id));
  return { ok: true };
});

// ── DOCX variabelen scanner ───────────────────────────────────────────────────
ipcMain.handle('templates:scanDocxVars', (_, filePath) => {
  const PizZip = require('pizzip');
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);

  const xmlNames = Object.keys(zip.files).filter(
    n => n.startsWith('word/') && n.endsWith('.xml') && !zip.files[n].dir
  );

  const variabelen = new Set();
  const condities = new Set();

  for (const xmlName of xmlNames) {
    const xml = zip.files[xmlName].asText();
    // Concateneer alle <w:t> tekstnodes om gesplitste runs samen te voegen
    const parts = [];
    const wtRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let m;
    while ((m = wtRe.exec(xml)) !== null) parts.push(m[1]);
    const tekst = parts.join('');

    // Gewone variabelen {naam}
    const varRe = /\{([^{}#\/^@>|\s][^{}\/^>|]*)\}/g;
    while ((m = varRe.exec(tekst)) !== null) {
      const tag = m[1].trim();
      if (tag && !tag.startsWith('#') && !tag.startsWith('^')) variabelen.add(tag);
    }
    // Conditionele blokken {#conditie}
    const condRe = /\{[#^]([^{}]+)\}/g;
    while ((m = condRe.exec(tekst)) !== null) condities.add(m[1].trim());
  }
  // Sluitende condities weghalen uit variabelen
  condities.forEach(c => variabelen.delete(c));

  return { variabelen: [...variabelen], condities: [...condities] };
});

// ── KVK uittreksel scanner ────────────────────────────────────────────────────
ipcMain.handle('kvk:selectPdf', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Selecteer KVK uittreksel (PDF)',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['openFile'],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('kvk:scanPdf', async (_, filePath) => {
  // Polyfill browser DOM-API's die pdfjs-dist nodig heeft in de Node.js-omgeving
  if (typeof global.DOMMatrix === 'undefined') {
    const { DOMMatrix, DOMPoint, DOMRect } = require('@napi-rs/canvas');
    global.DOMMatrix = DOMMatrix;
    global.DOMPoint  = DOMPoint;
    global.DOMRect   = DOMRect;
  }
  // pdf-parse v2 CJS wordt gekopieerd naar electron/ via scripts/bundle-electron.mjs
  const bundlePad = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'pdf-parse-bundle.cjs')
    : path.join(__dirname, 'pdf-parse-bundle.cjs');
  const { PDFParse } = require(bundlePad);
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  const t = data.text;
  const result = {};

  const zoek = (regex) => t.match(regex)?.[1]?.trim() || null;

  const bedrijfsnaam = zoek(/Handelsnaam\s*[:\n\r]+([^\n\r]+)/i)
    || zoek(/Naam\s*[:\n\r]+([^\n\r]+)/i);
  if (bedrijfsnaam) result.bedrijfsnaam = bedrijfsnaam;

  const kvknummer = zoek(/KVK[- ]?nummer\s*[:\n\r]+(\d{8})/i);
  if (kvknummer) result.kvk_nummer = kvknummer;

  const rechtsvorm = zoek(/Rechtsvorm\s*[:\n\r]+([^\n\r]+)/i);
  if (rechtsvorm) result.rechtsvorm = rechtsvorm;

  const adres = zoek(/Vestigingsadres\s*[:\n\r]+([^\n\r]+)/i)
    || zoek(/Adres\s*[:\n\r]+([^\n\r]+)/i);
  if (adres) result.adres = adres;

  const bestuurder = zoek(/(?:Bestuurder|Directeur|Vennoot)\s*[:\n\r]+([^\n\r]+)/i);
  if (bestuurder) result.naam_bestuurder = bestuurder;

  const geboortedatum = zoek(/Geboortedatum\s*[:\n\r]+(\d{1,2}[-\s]\d{1,2}[-\s]\d{4}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (geboortedatum) result.geboortedatum = geboortedatum;

  const oprichtingsdatum = zoek(/Datum\s*oprichting\s*[:\n\r]+(\d{1,2}[-.\s]\d{1,2}[-.\s]\d{4}|\d{1,2}\s+\w+\s+\d{4})/i)
    || zoek(/Oprichtingsdatum\s*[:\n\r]+(\d{1,2}[-.\s]\d{1,2}[-.\s]\d{4}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (oprichtingsdatum) result.oprichtingsdatum = oprichtingsdatum;

  // Postcode (4 cijfers + 2 letters) + plaatsnaam op zelfde of volgende regel
  const postcodeMatch = t.match(/(\d{4}\s*[A-Z]{2})\s+([A-Za-zÀ-ÿ][^\n\r]{1,30})/);
  if (postcodeMatch) {
    result.postcode = postcodeMatch[1].replace(/(\d{4})\s*([A-Z]{2})/, '$1 $2');
    result.plaats = postcodeMatch[2].trim();
  }

  const sbi_code = zoek(/SBI[- ]?code\s*[:\n\r]+(\d[\d\s\/\-]*)/i);
  if (sbi_code) result.sbi_code = sbi_code.replace(/\s+/g, '');

  const btw_nummer = zoek(/(?:BTW[- ]?nummer|Omzetbelasting[- ]?nummer)\s*[:\n\r]+([A-Za-z]{2}[\d]+B\d+)/i);
  if (btw_nummer) result.btw_nummer = btw_nummer;

  return result;
});

// ── Bedrijvenmonitor / CompanyInfo lookup ────────────────────────────────────

/**
 * Fetches a URL via HTTPS with redirect following. Returns HTML string.
 */
function fetchHtml(url, maxRedirects = 5, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let urlObj;
    try { urlObj = new URL(url); } catch { return reject(new Error(`Ongeldige URL: ${url}`)); }

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9',
      },
    };

    const req = https.get(options, (res) => {
      const { statusCode, headers } = res;
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location && maxRedirects > 0) {
        const next = headers.location.startsWith('http')
          ? headers.location
          : `https://${urlObj.hostname}${headers.location}`;
        res.resume();
        resolve(fetchHtml(next, maxRedirects - 1, timeoutMs));
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * Extracts one company record from a detail page.
 * Returns { naam, kvknummer, adres, postcode, plaats, bron } or null.
 */
function parseerBedrijfPagina(html, bron) {
  const rec = { bron };

  // 1. JSON-LD schema.org
  for (const [, raw] of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      let d = JSON.parse(raw.trim());
      if (Array.isArray(d)) d = d.find(j => /^(Organization|LocalBusiness|Corporation)$/.test(j['@type']));
      if (d && /^(Organization|LocalBusiness|Corporation)$/.test(d['@type'])) {
        if (d.name) rec.naam = d.name;
        const a = d.address || {};
        if (a.streetAddress) rec.adres = a.streetAddress;
        if (a.postalCode)    rec.postcode = a.postalCode.replace(/\s+/, ' ');
        if (a.addressLocality) rec.plaats = a.addressLocality;
        if (rec.adres) break;
      }
    } catch { /* skip */ }
  }

  // 2. KVK 8-digit number
  const kvkM = html.match(/KVK[^<\n]{0,30}?(\d{8})/i) || html.match(/handelsregister[^<\n]{0,30}?(\d{8})/i);
  if (kvkM) rec.kvknummer = kvkM[1];

  // 3. Postcode fallback (4 digits + space + 2 uppercase)
  if (!rec.postcode) {
    const m = html.match(/\b(\d{4}\s+[A-Z]{2})\b/);
    if (m) rec.postcode = m[1];
  }

  // 4. Meta description fallback for address + city
  if (!rec.adres || !rec.plaats) {
    const metaM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,}?)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']{10,}?)["'][^>]+name=["']description["']/i);
    if (metaM) {
      const desc = metaM[1];
      if (!rec.adres) {
        const am = desc.match(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-'\.]+\s+\d+[A-Za-z]?)/);
        if (am) rec.adres = am[1].trim();
      }
      if (!rec.postcode || !rec.plaats) {
        const pm = desc.match(/(\d{4}\s*[A-Z]{2})\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s\-']+)/);
        if (pm) {
          if (!rec.postcode) rec.postcode = pm[1].replace(/\s+/, ' ');
          if (!rec.plaats)   rec.plaats = pm[2].trim().split(/[,\n\r;]/)[0].trim();
        }
      }
    }
  }

  // 5. Page title / h1 as last resort for company name
  if (!rec.naam) {
    const h1 = html.match(/<h1[^>]*>\s*([^<]{3,}?)\s*<\/h1>/i);
    const title = html.match(/<title[^>]*>([^<|–\-]{3,}?)\s*[-|–]/i);
    rec.naam = (h1?.[1] || title?.[1] || '').trim() || undefined;
  }

  return (rec.naam || rec.adres || rec.postcode) ? rec : null;
}

/** Deduplicate by lowercase company name. Keeps first occurrence. */
function dedupliceer(lijst) {
  const seen = new Set();
  return lijst.filter(r => {
    const key = (r.naam || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function zoekOpBedrijvenmonitor(naam, plaats) {
  const params = new URLSearchParams({ bedrijfsnaam: naam.trim() });
  if (plaats?.trim()) params.set('gemeente', plaats.trim());
  const zoekHtml = await fetchHtml(`https://bedrijvenmonitor.info/zoeken?${params}`);

  const links = [...new Set(
    [...zoekHtml.matchAll(/href="(\/bedrijf\/[^"?#]+)"/g)].map(m => m[1])
  )].slice(0, 4);
  if (!links.length) return [];

  const settled = await Promise.allSettled(
    links.map(l =>
      fetchHtml(`https://bedrijvenmonitor.info${l}`)
        .then(html => parseerBedrijfPagina(html, 'bedrijvenmonitor.info'))
    )
  );
  return settled.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
}

async function zoekOpCompanyInfo(naam, plaats) {
  const q = [naam.trim(), plaats?.trim()].filter(Boolean).join(' ');
  const zoekHtml = await fetchHtml(`https://companyinfo.nl/zoeken?q=${encodeURIComponent(q)}`);

  const links = [...new Set(
    [...zoekHtml.matchAll(/href="(\/organisatieprofiel\/[^"?#]+)"/g)].map(m => m[1])
  )].slice(0, 4);
  if (!links.length) return [];

  const settled = await Promise.allSettled(
    links.map(l =>
      fetchHtml(`https://companyinfo.nl${l}`)
        .then(html => parseerBedrijfPagina(html, 'companyinfo.nl'))
    )
  );
  return settled.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
}

ipcMain.handle('bedrijf:zoek', async (_, { naam, plaats }) => {
  try {
    // Search both sources in parallel
    const [bmResultaten, ciResultaten] = await Promise.allSettled([
      zoekOpBedrijvenmonitor(naam, plaats),
      zoekOpCompanyInfo(naam, plaats),
    ]);

    const alle = [
      ...(bmResultaten.status === 'fulfilled' ? bmResultaten.value : []),
      ...(ciResultaten.status === 'fulfilled' ? ciResultaten.value : []),
    ];

    const resultaten = dedupliceer(alle);
    if (!resultaten.length) {
      return { fout: `Geen bedrijven gevonden voor "${naam}"${plaats ? ' in ' + plaats : ''}.` };
    }
    return { resultaten };
  } catch (err) {
    return { fout: err.message || 'Zoeken mislukt' };
  }
});

// ── Venster ───────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Sjablonenplatform',
    autoHideMenuBar: true,
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

}

app.whenReady().then(() => {
  ensureDirs();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
