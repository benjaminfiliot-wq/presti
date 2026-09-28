// TÉMOIN du juge routes-acquisition-qa (026-037) : la route du Standard (026-094, point 2) : la relève du Gmail de
// prospection d'abord, même pendant la pause, puis le classement en code. Jamais servie par Presti.
import { NextResponse } from 'next/server'
import { ImapFlow } from 'imapflow'
import { pauseGenerale } from '@/lib/agents/pause'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { executerStandardiste, estStop } from '@/lib/agents/acquisition/standardiste'
import { releverGmail } from '@/lib/agents/acquisition/porteurs/gmail'
import { MESSAGERIES_GRATUITES } from '@/lib/agents/acquisition/contrat'
import { enregistrerPassage } from '@/lib/alertes'
import { battement } from '@/lib/agents/bus'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const echeance = Date.now() + 45_000
  const horloge = { maintenant: () => Date.now(), attendre: (ms: number) => new Promise((r) => setTimeout(r, ms)) }
  const releve = { etat: 'ok', messages: 0, stop: 0 }
  try {
    const user = process.env.PROSPECTION_GMAIL_USER, pass = process.env.PROSPECTION_GMAIL_PASS, adresse = process.env.ACQ_ADRESSE_REPONSE
    if (!user || !pass || !adresse) releve.etat = 'en_attente_gmail'
    else {
      const { data: curseur } = await supabaseAdmin.rpc('acq_curseur_lire', { p_nom: 'gmail' })
      const imap = new ImapFlow({ host: '{{HOTE_IMAP}}', port: 993, secure: true, auth: { user, pass }, logger: false })
      const r = await releverGmail({ imap, adresse, curseur: curseur ?? null })
      if ('erreur' in r) {
        releve.etat = r.erreur
        if (r.erreur === 'auth') await magasinSupabase.signal({ type: 'gmail_refus' })
      } else {
        for (const m of r.messages) {
          const rep = await magasinSupabase.reponseRecue({ source: 'courriel', canal: 'email_sollicite', id_externe: m.id_externe, texte: m.texte, auto: m.auto, accuse_site: m.accuse_site, en_reponse_a: m.en_reponse_a, imap_uid: m.imap_uid, de: m['de'] })
          releve.messages++
          if (rep?.nouvelle && estStop(m.texte)) {
            const de = String(m['de']).toLowerCase()
            const domaine = de.split('@')[1]
            const cles: Record<string, string> = { email: de }
            if (domaine && !MESSAGERIES_GRATUITES.includes(domaine)) cles.domaine = domaine
            if (rep.prospect?.siren) cles.siren = rep.prospect.siren
            if (rep.prospect?.domaine) cles.domaine = rep.prospect.domaine
            await magasinSupabase.opposer(cles, 'stop', 'courriel')
            await magasinSupabase.signal({ type: 'stop', envoi_id: null, modele_id: null })
            releve.stop++
          }
        }
        await supabaseAdmin.rpc('acq_curseur_poser', { p_nom: 'gmail', p_valeur: String(r.curseur_suivant ?? '') })
      }
    }
    const p = await pauseGenerale()
    if (p.active) return NextResponse.json({ pause: true, releve })
    if (await magasinSupabase.enPause('standardiste')) return NextResponse.json({ pause: true, releve })
    const bilan = await executerStandardiste({ magasin: magasinSupabase, lecteur: null, attendreUsine: true, horloge, echeance })
    await enregistrerPassage('acq-standardiste', { releve_etat: releve.etat, releve_messages: releve.messages, releve_stop: releve.stop, classees: bilan?.classees ?? 0 }, true)
    const b = await battement('standardiste')
    if (!b?.ok) console.error('[cron/standardiste] battement refusé')
    return NextResponse.json({ ok: true, releve })
  } catch (e) {
    await enregistrerPassage('acq-standardiste', { erreur: String(e instanceof Error ? e.message : e).slice(0, 160) }, false)
    return NextResponse.json({ error: 'échec' }, { status: 500 })
  }
}
