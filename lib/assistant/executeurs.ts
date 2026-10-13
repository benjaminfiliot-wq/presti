// L'assistant de gestion de la console — les EXÉCUTEURS réels des outils. Serveur uniquement.
//
// La règle du plan (016 §3) : l'assistant n'a AUCUN accès à la base qui lui soit propre. Chaque outil passe par le
// chemin même de l'interface, avec la session de l'artisan (son jeton, déjà vérifié par la route de l'assistant) :
//  • stock          → le gestionnaire GET de app/api/inventaire/route.ts (verrou `inventaire.stock`, révocation…) ;
//  • factures, chiffres → le gestionnaire GET de app/api/compta/tableau/route.ts (l'écran « Mes chiffres »), puis le
//    calcul de l'écran (lib/comptaTableau.ts) ;
//  • devis, conversations → les lectures PostgREST que font les pages Devis et Messages, avec le jeton de l'artisan :
//    la RLS et la garde de session de la base (0138) s'appliquent, comme dans son navigateur ;
//  • devis brouillon → le gestionnaire POST de app/api/devis/auto/route.ts (le bouton « Devis auto ») ;
//  • réponse préparée → le gestionnaire POST de app/api/messages/route.ts, action `suggest` (le bouton « Proposer une
//    réponse »), puis la réponse est rangée comme les propositions du moteur (message `etat = 'proposition'`, écrit par
//    le service comme partout : la table `messages` n'a pas de politique d'insertion pour les artisans), APRÈS avoir
//    vérifié sous la RLS que la conversation est bien à lui.
//  • CRM (chantiers, équipe du jour, matériaux réservés, à facturer) → des lectures PostgREST avec le jeton de
//    l'artisan, sur les tables du CRM (0141 ; lecture seule sous la RLS depuis 0152), filtrées sur le compte, puis les
//    calculs de lib/crm/* (lib/assistant/crm.ts). Les routes /api/crm/* lisent avec la clé de service : l'assistant,
//    lui, ne lit qu'avec la session — mêmes calculs, même décision d'accès (lib/crm/acces.ts, posée par la route).
// La clé de service ne sert ici qu'à ÉCRIRE : le journal et la proposition. Elle ne lit aucune donnée d'artisan.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { rendreCredit } from '@/lib/credits'
import type { Tier } from '@/lib/models'
import { GET as lireInventaire } from '@/app/api/inventaire/route'
import { GET as lireTableauCompta } from '@/app/api/compta/tableau/route'
import { POST as devisAuto } from '@/app/api/devis/auto/route'
import { POST as messagesBoite } from '@/app/api/messages/route'
import { resumerChiffres, resumerConversations, resumerDevis, resumerFactures, resumerStock, type DevisLu, type LeadLu, type MessageLu, type TableauCompta } from './donnees'
import { resumerAFacturer, resumerChantiers, resumerEquipeDuJour, resumerMateriauxReserves, type DossiersCrm } from './crm'
import { ligneJournal } from './journal'
import type { AppelJournal, Executeurs, ResultatExecution } from './boucle'

export type ContexteSession = {
  uid: string
  /** Le jeton d'accès de l'artisan, tel que reçu (déjà vérifié par authArtisan dans la route de l'assistant). */
  jeton: string
  /** L'origine de la requête de l'assistant : les requêtes internes vers les gestionnaires y sont adressées. */
  origine: string
  isFounder: boolean
  /** Le compte a le CRM (décidé par la route : drapeau ou essai, et capacité `crm`). */
  crm: boolean
  /** L'artisan a demandé ses meilleurs clients dans CE message (cadrerDemande) : sinon lire_chiffres ne les rend pas. */
  meilleursClients: boolean
}

