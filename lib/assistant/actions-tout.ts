// L'assistant de gestion — les ACTIONS ajoutées le 21/10 (« l'assistant relié à TOUT Presti », décision du fondateur). Serveur seulement.
//
// Branchées dans actionsDeSession (lib/assistant/actions-serveur.ts) : mêmes familles, mêmes règles, même chemin.
//  • DIRECT (écriture interne, journalisée, annulable quand un inverse existe) : régler la plateforme (sauf le mode « auto »), modifier
//    « Ma page », faire avancer un chantier (B1), valider un chantier / le remettre sur la carte, régler la validation automatique,
//    ranger les tâches par pièce, créer / cocher un rappel, enregistrer / recevoir une commande fournisseur, révoquer le lien de suivi.
//  • CONFIRMATION (tout ce qui part chez un client ou un fournisseur, ou ne se défait pas) : envoyer une facture émise, régler les
//    relances automatiques d'impayés, relancer un fournisseur, demander un avis, proposer l'entretien, noter l'opposition d'un client.
//    L'outil ne fait que PRÉPARER la carte (texte exact) ; la réalisation n'est atteinte que par confirmerAction (le clic de l'artisan)
//    — ou par le pilote automatique de l'artisan (Signature, lib/pilote) pour les seuls outils de sa liste fermée.
// Chaque écriture passe par la ROUTE de l'écran (appelée avec la session : drapeau, offre, garde du CRM, validation, débit) ou par la RLS
// de la session, comme l'écran lui-même (plateforme_config et la fiche artisan, colonnes ouvertes par 0160). Aucune clé de service ici.
import type { SupabaseClient } from '@supabase/supabase-js'
import { GET as configPlateforme } from '@/app/api/plateforme/config/route'
import { GET as relancesAutoLire, PUT as relancesAutoEcrire } from '@/app/api/factures/relances-auto/route'
import { PATCH as tacheMaj } from '@/app/api/crm/taches/[id]/route'
import { POST as chantierCarte } from '@/app/api/crm/chantiers/[id]/valider/route'
import { GET as reglagesCrmLire, PUT as reglagesCrmEcrire } from '@/app/api/crm/reglages/route'
import { POST as rappelCreer } from '@/app/api/crm/rappels/route'
import { PATCH as rappelMaj, DELETE as rappelSupprimer } from '@/app/api/crm/rappels/[id]/route'
import { POST as commandeCreer } from '@/app/api/crm/commandes/route'
import { PATCH as commandeMaj } from '@/app/api/crm/commandes/[id]/route'
import { POST as commandeRelancer } from '@/app/api/crm/commandes/[id]/relancer/route'
import { GET as apresMessageLire, POST as apresMessageEnvoyer } from '@/app/api/crm/apres-chantier/message/route'
import { POST as apresOpposition } from '@/app/api/crm/apres-chantier/opposition/route'
import { GET as suiviLire, DELETE as suiviRevoquer } from '@/app/api/crm/chantiers/[id]/suivi/route'
import { commandeDeLigne, texteRelance, adresseMail, type CommandeA } from '@/lib/crm/commandes'
import { nettoyerPiece, pieceDe } from '@/lib/crm/plan'
import { jourParis } from '@/lib/comptaTableau'
import { correspondanceAvancement, pctAvancement, pieceDeTache, type TacheAvancement } from './avancement'
import { fmtEuros, lienDe, trouverUnique, type Apercu, type TypeObjet } from './cartes'
import { texteOffre } from './lectures-tout'
import { erreurDe, type Gestionnaire, type ReponseRoute } from './session'
import type { Realisateur, Realisation } from './confirmation'
import type { EntreeAction } from './outils-actions'

type Obj = Record<string, unknown>
type Preparation = { ok: true; entrees: Obj; apercu: Apercu; objet?: { type: TypeObjet; id: string } | null } | { ok: false; erreur: string }
const ko = (erreur: string): { ok: false; erreur: string } => ({ ok: false, erreur })
const txt = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const reussi = (s: number) => s === 200 || s === 201
function apercu(titre: string, p: Partial<Apercu> = {}): Apercu {
  return { titre, lignes: [], avant_apres: [], message: null, alertes: [], irreversible: false, lien: null, ...p }
}
/** Le refus d'une route, offre comprise (la capacité absente renvoie à l'écran Abonnement). */
const refusDe = (r: ReponseRoute, defaut: string) => ko(texteOffre(r.json) ?? erreurDe(r.json, defaut))

type Chantier = { id: string; titre: string; client_nom: string | null; statut: string }
type Trouve<T> = { ok: true; item: T } | { ok: false; erreur: string }
type FactureRow = { id: string; numero: string | null; statut: string | null; client_nom: string | null; client_email: string | null; total_ttc: number | string | null; avoir_de: string | null }

/** Ce que actionsDeSession prête à ce module : la session, l'appel des routes, et ses recherches dans les données du compte. */
export type BoiteActions = {
  uid: string
  crm: boolean
  session: SupabaseClient
  route: (g: Gestionnaire, chemin: string, o?: { methode?: string; corps?: unknown; params?: Record<string, string> }) => Promise<ReponseRoute>
  maintenant: () => Date
  chantierDe: (nom: string) => Promise<Trouve<Chantier>>
  devisDe: (numero: string) => Promise<{ id: string; numero: string | null } | null>
  factureDe: (numero: string) => Promise<FactureRow | null>
  leadDe: (id: string) => Promise<{ id: string; nom_prospect: string | null } | null>
  peutEnvoyer: () => Promise<boolean>
  plafondEnvois: number
  profil: () => Promise<{ nom: string; email: string | null }>
  /** POST /api/factures/[id]/envoyer (essais : doublure). */
  envoyerFacture?: Gestionnaire
}

