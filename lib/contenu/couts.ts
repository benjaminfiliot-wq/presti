// lib/contenu/couts.ts — C15 (fiche 026-218) : le relevé des jetons et des coûts par agent et par IA.
//
// Source unique : `ops.couts` (aucune colonne ajoutée, 026-043 y écrit déjà modèle, jetons d'entrée et de sortie pour Claude).
// Règles :
//  - un champ absent est INCONNU (`connu:false`, montant nul), jamais un zéro inventé ; un zéro ne s'affiche que s'il est lu ;
//  - un appel du score local Laya (`jev noul|score|decide --provider laya`) n'est ni un modèle génératif ni des jetons
//    facturés : il est compté À PART (`appelsLaya`), jamais dans la consommation ;
//  - le relevé freellmapi arrive avec le battement de l'usine : fournisseur `freellmapi`, coût 0 €, jetons quand l'API les expose ;
//  - un même battement rejoué ne compte qu'une fois (dédoublonnage par clé) ; un changement de modèle donne deux lignes ;
//  - consommation connue, quota disponible connu et données manquantes restent SÉPARÉS ; chaque total porte sa fraîcheur ;
//  - seuls modèle, moteur, montant et jetons sont lus dans `detail` : aucun texte de prospect ne passe dans une métrique.
// Fonctions pures, sans réseau, sans horloge cachée (l'heure est un paramètre). Les montants se somment en entiers de 1/10 000 €
// (comme numeric(10,4)) pour que les totaux soient exacts.

// ── une ligne, brute puis normalisée ─────────────────────────────────────────────────────────────────────────────
export type LigneCoutBrute = {
  agent: string
  moteur: string
  montant?: number | null
  modele?: string | null
  jetons_entree?: number | null
  jetons_sortie?: number | null
  /** Horodatage ISO de la ligne (ops.couts.le). */
  le?: string
  /** Clé d'unicité d'un battement (voir `cleBattement`) : deux lignes de même clé ne comptent qu'une fois. */
  cle?: string
}
export type LigneCout = LigneCoutBrute & { connu: boolean; jetons_connus: boolean }

const estNombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
const estTexteCourt = (v: unknown, max = 80): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max
/** 1/10 000 € : la précision de numeric(10,4). */
const versUnites = (eur: number) => Math.round(eur * 10_000)
const versEuros = (u: number) => u / 10_000

/** Un montant absent, négatif ou non fini reste `montant:null, connu:false` : jamais zéro. */
export function normaliserCout(brut: LigneCoutBrute): LigneCout {
  const montant = estNombre(brut?.montant) ? brut.montant : null
  const jetons_entree = estNombre(brut?.jetons_entree) ? brut.jetons_entree : null
  const jetons_sortie = estNombre(brut?.jetons_sortie) ? brut.jetons_sortie : null
  return { ...brut, montant, jetons_entree, jetons_sortie, connu: montant !== null, jetons_connus: jetons_entree !== null && jetons_sortie !== null }
}

/** Une ligne d'`ops.couts` telle que la base la rend (montant_eur peut arriver en texte). Seuls les champs sûrs du `detail` sont lus. */
export type LigneOps = { le?: string; agent: string; fournisseur: string; montant_eur?: number | string | null; detail?: unknown }

export function depuisLigneOps(l: LigneOps): LigneCoutBrute {
  const d = l?.detail && typeof l.detail === 'object' && !Array.isArray(l.detail) ? (l.detail as Record<string, unknown>) : {}
  const montant = typeof l?.montant_eur === 'string' ? (l.montant_eur.trim() === '' ? null : Number(l.montant_eur)) : (l?.montant_eur ?? null)
  const moteur = estTexteCourt(d.moteur, 40) ? d.moteur : l?.fournisseur
  return {
    agent: l?.agent, moteur, montant: estNombre(montant) ? montant : null,
    modele: estTexteCourt(d.modele) ? d.modele : null,
    jetons_entree: estNombre(d.jetons_entree) ? d.jetons_entree : null,
    jetons_sortie: estNombre(d.jetons_sortie) ? d.jetons_sortie : null,
    le: l?.le,
  }
}

const estLaya = (moteur: string) => String(moteur).toLowerCase() === 'laya'

