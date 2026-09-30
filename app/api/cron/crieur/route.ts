import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sortiePermise } from '@/lib/agents/sortie'
import { signalerProgrammees } from '@/lib/crieur/pauseProgrammees'
import { ops_battement } from '@/lib/agents/bus'
import { enregistrerPassage } from '@/lib/alertes'
import { notifierEntreprise } from '@/lib/email'
import { FLAGS, actif } from '@/lib/flags'
import { composerLot, cleSemaine, horairesSemaine, PHRASES_GABARIT } from '@/lib/crieur/composer'
import { FAITS } from '@/lib/crieur/faits'
import { jugerPublication } from '@/lib/crieur/juge'
import { connexions, creerPublication } from '@/lib/crieur/publora'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ligne = { semaine: string; canal: string; fait_ids: string[]; statut: string; programmee_pour: string | null; cree_le: string }

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  // Pause générale (ou doute sur sa lecture) : aucun nouveau dépôt, et les publications DÉJÀ programmées dans Publora, que Presti ne
  // peut pas arrêter d'ici, sont comptées et signalées au fondateur (lib/crieur/pauseProgrammees.ts). Registre illisible : 503, avec la raison.
  if (!(await sortiePermise()).permise) {
    const bilan = await signalerProgrammees()
    if (!bilan.ok) return NextResponse.json({ pause: true, erreur: bilan.raison }, { status: 503 })
    return NextResponse.json({ pause: true, programmees_a_signaler: bilan.programmees, signalees: bilan.signalees })
  }

  const maintenant = new Date()
  const semaine = cleSemaine(maintenant)
  const drapeaux = { ...FLAGS, aimantSite: actif('aimantSite') }
  const aSec = new URL(req.url).searchParams.get('a_sec') === '1'
  let brouillons = 0, refusees = 0, erreurs = 0
  let interrompue = false
  const accords: string[] = []
  const incidents: string[] = []
  try {
    const moisParis = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(maintenant)
    const debut = new Date(maintenant.getTime() - 32 * 86_400_000).toISOString()
    const lecture = await supabaseAdmin.from('crieur_posts').select('semaine,canal,fait_ids,statut,programmee_pour,cree_le').gte('cree_le', debut)
    if (lecture.error) throw new Error('Lecture du registre Crieur impossible')
    const lignes = (lecture.data || []) as Ligne[]
    const duMois = lignes.filter((l) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(new Date(l.cree_le)) === moisParis)
    const etat = {
      publies_mois: duMois.filter((l) => l.statut !== 'erreur' && l.statut !== 'externe').length,
      externes_mois: duMois.filter((l) => l.statut === 'externe').length,
      programmees_a_venir: lignes.filter((l) => ['programmee', 'brouillon_publora'].includes(l.statut) && new Date(l.programmee_pour || '').getTime() > maintenant.getTime()).length,
      recents: lignes.filter((l) => l.statut !== 'erreur').flatMap((l) => (l.fait_ids || []).map((fait_id) => ({ fait_id, date: l.cree_le }))),
      canaux_semaine: lignes.filter((l) => l.semaine === semaine && ['programmee', 'brouillon_publora'].includes(l.statut)).map((l) => l.canal),
      drapeaux,
    }
    const lot = composerLot(etat, maintenant, { horizonHeures: 26 })
    if (aSec) return NextResponse.json({ semaine, lot })
    if (!lot.length) {
      const creneaux = horairesSemaine(maintenant).filter((d) => d.getTime() > maintenant.getTime() && d.getTime() - maintenant.getTime() <= 26 * 3_600_000)
      const canalDuJour = (d: Date) => ({ 1: 'instagram', 3: 'facebook', 5: 'linkedin' } as Record<number, string>)[d.getUTCDay()]
      const deja = creneaux.some((d) => etat.canaux_semaine.includes(canalDuJour(d)))
      await enregistrerPassage('crieur', { semaine, brouillons, refusees, erreurs, detail: deja ? 'déjà inscrit' : creneaux.length ? 'rien à proposer' : 'aucun créneau dans les 26 h' }, true)
      const battement = await ops_battement({ p_nom: 'crieur' })
      if (!battement.ok) return NextResponse.json({ erreur: 'Battement Crieur impossible' }, { status: 503 })
      return NextResponse.json(deja ? { deja: true } : { semaine, brouillons, refusees, erreurs })
    }
    let plateformes: string[] | undefined
    for (const pub of lot) {
      // La pause est relue à CHAQUE publication : posée en cours de passage, le reste du lot n'est pas déposé.
      if (!(await sortiePermise()).permise) { interrompue = true; incidents.push('pause générale posée en cours de passage : le reste du lot n’est pas déposé'); break }
      const verdict = jugerPublication(pub, { faits: Object.fromEntries(FAITS.map((f) => [f.id, f])), phrasesGabarit: PHRASES_GABARIT, drapeaux })
      const raisons = verdict.ok ? ['preparation_en_cours'] : verdict.raisons
      // Réserver le couple semaine/canal AVANT Publora : la contrainte unique bloque un second appel concurrent.
      // Une réservation interrompue reste en erreur ; elle exige une reprise explicite, sans doubler un brouillon.
      const reservation = await supabaseAdmin.from('crieur_posts').insert({ semaine, canal: pub.canal, fait_ids: pub.fait_ids, texte: pub.texte, statut: 'erreur', programmee_pour: pub.programmee_pour, raisons }).select('id').single()
      if (reservation.error?.code === '23505') {
        erreurs++
        incidents.push(`${pub.canal} : créneau déjà réservé ; vérifier le brouillon existant avant toute reprise`)
        continue
      }
      if (reservation.error || !reservation.data?.id) throw new Error('Réservation du créneau Crieur impossible')
      if (!verdict.ok) { refusees++; erreurs++; incidents.push(`${pub.canal} : ${verdict.raisons.join(', ')}`); continue }
      try {
        plateformes ??= await connexions()
        const plateforme = plateformes.find((p) => p.startsWith(`${pub.canal}-`))
        if (!plateforme) throw new Error(`Connexion Publora absente : ${pub.canal}`)
        const publoraId = await creerPublication({ contenu: pub.texte, plateformes: [plateforme], ...(pub.canal === 'instagram' ? { medias: [`https://prestiapp.fr/api/crieur/visuel/${pub.visuel}.png`] } : {}) })
        const inscription = await supabaseAdmin.from('crieur_posts').update({ statut: 'brouillon_publora', publora_id: publoraId, raisons: [] }).eq('id', reservation.data.id)
        accords.push(`Canal : ${pub.canal}\nCréneau proposé : ${pub.programmee_pour}\nPublora : ${publoraId}\n${pub.texte}`)
        if (inscription.error) throw new Error(`Brouillon ${publoraId} créé, inscription impossible : ne pas le recréer`)
        brouillons++
      } catch (e) {
        erreurs++
        const raison = e instanceof Error ? e.message : 'Erreur Crieur'
        incidents.push(`${pub.canal} : ${raison}`)
        const inscription = await supabaseAdmin.from('crieur_posts').update({ raisons: [raison] }).eq('id', reservation.data.id)
        if (inscription.error) incidents.push('Registre des erreurs indisponible')
      }
    }
    const notification = await notifierEntreprise(`Crieur — ${accords.length} brouillons à accorder${erreurs ? ' — erreurs' : ''}`, `Accord requis pour chaque brouillon : programmez vous-même dans Publora ceux que vous acceptez.\n\n${accords.join('\n\n')}\n\n${incidents.join('\n')}`)
    if (!notification.ok) erreurs++
    await enregistrerPassage('crieur', { semaine, brouillons, refusees, erreurs }, erreurs === 0)
    if (erreurs === 0) {
      const battement = await ops_battement({ p_nom: 'crieur' })
      if (!battement.ok) return NextResponse.json({ erreur: 'Battement Crieur impossible' }, { status: 503 })
    }
    return NextResponse.json({ semaine, brouillons, refusees, erreurs, ...(interrompue ? { pause: true } : {}) }, { status: erreurs ? 503 : 200 })
  } catch (e) {
    const raison = e instanceof Error ? e.message : 'Erreur Crieur'
    if (!aSec) {
      await notifierEntreprise('Crieur — erreur, brouillons à accorder', [...accords, raison].join('\n\n'))
      await enregistrerPassage('crieur', { semaine, brouillons, refusees, erreurs: erreurs + 1, raison }, false)
    }
    return NextResponse.json({ erreur: raison }, { status: 503 })
  }
}
