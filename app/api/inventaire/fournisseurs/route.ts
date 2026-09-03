import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authInventaire, estRefus } from '@/lib/inventaire/auth'
import { LISTE_DEPART } from '@/lib/inventaire/liste-depart'
import { COLONNES_FOURNISSEUR, type Fournisseur, type TypeFournisseur } from '@/lib/inventaire/types'

// « Mes fournisseurs » (§8 F2) — la liste qui borne la recherche de prix (F3).
//
// GET liste (par ordre de préférence) · POST créer/mettre à jour, { liste_depart: true }
// insère la liste vérifiée (idempotent), { ordre: [ids] } réordonne · DELETE.
// Verrou d'offre serveur : lib/inventaire/auth.ts.

export const runtime = 'nodejs'
export const maxDuration = 30

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TYPES: TypeFournisseur[] = ['negoce', 'gsb', 'fabricant', 'marketplace']
const texte = (v: unknown, max: number): string | null => { const s = String(v ?? '').trim().slice(0, max); return s || null }
const entier = (v: unknown, max: number): number | null => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : null }
const urlHttp = (v: unknown): string | null => {
  const s = texte(v, 500)
  if (!s) return null
  const u = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try { new URL(u); return u } catch { return null }
}

async function lister(uid: string): Promise<Fournisseur[]> {
  const { data } = await supabaseAdmin.from('fournisseurs').select(COLONNES_FOURNISSEUR).eq('artisan_id', uid).order('ordre').order('nom')
  return (data ?? []) as unknown as Fournisseur[]
}

export async function GET(req: Request) {
  const a = await authInventaire(req)
  if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
  return NextResponse.json({ ok: true, fournisseurs: await lister(a.uid) })
}

export async function POST(req: Request) {
  try {
    const a = await authInventaire(req)
    if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
    const b = await req.json().catch(() => null)
    if (!b || typeof b !== 'object') return NextResponse.json({ error: 'Requête vide.' }, { status: 400 })

    // ── Liste de départ : uniquement sur clic, et rejouable sans doublon.
    if (b.liste_depart === true) {
      const existants = await lister(a.uid)
      const deja = new Set(existants.map((f) => f.nom.toLowerCase()))
      const manquants = LISTE_DEPART.filter((f) => !deja.has(f.nom.toLowerCase()))
      let ordre = existants.reduce((m, f) => Math.max(m, Number(f.ordre)), -1) + 1
      const rangs = manquants.map((f) => ({ artisan_id: a.uid, nom: f.nom, url: f.url, type: f.type, prix_publics: f.prix_publics, note_acces: f.note_acces, ordre: ordre++ }))
      if (rangs.length) {
        const { error } = await supabaseAdmin.from('fournisseurs').insert(rangs)
        // 23505 = deux clics simultanés : l'index unique a fait son travail, on relit.
        if (error && error.code !== '23505') { console.error('[inventaire/fournisseurs] liste:', error.message); return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 }) }
      }
      return NextResponse.json({ ok: true, ajoutes: rangs.length, existants: existants.length, fournisseurs: await lister(a.uid) })
    }

    // ── Réordonner : l'ordre du tableau = l'ordre de préférence.
    if (Array.isArray(b.ordre)) {
      const ids = b.ordre.filter((x: unknown) => UUID.test(String(x))).slice(0, 200) as string[]
      for (let i = 0; i < ids.length; i++) {
        await supabaseAdmin.from('fournisseurs').update({ ordre: i, maj_le: new Date().toISOString() }).eq('id', ids[i]).eq('artisan_id', a.uid)
      }
      return NextResponse.json({ ok: true, fournisseurs: await lister(a.uid) })
    }

    // ── Fiche fournisseur. Aucune valeur par défaut inventée : remise, délai, compte restent
    // vides tant que l'artisan ne les a pas donnés.
    const nom = String(b.nom || '').trim().slice(0, 120)
    if (!nom) return NextResponse.json({ error: 'Il faut un nom de fournisseur.' }, { status: 400 })
    const ligne = {
      nom, url: urlHttp(b.url),
      type: TYPES.includes(b.type) ? (b.type as TypeFournisseur) : 'negoce',
      numero_compte: texte(b.numero_compte, 80),
      remise_pct: entier(b.remise_pct, 100),
      delai_jours: entier(b.delai_jours, 365),
      agence: texte(b.agence, 120),
      contact: texte(b.contact, 200),
      prix_publics: b.prix_publics === true,
      note_acces: texte(b.note_acces, 400),
      maj_le: new Date().toISOString(),
    }
    if (b.id) {
      if (!UUID.test(String(b.id))) return NextResponse.json({ error: 'Fournisseur introuvable.' }, { status: 404 })
      const { data, error } = await supabaseAdmin.from('fournisseurs').update(ligne).eq('id', b.id).eq('artisan_id', a.uid).select('id').maybeSingle()
      if (error) return NextResponse.json({ error: error.code === '23505' ? 'Vous avez déjà un fournisseur de ce nom.' : 'Enregistrement impossible.' }, { status: error.code === '23505' ? 409 : 500 })
      if (!data) return NextResponse.json({ error: 'Fournisseur introuvable.' }, { status: 404 })
      return NextResponse.json({ ok: true, id: data.id, fournisseurs: await lister(a.uid) })
    }
    const { data: dernier } = await supabaseAdmin.from('fournisseurs').select('ordre').eq('artisan_id', a.uid).order('ordre', { ascending: false }).limit(1).maybeSingle()
    const { data, error } = await supabaseAdmin.from('fournisseurs')
      .insert({ ...ligne, artisan_id: a.uid, ordre: (Number(dernier?.ordre ?? -1)) + 1 }).select('id').single()
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'Vous avez déjà un fournisseur de ce nom.' : 'Enregistrement impossible.' }, { status: error.code === '23505' ? 409 : 500 })
    return NextResponse.json({ ok: true, id: data.id, fournisseurs: await lister(a.uid) })
  } catch (e) {
    console.error('[inventaire/fournisseurs] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

// ── DELETE : les matériaux liés gardent leur fiche (fournisseur_id → null), les
// observations gardent le nom figé.
export async function DELETE(req: Request) {
  const a = await authInventaire(req)
  if (estRefus(a)) return NextResponse.json({ error: a.error }, { status: a.status })
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!UUID.test(id)) return NextResponse.json({ error: 'Fournisseur manquant' }, { status: 400 })
  const { data } = await supabaseAdmin.from('fournisseurs').delete().eq('id', id).eq('artisan_id', a.uid).select('id')
  return NextResponse.json({ ok: true, supprime: (data ?? []).length })
}
