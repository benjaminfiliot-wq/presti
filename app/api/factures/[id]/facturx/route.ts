import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { genererFacturX, controlerAvantEmission, type DonneesFacturX } from '@/lib/facturx'
import { mentionFranchise, codeExonerationParDefaut, MOTIFS_EXONERATION, type BaseMention } from '@/lib/facturation'

// Le fichier XML de la facture (v4 §10.3).
//
// C'est ce que lit la plateforme agréée — le PDF, lui, est pour l'humain. On l'expose
// dès maintenant pour que l'artisan puisse le récupérer, le donner à son comptable, et
// que le raccordement à une plateforme se fasse plus tard sans rien réécrire.

export const runtime = 'nodejs'

async function auth(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  return data?.user?.id ?? null
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const uid = await auth(req)
  if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: f } = await supabaseAdmin.from('factures').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!f) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  const { data: lignes } = await supabaseAdmin.from('factures_lignes')
    .select('designation, quantite, unite, prix_unitaire_ht, tva_taux').eq('facture_id', id).order('ordre')
  const { data: a } = await supabaseAdmin.from('artisans')
    .select('nom, siret, tva_num, tva_regime, mention_tva_base, adresse, code_postal, ville').eq('id', uid).single()

  const franchise = (a?.tva_regime || 'franchise') === 'franchise'
  const code = (f.exoneration_code as string | null) ?? codeExonerationParDefaut(a?.tva_regime)
  const mention = code === 'VATEX-FR-FRANCHISE'
    ? mentionFranchise((a?.mention_tva_base as BaseMention) || 'auto', new Date(f.date_emission || Date.now()))
    : (MOTIFS_EXONERATION.find((m) => m.code === code)?.mention ?? null)

  const donnees: DonneesFacturX = {
    numero: f.numero, date_emission: String(f.date_emission || '').slice(0, 10), date_echeance: f.date_echeance,
    devise: f.devise || 'EUR', categorie_operation: f.categorie_operation || 'mixte',
    exoneration_code: code, exoneration_mention: mention,
    vendeur: { nom: a?.nom || '', siret: a?.siret, tva: a?.tva_num, adresse: a?.adresse, code_postal: a?.code_postal, ville: a?.ville, pays: 'FR' },
    acheteur: { nom: f.client_nom || '', siren: f.client_siren, adresse: f.client_adresse, pays: f.client_pays || 'FR' },
    adresse_chantier: f.adresse_chantier,
    lignes: (lignes ?? []).map((l) => ({
      designation: l.designation ?? '', quantite: Number(l.quantite) || 0, unite: l.unite ?? 'u',
      prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: Number(l.tva_taux) || 0,
    })),
    remise_pct: Number(f.remise_pct) || 0,
    total_ht: Number(f.total_ht) || 0, total_tva: Number(f.total_tva) || 0, total_ttc: Number(f.total_ttc) || 0,
    franchise,
  }

  const soucis = controlerAvantEmission(donnees)
  // `?controle=1` : l'écran demande « est-ce que cette facture passerait ? » sans rien
  // produire. Mieux vaut le dire quand elle est encore corrigeable.
  if (new URL(req.url).searchParams.get('controle') === '1') {
    return NextResponse.json({ ok: soucis.length === 0, soucis })
  }

  const xml = genererFacturX(donnees)
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="factur-x-${f.numero || id}.xml"`,
      'Cache-Control': 'no-store',
    },
  })
}
