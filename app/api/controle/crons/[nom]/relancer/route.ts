import { NextResponse } from 'next/server'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Relancer une tâche planifiée depuis le Poste de contrôle.
//
// Pourquoi cette route existe : la file « À faire » affichait « Relances de devis : en échec » sans
// offrir le moindre geste. Une file de choses à faire dont une ligne ne mène nulle part est une
// impasse — on la regarde tous les jours et on ne peut rien en faire. Le test du socle l'exigeait
// déjà (« chaque ligne a une action ») ; il avait raison, et il a fini par le prouver.
//
// Les routes de cron sont fermées par `CRON_SECRET`, qui n'est PAS un jeton de fondateur : c'est un
// secret de machine à machine. On ne le donne donc pas au navigateur — le serveur appelle la tâche
// pour lui, avec le secret qu'il possède déjà. Le fondateur, lui, prouve son identité normalement.
//
// Pas de re-confirmation : relancer une tâche ne décide rien, ça rejoue ce qui aurait dû tourner.
// Mais c'est journalisé, parce que ça peut envoyer des emails de relance aux prospects.

/** Les tâches qu'on accepte de relancer, et rien d'autre : un nom libre ouvrirait n'importe quelle
 *  route interne au premier qui devine son chemin. */
const TACHES: Record<string, { chemin: string; libelle: string }> = {
  relances: { chemin: '/api/cron/relances', libelle: 'Relances de devis' },
  alertes: { chemin: '/api/cron/alertes', libelle: 'Ronde des alertes' },
  'canaux-relever': { chemin: '/api/canaux/relever', libelle: 'Relève des canaux' },
  'purge-comptes': { chemin: '/api/cron/purge-comptes', libelle: 'Purge des comptes' },
}

export async function POST(req: Request, ctx: { params: Promise<{ nom: string }> }) {
  if (!actif('direction')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'sante', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const { nom } = await ctx.params
  const tache = TACHES[nom]
  if (!tache) return NextResponse.json({ error: 'Cette tâche n’existe pas.' }, { status: 404 })

  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Aucun secret de tâche n’est configuré : rien ne peut être relancé.' }, { status: 503 })

  // L'intention AVANT l'exécution : une relance qui part sans trace serait pire qu'une trace sans
  // relance — celle-ci peut envoyer de vrais emails à de vrais prospects.
  if (!(await journaliser({ acteur: f, action: 'cron_relance', cible_type: 'cron', cible_id: nom, apres: { statut: 'lancé' }, reconfirme: false }, req))) return refusJournal()

  const base = new URL(req.url).origin
  try {
    const r = await fetch(`${base}${tache.chemin}`, { headers: { Authorization: `Bearer ${secret}` } })
    const corps = await r.json().catch(() => null)
    await journaliser({ acteur: f, action: 'cron_relance', cible_type: 'cron', cible_id: nom, apres: { statut: r.ok ? 'terminé' : 'échec', http: r.status } }, req)
    if (!r.ok) return NextResponse.json({ error: `La tâche a répondu ${r.status}.`, detail: corps }, { status: 503 })
    return NextResponse.json({ ok: true, message: `${tache.libelle} : relancée.`, resultat: corps })
  } catch (e) {
    await journaliser({ acteur: f, action: 'cron_relance', cible_type: 'cron', cible_id: nom, apres: { statut: 'échec', erreur: (e as Error).message.slice(0, 160) } }, req)
    return NextResponse.json({ error: 'La tâche n’a pas pu être lancée.' }, { status: 503 })
  }
}
