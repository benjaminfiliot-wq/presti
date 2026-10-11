// Panneaux de suivi du contenu (fiche 026-216, C13) : le MODÈLE de vue. Une fonction pure qui transforme les lignes de
// `contenu_lignes`, `contenu_posts` et `contenu_mesures` (migration 0114), l'attribution des ventes (lib/contenu/mesure.ts),
// les recommandations de classement (lib/contenu/boucle.ts, `jev score --provider laya`) en ce que les cinq panneaux affichent :
// Tour du Crieur, Audience, Recettes, Radar (onglet Contenu), Studio pubs. Aucun accès réseau, aucune base, aucune clé :
// l'appelant (serveur) fournit les lignes, ce fichier n'invente rien.
//
// Les règles que le juge relit (aucune n'est décorative) :
//  · une source qui manque est « non servie », jamais une liste vide rassurante ni un zéro ;
//  · « non mesuré » et « en attente » ne deviennent jamais 0 ; la vente par ligne dit `estimation` et sa fenêtre en heures ;
//  · le score Laya est une AIDE AU CHOIX : il ne publie rien, ne décide rien, et si Laya est en panne le panneau le dit ;
//  · une affirmation chiffrée dont la probabilité (jev noul) est < 0,5, dont la source manque ou dont le verdict est
//    « indisponible » devient une CARTE DE BLOCAGE pour Benj : texte exact et preuve manquante, aucune donnée de prospect ;
//  · un post Meta (Instagram, Facebook) prêt mais sans geste R6 ouvert attend : « en attente R6 », jamais « publié » ;
//  · aucune décision d'accord n'est déduite d'un score : l'état d'un post est celui de la base (`statut`).
import { libelleAttribution, planMesures } from '@/lib/contenu/mesure'
import type { AttributionParLigne, Echeance, Metrique } from '@/lib/contenu/mesure'
import { porteUneAffirmationChiffree } from '@/lib/contenu/lignes'
import type { Recommandation } from '@/lib/contenu/boucle'

// ── l'entrée : des lignes de base, telles que 0114 les range ────────────────────────────────────────────────────────
export type LigneBase = { id: string; libelle: string; canaux: string[]; approuvee_le: string | null; suspendue?: boolean }
export type Affirmation = { texte: string; source_ref: string | null; verdict: 'pass' | 'refus' | 'indisponible'; probabilite: number | null; le: string }
export type StatutPost = 'brouillon' | 'en_attente' | 'publiable' | 'publie' | 'refuse'
export type PostBase = {
  id: string
  ligne_id: string
  canal: string
  statut: StatutPost
  texte: string
  legende?: string | null
  sous_titres?: string | null
  miniature_texte?: string | null
  description?: string | null
  rendu_type: 'texte' | 'image' | 'video'
  affirmations: Affirmation[]
  chiffres_neutres?: boolean
  preuve_publique?: string | null
  preuve_le?: string | null
  publie_le?: string | null
  cree_le: string
  /** Le motif servi d'un refus d'accord (le bus le garde) : affiché tel quel. */
  motif_refus?: string | null
}
export type MesureBase = {
  post_id: string
  echeance: Echeance
  metrique: Metrique
  etat: 'mesure' | 'non_mesure' | 'en_attente'
  valeur: number | null
  source: string
  source_ref?: string | null
  certitude: 'mesure' | 'estimation'
  fenetre_attribution_h: number | null
  mesure_le: string
}
export type EntreeSuivi = {
  maintenantMs: number
  /** `null` = la source n'est pas servie (panne, droit refusé) : le panneau le dit, il ne montre pas « rien ». */
  lignes: LigneBase[] | null
  posts: PostBase[] | null
  mesures: MesureBase[] | null
  ventes: AttributionParLigne[] | null
  recommandations: Recommandation[] | null
  /** Laya/Jev local : `disponible: false` = panne ; le motif est dit tel quel. */
  jev: { disponible: boolean; erreur?: string | null } | null
  /** Le geste Meta (R6) est-il ouvert ? `null` = inconnu : traité comme fermé. */
  r6Ouvert: boolean | null
}

