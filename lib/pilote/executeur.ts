// PILOTE AUTOMATIQUE — le DÉPART des actions dont le délai d'annulation est écoulé. Appelé chaque minute par /api/agents/tic.
//
// `traiterFile` est l'orchestrateur, PUR et injecté (rejoué en entier dans scripts/pilote-qa.mjs avec une file en mémoire) :
//  1. il prend les lignes mûres (part_le ≤ maintenant), les RÉCLAME une à une (a_partir → en_cours, une seule instruction : un
//     second passage ou une seconde instance ne prend jamais la même) ;
//  2. il RELIT tout juste avant l'envoi : drapeau, offre Signature, réglages (pilote et type toujours actifs), plafond du jour,
//     prix sourcés pour un devis, ancienneté, pause de l'artisan pour une réponse, et (02/11, §3.2) les derniers messages ENTRANTS
//     de la conversation visée : un sujet d'escalade (litige, sinistre, avocat, urgence…) — le moindre « non » rend l'action à la main ;
//  3. il fait partir par les fonctions d'envoi PARTAGÉES (lib/envoisServeur.ts : celles des boutons de l'interface) ; une carte
//     de l'assistant passe par confirmerAction (lib/assistant/confirmation.ts) : même réclamation atomique de la carte, même
//     journal de l'assistant, comme si l'artisan avait cliqué « Confirmer » ;
//  4. il inscrit l'issue dans la file (partie, annulee, manuel, echec) : la file est le journal.
// Jamais de paiement ni de remboursement : seuls les outils de OUTILS_EXECUTABLES_PILOTE ont un réalisateur ici.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { actif } from '@/lib/flags'
import { sendEmail } from '@/lib/email'
import { consommerLimite } from '@/lib/limites'
import { jourParis } from '@/lib/comptaTableau'
import { confirmerAction, type FicheAction, type Realisateur, type Realisation } from '@/lib/assistant/confirmation'
import { magasinSupabase } from '@/lib/assistant/magasin'
import { journalEnBase } from '@/lib/assistant/executeurs'
import { texteRelanceDevis, texteRelanceFacture } from '@/lib/assistant/cartes'
import { ENVOIS_JOUR_MAX } from '@/lib/assistant/actions-serveur'
import { historiqueRelances, relanceRecente, RELANCE_DELAI_JOURS } from '@/lib/relancesRegistre'
import { leadDuCompte, leadDuCompteStrict, repondreServeur, validerPropositionServeur } from '@/lib/envoisServeur'
import { envoyerDevisServeur, envoyerFactureServeur } from '@/lib/envoisPdfServeur'
import { piloteInterdit } from '@/lib/canaux/regles'
import { getPlateformeConfigStrict, dansLaPlage } from '@/lib/plateformeConfig'
import { suspensionEnCours } from '@/lib/suspension'
import { jetonPlafond, lignesDuDevis, lireReglages, partiesDepuis24h } from './serveur'
import { MARQUE_CONTENU_TIERS, MESSAGES_ESCALADE_RELUS, OUTILS_EXECUTABLES_PILOTE, prixSources, sujetEscalade } from './regles'
import type { DependancesFile, Issue, LigneAuto } from './file'
export { traiterFile, type Bilan, type DependancesFile, type LigneAuto, type Issue } from './file'

// ═══════════════════════════ Les dépendances réelles (Supabase, clé de service) ═══════════════════════════

const FILE = 'actions_auto'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const txt = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const ko = (erreur: string, deja = false): Issue => ({ ok: false, deja, erreur })

/**
 * §3.2 (02/11) — la CONVERSATION où écrit une carte de l'assistant, pour relire les messages du client avant le départ : la
 * conversation elle-même (réponse, réponse préparée), celle du devis (relance, envoi), celle du devis de la facture (relance
 * d'impayé, envoi). Chaque lecture est filtrée par le compte ; illisible : lever (la ligne passe en échec, rien ne part). null : la
 * carte n'écrit dans aucune conversation connue (elle n'est pas bloquée pour autant).
 */
