import { relTime } from '@/lib/direction/fraicheur'

export type ReponseAppel = {
  id: string
  source?: string
  prospect: string
  telephone: string | null
  contexte: string | null
  creneau?: string | null
  recu_le: string
}

export type CommandeAppel = {
  id: string
  etat: string
  paye_le: string | null
  metier: string | null
  communes: string | string[] | null
  nom: string | null
  tel: string | null
  manques: string[]
}

export type CarteAppel = {
  id: string
  nom: string
  tel: string | null
  lignes: [string, string]
  source: string
  sourceAppel?: 'rdv' | 'reponse'
  a: string
}

const EMAIL = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi
function sansEmail(s: string | null | undefined, max = 140): string {
  return (s ?? '').replace(EMAIL, '').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function lienTel(tel: string | null | undefined): string | null {
  if (typeof tel !== 'string' || !/^[+\d\s.()-]+$/.test(tel)) return null
  let chiffres = tel.replace(/[\s.()-]/g, '')
  if (chiffres.startsWith('0033')) chiffres = `+33${chiffres.slice(4)}`
  else if (/^0\d{9}$/.test(chiffres)) chiffres = `+33${chiffres.slice(1)}`
  if (!/^\+?\d{9,15}$/.test(chiffres)) return null
  return `tel:${chiffres}`
}

function dateParis(iso: string | null | undefined): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return 'Créneau à confirmer'
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit' }).format(d)
  const parties = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const heure = parties.find(p => p.type === 'hour')?.value ?? '00'
  const minute = parties.find(p => p.type === 'minute')?.value ?? '00'
  return `Créneau : ${date} à ${Number(heure)} h ${minute}`
}

export function appelsDepuisReponses(rows: readonly ReponseAppel[], maintenant: Date = new Date()): CarteAppel[] {
  return rows.flatMap(row => {
    const sourceAppel = row.source ?? 'reponse'
    if (sourceAppel !== 'rdv' && sourceAppel !== 'reponse') return []
    const rendezVous = sourceAppel === 'rdv'
    return [{
      id: row.id, nom: sansEmail(row.prospect), tel: lienTel(row.telephone),
      lignes: rendezVous
        ? [dateParis(row.creneau), sansEmail(row.contexte)] as [string, string]
        : [`A demandé un appel ${relTime(row.recu_le, maintenant.getTime())}`, sansEmail(row.contexte)] as [string, string],
      source: rendezVous ? 'Rendez-vous réservé' : 'Réponse à un message',
      sourceAppel, a: row.recu_le,
    }]
  })
}

export function appelsDepuisCommandes(rows: readonly CommandeAppel[], maintenant: Date = new Date()): CarteAppel[] {
  return rows.filter(row => (row.etat === 'payee' || row.etat === 'generee') && Array.isArray(row.manques) && row.manques.length > 0).map(row => {
    const commune = Array.isArray(row.communes) ? row.communes[0] : row.communes
    const activite = [sansEmail(row.metier), sansEmail(commune)].filter(Boolean).join(' à ')
    const plus = row.manques.length > 1 ? ` (+${row.manques.length - 1})` : ''
    return {
      id: row.id, nom: sansEmail(row.nom), tel: lienTel(row.tel),
      lignes: [`Site payé ${relTime(row.paye_le, maintenant.getTime())}${activite ? ` · ${activite}` : ''}`, `Manque : ${sansEmail(row.manques[0], 80)}${plus}`] as [string, string],
      source: 'Commande de site', a: row.paye_le ?? '',
    }
  })
}

export function fusionnerAppels(a: readonly CarteAppel[], b: readonly CarteAppel[]): CarteAppel[] {
  return [...a, ...b].map((carte, index) => ({ carte, index })).sort((x, y) => {
    const dx = Date.parse(x.carte.a)
    const dy = Date.parse(y.carte.a)
    return (Number.isFinite(dx) ? dx : Number.POSITIVE_INFINITY) - (Number.isFinite(dy) ? dy : Number.POSITIVE_INFINITY) || x.index - y.index
  }).slice(0, 10).map(x => x.carte)
}