/** Une même ligne rejouée (même clé, ou même agent/moteur/modèle/heure) ne compte qu'une fois. */
export function dedoublonner(lignes: LigneCoutBrute[]): LigneCoutBrute[] {
  const vues = new Set<string>()
  const sortie: LigneCoutBrute[] = []
  for (const l of lignes || []) {
    if (!l) continue
    const cle = l.cle ?? (l.le ? `${l.agent}|${l.moteur}|${l.modele ?? ''}|${l.le}` : null)
    if (cle !== null) { if (vues.has(cle)) continue; vues.add(cle) }
    sortie.push(l)
  }
  return sortie
}

/** La clé d'un battement : la période (heure ISO) fait l'unicité, pas le moment où on lit. */
export function cleBattement(agent: string, moteur: string, modele: string | null | undefined, periodeIso: string): string {
  return `${agent}|${moteur}|${modele ?? ''}|${periodeIso}`
}

// ── l'agrégation ─────────────────────────────────────────────────────────────────────────────────────────────────
export type Agrege = { agent: string; moteur: string; connuEur: number; inconnu: number; appelsLaya: number }

/** Par « agent:moteur » : consommation facturée connue, lignes au montant inconnu, appels Laya (comptés à part, jamais en euros). */
export function agregerParModele(lignes: LigneCoutBrute[]): Record<string, Agrege> {
  const unites: Record<string, number> = {}
  const par: Record<string, Agrege> = {}
  for (const brut of lignes || []) {
    if (!brut) continue
    const l = normaliserCout(brut)
    const cle = `${l.agent}:${l.moteur}`
    par[cle] ??= { agent: l.agent, moteur: l.moteur, connuEur: 0, inconnu: 0, appelsLaya: 0 }
    unites[cle] ??= 0
    if (estLaya(l.moteur)) par[cle].appelsLaya += 1
    else if (l.connu) unites[cle] += versUnites(l.montant as number)
    else par[cle].inconnu += 1
  }
  for (const cle of Object.keys(par)) par[cle].connuEur = versEuros(unites[cle])
  return par
}

export type AgregeModele = {
  agent: string; moteur: string; modele: string | null
  connuEur: number; inconnu: number; appelsLaya: number
  jetonsEntree: number; jetonsSortie: number
  /** Lignes dont les jetons ne sont pas (tous) connus : jamais comptées comme zéro. */
  jetonsInconnus: number
  derniere: string | null
}

/** Par agent ET par modèle (un changement de modèle donne deux lignes), avec jetons connus et inconnus séparés. */
export function agregerParAgentEtModele(lignes: LigneCoutBrute[]): AgregeModele[] {
  const unites = new Map<string, number>()
  const par = new Map<string, AgregeModele>()
  for (const brut of dedoublonner(lignes)) {
    const l = normaliserCout(brut)
    const cle = `${l.agent}:${l.moteur}:${l.modele ?? ''}`
    let a = par.get(cle)
    if (!a) { a = { agent: l.agent, moteur: l.moteur, modele: l.modele ?? null, connuEur: 0, inconnu: 0, appelsLaya: 0, jetonsEntree: 0, jetonsSortie: 0, jetonsInconnus: 0, derniere: null }; par.set(cle, a); unites.set(cle, 0) }
    if (estLaya(l.moteur)) a.appelsLaya += 1
    else {
      if (l.connu) unites.set(cle, (unites.get(cle) as number) + versUnites(l.montant as number))
      else a.inconnu += 1
      if (l.jetons_connus) { a.jetonsEntree += l.jetons_entree as number; a.jetonsSortie += l.jetons_sortie as number } else a.jetonsInconnus += 1
    }
    if (l.le && (a.derniere === null || Date.parse(l.le) > Date.parse(a.derniere))) a.derniere = l.le
  }
  for (const [cle, a] of par) a.connuEur = versEuros(unites.get(cle) as number)
  return [...par.values()].sort((x, y) => `${x.agent}:${x.moteur}:${x.modele ?? ''}`.localeCompare(`${y.agent}:${y.moteur}:${y.modele ?? ''}`))
}

// ── freellmapi : le relevé du battement ──────────────────────────────────────────────────────────────────────────
/**
 * Transforme la réponse d'usage de freellmapi en lignes de coût : fournisseur `freellmapi`, coût 0 € (modèles gratuits), avec le
 * détail des jetons quand l'API l'expose. Un champ absent reste inconnu (jamais zéro). La forme exacte de la réponse n'est pas
 * garantie : on accepte un tableau ou un objet portant `data`, `usage` ou `models`, et les noms usuels des compteurs.
 */