async function conversationDeLaCarte(uid: string, f: Pick<FicheAction, 'objet_type' | 'objet_id' | 'entrees'>): Promise<string | null> {
  const directe = f.objet_type === 'conversation' ? txt(f.objet_id) : txt(f.entrees?.conversation_id)
  if (directe) return directe
  let devisId = f.objet_type === 'devis' ? txt(f.objet_id) : null
  const factureId = f.objet_type === 'facture' ? txt(f.objet_id) : null
  if (factureId) {
    const { data, error } = await supabaseAdmin.from('factures').select('devis_id').eq('artisan_id', uid).eq('id', factureId).maybeSingle()
    if (error) throw new Error('facture illisible : rien ne part')
    devisId = txt(data?.devis_id)
  }
  if (!devisId) return null
  const { data, error } = await supabaseAdmin.from('devis').select('lead_id').eq('artisan_id', uid).eq('id', devisId).maybeSingle()
  if (error) throw new Error('devis illisible : rien ne part')
  return txt(data?.lead_id)
}

/**
 * Les réalisateurs du pilote pour les cartes de l'assistant : ceux de lib/assistant/actions-serveur.ts, sans la session —
 * mêmes contrôles (objet du compte, statut, e-mail, plafond d'envois et délai entre deux relances de l'assistant), mêmes
 * fonctions d'envoi (lib/envoisServeur.ts) et mêmes textes (lib/assistant/cartes.ts).
 */