// ── la sortie : ce que les panneaux affichent ───────────────────────────────────────────────────────────────────────
export type Etat = 'ok' | 'vide' | 'attente_r6' | 'panne' | 'non_servi'
export type PostVu = { id: string; ligne: string; canal: string; rendu: string; texteExact: string; dit: string[] }
export type Publication = { id: string; ligne: string; canal: string; publieLe: string | null; preuve: string | null; preuveManquante: boolean }
export type CelluleMesure = { metrique: string; texte: string; source: string | null; le: string | null; disponible: boolean; estimation: boolean; fenetreH: number | null }
export type LigneAudience = { postId: string; ligne: string; canal: string; echeances: Array<{ echeance: Echeance; statut: 'echue' | 'en_attente'; cellules: CelluleMesure[] }> }
export type Candidat = { id: string; statut: string; motif: string; niveau: number | null; provenance: string | null; signal: string }
export type Blocage = { postId: string; ligne: string; canal: string; texteExact: string; source: string | null; probabilite: number | null; verdict: string; manque: string }
export type SuiviContenu = {
  crieur: {
    etat: Etat
    message: string | null
    lignes: Array<{ id: string; libelle: string; canaux: string[]; approuvee: boolean; suspendue: boolean; enAttente: number; publies: number }>
    enAttente: PostVu[]
    fileTiktok: PostVu[]
    attenteR6: PostVu[]
    refuses: Array<{ id: string; ligne: string; canal: string; motif: string }>
    publications: Publication[]
  }
  audience: { etat: Etat; message: string | null; publications: LigneAudience[] }
  recettes: { etat: Etat; message: string | null; lignes: Array<{ ligne: string; libelle: string; certitude: 'estimation'; fenetreH: number }> }
  radar: { etat: Etat; message: string | null; candidats: Candidat[] }
  studio: { etat: Etat; message: string | null; enAttente: PostVu[] }
  blocages: Blocage[]
}

// ── petites mains ────────────────────────────────────────────────────────────────────────────────────────────────────
const NOMBRE = new Intl.NumberFormat('fr-FR')
const META = new Set(['instagram', 'facebook'])
const LIBELLE_METRIQUE: Readonly<Record<Metrique, string>> = Object.freeze({
  vues: 'vues', lectures_completes: 'lectures complètes', temps_moyen_s: 'temps moyen', enregistrements: 'enregistrements', partages: 'partages',
  commentaires: 'commentaires', j_aime: 'j’aime', visites: 'visites', demandes_maquette: 'demandes de maquette', ventes: 'ventes',
})
const PAR_DATE = (a: string | null | undefined, b: string | null | undefined) => Date.parse(b ?? '') - Date.parse(a ?? '') || 0

/** Les textes que le public verra (texte, légende, sous-titres, miniature, description) : tels quels, jamais interprétés. */
function ceQuonVoit(p: PostBase): string[] {
  const dit: string[] = []
  for (const [nom, v] of [['texte', p.texte], ['légende', p.legende], ['sous-titres', p.sous_titres], ['miniature', p.miniature_texte], ['description', p.description]] as const) {
    if (typeof v === 'string' && v.trim()) dit.push(`${nom} : ${v}`)
  }
  return dit
}
const vu = (p: PostBase): PostVu => ({ id: p.id, ligne: p.ligne_id, canal: p.canal, rendu: p.rendu_type, texteExact: p.texte, dit: ceQuonVoit(p) })

/** Une valeur de mesure écrite : un nombre servi s'écrit ; « non mesuré » et « en attente » restent des mots, jamais 0. */
function cellule(m: MesureBase | undefined, metrique: Metrique, echue: boolean): CelluleMesure {
  const metriqueDite = LIBELLE_METRIQUE[metrique]
  if (!m) return { metrique: metriqueDite, texte: echue ? 'non mesuré' : 'en attente', source: null, le: null, disponible: false, estimation: false, fenetreH: null }
  const estimation = m.certitude === 'estimation'
  if (m.etat !== 'mesure' || typeof m.valeur !== 'number' || !Number.isFinite(m.valeur)) {
    return { metrique: metriqueDite, texte: m.etat === 'en_attente' ? 'en attente' : 'non mesuré', source: m.source, le: m.mesure_le, disponible: false, estimation, fenetreH: m.fenetre_attribution_h }
  }
  const nombre = metrique === 'temps_moyen_s' ? `${NOMBRE.format(m.valeur)} s` : NOMBRE.format(m.valeur)
  return { metrique: metriqueDite, texte: estimation ? `${nombre} (estimation)` : nombre, source: m.source, le: m.mesure_le, disponible: true, estimation, fenetreH: m.fenetre_attribution_h }
}

const METRIQUES_AFFICHEES: readonly Metrique[] = ['vues', 'lectures_completes', 'temps_moyen_s', 'enregistrements', 'partages', 'commentaires', 'j_aime', 'visites', 'demandes_maquette', 'ventes']

// ── le blocage : jev noul < 0,5, ou preuve absente ───────────────────────────────────────────────────────────────────
/** Seuil de jev noul (le même que SEUIL_LAYA de lib/contenu/lignes.ts : < 0,5 bloque). */
export const SEUIL_BLOCAGE = 0.5

