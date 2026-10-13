// L'assistant de gestion de la console — le JOURNAL (plans/016-assistant.md §5).
//
// Module pur : la ligne qu'on écrit pour chaque appel d'outil. Qui (le compte de la session), quel outil, des entrées
// RÉSUMÉES, le résultat (ok, refus, erreur) et une phrase courte, plus l'objet préparé quand il y en a un (devis,
// conversation). L'écriture en base vit dans lib/assistant/executeurs.ts ; la table et sa RLS dans 0150_assistant.sql.
//
// RGPD (audit du 12/10) : le journal ne garde AUCUN texte libre. Une entrée ne garde que des nombres, des booléens, des
// UUID et des valeurs fermées (statuts, périodes : VALEURS_FERMEES) ; un nom de client cherché ou un mot de recherche
// devient « (texte non conservé) ». Le résumé ne nomme personne : seul l'IDENTIFIANT de l'objet est écrit, et l'écran
// /assistant retrouve le nom à l'affichage, sous la RLS (supprimé chez lui, il disparaît aussi du journal).
import { VALEURS_FERMEES, type NomOutil } from './outils'

export type ResultatJournal = 'ok' | 'refus' | 'erreur'
export type ObjetJournal = { type: 'devis' | 'conversation'; id: string } | null

export type LigneJournal = {
  artisan_id: string
  conversation_id: string
  tour: number
  outil: string
  entrees: Record<string, string | number | boolean | null>
  resultat: ResultatJournal
  resume: string
  objet_type: 'devis' | 'conversation' | null
  objet_id: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const RESUME_MAX = 300
export const TEXTE_NON_CONSERVE = '(texte non conservé)'

/** Une entrée réduite à des valeurs simples, sans texte libre : ce qui sert à comprendre l'appel, pas à le rejouer. */
export function resumerEntrees(entree: unknown): LigneJournal['entrees'] {
  const out: LigneJournal['entrees'] = {}
  if (!entree || typeof entree !== 'object' || Array.isArray(entree)) return out
  for (const [cle, v] of Object.entries(entree as Record<string, unknown>).slice(0, 8)) {
    const k = cle.replace(/[^a-z0-9_]/gi, '').slice(0, 40)
    if (!k) continue
    if (v === null || typeof v === 'boolean') out[k] = v
    else if (typeof v === 'number') out[k] = Number.isFinite(v) ? v : null
    else if (typeof v === 'string') {
      const t = v.trim()
      out[k] = UUID.test(t) ? t.toLowerCase() : VALEURS_FERMEES.has(t) ? t : t ? TEXTE_NON_CONSERVE : ''
    } else out[k] = '(valeur non simple)'
  }
  return out
}

/** La ligne de journal d'un appel. `nom` peut être un nom d'outil inconnu (le modèle s'est trompé) : il est gardé, borné. */
export function ligneJournal(p: {
  artisanId: string; conversationId: string; tour: number
  nom: NomOutil | string; entree: unknown; resultat: ResultatJournal; resume: string; objet?: ObjetJournal
}): LigneJournal {
  const objet = p.objet && UUID.test(p.objet.id) ? p.objet : null
  return {
    artisan_id: p.artisanId,
    conversation_id: p.conversationId,
    tour: Math.max(1, Math.trunc(p.tour) || 1),
    outil: String(p.nom ?? '').replace(/[^a-z0-9_]/gi, '').slice(0, 60) || 'inconnu',
    entrees: resumerEntrees(p.entree),
    resultat: p.resultat,
    resume: String(p.resume ?? '').replace(/\s+/g, ' ').trim().slice(0, RESUME_MAX) || '—',
    objet_type: objet?.type ?? null,
    objet_id: objet?.id ?? null,
  }
}
