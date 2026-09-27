// scripts/lib/horloge-simulee.mjs — l'horloge simulée des juges de l'horloge applicative (fiche 026-045), écrite par Claude Code.
//
// Chargée dans le processus ENFANT d'un juge, le seul où tourne le code jugé :
//   - par `--import` (NODE_OPTIONS=--import=<cette URL>) : si HORLOGE_FIGER=<ISO en UTC> est posée, l'horloge est figée dès
//     le chargement, avant tout import du code jugé ;
//   - ou par un import ordinaire, puis figer(…) : c'est le même module, donc la même horloge.
//
//   figer(isoUtc)   Date.now(), new Date() et performance.now() partent de cet instant et n'avancent plus seuls ;
//   avancer(ms)     les fait tous gagner `ms` millisecondes, d'un coup (rien n'attend) ;
//   maintenant()    l'instant simulé, en millisecondes ;
//   liberer()       rend l'horloge réelle (Date, performance.now, setTimeout, setInterval d'origine).
//
// L'heure de Paris se lit comme dans le code jugé, par Intl avec Europe/Paris sur un vrai objet Date : le changement d'heure
// (25/10/2026, 01 h 00 UTC) est donc celui de la base de fuseaux de Node, jamais un décalage codé ici.
//
// Les délais de setTimeout et setInterval sont RACCOURCIS pendant que l'horloge est figée : un délai de d ms attend
// min(d, max(RACCOURCI_MIN, d / RACCOURCI)) ms réelles (au dixième, 50 ms au moins, jamais plus que demandé). Ils ne font
// pas avancer l'horloge : c'est le juge qui la fait avancer, par avancer(). Le juge le dit dans sa sortie (RACCOURCI_DIT).
const Reelle = globalThis.Date
const perfReelle = performance.now.bind(performance)
const setTimeoutReel = globalThis.setTimeout
const setIntervalReel = globalThis.setInterval
export const RACCOURCI = 10
export const RACCOURCI_MIN = 50
export const RACCOURCI_DIT = `délais de setTimeout et setInterval raccourcis au 1/${RACCOURCI} (${RACCOURCI_MIN} ms au moins), sans faire avancer l'horloge simulée`

let instant = null // millisecondes depuis l'époque, ou null : horloge réelle
let perf = 0 // performance.now() simulé

/** Le délai réel d'un délai demandé, horloge figée. */
export const delaiRaccourci = (d) => {
  const n = Number(d)
  if (!Number.isFinite(n) || n <= RACCOURCI_MIN) return Math.max(0, Number.isFinite(n) ? n : 0)
  return Math.min(n, Math.max(RACCOURCI_MIN, Math.round(n / RACCOURCI)))
}

function DateSimulee(...args) {
  // appelée sans new, Date() rend une chaîne, comme l'originale
  if (!new.target) return new Reelle(DateSimulee.now()).toString()
  if (args.length === 0) return Reflect.construct(Reelle, [DateSimulee.now()], new.target)
  return Reflect.construct(Reelle, args, new.target)
}
DateSimulee.prototype = Reelle.prototype
Object.defineProperty(DateSimulee, 'name', { value: 'Date' })
DateSimulee.now = () => (instant === null ? Reelle.now() : instant)
DateSimulee.parse = Reelle.parse
DateSimulee.UTC = Reelle.UTC

function installer() {
  globalThis.Date = DateSimulee
  performance.now = () => (instant === null ? perfReelle() : perf)
  globalThis.setTimeout = (f, d, ...a) => setTimeoutReel(f, instant === null ? d : delaiRaccourci(d), ...a)
  globalThis.setInterval = (f, d, ...a) => setIntervalReel(f, instant === null ? d : delaiRaccourci(d), ...a)
}

/** Fige l'horloge à `isoUtc` (une date ISO en UTC, terminée par Z). */
export function figer(isoUtc) {
  const t = Reelle.parse(String(isoUtc))
  if (!/Z$/.test(String(isoUtc)) || !Number.isFinite(t)) throw new Error(`figer : une date ISO en UTC (…Z) est attendue, reçu « ${isoUtc} »`)
  if (instant === null) perf = perfReelle()
  instant = t
  installer()
  return instant
}

/** Fait gagner `ms` millisecondes à Date.now(), new Date() et performance.now(). L'horloge doit être figée. */
export function avancer(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n < 0) throw new Error(`avancer : une durée positive en millisecondes est attendue, reçu « ${ms} »`)
  if (instant === null) throw new Error('avancer : l\'horloge n\'est pas figée (figer d\'abord)')
  instant += n
  perf += n
  return instant
}

export const maintenant = () => DateSimulee.now()
export const estFigee = () => instant !== null

/** Rend l'horloge réelle. */
export function liberer() {
  instant = null
  globalThis.Date = Reelle
  performance.now = perfReelle
  globalThis.setTimeout = setTimeoutReel
  globalThis.setInterval = setIntervalReel
}

// Pour le code du juge qui tourne dans l'enfant sans connaître l'URL de ce module.
globalThis.__HORLOGE_SIMULEE__ = { figer, avancer, maintenant, estFigee, liberer, RACCOURCI_DIT }

// Chargée par --import avec HORLOGE_FIGER : figée avant tout import du code jugé.
if (process.env.HORLOGE_FIGER) figer(process.env.HORLOGE_FIGER)
