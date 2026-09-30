const FUSEAU = 'Europe/Paris'
const PAS_MS = 15 * 60_000
const JOUR_MS = 86_400_000

export const DISPONIBILITES = Object.freeze({
  jours: Object.freeze([1, 2, 3, 4, 5]),
  // 29/09/2026, Benj : « je suis libre tout le temps » — de 9 h à 20 h (lundi au vendredi : le juge RV-2 exclut encore le week-end).
  plages: Object.freeze([[9 * 60, 20 * 60]]),
  dureeMinutes: 15,
  delaiMinimumHeures: 12,
  horizonJours: 10,
  maximum: 40,
})

const calendrier = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
})

function morceaux(instant: number) {
  const p = Object.fromEntries(calendrier.formatToParts(instant).map(x => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute),
    jour: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) }
}

function versInstant(date: string, minute: number): number | null {
  const base = Date.parse(`${date}T00:00:00.000Z`) + minute * 60_000
  for (const decalage of [2, 1]) {
    const instant = base - decalage * 3_600_000
    const p = morceaux(instant)
    if (p.date === date && p.minute === minute) return instant
  }
  return null
}

export function creneauxLibres(maintenant: Date | number, pris: string[]): string[] {
  const debut = new Date(maintenant).getTime()
  if (!Number.isFinite(debut)) return []
  const borneBasse = debut + DISPONIBILITES.delaiMinimumHeures * 3_600_000
  const borneHaute = debut + DISPONIBILITES.horizonJours * JOUR_MS
  const dateDepart = morceaux(debut).date
  const prisSet = new Set(pris.map(x => Date.parse(x)).filter(Number.isFinite))
  const libres: string[] = []
  for (let jour = 0; jour <= DISPONIBILITES.horizonJours; jour++) {
    const date = new Date(Date.parse(`${dateDepart}T00:00:00.000Z`) + jour * JOUR_MS).toISOString().slice(0, 10)
    const numero = new Date(`${date}T00:00:00.000Z`).getUTCDay()
    if (!DISPONIBILITES.jours.includes(numero)) continue
    for (const [debutPlage, finPlage] of DISPONIBILITES.plages) {
      for (let minute = debutPlage; minute < finPlage; minute += DISPONIBILITES.dureeMinutes) {
        const instant = versInstant(date, minute)
        if (instant === null || instant < borneBasse || instant > borneHaute || prisSet.has(instant)) continue
        libres.push(new Date(instant).toISOString())
        if (libres.length === DISPONIBILITES.maximum) return libres
      }
    }
  }
  return libres
}

type Corps = Record<string, unknown> | FormData | URLSearchParams
function champ(corps: Corps, nom: string): unknown {
  return corps instanceof FormData || corps instanceof URLSearchParams ? corps.get(nom) : corps[nom]
}

export function validerReservation(corps: Corps, maintenant: Date | number, pris: string[]):
  { ok: true; creneau: string; telephone: string } | { ok: false; raison: 'creneau' | 'telephone' | 'accord' } {
  const creneau = champ(corps, 'creneau')
  if (typeof creneau !== 'string' || !creneauxLibres(maintenant, pris).includes(creneau)) return { ok: false, raison: 'creneau' }
  const brut = champ(corps, 'telephone')
  if (typeof brut !== 'string' || brut.length > 40) return { ok: false, raison: 'telephone' }
  const numero = brut.trim().replace(/[ .()-]/g, '')
  if (!/^(?:0\d{9}|\+33\d{9})$/.test(numero)) return { ok: false, raison: 'telephone' }
  if (champ(corps, 'accord') !== 'on') return { ok: false, raison: 'accord' }
  return { ok: true, creneau, telephone: numero }
}

function echapper(valeur: unknown): string {
  return String(valeur ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]!)
}

const formatJour = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, weekday: 'long', day: 'numeric', month: 'long' })
const formatHeure = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, hour: '2-digit', minute: '2-digit' })
function document(titre: string, contenu: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${echapper(titre)}</title><style>body{font:16px system-ui,sans-serif;color:#17212b;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.5}fieldset{border:1px solid #ccd2d7;border-radius:8px;margin:1rem 0;padding:1rem}label{display:block;margin:.5rem 0}input[type=tel]{padding:.6rem;max-width:100%;font:inherit}button{padding:.7rem 1rem;font:inherit;cursor:pointer}</style></head><body><main>${contenu}</main></body></html>`
}

export function pageRendezVous({ metier, commune, creneaux, expire_le, erreur }: {
  metier: string; commune: string; creneaux: string[]; expire_le: string; erreur?: string
}): string {
  const groupes = new Map<string, string[]>()
  for (const creneau of creneaux) {
    const instant = new Date(creneau)
    if (!Number.isFinite(instant.getTime())) continue
    const jour = formatJour.format(instant)
    groupes.set(jour, [...(groupes.get(jour) ?? []), creneau])
  }
  const choix = [...groupes].map(([jour, heures]) => `<fieldset><legend>${echapper(jour)}</legend>${heures.map(c => `<label><input type="radio" name="creneau" value="${echapper(c)}" required> ${echapper(formatHeure.format(new Date(c)))}</label>`).join('')}</fieldset>`).join('')
  const expiration = Number.isFinite(Date.parse(expire_le)) ? ` Ce lien expire le ${echapper(formatJour.format(new Date(expire_le)))}.` : ''
  return document('Réserver un appel', `<h1>Réservation d'un appel de 15 min avec Benjamin Filiot, de Presti</h1><p>Pour votre activité ${echapper(metier)} à ${echapper(commune)}.${expiration}</p>${erreur ? `<p role="alert">${echapper(erreur)}</p>` : ''}${choix ? `<form method="post">${choix}<label>Votre numéro de téléphone <input type="tel" name="telephone" autocomplete="tel" required></label><label><input type="checkbox" name="accord" value="on" required> Je demande à être rappelé par Benjamin Filiot, de Presti, au numéro indiqué, au créneau choisi.</label><button type="submit">Réserver cet appel</button></form>` : '<p>Aucun créneau disponible pour le moment.</p>'}`)
}

export function pageConfirmation({ creneau }: { creneau: string }): string {
  const date = new Date(creneau)
  return document('Appel réservé', `<h1>Votre appel est réservé</h1><p>Benjamin Filiot vous rappellera le ${echapper(formatJour.format(date))} à ${echapper(formatHeure.format(date))} (heure de Paris). L'appel dure 15 min.</p>`)
}

export const REPONSE_404 = Object.freeze({ statut: 404, corps: 'Page introuvable.', entetes: Object.freeze({
  'Content-Type': 'text/plain; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
}) })
