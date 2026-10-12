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
import { ligneJournal } from './journal'
import type { AppelJournal, Executeurs, ResultatExecution } from './boucle'

export type ContexteSession = {
  uid: string
  /** Le jeton d'accès de l'artisan, tel que reçu (déjà vérifié par authArtisan dans la route de l'assistant). */
  jeton: string
  /** L'origine de la requête de l'assistant : les requêtes internes vers les gestionnaires y sont adressées. */
  origine: string
  isFounder: boolean
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
      const d = resumerChiffres(r.json as TableauCompta, ctx.uid, entree)
      return { donnees: d, resume: `chiffres « ${d.periode.nom} »` }
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
        resume: `réponse préparée pour ${client}`,
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
