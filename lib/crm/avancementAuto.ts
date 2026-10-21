// L'AVANCEMENT des chantiers mis à jour SANS ressaisie (décision B du fondateur, 21/10/2026). Module PUR (ni réseau ni base) :
// rejoué par scripts/avancement-qa.mjs. Deux moyens, en plus de l'assistant de gestion (outil `avancer_chantier`) :
//
//  1. La PHOTO « APRÈS » d'une pièce → PROPOSE de cocher les tâches de cette pièce (jamais coché d'office : l'artisan confirme d'un
//     clic dans « Photos et pièces »). Pourquoi : l'artisan prend déjà cette photo pour son dossier ; elle dit « cette pièce est
//     finie » mieux que toute saisie. Sûr : une proposition, une pièce reconnue dans la légende, seulement les tâches non faites.
//  2. Le LIEN DE POINTAGE d'un compagnon (table chantier_pointage, migration 0174, drapeau crmPointage) : une page mobile très simple,
//     sans compte, où il coche « fait » en fin de journée. Pourquoi : c'est lui qui sait ce qui est fini, et il n'a pas de compte
//     Presti. Sûr : jeton secret de 32 octets dont seule l'empreinte est gardée, révocable, il ne peut QUE cocher « fait » des
//     tâches de CE chantier (jamais décocher, renommer, supprimer, ni voir un prix, une adresse ou le nom du client).
// Écartés pour cette version : la facture d'acompte/situation (un pourcentage facturé ne dit pas QUELLES tâches sont faites —
// deviner serait de la fabrication) et la sortie de matériel (une sortie de stock précède le travail, elle ne le prouve pas).
import { pieceDe } from './plan'

export type TacheAuto = { id: string; libelle: string; faite: boolean | null; piece?: string | null }

const pieceDeTache = (t: TacheAuto): string | null => (typeof t.piece === 'string' && t.piece.trim()) || pieceDe(t.libelle)

/**
 * Les tâches qu'une photo « Après » propose de cocher : la pièce est lue dans la légende (« salle de bain refaite » → Salle de
 * bain) ; les tâches NON FAITES de cette pièce. Pas de pièce reconnue, ou photo d'un autre type : rien (on ne devine pas).
 */
export function tachesPourPhotoApres(p: { type: string; legende: string | null | undefined; taches: readonly TacheAuto[] }): { piece: string | null; taches: { id: string; libelle: string }[] } {
  if (p.type !== 'apres') return { piece: null, taches: [] }
  const piece = pieceDe(p.legende ?? '')
  if (!piece) return { piece: null, taches: [] }
  const taches = p.taches.filter((t) => !t.faite && pieceDeTache(t) === piece).map((t) => ({ id: t.id, libelle: t.libelle })).slice(0, 50)
  return { piece, taches }
}

// ── Le lien de pointage ───────────────────────────────────────────────────────────────────────────────────────────────────

export const RE_JETON_POINTAGE = /^[A-Za-z0-9_-]{43}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Tâches cochées au plus par envoi du formulaire. */
export const POINTAGE_MAX = 60

/**
 * Lit le formulaire de pointage (application/x-www-form-urlencoded : `fait=<uuid>` répété). Ne garde que des identifiants de
 * tâches NON FAITES de CE chantier (`permis`) : un identifiant inventé, d'un autre chantier ou d'un autre compte est ignoré.
 */
export function lireFormulairePointage(corps: string, permis: ReadonlySet<string>): string[] {
  const p = new URLSearchParams(corps.slice(0, 20_000))
  const ids = new Set<string>()
  for (const v of p.getAll('fait')) {
    const id = v.trim().toLowerCase()
    if (UUID.test(id) && permis.has(id)) ids.add(id)
    if (ids.size >= POINTAGE_MAX) break
  }
  return [...ids]
}

export type VuePointage = { entreprise: string; titre: string; restantes: { id: string; libelle: string; piece: string | null }[]; faites: number; total: number; message: string | null }

