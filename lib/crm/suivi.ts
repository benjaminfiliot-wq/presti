// CRM — la page de SUIVI d'un chantier pour le client (plan du 18/10, n°8, version 3). Module pur : ce que la page publique
// /suivi/<jeton> a le droit de montrer, et RIEN d'autre. Le jeton vit dans chantier_suivi (empreinte seulement, migration 0167).
//
// Montré : le nom de l'entreprise (marque blanche), le titre du chantier, son état, ses dates, l'avancement global et pièce par
// pièce (à faire, en cours, fini). JAMAIS : un prix, une adresse, le nom du client, le nom d'un compagnon, un libellé de tâche
// (qui peut citer une marque, un prix, un défaut), une note, une photo (à trancher par la conformité : visages, intérieurs).
import { LIBELLES_ETAT_PIECE, planChantier, type EtatPiece, type TachePlan } from './plan.ts'
import { JOURS_SUIVI_APRES_FIN } from '../legalArtisan.ts'

export const LIBELLES_STATUT_SUIVI: Record<string, string> = {
  a_planifier: 'Bientôt planifié', planifie: 'Planifié', en_cours: 'En cours', en_pause: 'En pause', termine: 'Terminé', annule: 'Annulé',
}

export type VueSuivi = {
  entreprise: string
  titre: string
  statut: string
  debut: string | null
  finPrevue: string | null
  finReelle: string | null
  avancement: number | null
  pieces: { nom: string; pct: number; etat: EtatPiece; libelle: string }[]
  majLe: string | null
}

export function vueSuivi(p: {
  entreprise: string | null
  chantier: { titre: string | null; statut: string; date_debut: string | null; date_fin_prevue: string | null; date_fin_reelle: string | null; maj_le?: string | null }
  taches: readonly (TachePlan & { faite_le?: string | null })[]
}): VueSuivi {
  const pieces = planChantier({ titre: p.chantier.titre, taches: p.taches, membres: [] })
  const total = p.taches.length, faites = p.taches.filter((t) => t.faite).length
  const derniere = [p.chantier.maj_le ?? null, ...p.taches.map((t) => t.faite_le ?? null)].filter((x): x is string => !!x).sort().pop() ?? null
  return {
    entreprise: p.entreprise?.trim() || 'Votre artisan',
    titre: p.chantier.titre?.trim() || 'Votre chantier',
    statut: LIBELLES_STATUT_SUIVI[p.chantier.statut] ?? 'En cours',
    debut: p.chantier.date_debut, finPrevue: p.chantier.date_fin_prevue, finReelle: p.chantier.statut === 'termine' ? p.chantier.date_fin_reelle : null,
    avancement: total ? Math.round((faites / total) * 100) : null,
    pieces: pieces.map((x) => ({ nom: x.nom, pct: x.pct, etat: x.etat, libelle: LIBELLES_ETAT_PIECE[x.etat] })),
    majLe: derniere,
  }
}

/** Les clés autorisées dans la vue publique (le juge vérifie qu'aucune autre n'apparaît). */
export const CLES_SUIVI = ['entreprise', 'titre', 'statut', 'debut', 'finPrevue', 'finReelle', 'avancement', 'pieces', 'majLe'] as const
export const RE_JETON_SUIVI = /^[A-Za-z0-9_-]{43}$/

/**
 * Le lien de suivi a-t-il expiré ? JOURS_SUIVI_APRES_FIN jours (90) après la FIN RÉELLE du chantier (audit RGPD du 20/10 : un lien
 * secret ne reste pas ouvert pour toujours). Calculé à la LECTURE, depuis chantiers.date_fin_reelle — aucune colonne, aucune
 * migration. Le dernier jour valable est le 89e après la date de fin ; dès minuit UTC du 90e, le lien répond 404 comme un jeton
 * inconnu. Un chantier sans fin réelle (encore ouvert, ou rouvert : la route des chantiers efface alors la date) n'expire pas.
 */