/** Les colonnes lues pour le CRM : le nécessaire aux calculs de lib/crm/*, rien d'autre (ni adresse, ni e-mail, ni notes). */
export const COLONNES_CRM = {
  chantiers: 'id, artisan_id, devis_id, client_nom, titre, statut, date_debut, date_fin_prevue, vehicule_id, cree_le',
  taches: 'artisan_id, chantier_id, faite',
  equipe: 'artisan_id, chantier_id, membre_id',
  membres: 'id, artisan_id, nom, role, actif',
  vehicules: 'id, artisan_id, nom, actif',
  reservations: 'id, artisan_id, chantier_id, materiau_id, quantite, lieu, statut, sorti_le',
  materiaux: 'id, artisan_id, nom, unite, categorie, seuil_alerte, stock(lieu, quantite)',
  devis: 'id, artisan_id, lead_id, statut, numero, objet, client_nom, total_ttc, created_at, envoye_le, accepte_le',
  factures: 'id, artisan_id, devis_id, statut, numero, total_ttc, avoir_de, date_emission, date_echeance, client_nom',
  leads: 'id, artisan_id, statut, nom_prospect, type_chantier, canal, created_at',
  deplacements: 'artisan_id, objet, objet_id, vers, etape_derivee, cree_le',
} as const
const LIMITE_CRM = 2000

/** Tout ce que les outils CRM lisent, sous la session (RLS), filtré sur le compte. Une lecture en erreur fait tout échouer. */
async function chargerCrm(session: SupabaseClient, uid: string): Promise<DossiersCrm> {
  const lire = (table: string, cols: string, n = LIMITE_CRM) => session.from(table).select(cols).eq('artisan_id', uid).limit(n)
  const [chantiers, taches, equipe, membres, vehicules, reservations, materiaux, devis, factures, leads, deplacements] = await Promise.all([
    session.from('chantiers').select(COLONNES_CRM.chantiers).eq('artisan_id', uid).order('cree_le', { ascending: false }).limit(LIMITE_CRM),
    lire('chantier_taches', COLONNES_CRM.taches, 20 * LIMITE_CRM),
    lire('chantier_equipe', COLONNES_CRM.equipe, 20 * LIMITE_CRM),
    session.from('equipe_membres').select(COLONNES_CRM.membres).eq('artisan_id', uid).order('nom').limit(200),
    session.from('vehicules').select(COLONNES_CRM.vehicules).eq('artisan_id', uid).order('nom').limit(200),
    session.from('chantier_materiaux').select(COLONNES_CRM.reservations).eq('artisan_id', uid).order('cree_le').limit(LIMITE_CRM),
    lire('materiaux', COLONNES_CRM.materiaux),
    session.from('devis').select(COLONNES_CRM.devis).eq('artisan_id', uid).order('created_at', { ascending: false }).limit(LIMITE_CRM),
    session.from('factures').select(COLONNES_CRM.factures).eq('artisan_id', uid).order('date_emission', { ascending: false }).limit(LIMITE_CRM),
    session.from('leads').select(COLONNES_CRM.leads).eq('artisan_id', uid).order('created_at', { ascending: false }).limit(LIMITE_CRM),
    session.from('crm_journal').select(COLONNES_CRM.deplacements).eq('artisan_id', uid).eq('champ', 'etape').order('cree_le', { ascending: false }).limit(LIMITE_CRM),
  ])
  const toutes = [chantiers, taches, equipe, membres, vehicules, reservations, materiaux, devis, factures, leads, deplacements]
  if (toutes.some((r) => r.error)) throw new Error('CRM illisible')
  const l = <T>(r: { data: unknown }) => ((r.data ?? []) as T[])
  const d: DossiersCrm = {
    maintenant: new Date().toISOString(),
    chantiers: l(chantiers), taches: l(taches), equipe: l(equipe), membres: l(membres), vehicules: l(vehicules),
    reservations: l(reservations), materiaux: l(materiaux), devis: l(devis), factures: l(factures), leads: l(leads), deplacements: l(deplacements),
    tronque: false,
  }
  d.tronque = [d.chantiers, d.reservations, d.materiaux, d.devis, d.factures, d.leads].some((x) => x.length >= LIMITE_CRM)
  return d
}

