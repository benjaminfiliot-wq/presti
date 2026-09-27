// Témoin de l'horloge simulée (026-009) : l'implémentation de référence sur laquelle le contrôle « horloge-simulee » de
// scripts/juges-026-horloge-bus-preuve.mjs doit être VERT, et ses sabotages ROUGES. Ce n'est pas
// scripts/lib/horloge-simulee.mjs, que la fiche 026-045 écrit.
//   figer(isoUtc) : Date.now(), new Date() et performance.now() partent de cet instant et ne bougent plus seuls ;
//   avancer(ms)   : les fait gagner ms millisecondes.
// Sabotages, par la variable d'environnement TEMOIN_SABOTAGE : 'figer' (figer ne fait rien : l'heure réelle reste),
// 'avancer' (avancer ne fait rien), 'decale' (l'instant figé est décalé de deux heures, comme une heure de Paris lue pour de l'UTC), 'fuseau' (Intl forcé en
// UTC : l'instant est juste, mais l'heure de Paris est lue en UTC).
const Reel = Date
const perfReel = performance.now.bind(performance)
const sabotage = process.env.TEMOIN_SABOTAGE || ''
let fige = null // { t: millisecondes depuis l'époque, p: performance.now() simulé }

function Simulee(...a) {
  if (!new.target) return new Reel(Simulee.now()).toString()
  return a.length ? new Reel(...a) : new Reel(Simulee.now())
}
Simulee.prototype = Reel.prototype
Simulee.now = () => (fige ? fige.t : Reel.now())
Simulee.parse = Reel.parse
Simulee.UTC = Reel.UTC

export function figer(isoUtc) {
  const t = Reel.parse(isoUtc)
  if (!Number.isFinite(t)) throw new Error(`figer : date illisible « ${isoUtc} »`)
  if (sabotage === 'figer') return
  fige = { t: sabotage === 'decale' ? t + 2 * 3600_000 : t, p: perfReel() }
  globalThis.Date = Simulee
  performance.now = () => (fige ? fige.p : perfReel())
  if (sabotage === 'fuseau') {
    const DTF = Intl.DateTimeFormat
    Intl.DateTimeFormat = function DateTimeFormatUtc(loc, o = {}) { return new DTF(loc, { ...o, timeZone: 'UTC' }) }
  }
}

export function avancer(ms) {
  if (!fige || sabotage === 'avancer') return
  fige.t += ms
  fige.p += ms
}
