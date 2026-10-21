import { NextResponse } from 'next/server'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { creerAvoir } from '@/lib/avoirFacture'

export const runtime = 'nodejs'

// L'avoir — la seule façon d'annuler une facture émise (audit final, auditeur B, A9).
//
// Une facture émise ne se modifie pas et ne se supprime pas (art. 289 CGI, triggers 0041).
// Elle ne « s'annule » pas non plus par un simple changement de statut : la doctrine
// (BOI-TVA-DECLA-30-20-20-20) veut une pièce rectificative — une note d'avoir — numérotée
// dans la même séquence, aux montants négatifs, qui cite la facture qu'elle annule. C'est
// cette route. Le statut « annulée » de la facture d'origine est posé PAR l'avoir, jamais
// à la main (le PATCH le refuse désormais).
//
// Audit argent du 21/10 (E3) : l'avoir numérotait `n ?? 1` (un doublon possible) et ne lisait aucune erreur (lignes,
// scellement, statut d'origine). Il passe désormais par la même émission atomique que les factures (0180, lib/factureEmission.ts) :
// avoir, lignes, numéro, scellement ET statut « annulée » de la facture d'origine en UNE transaction, sous verrou — deux avoirs
// simultanés sur la même facture n'en font qu'un. Sans 0180 : 503, rien n'est écrit.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error, code: s.code }, { status: s.status })
  const body = await req.json().catch(() => ({}))
  const r = await creerAvoir({ artisanId: s.uid, factureId: id, motif: typeof body?.motif === 'string' ? body.motif : '' })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ ok: true, id: r.id, numero: r.numero, annule: r.annule })
}