const UNITES = new Set(['u', 'unite', 'unites', 'm', 'm2', 'm²', 'm3', 'm³', 'ml', 'kg', 'g', 't', 'l', 'h', 'sac', 'sacs', 'boite', 'boîte', 'boites', 'boîtes', 'rouleau', 'rouleaux', 'palette', 'palettes', 'lot', 'lots', 'piece', 'pièce', 'pieces', 'pièces', 'pce', 'barre', 'barres', 'paquet', 'paquets', 'carton', 'cartons', 'bidon', 'bidons', 'seau', 'seaux', 'tube', 'tubes'])
/** « 20 u plaque BA13 » → { quantite: 20, unite: 'u', nom: 'plaque BA13' } ; sans unité reconnue : 'u'. Illisible : null. */
export function ligneCommandeDe(s: string): { quantite: number; unite: string; nom: string } | null {
  const m = String(s ?? '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:x\s*)?(\S+)?\s*(.*)$/i)
  if (!m) return null
  const quantite = Number(m[1].replace(',', '.'))
  if (!(quantite > 0)) return null
  const deuxieme = (m[2] ?? '').toLowerCase().replace(/\.$/, '')
  const avecUnite = UNITES.has(deuxieme) && !!m[3].trim()
  const nom = (avecUnite ? m[3] : `${m[2] ?? ''} ${m[3] ?? ''}`).replace(/^\s*(de|d['’])\s*/i, '').replace(/\s+/g, ' ').trim()
  if (!nom) return null
  return { quantite: Math.round(quantite * 100) / 100, unite: avecUnite ? deuxieme : 'u', nom: nom.slice(0, 200) }
}

export function actionsTout(b: BoiteActions): { R: Record<string, Realisateur>; P: Record<string, (e: EntreeAction) => Promise<Preparation>>; INV: Record<string, Realisateur> } {
  const R: Record<string, Realisateur> = {}
  const P: Record<string, (e: EntreeAction) => Promise<Preparation>> = {}
  const INV: Record<string, Realisateur> = {}
  const { session, route } = b
  const sansCrm = ko('Le CRM n’est pas ouvert sur ce compte.')
  const jour = () => jourParis(b.maintenant())
  const limiteEnvois = ko(`Limite d'envois du jour atteinte (${b.plafondEnvois}) : réessayez demain.`)

  // ═══════════════ Factures : envoyer une facture émise ═══════════════
  const factureEnvoyable = (f: FactureRow | null, numero: unknown): string | null => {
    if (!f) return `Facture ${numero} introuvable.`
    if (f.avoir_de) return `La pièce ${f.numero} est un avoir : elle ne s'envoie pas comme une facture d'ici.`
    if (f.statut !== 'emise' && f.statut !== 'payee') return `La facture ${f.numero} n'est pas émise (statut : ${f.statut}) : seule une facture émise s'envoie.`
    if (!txt(f.client_email) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(f.client_email).trim())) return `La facture ${f.numero} n'a pas d'e-mail client : il se renseigne sur la facture d'origine (ou le devis).`
    return null
  }
  P.envoyer_facture = async (e) => {
    const f = await b.factureDe(String(e.numero))
    const pb = factureEnvoyable(f, e.numero)
    if (pb || !f) return ko(pb ?? 'Facture introuvable.')
    return { ok: true, entrees: { ...e }, objet: { type: 'facture', id: f.id }, apercu: apercu(`Envoyer la facture ${f.numero} à ${f.client_nom ?? 'votre client'}`, { lignes: [{ label: 'À', valeur: String(f.client_email) }, { label: 'Facture', valeur: `${f.numero} — ${fmtEuros(f.total_ttc)} TTC` }, { label: 'Pièce jointe', valeur: `${f.numero}.pdf` }], alertes: f.statut === 'payee' ? ['Cette facture est déjà payée : elle partira comme copie.'] : [], irreversible: true, lien: lienDe('facture', f.id) }) }
  }
  R.envoyer_facture = async (e) => {
    const f = await b.factureDe(String(e.numero))
    const pb = factureEnvoyable(f, e.numero)
    if (pb || !f) return ko(pb ?? 'Facture introuvable.')
    if (!(await b.peutEnvoyer())) return limiteEnvois
    const g = b.envoyerFacture ?? (await import('@/app/api/factures/[id]/envoyer/route')).POST
    const rep = await route(g as Gestionnaire, `/api/factures/${f.id}/envoyer`, { corps: {}, params: { id: f.id } })
    if (!reussi(rep.status)) return refusDe(rep, 'La facture n’a pas pu être envoyée.')
    return { ok: true, resume: `facture ${f.numero} envoyée au client`, objet: { type: 'facture', id: f.id } }
  }

  // ═══════════════ Relances automatiques d'impayés : activer / couper ═══════════════
  type RegRelances = { actif: boolean; jours: number[]; textes: Obj }
  const lireRelances = async (): Promise<{ ok: true; reg: RegRelances } | { ok: false; erreur: string }> => {
    const r = await route(relancesAutoLire, '/api/factures/relances-auto')
    if (r.status !== 200 || !r.json) return refusDe(r, 'Les relances automatiques sont indisponibles.')
    const g = (r.json.reglages ?? {}) as Partial<RegRelances>
    return { ok: true, reg: { actif: g.actif === true, jours: Array.isArray(g.jours) ? g.jours.map(Number) : [3, 10, 21], textes: (g.textes && typeof g.textes === 'object' ? g.textes : {}) as Obj } }
  }
  P.regler_relances_impayes = async (e) => {
    const l = await lireRelances(); if (!l.ok) return ko(l.erreur)
    if (l.reg.actif === e.actif) return ko(`Les relances automatiques sont déjà ${e.actif ? 'actives' : 'coupées'}.`)
    return { ok: true, entrees: { ...e }, objet: null, apercu: apercu(e.actif ? 'Activer les relances automatiques des impayés' : 'Couper les relances automatiques des impayés', {
      lignes: [{ label: 'Jours après l’échéance', valeur: l.reg.jours.map((j) => `J+${j}`).join(', ') }],
      avant_apres: [{ libelle: 'Relances automatiques', avant: l.reg.actif ? 'actives' : 'coupées', apres: e.actif ? 'actives' : 'coupées' }],
      alertes: e.actif ? ['Des e-mails partiront SEULS chez vos clients dont une facture est échue, aux jours réglés, jusqu’au paiement ou à leur réponse.'] : [],
      lien: { href: '/factures', libelle: 'Ouvrir les factures' },
    }) }
  }
  R.regler_relances_impayes = async (e) => {
    const l = await lireRelances(); if (!l.ok) return ko(l.erreur)
    const rep = await route(relancesAutoEcrire, '/api/factures/relances-auto', { methode: 'PUT', corps: { actif: e.actif === true, jours: l.reg.jours, textes: l.reg.textes } })
    if (rep.status !== 200) return refusDe(rep, 'Le réglage n’a pas pu être enregistré.')
    return { ok: true, resume: `relances automatiques des impayés ${e.actif ? 'activées' : 'coupées'}`, annulation: { outil: 'restaurer_relances_auto', entrees: { ...l.reg }, libelle: 'Remettre le réglage comme avant' } }
  }
  INV.restaurer_relances_auto = async (e) => {
    const rep = await route(relancesAutoEcrire, '/api/factures/relances-auto', { methode: 'PUT', corps: { actif: e.actif === true, jours: e.jours, textes: e.textes ?? {} } })
    return rep.status === 200 ? { ok: true, resume: 'relances automatiques remises comme avant' } : refusDe(rep, 'Restauration impossible.')
  }

  // ═══════════════ Ma plateforme ═══════════════
  const CHAMPS_CFG = ['mode_reponse', 'auto_24_7', 'auto_debut', 'auto_fin', 'ton', 'limite_messages', 'message_accueil', 'nom_assistant'] as const
  // Audit offensif du 21/10 (M4) : lever la pause des demandes, changer le message d'accueil ou tout autre réglage de la page
  // publique ne se fait plus d'office — une CARTE à confirmer (avant / après), puis l'écriture au clic de l'artisan.
  type PlanPlateforme = { ok: true; maj: Obj; avant: Obj; pause: boolean | null; pauseAvant: boolean } | { ok: false; erreur: string }
  const libelleCfg = (k: string) => ({ mode_reponse: 'Mode de réponse', auto_24_7: '24 h/24', auto_debut: 'Début', auto_fin: 'Fin', ton: 'Ton', limite_messages: 'Réponses de l’IA par conversation', message_accueil: 'Message d’accueil', nom_assistant: 'Nom de l’assistant' } as Record<string, string>)[k] ?? k
  async function planPlateforme(e: EntreeAction): Promise<PlanPlateforme> {
    // La garde de l'écran (offre Studio, session) d'abord : la route de Ma plateforme.
    const g = await route(configPlateforme, '/api/plateforme/config')
    if (g.status !== 200) return refusDe(g, 'Ma plateforme est indisponible.')
    const [{ data: c, error }, { data: a, error: ea }] = await Promise.all([
      session.from('plateforme_config').select(CHAMPS_CFG.join(', ')).eq('artisan_id', b.uid).maybeSingle(),
      session.from('artisans').select('leads_pause').eq('id', b.uid).maybeSingle(),
    ])
    if (error || ea) throw new Error('réglages illisibles')
    const avant = Object.fromEntries(CHAMPS_CFG.map((k) => [k, (c as Obj | null)?.[k] ?? null])) as Obj
    const maj: Obj = {}
    if (e.mode_reponse) maj.mode_reponse = e.mode_reponse
    if (e.vingt_quatre_heures !== null && e.vingt_quatre_heures !== undefined) maj.auto_24_7 = e.vingt_quatre_heures
    if (e.heure_debut !== null && e.heure_debut !== undefined) { maj.auto_debut = e.heure_debut; maj.auto_fin = e.heure_fin; if (maj.auto_24_7 === undefined) maj.auto_24_7 = false }
    if (maj.auto_24_7 === true) { maj.auto_debut = null; maj.auto_fin = null }
    if (e.ton_reponses) maj.ton = e.ton_reponses
    if (e.limite_messages !== null && e.limite_messages !== undefined) maj.limite_messages = e.limite_messages
    if (txt(e.message_accueil)) maj.message_accueil = String(e.message_accueil).slice(0, 500)
    if (txt(e.nom_assistant)) maj.nom_assistant = String(e.nom_assistant).slice(0, 60)
    const pause = typeof e.pause_demandes === 'boolean' ? e.pause_demandes : null
    if (!Object.keys(maj).length && pause === null) return ko('Rien à changer dans Ma plateforme.')
    return { ok: true, maj, avant, pause, pauseAvant: (a as Obj | null)?.leads_pause === true }
  }
  const avantApresPlateforme = (pl: Extract<PlanPlateforme, { ok: true }>) => [
    ...Object.keys(pl.maj).map((k) => ({ libelle: libelleCfg(k), avant: String(pl.avant[k] ?? '—'), apres: String(pl.maj[k] ?? '—') })),
    ...(pl.pause !== null ? [{ libelle: 'Demandes', avant: pl.pauseAvant ? 'en pause' : 'ouvertes', apres: pl.pause ? 'en pause' : 'ouvertes' }] : []),
  ]
  P.regler_plateforme = async (e) => {
    const pl = await planPlateforme(e)
    if (!pl.ok) return pl
    const alertes = [
      ...(pl.pause === false && pl.pauseAvant ? ['Les demandes rouvrent : l’assistant recommence à traiter les messages des prospects.'] : []),
      ...('message_accueil' in pl.maj ? ['Le message d’accueil est visible de tous les visiteurs de votre page.'] : []),
    ]
    return { ok: true, entrees: { ...e }, objet: null, apercu: apercu('Régler Ma plateforme', { avant_apres: avantApresPlateforme(pl), alertes, lien: { href: '/plateforme', libelle: 'Ouvrir Ma plateforme' } }) }
  }
  R.regler_plateforme = async (e) => {
    const pl = await planPlateforme(e)
    if (!pl.ok) return pl
    const { maj, avant, pause } = pl
    if (Object.keys(maj).length) {
      // Le même enregistrement que l'écran (app/plateforme/Reglages.tsx) : la RLS de plateforme_config, ligne du compte.
      const { error: ee } = await session.from('plateforme_config').upsert({ artisan_id: b.uid, ...maj, maj_le: b.maintenant().toISOString() }, { onConflict: 'artisan_id' })
      if (ee) return ko('Les réglages n’ont pas pu être enregistrés.')
    }
    if (pause !== null) {
      const { error: ep } = await session.from('artisans').update({ leads_pause: pause }).eq('id', b.uid)
      if (ep) return ko('La pause des demandes n’a pas pu être enregistrée.')
    }
    return {
      ok: true, resume: `Ma plateforme réglée (${[...Object.keys(maj).map(libelleCfg), ...(pause !== null ? ['pause des demandes'] : [])].join(', ')})`, objet: null,
      annulation: { outil: 'restaurer_plateforme', entrees: { cfg: Object.fromEntries(Object.keys(maj).map((k) => [k, avant[k]])), leads_pause: pause !== null ? pl.pauseAvant : null }, libelle: 'Remettre Ma plateforme comme avant' },
      apercu: { avant_apres: avantApresPlateforme(pl), lien: { href: '/plateforme', libelle: 'Ouvrir Ma plateforme' } },
    }
  }
  INV.restaurer_plateforme = async (e) => {
    const cfg = (e.cfg ?? {}) as Obj
    if (Object.keys(cfg).length) {
      const { error } = await session.from('plateforme_config').upsert({ artisan_id: b.uid, ...cfg, maj_le: b.maintenant().toISOString() }, { onConflict: 'artisan_id' })
      if (error) return ko('Restauration impossible.')
    }
    if (typeof e.leads_pause === 'boolean') {
      const { error } = await session.from('artisans').update({ leads_pause: e.leads_pause }).eq('id', b.uid)
      if (error) return ko('Restauration de la pause impossible.')
    }
    return { ok: true, resume: 'Ma plateforme remise comme avant' }
  }

  // ═══════════════ « Ma page » (écran Profil) ═══════════════
  // Audit offensif du 21/10 (M4) : réécrire la présentation de la page publique passe par une CARTE à confirmer.
  type PlanPage = { ok: true; maj: Obj; avant: Obj; services: { nom?: string; description?: string }[] } | { ok: false; erreur: string }
  async function planMaPage(e: EntreeAction): Promise<PlanPage> {
    const { data, error } = await session.from('artisans').select('bio, zone_intervention, horaires, services').eq('id', b.uid).maybeSingle()
    if (error || !data) throw new Error('profil illisible')
    const avant = { bio: data.bio ?? null, zone_intervention: data.zone_intervention ?? null, horaires: data.horaires ?? null, services: Array.isArray(data.services) ? data.services : [] }
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    let services = (avant.services as { nom?: string; description?: string }[]).filter((s) => s && typeof s.nom === 'string')
    const retirer = ((e.retirer_prestations as string[]) ?? []).map(norm)
    const introuvables = retirer.filter((r) => !services.some((s) => norm(String(s.nom)) === r || norm(String(s.nom)).includes(r)))
    if (introuvables.length) return ko(`Prestation(s) introuvable(s) sur votre page : ${introuvables.join(', ')}. Celles qui y sont : ${services.map((s) => s.nom).join(', ') || 'aucune'}.`)
    services = services.filter((s) => !retirer.some((r) => norm(String(s.nom)) === r || norm(String(s.nom)).includes(r)))
    for (const n of (e.ajouter_prestations as string[]) ?? []) if (!services.some((s) => norm(String(s.nom)) === norm(n))) services.push({ nom: n.slice(0, 80), description: '' })
    if (services.length > 12) return ko('12 prestations au plus sur votre page : retirez-en avant d’en ajouter.')
    const maj: Obj = {}
    if (txt(e.bio)) maj.bio = String(e.bio).slice(0, 800)
    if (txt(e.zone_intervention)) maj.zone_intervention = String(e.zone_intervention).slice(0, 160)
    if (txt(e.horaires)) maj.horaires = String(e.horaires).slice(0, 200)
    if (((e.ajouter_prestations as string[]) ?? []).length || retirer.length) maj.services = services.map((s) => ({ nom: String(s.nom).slice(0, 80), description: String(s.description ?? '').slice(0, 200) }))
    if (!Object.keys(maj).length) return ko('Rien à changer sur « Ma page ».')
    return { ok: true, maj, avant: avant as Obj, services }
  }
  const champPage = (k: string) => (k === 'services' ? 'Prestations' : k === 'bio' ? 'Présentation' : k === 'zone_intervention' ? 'Zone d’intervention' : 'Horaires')
  const valeurPage = (v: unknown) => (Array.isArray(v) ? v.map((x) => (x as { nom?: string }).nom).filter(Boolean).join(', ') : String(v ?? '—')).slice(0, 300) || '—'
  P.modifier_ma_page = async (e) => {
    const pl = await planMaPage(e)
    if (!pl.ok) return pl
    return { ok: true, entrees: { ...e }, objet: null, apercu: apercu('Modifier « Ma page » (votre page publique)', { avant_apres: Object.keys(pl.maj).map((k) => ({ libelle: champPage(k), avant: valeurPage(pl.avant[k]), apres: valeurPage(pl.maj[k]) })), alertes: ['Ce texte est visible de tous les visiteurs de votre page.'], lien: { href: '/profil', libelle: 'Ouvrir mon profil' } }) }
  }
  R.modifier_ma_page = async (e) => {
    const pl = await planMaPage(e)
    if (!pl.ok) return pl
    const { maj, avant, services } = pl
    // Le même enregistrement que l'écran Profil (app/profil/page.tsx) : la RLS de la fiche, colonnes ouvertes par 0160.
    const { error: eu } = await session.from('artisans').update(maj).eq('id', b.uid)
    if (eu) return ko('« Ma page » n’a pas pu être enregistrée.')
    return {
      ok: true, resume: `« Ma page » modifiée (${Object.keys(maj).map((k) => (k === 'services' ? 'prestations' : k.replace('_', ' '))).join(', ')})`, objet: null,
      annulation: { outil: 'restaurer_ma_page', entrees: Object.fromEntries(Object.keys(maj).map((k) => [k, avant[k]])), libelle: 'Remettre « Ma page » comme avant' },
      donnees: { prestations: services.map((s) => s.nom) },
      apercu: { lien: { href: '/profil', libelle: 'Ouvrir mon profil' } },
    }
  }
  INV.restaurer_ma_page = async (e) => {
    const { error } = await session.from('artisans').update(e).eq('id', b.uid)
    return error ? ko('Restauration impossible.') : { ok: true, resume: '« Ma page » remise comme avant' }
  }

  // ═══════════════ CRM : avancement (B1) ═══════════════
  async function tachesDe(chantierId: string): Promise<TacheAvancement[]> {
    const avec = await session.from('chantier_taches').select('id, libelle, faite, piece').eq('chantier_id', chantierId).eq('artisan_id', b.uid).limit(500)
    if (!avec.error) return (avec.data ?? []) as unknown as TacheAvancement[]
    // Sans la colonne `piece` (0166 absente) : les pièces se devinent d'après les libellés.
    const sans = await session.from('chantier_taches').select('id, libelle, faite').eq('chantier_id', chantierId).eq('artisan_id', b.uid).limit(500)
    if (sans.error) throw new Error('tâches illisibles')
    return (sans.data ?? []) as unknown as TacheAvancement[]
  }
  const nomTache = (t: TacheAvancement) => `« ${t.libelle} »${pieceDeTache(t) ? ` (${pieceDeTache(t)})` : ''}`
  R.avancer_chantier = async (e) => {
    if (!b.crm) return sansCrm
    const c = await b.chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const taches = await tachesDe(c.item.id)
    if (!taches.length) return ko(`Le chantier « ${c.item.titre} » n'a aucune tâche : ajoute-les (ajouter_tache) ou passe-le terminé (modifier_chantier).`)
    const m = correspondanceAvancement(taches, String(e.avancement))
    if (m.statut === 'ambigu') return ko(`Ambigu, rien n'a été coché. ${m.raison} Candidates : ${m.candidates.slice(0, 10).map(nomTache).join(', ')}. Demande à l'artisan lesquelles (puis cocher_tache).`)
    if (m.statut === 'rien') return ko(`Rien n'a été coché. ${m.raison} Tâches encore à faire : ${taches.filter((t) => !t.faite).slice(0, 10).map(nomTache).join(', ') || 'aucune'}.`)
    const avantPct = pctAvancement(taches)
    const cochees: TacheAvancement[] = []
    for (const t of m.taches) {
      const rep = await route(tacheMaj, `/api/crm/taches/${t.id}`, { methode: 'PATCH', corps: { faite: true }, params: { id: t.id } })
      if (rep.status !== 200) {
        if (!cochees.length) return refusDe(rep, 'Les tâches n’ont pas pu être cochées.')
        break
      }
      cochees.push(t)
    }
    const apres = taches.map((t) => (cochees.some((x) => x.id === t.id) ? { ...t, faite: true } : t))
    const pct = pctAvancement(apres)
    const toutFait = apres.every((t) => t.faite)
    return {
      ok: true, resume: `chantier « ${c.item.titre} » : ${cochees.length} tâche(s) cochée(s), avancement ${pct ?? '—'} %`, objet: { type: 'chantier', id: c.item.id },
      annulation: { outil: 'restaurer_taches', entrees: { ids: cochees.map((t) => t.id), faite: false }, libelle: cochees.length > 1 ? 'Décocher ces tâches' : 'Décocher cette tâche' },
      donnees: { chantier: c.item.titre, cochees: cochees.map((t) => t.libelle), piece: m.piece, avancement_pct: pct, ...(cochees.length < m.taches.length ? { non_cochees: m.taches.length - cochees.length } : {}), ...(toutFait ? { a_savoir: 'Toutes les tâches sont faites : le chantier peut être validé (cloturer_chantier), si l’artisan le veut.' } : {}) },
      apercu: { lignes: [{ label: 'Chantier', valeur: c.item.titre }, { label: 'Tâches cochées', valeur: cochees.map((t) => t.libelle).join(', ') }], avant_apres: [{ libelle: 'Avancement', avant: `${avantPct ?? '—'} %`, apres: `${pct ?? '—'} %` }], lien: lienDe('chantier', c.item.id) },
    }
  }
  INV.restaurer_taches = async (e) => {
    let n = 0
    for (const id of (e.ids as string[]) ?? []) {
      const rep = await route(tacheMaj, `/api/crm/taches/${id}`, { methode: 'PATCH', corps: { faite: e.faite === true }, params: { id } })
      if (rep.status === 200) n++
    }
    return n ? { ok: true, resume: `${n} tâche(s) remise(s) comme avant` } : ko('Restauration impossible.')
  }

  // ═══════════════ CRM : la carte (valider, remettre, validation automatique) ═══════════════
  R.cloturer_chantier = async (e) => {
    if (!b.crm) return sansCrm
    const c = await b.chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const rep = await route(chantierCarte, `/api/crm/chantiers/${c.item.id}/valider`, { corps: { action: 'valider' }, params: { id: c.item.id } })
    if (rep.status !== 200) return refusDe(rep, 'Le chantier n’a pas pu être validé.')
    return {
      ok: true, resume: `chantier « ${c.item.titre} » validé (terminé, retiré de la carte)`, objet: { type: 'chantier', id: c.item.id },
      annulation: c.item.statut === 'termine'
        ? { outil: 'remettre_sur_carte', entrees: { id: c.item.id }, libelle: 'Remettre le chantier sur la carte' }
        : { outil: 'restaurer_chantier', entrees: { id: c.item.id, champs: { statut: c.item.statut } }, libelle: `Rouvrir le chantier (« ${c.item.statut} »)` },
      donnees: { chantier: c.item.titre, a_savoir: 'Le chantier reste dans les listes, les factures et les chiffres ; seul son bâtiment quitte la carte.' },
      apercu: { avant_apres: [{ libelle: 'Statut', avant: c.item.statut, apres: 'termine' }], lien: lienDe('chantier', c.item.id) },
    }
  }
  const remettre = async (id: string): Promise<Realisation> => {
    const rep = await route(chantierCarte, `/api/crm/chantiers/${id}/valider`, { corps: { action: 'remettre' }, params: { id } })
    return rep.status === 200 ? { ok: true, resume: 'chantier remis sur la carte', objet: { type: 'chantier', id } } : refusDe(rep, 'Le chantier n’a pas pu revenir sur la carte.')
  }
  INV.remettre_sur_carte = async (e) => remettre(String(e.id))
  R.remettre_chantier_carte = async (e) => {
    if (!b.crm) return sansCrm
    const c = await b.chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    return remettre(c.item.id)
  }
  R.regler_validation_auto = async (e) => {
    if (!b.crm) return sansCrm
    const lu = await route(reglagesCrmLire, '/api/crm/reglages')
    if (lu.status !== 200) return refusDe(lu, 'Le réglage est indisponible.')
    const avant = lu.json?.validation_auto === true
    if (avant === e.actif) return ko(`La validation automatique est déjà ${avant ? 'active' : 'coupée'}.`)
    const rep = await route(reglagesCrmEcrire, '/api/crm/reglages', { methode: 'PUT', corps: { validation_auto: e.actif === true } })
    if (rep.status !== 200) return refusDe(rep, 'Le réglage n’a pas pu être enregistré.')
    return { ok: true, resume: `validation automatique des chantiers ${e.actif ? 'activée' : 'coupée'}`, objet: null, annulation: { outil: 'restaurer_validation_auto', entrees: { validation_auto: avant }, libelle: 'Remettre le réglage comme avant' } }
  }
  INV.restaurer_validation_auto = async (e) => {
    const rep = await route(reglagesCrmEcrire, '/api/crm/reglages', { methode: 'PUT', corps: { validation_auto: e.validation_auto === true } })
    return rep.status === 200 ? { ok: true, resume: 'validation automatique remise comme avant' } : refusDe(rep, 'Restauration impossible.')
  }

  // ═══════════════ CRM : les pièces des tâches ═══════════════
  R.repartir_taches_par_piece = async (e) => {
    if (!b.crm) return sansCrm
    const c = await b.chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const taches = await tachesDe(c.item.id)
    let plan: { id: string; libelle: string; avant: string | null; apres: string }[]
    if (txt(e.tache)) {
      const t = trouverUnique(taches, String(e.tache), (x) => [x.libelle], 'Tâche'); if (!t.ok) return ko(t.erreur)
      const piece = nettoyerPiece(e.piece); if (!piece) return ko('Pièce : un nom est nécessaire.')
      plan = [{ id: t.item.id, libelle: t.item.libelle, avant: t.item.piece ?? null, apres: piece }]
    } else {
      plan = taches.filter((t) => !txt(t.piece)).map((t) => ({ id: t.id, libelle: t.libelle, avant: null, apres: pieceDe(t.libelle) ?? '' })).filter((x) => x.apres)
      if (!plan.length) return ko('Aucune tâche à ranger : elles ont déjà une pièce, ou leur libellé ne nomme aucune pièce (range-les une par une avec tache et piece).')
    }
    const faits: typeof plan = []
    for (const x of plan) {
      const rep = await route(tacheMaj, `/api/crm/taches/${x.id}`, { methode: 'PATCH', corps: { piece: x.apres }, params: { id: x.id } })
      if (rep.status !== 200) { if (!faits.length) return refusDe(rep, 'Les tâches n’ont pas pu être rangées.'); break }
      faits.push(x)
    }
    return {
      ok: true, resume: `${faits.length} tâche(s) du chantier « ${c.item.titre} » rangée(s) par pièce`, objet: { type: 'chantier', id: c.item.id },
      annulation: { outil: 'restaurer_pieces', entrees: { taches: faits.map((x) => ({ id: x.id, piece: x.avant })) }, libelle: 'Remettre les pièces comme avant' },
      donnees: { rangees: faits.map((x) => `${x.libelle} → ${x.apres}`) },
      apercu: { avant_apres: faits.slice(0, 8).map((x) => ({ libelle: x.libelle.slice(0, 60), avant: x.avant ?? '—', apres: x.apres })), lien: lienDe('chantier', c.item.id) },
    }
  }
  INV.restaurer_pieces = async (e) => {
    let n = 0
    for (const t of (e.taches as { id: string; piece: string | null }[]) ?? []) {
      const rep = await route(tacheMaj, `/api/crm/taches/${t.id}`, { methode: 'PATCH', corps: { piece: t.piece }, params: { id: t.id } })
      if (rep.status === 200) n++
    }
    return n ? { ok: true, resume: `${n} tâche(s) remise(s) dans leur pièce` } : ko('Restauration impossible.')
  }

  // ═══════════════ CRM : rappels ═══════════════
  R.creer_rappel = async (e) => {
    if (!b.crm) return sansCrm
    let cible: Obj; let objet: { type: TypeObjet; id: string } | null = null; let sur: string
    if (txt(e.chantier)) {
      const c = await b.chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
      cible = { chantier_id: c.item.id }; objet = { type: 'chantier', id: c.item.id }; sur = `chantier « ${c.item.titre} »`
    } else if (txt(e.devis_numero)) {
      const d = await b.devisDe(String(e.devis_numero)); if (!d) return ko(`Devis ${e.devis_numero} introuvable.`)
      cible = { devis_id: d.id }; objet = { type: 'devis', id: d.id }; sur = `devis ${d.numero}`
    } else {
      const l = await b.leadDe(String(e.conversation_id)); if (!l) return ko('Conversation introuvable.')
      cible = { lead_id: l.id }; objet = { type: 'conversation', id: l.id }; sur = 'la conversation'
    }
    const type = ['rappeler', 'relancer_devis', 'visite', 'metre', 'rendez_vous', 'autre'].includes(String(e.genre)) ? e.genre : 'rappeler'
    const rep = await route(rappelCreer, '/api/crm/rappels', { corps: { ...cible, type, echeance: e.echeance, ...(txt(e.heure) ? { heure: e.heure } : {}), ...(txt(e.texte) ? { texte: e.texte } : {}) } })
    if (!reussi(rep.status) || typeof rep.json?.id !== 'string') return refusDe(rep, 'Le rappel n’a pas pu être créé.')
    return {
      ok: true, resume: `rappel « ${type} » posé au ${e.echeance} sur ${sur}`, objet,
      annulation: { outil: 'supprimer_rappel', entrees: { id: rep.json.id }, libelle: 'Retirer ce rappel' },
      donnees: { echeance: e.echeance, heure: e.heure ?? null, type },
      apercu: { lignes: [{ label: 'Rappel', valeur: `${type} · ${e.echeance}${e.heure ? ` à ${e.heure}` : ''}` }, { label: 'Sur', valeur: sur }], lien: objet ? lienDe(objet.type, objet.id) : null },
    }
  }
  INV.supprimer_rappel = async (e) => {
    const rep = await route(rappelSupprimer, `/api/crm/rappels/${e.id}`, { methode: 'DELETE', params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'rappel retiré' } : refusDe(rep, 'Suppression impossible.')
  }
  R.cocher_rappel = async (e) => {
    if (!b.crm) return sansCrm
    const fait = e.fait !== false
    const [{ data, error }, { data: chs, error: ec }] = await Promise.all([
      session.from('crm_rappels').select('id, texte, type, echeance, chantier_id, fait_le').eq('artisan_id', b.uid).order('echeance', { ascending: false }).limit(500),
      session.from('chantiers').select('id, titre').eq('artisan_id', b.uid).limit(2000),
    ])
    if (error || ec) throw new Error('rappels illisibles')
    const titres = new Map(((chs ?? []) as { id: string; titre: string }[]).map((c) => [c.id, c.titre]))
    const candidats = ((data ?? []) as { id: string; texte: string | null; type: string; echeance: string; chantier_id: string | null; fait_le: string | null }[]).filter((r) => (fait ? !r.fait_le : !!r.fait_le))
    const t = trouverUnique(candidats, String(e.rappel), (r) => [r.texte ?? '', r.chantier_id ? titres.get(r.chantier_id) ?? '' : ''].filter(Boolean), 'Rappel')
    if (!t.ok) return ko(t.erreur)
    const rep = await route(rappelMaj, `/api/crm/rappels/${t.item.id}`, { methode: 'PATCH', corps: { fait }, params: { id: t.item.id } })
    if (rep.status !== 200) return refusDe(rep, 'Le rappel n’a pas pu être mis à jour.')
    return {
      ok: true, resume: `rappel ${fait ? 'coché' : 'décoché'} (${t.item.echeance})`, objet: t.item.chantier_id ? { type: 'chantier', id: t.item.chantier_id } : null,
      annulation: { outil: 'restaurer_rappel', entrees: { id: t.item.id, fait: !fait }, libelle: fait ? 'Décocher ce rappel' : 'Recocher ce rappel' },
      donnees: { rappel: t.item.texte, echeance: t.item.echeance, fait },
    }
  }
  INV.restaurer_rappel = async (e) => {
    const rep = await route(rappelMaj, `/api/crm/rappels/${e.id}`, { methode: 'PATCH', corps: { fait: e.fait === true }, params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'rappel remis comme avant' } : refusDe(rep, 'Restauration impossible.')
  }

  // ═══════════════ CRM : commandes fournisseur ═══════════════
  async function commandeDe(texte: string): Promise<Trouve<CommandeA>> {
    const { data, error } = await session.from('commandes_fournisseur').select('id, fournisseur_nom, fournisseur_contact, reference, statut, commandee_le, livraison_prevue, recue_le, chantier_id, lignes, note, relances, relance_le').eq('artisan_id', b.uid)
      .eq('statut', 'commandee').limit(500)
    if (error) return ko(['42P01', 'PGRST205'].includes(String(error.code)) ? 'Le suivi des commandes n’est pas encore installé sur ce compte.' : 'Commandes illisibles.')
    const cmds = ((data ?? []) as Obj[]).map(commandeDeLigne).filter((c): c is CommandeA => !!c)
    const t = trouverUnique(cmds, texte, (c) => [c.fournisseur, c.reference ?? ''].filter(Boolean), 'Commande en attente')
    return t.ok ? { ok: true, item: t.item } : ko(t.erreur)
  }
  R.enregistrer_commande = async (e) => {
    if (!b.crm) return sansCrm
    const lignes = ((e.articles as string[]) ?? []).map((s) => ({ brut: s, l: ligneCommandeDe(s) }))
    const illisible = lignes.find((x) => !x.l)
    if (illisible) return ko(`Ligne illisible : « ${illisible.brut} ». Écris « quantité unité désignation » (ex. « 20 u plaque BA13 »).`)
    let chantierId: string | null = null
    if (txt(e.chantier)) { const c = await b.chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur); chantierId = c.item.id }
    // Une désignation qui est celle d'un article de l'inventaire y est rattachée (la réception le fera entrer en stock).
    const { data: mats, error } = await session.from('materiaux').select('id, nom').eq('artisan_id', b.uid).limit(1000)
    if (error) throw new Error('inventaire illisible')
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
    const parNom = new Map(((mats ?? []) as { id: string; nom: string }[]).map((m) => [norm(m.nom), m.id]))
    const corpsLignes = lignes.map(({ l }) => ({ nom: l!.nom, quantite: l!.quantite, unite: l!.unite, ...(parNom.get(norm(l!.nom)) ? { materiau_id: parNom.get(norm(l!.nom)) } : {}) }))
    const rep = await route(commandeCreer, '/api/crm/commandes', { corps: { fournisseur: e.fournisseur, livraison_prevue: e.livraison_prevue, lignes: corpsLignes, ...(chantierId ? { chantier_id: chantierId } : {}), ...(txt(e.reference) ? { reference: e.reference } : {}) } })
    if (!reussi(rep.status) || typeof rep.json?.id !== 'string') return refusDe(rep, 'La commande n’a pas pu être enregistrée.')
    return {
      ok: true, resume: `commande ${String(e.fournisseur)} enregistrée (${corpsLignes.length} ligne(s), livraison le ${e.livraison_prevue})`, objet: chantierId ? { type: 'chantier', id: chantierId } : null,
      annulation: { outil: 'annuler_commande', entrees: { id: rep.json.id }, libelle: 'Annuler cette commande' },
      donnees: { lignes: corpsLignes.map((l) => `${l.quantite} ${l.unite} ${l.nom}${'materiau_id' in l ? ' (inventaire)' : ''}`), a_savoir: "Rien n'est commandé d'ici : c'est la trace de ce que l'artisan a commandé. Sans e-mail du fournisseur, la relance ne pourra pas partir d'ici." },
      apercu: { lignes: [{ label: 'Fournisseur', valeur: String(e.fournisseur) }, { label: 'Livraison prévue', valeur: String(e.livraison_prevue) }, { label: 'Lignes', valeur: corpsLignes.map((l) => `${l.quantite} ${l.unite} ${l.nom}`).join(' ; ') }], lien: { href: '/crm', libelle: 'Ouvrir le CRM' } },
    }
  }
  INV.annuler_commande = async (e) => {
    const rep = await route(commandeMaj, `/api/crm/commandes/${e.id}`, { methode: 'PATCH', corps: { action: 'annuler' }, params: { id: String(e.id) } })
    return rep.status === 200 ? { ok: true, resume: 'commande annulée' } : refusDe(rep, 'Annulation impossible (déjà reçue ?).')
  }
  R.recevoir_commande = async (e) => {
    if (!b.crm) return sansCrm
    const c = await commandeDe(String(e.commande)); if (!c.ok) return ko(c.erreur)
    const rep = await route(commandeMaj, `/api/crm/commandes/${c.item.id}`, { methode: 'PATCH', corps: { action: 'recue', entrer_en_stock: e.entrer_en_stock === true }, params: { id: c.item.id } })
    if (rep.status !== 200) return refusDe(rep, 'La commande n’a pas pu être marquée reçue.')
    const liees = c.item.lignes.filter((l) => l.materiau_id).length
    return {
      ok: true, resume: `commande ${c.item.fournisseur} reçue${e.entrer_en_stock === true ? `, ${liees} ligne(s) entrée(s) en stock` : ''}`, objet: c.item.chantier_id ? { type: 'chantier', id: c.item.chantier_id } : null,
      donnees: { fournisseur: c.item.fournisseur, entree_en_stock: e.entrer_en_stock === true, lignes_liees_a_l_inventaire: liees, a_savoir: 'Ne se défait pas d’un clic : un stock se corrige avec ajuster_stock.' },
    }
  }
  P.relancer_commande = async (e) => {
    if (!b.crm) return sansCrm
    const c = await commandeDe(String(e.commande)); if (!c.ok) return ko(c.erreur)
    const to = adresseMail(c.item.contact)
    if (!to) return ko(`Aucune adresse e-mail pour ${c.item.fournisseur} : appelez-le, ou copiez le message depuis le CRM.`)
    const p = await b.profil()
    const message = texteRelance(c.item, jour(), p.nom)
    return { ok: true, entrees: { ...e, commande_id: c.item.id, message }, objet: c.item.chantier_id ? { type: 'chantier', id: c.item.chantier_id } : null, apercu: apercu(`Relancer ${c.item.fournisseur}${c.item.reference ? ` (commande ${c.item.reference})` : ''}`, { lignes: [{ label: 'À', valeur: to }, { label: 'Livraison prévue', valeur: c.item.livraison_prevue }], message: { a: to, objet: `Livraison attendue${c.item.reference ? ` — commande ${c.item.reference}` : ''}`, texte: message }, irreversible: true, lien: { href: '/crm', libelle: 'Ouvrir le CRM' } }) }
  }
  R.relancer_commande = async (e) => {
    if (!b.crm) return sansCrm
    const id = txt(e.commande_id)
    const c = id ? { ok: true as const, item: { id } } : await commandeDe(String(e.commande))
    if (!c.ok) return ko(c.erreur)
    if (!(await b.peutEnvoyer())) return limiteEnvois
    let message = txt(e.message)
    if (!message) { const cc = await commandeDe(String(e.commande)); if (!cc.ok) return ko(cc.erreur); message = texteRelance(cc.item, jour(), (await b.profil()).nom) }
    // Le texte envoyé est CELUI de la carte (la route exige `confirmer: true`, posé ici parce que l'artisan a confirmé la carte).
    const rep = await route(commandeRelancer, `/api/crm/commandes/${c.item.id}/relancer`, { corps: { message, confirmer: true }, params: { id: c.item.id } })
    if (rep.status !== 200) return refusDe(rep, 'La relance n’a pas pu partir.')
    return { ok: true, resume: 'relance envoyée au fournisseur' }
  }

  // ═══════════════ CRM : après-chantier (avis, entretien, opposition) ═══════════════
  async function rappelApres(chantierId: string, types: string[], ouverts: boolean): Promise<{ id: string; type: string } | null> {
    let q = session.from('crm_rappels').select('id, type, fait_le').eq('artisan_id', b.uid).eq('chantier_id', chantierId).in('type', types)
    if (ouverts) q = q.is('fait_le', null)
    const { data, error } = await q.order('echeance', { ascending: false }).limit(1)
    if (error) throw new Error('rappels illisibles')
    return ((data ?? [])[0] as { id: string; type: string } | undefined) ?? null
  }
  const preparerApres = (genre: 'demande_avis' | 'entretien') => async (e: EntreeAction): Promise<Preparation> => {
    if (!b.crm) return sansCrm
    const c = await b.chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const r = await rappelApres(c.item.id, [genre], true)
    if (!r) return ko(`Aucun rappel « ${genre === 'demande_avis' ? 'Demander un avis' : 'Proposer l’entretien'} » n'attend pour le chantier « ${c.item.titre} » (après-chantier désactivé, chantier pas encore terminé, ou déjà envoyé).`)
    const g = await route(apresMessageLire, `/api/crm/apres-chantier/message?rappel_id=${r.id}`)
    if (g.status !== 200 || !g.json) return refusDe(g, 'Le message n’a pas pu être préparé.')
    const av = (Array.isArray(g.json.avertissements) ? g.json.avertissements : []) as string[]
    if (g.json.envoyable !== true) return ko(`Ce message ne peut pas partir : ${av.join(' ') || 'conditions non réunies'}`)
    const a = String(g.json.destinataire), sujet = String(g.json.sujet ?? ''), texte = String(g.json.texte ?? '')
    return { ok: true, entrees: { ...e, rappel_id: r.id, message: texte }, objet: { type: 'chantier', id: c.item.id }, apercu: apercu(`${genre === 'demande_avis' ? 'Demander un avis' : 'Proposer l’entretien'} — ${c.item.titre}`, { lignes: [{ label: 'À', valeur: a }], message: { a, objet: sujet, texte }, alertes: av, irreversible: true, lien: lienDe('chantier', c.item.id) }) }
  }
  const envoyerApres = async (e: EntreeAction): Promise<Realisation> => {
    if (!b.crm) return sansCrm
    if (!txt(e.rappel_id) || !txt(e.message)) return ko('Carte incomplète : redemandez l’envoi à l’assistant.')
    if (!(await b.peutEnvoyer())) return limiteEnvois
    const rep = await route(apresMessageEnvoyer, '/api/crm/apres-chantier/message', { corps: { rappel_id: e.rappel_id, message: e.message } })
    if (!reussi(rep.status)) return refusDe(rep, 'Le message n’a pas pu partir.')
    return { ok: true, resume: 'message d’après-chantier envoyé au client' }
  }
  P.demander_avis = preparerApres('demande_avis')
  P.envoyer_rappel_entretien = preparerApres('entretien')
  R.demander_avis = envoyerApres
  R.envoyer_rappel_entretien = envoyerApres
  P.noter_opposition_client = async (e) => {
    if (!b.crm) return sansCrm
    const c = await b.chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const r = await rappelApres(c.item.id, ['demande_avis', 'entretien'], false)
    if (!r) return ko(`Le chantier « ${c.item.titre} » n'a aucun message d'après-chantier : rien à noter ici.`)
    return { ok: true, entrees: { ...e, rappel_id: r.id }, objet: { type: 'chantier', id: c.item.id }, apercu: apercu(`Le client du chantier « ${c.item.titre} » ne veut plus de messages`, { lignes: [{ label: 'Effet', valeur: 'plus aucune demande d’avis ni proposition d’entretien à ce client' }], alertes: ['Ne s’annule pas : c’est son droit d’opposition.'], irreversible: true, lien: lienDe('chantier', c.item.id) }) }
  }
  R.noter_opposition_client = async (e) => {
    if (!b.crm) return sansCrm
    if (!txt(e.rappel_id)) return ko('Carte incomplète : redemandez-la à l’assistant.')
    const rep = await route(apresOpposition, '/api/crm/apres-chantier/opposition', { corps: { rappel_id: e.rappel_id } })
    if (!reussi(rep.status)) return refusDe(rep, 'L’opposition n’a pas pu être notée.')
    return { ok: true, resume: 'opposition du client notée (plus de message d’après-chantier)' }
  }

  // ═══════════════ CRM : lien de suivi ═══════════════
  R.revoquer_lien_suivi = async (e) => {
    if (!b.crm) return sansCrm
    const c = await b.chantierDe(String(e.chantier)); if (!c.ok) return ko(c.erreur)
    const lu = await route(suiviLire, `/api/crm/chantiers/${c.item.id}/suivi`, { params: { id: c.item.id } })
    if (lu.status !== 200) return refusDe(lu, 'Le lien de suivi est indisponible.')
    if (lu.json?.actif !== true) return ko(`Le chantier « ${c.item.titre} » n'a pas de lien de suivi actif.`)
    const rep = await route(suiviRevoquer, `/api/crm/chantiers/${c.item.id}/suivi`, { methode: 'DELETE', params: { id: c.item.id } })
    if (rep.status !== 200) return refusDe(rep, 'Le lien n’a pas pu être révoqué.')
    return { ok: true, resume: `lien de suivi du chantier « ${c.item.titre} » révoqué`, objet: { type: 'chantier', id: c.item.id }, donnees: { a_savoir: 'Un nouveau lien se crée sur la fiche du chantier (il ne s’affiche qu’une fois).' }, apercu: { lien: lienDe('chantier', c.item.id) } }
  }

  return { R, P, INV }
}
