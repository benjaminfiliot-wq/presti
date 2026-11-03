// Les cartes des agents n8n, côté app (tâche 036-030) : ce que la boîte « À valider » montre, et ce qu'un clic change.
//
// Une carte d'agent est une ligne de `assistant_actions` (0157) d'origine « agent » (0194), écrite par le Cerveau de n8n en palier
// « ombre » (lib/agents/n8n/cerveau-reel.mjs, CODE_CARTES). L'app ne fait que la MONTRER et NOTER la décision de l'artisan :
//   • valider : en_attente → en_cours (« validée ») ; rien n'est envoyé par l'app, sur aucune offre (n8n exécutera au réel, plus tard,
//     par lib-executer ; tant que le réel n'est pas branché, une carte validée reste « validée, rien n'est parti ») ;
//   • refuser : en_attente → refusee ; rien n'est fait.
// Règle d'affichage : une carte sans motif, sans département ou sans la source de chaque fait n'est JAMAIS montrée (anti-fabrication :
// « citer la source ou omettre »). Module sans import (le juge le charge tel quel).

export const DEPARTEMENTS = ['accueil', 'devis', 'suivi', 'facturation', 'apres', 'operations', 'direction'] as const
export type Departement = (typeof DEPARTEMENTS)[number]

export const NOMS_DEPARTEMENTS: Record<Departement, string> = {
  accueil: 'Accueil', devis: 'Devis', suivi: 'Suivi', facturation: 'Facturation', apres: 'Après-chantier', operations: 'Opérations', direction: 'Direction',
}

/** Les colonnes lues par la route (jamais `select('*')`). */
export const COLONNES_CARTE = 'id, artisan_id, outil, statut, titre, apercu, objet_type, objet_id, resultat_resume, cree_le, maj_le, expire_le, origine, departement, motif, sources, cle'

export type LigneCarteAgent = {
  id: string; artisan_id: string; outil: string; statut: string; titre: string; apercu: unknown; objet_type: string | null; objet_id: string | null
  resultat_resume: string | null; cree_le: string; maj_le: string; expire_le: string | null
  origine: string | null; departement: string | null; motif: string | null; sources: unknown; cle: string | null
}

export type SourceFait = { fait: string; source: string }
export type StatutCarte = 'a_valider' | 'validee' | 'faite' | 'refusee' | 'expiree' | 'echec'

export type CarteAgent = {
  id: string; titre: string; departement: Departement; nomDepartement: string; motif: string; sources: SourceFait[]
  statut: StatutCarte; fait: string | null; proposition: { objet: string | null; texte: string | null } | null; canal: string | null
  piloteEnReel: boolean; creeLe: string; expireLe: string | null; objet: { type: string; id: string } | null
}

const texte = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/** Les sources d'une carte, ou null si une seule manque ou est mal formée (la carte n'est alors pas montrée). */
export function sourcesDe(v: unknown): SourceFait[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 40) return null
  const s: SourceFait[] = []
  for (const x of v) {
    const fait = texte((x as { fait?: unknown })?.fait, 60)
    const source = texte((x as { source?: unknown })?.source, 200)
    if (!fait || !source) return null
    s.push({ fait, source })
  }
  return s
}

export function statutDe(statut: string, expireLe: string | null, maintenant: number = Date.now()): StatutCarte {
  if (statut === 'en_attente') return expireLe && Date.parse(expireLe) <= maintenant ? 'expiree' : 'a_valider'
  if (statut === 'en_cours') return 'validee'
  if (statut === 'executee') return 'faite'
  if (statut === 'refusee' || statut === 'annulee') return 'refusee'
  if (statut === 'expiree') return 'expiree'
  return 'echec'
}

/** Une ligne de la base → la carte à montrer, ou null (pas une carte d'agent, ou sans motif, département ou sources). */
export function versCarteAgent(l: LigneCarteAgent, maintenant: number = Date.now()): CarteAgent | null {
  if (!l || l.origine !== 'agent') return null
  const dep = (DEPARTEMENTS as readonly string[]).includes(String(l.departement)) ? (l.departement as Departement) : null
  const motif = texte(l.motif, 300)
  const sources = sourcesDe(l.sources)
  const titre = texte(l.titre, 200)
  if (!dep || !motif || !sources || !titre) return null
  const ap = (l.apercu && typeof l.apercu === 'object' ? l.apercu : {}) as { brouillon?: { objet?: unknown; texte?: unknown } | null; canal?: unknown; pilote_en_reel?: unknown }
  const b = ap.brouillon && typeof ap.brouillon === 'object' ? ap.brouillon : null
  const statut = statutDe(l.statut, l.expire_le, maintenant)
  return {
    id: l.id, titre, departement: dep, nomDepartement: NOMS_DEPARTEMENTS[dep], motif, sources, statut,
    fait: statut === 'faite' ? texte(l.resultat_resume, 300) ?? 'action faite' : null,
    proposition: b ? { objet: texte(b.objet, 120), texte: texte(b.texte, 1700) } : null,
    canal: texte(ap.canal, 30), piloteEnReel: ap.pilote_en_reel === true,
    creeLe: l.cree_le, expireLe: l.expire_le,
    objet: l.objet_type && l.objet_id ? { type: l.objet_type, id: l.objet_id } : null,
  }
}

/** Les deux décisions de l'artisan, et le statut qu'elles posent. Aucune n'envoie quoi que ce soit. */
export const DECISIONS = { valider: 'en_cours', refuser: 'refusee' } as const
export type Decision = keyof typeof DECISIONS
export const estDecision = (v: unknown): v is Decision => v === 'valider' || v === 'refuser'

/** Le libellé du statut, tel que la boîte l'affiche. */
export function libelleStatut(c: Pick<CarteAgent, 'statut' | 'fait'>): string {
  switch (c.statut) {
    case 'a_valider': return 'À valider'
    case 'validee': return 'Validée — rien n’est parti tant que le mode réel n’est pas ouvert'
    case 'faite': return 'Fait : ' + (c.fait ?? 'action faite')
    case 'refusee': return 'Refusée'
    case 'expiree': return 'Expirée sans décision'
    default: return 'Non aboutie'
  }
}
