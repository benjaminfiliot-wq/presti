// Le passage quotidien des relances AUTOMATIQUES de factures impayées, appelé par /api/cron/relances (Vercel n'accorde que deux
// tâches planifiées à cette formule, toutes deux prises). Le QUOI est dans lib/relancesImpayes.ts (pur, testé) ; ici : lire, prendre,
// envoyer, se souvenir. La base est derrière `Magasin` (lib/relancesImpayesMagasin.ts) et l'envoi derrière `envoyer`, pour que
// scripts/relances-impayes-qa.mjs rejoue ce passage avec une base en mémoire et un e-mail espionné : AUCUN envoi réel pendant les tests.
//
// Garanties :
//  • Drapeau baissé : rien n'est lu, rien ne part (`ferme`). L'appelant ne l'appelle pas non plus sous pause générale.
//  • Jamais deux fois : la relance est PRISE (clé unique facture + rang) AVANT l'envoi ; un envoi refusé rend la prise et la relance
//    repart au passage suivant ; deux passages simultanés ou rejoués ne peuvent pas envoyer la même relance.
//  • La facture est RELUE juste avant la prise : payée, annulée ou arrêtée entre-temps, rien ne part.
//  • Chaque lecture porte l'identifiant du compte traité : un compte ne relance jamais les factures d'un autre.
//  • Borné : MAX_COMPTES comptes, MAX_PAR_COMPTE_JOUR relances par compte et par jour ; une erreur sur un compte n'arrête pas les autres.
//  • Comptes fondateurs (démonstration), suspendus, en pause (« n'envoie plus rien automatiquement »), hors offre : ignorés.
import { peut } from './plans'
import { jourParis } from './comptaTableau.ts'
import {
  decider, MAX_PAR_COMPTE_JOUR, messageComplet, referenceReponse, sujetDeLaRelance, texteDeLaRelance, variablesDe,
  type ArretFacture, type EntreeJournal, type FactureRelancable, type ReglagesRelances,
} from './relancesImpayes.ts'

export const MAX_COMPTES = 200

export type Compte = { id: string; nom: string | null; email: string | null; plan: string | null; is_founder: boolean | null; leads_pause: boolean | null }
export type EntreeJournalComplete = EntreeJournal & { id?: string; destinataire?: string }

export interface Magasin {
  /** Les comptes qui ont activé les relances (jamais les autres). */
  comptes(limite: number): Promise<{ artisan_id: string; reglages: ReglagesRelances }[]>
  artisan(id: string): Promise<Compte | null>
  suspendu(id: string): Promise<boolean>
  /** Les factures ÉMISES, non avoir, du compte — toujours filtrées sur `artisanId`. */
  factures(artisanId: string): Promise<FactureRelancable[]>
  /** Relecture fraîche d'UNE facture du compte, juste avant l'envoi. */
  facture(artisanId: string, factureId: string): Promise<FactureRelancable | null>
  journal(artisanId: string): Promise<EntreeJournalComplete[]>
  /** Les arrêts du compte, par facture (reprise_le non nul : l'artisan a repris les relances). */
  arrets(artisanId: string): Promise<Map<string, ArretFacture>>
  /** Le client a-t-il écrit depuis `depuis` ? (lead de la facture ou de son devis, ou même adresse e-mail) */
  reponseClient(artisanId: string, facture: FactureRelancable, depuis: string): Promise<boolean>
  /** Prend la relance. Rend son identifiant, ou null si elle est déjà prise (rang, ou destinataire du jour). */
  prendre(e: { facture_id: string; artisan_id: string; rang: number; jour: string; destinataire: string }): Promise<string | null>
  confirmer(id: string, maintenant: Date): Promise<void>
  relacher(id: string): Promise<void>
  arreter(artisanId: string, factureId: string, raison: 'reponse_client', maintenant: Date): Promise<void>
}

export type Envoyer = (m: { to: string; subject: string; text: string; fromName: string; replyTo?: string }) => Promise<{ ok: boolean; error?: string }>
export type Bilan = { ferme?: true; comptes: number; envoyees: number; arretees: number; ignorees: number; plafond: boolean; interrompue: boolean; erreurs: string[] }