/** Un client PostgREST qui porte le jeton de l'artisan : la RLS décide, comme dans son navigateur. */
export function clientDeSession(jeton: string): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jeton}` } },
  })
}

// `Response | undefined` : le type que TypeScript déduit de app/api/messages/route.ts (une branche sans retour explicite).
type Gestionnaire = (req: Request) => Promise<Response | undefined>

/** Appelle un gestionnaire de route de l'interface, avec la session de l'artisan. Rend le statut et le JSON (ou null). */
async function appeler(ctx: ContexteSession, g: Gestionnaire, chemin: string, corps?: unknown): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const req = new Request(new URL(chemin, ctx.origine), {
    method: corps === undefined ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${ctx.jeton}`, ...(corps === undefined ? {} : { 'content-type': 'application/json' }) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  })
  const rep = await g(req)
  if (!rep) return { status: 500, json: null }
  const json = await rep.json().catch(() => null)
  return { status: rep.status, json: json && typeof json === 'object' ? (json as Record<string, unknown>) : null }
}

const refus = (message: string, resume: string): ResultatExecution => ({ donnees: { ok: false, erreur: message }, resume, resultat: 'refus' })
const erreurDe = (json: Record<string, unknown> | null, defaut: string) => (typeof json?.error === 'string' && json.error ? json.error : defaut)

