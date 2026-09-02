import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateDevis } from '@/lib/ai'
import { resolveModel } from '@/lib/models'
import { consumeCredit } from '@/lib/credits'
import { computeTotals } from '@/lib/devisTotals'
import { normalizeLigne } from '@/lib/lignes'

export const runtime = 'nodejs'
export const maxDuration = 60

// Devis AUTOMATIQUE depuis une conversation : lit le fil, en fait un chiffrage IA complet,
// et crée un devis brouillon pré-rempli (client + lignes), prêt à relire/envoyer en 1 clic.
// Authentifié + vérif de propriété du lead + décompte crédit (au tier demandé).
export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(token)
    if (uErr || !userData?.user) return NextResponse.json({ error: 'Session expirée, reconnecte-toi.' }, { status: 401 })
    const uid = userData.user.id

    const body = await req.json().catch(() => ({}))
    const leadId = typeof body?.lead_id === 'string' ? body.lead_id : ''
    if (!leadId) return NextResponse.json({ error: 'Conversation manquante' }, { status: 400 })

    const { data: lead } = await supabaseAdmin
      .from('leads').select('id, artisan_id, nom_prospect, contact, message').eq('id', leadId).maybeSingle()
    if (!lead || lead.artisan_id !== uid) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })

    const { data: art } = await supabaseAdmin
      .from('artisans').select('nom, metier, plan, is_founder, tva_regime, metier').eq('id', uid).maybeSingle()
    if (!art) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    // Description = besoin initial + tous les messages du prospect (ce qu'il a dit).
    const { data: msgs } = await supabaseAdmin
      .from('messages').select('sens, contenu').eq('lead_id', leadId).order('sent_at')
    const dits = (msgs ?? []).filter((m) => m.sens === 'in').map((m) => (m.contenu ?? '').trim()).filter(Boolean)
    const description = (dits.length ? dits.join('\n') : (lead.message ?? '')).slice(0, 4000)
    if (!description.trim()) return NextResponse.json({ error: 'Pas assez d\'éléments dans la conversation pour chiffrer.' }, { status: 400 })

    const { model, tier } = resolveModel(body?.model, art.plan)
    const credit = await consumeCredit(uid, tier, !!art.is_founder)
    if (!credit.ok) return NextResponse.json({ error: credit.error, outOfCredits: true }, { status: 402 })

    // Bibliothèque de postes du métier (optionnelle).
    let postes: { designation: string; unite: string; prix_ht_min: number; prix_ht_max: number; tva_defaut: number }[] = []
    try {
      const { data } = await supabaseAdmin.from('postes_types').select('designation, unite, prix_ht_min, prix_ht_max, tva_defaut').eq('metier', art.metier ?? '')
      if (data) postes = data as typeof postes
    } catch { /* pas de biblio */ }

    const result = await generateDevis({ nom: art.nom, metier: art.metier }, description, postes, model)

    // Création du devis (même logique que /api/devis) : numéro, totaux, lignes.
    const franchise = ((art.tva_regime as string | null) || 'franchise') === 'franchise'
    const eff = result.lignes.map((l) => normalizeLigne(l, franchise))
    const totals = computeTotals(eff, 0)
    const { data: nn } = await supabaseAdmin.rpc('next_numero', { p_artisan: uid, p_type: 'devis' })
    const numero = `DEV-${new Date().getFullYear()}-${String(nn ?? 1).padStart(4, '0')}`
    const clientEmail = lead.contact && lead.contact.includes('@') ? lead.contact.slice(0, 200) : null

    const { data: devis, error: dErr } = await supabaseAdmin
      .from('devis')
      .insert({
        artisan_id: uid, lead_id: leadId, // rattache le devis à SA conversation (carte §A3)
        numero, statut: 'brouillon', validite_jours: 90, remise_pct: 0, acompte_pct: 30,
        objet: `${art.metier || 'Travaux'} — ${lead.nom_prospect || 'client'}`.slice(0, 300),
        notes: result.note?.slice(0, 4000) || null,
        client_nom: (lead.nom_prospect || '').slice(0, 160) || null,
        client_email: clientEmail,
        total_ht: totals.total_ht, total_tva: totals.total_tva, total_ttc: totals.total_ttc,
      })
      .select('id, numero').single()
    if (dErr) { console.error('[devis/auto] insert:', dErr.message); return NextResponse.json({ error: 'Création du devis impossible' }, { status: 500 }) }

    if (eff.length) await supabaseAdmin.from('devis_lignes').insert(eff.map((l, i) => ({ devis_id: devis.id, ordre: i, ...l })))

    // On relie la conversation au devis (statut) sans casser gagné/perdu.
    await supabaseAdmin.from('leads').update({ statut: 'devis', updated_at: new Date().toISOString() }).eq('id', leadId).not('statut', 'in', '("gagne","perdu")')

    return NextResponse.json({ ok: true, id: devis.id, numero: devis.numero, note: result.note })
  } catch (e) {
    console.error('[devis/auto]', e)
    return NextResponse.json({ error: "L'IA n'a pas pu générer le devis. Réessaie." }, { status: 500 })
  }
}
