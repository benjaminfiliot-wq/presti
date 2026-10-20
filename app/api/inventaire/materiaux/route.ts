import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { lireCsv } from '@/lib/prix/csv'
import { lirePages } from '@/lib/crm/pages'
import { authInventaire, estRefus } from '@/lib/inventaire/auth'
import { listerObservations } from '@/lib/inventaire/observations'
import { aReverifier, COLONNES_MATERIAU, type Materiau, type MateriauEntree } from '@/lib/inventaire/types'

const LIMITE_MATERIAUX = 5000

// Fiche matériau complète (§8 F1) — GET liste/recherche/fiche, POST créer/mettre à jour/
// importer un CSV, DELETE. Les mouvements de stock restent sur /api/inventaire.
//
// Verrou d'offre SERVEUR (`inventaire.stock`, lib/inventaire/auth.ts) — inchangé.

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_LIGNES_CSV = 2000

type Brut = Omit<Materiau, 'quantite_totale' | 'fournisseur'> & { fournisseur: { id: string; nom: string } | { id: string; nom: string }[] | null }

const total = (m: { stock: { quantite: number }[] | null }) => (m.stock ?? []).reduce((s, l) => s + Number(l.quantite), 0)
const normaliser = (m: Brut): Materiau => ({
  ...m,
  tags: m.tags ?? [], chantiers_lies: m.chantiers_lies ?? [], stock: m.stock ?? [],
  fournisseur: Array.isArray(m.fournisseur) ? (m.fournisseur[0] ?? null) : m.fournisseur,
  quantite_totale: total(m),
})