export function executeursDeSession(ctx: ContexteSession): Executeurs {
  const session = clientDeSession(ctx.jeton)
  // Factures et chiffres lisent la même route : une seule lecture par tour.
  let tableau: Promise<{ status: number; json: Record<string, unknown> | null }> | null = null
  const lireTableau = () => (tableau ??= appeler(ctx, lireTableauCompta, '/api/compta/tableau'))
  // Les quatre outils CRM lisent les mêmes lignes : une seule lecture par tour (une lecture ratée n'est pas gardée).
  let crm: Promise<DossiersCrm> | null = null
  const lireCrm = () => (crm ??= chargerCrm(session, ctx.uid).catch((e) => { crm = null; throw e }))
  const sansCrm = (): ResultatExecution => refus("Le CRM n'est pas ouvert sur ce compte.", 'CRM non ouvert sur ce compte')

  return {
    async lire_stock(entree) {
      const r = await appeler(ctx, lireInventaire, `/api/inventaire${entree.recherche ? `?q=${encodeURIComponent(entree.recherche)}` : ''}`)
      if (r.status !== 200 || !r.json) return refus(erreurDe(r.json, 'Inventaire indisponible.'), `refusé par l'inventaire (${r.status})`)
      const d = resumerStock(r.json as Parameters<typeof resumerStock>[0], entree)
      return { donnees: d, resume: `${d.nb_articles} article(s), ${d.nb_alertes} alerte(s)` }
    },

    async lire_devis(entree) {
      // Les colonnes et le filtre de app/devis/page.tsx.
      const { data, error } = await session.from('devis').select('id, numero, objet, client_nom, statut, total_ttc, date_emission')
        .eq('artisan_id', ctx.uid).order('created_at', { ascending: false }).limit(500)
      if (error) throw new Error('devis illisibles')
      const d = resumerDevis((data ?? []) as DevisLu[], entree)
      return { donnees: d, resume: `${d.nb_devis_total} devis, ${d.nb_rendus} rendu(s)${entree.statut ? ` (${entree.statut})` : ''}` }
    },

    async lire_factures(entree) {
      const r = await lireTableau()
      if (r.status !== 200 || !r.json) return refus(erreurDe(r.json, 'Factures indisponibles.'), `refusé par Mes chiffres (${r.status})`)
      const d = resumerFactures(r.json as TableauCompta, ctx.uid, entree)
      return { donnees: d, resume: `${d.nb_factures_total} facture(s), ${d.impayes.nombre} impayée(s)` }
    },

    async lire_chiffres(entree) {
      const r = await lireTableau()
      if (r.status !== 200 || !r.json) return refus(erreurDe(r.json, 'Chiffres indisponibles.'), `refusé par Mes chiffres (${r.status})`)
      const d = resumerChiffres(r.json as TableauCompta, ctx.uid, entree, { meilleursClients: ctx.meilleursClients })
      return { donnees: d, resume: `chiffres « ${d.periode.nom} »${ctx.meilleursClients ? ', avec les meilleurs clients' : ''}` }
    },

    async lire_chantiers(entree) {
      if (!ctx.crm) return sansCrm()
      const d = resumerChantiers(await lireCrm(), ctx.uid, entree)
      return { donnees: d, resume: `${d.nb_chantiers_total} chantier(s), ${d.nb_ouverts} ouvert(s), ${d.nb_rendus} rendu(s)` }
    },

    async lire_equipe_du_jour() {
      if (!ctx.crm) return sansCrm()
      const d = resumerEquipeDuJour(await lireCrm(), ctx.uid)
      return { donnees: d, resume: `${d.nb_membres_actifs} membre(s), ${d.nb_sur_un_chantier} sur un chantier du jour` }
    },

    async lire_materiaux_reserves(entree) {
      if (!ctx.crm) return sansCrm()
      const d = resumerMateriauxReserves(await lireCrm(), ctx.uid, entree)
      return { donnees: d, resume: `${d.nb_reservations} réservation(s) (${entree.statut}), ${d.nb_chantiers} chantier(s)` }
    },

    async lire_a_facturer(entree) {
      if (!ctx.crm) return sansCrm()
      const d = resumerAFacturer(await lireCrm(), ctx.uid, entree)
      return { donnees: d, resume: `${d.nb_dossiers} dossier(s) à facturer ou encaisser` }
    },

    async lire_conversations(entree) {
      // Les lectures de app/plateforme/Conversations.tsx, filtrées sur le compte (un fondateur voit tout sous la RLS).
      const { data: leads, error } = await session.from('leads')
        .select('id, nom_prospect, statut, created_at, updated_at, lu_le, urgence, type_chantier, prise_en_main, canal, message')
        .eq('artisan_id', ctx.uid).order('updated_at', { ascending: false, nullsFirst: false }).limit(200)
      if (error) throw new Error('conversations illisibles')
      const ouverts = ((leads ?? []) as LeadLu[]).filter((l) => l.statut !== 'gagne' && l.statut !== 'perdu')
      const messages: MessageLu[] = []
      for (let i = 0; i < ouverts.length; i += 100) {
        // `.neq('etat', 'rejete')` exclurait aussi les messages envoyés (etat NULL) : on demande les deux formes voulues.
        const { data, error: e } = await session.from('messages').select('lead_id, sens, etat, sent_at, contenu')
          .in('lead_id', ouverts.slice(i, i + 100).map((l) => l.id)).or('etat.is.null,etat.eq.proposition')
          .order('sent_at', { ascending: false }).limit(1000)
        if (e) throw new Error('messages illisibles')
        messages.push(...((data ?? []) as MessageLu[]))
      }
      const d = resumerConversations(ouverts, messages, entree)
      return { donnees: d, resume: `${d.nb_conversations_ouvertes} ouverte(s), ${d.nb_en_attente} en attente, ${d.conversations.length} rendue(s)` }
    },

    async preparer_devis_brouillon(entree) {
      const r = await appeler(ctx, devisAuto, '/api/devis/auto', { lead_id: entree.conversation_id })
      if (r.status === 402) return refus(erreurDe(r.json, 'Crédits épuisés.'), 'crédits épuisés pour le chiffrage')
      if (r.status !== 200 || typeof r.json?.id !== 'string') return refus(erreurDe(r.json, 'Le devis n’a pas pu être préparé.'), `devis non préparé (${r.status})`)
      const id = r.json.id as string
      const numero = typeof r.json.numero === 'string' ? r.json.numero : null
      return {
        donnees: { ok: true, numero, statut: 'brouillon', a_savoir: "Devis brouillon créé dans l'écran Devis. Rien n'est envoyé : l'artisan le relit, ajuste les prix et l'envoie lui-même. Ne donne aucun montant." },
        resume: `devis brouillon ${numero ?? ''} préparé`.trim(),
        brouillon: { type: 'devis', id, numero, lien: `/devis/${id}`, libelle: `Devis brouillon ${numero ?? ''}`.trim() },
        objet: { type: 'devis', id },
      }
    },

    async preparer_reponse(entree) {
      const cid = entree.conversation_id
      // 1. La conversation est à lui (RLS + filtre du compte), et ouverte.
      const { data: lead, error } = await session.from('leads').select('id, nom_prospect, statut').eq('id', cid).eq('artisan_id', ctx.uid).maybeSingle()
      if (error) throw new Error('conversation illisible')
      if (!lead) return refus('Conversation introuvable.', 'conversation introuvable')
      if (lead.statut === 'gagne' || lead.statut === 'perdu') return refus('Cette conversation est close (gagnée ou perdue).', 'conversation close')
      const lien = `/messages?lead=${cid}`
      const client = (lead.nom_prospect as string | null)?.trim() || 'ce client'
      // 2. Une réponse préparée attend déjà : on ne l'écrase pas (et on n'en paie pas une deuxième).
      const { data: attente } = await session.from('messages').select('lead_id').eq('lead_id', cid).eq('etat', 'proposition').limit(1)
      if (attente?.length) {
        return {
          donnees: { ok: false, deja_preparee: true, a_savoir: "Une réponse préparée attend déjà la validation de l'artisan dans cette conversation : rien de nouveau n'a été rédigé." },
          resume: 'réponse déjà en attente, rien de rédigé', resultat: 'refus',
          brouillon: { type: 'reponse', conversation_id: cid, lien, libelle: `Réponse à ${client} (déjà préparée)` },
          objet: { type: 'conversation', id: cid },
        }
      }
      // 3. La rédaction du bouton « Proposer une réponse » (crédit, modèle de Ma plateforme, garde-fous anti-fabrication).
      const r = await appeler(ctx, messagesBoite, '/api/messages', { action: 'suggest', lead_id: cid })
      if (r.status === 402) return refus(erreurDe(r.json, 'Crédits épuisés.'), 'crédits épuisés pour la réponse')
      const texte = typeof r.json?.reply === 'string' ? r.json.reply.trim() : ''
      if (r.status !== 200 || !texte) return refus(erreurDe(r.json, 'La réponse n’a pas pu être préparée.'), `réponse non préparée (${r.status})`)
      const tier = (['standard', 'pro', 'expert'].includes(String(r.json?.tier)) ? r.json!.tier : 'standard') as Tier
      // 4. Rangée comme les propositions du moteur : invisible du client, visible dans Messages avec « Envoyer » / « Rejeter ».
      const { error: eIns } = await supabaseAdmin.from('messages').insert({ lead_id: cid, sens: 'out', type: 'reponse_auto', contenu: texte.slice(0, 4000), etat: 'proposition', modele: tier })
      if (eIns) {
        await rendreCredit(ctx.uid, tier, ctx.isFounder)
        throw new Error('réponse non enregistrée')
      }
      return {
        donnees: { ok: true, client, a_savoir: "La réponse est rangée dans la conversation comme « réponse proposée ». Rien n'est envoyé : l'artisan la relit, la modifie s'il veut et l'envoie lui-même depuis Messages. Ne recopie pas le texte." },
        // RGPD : le journal ne nomme pas le client ; l'objet (la conversation) suffit, l'écran retrouve le nom.
        resume: 'réponse préparée',
        brouillon: { type: 'reponse', conversation_id: cid, lien, libelle: `Réponse à ${client}` },
        objet: { type: 'conversation', id: cid },
      }
    },
  }
}

/** L'écriture du journal (table 0150). Une erreur remonte : la boucle arrête alors le tour. */
export function journalEnBase(p: { uid: string; conversationId: string; tour: number }) {
  return async (a: AppelJournal) => {
    const { error } = await supabaseAdmin.from('assistant_journal').insert(ligneJournal({ artisanId: p.uid, conversationId: p.conversationId, tour: p.tour, ...a }))
    if (error) throw new Error(error.message)
  }
}
