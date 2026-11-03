import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { computeTotals } from '@/lib/devisTotals'
import { normalizeLigne } from '@/lib/lignes'
import { authArtisan as verifierSession, estEchec } from '@/lib/authArtisan'
import { actif } from '@/lib/flags'
import { normaliserLot, typeDevisDemande } from '@/lib/facturesTypes'
import { colonnesLotsPresentes, INDISPONIBLE_0176 } from '@/lib/facturesTypesServeur'
import { ecrireEvenement, evenementDevisAPreparer } from '@/lib/evenements/ecrivain'

type LigneIn = { designation?: string; quantite?: number; unite?: string; prix_unitaire_ht?: number; tva_taux?: number }

// Crée un nouveau devis (numéro attribué en séquence continue).
export async function POST(req: Request) {
  try {
    // Contrôle central : refuse aussi les jetons antérieurs à une déconnexion globale (§11).
    const session = await verifierSession(req)
    if (estEchec(session)) return NextResponse.json({ error: session.error }, { status: session.status })
    const uid = session.uid

    const b = await req.json()
    const lignes: LigneIn[] = Array.isArray(b?.lignes) ? b.lignes : []
    // Garde-fou (I4) : un devis réel ne dépasse pas ~200 lignes → borne anti-DoS/coût.
    if (lignes.length > 200) {
      return NextResponse.json({ error: 'Trop de lignes (200 max).' }, { status: 400 })
    }
    const s = (v: unknown, n: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)

    // Franchise de TVA (défaut auto-entrepreneur) ⇒ 0 % ; sinon on garde le taux (0 réel préservé).
    const { data: art } = await supabaseAdmin.from('artisans').select('tva_regime').eq('id', uid).maybeSingle()
    const franchise = ((art?.tva_regime as string | null) || 'franchise') === 'franchise'
    const eff = lignes.map((l) => normalizeLigne(l, franchise))
    const totals = computeTotals(eff, Number(b?.remise_pct) || 0)

    // Devis PAR LOTS (drapeau `devisLots`, 0176) : `type_devis` et le `lot` de chaque ligne. Drapeau baissé : ignorés, rien n'est
    // écrit de plus qu'avant. Drapeau levé sans 0176 : « par lots » refusé en 503, un devis simple s'enregistre comme avant.
    const lotsOuverts = actif('devisLots')
    const typeDevis = lotsOuverts ? typeDevisDemande(b?.type_devis) : null
    const colonnesLots = lotsOuverts ? await colonnesLotsPresentes() : false
    if (typeDevis === 'lots' && !colonnesLots) return NextResponse.json({ error: INDISPONIBLE_0176 }, { status: 503 })
    const lignesEcrites = colonnesLots && typeDevis === 'lots'
      ? eff.map((l, i) => { const lot = normaliserLot((lignes[i] as { lot?: unknown })?.lot); return lot ? { ...l, lot } : l })
      : eff

    // C2 (audit de cohérence du 18/10) : le devis né d'une demande (« Créer un devis » depuis Messages ou le CRM, qui ouvrent
    // /devis/nouveau?lead=…) lui est RATTACHÉ. Sans ce lien : deux cartes au pipeline, pas de relances J+2/5/10 à l'envoi, pas
    // d'acceptation possible dans la conversation, demande jamais « gagnée ». La demande doit appartenir au compte de la
    // session : la clé de service passe outre la RLS, ce contrôle est la barrière. Vérifié AVANT de consommer un numéro.
    let leadId: string | null = null
    if (b?.lead_id !== undefined && b?.lead_id !== null && b?.lead_id !== '') {
      const brut = typeof b.lead_id === 'string' ? b.lead_id.trim().toLowerCase() : ''
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(brut)) {
        return NextResponse.json({ error: 'Demande : identifiant invalide.' }, { status: 400 })
      }
      const { data: lead, error: lErr } = await supabaseAdmin.from('leads').select('id').eq('id', brut).eq('artisan_id', uid).maybeSingle()
      if (lErr) { console.error('[devis] lecture de la demande :', lErr.message); return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 503 }) }
      if (!lead) return NextResponse.json({ error: 'La demande d’origine est introuvable : le devis n’a pas été créé.' }, { status: 404 })
      leadId = lead.id
    }

    // Numéro en séquence continue
    const { data: n } = await supabaseAdmin.rpc('next_numero', { p_artisan: uid, p_type: 'devis' })
    const numero = `DEV-${new Date().getFullYear()}-${String(n ?? 1).padStart(4, '0')}`

    const { data: devis, error: dErr } = await supabaseAdmin
      .from('devis')
      .insert({
        artisan_id: uid,
        numero,
        lead_id: leadId,
        objet: s(b?.objet, 300),
        statut: 'brouillon',
        validite_jours: Number(b?.validite_jours) || 90,
        remise_pct: Number(b?.remise_pct) || 0,
        acompte_pct: Number(b?.acompte_pct) || 0,
        conditions: s(b?.conditions, 4000),
        notes: s(b?.notes, 4000),
        client_nom: s(b?.client_nom, 160),
        client_email: s(b?.client_email, 200),
        client_adresse: s(b?.client_adresse, 300),
        total_ht: totals.total_ht,
        total_tva: totals.total_tva,
        total_ttc: totals.total_ttc,
        ...(colonnesLots ? { type_devis: typeDevis ?? 'simple' } : {}),
      })
      .select('id, numero')
      .single()
    if (dErr) {
      console.error('[devis] insert:', dErr.message)
      return NextResponse.json({ error: 'Création du devis impossible' }, { status: 500 })
    }

    if (lignesEcrites.length) {
      const { error: lErr } = await supabaseAdmin.from('devis_lignes').insert(
        lignesEcrites.map((l, i) => ({ devis_id: devis.id, ordre: i, ...l })),
      )
      // Audit argent du 21/10 (M2) : l'erreur n'était pas lue — un devis enregistré sans ses lignes. Le brouillon tout juste créé
      // est retiré (il n'a jamais quitté l'atelier), l'artisan garde sa saisie à l'écran.
      if (lErr) {
        console.error('[devis] lignes :', lErr.message)
        await supabaseAdmin.from('devis').delete().eq('id', devis.id).eq('artisan_id', uid).eq('statut', 'brouillon')
        return NextResponse.json({ error: 'Enregistrement des lignes impossible : le devis n’a pas été créé. Votre saisie est conservée à l’écran.' }, { status: 500 })
      }
    }

    // 036-036 : le fait « devis à préparer » pour le chef Devis de n8n (carte « devis prêt » en ombre). Après l'écriture du devis ET de ses
    // lignes ; idempotent (`devis_a_preparer:<devis>`), sans texte, jamais bloquant : son échec n'est qu'une ligne de journal, le devis est créé.
    if (actif('systemeAgents')) {
      const ev = await ecrireEvenement(supabaseAdmin, evenementDevisAPreparer({ artisanId: uid, devisId: devis.id, leadId, lignes: lignesEcrites.length }))
      if (!ev.ok) console.warn('[devis] événement devis_a_preparer non rangé :', ev.raison)
    }

    return NextResponse.json({ ok: true, id: devis.id, numero: devis.numero })
  } catch (e) {
    console.error('[devis] erreur inattendue:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
