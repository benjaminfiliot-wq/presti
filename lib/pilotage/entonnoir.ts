export const HYPOTHESES = {
  reponse: { min: 0.01, max: 0.05, source: 'rectification du 24/09, §3.6 (supposé)' },
  oui: { min: 0.03, max: 0.08, source: 'plan du 24/09, §1.5 (supposé)' },
  achat: { min: 0.10, max: 0.25, source: 'plan du 24/09, §1.5 (supposé)' },
} as const

export const BILAN = {
  contacts: 100,
  regle: 'lundi qui suit le 100e contact froid',
  source: 'Ecosysteme-Prospection-Gratuite §2',
  nonDate: 'bilan non daté (formulaire fermé)',
} as const

type Ligne = {
  id: string
  canal: string
  variante: string | null
  froid: boolean
  envoye_le: string
  repondu: boolean
  oui: boolean
  appel: boolean
  vente: boolean | null
}

function tranche(rows: readonly Ligne[], maintenant: Date, jours: number) {
  const fin = maintenant.getTime()
  const debut = fin - jours * 24 * 60 * 60 * 1000
  const presentes = rows.filter((r) => {
    const instant = Date.parse(r.envoye_le)
    return Number.isFinite(instant) && instant >= debut && instant <= fin
  })
  const froides = presentes.filter((r) => r.froid === true)
  const contacts = froides.length
  const reponses = froides.filter((r) => r.repondu === true).length
  const oui = froides.filter((r) => r.oui === true).length
  const appels = froides.filter((r) => r.appel === true).length
  const ventes = froides.every((r) => r.vente === null) ? null : froides.filter((r) => r.vente === true).length
  const parVariante: Record<string, { contacts: number; oui: number }> = {}
  const parCanal: Record<string, { contacts: number; oui: number }> = {}
  for (const ligne of froides) {
    for (const [groupes, cle] of [[parVariante, ligne.variante ?? '?'], [parCanal, ligne.canal]] as const) {
      const groupe = groupes[cle] ?? { contacts: 0, oui: 0 }
      groupe.contacts++
      if (ligne.oui === true) groupe.oui++
      groupes[cle] = groupe
    }
  }
  return {
    contacts, reponses, oui, appels, ventes,
    tauxReponse: contacts ? reponses / contacts : null,
    tauxOui: contacts ? oui / contacts : null,
    tauxAchat: oui && ventes !== null ? ventes / oui : null,
    parVariante, parCanal,
    alerte: contacts >= 300 && reponses === 0 ? `0 réponse sur ${contacts} contacts froids : changer de message` : null,
    chauds: presentes.length - contacts,
  }
}

export function entonnoir(rows: readonly Ligne[], maintenant: Date) {
  return { j7: tranche(rows, maintenant, 7), j30: tranche(rows, maintenant, 30), hypotheses: HYPOTHESES }
}

export function bilan(rows: readonly Ligne[], maintenant: Date, date: { bilan_le: string | null }) {
  const premieres = rows.filter((r) => r.froid === true && Number.isFinite(Date.parse(r.envoye_le)))
    .sort((a, b) => Date.parse(a.envoye_le) - Date.parse(b.envoye_le)).slice(0, BILAN.contacts)
  const contacts = premieres.length
  const oui = premieres.filter((r) => r.oui === true).length
  const ventes = premieres.filter((r) => r.vente === true).length
  const verdict = ventes >= 1 || oui >= 4 ? 'P3' : contacts < BILAN.contacts ? 'en_cours' : oui >= 1 ? 'nouveau_message' : 'arret_froid'
  const bilan_le = date.bilan_le ?? null
  const enRetard = bilan_le !== null && contacts < BILAN.contacts && maintenant.getTime() > Date.parse(bilan_le)
  const texte = bilan_le === null ? BILAN.nonDate : `bilan du ${bilan_le.slice(8, 10)}/${bilan_le.slice(5, 7)}`
  return { contacts, oui, ventes, verdict, bilan_le, enRetard, source: BILAN.source, texte }
}
