import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chantierDe, COLONNES, erreur, gardeCrm, INDISPONIBLE, json, statutErreurBase, nonPermise } from '@/lib/crm/serveur'
import type { RappelLigne } from '@/lib/crm/rappels'
import { estUuid, lireCorps, validerModificationChantier } from '@/lib/crm/valider'
import { construireFicheChantier, type DevisFiche, type EntreeJournal, type FactureFiche, type FicheChantier, type NoteCrm, type ReservationFiche, type TacheFiche } from '@/lib/crm/vue'
import { facturesComptees, jourParis } from '@/lib/comptaTableau'
import { deplacementEnVigueur, etapeChantierSeul, etapeDevis, type DeplacementP } from '@/lib/crm/pipeline'

export const runtime = 'nodejs'
type Ctx = { params: Promise<{ id: string }> }

// GET /api/crm/chantiers/[id] — la fiche chantier complète. Tout est lu pour la session, chaque requête filtrée sur elle.
export async function GET(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Chantier introuvable.', 404)
  const { chantier: c, error } = await chantierDe(g.uid, id)
  if (error) { const s = statutErreurBase(error); console.error('[crm/chantier] lecture :', error.message); return erreur(s.status === 503 ? s.message : INDISPONIBLE, 503) }
  if (!c) return erreur('Chantier introuvable.', 404)

  const [devisR, tachesR, equipeR, materiauxR, notesR, journalR, vehiculeR] = await Promise.all([
    c.devis_id
      ? supabaseAdmin.from('devis').select('id, numero, objet, statut, total_ttc, total_ht, acompte_pct, accepte_le, envoye_le, created_at, date_emission, client_nom, client_email, client_adresse, lead_id').eq('id', c.devis_id).eq('artisan_id', g.uid).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin.from('chantier_taches').select('id, libelle, quantite, unite, ordre, faite, faite_le, membre_id, devis_ligne_id').eq('chantier_id', id).eq('artisan_id', g.uid).order('ordre').order('cree_le'),
    supabaseAdmin.from('chantier_equipe').select('membre_id, membre:equipe_membres(id, nom, role, actif)').eq('chantier_id', id).eq('artisan_id', g.uid),
    supabaseAdmin.from('chantier_materiaux').select('id, materiau_id, quantite, lieu, statut, sorti_le, note, materiau:materiaux(id, nom, unite, prix_vu_ht)').eq('chantier_id', id).eq('artisan_id', g.uid).order('cree_le'),
    supabaseAdmin.from('crm_notes').select('id, texte, cree_le, maj_le').eq('chantier_id', id).eq('artisan_id', g.uid).order('cree_le', { ascending: false }).limit(200),
    supabaseAdmin.from('crm_journal').select('id, objet, champ, de, vers, origine, etape_derivee, note, cree_le').eq('chantier_id', id).eq('artisan_id', g.uid).order('cree_le', { ascending: false }).limit(200),
    c.vehicule_id
      ? supabaseAdmin.from('vehicules').select('id, nom, immatriculation, controle_technique_le, entretien_le').eq('id', c.vehicule_id).eq('artisan_id', g.uid).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  const enErreur = [devisR, tachesR, equipeR, materiauxR, notesR, journalR, vehiculeR].find((r) => r.error)
  if (enErreur?.error) { console.error('[crm/chantier] fiche :', enErreur.error.message); return erreur(INDISPONIBLE, 503) }

  const devis = devisR.data as DevisFiche | null
  const [facturesR, leadR, deplacementsR] = await Promise.all([
    devis ? supabaseAdmin.from('factures').select('id, artisan_id, devis_id, numero, objet, statut, total_ttc, avoir_de, date_emission, acompte_pct').eq('devis_id', devis.id).eq('artisan_id', g.uid).order('date_emission') : Promise.resolve({ data: [], error: null }),
    devis?.lead_id ? supabaseAdmin.from('leads').select('id, statut, created_at').eq('id', devis.lead_id).eq('artisan_id', g.uid).maybeSingle() : Promise.resolve({ data: null, error: null }),
    // Les déplacements manuels du dossier dans le pipeline (sa carte est celle du devis, ou du chantier s'il n'a pas de devis).
    supabaseAdmin.from('crm_journal').select('objet, objet_id, vers, etape_derivee, cree_le').eq('artisan_id', g.uid).eq('champ', 'etape').eq('objet', devis ? 'devis' : 'chantier').eq('objet_id', devis ? devis.id : id).order('cree_le', { ascending: false }).limit(20),
  ])
  if (facturesR.error || leadR.error || deplacementsR.error) { console.error('[crm/chantier] factures :', (facturesR.error ?? leadR.error ?? deplacementsR.error)?.message); return erreur(INDISPONIBLE, 503) }
  const factures = (facturesR.data ?? []) as FactureFiche[]
  const lead = leadR.data as { id: string; statut: string | null; created_at: string | null } | null
  const leadStatut = lead?.statut ?? null
  // La colonne que donnent les vrais statuts, puis le déplacement manuel encore en vigueur (lib/crm/pipeline.ts) : la frise le signale.
  const derivee = devis ? etapeDevis({ ...devis, artisan_id: g.uid }, lead, facturesComptees(factures.map((f) => ({ ...f, artisan_id: g.uid }))), c).etape : etapeChantierSeul(c).etape
  const manuel = derivee === 'classe' ? null : deplacementEnVigueur(devis ? 'devis' : 'chantier', devis ? devis.id : id, derivee, (deplacementsR.data ?? []) as DeplacementP[])

  // Les rappels du chantier, de son devis et de sa demande (0162). Table absente : la fiche le dit, elle ne tombe pas.
  const cibles = [`chantier_id.eq.${id}`, devis ? `devis_id.eq.${devis.id}` : '', devis?.lead_id ? `lead_id.eq.${devis.lead_id}` : ''].filter(Boolean).join(',')
  const rappelsR = await supabaseAdmin.from('crm_rappels').select(COLONNES.rappels).eq('artisan_id', g.uid).or(cibles).order('echeance').limit(200)
  const rappelsAbsents = !!rappelsR.error && ['42P01', 'PGRST205'].includes(String(rappelsR.error.code))
  if (rappelsR.error && !rappelsAbsents) { console.error('[crm/chantier] rappels :', rappelsR.error.message); return erreur(INDISPONIBLE, 503) }

  // L'assemblage est celui de lib/crm/vue.ts (le même que la fiche de l'atelier d'exemple).
  return json(construireFicheChantier({
    rappels: (rappelsR.data ?? []) as unknown as RappelLigne[], rappelsDisponibles: !rappelsAbsents,
    uid: g.uid, chantier: c as FicheChantier['chantier'], devis, factures, leadStatut, lead, manuel: manuel && manuel !== derivee ? manuel : null,
    taches: (tachesR.data ?? []) as TacheFiche[],
    equipe: (equipeR.data ?? []).map((e) => e.membre as unknown as { id: string; nom: string; role: string } | null).filter((m): m is { id: string; nom: string; role: string } => !!m),
    vehicule: vehiculeR.data as FicheChantier['vehicule'],
    materiaux: (materiauxR.data ?? []) as unknown as ReservationFiche[],
    notes: (notesR.data ?? []) as NoteCrm[],
    journal: (journalR.data ?? []) as EntreeJournal[],
    maintenant: new Date(),
  }))
}

// PATCH /api/crm/chantiers/[id] — modifier la fiche (statut, dates, adresse, camionnette, équipe…). Le devis ne change pas.
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Chantier introuvable.', 404)
  const corps = await lireCorps(req)
  if (!corps.ok) return erreur(corps.erreur, corps.statut ?? 400)
  const v = validerModificationChantier(corps.valeur)
  if (!v.ok) return erreur(v.erreur, 400)
  const { chantier: c, error: el } = await chantierDe(g.uid, id)
  if (el) { console.error('[crm/chantier] lecture :', el.message); return erreur(INDISPONIBLE, 503) }
  if (!c) return erreur('Chantier introuvable.', 404)
  const { equipe, ...champs } = v.valeur
  // Les dates se vérifient avec ce qui est déjà en base (on peut ne changer que la fin prévue).
  const debut = 'date_debut' in champs ? champs.date_debut : c.date_debut
  const finPrevue = 'date_fin_prevue' in champs ? champs.date_fin_prevue : c.date_fin_prevue
  if (debut && finPrevue && finPrevue < debut) return erreur('La fin prévue est avant le début.', 400)
  // Terminé : la fin réelle se pose seule si l'artisan ne l'a pas donnée ; rouvert : elle s'efface.
  if (champs.statut === 'termine' && !('date_fin_reelle' in champs) && !c.date_fin_reelle) champs.date_fin_reelle = jourParis(new Date())
  if (champs.statut && champs.statut !== 'termine' && c.statut === 'termine' && !('date_fin_reelle' in champs)) champs.date_fin_reelle = null
  if (champs.vehicule_id) {
    const { data: vh } = await supabaseAdmin.from('vehicules').select('id').eq('id', champs.vehicule_id).eq('artisan_id', g.uid).maybeSingle()
    if (!vh) return erreur('Véhicule introuvable.', 404)
  }
  if (equipe) {
    if (equipe.length) {
      const { data: ms, error: em } = await supabaseAdmin.from('equipe_membres').select('id').eq('artisan_id', g.uid).in('id', equipe)
      if (em) return erreur(INDISPONIBLE, 503)
      if ((ms ?? []).length !== equipe.length) return erreur('Membre de l’équipe introuvable.', 404)
    }
  }
  if (Object.keys(champs).length) {
    const { error } = await supabaseAdmin.from('chantiers').update({ ...champs, maj_le: new Date().toISOString() }).eq('id', id).eq('artisan_id', g.uid)
    if (error) { const s = statutErreurBase(error); console.error('[crm/chantier] modification :', error.message); return erreur(s.message, s.status) }
  }
  if (equipe) {
    // Ajouter d'abord, retirer ensuite : une panne entre les deux laisse au pire un membre de trop, jamais une équipe vide.
    if (equipe.length) {
      const { error } = await supabaseAdmin.from('chantier_equipe').upsert(equipe.map((membre_id) => ({ chantier_id: id, membre_id, artisan_id: g.uid })), { onConflict: 'chantier_id,membre_id', ignoreDuplicates: true })
      if (error) { const s = statutErreurBase(error); console.error('[crm/chantier] équipe :', error.message); return erreur(s.message, s.status) }
    }
    let retrait = supabaseAdmin.from('chantier_equipe').delete().eq('chantier_id', id).eq('artisan_id', g.uid)
    if (equipe.length) retrait = retrait.not('membre_id', 'in', `(${equipe.join(',')})`)
    const { error } = await retrait
    if (error) { console.error('[crm/chantier] équipe (retrait) :', error.message); return erreur('L’équipe n’a été que partiellement mise à jour. Rechargez la fiche.', 500) }
  }
  return json({ ok: true })
}

// DELETE /api/crm/chantiers/[id] — supprime le chantier, ses tâches, ses réservations (les matériaux DÉJÀ sortis restent
// sortis : le stock ne remonte pas) et son équipe. Son journal reste. Le devis n'est pas touché.
export async function DELETE(req: Request, ctx: Ctx) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  const { id } = await ctx.params
  if (!estUuid(id)) return erreur('Chantier introuvable.', 404)
  const { data, error } = await supabaseAdmin.from('chantiers').delete().eq('id', id).eq('artisan_id', g.uid).select('id')
  if (error) { const s = statutErreurBase(error); console.error('[crm/chantier] suppression :', error.message); return erreur(s.message, s.status) }
  if (!data?.length) return erreur('Chantier introuvable.', 404)
  return json({ ok: true })
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function POST(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PATCH, DELETE')
}
export async function PUT(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PATCH, DELETE')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req)
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, PATCH, DELETE')
}