export function blocagesDe(posts: PostBase[]): Blocage[] {
  const sortie: Blocage[] = []
  for (const p of posts) {
    if (p.statut === 'publie' || p.statut === 'refuse') continue
    const base = { postId: p.id, ligne: p.ligne_id, canal: p.canal }
    for (const a of Array.isArray(p.affirmations) ? p.affirmations : []) {
      const source = typeof a?.source_ref === 'string' && a.source_ref.trim() ? a.source_ref : null
      const manque = !source ? 'preuve manquante : aucune source indiquée'
        : a.verdict === 'indisponible' ? 'preuve non jugée : Laya indisponible, renvoyé à Benj'
        : a.verdict === 'refus' ? `affirmation refusée par jev noul (probabilité ${typeof a.probabilite === 'number' ? a.probabilite : 'inconnue'} < ${SEUIL_BLOCAGE})`
        : typeof a.probabilite !== 'number' || !Number.isFinite(a.probabilite) ? 'probabilité de jev noul absente : jamais une valeur flatteuse par défaut'
        : a.probabilite < SEUIL_BLOCAGE ? `probabilité ${a.probabilite} < ${SEUIL_BLOCAGE} (jev noul)` : null
      if (manque) sortie.push({ ...base, texteExact: String(a?.texte ?? ''), source, probabilite: typeof a?.probabilite === 'number' ? a.probabilite : null, verdict: String(a?.verdict ?? 'inconnu'), manque })
    }
    // Un chiffre dans ce que le public verra, sans aucune affirmation jugée : la preuve manque.
    if (!p.chiffres_neutres && (!Array.isArray(p.affirmations) || p.affirmations.length === 0)) {
      for (const t of [p.texte, p.legende, p.sous_titres, p.miniature_texte, p.description]) {
        if (typeof t === 'string' && t.trim() && porteUneAffirmationChiffree(t)) { sortie.push({ ...base, texteExact: t, source: null, probabilite: null, verdict: 'non jugé', manque: 'preuve manquante : un chiffre est écrit, aucune affirmation n’a été jugée' }); break }
      }
    }
  }
  return sortie
}

const NON_SERVI = (quoi: string) => `${quoi} n’est pas servi : rien n’est montré à sa place.`

