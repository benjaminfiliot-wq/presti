import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { exigerCapacite } from '@/lib/accesOffreServeur'
import { actif } from '@/lib/flags'
import { lireReglages, REGLAGES_PAR_DEFAUT } from '@/lib/comptaAutomatisations'

export const runtime = 'nodejs'

// Les réglages des automatisations de la compta (alerte impayés, export mensuel au comptable).
// Fermée (404) tant que les deux drapeaux sont baissés : rien dans l'interface n'y mène alors.
// Lit et écrit la SEULE ligne du compte de la session (compta_reglages, migration 0140).
const ouverte = () => actif('comptaAlerteImpayes') || actif('comptaExportMensuel')

export async function GET(req: Request) {
  if (!ouverte()) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  // 15/10 : les automatisations de « Mes chiffres » sont l'automatisation complète — Signature (capacité `chiffres.auto`).
  const garde = await exigerCapacite(req, 'chiffres.auto', 'Les automatisations de « Mes chiffres »')
  if ('reponse' in garde) return garde.reponse
  const session = { uid: garde.uid }
  const { data, error } = await supabaseAdmin.from('compta_reglages')
    .select('alerte_impayes, alerte_jours, export_mensuel, export_email, dernier_export_mois').eq('artisan_id', session.uid).maybeSingle()
  if (error) { console.error('[compta/reglages] lecture', error.message); return NextResponse.json({ error: 'Réglages indisponibles.' }, { status: 503 }) }
  return NextResponse.json({ reglages: data ?? REGLAGES_PAR_DEFAUT, alerte: actif('comptaAlerteImpayes'), export: actif('comptaExportMensuel') }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(req: Request) {
  if (!ouverte()) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  // 15/10 : les automatisations de « Mes chiffres » sont l'automatisation complète — Signature (capacité `chiffres.auto`).
  const garde = await exigerCapacite(req, 'chiffres.auto', 'Les automatisations de « Mes chiffres »')
  if ('reponse' in garde) return garde.reponse
  const session = { uid: garde.uid }
  const lu = lireReglages(await req.json().catch(() => null))
  if (!lu.ok) return NextResponse.json({ error: lu.erreur }, { status: 400 })
  // Un drapeau baissé ne s'active pas par la bande : sa case reste à false quoi que dise la requête.
  const r = { ...lu.reglages, alerte_impayes: lu.reglages.alerte_impayes && actif('comptaAlerteImpayes'), export_mensuel: lu.reglages.export_mensuel && actif('comptaExportMensuel') }
  const { error } = await supabaseAdmin.from('compta_reglages')
    .upsert({ artisan_id: session.uid, ...r, updated_at: new Date().toISOString() }, { onConflict: 'artisan_id' })
  if (error) { console.error('[compta/reglages] écriture', error.message); return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 503 }) }
  return NextResponse.json({ ok: true, reglages: r })
}
