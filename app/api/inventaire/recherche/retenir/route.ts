import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authInventaire, estRefus } from '@/lib/inventaire/auth'
import { enregistrerObservation } from '@/lib/inventaire/observations'
import { messageVerrou, peut } from '@/lib/plans'
import { actif } from '@/lib/flags'
import { sceauValide, type ResultatRecherche } from '@/lib/recherche-fournisseurs'

// L'artisan RETIENT un résultat de l'assistant (§8 F3) — c'est ce clic, et lui seul, qui écrit.
//
// POST { action: 'inventaire' | 'liste_achat', resultat, materiau_id?, quantite? }
//   · inventaire   → observation `recherche_ia` (+ création de la fiche si `materiau_id` absent)
//   · liste_achat  → une ligne dans sa liste d'achat ouverte (créée si besoin)
//
// Le `sceau` du résultat prouve qu'il sort du moteur, pour CET artisan : un client ne peut
// pas se fabriquer une observation « vue par l'assistant » (même règle que /observations).

export const runtime = 'nodejs'
export const maxDuration = 30

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const texte = (v: unknown, max: number): string | null => { const s = String(v ?? '').trim().slice(0, max); return s || null }

function lireResultat(uid: string, r: unknown): ResultatRecherche | null {
  if (!r || typeof r !== 'object') return null
  const b = r as Record<string, unknown>
  const prix = Number(b.prix_vu)
  const ht = String(b.ht_ou_ttc ?? '')
  const res: ResultatRecherche = {
    fournisseur: texte(b.fournisseur, 120) ?? '', fournisseur_id: UUID.test(String(b.fournisseur_id ?? '')) ? String(b.fournisseur_id) : null,
    designation_vue: texte(b.designation_vue, 300) ?? '', reference: texte(b.reference, 80),
    prix_vu: Number.isFinite(prix) ? prix : 0, ht_ou_ttc: ht === 'HT' || ht === 'TTC' ? ht : 'inconnu',
    unite: texte(b.unite, 16), conditionnement: texte(b.conditionnement, 80), disponibilite_vue: texte(b.disponibilite_vue, 120),
    url: texte(b.url, 1000) ?? '', vu_le: texte(b.vu_le, 40) ?? '', extrait: texte(b.extrait, 600) ?? '', sceau: String(b.sceau ?? ''),
  }
  if (!res.fournisseur || !res.designation_vue || !(res.prix_vu > 0) || !/^https?:\/\//i.test(res.url) || !res.extrait) return null
  // Le sceau porte sur les champs tels que le moteur les a produits : la moindre retouche l'invalide.
  return sceauValide(uid, res) ? res : null
}

export async function POST(req: Request) {
  try {
    if (!actif('inventaireRecherche')) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const a = await authInventaire(req)
    if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
    if (!a.isFounder && !peut(a.plan, 'inventaire.recherche_ia')) {
      return NextResponse.json({ error: `La recherche chez vos fournisseurs n’est pas dans votre offre. ${messageVerrou('inventaire.recherche_ia')}` }, { status: 403 })
    }
    const b = await req.json().catch(() => null)
    if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Requête vide.' }, { status: 400 })
    const r = lireResultat(a.uid, b.resultat)
    if (!r) return NextResponse.json({ error: 'Ce résultat ne vient pas de l’assistant (ou a été modifié) : relancez la recherche.' }, { status: 400 })
    const action = b.action === 'liste_achat' ? 'liste_achat' : 'inventaire'
    const quantite = Number(b.quantite)
    const qte = Number.isFinite(quantite) && quantite > 0 ? Math.min(Math.round(quantite * 100) / 100, 100_000) : 1

    // Le fournisseur du résultat doit être un des siens (sinon on garde seulement le nom figé).
    let fournisseur_id: string | null = null
    if (r.fournisseur_id) {
      const { data: f } = await supabaseAdmin.from('fournisseurs').select('id').eq('id', r.fournisseur_id).eq('artisan_id', a.uid).maybeSingle()
      fournisseur_id = f?.id ?? null
    }
    let materiau_id: string | null = null
    if (b.materiau_id) {
      if (!UUID.test(String(b.materiau_id))) return NextResponse.json({ error: 'Matériau introuvable.' }, { status: 404 })
      const { data: m } = await supabaseAdmin.from('materiaux').select('id').eq('id', b.materiau_id).eq('artisan_id', a.uid).maybeSingle()
      if (!m) return NextResponse.json({ error: 'Matériau introuvable.' }, { status: 404 })
      materiau_id = m.id
    }

    if (action === 'liste_achat') {
      // Sa liste ouverte la plus récente, ou une nouvelle.
      const { data: ouverte } = await supabaseAdmin.from('listes_achat').select('id').eq('artisan_id', a.uid).eq('statut', 'ouverte').order('cree_le', { ascending: false }).limit(1).maybeSingle()
      let liste_id = ouverte?.id as string | undefined
      if (!liste_id) {
        const { data: l, error } = await supabaseAdmin.from('listes_achat').insert({ artisan_id: a.uid, nom: 'Liste d’achat' }).select('id').single()
        if (error) { console.error('[inventaire/retenir] liste:', error.message); return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 }) }
        liste_id = l.id
      }
      const { data: ligne, error } = await supabaseAdmin.from('lignes_achat').insert({
        liste_id, materiau_id,
        designation_libre: `${r.designation_vue}${r.reference ? ` (réf. ${r.reference})` : ''} — ${r.fournisseur} · ${r.prix_vu.toFixed(2)} € ${r.ht_ou_ttc === 'inconnu' ? '' : r.ht_ou_ttc} · ${r.url}`.slice(0, 600),
        quantite: qte,
        // Le prix cible est HT : un prix vu TTC (ou sans mention) n'y va pas — on ne convertit jamais.
        prix_cible_ht: r.ht_ou_ttc === 'HT' ? r.prix_vu : null,
        fournisseur: r.fournisseur,
      }).select('id').single()
      if (error) { console.error('[inventaire/retenir] ligne:', error.message); return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 }) }
      return NextResponse.json({ ok: true, action, liste_id, ligne_id: ligne.id })
    }

    // ── Inventaire : fiche pré-remplie (créée si besoin), puis observation « vu par l'assistant ».
    if (!materiau_id) {
      const nom = String(b.nom ?? r.designation_vue).trim().slice(0, 200) || r.designation_vue.slice(0, 200)
      const { data: m, error } = await supabaseAdmin.from('materiaux').upsert({
        artisan_id: a.uid, nom,
        reference: r.reference, reference_fournisseur: r.reference,
        unite: r.unite ?? 'u', conditionnement: r.conditionnement,
        fournisseur_id, fournisseur_prefere: r.fournisseur,
        disponibilite_vue: r.disponibilite_vue,
        seuil_alerte: 0, maj_le: new Date().toISOString(),
      }, { onConflict: 'artisan_id,nom,reference' }).select('id').single()
      if (error) { console.error('[inventaire/retenir] materiau:', error.message); return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 }) }
      materiau_id = m.id
    }
    // Un prix affiché sans mention sur un site grand public est TTC (prix consommateur) : on
    // le range en TTC et l'extrait garde la trace de ce qui était écrit. Jamais de conversion.
    const obs = await enregistrerObservation(a.uid, {
      materiau_id, fournisseur_id, fournisseur_nom: r.fournisseur, designation_vue: r.designation_vue,
      prix_ht: r.ht_ou_ttc === 'HT' ? r.prix_vu : null,
      prix_ttc: r.ht_ou_ttc === 'HT' ? null : r.prix_vu,
      unite: r.unite, url: r.url, source: 'recherche_ia',
      extrait: r.ht_ou_ttc === 'inconnu' ? `[HT/TTC non précisé sur la page] ${r.extrait}` : r.extrait,
      disponibilite: r.disponibilite_vue, vu_le: r.vu_le,
    })
    if ('error' in obs) return NextResponse.json({ error: obs.error }, { status: 400 })
    return NextResponse.json({ ok: true, action, materiau_id, observation_id: obs.id })
  } catch (e) {
    console.error('[inventaire/retenir] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