export function suiviExpire(dateFinReelle: string | null | undefined, maintenant: Date = new Date(), jours: number = JOURS_SUIVI_APRES_FIN): boolean {
  if (!dateFinReelle || !/^\d{4}-\d{2}-\d{2}/.test(dateFinReelle)) return false
  const fin = Date.parse(`${dateFinReelle.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(fin)) return false
  return maintenant.getTime() >= fin + jours * 86400000
}

// ─── La page HTML (autonome : aucun script, aucune ressource extérieure, styles en ligne ; CSP « default-src 'none' ») ──────
const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const dateLisible = (j: string | null) => (j && /^\d{4}-\d{2}-\d{2}/.test(j) ? j.slice(0, 10).split('-').reverse().join('/') : null)
const COULEUR_ETAT: Record<EtatPiece, string> = { a_faire: '#B9B2A6', en_cours: '#C9A27E', fini: '#5E9E7E' }

export function pageSuivi(v: VueSuivi): string {
  const dates = [v.debut ? `Début : ${dateLisible(v.debut)}` : null, v.finReelle ? `Terminé le ${dateLisible(v.finReelle)}` : v.finPrevue ? `Fin prévue : ${dateLisible(v.finPrevue)}` : null].filter(Boolean).join(' · ')
  const pieces = v.pieces.map((p) => `<li><span class="n">${echapper(p.nom)}</span><span class="b" aria-hidden="true"><i style="width:${p.pct}%;background:${COULEUR_ETAT[p.etat]}"></i></span><span class="e">${echapper(p.libelle)} · ${p.pct} %</span></li>`).join('')
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Suivi de chantier — ${echapper(v.entreprise)}</title>
<style>
:root{color-scheme:light dark;--fond:#F7F4EE;--carte:#FFFFFF;--encre:#1D1B18;--doux:#6B655C;--ligne:#E6E0D6}
@media (prefers-color-scheme:dark){:root{--fond:#141311;--carte:#1E1C19;--encre:#F3EFE8;--doux:#A8A196;--ligne:#34302B}}
*{box-sizing:border-box}body{margin:0;background:var(--fond);color:var(--encre);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:640px;margin:0 auto;padding:28px 16px 40px}.ent{color:var(--doux);font-size:14px;margin:0 0 4px}h1{font-size:24px;margin:0 0 6px;line-height:1.25}
.statut{display:inline-block;font-size:13px;font-weight:600;padding:3px 10px;border-radius:999px;border:1px solid var(--ligne);background:var(--carte)}.dates{color:var(--doux);font-size:14px;margin:8px 0 0}
.carte{background:var(--carte);border:1px solid var(--ligne);border-radius:14px;padding:18px;margin-top:18px}.tot{display:flex;align-items:baseline;gap:10px}.tot b{font-size:34px}
.b{display:block;height:8px;border-radius:8px;background:var(--ligne);overflow:hidden}.b i{display:block;height:100%}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}li{display:grid;grid-template-columns:1fr;gap:4px}.n{font-weight:600}.e{color:var(--doux);font-size:13px}
.pied{color:var(--doux);font-size:12.5px;margin-top:18px}
</style></head><body><main>
<p class="ent">${echapper(v.entreprise)}</p>
<h1>${echapper(v.titre)}</h1>
<span class="statut">${echapper(v.statut)}</span>${dates ? `<p class="dates">${echapper(dates)}</p>` : ''}
<section class="carte"><div class="tot"><b>${v.avancement === null ? '—' : `${v.avancement} %`}</b><span>réalisé</span></div>${v.avancement === null ? '' : `<span class="b" aria-hidden="true"><i style="width:${v.avancement}%;background:#5E9E7E"></i></span>`}</section>
${pieces ? `<section class="carte"><h2 style="font-size:16px;margin:0 0 12px">Pièce par pièce</h2><ul>${pieces}</ul></section>` : ''}
<p class="pied">${v.majLe ? `Mis à jour le ${echapper(dateLisible(v.majLe) ?? '')}. ` : ''}Cette page suit l’avancement de vos travaux ; pour toute question, contactez directement ${echapper(v.entreprise)}.</p>
</main></body></html>`
}