export function realisateursPilote(uid: string, carteCreeLe: string): Record<string, Realisateur> {
  const ko2 = (erreur: string): Realisation => ({ ok: false, erreur })
  const peutEnvoyer = () => consommerLimite(`assistant-envois:${uid}`, ENVOIS_JOUR_MAX, 24 * 3600)
  async function profil() {
    const { data } = await supabaseAdmin.from('artisans').select('nom, email').eq('id', uid).maybeSingle()
    return { nom: txt(data?.nom) ?? 'Votre artisan', email: txt(data?.email) }
  }
  async function devisDe(numero: string) {
    const { data } = await supabaseAdmin.from('devis').select('id, numero, statut, objet, client_nom, client_email, total_ttc, envoye_le, validite_jours').eq('artisan_id', uid).eq('numero', numero).maybeSingle()
    return data as { id: string; numero: string; statut: string | null; objet: string | null; client_nom: string | null; client_email: string | null; total_ttc: number | string | null; envoye_le: string | null; validite_jours: number | null } | null
  }
  async function factureDe(numero: string) {
    const { data } = await supabaseAdmin.from('factures').select('id, numero, statut, client_nom, client_email, total_ttc, date_echeance, avoir_de').eq('artisan_id', uid).eq('numero', numero).maybeSingle()
    return data as { id: string; numero: string; statut: string | null; client_nom: string | null; client_email: string | null; total_ttc: number | string | null; date_echeance: string | null; avoir_de: string | null } | null
  }
  // 02/11 (S4) : le registre commun des relances (lib/relancesRegistre.ts) — assistant et pilote, CRM, impayés, conversation. Une lecture
  // en erreur REFUSE : jusqu'ici `.catch(() => null)` la faisait valoir « jamais relancé ». Rend la phrase du refus, ou null.
  const dejaRelance = async (type: 'devis' | 'facture', objetId: string): Promise<string | null> => {
    const v = relanceRecente(await historiqueRelances(uid, { type, id: objetId }), new Date())
    if (!v.refus) return null
    return v.raison === 'illisible' ? 'Le registre des relances est illisible : rien ne part.' : `${type === 'devis' ? 'Ce devis a déjà été relancé' : 'Cette facture a déjà été relancée'} il y a moins de ${RELANCE_DELAI_JOURS} jours.`
  }
  async function mail(to: string, objet: string, texte: string): Promise<Realisation | null> {
    if (!(await peutEnvoyer())) return ko2(`Limite d'envois du jour atteinte (${ENVOIS_JOUR_MAX}).`)
    const p = await profil()
    const r = await sendEmail({ to, subject: objet, text: texte, fromName: p.nom, replyTo: p.email ?? undefined, transactionnel: true })
    return r.ok ? null : ko2('L’e-mail n’a pas pu partir.')
  }
  const R: Record<string, Realisateur> = {}
  R.envoyer_devis = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko2(`Devis ${e.numero} introuvable.`)
    if (d.statut === 'accepte') return ko2(`Le devis ${d.numero} est déjà accepté : il ne se renvoie pas.`)
    // Envoyé à la main depuis l'écran Devis après la préparation de la carte : on ne le renvoie pas une seconde fois.
    if (d.envoye_le && Date.parse(d.envoye_le) >= Date.parse(carteCreeLe)) return ko2(`Le devis ${d.numero} a déjà été envoyé depuis la préparation.`)
    const lignes = await lignesDuDevis(uid, { id: d.id })
    // LA règle des prix (lib/pilote/regles.ts prixSources) : provenance explicite, jamais vide (audit du 21/10, E1).
    if (!lignes || !prixSources(lignes)) return ko2('Une ligne du devis a un prix non sourcé : il reste à valider à la main.')
    if (!(await peutEnvoyer())) return ko2(`Limite d'envois du jour atteinte (${ENVOIS_JOUR_MAX}).`)
    const r = await envoyerDevisServeur(uid, d.id)
    return r.status === 200 ? { ok: true, resume: `devis ${d.numero} envoyé au client (pilote automatique)`, objet: { type: 'devis', id: d.id } } : ko2(String(r.json.error ?? 'Le devis n’a pas pu partir.'))
  }
  R.envoyer_facture = async (e) => {
    const f = await factureDe(String(e.numero))
    if (!f) return ko2(`Facture ${e.numero} introuvable.`)
    if (!(await peutEnvoyer())) return ko2(`Limite d'envois du jour atteinte (${ENVOIS_JOUR_MAX}).`)
    const r = await envoyerFactureServeur(uid, f.id)
    return r.status === 200 ? { ok: true, resume: `facture ${f.numero} envoyée au client (pilote automatique)`, objet: { type: 'facture', id: f.id } } : ko2(String(r.json.error ?? 'La facture n’a pas pu partir.'))
  }
  R.relancer_devis = async (e) => {
    const d = await devisDe(String(e.numero))
    if (!d) return ko2(`Devis ${e.numero} introuvable.`)
    if (d.statut !== 'envoye') return ko2(`Le devis ${d.numero} n'attend plus de réponse (statut : ${d.statut}).`)
    const to = txt(d.client_email)
    if (!to || !EMAIL.test(to)) return ko2('Le devis n’a pas d’e-mail client.')
    const dejaD = await dejaRelance('devis', d.id)
    if (dejaD) return ko2(dejaD)
    const p = await profil()
    const t = texteRelanceDevis({ client: d.client_nom, numero: String(d.numero), objet: d.objet, totalTtc: d.total_ttc === null ? null : num(d.total_ttc), envoyeLe: d.envoye_le, validiteJours: d.validite_jours, artisan: p.nom, ton: (e.ton as 'cordial' | 'ferme') ?? 'cordial' })
    return (await mail(to, t.objet, t.texte)) ?? { ok: true, resume: `relance du devis ${d.numero} envoyée (pilote automatique)`, objet: { type: 'devis', id: d.id } }
  }
  R.relancer_facture = async (e) => {
    const f = await factureDe(String(e.numero))
    if (!f) return ko2(`Facture ${e.numero} introuvable.`)
    if (f.statut !== 'emise' || f.avoir_de) return ko2(`La facture ${f.numero} n'est plus un impayé (statut : ${f.avoir_de ? 'avoir' : f.statut}).`)
    const to = txt(f.client_email)
    if (!to || !EMAIL.test(to)) return ko2('La facture n’a pas d’e-mail client.')
    const dejaF = await dejaRelance('facture', f.id)
    if (dejaF) return ko2(dejaF)
    const retard = f.date_echeance ? Math.floor((Date.parse(jourParis(new Date()) + 'T00:00:00Z') - Date.parse(f.date_echeance.slice(0, 10) + 'T00:00:00Z')) / 86_400_000) : null
    if (retard === null || retard <= 0) return ko2(`La facture ${f.numero} n'est pas échue.`)
    const p = await profil()
    const t = texteRelanceFacture({ client: f.client_nom, numero: String(f.numero), totalTtc: f.total_ttc === null ? null : num(f.total_ttc), echeance: f.date_echeance, joursRetard: retard, artisan: p.nom, ton: (e.ton as 'cordial' | 'ferme') ?? 'cordial' })
    return (await mail(to, t.objet, t.texte)) ?? { ok: true, resume: `relance de la facture ${f.numero} envoyée (pilote automatique)`, objet: { type: 'facture', id: f.id } }
  }
  R.repondre_client = async (e) => {
    const lead = await leadDuCompte(String(e.conversation_id), uid)
    if (!lead) return ko2('Conversation introuvable.')
    if (lead.prise_en_main) return ko2('L’artisan a repris cette conversation à la main.')
    if (!(await peutEnvoyer())) return ko2(`Limite d'envois du jour atteinte (${ENVOIS_JOUR_MAX}).`)
    const r = await repondreServeur(uid, lead, String(e.texte ?? ''), { automatique: true })
    return r.status === 200 ? { ok: true, resume: 'message envoyé au client (pilote automatique)', objet: { type: 'conversation', id: lead.id } } : ko2(String(r.json.error ?? 'Le message n’a pas pu partir.'))
  }
  R.valider_reponse_proposee = async (e) => {
    const lead = await leadDuCompte(String(e.conversation_id), uid)
    if (!lead) return ko2('Conversation introuvable.')
    if (!txt(e.message_id)) return ko2('Carte incomplète.')
    if (!(await peutEnvoyer())) return ko2(`Limite d'envois du jour atteinte (${ENVOIS_JOUR_MAX}).`)
    const r = await validerPropositionServeur(uid, lead, String(e.message_id), null, { automatique: true })
    return r.status === 200 ? { ok: true, resume: 'réponse préparée envoyée au client (pilote automatique)', objet: { type: 'conversation', id: lead.id } } : ko2(String(r.json.error ?? 'La réponse n’a pas pu partir.'))
  }
  // Rien d'autre : un outil absent d'ici ne part jamais automatiquement (argent, comptabilité, routes à session).
  for (const k of Object.keys(R)) if (!OUTILS_EXECUTABLES_PILOTE.includes(k)) delete R[k]
  return R
}