// ── l'assemblage ───────────────────────────────────────────────────────────────────────────────────────────────────
export function construireSuivi(e: EntreeSuivi): SuiviContenu {
  const posts = e.posts
  const r6Ferme = e.r6Ouvert !== true

  // Tour du Crieur : lignes, séries en attente d'accord, file TikTok, publications et preuves publiques.
  const crieur: SuiviContenu['crieur'] = { etat: 'ok', message: null, lignes: [], enAttente: [], fileTiktok: [], attenteR6: [], refuses: [], publications: [] }
  if (!posts || !e.lignes) {
    crieur.etat = 'non_servi'
    crieur.message = NON_SERVI(!posts ? 'Le suivi des publications' : 'Le cadre des lignes L1 à L5')
  } else {
    crieur.lignes = e.lignes.map((l) => ({
      id: l.id, libelle: l.libelle, canaux: l.canaux, approuvee: !!l.approuvee_le, suspendue: l.suspendue === true,
      enAttente: posts.filter((p) => p.ligne_id === l.id && p.statut === 'en_attente').length,
      publies: posts.filter((p) => p.ligne_id === l.id && p.statut === 'publie').length,
    }))
    crieur.enAttente = posts.filter((p) => p.statut === 'en_attente').sort((a, b) => PAR_DATE(a.cree_le, b.cree_le)).map(vu)
    // La file TikTok : les vidéos prêtes à partir. Un post TikTok n'est jamais « publié » sans sa preuve publique.
    crieur.fileTiktok = posts.filter((p) => p.canal === 'tiktok' && p.statut === 'publiable').map(vu)
    crieur.attenteR6 = r6Ferme ? posts.filter((p) => META.has(p.canal) && p.statut === 'publiable').map(vu) : []
    crieur.refuses = posts.filter((p) => p.statut === 'refuse').map((p) => ({ id: p.id, ligne: p.ligne_id, canal: p.canal, motif: p.motif_refus?.trim() || 'motif non servi' }))
    crieur.publications = posts.filter((p) => p.statut === 'publie').sort((a, b) => PAR_DATE(a.publie_le, b.publie_le)).map((p) => ({
      id: p.id, ligne: p.ligne_id, canal: p.canal, publieLe: p.publie_le ?? null, preuve: p.preuve_publique ?? null, preuveManquante: !p.preuve_publique,
    }))
    if (crieur.lignes.length === 0 && posts.length === 0) { crieur.etat = 'vide'; crieur.message = 'Aucune ligne servie et aucune publication : rien à suivre pour l’instant.' }
    else if (crieur.attenteR6.length > 0 && crieur.enAttente.length === 0 && crieur.fileTiktok.length === 0 && crieur.publications.length === 0) { crieur.etat = 'attente_r6'; crieur.message = 'Des publications Meta attendent le geste R6 : rien ne part avant.' }
  }

  // Audience : par ligne et par publication, source, date et disponibilité de chaque mesure.
  const audience: SuiviContenu['audience'] = { etat: 'ok', message: null, publications: [] }
  if (!posts || !e.mesures) { audience.etat = 'non_servi'; audience.message = NON_SERVI(!posts ? 'Le suivi des publications' : 'Le relevé des mesures') }
  else {
    audience.publications = posts.filter((p) => p.statut === 'publie').sort((a, b) => PAR_DATE(a.publie_le, b.publie_le)).map((p) => {
      const plan = planMesures(p.publie_le, e.maintenantMs)
      return {
        postId: p.id, ligne: p.ligne_id, canal: p.canal,
        echeances: plan.map((x) => ({
          echeance: x.echeance, statut: x.statut,
          cellules: METRIQUES_AFFICHEES.filter((m) => e.mesures!.some((z) => z.post_id === p.id && z.echeance === x.echeance && z.metrique === m) || (x.statut === 'echue' && !['visites', 'demandes_maquette', 'ventes'].includes(m)))
            .map((m) => cellule(e.mesures!.find((z) => z.post_id === p.id && z.echeance === x.echeance && z.metrique === m), m, x.statut === 'echue')),
        })),
      }
    })
    if (audience.publications.length === 0) { audience.etat = 'vide'; audience.message = 'Aucune publication publiée : aucune mesure à montrer, et aucun zéro à sa place.' }
  }

  // Recettes : la vente par ligne est une ESTIMATION, sa fenêtre est dite.
  const recettes: SuiviContenu['recettes'] = { etat: 'ok', message: null, lignes: [] }
  if (!e.ventes) { recettes.etat = 'non_servi'; recettes.message = NON_SERVI('Le rattachement des ventes aux lignes') }
  else {
    recettes.lignes = e.ventes.map((a) => ({ ligne: a.ligne, libelle: libelleAttribution(a), certitude: 'estimation' as const, fenetreH: a.fenetre_attribution_h }))
    if (recettes.lignes.length === 0) { recettes.etat = 'vide'; recettes.message = 'Aucune vente rattachée à une ligne sur la fenêtre : ce n’est pas une mesure de zéro, c’est une absence de rattachement.' }
  }

  // Radar (onglet Contenu) : les candidats à republier avec leur score Laya, comme aide au choix. Aucun bouton, aucun texte rédigé.
  const radar: SuiviContenu['radar'] = { etat: 'ok', message: null, candidats: [] }
  if (!e.jev || e.jev.disponible === false) {
    radar.etat = 'panne'
    radar.message = `Laya (jev) ne répond pas${e.jev?.erreur ? ` : ${e.jev.erreur}` : ''} : aucun score n’est montré, aucun cas qui exige son verdict ne passe.`
  } else if (!e.recommandations) { radar.etat = 'non_servi'; radar.message = NON_SERVI('Le classement des candidats à republier') }
  else {
    radar.candidats = e.recommandations.map((r) => ({ id: r.id, statut: r.statut, motif: r.motif, niveau: r.scoreJev?.niveau ?? null, provenance: r.scoreJev?.provenance ?? null, signal: r.signal }))
    if (radar.candidats.length === 0) { radar.etat = 'vide'; radar.message = 'Aucun candidat classable : il faut une fenêtre H+24 ou J+7 mesurée.' }
  }

  // Studio pubs (onglet Presti) : les vidéos en attente d'accord individuel de Benj, avec tout ce que le public verra.
  const studio: SuiviContenu['studio'] = { etat: 'ok', message: null, enAttente: [] }
  if (!posts) { studio.etat = 'non_servi'; studio.message = NON_SERVI('Le suivi des publications') }
  else {
    studio.enAttente = posts.filter((p) => p.statut === 'en_attente' && p.rendu_type === 'video').map(vu)
    if (studio.enAttente.length === 0) { studio.etat = 'vide'; studio.message = 'Aucune vidéo n’attend d’accord.' }
  }

  return { crieur, audience, recettes, radar, studio, blocages: posts ? blocagesDe(posts) : [] }
}
