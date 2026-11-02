// lib/sms/plage.ts — la plage d'envoi : du lundi au samedi, de 8 h à 20 h, HEURE DE PARIS, hors jours fériés (plan §11, porte 5).
//
// Le fuseau est lu par Intl (Europe/Paris) : l'heure d'été et d'hiver sont gérées, jamais « UTC+1 » en dur. Les jours fériés sont
// calculés (Pâques par l'algorithme de Meeus/Jones/Butcher) : les onze fériés légaux de la métropole, sans l'Alsace-Moselle
// (Vendredi saint, 26 décembre) — un jour de plus fermé ne gêne personne, un jour de moins ouvert, si.

export const HEURE_OUVERTURE = 8
export const HEURE_FERMETURE = 20

const FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short',
})

export type InstantParis = { annee: number; mois: number; jour: number; heure: number; jourSemaine: number }

/** L'instant lu à Paris. `jourSemaine` : 0 = dimanche … 6 = samedi. */
export function lireParis(date: Date): InstantParis {
  const p: Record<string, string> = {}
  for (const x of FORMAT.formatToParts(date)) p[x.type] = x.value
  const jours = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    annee: Number(p.year), mois: Number(p.month), jour: Number(p.day),
    heure: Number(p.hour) % 24, jourSemaine: jours.indexOf(p.weekday),
  }
}

/** Dimanche de Pâques (calendrier grégorien), `[mois, jour]`. */
export function paques(annee: number): [number, number] {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1
  return [mois, jour]
}

const cle = (mois: number, jour: number): string => `${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`

/** Les jours fériés de l'année, au format `MM-JJ`. */
export function joursFeries(annee: number): Set<string> {
  const [m, j] = paques(annee)
  const decale = (n: number): string => { const d = new Date(Date.UTC(annee, m - 1, j + n)); return cle(d.getUTCMonth() + 1, d.getUTCDate()) }
  return new Set([
    '01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25',
    decale(1), // lundi de Pâques
    decale(39), // Ascension
    decale(50), // lundi de Pentecôte
  ])
}

export type VerdictPlage = { ok: true } | { ok: false; raison: 'dimanche' | 'ferie' | 'hors_horaire' }

export function verifierPlage(date: Date): VerdictPlage {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return { ok: false, raison: 'hors_horaire' }
  const t = lireParis(date)
  if (t.jourSemaine === 0) return { ok: false, raison: 'dimanche' }
  if (joursFeries(t.annee).has(cle(t.mois, t.jour))) return { ok: false, raison: 'ferie' }
  if (t.heure >= HEURE_OUVERTURE && t.heure < HEURE_FERMETURE) return { ok: true }
  return { ok: false, raison: 'hors_horaire' }
}
