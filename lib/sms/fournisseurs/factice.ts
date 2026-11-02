// lib/sms/fournisseurs/factice.ts — le fournisseur FACTICE et le magasin en mémoire : tout ce qu'il faut pour prouver l'adaptateur hors ligne.
// Aucun réseau, aucun `fetch`, aucun secret. Il enregistre ses appels : un test qui attend « rien ne sort » compte zéro appel.
import type { Fournisseur, MagasinSms, MessageFournisseur, ReponseFournisseur } from '../contrat'

export type ComportementFactice = 'accepte' | 'refuse' | 'incertain' | 'leve'

export type FournisseurFactice = Fournisseur & { readonly appels: MessageFournisseur[] }

export function creerFournisseurFactice(comportement: ComportementFactice = 'accepte'): FournisseurFactice {
  const appels: MessageFournisseur[] = []
  return {
    nom: 'factice',
    appels,
    async envoyer(message: MessageFournisseur): Promise<ReponseFournisseur> {
      appels.push(message)
      if (comportement === 'leve') throw new Error('panne du fournisseur factice')
      if (comportement === 'refuse') return { etat: 'refuse', raison: 'refus factice' }
      if (comportement === 'incertain') return { etat: 'incertain', raison: 'délai factice' }
      return { etat: 'accepte', idFournisseur: `factice-${appels.length}` }
    },
  }
}

export type MagasinMemoire = MagasinSms & {
  readonly oppositions: Set<string>
  readonly etats: Map<string, { etat: 'en_cours' | 'envoye' | 'incertain' | 'echec'; artisanId: string; segments: number }>
  /** Fait lever la lecture demandée : prouve le fail-closed. */
  panne: { opposition?: boolean; etatDeLaCle?: boolean; compteurs?: boolean; reserver?: boolean }
}

export function creerMagasinMemoire(): MagasinMemoire {
  const oppositions = new Set<string>()
  const etats: MagasinMemoire['etats'] = new Map()
  const panne: MagasinMemoire['panne'] = {}
  return {
    oppositions, etats, panne,
    async opposition(numero) { if (panne.opposition) throw new Error('panne'); return oppositions.has(numero) },
    async etatDeLaCle(cle) { if (panne.etatDeLaCle) throw new Error('panne'); return etats.get(cle)?.etat ?? null },
    async reserver(cle, artisanId, segments) {
      if (panne.reserver) throw new Error('panne')
      if (etats.has(cle)) return false
      etats.set(cle, { etat: 'en_cours', artisanId, segments })
      return true
    },
    async marquer(cle, etat) { const e = etats.get(cle); if (e) e.etat = etat },
    async compteursDuJour(artisanId) {
      if (panne.compteurs) throw new Error('panne')
      let artisan = 0, total = 0, segmentsTotal = 0
      for (const e of etats.values()) { total++; segmentsTotal += e.segments; if (e.artisanId === artisanId) artisan++ }
      return { artisan, total, segmentsTotal }
    },
  }
}