const LIBELLE_BATIMENT: Record<string, string> = { maison: 'Maison', appartement: 'Appartement', immeuble: 'Immeuble', hotel: 'Hôtel', restaurant: 'Restaurant', commerce: 'Commerce', bureaux: 'Bureaux', entrepot: 'Entrepôt', ecole: 'École', sante: 'Santé', equipement: 'Équipement', exterieur: 'Extérieur', agricole: 'Agricole' }

/**
 * Le nom NEUTRE du chantier sur la page de pointage (audit du 21/10, F4) : le titre saisi par l'artisan peut contenir le nom ou
 * l'adresse du client — le compagnon (ou quiconque a le lien) voit seulement « Chantier réf. 3F2A — Maison ».
 */
export function libelleNeutre(chantierId: string, typeBatiment: string | null | undefined): string {
  const ref = String(chantierId ?? '').replace(/[^0-9a-f]/gi, '').slice(0, 4).toUpperCase() || '—'
  const t = typeBatiment && LIBELLE_BATIMENT[typeBatiment] ? ` — ${LIBELLE_BATIMENT[typeBatiment]}` : ''
  return `Chantier réf. ${ref}${t}`
}

export function vuePointage(p: { entreprise: string | null; titre: string | null; taches: readonly TacheAuto[]; message?: string | null }): VuePointage {
  const restantes = p.taches.filter((t) => !t.faite).map((t) => ({ id: t.id, libelle: t.libelle.slice(0, 200), piece: pieceDeTache(t) }))
  restantes.sort((a, b) => (a.piece ?? '').localeCompare(b.piece ?? '', 'fr') || a.libelle.localeCompare(b.libelle, 'fr'))
  return { entreprise: (p.entreprise ?? '').trim() || 'Votre entreprise', titre: (p.titre ?? '').trim() || 'Chantier', restantes, faites: p.taches.length - restantes.length, total: p.taches.length, message: p.message ?? null }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** La page autonome (aucun script, aucune ressource extérieure ; formulaire POST vers elle-même). */
export function pagePointage(v: VuePointage): string {
  const pct = v.total ? Math.round((v.faites / v.total) * 100) : 0
  const lignes = v.restantes.map((t) => `<li><label><input type="checkbox" name="fait" value="${esc(t.id)}"><span>${esc(t.libelle)}${t.piece ? ` <small>${esc(t.piece)}</small>` : ''}</span></label></li>`).join('')
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Pointage — ${esc(v.titre)}</title>
<style>:root{color-scheme:light dark}body{margin:0;font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f5f2;color:#1c1b19}@media (prefers-color-scheme:dark){body{background:#151412;color:#eeeae3}li{background:#211f1c!important;border-color:#33302b!important}}main{max-width:560px;margin:0 auto;padding:20px 16px 40px}h1{font-size:1.3rem;margin:.2em 0}p{margin:.4em 0}.barre{height:10px;border-radius:6px;background:#0001;overflow:hidden;margin:10px 0 18px}.barre i{display:block;height:100%;background:#d97757;width:${pct}%}ul{list-style:none;padding:0;margin:0 0 18px}li{background:#fff;border:1px solid #e3ded5;border-radius:12px;margin:8px 0}label{display:flex;gap:12px;align-items:flex-start;padding:14px;cursor:pointer;min-height:44px}input{width:24px;height:24px;flex:none;margin:0}small{display:block;opacity:.7}button{width:100%;font:inherit;font-weight:600;padding:14px;border:0;border-radius:12px;background:#d97757;color:#fff;min-height:48px}.ok{padding:10px 12px;border-radius:10px;background:#2e7d3220}</style></head>
<body><main><p>${esc(v.entreprise)}</p><h1>${esc(v.titre)}</h1>
<p>${v.faites} tâche${v.faites > 1 ? 's' : ''} faite${v.faites > 1 ? 's' : ''} sur ${v.total}</p><div class="barre" role="img" aria-label="Avancement ${pct} %"><i></i></div>
${v.message ? `<p class="ok" role="status">${esc(v.message)}</p>` : ''}
${v.restantes.length ? `<form method="post"><p>Cochez ce qui est <strong>fini</strong> aujourd’hui :</p><ul>${lignes}</ul><button type="submit">Enregistrer</button></form>` : '<p>Tout est fait sur ce chantier. Merci !</p>'}
</main></body></html>`
}
