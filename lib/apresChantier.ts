// L'APRÈS-CHANTIER (plan du 18/10, n°7) — la partie PURE : quand proposer une demande d'avis ou un rappel d'entretien, avec quel
// texte, et à quelles conditions un message peut partir. La lecture de la base et la pose des rappels vivent dans
// lib/apresChantierTour.ts (passage quotidien, app/api/cron/relances) ; l'envoi, dans app/api/crm/apres-chantier/message.
//
// Règles (scripts/crm-lot4-qa.mjs les fait respecter) :
//  • DÉSACTIVÉ par défaut : rien n'est proposé tant que l'artisan n'a pas coché « Demander un avis » ou « Proposer l'entretien »
//    (réglage pour tous ses chantiers, table crm_apres_chantier, migration 0165).
//  • Le passage quotidien ne fait que POSER UN RAPPEL pour l'artisan (crm_rappels, origine « système »). AUCUN message ne part
//    tout seul : chaque envoi est relu et confirmé par l'artisan, comme la relance d'un devis.
//  • Demande d'avis : 2 jours après la fin RÉELLE d'un chantier terminé. À l'activation, pas de rattrapage en rafale : seuls les
//    chantiers finis depuis RATTRAPAGE_JOURS au plus sont proposés.
//  • Entretien : seulement si le chantier parle d'un équipement qui s'entretient (chaudière, pompe à chaleur, conduit de fumée) ;
//    l'artisan est prévenu PREAVIS_JOURS avant la date anniversaire. Un seul rappel à venir par chantier ; le suivant est posé
//    quand le message part.
//  • Le texte est celui de l'artisan (modifiable) ; AUCUN lien (même règle que les relances d'impayés). Le lien vers sa fiche
//    d'avis reste « à confirmer » par l'audit de conformité (LIEN_AVIS_AUTORISE) : en attendant, le texte invite à laisser un
//    avis sans adresse.
//  • Un message par jour et par client, MAX_PAR_COMPTE_JOUR par compte et par jour ; le client a écrit depuis la fin du
//    chantier : l'écran le dit avant l'envoi (l'artisan relit d'abord la conversation).
//  • Les durées de GARANTIE (parfait achèvement, biennale, décennale) ne sont pas affichées : à valider par la conformité.
import { ajouterJours } from './crm/rappels.ts'

export const DELAI_AVIS_JOURS = 2
export const RATTRAPAGE_JOURS = 14
export const PREAVIS_JOURS = 15
/** Au-delà, un chantier fini n'est plus suivi pour l'entretien. 3 ans : le référentiel CNIL « gestion commerciale » (3 ans après
 *  la fin de la relation), aligné sur DUREES_MOIS.crm (36 mois) — audit de conformité du 20/10 (A2). */
export const ENTRETIEN_ANS_MAX = 3
export const MAX_PAR_COMPTE_JOUR = 10
export const TEXTE_MIN = 20
export const TEXTE_MAX = 1500
/** Le lien vers la fiche d'avis de l'artisan dans le message : À CONFIRMER par l'audit de conformité (e-mail à un client existant). */
export const LIEN_AVIS_AUTORISE = false

export type GenreApres = 'avis' | 'entretien'
export const TYPE_RAPPEL_DE: Record<GenreApres, 'demande_avis' | 'entretien'> = { avis: 'demande_avis', entretien: 'entretien' }

export type ReglagesApres = { avis: boolean; entretien: boolean; texte_avis: string | null; texte_entretien: string | null; actif_depuis: string | null }
export const REGLAGES_APRES_PAR_DEFAUT: ReglagesApres = { avis: false, entretien: false, texte_avis: null, texte_entretien: null, actif_depuis: null }

export const VARIABLES_APRES = ['client', 'chantier', 'artisan', 'equipement'] as const
export type VariableApres = (typeof VARIABLES_APRES)[number]
export const DESCRIPTION_VARIABLES_APRES: Record<VariableApres, string> = {
  client: 'le nom du client', chantier: 'le titre du chantier', artisan: 'votre nom', equipement: 'l’équipement à entretenir',
}

export const TEXTES_APRES_PAR_DEFAUT: Record<GenreApres, string> = {
  avis: 'Bonjour {client},\n\nMerci de nous avoir fait confiance pour « {chantier} ». Votre avis sur notre fiche en ligne, quel qu’il soit, nous intéresse et aide les prochains clients à se décider.\n\nPour toute question sur le chantier, répondez simplement à ce message.\n\n{artisan}',
  entretien: 'Bonjour {client},\n\nNous sommes intervenus chez vous pour « {chantier} ». L’entretien de votre {equipement} arrive bientôt : voulez-vous que nous convenions d’une date ? Répondez simplement à ce message.\n\n{artisan}',
}
export const PIED_APRES = 'Message envoyé à la suite de votre chantier. Si vous ne souhaitez plus en recevoir, dites-le simplement en répondant.'

// Une adresse de site (même sans « https:// ») ; une adresse e-mail dans la signature reste permise.
const LIEN = /https?:\/\/|www\.|(?<![@\w.-])[a-z0-9-]+\.(?:fr|com|net|org|io|app|eu|be|ch)\b/i