export function dependancesSupabase(): DependancesFile {
  const magasin = magasinSupabase()
  return {
    drapeau: () => actif('piloteAutomatique'),
    async mures(maintenant, n) {
      const { data, error } = await supabaseAdmin.from(FILE).select('id, artisan_id, type, source, ref_id, lead_id, libelle, prete_le, part_le')
        .eq('statut', 'a_partir').lte('part_le', maintenant.toISOString()).order('part_le', { ascending: true }).limit(n)
      if (error) throw new Error(error.message)
      return (data ?? []) as LigneAuto[]
    },
    async reprendre(avant) {
      // M2 : une ligne « en_cours » réclamée avant `avant` appartient à un passage interrompu (délai du tic) : elle redevient
      // « a_partir ». Sans risque de double envoi : la carte (assistant_actions) et la proposition (réclamation d'envoi) ont chacune
      // leur propre réclamation atomique — un objet déjà parti répond « déjà traité » au passage suivant.
      const { data, error } = await supabaseAdmin.from(FILE).update({ statut: 'a_partir', traite_le: null })
        .eq('statut', 'en_cours').lt('traite_le', avant.toISOString()).select('id')
      return error ? 0 : (data ?? []).length
    },
    async reclamer(l, maintenant) {
      // traite_le = l'heure de la réclamation (sert à reprendre une ligne coincée) ; il est réécrit à la fin.
      const { data, error } = await supabaseAdmin.from(FILE).update({ statut: 'en_cours', traite_le: maintenant.toISOString() })
        .eq('id', l.id).eq('artisan_id', l.artisan_id).eq('statut', 'a_partir').lte('part_le', maintenant.toISOString()).select('id')
      return !error && (data ?? []).length === 1
    },
    async terminer(l, statut, motif, maintenant) {
      const fin = statut === 'a_partir' ? { statut, traite_le: null } : { statut, motif, traite_le: maintenant.toISOString() }
      await supabaseAdmin.from(FILE).update(fin).eq('id', l.id).eq('artisan_id', l.artisan_id).eq('statut', 'en_cours')
    },
    async contexte(uid, maintenant) {
      const { data } = await supabaseAdmin.from('artisans').select('plan, is_founder, leads_pause').eq('id', uid).maybeSingle()
      return {
        plan: data?.is_founder ? 'business' : ((data?.plan as string | null) ?? null), leads_pause: data?.leads_pause === true,
        // M1 : un compte suspendu ne fait rien partir (lecture en erreur = suspendu : fail-closed).
        suspendu: await suspensionEnCours(uid).then((x) => !!x, () => true),
        reglages: await lireReglages(uid), parties: await partiesDepuis24h(uid, maintenant),
      }
    },
    async lignesDevis(l) {
      const f = await magasin.lire(l.artisan_id, l.ref_id).catch(() => null)
      return f ? lignesDuDevis(l.artisan_id, { numero: String(f.entrees?.numero ?? '') }) : null
    },
    async carteDe(l) {
      const f = await magasin.lire(l.artisan_id, l.ref_id).catch(() => null)
      if (!f || f.mode !== 'confirmation' || f.statut !== 'en_attente') return null
      return { outil: f.outil, contenuClientLu: f.entrees?.[MARQUE_CONTENU_TIERS] === true, leadId: await conversationDeLaCarte(l.artisan_id, f) }
    },
    async etatConversation(l, maintenant) {
      if (!l.lead_id) return 'prise_en_main'
      const lead = await leadDuCompte(l.lead_id, l.artisan_id)
      if (!lead || lead.prise_en_main === true) return 'prise_en_main'
      // E2 : la limite de réponses de l'IA par conversation et la plage horaire de Ma plateforme, comme une réponse automatique.
      // 02/11 (contre-audit 032-004, D3) : réglages et compte lus avec leur erreur — une erreur lève (la ligne finit en échec, rien ne part),
      // au lieu de remplacer la limite et la plage de l'artisan par les défauts, ou de compter zéro réponse.
      const cfg = await getPlateformeConfigStrict(l.artisan_id)
      const { count, error: errCompte } = await supabaseAdmin.from('messages').select('id', { count: 'exact', head: true }).eq('lead_id', lead.id).eq('sens', 'out').eq('type', 'reponse_auto').is('etat', null)
      if (errCompte) throw new Error('réponses de la conversation illisibles : rien ne part')
      if ((count ?? 0) >= (cfg.limite_messages ?? 8)) return 'limite'
      if (!dansLaPlage(cfg, maintenant)) return 'horaire'
      return 'ok'
    },
    jeton: (uid) => jetonPlafond(uid),
    async escalade(l, leadId) {
      // §3.2 : les derniers messages ENTRANTS (ceux du client) de la conversation du compte, et sa première demande ; les mots
      // d'escalade de l'artisan (Ma plateforme) ET ceux qu'aucun réglage ne retire. Messages illisibles : lever (rien ne part).
      // 02/11 (audit 032-001, D3) : la conversation illisible aussi — leadDuCompte rendait null sur une erreur, lue « rien à escalader ».
      const lead = await leadDuCompteStrict(leadId, l.artisan_id)
      if (!lead) return false
      // 02/11 (contre-audit 032-004, D3) : les mots de l'artisan aussi — illisibles, ils lèvent au lieu de disparaître.
      const cfg = await getPlateformeConfigStrict(l.artisan_id)
      const { data, error } = await supabaseAdmin.from('messages').select('contenu').eq('lead_id', lead.id).eq('sens', 'in')
        .order('sent_at', { ascending: false }).limit(MESSAGES_ESCALADE_RELUS)
      if (error) throw new Error('messages du client illisibles : rien ne part')
      const textes = [...(data ?? []).map((m) => (m as { contenu?: unknown }).contenu), lead.message]
      return sujetEscalade(textes, cfg.escalade_mots) !== null
    },
    async executer(l) {
      if (l.source === 'proposition') {
        const lead = l.lead_id ? await leadDuCompte(l.lead_id, l.artisan_id) : null
        if (!lead) return ko('conversation introuvable', true)
        if (piloteInterdit(lead.canal)) return ko('canal de messagerie : à valider à la main', true)
        const r = await validerPropositionServeur(l.artisan_id, lead, l.ref_id, null, { automatique: true })
        if (r.status === 200) return { ok: true, resume: `réponse envoyée${r.json.emailed ? ' (e-mail)' : ''}` }
        return ko(String(r.json.error ?? 'envoi impossible'), r.status === 404 || r.status === 409)
      }
      const fiche = await magasin.lire(l.artisan_id, l.ref_id).catch(() => null)
      if (!fiche) return ko('carte introuvable', true)
      const r = await confirmerAction({
        magasin, realisateurs: realisateursPilote(l.artisan_id, fiche.cree_le), inverses: {},
        journaliser: (j) => journalEnBase({ uid: l.artisan_id, conversationId: j.conversationId, tour: j.tour })({ nom: j.nom, entree: j.entree, resultat: j.resultat, resume: `pilote automatique — ${j.resume}`.slice(0, 300), objet: j.objet ?? null }),
      }, l.artisan_id, l.ref_id)
      if (r.ok) return { ok: true, resume: r.resume }
      return ko(r.erreur, r.code === 'deja_traitee' || r.code === 'expiree' || r.code === 'introuvable')
    },
  }
}
