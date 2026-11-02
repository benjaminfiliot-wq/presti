import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { acompteALAcceptationDuDevis } from '@/lib/reglesServeur'
import { notifierArtisan } from '@/lib/notifications'
import { getIp, isBanned, recordAbuse, ipPseudonyme } from '@/lib/security'
import { consommerLimiteStricte } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».
import { refusSiSansPlateforme } from '@/lib/plateformeAccesServeur'

// Carte Devis dans la conversation (v4 §A3) : le client ACCEPTE ou DEMANDE UNE MODIFICATION
// depuis le fil. L'acceptation est horodatée et journalisée (IP + canal) — valeur probante.
// Accès par le jeton secret de la conversation, jamais par un identifiant devinable.

export const runtime = 'nodejs'

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const action = body?.action === 'accepter' ? 'accepter' : body?.action === 'modifier' ? 'modifier' : ''
    const commentaire = typeof body?.message === 'string' ? body.message.trim().slice(0, 2000) : ''
    if (!TOKEN_RE.test(token) || !action) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    if (typeof body?.website === 'string' && body.website.trim()) {
      await recordAbuse(ip, 'honeypot /api/conversation/devis')
      return NextResponse.json({ ok: true })
    }

    const { data: lead } = await supabaseAdmin
      .from('leads').select('id, artisan_id, nom_prospect, contact, statut').eq('token', token).maybeSingle()
    if (!lead) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    // 15/10 (Benj) : la plateforme commence avec Studio — l'artisan d'une offre sans plateforme ne reçoit plus rien ici, et aucun crédit n'est touché.
    const ferme = await refusSiSansPlateforme(lead.artisan_id)
    if (ferme) return ferme

    // Le devis visible du fil : jamais un brouillon.
    const { data: devis } = await supabaseAdmin
      .from('devis').select('id, numero, total_ttc, statut, accepte_le')
      .eq('lead_id', lead.id).in('statut', ['envoye', 'accepte', 'refuse'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!devis) return NextResponse.json({ error: 'Aucun devis à traiter.' }, { status: 404 })

    const { data: artisan } = await supabaseAdmin
      .from('artisans').select('nom, email').eq('id', lead.artisan_id).maybeSingle()
    const qui = lead.nom_prospect || lead.contact || 'Le client'

    if (action === 'accepter') {
      // Idempotent : un devis déjà accepté ne change pas d'horodatage (la preuve est figée).
      if (devis.statut === 'accepte') return NextResponse.json({ ok: true, deja: true })

      // … et l'idempotence est TENUE PAR LA BASE, pas par le test au-dessus. Un lire-puis-écrire
      // laisse passer deux requêtes concurrentes — double-clic du prospect, renvoi automatique du
      // navigateur sur réseau instable — et chacune émet alors sa facture d'acompte SCELLÉE. Deux
      // pièces numérotées dans la séquence continue, qu'on ne peut plus supprimer : il faudrait un
      // avoir pour réparer. Avec `.eq('statut', 'envoye')`, c'est Postgres qui arbitre, et une seule
      // des deux requêtes voit une ligne revenir.
      const { data: prise } = await supabaseAdmin.from('devis').update({
        statut: 'accepte',
        accepte_le: new Date().toISOString(),
        accepte_ip: ipPseudonyme(ip),
        accepte_canal: 'plateforme',
        updated_at: new Date().toISOString(),
      }).eq('id', devis.id).neq('statut', 'accepte').select('id')
      if (!prise || prise.length === 0) return NextResponse.json({ ok: true, deja: true })

      // Trace dans le fil : l'échange porte la preuve, pas seulement la table devis.
      await supabaseAdmin.from('messages').insert({
        lead_id: lead.id, sens: 'in', type: 'devis_accepte',
        contenu: `✅ ${qui} a accepté le devis ${devis.numero || ''} (${Number(devis.total_ttc || 0).toFixed(2)} € TTC).`,
      })
      await supabaseAdmin.from('leads')
        .update({ statut: lead.statut === 'perdu' ? lead.statut : 'gagne', updated_at: new Date().toISOString(), lu_le: null })
        .eq('id', lead.id)

      if (artisan?.email) {
        await notifierArtisan(lead.artisan_id, 'devis_accepte', artisan.email, {
          leadId: lead.id,
          subject: `✅ Devis accepté — ${qui}`,
          text: `Bonne nouvelle : ${qui} vient d'accepter votre devis ${devis.numero || ''} (${Number(devis.total_ttc || 0).toFixed(2)} € TTC) depuis votre espace de conversation.\n\nL'acceptation est horodatée et conservée avec l'échange.\n\nRetrouvez le dossier dans votre espace (Devis).`,
          replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
        }).catch(() => {})
      }
      // Règle d'automatisation (v5 §9) : « quand le client accepte → facture d'acompte de N % ».
      // Même chemin que la facture manuelle : mentions bloquantes, numérotation, scellement.
      // Un refus (mentions manquantes) ne casse pas l'acceptation — l'artisan est prévenu.
      // 02/11 (S5 du chantier 4) : jamais sans l'offre qui porte les règles (verrou dans lib/reglesServeur.ts) ; et, au choix de
      // l'artisan (décision de Benj), la facture part seule ou elle est préparée pour un clic (maillon acompte_seul).
      let facture: { numero: string } | null = null
      try {
        const r = await acompteALAcceptationDuDevis({ artisanId: lead.artisan_id, leadId: lead.id, devisId: devis.id, devisNumero: devis.numero ?? null, artisanEmail: artisan?.email ?? null, qui })
        if (r.fait === 'facture_emise') facture = { numero: r.numero }
      } catch (e) { console.error('[conversation/devis] acompte:', e) }
      return NextResponse.json({ ok: true, statut: 'accepte', ...(facture ? { facture } : {}) })
    }

    // Demande de modification : on ne touche pas au statut, on fait remonter la demande.
    // Même plafond que les autres routes de conversation (6 / 5 min) : chaque demande envoie un email à l'artisan.
    if (!(await consommerLimiteStricte(`conv:${lead.id}`, 6, 5 * 60))) {
      await recordAbuse(ip, 'flood /api/conversation/devis modifier')
      return NextResponse.json({ error: "Un instant — laissez le temps à l'artisan de vous répondre 🙂" }, { status: 429 })
    }
    await supabaseAdmin.from('messages').insert({
      lead_id: lead.id, sens: 'in', type: 'manuel',
      contenu: commentaire || `Bonjour, pouvez-vous modifier le devis ${devis.numero || ''} ?`,
    })
    await supabaseAdmin.from('leads')
      .update({ statut: lead.statut === 'gagne' || lead.statut === 'perdu' ? lead.statut : 'en_discussion', updated_at: new Date().toISOString(), lu_le: null })
      .eq('id', lead.id)
    if (artisan?.email) {
      await notifierArtisan(lead.artisan_id, 'devis_accepte', artisan.email, {
        leadId: lead.id,
        subject: `Modification demandée — devis ${devis.numero || ''}`,
        text: `${qui} demande une modification de votre devis ${devis.numero || ''} :\n\n« ${commentaire || '(sans précision)'} »\n\nRépondez-lui depuis votre espace (Messages).`,
        replyTo: lead.contact && lead.contact.includes('@') ? lead.contact : undefined,
      }).catch(() => {})
    }
    return NextResponse.json({ ok: true, statut: devis.statut })
  } catch (e) {
    console.error('[conversation/devis] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
