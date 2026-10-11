import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { stationHorsWebPourRequete } from '@/lib/stationHorsWeb'
import { estFondateur, estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { validerReglages, CLES_REGLAGES, OCTETS_MAX } from '@/lib/pilotage/reglages'
import themeStation from '@/scripts/fixtures/026-pilotage/k/themes/essai/theme.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const erreur = (message: string, status: number) => NextResponse.json({ error: message }, { status })
const actionStation = 'station_reglages' as Parameters<typeof journaliser>[0]['action']

export async function GET(req: Request) {
  if (!actif('pilotage')) return erreur('Introuvable.', 404)
  if (stationHorsWebPourRequete(req)) return erreur('Introuvable.', 404)
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const droit = exigerDomaine(f, 'sante', 'voir')
  if (domaineRefuse(droit)) return reponseRefus(droit)

  try {
    const { data, error: panne } = await supabaseAdmin.rpc('station_reglages_lire')
    if (panne || !Array.isArray(data) || !data[0]) return erreur('Réglages indisponibles pour l’instant.', 503)
    const { version, reglages, modifie_par, modifie_le } = data[0]
    return NextResponse.json({ version, reglages, modifie_par, modifie_le })
  } catch {
    return erreur('Réglages indisponibles pour l’instant.', 503)
  }
}

export async function PUT(req: Request) {
  if (!actif('pilotage')) return erreur('Introuvable.', 404)
  if (stationHorsWebPourRequete(req)) return erreur('Introuvable.', 404)
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const droit = exigerDomaine(f, 'reglages', 'ecrire')
  if (domaineRefuse(droit)) return reponseRefus(droit)

  let corps: unknown
  try {
    const texte = await req.text()
    if (new TextEncoder().encode(texte).length > OCTETS_MAX) return erreur('64 Ko au plus.', 413)
    corps = JSON.parse(texte)
  } catch {
    return erreur('Corps JSON invalide.', 400)
  }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return erreur('Corps invalide.', 400)
  const { reglages, version } = corps as Record<string, unknown>
  if (!Number.isSafeInteger(version) || (version as number) < 0) return erreur('Version invalide.', 400)

  const valide = validerReglages(reglages, themeStation)
  if (!valide.ok) return NextResponse.json({ erreurs: valide.raisons, clesPermises: valide.clesPermises }, { status: 400 })

  const jour = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  if (!(await consommerLimite(`station:reglages:${f.uid}:${jour}`, 30, 86_400))) return erreur('30 réglages par jour au plus.', 429)

  let journalAvant = false
  try {
    journalAvant = await journaliser({ acteur: f, action: actionStation, cible_type: 'station', cible_id: 'reglages', avant: { version } }, req)
  } catch {
    return refusJournal()
  }
  if (!journalAvant) return refusJournal()

  try {
    const { data, error: panne } = await supabaseAdmin.rpc('station_reglages_ecrire', {
      p_reglages: valide.reglages, p_auteur: f.uid, p_version: version as number,
    })
    if (panne) {
      const message = panne.message ?? ''
      if (message.includes('ops:version_perimee')) return erreur('Réglages modifiés ailleurs : recharge.', 409)
      if (message.includes('ops:cle_inconnue')) return NextResponse.json({ erreurs: ['Clé inconnue.'], clesPermises: [...CLES_REGLAGES] }, { status: 400 })
      if (message.includes('ops:trop_gros')) return erreur('64 Ko au plus.', 413)
      if (message.includes('ops:auteur')) return erreur('Accès refusé.', 403)
      return erreur('Réglages indisponibles pour l’instant.', 503)
    }
    try {
      await journaliser({ acteur: f, action: actionStation, cible_type: 'station', cible_id: 'reglages', apres: { version: data } }, req)
    } catch (e) {
      console.error('[station] journal du résultat indisponible :', e)
    }
    return NextResponse.json({ version: data })
  } catch {
    return erreur('Réglages indisponibles pour l’instant.', 503)
  }
}
