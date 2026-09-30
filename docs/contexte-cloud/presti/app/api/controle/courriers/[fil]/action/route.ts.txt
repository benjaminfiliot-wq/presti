import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { lireUserAgent } from '@/lib/userAgent'
import { sendEmail, EMAIL_ENTREPRISE } from '@/lib/email'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { sujetReponse } from '@/lib/direction/courriers'
import { actif } from '@/lib/flags'
import { estNature, libelleNature } from '@/lib/direction/natures'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/controle/courriers/<fil>/action — classer un fil, ou y répondre.
//
//   classer   — statut, assignation à un fondateur, rattachement à un artisan. Pas de re-confirmation :
//               ranger sa propre boîte n'engage rien. Journalisé quand même : on doit pouvoir dire qui
//               a classé quoi, et un « classé » de trop se retrouve.
//   repondre  — un vrai email part, depuis l'adresse de Presti, dans le même fil. RE-CONFIRMÉ : un
//               message envoyé au nom de l'entreprise ne se rattrape pas.
type Corps = { action?: unknown; statut?: unknown; assigne_a?: unknown; artisan_id?: unknown; texte?: unknown; nature?: unknown }
const UUID = /^[0-9a-f-]{36}$/i

export async function POST(req: Request, ctx: { params: Promise<{ fil: string }> }) {
  if (!actif('messagerie')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'messagerie', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const { fil } = await ctx.params
  const cle = decodeURIComponent(fil).slice(0, 400)
  const b = (await req.json().catch(() => null)) as Corps | null
  const action = typeof b?.action === 'string' ? b.action : ''
  const u = lireUserAgent(req.headers.get('user-agent'))
  const agent = `${u.appareil} · ${u.navigateur}`.slice(0, 120)

  const { data: messages } = await supabaseAdmin.from('courriers')
    .select('id, message_id, sens, correspondant_email, correspondant_nom, sujet, statut, artisan_id, assigne_a, repondre_a')
    .eq('fil', cle).order('recu_le', { ascending: false }).limit(50)
  if (!messages?.length) return NextResponse.json({ error: 'Fil inconnu.' }, { status: 404 })
  // Même règle en écriture : on ne répond ni ne classe un fil qui ne nous est pas assigné.
  if (perimetre.borne && !messages.some((m) => m.assigne_a === f.uid)) return NextResponse.json({ error: 'Fil inconnu.' }, { status: 404 })
  const dernier = messages[0]

  if (action === 'classer') {
    const statut = typeof b?.statut === 'string' ? b.statut : null
    const assigne = typeof b?.assigne_a === 'string' && UUID.test(b.assigne_a) ? b.assigne_a : null
    const artisan = typeof b?.artisan_id === 'string' && UUID.test(b.artisan_id) ? b.artisan_id : null
    // La nature s'applique au FIL entier, comme le statut : une conversation a une nature, pas six.
    const nature = typeof b?.nature === 'string' ? b.nature : null
    if (statut && !['a_traiter', 'repondu', 'classe'].includes(statut)) return NextResponse.json({ error: 'Statut inconnu.' }, { status: 400 })
    if (nature && !estNature(nature)) return NextResponse.json({ error: 'Cette nature n’existe pas.' }, { status: 400 })
    if (!statut && !assigne && !artisan && !nature) return NextResponse.json({ error: 'Rien à changer.' }, { status: 400 })

    let touches = 0
    for (const m of messages) {
      const { data, error } = await supabaseAdmin.rpc('classer_courrier', {
        p_acteur: f.uid, p_acteur_email: f.email, p_courrier: m.id,
        p_statut: statut, p_assigne: assigne, p_artisan: artisan, p_ip: f.ip, p_agent: agent, p_nature: nature,
      })
      if (error) { console.error('[courriers] classer :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
      const r = data as { etat?: string }
      if (r?.etat === 'assigne_inconnu') return NextResponse.json({ error: 'On n’assigne un message qu’à un fondateur.' }, { status: 400 })
      if (r?.etat === 'nature_inconnue') return NextResponse.json({ error: 'Cette nature n’existe pas.' }, { status: 400 })
      if (r?.etat === 'ok') touches++
    }
    const LIB: Record<string, string> = { a_traiter: 'à traiter', repondu: 'répondu', classe: 'classé' }
    const quoi = nature ? `rangé en « ${libelleNature(nature)} »` : statut ? LIB[statut] : 'mis à jour'
    return NextResponse.json({ ok: true, message: `Fil ${quoi} — ${touches} message${touches > 1 ? 's' : ''}.` })
  }

  if (action === 'repondre') {
    const texte = typeof b?.texte === 'string' ? b.texte.trim() : ''
    if (texte.length < 2) return NextResponse.json({ error: 'Le message est vide.' }, { status: 400 })
    if (texte.length > 10_000) return NextResponse.json({ error: 'Message trop long (10 000 caractères au maximum).' }, { status: 400 })
    const recu = messages.find((m) => m.sens === 'recu') ?? dernier
    // Le formulaire du site nous envoie le message depuis NOTRE propre adresse, avec celle du
    // visiteur en Reply-To. Sans cette ligne, « Répondre » écrivait à la boîte de l'entreprise :
    // le visiteur n'aurait rien reçu, et la réponse serait revenue à la relève suivante.
    const destinataire = (recu.repondre_a as string | null) ?? recu.correspondant_email
    if (!destinataire) return NextResponse.json({ error: 'Ce fil n’a pas d’adresse à qui répondre.' }, { status: 400 })

    const refus = await exigerReconfirmation(req, f.uid, 'artisan')
    if (refus) return refus

    const sujet = sujetReponse(recu.sujet)
    // L'intention avant l'envoi : un email parti sans trace serait pire qu'une trace sans email.
    if (!(await journaliser({ acteur: f, action: 'courrier_repondu', cible_type: 'courrier', cible_id: recu.id, artisan_id: recu.artisan_id, apres: { statut: 'tenté', a: destinataire, sujet, taille: texte.length }, reconfirme: true }, req))) return refusJournal()

    const r = await sendEmail({
      to: destinataire, subject: sujet,
      text: `${texte}\n\n-- \nBenjamin — Presti\n${EMAIL_ENTREPRISE}`,
      replyTo: EMAIL_ENTREPRISE, critique: true,
      entetes: { 'In-Reply-To': recu.message_id, References: cle === recu.message_id ? recu.message_id : `${cle} ${recu.message_id}` },
    })
    if (!r.ok) {
      await journaliser({ acteur: f, action: 'courrier_repondu', cible_type: 'courrier', cible_id: recu.id, apres: { statut: 'échec', erreur: r.error?.slice(0, 160) } }, req)
      return NextResponse.json({ error: `L’email n’est pas parti : ${r.error ?? 'raison inconnue'}` }, { status: 503 })
    }

    // La réponse rejoint le fil : sans ça, la conversation se lirait à trous.
    await supabaseAdmin.rpc('enregistrer_courrier', {
      p_message_id: `presti-${r.id ?? crypto.randomUUID()}@prestiapp.fr`, p_fil: cle, p_sens: 'envoye',
      p_email: destinataire, p_nom: recu.correspondant_nom, p_sujet: sujet,
      p_corps: texte, p_recu_le: new Date().toISOString(), p_boite: 'ENVOYES', p_uid: null,
    })
    await supabaseAdmin.rpc('fil_repondu', { p_fil: cle })
    await journaliser({ acteur: f, action: 'courrier_repondu', cible_type: 'courrier', cible_id: recu.id, artisan_id: recu.artisan_id, apres: { statut: 'envoyé', a: destinataire, sujet }, reconfirme: true }, req)
    return NextResponse.json({ ok: true, message: `Réponse envoyée à ${destinataire}.` })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}
