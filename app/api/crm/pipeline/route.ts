import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chargerDossiers, erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase } from '@/lib/crm/serveur'
import { cartes } from '@/lib/crm/pipeline'
import { lireCorps, validerDeplacement } from '@/lib/crm/valider'

export const runtime = 'nodejs'

// POST /api/crm/pipeline { objet: 'devis'|'lead'|'chantier', id, vers, note? } — le déplacement MANUEL d'un dossier.
//
// Il ne change AUCUN vrai statut (ni devis, ni facture, ni demande) : il est écrit au journal (crm_journal, champ 'etape')
// avec la colonne que les vrais statuts donnaient à cet instant, et ne vaut que tant qu'ils n'ont pas bougé
// (lib/crm/pipeline.ts, deplacementEnVigueur). Le dossier doit appartenir à la session : il est cherché parmi SES cartes.
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerDeplacement(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)

  const d = await chargerDossiers(g.uid)
  if (!d.ok) { console.error('[crm/pipeline] lecture :', d.erreur.message); return erreur(INDISPONIBLE, 503) }
  const carte = cartes({ artisanId: g.uid, leads: d.leads, devis: d.devis, factures: d.factures, chantiers: d.chantiers, deplacements: d.deplacements })
    .find((c) => c.objet === v.valeur.objet && c.id === v.valeur.id)
  if (!carte) return erreur('Dossier introuvable.', 404)
  if (carte.etapeDerivee === 'classe') return erreur('Ce dossier est classé (devis refusé ou demande perdue) : il ne se déplace pas.', 409)
  if (carte.etape === v.valeur.vers) return json({ ok: true, inchange: true, etape: carte.etape })

  const { error } = await supabaseAdmin.from('crm_journal').insert({
    artisan_id: g.uid, objet: carte.objet, objet_id: carte.id, chantier_id: carte.chantierId, champ: 'etape',
    de: carte.etape, vers: v.valeur.vers, etape_derivee: carte.etapeDerivee, origine: 'artisan', note: v.valeur.note,
  })
  if (error) { const s = statutErreurBase(error); console.error('[crm/pipeline] journal :', error.message); return erreur(s.message, s.status) }
  return json({ ok: true, etape: v.valeur.vers, etapeDerivee: carte.etapeDerivee, manuel: v.valeur.vers !== carte.etapeDerivee })
}
