// lib/contenu/accord.ts — le geste d'accord de Benj sur CHAQUE publication (fiche 026-217, C14), écrit par Claude Code.
// Fonctions PURES, sauf `preparerDemandeAccord` dont la seule E/S est l'appel local `jev noul --provider laya`
// (lib/agents/llm.ts `vraisemblance`, jamais un repli hébergé). Rien ici n'écrit en base et ne publie : la carte de
// décision se dépose par `POST /api/agents/decisions` (lib/agents/bus.ts `ops_decision_creer`), la carte Attention
// existante l'affiche, aucune route ni carte nouvelle.
//
// Règle de Benj (R24, permanente tant qu'elle reste ouverte) : chaque vidéo et chaque publication demande SON accord.
//  - options `accorder` / `refuser`, défaut `refuser`, portée `securite` (reconfirmation par mot de passe) ;
//  - seule une décision `tranchee` (jamais `defaut_applique` : une échéance passée applique « refuser »), choix
//    `accorder`, visant EXACTEMENT ce post, sur EXACTEMENT cette version du texte et du média, autorise ;
//  - la version est liée à la clé de la décision (`contenu:post:<id>:<empreinte>`) : retoucher un mot ou le média
//    change l'empreinte, l'accord est caduc et la demande se rouvre ;
//  - seul un fondateur tranche une décision (0098 : `ops_decision_trancher`, auteur `is_founder`) : « signée par Benj »
//    est garanti par la base, pas par un champ que le texte de la carte pourrait falsifier ;
//  - aucun accord d'un autre post, d'une ancienne version, d'une première série ou d'une ligne, aucun score de Laya ne
//    remplace ce geste.
import { createHash } from 'node:crypto'
import { vraisemblance, type DepsLecteur } from '@/lib/agents/llm'
import { accordValide, porteUneAffirmationChiffree, SEUIL_LAYA, textesVisibles, versionTexte, type DecisionAccord, type Post } from '@/lib/contenu/lignes'

// ── le cadre de la carte ─────────────────────────────────────────────────────────────────────────────────────────
export const PORTEE = 'securite' as const
export const DEFAUT = 'refuser' as const
/** `refuser` est la SEULE option recommandée : le bus en exige exactement une, et l'inaction ne publie jamais. */
export const OPTIONS_DECISION: ReadonlyArray<{ cle: 'accorder' | 'refuser'; libelle: string; recommandee: boolean }> = Object.freeze([
  Object.freeze({ cle: 'accorder' as const, libelle: 'Accorder : publier cette version exacte', recommandee: false }),
  Object.freeze({ cle: 'refuser' as const, libelle: 'Refuser : ne rien publier', recommandee: true }),
])

const MAX_EXTRAIT = 300

// ── petites mains ────────────────────────────────────────────────────────────────────────────────────────────────
const estTexte = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const refus = (motif: string) => ({ ok: false as const, motif })

/** L'empreinte de la version exacte (texte et média) : 16 hexadécimaux, lisibles dans la clé de la décision. */
export function empreinteVersion(version: string): string {
  return createHash('sha256').update(String(version), 'utf8').digest('hex').slice(0, 16)
}

/** La clé de la décision : un post, une version. Elle sert de `cle` au bus (idempotence) et de cible de l'accord. */
export function cleAccord(postId: string, version: string): string {
  return `contenu:post:${postId}:${empreinteVersion(version)}`
}

/** Le média fait partie de la version : son empreinte (calculée par l'appelant sur le fichier) s'ajoute au texte. */
export function versionAvecMedia(post: Parameters<typeof versionTexte>[0], empreinteMedia?: string | null): string {
  const texte = versionTexte(post)
  return estTexte(empreinteMedia) ? `${texte}\n---media:${empreinteMedia}` : texte
}

// ── la demande d'accord ──────────────────────────────────────────────────────────────────────────────────────────
export type CorpsDecision = {
  question: string
  contexte: string
  options: Array<{ cle: string; libelle: string; recommandee: boolean }>
  defaut: typeof DEFAUT
  portee: typeof PORTEE
  cle: string
  echeance: string
}

export type PostAccord = Pick<Post, 'id' | 'ligne' | 'canal' | 'texte' | 'legende' | 'sous_titres' | 'miniature_texte' | 'description' | 'source'> & {
  /** Empreinte du fichier média (calculée par l'appelant) : un média retouché rouvre l'accord. */
  empreinteMedia?: string | null
  /** Lien du film, montré à Benj pour qu'il voie ce qu'il accorde. */
  lienFilm?: string | null
}

/** La carte de décision à déposer, si (et seulement si) les chiffres et promesses passent Laya : sinon rien n'est proposé
 *  et le cas revient à Benj avec son motif. `echeance` vient de l'appelant (jamais inventée ici) et doit être future. */
