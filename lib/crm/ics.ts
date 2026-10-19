// CRM — le FLUX D'AGENDA (ICS, RFC 5545) de l'artisan (plan plans/crm-idees-twenty-1810.md, n°6) : « Abonner mon agenda » donne un
// lien privé que Google Agenda, l'iPhone ou Outlook relisent seuls. Il porte les chantiers (journées entières, du début à la fin prévue)
// et les rendez-vous (visite, métré, rendez-vous ; à l'heure dite, une heure, sinon la journée). Module pur : rejoué par
// scripts/crm-lot3-qa.mjs ; la route publique (app/agenda/[jeton]/route.ts) le nourrit.
//
// Minimisation : le titre du chantier et son adresse (l'artisan s'y rend), le type du rendez-vous et sa note ; jamais l'e-mail ni le
// téléphone d'un client, ni un montant. Marque blanche : le nom du calendrier est celui de l'artisan, jamais « Presti ».
import { ajouterJours } from './rappels.ts'

export type EvenementIcs =
  | { uid: string; jour: true; du: string; au: string; titre: string; lieu?: string | null; description?: string | null }
  | { uid: string; jour: false; date: string; heure: string; minutes: number; titre: string; lieu?: string | null; description?: string | null }

/** Échappement d'un texte RFC 5545 (§3.3.11) : antislash, point-virgule, virgule, retours à la ligne. */
export const echapper = (s: string): string => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')

const ENC = new TextEncoder()
/** Plie une ligne à 75 octets UTF-8 (§3.1), sans couper un caractère. */
export function plier(ligne: string): string {
  const morceaux: string[] = []
  let cur = '', taille = 0
  for (const ch of ligne) {
    const t = ENC.encode(ch).length
    const max = morceaux.length ? 74 : 75 // les lignes de suite commencent par une espace
    if (taille + t > max) { morceaux.push(cur); cur = ''; taille = 0 }
    cur += ch; taille += t
  }
  morceaux.push(cur)
  return morceaux.join('\r\n ')
}

const jourIcs = (j: string) => j.replace(/-/g, '')
const horodatageUtc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Le calendrier entier : CRLF, lignes pliées, fuseau Europe/Paris déclaré pour les rendez-vous à l'heure. */
export function genererIcs(p: { nom: string; evenements: readonly EvenementIcs[]; maintenant: Date }): string {
  const l: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Agenda des chantiers//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${echapper(p.nom)}`, 'X-WR-TIMEZONE:Europe/Paris', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
    // Le fuseau de Paris, règles en vigueur (heure d'été le dernier dimanche de mars, heure d'hiver le dernier dimanche d'octobre).
    'BEGIN:VTIMEZONE', 'TZID:Europe/Paris',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE',
  ]
  const stamp = horodatageUtc(p.maintenant)
  for (const e of p.evenements) {
    l.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${stamp}`)
    if (e.jour) l.push(`DTSTART;VALUE=DATE:${jourIcs(e.du)}`, `DTEND;VALUE=DATE:${jourIcs(ajouterJours(e.au, 1))}`)
    else {
      const [h, m] = e.heure.split(':').map(Number)
      const fin = h * 60 + m + e.minutes
      const finJour = fin >= 1440 ? ajouterJours(e.date, 1) : e.date
      const hh = (n: number) => String(Math.floor((n % 1440) / 60)).padStart(2, '0') + String(n % 60).padStart(2, '0')
      l.push(`DTSTART;TZID=Europe/Paris:${jourIcs(e.date)}T${hh(h * 60 + m)}00`, `DTEND;TZID=Europe/Paris:${jourIcs(finJour)}T${hh(fin)}00`)
    }
    l.push(`SUMMARY:${echapper(e.titre)}`)
    if (e.lieu) l.push(`LOCATION:${echapper(e.lieu)}`)
    if (e.description) l.push(`DESCRIPTION:${echapper(e.description)}`)
    l.push('TRANSP:OPAQUE', 'END:VEVENT')
  }
  l.push('END:VCALENDAR')
  return l.map(plier).join('\r\n') + '\r\n'
}

const LIBELLES_RDV: Record<string, string> = { visite: 'Visite technique', metre: 'Métré', rendez_vous: 'Rendez-vous' }

/** Les évènements de l'agenda à partir des lignes du compte : chantiers ouverts datés, rendez-vous à venir (ni faits, ni anciens). */
export function evenementsAgenda(p: {
  jour: string
  chantiers: readonly { id: string; titre: string; statut: string; date_debut: string | null; date_fin_prevue: string | null; adresse: string | null }[]
  rappels: readonly { id: string; type: string; echeance: string; heure: string | null; texte: string | null; fait_le: string | null; cible: string }[]
}): EvenementIcs[] {
  const depuis = ajouterJours(p.jour, -30)
  const ev: EvenementIcs[] = []
  for (const c of p.chantiers) {
    if (c.statut === 'annule' || !c.date_debut) continue
    const au = c.date_fin_prevue && c.date_fin_prevue >= c.date_debut ? c.date_fin_prevue : c.date_debut
    if (au < depuis) continue
    ev.push({ uid: `chantier-${c.id}@agenda`, jour: true, du: c.date_debut, au, titre: c.statut === 'termine' ? `${c.titre} (terminé)` : c.titre, lieu: c.adresse, description: c.date_fin_prevue ? null : 'Fin prévue non renseignée.' })
  }
  for (const r of p.rappels) {
    if (r.fait_le || !LIBELLES_RDV[r.type] || r.echeance < depuis) continue
    const titre = `${LIBELLES_RDV[r.type]} — ${r.cible}`
    ev.push(r.heure && /^\d{2}:\d{2}/.test(r.heure)
      ? { uid: `rdv-${r.id}@agenda`, jour: false, date: r.echeance, heure: r.heure.slice(0, 5), minutes: 60, titre, description: r.texte }
      : { uid: `rdv-${r.id}@agenda`, jour: true, du: r.echeance, au: r.echeance, titre, description: r.texte })
  }
  return ev
}
