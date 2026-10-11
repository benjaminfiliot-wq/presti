import { NextResponse } from 'next/server'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { executerStandardiste, estStop } from '@/lib/agents/acquisition/standardiste'
import { releverGmail } from '@/lib/agents/acquisition/porteurs/gmail'
import { boiteProspection, adresseFil } from '@/lib/agents/acquisition/boiteProspection'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { MESSAGERIES_GRATUITES } from '@/lib/agents/acquisition/contrat'
import { enregistrerPassage } from '@/lib/alertes'
import { ops_battement } from '@/lib/agents/bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function adresseExpediteur(brut: string): string | null {
  const adresse = brut.trim().toLowerCase().replace(/^.*<([^<>]+)>$/, '$1')
  return /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(adresse) ? adresse : null
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const releve = { messages: 0, stop: 0, etat: 'en_attente_gmail' }
  try {
    // La boîte dédiée, sinon le mode « fil seul » de la boîte de l'entreprise (boiteProspection.ts, décision du 07/10) : la
    // relève ne cherche, côté serveur, QUE les messages adressés à l'adresse « plus » du fil ; jamais la boîte entière.
    const boite = boiteProspection()
    const filSeulSur = !boite || boite.source !== 'entreprise_fil_seul' || (boite.adresse === adresseFil(boite.user) && boite.adresse.includes('+'))
    const user = filSeulSur ? boite?.user : undefined, pass = filSeulSur ? boite?.pass : undefined, adresse = filSeulSur ? boite?.adresse : undefined
    // 06/10 : après un refus d'identifiants (« auth »), on ne retente pas toutes les 5 minutes (Google bloque un compte qui insiste) : 6 h de pause.
    let refusRecent = false
    if (user && pass && adresse) {
      const refus = await supabaseAdmin.rpc('acq_curseur_lire', { p_nom: 'gmail_refus' })
      const le = Date.parse(String(refus.data ?? ''))
      refusRecent = Number.isFinite(le) && Date.now() - le < 6 * 3_600_000
      if (refusRecent) releve.etat = 'auth_en_attente'
    }
    if (user && pass && adresse && !refusRecent) {
      const lecture = await supabaseAdmin.rpc('acq_curseur_lire', { p_nom: 'gmail' })
      if (lecture.error) throw new Error('curseur')
      let precedent: { uid?: number; uid_validity?: number | null } = {}
      try { precedent = JSON.parse(String(lecture.data ?? '{}')) } catch { precedent = { uid: Number(lecture.data) || 0 } }
      const resultat = await releverGmail({ adresse, curseur: precedent.uid ?? 0, uidValidity: precedent.uid_validity, identifiants: { user, pass } })
      if ('erreur' in resultat) {
        releve.etat = resultat.erreur
        if (resultat.erreur === 'auth') {
          await magasinSupabase.signal({ type: 'gmail_refus' })
          await supabaseAdmin.rpc('acq_curseur_poser', { p_nom: 'gmail_refus', p_valeur: new Date().toISOString() })
        }
      } else {
        for (const message of resultat.messages) {
          const entree = {
            id_externe: message.id_externe, source: 'courriel', canal: 'email_sollicite', texte: message.texte,
            auto: message.auto, accuse_site: message.accuse_site, en_reponse_a: message.en_reponse_a,
            de: message.de, expediteur: message.de, imap_uid: message.imap_uid,
            recu_le: new Date().toISOString(), envoi_id: null, conversation_id: null, prospect_id: null,
          }
          const recu = await magasinSupabase.reponseRecue(entree as Parameters<typeof magasinSupabase.reponseRecue>[0])
          releve.messages++
          if (recu.nouvelle !== false && estStop(message.texte)) {
            const expediteur = adresseExpediteur(message.de)
            const cles: { email?: string; siren?: string; domaine?: string } = {}
            if (expediteur) cles.email = expediteur
            if (recu.prospect?.siren) cles.siren = recu.prospect.siren
            if (recu.prospect?.domaine && !MESSAGERIES_GRATUITES.includes(recu.prospect.domaine)) cles.domaine = recu.prospect.domaine
            const domaine = expediteur?.split('@')[1]
            if (!cles.domaine && domaine && !MESSAGERIES_GRATUITES.includes(domaine)) cles.domaine = domaine
            if (Object.keys(cles).length) await magasinSupabase.opposer(cles, 'stop', 'releve_gmail')
            await magasinSupabase.signal({ type: 'stop', envoi_id: (recu as { envoi_id?: string }).envoi_id })
            releve.stop++
          }
        }
        const pose = await supabaseAdmin.rpc('acq_curseur_poser', { p_nom: 'gmail', p_valeur: JSON.stringify({ uid: resultat.curseur_suivant, uid_validity: resultat.uid_validity }) })
        if (pose.error) throw new Error('curseur')
        await supabaseAdmin.rpc('acq_curseur_poser', { p_nom: 'gmail_refus', p_valeur: '' })
        releve.etat = 'ok'
      }
    }
    const pause = await pauseGenerale()
    if (!pause || pause.active) return NextResponse.json({ pause: true, releve })
    if (await magasinSupabase.enPause('standardiste')) return NextResponse.json({ pause: true, releve })
    const bilan = await executerStandardiste({ magasin: magasinSupabase, lecteur: null, attendreUsine: true, horloge: { maintenant: Date.now, attendre: (ms: number) => new Promise<void>(r => setTimeout(r, ms)) }, echeance: Date.now() + 45_000 })
    await enregistrerPassage('acq-standardiste', { releve, bilan }, true)
    try { await ops_battement({ p_nom: 'standardiste' }) } catch { console.error('[cron/standardiste] battement indisponible') }
    return NextResponse.json({ ok: true, releve, bilan })
  } catch {
    await enregistrerPassage('acq-standardiste', { erreur: 'execution', releve }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