/** Valide un texte écrit par l'artisan : longueur, variables connues, aucun lien. Null = valable. */
export function erreurTexteApres(t: string): string | null {
  const s = t.trim()
  if (s.length < TEXTE_MIN) return `Le texte est trop court (au moins ${TEXTE_MIN} caractères).`
  if (s.length > TEXTE_MAX) return `Le texte est trop long (${TEXTE_MAX} caractères au plus).`
  if (LIEN.test(s)) return 'Pas de lien dans ce message : écrivez-le sans adresse de site.'
  for (const m of s.matchAll(/\{([^{}]*)\}/g)) if (!(VARIABLES_APRES as readonly string[]).includes(m[1])) return `La variable {${m[1]}} n’existe pas. Disponibles : ${VARIABLES_APRES.map((x) => `{${x}}`).join(', ')}.`
  if (/[{}]/.test(s.replace(/\{[a-z]+\}/g, ''))) return 'Accolades mal fermées dans le texte.'
  return null
}

export type VariablesApres = Record<VariableApres, string>
export const remplirApres = (modele: string, v: VariablesApres): string =>
  modele.replace(/\{([a-z]+)\}/g, (m, k: string) => ((VARIABLES_APRES as readonly string[]).includes(k) ? v[k as VariableApres] : m))

export const texteApres = (genre: GenreApres, r: Pick<ReglagesApres, 'texte_avis' | 'texte_entretien'>): string =>
  (genre === 'avis' ? r.texte_avis : r.texte_entretien)?.trim() || TEXTES_APRES_PAR_DEFAUT[genre]

export const sujetApres = (genre: GenreApres, chantier: string | null, equipement: string | null): string =>
  genre === 'avis'
    ? `Votre avis sur ${chantier ? `« ${chantier.slice(0, 80)} »` : 'notre intervention'}`
    : `Entretien de votre ${equipement ?? 'installation'}`

export const messageCompletApres = (corps: string): string => `${corps.trim()}\n\n—\n${PIED_APRES}`

/** Lit et valide les réglages envoyés par l'écran. Les textes vides reviennent au texte par défaut. */
export function lireReglagesApres(brut: unknown): { ok: true; reglages: Omit<ReglagesApres, 'actif_depuis'> } | { ok: false; erreur: string } {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return { ok: false, erreur: 'Réglages illisibles.' }
  const b = brut as Record<string, unknown>
  const inconnus = Object.keys(b).filter((k) => !['avis', 'entretien', 'texte_avis', 'texte_entretien'].includes(k))
  if (inconnus.length) return { ok: false, erreur: `Champ inconnu : ${inconnus.join(', ')}.` }
  if (typeof b.avis !== 'boolean' || typeof b.entretien !== 'boolean') return { ok: false, erreur: 'Cochez ou décochez chaque envoi.' }
  const texte = (v: unknown): { ok: true; t: string | null } | { ok: false; erreur: string } => {
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) return { ok: true, t: null }
    if (typeof v !== 'string') return { ok: false, erreur: 'Texte illisible.' }
    const e = erreurTexteApres(v)
    return e ? { ok: false, erreur: e } : { ok: true, t: v.trim() }
  }
  const ta = texte(b.texte_avis), te = texte(b.texte_entretien)
  if (!ta.ok) return { ok: false, erreur: `Demande d’avis : ${ta.erreur}` }
  if (!te.ok) return { ok: false, erreur: `Entretien : ${te.erreur}` }
  return { ok: true, reglages: { avis: b.avis, entretien: b.entretien, texte_avis: ta.t, texte_entretien: te.t } }
}

// ─── L'équipement à entretenir ─────────────────────────────────────────────────────────────────────────────────────────────
// Les mois entre deux entretiens proposés. Chaudière : annuel (décret 2009-649). Pompe à chaleur : tous les deux ans (décret
// 2020-912). Conduit de fumée : au moins une fois l'an (règlements sanitaires départementaux). À relire par la conformité ;
// l'écran ne cite aucune obligation, il propose une date.
export const EQUIPEMENTS: readonly { nom: string; mois: number; motif: RegExp }[] = [
  { nom: 'chaudière', mois: 12, motif: /chaudi[eè]re/i },
  { nom: 'pompe à chaleur', mois: 24, motif: /pompe\s+[àa]\s+chaleur|\bPAC\b/ },
  { nom: 'conduit de fumée', mois: 12, motif: /ramonage|po[êe]le|chemin[ée]e|insert\b|conduit de fum/i },
]
export function equipementDe(textes: readonly (string | null | undefined)[]): { nom: string; mois: number } | null {
  const s = textes.filter(Boolean).join(' \n ')
  const e = EQUIPEMENTS.find((x) => x.motif.test(s))
  return e ? { nom: e.nom, mois: e.mois } : null
}