export async function tourRelancesImpayes(d: {
  actif: boolean; magasin: Magasin; envoyer: Envoyer
  /** Rend false quand la pause générale est posée (ou dans le doute). Relue avant CHAQUE envoi. */
  sortiePermise: () => Promise<boolean>
  maintenant?: Date
}): Promise<Bilan> {
  const maintenant = d.maintenant ?? new Date()
  const bilan: Bilan = { comptes: 0, envoyees: 0, arretees: 0, ignorees: 0, plafond: false, interrompue: false, erreurs: [] }
  if (!d.actif) return { ...bilan, ferme: true }
  const m = d.magasin
  const jour = jourParis(maintenant)

  let actifs: Awaited<ReturnType<Magasin['comptes']>>
  try { actifs = await m.comptes(MAX_COMPTES) } catch (e) { return { ...bilan, erreurs: [`réglages : ${msg(e)}`] } }

  comptes: for (const { artisan_id, reglages } of actifs) {
    bilan.comptes++
    try {
      if (!reglages.actif) { bilan.ignorees++; continue }
      const art = await m.artisan(artisan_id)
      if (!art || art.is_founder || !art.email || !peut(art.plan, 'factures.relances')) { bilan.ignorees++; continue }
      if (art.leads_pause === true || (await m.suspendu(artisan_id))) { bilan.ignorees++; continue }

      const [factures, journal, arrets] = await Promise.all([m.factures(artisan_id), m.journal(artisan_id), m.arrets(artisan_id)])
      const arretee = (id: string) => { const a = arrets.get(id); return !!a && !a.reprise_le }
      const duJour = journal.filter((e) => e.jour === jour)
      let envoyeesCeJour = duJour.length
      const destinataires = new Set(duJour.map((e) => e.destinataire).filter((x): x is string => !!x))

      for (const f of [...factures].sort((a, b) => (a.date_echeance ?? '').localeCompare(b.date_echeance ?? '') || a.id.localeCompare(b.id))) {
        if (f.artisan_id !== artisan_id) continue // ceinture : une ligne d'un autre compte ne passe jamais
        if (envoyeesCeJour >= MAX_PAR_COMPTE_JOUR) break
        const decision = decider({ facture: f, reglages, journal, arretee: arretee(f.id), destinatairesDuJour: destinataires, maintenant })
        if (decision.action !== 'envoyer') continue

        // Le client a-t-il répondu ? Une lecture de plus, faite seulement quand une relance serait vraiment due.
        if (await m.reponseClient(artisan_id, f, referenceReponse(f, journal, arrets.get(f.id)?.reprise_le))) {
          await m.arreter(artisan_id, f.id, 'reponse_client', maintenant); arrets.set(f.id, { raison: 'reponse_client', le: maintenant.toISOString(), reprise_le: null }); bilan.arretees++
          continue
        }

        // Relecture fraîche : payée, annulée ou arrêtée depuis la lecture du début de passage ? Rien ne part.
        const fraiche = await m.facture(artisan_id, f.id)
        if (!fraiche || fraiche.artisan_id !== artisan_id) continue
        const encore = decider({ facture: fraiche, reglages, journal, arretee: arretee(f.id), destinatairesDuJour: destinataires, maintenant })
        if (encore.action !== 'envoyer' || encore.rang !== decision.rang) continue

        // La pause générale est relue avant CHAQUE envoi.
        if (!(await d.sortiePermise())) { bilan.interrompue = true; break comptes }

        const prise = await m.prendre({ facture_id: f.id, artisan_id, rang: decision.rang, jour, destinataire: decision.destinataire })
        if (!prise) continue

        const v = variablesDe({ client: fraiche.client_nom, numero: fraiche.numero, totalTtc: fraiche.total_ttc, echeance: fraiche.date_echeance!, joursRetard: decision.joursRetard, artisan: art.nom })
        const envoi = await d.envoyer({
          to: decision.destinataire,
          subject: sujetDeLaRelance(fraiche.numero, art.nom),
          text: messageComplet(texteDeLaRelance(decision.rang, reglages, v)),
          fromName: art.nom?.trim() || 'Votre artisan',
          replyTo: art.email,
        })
        if (!envoi.ok) {
          await m.relacher(prise)
          bilan.erreurs.push(`relance non partie : ${envoi.error ?? 'raison inconnue'}`.slice(0, 160))
          // Plafond du jour atteint : inutile d'insister, tous les envois suivants seraient refusés de même.
          if (/plafond/i.test(envoi.error ?? '')) { bilan.plafond = true; break comptes }
          continue
        }
        await m.confirmer(prise, maintenant)
        journal.push({ id: prise, facture_id: f.id, rang: decision.rang, jour, statut: 'envoyee', envoyee_le: maintenant.toISOString(), destinataire: decision.destinataire })
        destinataires.add(decision.destinataire)
        envoyeesCeJour++
        bilan.envoyees++
      }
    } catch (e) {
      bilan.erreurs.push(msg(e))
    }
  }
  return bilan
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160)
