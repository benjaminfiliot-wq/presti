// L'assistant de gestion — les LECTURES ajoutées le 21/10 (« l'assistant relié à TOUT Presti », décision du fondateur). Serveur seulement.
//
// Même règle que lib/assistant/executeurs.ts : aucun accès à la base qui soit propre à l'assistant. Chaque lecture passe par la
// route de l'écran (avec ses gardes : session, offre, drapeau du CRM) ou par la RLS de la session de l'artisan, filtrée sur son
// compte. La clé de service n'est JAMAIS utilisée ici.
//  • fil d'une conversation, détail d'un devis, profil → PostgREST avec le jeton de l'artisan (RLS + garde de session), .eq('artisan_id') ;
//  • Ma plateforme → GET /api/plateforme/config (offre Studio : la route refuse les autres) puis la ligne plateforme_config sous la RLS ;
//  • relances automatiques → GET /api/factures/relances-auto (offre Studio, drapeau relancesImpayes) ;
//  • où j'en suis, rappels, commandes → GET /api/crm/vue (gardeCrm : drapeau, session, offre Signature), puis les calculs de
//    l'accueil (lib/crm/accueil.ts), du poste des assistants (lib/crm/assistants.ts) et des commandes (lib/crm/commandes.ts).
// Une capacité absente de l'offre : l'assistant le dit et renvoie à l'écran Abonnement (texteOffre).
import type { SupabaseClient } from '@supabase/supabase-js'
import { GET as lireVueCrm } from '@/app/api/crm/vue/route'
import { GET as lireConfigPlateforme } from '@/app/api/plateforme/config/route'
import { GET as lireRelancesAuto } from '@/app/api/factures/relances-auto/route'
import { salleAttente } from '@/lib/crm/accueil'
import { posteAssistants } from '@/lib/crm/assistants'
import { retardLivraison, type CommandeA } from '@/lib/crm/commandes'
import type { Vue } from '@/lib/crm/vue'
import { jourParis } from '@/lib/comptaTableau'
import { COLONNES_LEGALES, mentionsManquantesEmission, versArtisanLegal } from '@/lib/legalArtisan'
import { PLANS, offreMinimale, peut, planConf, type Capacite } from '@/lib/plans'
import { encadrerClient, masquerCoordonnees } from './cadrage'
import { appeler, erreurDe, type ContexteSession, type Gestionnaire, type ReponseRoute } from './session'
import type { ResultatExecution } from './boucle'
import type { EntreesOutils } from './outils'

const refus = (message: string, resume: string): ResultatExecution => ({ donnees: { ok: false, erreur: message }, resume, resultat: 'refus' })

/** Une route a refusé pour l'OFFRE (403 { code: 'offre' }) : la phrase à dire, avec l'écran où changer d'offre. */
export function texteOffre(json: Record<string, unknown> | null): string | null {
  if (json?.code !== 'offre') return null
  const e = typeof json.error === 'string' && json.error ? json.error : 'Ce n’est pas inclus dans votre offre.'
  return `${e} Pour l’ouvrir : écran Abonnement.`
}
/** Le refus d'une route, offre comprise. */
export function refusRoute(r: { status: number; json: Record<string, unknown> | null }, defaut: string, quoi: string): ResultatExecution {
  const offre = texteOffre(r.json)
  return offre ? refus(offre, `${quoi} : pas dans l’offre`) : refus(erreurDe(r.json, defaut), `${quoi} refusé (${r.status})`)
}