/** Ajoute des mois à un jour « AAAA-MM-JJ » (le 31 devient le dernier jour du mois s'il n'existe pas). */
export function ajouterMois(j: string, n: number): string {
  const a = +j.slice(0, 4), m = +j.slice(5, 7) - 1 + n, d = +j.slice(8, 10)
  const an = a + Math.floor(m / 12), mo = ((m % 12) + 12) % 12
  const dernier = new Date(Date.UTC(an, mo + 1, 0)).getUTCDate()
  return new Date(Date.UTC(an, mo, Math.min(d, dernier))).toISOString().slice(0, 10)
}

// ─── Ce que le passage quotidien propose ───────────────────────────────────────────────────────────────────────────────────
export type ChantierApres = {
  id: string; titre: string | null; statut: string; date_fin_reelle: string | null; client_nom: string | null
  /** Ce qui décrit les travaux : titre, objet du devis, désignations. Sert à reconnaître l'équipement. */
  textes?: readonly (string | null)[]
}
export type Proposition = { cle: string; chantier_id: string; type: 'demande_avis' | 'entretien'; echeance: string; texte: string }

/** La fin d'un chantier : sa date de fin RÉELLE, seulement s'il est terminé. */
export const finDe = (c: Pick<ChantierApres, 'statut' | 'date_fin_reelle'>): string | null =>
  c.statut === 'termine' && c.date_fin_reelle && /^\d{4}-\d{2}-\d{2}$/.test(c.date_fin_reelle.slice(0, 10)) ? c.date_fin_reelle.slice(0, 10) : null

export function propositions(p: { chantiers: readonly ChantierApres[]; reglages: ReglagesApres; existantes: ReadonlySet<string>; jour: string }): Proposition[] {
  const { reglages: r, jour } = p
  if (!r.avis && !r.entretien) return []
  const activation = (r.actif_depuis ?? '').slice(0, 10) || jour
  const out: Proposition[] = []
  for (const c of p.chantiers) {
    const fin = finDe(c)
    if (!fin || fin > jour) continue
    const qui = c.client_nom?.trim() || 'le client'
    if (r.avis && fin >= ajouterJours(activation, -RATTRAPAGE_JOURS)) {
      const cle = `avis:${c.id}`
      if (!p.existantes.has(cle)) {
        const due = ajouterJours(fin, DELAI_AVIS_JOURS)
        out.push({ cle, chantier_id: c.id, type: 'demande_avis', echeance: due > jour ? due : jour, texte: `Demander un avis à ${qui}`.slice(0, 300) })
      }
    }
    const eq = r.entretien ? equipementDe([c.titre, ...(c.textes ?? [])]) : null
    if (eq && fin >= ajouterMois(jour, -12 * ENTRETIEN_ANS_MAX)) {
      // Le prochain anniversaire à venir (n ≥ 1) : pour un chantier ancien, pas de rappel dans le passé.
      let n = 1
      while (ajouterJours(ajouterMois(fin, n * eq.mois), -PREAVIS_JOURS) < jour && n < 100) n++
      const cle = `entretien:${c.id}:${n}`
      if (!p.existantes.has(cle) && ![...p.existantes].some((k) => k.startsWith(`entretien:${c.id}:`) && Number(k.split(':')[2]) >= n)) {
        out.push({ cle, chantier_id: c.id, type: 'entretien', echeance: ajouterJours(ajouterMois(fin, n * eq.mois), -PREAVIS_JOURS), texte: `Proposer l’entretien (${eq.nom}) à ${qui}`.slice(0, 300) })
      }
    }
  }
  return out
}

// ─── L'envoi ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type EtatEnvoi = { email: string | null; envoyesAujourdhuiCompte: number; dejaEcritAujourdhuiAuClient: boolean; dejaEnvoye: boolean; reglageActif: boolean; oppose?: boolean }
/** Peut-on envoyer ce message ? (le contenu est vérifié à part, par erreurTexteApres). */
export function decisionEnvoiApres(e: EtatEnvoi): { ok: true } | { ok: false; statut: number; erreur: string } {
  if (!e.reglageActif) return { ok: false, statut: 409, erreur: 'Cet envoi est désactivé dans vos réglages de l’après-chantier.' }
  // Le client a dit non (crm_apres_opposition, migration 0171) : plus aucun message d'après-chantier, sans condition (RGPD art. 21.2-3).
  if (e.oppose) return { ok: false, statut: 409, erreur: 'Ce client a demandé à ne plus recevoir ces messages.' }
  if (e.dejaEnvoye) return { ok: false, statut: 409, erreur: 'Ce message est déjà parti.' }
  if (!e.email) return { ok: false, statut: 409, erreur: 'Aucune adresse e-mail pour ce client : appelez-le, ou ajoutez son adresse au devis.' }
  if (e.dejaEcritAujourdhuiAuClient) return { ok: false, statut: 429, erreur: 'Un message est déjà parti aujourd’hui à ce client : attendez demain.' }
  if (e.envoyesAujourdhuiCompte >= MAX_PAR_COMPTE_JOUR) return { ok: false, statut: 429, erreur: `Pas plus de ${MAX_PAR_COMPTE_JOUR} messages d’après-chantier par jour.` }
  return { ok: true }
}