const texte = (v: unknown, max: number): string | null => { const s = String(v ?? '').trim().slice(0, max); return s || null }
const nombre = (v: unknown): number | null => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null }
const urlHttp = (v: unknown): string | null => { const s = texte(v, 1000); return s && /^https?:\/\//i.test(s) ? s : null }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Une photo ne peut venir QUE du dossier de cet artisan dans le bucket public. */
function photoValide(v: unknown, uid: string): string | null {
  const s = texte(v, 1000)
  if (!s) return null
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/artisan-media/${uid}/`
  return s.startsWith(base) ? s : null
}

// ── GET : liste (avec recherche), ou une fiche avec son historique de prix vus.
export async function GET(req: Request) {
  const a = await authInventaire(req)
  if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
  const url = new URL(req.url)
  const id = (url.searchParams.get('id') || '').trim()
  const q = (url.searchParams.get('q') || '').trim()

  if (id) {
    if (!UUID.test(id)) return NextResponse.json({ error: 'Matériau introuvable.' }, { status: 404 })
    const { data } = await supabaseAdmin.from('materiaux').select(COLONNES_MATERIAU).eq('artisan_id', a.uid).eq('id', id).maybeSingle()
    if (!data) return NextResponse.json({ error: 'Matériau introuvable.' }, { status: 404 })
    const materiau = normaliser(data as unknown as Brut)
    const observations = await listerObservations(a.uid, id)
    return NextResponse.json({ ok: true, materiau, observations, prix_vu_a_reverifier: aReverifier(materiau.prix_vu_le) })
  }

  // C7 (audit du 18/10) : `.limit(500)` coupait l'inventaire (et ses alertes « stock bas ») sans le dire. Lecture par pages,
  // une requête neuve par page, `tronque` levé si la limite est atteinte.
  const requete = () => {
    const r = supabaseAdmin.from('materiaux').select(COLONNES_MATERIAU).eq('artisan_id', a.uid)
    if (!q) return r
    const motif = `%${q.replace(/[%_,()]/g, '').replace(/[\s-]+/g, '%')}%`
    return r.or(`nom.ilike.${motif},marque.ilike.${motif},reference_fabricant.ilike.${motif},reference_fournisseur.ilike.${motif},categorie.ilike.${motif}`)
  }
  const { data, error } = await lirePages((de, fin) => requete().order('nom').order('id').range(de, fin), LIMITE_MATERIAUX)
  if (error) { console.error('[inventaire/materiaux] GET:', error.message); return NextResponse.json({ error: 'Lecture impossible.' }, { status: 500 }) }
  const materiaux = ((data ?? []) as unknown as Brut[]).map(normaliser)
  const alertes = materiaux.filter((m) => Number(m.seuil_alerte) > 0 && m.quantite_totale <= Number(m.seuil_alerte))
  return NextResponse.json({
    ok: true,
    materiaux: materiaux.map((m) => ({ ...m, prix_vu_a_reverifier: aReverifier(m.prix_vu_le) })),
    alertes: alertes.map((m) => ({ id: m.id, nom: m.nom, unite: m.unite, reste: m.quantite_totale, seuil: Number(m.seuil_alerte) })),
    tronque: materiaux.length >= LIMITE_MATERIAUX,
  })
}

/** Nettoie une fiche envoyée par le client. Aucune valeur inventée : ce qui n'est pas fourni reste null. */
async function nettoyer(uid: string, b: MateriauEntree) {
  const nom = String(b.nom || '').trim().slice(0, 200)
  if (!nom) return { error: 'Il faut un nom de matériau.' }
  const reference_fabricant = texte(b.reference_fabricant, 80)
  const reference_fournisseur = texte(b.reference_fournisseur, 80)

  let fournisseur_id: string | null = null
  if (b.fournisseur_id) {
    if (!UUID.test(String(b.fournisseur_id))) return { error: 'Fournisseur invalide.' }
    const { data: f } = await supabaseAdmin.from('fournisseurs').select('id').eq('id', b.fournisseur_id).eq('artisan_id', uid).maybeSingle()
    if (!f) return { error: 'Fournisseur introuvable.' }
    fournisseur_id = f.id
  }
  // Chantiers = devis de CET artisan, rien d'autre.
  let chantiers_lies: string[] = []
  const demandes = Array.isArray(b.chantiers_lies) ? b.chantiers_lies.filter((x) => UUID.test(String(x))).slice(0, 50) : []
  if (demandes.length) {
    const { data: d } = await supabaseAdmin.from('devis').select('id').eq('artisan_id', uid).in('id', demandes)
    chantiers_lies = (d ?? []).map((x) => x.id as string)
  }
  const tags = Array.isArray(b.tags) ? [...new Set(b.tags.map((t) => String(t).trim().toLowerCase().slice(0, 40)).filter(Boolean))].slice(0, 20) : []

  return {
    ligne: {
      artisan_id: uid, nom,
      marque: texte(b.marque, 120),
      // `reference` (0040) reste le miroir de la référence fabricant : l'ancien écran et la
      // clé d'unicité (artisan, nom, référence) continuent de fonctionner.
      reference: reference_fabricant ?? texte(b.reference, 80) ?? reference_fournisseur,
      reference_fabricant, reference_fournisseur,
      categorie: texte(b.categorie, 80),
      sous_categorie: texte(b.sous_categorie, 80),
      unite: texte(b.unite, 16) ?? 'u',
      conditionnement: texte(b.conditionnement, 80),
      code_barres: texte(b.code_barres, 60),
      photo_url: photoValide(b.photo_url, uid),
      fiche_technique_url: urlHttp(b.fiche_technique_url),
      fournisseur_id,
      fournisseur_prefere: texte(b.fournisseur_prefere, 120),
      prix_achat_ht: nombre(b.prix_achat_ht),
      disponibilite_vue: texte(b.disponibilite_vue, 120),
      seuil_alerte: Math.max(0, nombre(b.seuil_alerte) ?? 0),
      notes: texte(b.notes, 2000),
      tags, chantiers_lies,
      maj_le: new Date().toISOString(),
    },
  }
}

// ── POST : créer / mettre à jour une fiche, ou importer un CSV (aperçu puis enregistrement).
export async function POST(req: Request) {
  try {
    const a = await authInventaire(req)
    if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
    const b = await req.json().catch(() => null)
    if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Requête vide.' }, { status: 400 })

    // ── Import CSV : même analyseur que /tarifs. Deux temps — on montre ce qu'on a
    // compris (apercu), l'artisan valide, puis on enregistre. Rien n'est écrit à l'aveugle.
    if (typeof b.csv === 'string') {
      const lu = lireCsv(b.csv.slice(0, 4_000_000), { fournisseur: texte(b.fournisseur, 120), tva: 20 })
      if (!lu.lignes.length) {
        return NextResponse.json({ error: 'Aucun matériau reconnu dans ce fichier. Il faut au minimum une colonne de libellé et une colonne de prix.', colonnes: lu.colonnes }, { status: 400 })
      }
      const lignes = lu.lignes.slice(0, MAX_LIGNES_CSV).map((l) => ({
        nom: l.designation.slice(0, 200), unite: l.unite || 'u', prix_achat_ht: l.prix_ht,
        reference_fournisseur: l.reference, fournisseur_prefere: l.fournisseur,
      }))
      if (b.apercu) {
        return NextResponse.json({ ok: true, apercu: true, colonnes: lu.colonnes, reconnues: lignes.length, ignorees: lu.ignorees, total: lu.total, exemples: lignes.slice(0, 8) })
      }
      let fournisseur_id: string | null = null
      if (b.fournisseur_id && UUID.test(String(b.fournisseur_id))) {
        const { data: f } = await supabaseAdmin.from('fournisseurs').select('id').eq('id', b.fournisseur_id).eq('artisan_id', a.uid).maybeSingle()
        fournisseur_id = f?.id ?? null
      }
      const maintenant = new Date().toISOString()
      const rangs = lignes.map((l) => ({
        artisan_id: a.uid, nom: l.nom, unite: l.unite, prix_achat_ht: l.prix_achat_ht,
        reference: l.reference_fournisseur, reference_fournisseur: l.reference_fournisseur,
        fournisseur_prefere: l.fournisseur_prefere, fournisseur_id, maj_le: maintenant,
      }))
      // Un ré-import met à jour les fiches existantes (même nom + référence) au lieu d'empiler des doublons.
      let ecrites = 0
      for (let i = 0; i < rangs.length; i += 500) {
        const { error } = await supabaseAdmin.from('materiaux').upsert(rangs.slice(i, i + 500), { onConflict: 'artisan_id,nom,reference' })
        if (error) { console.error('[inventaire/materiaux] import:', error.message); break }
        ecrites += Math.min(500, rangs.length - i)
      }
      return NextResponse.json({ ok: true, enregistrees: ecrites, ignorees: lu.ignorees })
    }

    // ── Seuil d'alerte SEUL (atelier du CRM, audit du 20/10) : on ne touche qu'à cette colonne. Renvoyer la fiche entière
    // écrasait une modification faite entre-temps dans l'Inventaire et normalisait tags et prix au passage.
    if (b.id && Object.keys(b).every((k) => k === 'id' || k === 'seuil_alerte')) {
      if (!UUID.test(String(b.id))) return NextResponse.json({ error: 'Matériau introuvable.' }, { status: 404 })
      const seuil = Number(b.seuil_alerte)
      if (!Number.isFinite(seuil) || seuil < 0 || seuil > 1_000_000) return NextResponse.json({ error: 'Seuil invalide.' }, { status: 400 })
      const { data, error } = await supabaseAdmin.from('materiaux').update({ seuil_alerte: seuil, maj_le: new Date().toISOString() }).eq('id', b.id).eq('artisan_id', a.uid).select('id').maybeSingle()
      if (error) { console.error('[inventaire/materiaux] seuil:', error.message); return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 }) }
      if (!data) return NextResponse.json({ error: 'Matériau introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true, id: data.id })
    }

    // ── Fiche (rapide : nom + prix suffisent ; complète : tout le reste).
    const n = await nettoyer(a.uid, b as MateriauEntree)
    if ('error' in n) return NextResponse.json({ error: n.error }, { status: 400 })

    if (b.id) {
      if (!UUID.test(String(b.id))) return NextResponse.json({ error: 'Matériau introuvable.' }, { status: 404 })
      const { artisan_id: _a, ...maj } = n.ligne
      void _a
      const { data, error } = await supabaseAdmin.from('materiaux').update(maj).eq('id', b.id).eq('artisan_id', a.uid).select('id').maybeSingle()
      if (error) { console.error('[inventaire/materiaux] update:', error.message); return NextResponse.json({ error: error.code === '23505' ? 'Un matériau porte déjà ce nom et cette référence.' : 'Enregistrement impossible.' }, { status: error.code === '23505' ? 409 : 500 }) }
      if (!data) return NextResponse.json({ error: 'Matériau introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true, id: data.id })
    }
    // Création : un INSERT, jamais un upsert (audit du 20/10) — l'upsert sur (artisan_id, nom, reference) réécrivait en silence
    // la fiche d'un article du même nom (marque, photo, prix, notes passaient à vide). L'import en masse garde son upsert, voulu.
    const { data, error } = await supabaseAdmin.from('materiaux').insert(n.ligne).select('id').single()
    if (error) { console.error('[inventaire/materiaux] insert:', error.message); return NextResponse.json({ error: error.code === '23505' ? 'Un article porte déjà ce nom : modifiez-le plutôt, ou donnez-lui une référence.' : 'Enregistrement impossible.' }, { status: error.code === '23505' ? 409 : 500 }) }
    return NextResponse.json({ ok: true, id: data.id })
  } catch (e) {
    console.error('[inventaire/materiaux] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

// ── DELETE : retirer une fiche (stock, mouvements et observations partent avec — cascade).
export async function DELETE(req: Request) {
  const a = await authInventaire(req)
  if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!UUID.test(id)) return NextResponse.json({ error: 'Matériau manquant' }, { status: 400 })
  const { data } = await supabaseAdmin.from('materiaux').delete().eq('id', id).eq('artisan_id', a.uid).select('id')
  return NextResponse.json({ ok: true, supprime: (data ?? []).length })
}