/** Les capacités dont l'artisan demande « est-ce que j'ai… ? » : ce que lire_profil dit de son offre. */
const CAPACITES_DITES: { cap: Capacite; nom: string }[] = [
  { cap: 'plateforme.conversation', nom: 'plateforme de conversation (page publique, Messages)' },
  { cap: 'plateforme.ia.auto', nom: 'réponse automatique de l’IA à vos clients' },
  { cap: 'relances', nom: 'relances automatiques des conversations' },
  { cap: 'factures.relances', nom: 'relances automatiques des factures impayées' },
  { cap: 'chiffres', nom: 'écran Mes chiffres' },
  { cap: 'chiffres.auto', nom: 'alerte impayés et export mensuel au comptable' },
  { cap: 'inventaire.stock', nom: 'inventaire et stock' },
  { cap: 'crm', nom: 'CRM (chantiers, équipe, atelier)' },
  { cap: 'assistant', nom: 'assistant de gestion' },
  { cap: 'assistant.pilote', nom: 'pilote automatique' },
]

export function lecturesTout(ctx: ContexteSession, session: SupabaseClient, appel: (g: Gestionnaire, chemin: string) => Promise<ReponseRoute> = (g, chemin) => appeler(ctx, g, chemin)) {
  let vue: Promise<{ status: number; json: Record<string, unknown> | null }> | null = null
  const lireVue = () => (vue ??= appel(lireVueCrm, '/api/crm/vue').then((r) => { if (r.status !== 200) vue = null; return r }))
  const sansCrm = (): ResultatExecution => refus("Le CRM n'est pas ouvert sur ce compte.", 'CRM non ouvert sur ce compte')
  const jour = () => jourParis(new Date())

  return {
    async lire_fil(entree: EntreesOutils['lire_fil']): Promise<ResultatExecution> {
      const { data: lead, error } = await session.from('leads').select('id, nom_prospect, statut, canal, prise_en_main').eq('id', entree.conversation_id).eq('artisan_id', ctx.uid).maybeSingle()
      if (error) throw new Error('conversation illisible')
      if (!lead) return refus('Conversation introuvable.', 'conversation introuvable')
      const { data, error: e } = await session.from('messages').select('sens, etat, sent_at, contenu').eq('lead_id', lead.id)
        .or('etat.is.null,etat.eq.proposition').order('sent_at', { ascending: false }).limit(entree.limite)
      if (e) throw new Error('messages illisibles')
      const lignes = ((data ?? []) as { sens: 'in' | 'out'; etat: string | null; sent_at: string; contenu: string | null }[]).reverse()
      return {
        donnees: {
          client: encadrerClient(lead.nom_prospect as string | null, 80) ?? 'client sans nom', statut: lead.statut, canal: lead.canal ?? 'page', vous_avez_la_main: lead.prise_en_main === true,
          nb_messages_rendus: lignes.length,
          messages: lignes.map((m) => ({
            de: m.sens === 'in' ? 'client' : m.etat === 'proposition' ? 'réponse préparée (pas encore envoyée)' : 'vous',
            le: m.sent_at ? jourParis(new Date(m.sent_at)) : null,
            texte: m.sens === 'in' ? encadrerClient(m.contenu, 600) : masquerCoordonnees(String(m.contenu ?? '')).slice(0, 600),
          })),
          a_savoir: 'Pour répondre : preparer_reponse (rédaction du moteur) ou repondre_client (ton texte, à confirmer). Ne recopie aucun nombre écrit par le client.',
        },
        resume: `fil lu : ${lignes.length} message(s)`, objet: { type: 'conversation', id: lead.id as string },
      }
    },

    async lire_devis_detail(entree: EntreesOutils['lire_devis_detail']): Promise<ResultatExecution> {
      const { data: d, error } = await session.from('devis').select('id, numero, statut, objet, client_nom, total_ht, total_tva, total_ttc, remise_pct, acompte_pct, validite_jours, envoye_le, date_emission').eq('artisan_id', ctx.uid)
        .eq('numero', entree.numero).maybeSingle()
      if (error) throw new Error('devis illisible')
      if (!d) return refus(`Devis ${entree.numero} introuvable.`, 'devis introuvable')
      const { data: l, error: el } = await session.from('devis_lignes').select('designation, quantite, unite, prix_unitaire_ht, tva_taux, source_prix, ordre').eq('devis_id', d.id).order('ordre').limit(200)
      if (el) throw new Error('lignes illisibles')
      const lignes = (l ?? []) as { designation: string; quantite: number | string; unite: string | null; prix_unitaire_ht: number | string; tva_taux: number | string; source_prix: string | null }[]
      return {
        donnees: {
          numero: d.numero, statut: d.statut, objet: d.objet, client: encadrerClient(d.client_nom as string | null, 120), total_ht: Number(d.total_ht), total_ttc: Number(d.total_ttc),
          remise_pct: Number(d.remise_pct ?? 0), acompte_pct: Number(d.acompte_pct ?? 0), validite_jours: d.validite_jours, envoye_le: d.envoye_le ? jourParis(new Date(d.envoye_le as string)) : null,
          // 02/11 (contre-audit 032-004) : une provenance VIDE n'est pas « saisie par l'artisan » (règle E1 de lib/pilote/regles.ts ligneSourcee).
          lignes: lignes.map((x, i) => ({ position: i + 1, designation: x.designation, quantite: Number(x.quantite), unite: x.unite ?? 'u', prix_unitaire_ht: Number(x.prix_unitaire_ht), tva_taux: Number(x.tva_taux), provenance_du_prix: x.source_prix || 'non précisée (à vérifier)' })),
          lignes_a_chiffrer: lignes.filter((x) => !(Number(x.prix_unitaire_ht) > 0) || /chiffrer|estimation|ordre de grandeur/i.test(x.source_prix ?? '')).length,
        },
        resume: `devis ${d.numero} : ${lignes.length} ligne(s)`, objet: { type: 'devis', id: d.id as string },
      }
    },

    async lire_plateforme(): Promise<ResultatExecution> {
      const r = await appel(lireConfigPlateforme, '/api/plateforme/config')
      if (r.status !== 200 || !r.json) return refusRoute(r, 'Ma plateforme est indisponible.', 'Ma plateforme')
      const [{ data: c, error }, { data: a, error: ea }] = await Promise.all([
        session.from('plateforme_config').select('mode_reponse, auto_24_7, auto_debut, auto_fin, ton, limite_messages, message_accueil, nom_assistant, modele').eq('artisan_id', ctx.uid).maybeSingle(),
        session.from('artisans').select('leads_pause, plateforme_active').eq('id', ctx.uid).maybeSingle(),
      ])
      if (error || ea) throw new Error('réglages illisibles')
      const cfg = (c ?? {}) as Record<string, unknown>
      return {
        donnees: {
          mode_choisi: r.json.mode_reponse, mode_applique: r.json.mode_effectif, motif_ecart: r.json.motif ?? null,
          pause_des_demandes: a?.leads_pause === true, page_active: a?.plateforme_active !== false,
          reponse_24h_sur_24: cfg.auto_24_7 !== false, plage: cfg.auto_24_7 === false ? { debut: cfg.auto_debut ?? null, fin: cfg.auto_fin ?? null } : null,
          ton: cfg.ton ?? 'chaleureux', reponses_ia_par_conversation: cfg.limite_messages ?? 8, message_accueil: cfg.message_accueil ?? null, nom_assistant: cfg.nom_assistant ?? null, modele: cfg.modele ?? 'standard',
          a_savoir: "Le mode « auto » (l'IA répond seule, offre Signature) se choisit dans Ma plateforme par l'artisan lui-même ; tu peux régler le reste avec regler_plateforme.",
        },
        resume: `plateforme : mode ${String(r.json.mode_effectif)}`,
      }
    },

    async lire_profil(): Promise<ResultatExecution> {
      const { data, error } = await session.from('artisans').select(`plan, metier, ville, zone_intervention, horaires, services, plateforme_active, ${COLONNES_LEGALES}`).eq('id', ctx.uid).maybeSingle()
      if (error) throw new Error('profil illisible')
      if (!data) return refus('Profil introuvable.', 'profil introuvable')
      const a = data as unknown as Record<string, unknown>
      const plan = typeof a.plan === 'string' ? a.plan : null
      const conf = planConf(plan)
      const capacites = CAPACITES_DITES.map(({ cap, nom }) => {
        const oui = peut(plan, cap)
        const min = oui ? null : offreMinimale(cap)
        return { quoi: nom, inclus: oui, ...(oui ? {} : { a_partir_de: min ? PLANS[min].label : 'non proposé' }) }
      })
      const manquantes = mentionsManquantesEmission(versArtisanLegal(a))
      return {
        donnees: {
          nom: a.nom ?? null, metier: a.metier ?? null, ville: a.ville ?? null, zone_intervention: a.zone_intervention ?? null, horaires: a.horaires ?? null,
          prestations_de_ma_page: Array.isArray(a.services) ? (a.services as { nom?: string }[]).map((s) => s?.nom).filter(Boolean).slice(0, 12) : [],
          page_active: a.plateforme_active !== false,
          offre: conf.label, capacites,
          mentions_legales_manquantes: manquantes, a_savoir: manquantes.length ? 'Ces mentions bloquent l’envoi des devis et l’émission des factures : elles se remplissent dans Paramètres.' : 'Mentions légales complètes.',
          changer_d_offre: 'écran Abonnement',
        },
        resume: `profil lu (offre ${conf.label})`,
      }
    },

    async lire_relances_auto(): Promise<ResultatExecution> {
      const r = await appel(lireRelancesAuto, '/api/factures/relances-auto')
      if (r.status !== 200 || !r.json) return refusRoute(r, 'Les relances automatiques sont indisponibles.', 'relances automatiques')
      const reg = (r.json.reglages ?? {}) as { actif?: boolean; jours?: number[] }
      const journal = (Array.isArray(r.json.journal) ? r.json.journal : []) as { statut?: string; jour?: string }[]
      const parties = journal.filter((j) => j.statut === 'envoyee')
      return {
        donnees: { actives: reg.actif === true, jours_apres_echeance: reg.jours ?? [], relances_parties: parties.length, derniere_le: parties.map((j) => j.jour).filter(Boolean).sort().at(-1) ?? null, factures_arretees: Array.isArray(r.json.arrets) ? r.json.arrets.length : 0 },
        resume: `relances automatiques ${reg.actif ? 'actives' : 'coupées'}`,
      }
    },

    async lire_ou_j_en_suis(): Promise<ResultatExecution> {
      if (!ctx.crm) return sansCrm()
      const r = await lireVue()
      if (r.status !== 200 || !r.json) return refusRoute(r, 'Le CRM est indisponible.', 'CRM')
      const v = r.json as unknown as Vue
      const j = jour()
      const salle = salleAttente(v, j)
      const poste = posteAssistants(v, j)
      const commandes = ((v.atelier?.commandes ?? []) as CommandeA[]).filter((c) => c.statut === 'commandee')
      const rap = v.rappels?.aFaire
      return {
        donnees: {
          salle_d_attente: salle.files.map((f) => ({ file: f.titre, total: f.total, premiers: f.lignes.map((l) => ({ client: encadrerClient(l.client, 80), detail: l.detail, quand: l.quand, relance: l.relance })) })),
          poste_des_assistants: poste.assistants.map((a) => ({ assistant: a.nom, role: a.role, attend_votre_validation: a.total, premiers: a.elements.map((e) => ({ quoi: e.libelle, detail: e.detail })), ecran: a.lien.libelle })),
          rappels: rap ? { en_retard: rap.enRetard.length, aujourdhui: rap.aujourdhui.length, sept_jours: rap.semaine.length, premiers: [...rap.enRetard, ...rap.aujourdhui].slice(0, 5).map((x) => ({ texte: x.texte, echeance: x.echeance, heure: x.heure, cible: x.cible?.libelle ?? null })) } : null,
          livraisons: { en_retard: commandes.filter((c) => retardLivraison(c, j) > 0).length, attendues_aujourdhui: commandes.filter((c) => c.livraison_prevue === j).length, en_attente: commandes.length },
          a_savoir: 'Ils préparent, l’artisan valide : rien ne part sans son clic (ou son pilote automatique, s’il l’a activé).',
        },
        resume: `où j'en suis : ${salle.total} en salle d'attente, ${poste.total} à valider`,
      }
    },

    async lire_rappels(entree: EntreesOutils['lire_rappels']): Promise<ResultatExecution> {
      if (!ctx.crm) return sansCrm()
      const r = await lireVue()
      if (r.status !== 200 || !r.json) return refusRoute(r, 'Le CRM est indisponible.', 'CRM')
      const v = r.json as unknown as Vue
      if (v.rappels && v.rappels.disponibles === false) return refus('Les rappels ne sont pas encore installés sur ce compte.', 'rappels indisponibles')
      const af = v.rappels?.aFaire ?? { enRetard: [], aujourdhui: [], semaine: [], total: 0 }
      const liste = entree.quand === 'en_retard' ? af.enRetard : entree.quand === 'aujourdhui' ? af.aujourdhui : entree.quand === 'semaine' ? af.semaine : (v.rappels?.liste ?? []).filter((x) => !x.fait_le)
      return {
        donnees: {
          quand: entree.quand, en_retard: af.enRetard.length, aujourdhui: af.aujourdhui.length, sept_jours: af.semaine.length, nb_rendus: Math.min(liste.length, entree.limite),
          rappels: liste.slice(0, entree.limite).map((x) => ({ texte: x.texte, type: x.type, echeance: x.echeance, heure: x.heure, retard_jours: x.retard ?? 0, cible: x.cible ? { objet: x.cible.objet, nom: x.cible.libelle } : null })),
          a_savoir: 'Pour cocher : cocher_rappel avec le texte du rappel. Les rappels « Demander un avis » / « Proposer l’entretien » s’envoient avec demander_avis / envoyer_rappel_entretien.',
        },
        resume: `${Math.min(liste.length, entree.limite)} rappel(s) (${entree.quand})`,
      }
    },

    async lire_commandes(entree: EntreesOutils['lire_commandes']): Promise<ResultatExecution> {
      if (!ctx.crm) return sansCrm()
      const r = await lireVue()
      if (r.status !== 200 || !r.json) return refusRoute(r, 'Le CRM est indisponible.', 'CRM')
      const v = r.json as unknown as Vue
      if (v.atelier?.commandesDisponibles === false) return refus('Le suivi des commandes n’est pas encore installé sur ce compte.', 'commandes indisponibles')
      const j = jour()
      const titres = new Map((v.chantiers ?? []).map((c) => [c.id, c.titre]))
      const enAttente = ((v.atelier?.commandes ?? []) as CommandeA[]).filter((c) => c.statut === 'commandee').filter((c) => !entree.en_retard_seulement || retardLivraison(c, j) > 0)
      return {
        donnees: {
          nb_en_attente: enAttente.length,
          commandes: enAttente.slice(0, entree.limite).map((c) => ({
            fournisseur: c.fournisseur, reference: c.reference, commandee_le: c.commandee_le, livraison_prevue: c.livraison_prevue, retard_jours: retardLivraison(c, j),
            lignes: c.lignes.map((l) => `${l.quantite} ${l.unite} ${l.nom}`), chantier: c.chantier_id ? titres.get(c.chantier_id) ?? null : null, relances: c.relances, fournisseur_joignable_par_email: !!(c.contact && /@/.test(c.contact)),
          })),
        },
        resume: `${enAttente.length} commande(s) en attente`,
      }
    },
  }
}
