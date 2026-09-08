import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { empreinte } from '@/lib/facturation'
import { authArtisan, estEchec } from '@/lib/authArtisan'

export const runtime = 'nodejs'

// L'avoir — la seule façon d'annuler une facture émise (audit final, auditeur B, A9).
//
// Une facture émise ne se modifie pas et ne se supprime pas (art. 289 CGI, triggers 0041).
// Elle ne « s'annule » pas non plus par un simple changement de statut : la doctrine
// (BOI-TVA-DECLA-30-20-20-20) veut une pièce rectificative — une note d'avoir — numérotée
// dans la même séquence, aux montants négatifs, qui cite la facture qu'elle annule. C'est
// cette route. Le statut « annulée » de la facture d'origine est posé PAR l'avoir, jamais
// à la main (le PATCH le refuse désormais).

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  const uid = s.uid
  const body = await req.json().catch(() => ({}))
  const motif = typeof body?.motif === 'string' ? body.motif.trim().slice(0, 200) : ''

  const { data: cur } = await supabaseAdmin.from('factures').select('*').eq('id', id).eq('artisan_id', uid).maybeSingle()
  if (!cur) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  if (!cur.verrouillee) return NextResponse.json({ error: 'Cette facture n’a pas été émise : elle n’a pas besoin d’avoir.' }, { status: 409 })
  if (cur.avoir_de) return NextResponse.json({ error: 'Un avoir ne s’annule pas par un autre avoir.' }, { status: 409 })
  if (cur.statut === 'annulee') return NextResponse.json({ error: 'Cette facture est déjà annulée par un avoir.' }, { status: 409 })
  const { count: deja } = await supabaseAdmin.from('factures').select('id', { count: 'exact', head: true }).eq('avoir_de', id)
  if ((deja ?? 0) > 0) return NextResponse.json({ error: 'Un avoir existe déjà pour cette facture.' }, { status: 409 })

  const { data: lignes } = await supabaseAdmin.from('factures_lignes')
    .select('designation, quantite, unite, prix_unitaire_ht, tva_taux').eq('facture_id', id).order('ordre')
  const negatives = (lignes ?? []).map((l) => ({ ...l, prix_unitaire_ht: -Number(l.prix_unitaire_ht || 0) }))

  const { data: n } = await supabaseAdmin.rpc('next_numero', { p_artisan: uid, p_type: 'facture' })
  const numero = `FAC-${new Date().getFullYear()}-${String(n ?? 1).padStart(4, '0')}`
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const neg = (v: unknown) => -Math.abs(Number(v) || 0)

  const { data: avoir, error } = await supabaseAdmin.from('factures').insert({
    artisan_id: uid, devis_id: cur.devis_id ?? null, client_id: cur.client_id ?? null, numero,
    objet: `Avoir annulant la facture ${cur.numero ?? ''}${motif ? ` — ${motif}` : ''}`.trim(),
    // La remise de la facture annulée est REPORTÉE, pas remise à zéro. Le PDF ne lit pas les totaux
    // scellés : il les recalcule depuis les lignes et `remise_pct` (lib/devisPdfData.ts). Avec 0 ici,
    // une facture de 1 000 EUR remisée à 10 % — donc 900 encaissés — sortait imprimée à -1 000 :
    // cent euros rendus en trop, sur une pièce scellée qu'on ne peut plus corriger.
    statut: 'emise', date_emission: aujourdhui, date_echeance: aujourdhui,
    remise_pct: Number(cur.remise_pct) || 0, acompte_pct: 0,
    conditions: null, notes: cur.notes ?? null,
    client_nom: cur.client_nom, client_email: cur.client_email ?? null, client_adresse: cur.client_adresse ?? null,
    client_siren: cur.client_siren ?? null, client_pays: cur.client_pays ?? 'FR', adresse_chantier: cur.adresse_chantier ?? null,
    categorie_operation: cur.categorie_operation ?? 'mixte', devise: cur.devise ?? 'EUR',
    exoneration_code: cur.exoneration_code ?? null, tva_sur_debits: cur.tva_sur_debits ?? false,
    // Un avoir hérite du régime de la facture qu'il annule (0081) : sinon il la contredirait,
    // et deux pièces liées diraient deux choses différentes de la même opération.
    tva_regime: (cur as { tva_regime?: string | null }).tva_regime ?? null,
    total_ht: neg(cur.total_ht), total_tva: neg(cur.total_tva), total_ttc: neg(cur.total_ttc),
    avoir_de: id,
  }).select('id, numero').single()
  if (error || !avoir) { console.error('[factures/avoir] insert:', error?.message); return NextResponse.json({ error: 'Création de l’avoir impossible' }, { status: 500 }) }

  if (negatives.length) await supabaseAdmin.from('factures_lignes').insert(negatives.map((l, i) => ({ facture_id: avoir.id, ordre: i, ...l })))

  // Scellé comme une facture : même immuabilité, même conservation.
  await supabaseAdmin.from('factures').update({
    verrouillee: true, emise_le: new Date().toISOString(),
    empreinte: await empreinte(JSON.stringify({ numero: avoir.numero, client: cur.client_nom, avoir_de: id, totaux: [neg(cur.total_ht), neg(cur.total_tva), neg(cur.total_ttc)], lignes: negatives })),
  }).eq('id', avoir.id)

  // C'est l'avoir qui annule : la facture d'origine change de statut ici, et seulement ici.
  const { error: eA } = await supabaseAdmin.from('factures').update({ statut: 'annulee', updated_at: new Date().toISOString() }).eq('id', id).eq('artisan_id', uid)
  if (eA) console.error('[factures/avoir] statut origine:', eA.message)

  return NextResponse.json({ ok: true, id: avoir.id, numero: avoir.numero, annule: cur.numero })
}