export async function preparerDemandeAccord(
  post: PostAccord,
  echeance: string,
  deps: DepsLecteur = {},
): Promise<{ ok: true; corps: CorpsDecision; version: string; preuves: Array<{ texte: string; p: number }> } | { ok: false; motif: string }> {
  try {
    if (!post || typeof post !== 'object' || !estTexte(post.id) || !estTexte(post.canal) || !estTexte(post.texte)) return refus('post incomplet : aucune demande déposée')
    const t = Date.parse(echeance)
    const maintenant = (deps.maintenant ?? Date.now)()
    if (!Number.isFinite(t) || t <= maintenant) return refus("échéance absente, illisible ou passée : aucune demande déposée")
    const preuves: Array<{ texte: string; p: number }> = []
    for (const texte of textesVisibles(post)) {
      if (!porteUneAffirmationChiffree(texte)) continue
      if (!estTexte(post.source)) return refus('affirmation chiffrée sans source : renvoyée à Benj, aucune demande déposée')
      const r = await vraisemblance(texte, {}, deps)
      if (r === null) return refus('Laya indisponible (jev absent ou en panne) : bloqué, renvoyé à Benj')
      if (r.bloque || !Number.isFinite(r.p) || r.p < SEUIL_LAYA) return refus(`score de vérité insuffisant (p=${r.p} < ${SEUIL_LAYA}) : renvoyé à Benj`)
      preuves.push({ texte, p: r.p })
    }
    const version = versionAvecMedia(post, post.empreinteMedia)
    const extrait = textesVisibles(post).join(' / ').replace(/\s+/g, ' ').slice(0, MAX_EXTRAIT)
    return {
      ok: true,
      version,
      preuves,
      corps: {
        question: `Publier ce post sur ${post.canal} ? (${post.id})`.slice(0, 200),
        contexte: `Ligne ${post.ligne}. Texte exact : « ${extrait} ». ${post.lienFilm ? `Film : ${post.lienFilm}. ` : ''}Tout changement du texte ou du média rouvre cette demande. Sans réponse à l'échéance : refus.`,
        options: OPTIONS_DECISION.map((o) => ({ ...o })),
        defaut: DEFAUT,
        portee: PORTEE,
        cle: cleAccord(post.id, version),
        echeance,
      },
    }
  } catch (e) {
    return refus(`erreur de préparation, rien n'est déposé : ${String((e as Error)?.message || e).slice(0, 160)}`)
  }
}

// ── le verdict de l'accord ───────────────────────────────────────────────────────────────────────────────────────
/** L'accord, tel que le bus le rend une fois lu, autorise-t-il CE post sur CETTE version ? Fermé : tout ce qui manque
 *  ou lève une exception REFUSE. `statut` doit être `tranchee` (donc signé par un fondateur) : `defaut_applique`,
 *  `ouverte` ou `expiree` ne publient jamais. Une portée renseignée doit être `securite`. */
export function verdictAccord(decision: DecisionAccord, postId: string, version: string, maintenantMs: number = Date.now()): { ok: true } | { ok: false; motif: string } {
  try {
    if (!decision || typeof decision !== 'object') return refus('accord individuel de Benj absent : aucune publication sans lui')
    // La portée : comme dans lignes.ts, absente elle n'ouvre rien à elle seule (la base la pose toujours à `securite`) ;
    // renseignée et différente de `securite`, `accordValide` refuse.
    const base = accordValide(decision, postId, version, maintenantMs)
    if (!base.ok) return base
    // La clé de la décision porte l'empreinte de la version : elle doit être celle de la version présentée.
    const cible = String(decision.cible)
    if (cible.startsWith('contenu:post:') && cible !== cleAccord(postId, version)) return refus("l'accord porte sur une autre version du texte ou du média : il est caduc")
    return { ok: true }
  } catch (e) {
    return refus(`erreur du contrôle, par prudence rien ne part : ${String((e as Error)?.message || e).slice(0, 160)}`)
  }
}

/** L'accord tient-il encore pour cette version ? Faux dès que le texte (ou le média) a bougé, ou que la décision n'est
 *  pas un « accorder » tranché. Ne dit rien de la cible : c'est `verdictAccord` qui la vérifie. */
export function accordEncoreValable(decision: DecisionAccord, version: string): boolean {
  if (!decision || typeof decision !== 'object') return false
  if (decision.statut !== 'tranchee' || decision.choix !== 'accorder') return false
  if (typeof decision.texte_version !== 'string' || decision.texte_version !== version) return false
  const cible = typeof decision.cible === 'string' ? decision.cible : ''
  const m = cible.match(/^contenu:post:(.+):[0-9a-f]{16}$/)
  if (m && cible !== cleAccord(m[1], version)) return false
  return true
}