export function lignesDepuisUsageFreellmapi(reponse: unknown, o: { agent: string; periodeIso: string; le: string }): LigneCoutBrute[] {
  const r = reponse as Record<string, unknown> | unknown[] | null | undefined
  const liste: unknown[] = Array.isArray(r) ? r : Array.isArray((r as Record<string, unknown>)?.data) ? ((r as Record<string, unknown>).data as unknown[]) : Array.isArray((r as Record<string, unknown>)?.usage) ? ((r as Record<string, unknown>).usage as unknown[]) : Array.isArray((r as Record<string, unknown>)?.models) ? ((r as Record<string, unknown>).models as unknown[]) : []
  const premier = (e: Record<string, unknown>, noms: string[]): number | null => { for (const n of noms) if (estNombre(e[n])) return e[n] as number; return null }
  const sortie: LigneCoutBrute[] = []
  for (const brut of liste) {
    if (!brut || typeof brut !== 'object') continue
    const e = brut as Record<string, unknown>
    const modele = [e.model, e.modele, e.id].find((x) => estTexteCourt(x)) as string | undefined
    if (!modele) continue
    sortie.push({
      agent: o.agent, moteur: 'freellmapi', modele, montant: 0,
      jetons_entree: premier(e, ['input_tokens', 'prompt_tokens', 'jetons_entree']),
      jetons_sortie: premier(e, ['output_tokens', 'completion_tokens', 'jetons_sortie']),
      le: o.le, cle: cleBattement(o.agent, 'freellmapi', modele, o.periodeIso),
    })
  }
  return sortie
}

// ── fraîcheur, quota, manques ────────────────────────────────────────────────────────────────────────────────────
export type Fraicheur = { etat: 'frais' | 'perime' | 'inconnu'; le: string | null; ageMs: number | null }

/** Frais = lu depuis moins de `seuilMs` (défaut 6 h) ; périmé au-delà ; inconnu si aucune date lisible. */
export function etatFraicheur(leIso: string | null | undefined, maintenantMs: number, seuilMs = 6 * 3_600_000): Fraicheur {
  const t = Date.parse(String(leIso ?? ''))
  if (!Number.isFinite(t) || !Number.isFinite(maintenantMs)) return { etat: 'inconnu', le: null, ageMs: null }
  const age = Math.max(0, maintenantMs - t)
  return { etat: age <= seuilMs ? 'frais' : 'perime', le: new Date(t).toISOString(), ageMs: age }
}

export type Quota = { agent: string; moteur: string; modele?: string | null; restant?: number | null; unite?: string; le?: string | null }
export type Bilan = {
  /** Ce qui a été consommé et LU. */
  consommation: AgregeModele[]
  /** Ce que le fournisseur dit rester : séparé de la consommation, jamais additionné. */
  quotas: Array<Quota & { connu: boolean; fraicheur: Fraicheur }>
  /** Ce qui manque : lignes sans montant, jetons inconnus, quotas non exposés. */
  manquants: string[]
  fraicheur: Fraicheur
}

/** Le bilan affiché : consommation connue, quota connu, manques dits, fraîcheur du plus récent. Rien n'est inventé. */
export function bilan(lignes: LigneCoutBrute[], quotas: Quota[], maintenantMs: number, seuilMs?: number): Bilan {
  const consommation = agregerParAgentEtModele(lignes)
  const manquants: string[] = []
  for (const c of consommation) {
    const nom = `${c.agent} · ${c.moteur}${c.modele ? ` · ${c.modele}` : ''}`
    if (c.inconnu > 0) manquants.push(`${nom} : ${c.inconnu} ligne(s) sans montant`)
    if (c.jetonsInconnus > 0) manquants.push(`${nom} : ${c.jetonsInconnus} ligne(s) sans jetons`)
  }
  const q = (quotas || []).map((x) => {
    const connu = estNombre(x?.restant)
    if (!connu) manquants.push(`${x?.agent} · ${x?.moteur} : quota non exposé`)
    return { ...x, connu, fraicheur: etatFraicheur(x?.le, maintenantMs, seuilMs) }
  })
  const plusRecente = consommation.map((c) => c.derniere).filter((d): d is string => !!d).sort().pop() ?? null
  return { consommation, quotas: q, manquants, fraicheur: etatFraicheur(plusRecente, maintenantMs, seuilMs) }
}
