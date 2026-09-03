import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Inventaire (v4 §9) — le stock de l'artisan, et ce qu'il doit racheter.
//
// Fonctionnalité Studio et Signature (§G3). Le verrou est SERVEUR : masquer l'entrée de
// menu ne protège rien, l'URL de l'API reste appelable.

export const runtime = 'nodejs'
export const maxDuration = 30

const OFFRES_AUTORISEES = new Set(['studio', 'signature', 'business'])

async function auth(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Non authentifié', status: 401 as const }
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return { error: 'Session expirée, reconnecte-toi.', status: 401 as const }
  const { data: art } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', data.user.id).maybeSingle()
  const plan = (art?.plan as string) || 'gratuit'
  if (!art?.is_founder && !OFFRES_AUTORISEES.has(plan)) {
    return { error: 'L’inventaire est inclus dans les offres Studio et Signature.', status: 403 as const }
  }
  return { uid: data.user.id }
}

type LigneStock = { lieu: string; quantite: number }
type Materiau = {
  id: string; nom: string; marque: string | null; reference: string | null; categorie: string | null
  unite: string; code_barres: string | null; fournisseur_prefere: string | null
  prix_dernier_ht: number | null; seuil_alerte: number; stock: LigneStock[]
}

// ── GET : l'inventaire, avec ce qui manque mis en avant.
export async function GET(req: Request) {
  const a = await auth(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const code = (url.searchParams.get('code') || '').trim()

  // Recherche par code-barres : c'est le parcours du scan, il doit répondre un seul article.
  if (code) {
    const { data } = await supabaseAdmin.from('materiaux')
      .select('id, nom, marque, reference, categorie, unite, code_barres, fournisseur_prefere, prix_dernier_ht, seuil_alerte, stock(lieu, quantite)')
      .eq('artisan_id', a.uid).eq('code_barres', code).maybeSingle()
    return NextResponse.json({ ok: true, materiau: data ?? null })
  }

  let requete = supabaseAdmin.from('materiaux')
    .select('id, nom, marque, reference, categorie, unite, code_barres, fournisseur_prefere, prix_dernier_ht, seuil_alerte, stock(lieu, quantite)')
    .eq('artisan_id', a.uid)
  if (q) requete = requete.ilike('nom', `%${q.replace(/[%_]/g, '').replace(/[\s-]+/g, '%')}%`)
  const { data } = await requete.order('nom').limit(300)

  const materiaux = (data ?? []) as unknown as Materiau[]
  const total = (m: Materiau) => (m.stock ?? []).reduce((s, l) => s + Number(l.quantite), 0)
  // « Ce qui manque » d'abord : c'est la seule chose qu'un artisan vient vraiment voir.
  const alertes = materiaux.filter((m) => Number(m.seuil_alerte) > 0 && total(m) <= Number(m.seuil_alerte))

  return NextResponse.json({
    ok: true,
    materiaux: materiaux.map((m) => ({ ...m, quantite_totale: total(m) })),
    alertes: alertes.map((m) => ({ id: m.id, nom: m.nom, unite: m.unite, reste: total(m), seuil: Number(m.seuil_alerte) })),
  })
}

// ── POST : créer un article, ou enregistrer un mouvement de stock.
export async function POST(req: Request) {
  try {
    const a = await auth(req)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
    const b = await req.json().catch(() => null)

    // Mouvement : entrée, sortie, comptage, perte. Passe par la fonction SQL pour que le
    // mouvement et le stock soient écrits ensemble ou pas du tout.
    if (b?.mouvement) {
      const m = b.mouvement
      const quantite = Number(m.quantite)
      if (!m.materiau_id || !Number.isFinite(quantite) || quantite < 0) {
        return NextResponse.json({ error: 'Quantité invalide.' }, { status: 400 })
      }
      if (!['entree', 'sortie', 'inventaire', 'perte'].includes(String(m.type))) {
        return NextResponse.json({ error: 'Type de mouvement inconnu.' }, { status: 400 })
      }
      const { data, error } = await supabaseAdmin.rpc('appliquer_mouvement', {
        p_artisan: a.uid, p_materiau: m.materiau_id, p_type: m.type, p_quantite: quantite,
        p_lieu: String(m.lieu || 'atelier').slice(0, 60),
        p_devis: m.devis_id || null,
        p_source: ['manuel', 'scan', 'facture', 'devis'].includes(String(m.source)) ? m.source : 'manuel',
        p_cout: Number.isFinite(Number(m.cout_unitaire_ht)) ? Number(m.cout_unitaire_ht) : null,
        p_note: String(m.note || '').slice(0, 300) || null,
      })
      if (error) { console.error('[inventaire] mouvement:', error.message); return NextResponse.json({ error: 'Mouvement impossible.' }, { status: 400 }) }
      return NextResponse.json({ ok: true, reste: Number(data) })
    }

    // Création / mise à jour d'un article.
    const nom = String(b?.nom || '').trim().slice(0, 200)
    if (!nom) return NextResponse.json({ error: 'Il faut un nom d’article.' }, { status: 400 })
    const ligne = {
      artisan_id: a.uid, nom,
      marque: String(b?.marque || '').trim().slice(0, 120) || null,
      reference: String(b?.reference || '').trim().slice(0, 80) || null,
      categorie: String(b?.categorie || '').trim().slice(0, 80) || null,
      unite: String(b?.unite || 'u').trim().slice(0, 16) || 'u',
      code_barres: String(b?.code_barres || '').trim().slice(0, 60) || null,
      fournisseur_prefere: String(b?.fournisseur_prefere || '').trim().slice(0, 120) || null,
      prix_dernier_ht: Number.isFinite(Number(b?.prix_dernier_ht)) ? Number(b.prix_dernier_ht) : null,
      seuil_alerte: Number.isFinite(Number(b?.seuil_alerte)) ? Math.max(0, Number(b.seuil_alerte)) : 0,
      maj_le: new Date().toISOString(),
    }
    const { data, error } = await supabaseAdmin.from('materiaux')
      .upsert(ligne, { onConflict: 'artisan_id,nom,reference' })
      .select('id').single()
    if (error) { console.error('[inventaire] article:', error.message); return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 }) }
    return NextResponse.json({ ok: true, id: data.id })
  } catch (e) {
    console.error('[inventaire] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

// ── DELETE : retirer un article (son historique de mouvements part avec).
export async function DELETE(req: Request) {
  const a = await auth(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'Article manquant' }, { status: 400 })
  await supabaseAdmin.from('materiaux').delete().eq('id', id).eq('artisan_id', a.uid)
  return NextResponse.json({ ok: true })
}
