import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'
import { peutFaire } from '@/lib/controle/droits'
import { sourcer } from '@/lib/direction/fraicheur'
import { mrr, encaisseDuMois } from '@/lib/direction/stripe'
import { coutIADuMois, estimationDepuisLesCredits } from '@/lib/alertes'
import { seulsLesVrais } from '@/lib/direction/perimetre'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/barre — la barre d'état permanente du Poste de contrôle (prompt v11 §1).
//
// Ce qu'elle porte, et pourquoi cette liste-là : ce sont les cinq choses qu'on veut savoir SANS avoir à
// cliquer. Le service tient debout ou non ; ce qui est entré ce mois-ci ; ce qui rentre chaque mois ;
// ce que l'IA coûte face au budget ; et depuis quand ces chiffres datent.
//
// Une seule requête pour les cinq. Le composant est monté sur TOUTES les vues : lui faire appeler
// quatre routes au chargement, c'est quatre fois la latence à chaque changement d'onglet — et le cache
// de `sourcer` est partagé par clé, donc rien n'est recalculé ici qui l'aurait été ailleurs.
//
// Chaque valeur porte sa source et sa fraîcheur. Un chiffre sans provenance n'est pas affiché : il est
// remplacé par la raison de son absence.
type Etat = 'ok' | 'degrade' | 'incident'

const compteurs = (uid: string, borneJournal: boolean, voitMessagerie: boolean) =>
  sourcer(`barre:compteurs:${uid}`, 'supabase', async () => {
    const [alertes, courriers, artisans] = await Promise.all([
      supabaseAdmin.from('alertes').select('id', { count: 'exact', head: true }).is('acquittee_le', null),
      actif('messagerie') && voitMessagerie
        ? supabaseAdmin.from('courriers').select('id', { count: 'exact', head: true }).eq('statut', 'a_traiter')
        : Promise.resolve({ count: null }),
      seulsLesVrais(supabaseAdmin.from('artisans').select('id', { count: 'exact', head: true })),
    ])
    return {
      aFaire: alertes.count ?? 0,
      messages: courriers.count ?? null,
      clients: artisans.count ?? 0,
      // Le journal n'a pas de compteur : rien n'y « attend », il se consulte.
      journalBorne: borneJournal,
    }
  }, 30_000)

/**
 * Le service tient-il debout ? La barre ne refait PAS sa propre mesure : elle demande le même verdict
 * que le bandeau, aux mêmes contrôles.
 *
 * Sa première version sondait deux pages de son côté, et annonçait « Service normal » pendant que le
 * bandeau, dix pixels plus bas, disait « Service dégradé » (vu à l'œil le 07/09). Deux affirmations
 * contradictoires côte à côte détruisent la confiance dans tout l'écran, y compris dans ce qui est juste.
 */
const service = (origine: string, jeton: string | null) =>
  sourcer('barre:service', 'app', async () => {
    const r = await fetch(`${origine}/api/controle/etat`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'presti-barre', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
    })
    if (!r.ok) throw new Error(`état ${r.status}`)
    const j = (await r.json()) as { niveau: Etat; controles: { cle: string; etat: string; libelle: string }[] }
    const verts = j.controles.filter((c) => c.etat === 'ok').length
    const soucis = j.controles.filter((c) => c.etat === 'crit' || c.etat === 'warn').map((c) => c.libelle)
    return {
      etat: j.niveau,
      detail: j.niveau === 'ok' ? `${verts} contrôles verts` : soucis.slice(0, 2).join(', ') || 'un contrôle en défaut',
    }
  }, 60_000)

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)

  // La barre respecte le périmètre : le partenaire n'y voit ni la santé, ni le coût, ni l'encaissé de
  // l'entreprise. Elle ne se vide pas pour autant — elle montre ce qu'il a le droit de voir.
  const voit = (d: Parameters<typeof peutFaire>[1]) => peutFaire(f.roleInterne, d, 'voir').permis
  const voitSante = voit('sante')
  const voitCompta = voit('comptabilite')
  const voitClients = voit('clients')
  const vJournal = peutFaire(f.roleInterne, 'journal', 'voir')
  const journalBorne = !vJournal.permis || vJournal.borne

  const [c, s, m, e, ia] = await Promise.all([
    compteurs(f.uid, journalBorne, voit('messagerie')),
    voitSante ? service(new URL(req.url).origin, req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null) : Promise.resolve(null),
    voitClients ? mrr() : Promise.resolve(null),
    voitCompta ? encaisseDuMois() : Promise.resolve(null),
    voitCompta ? sourcer('barre:ia', 'anthropic', async () => {
      const r = await coutIADuMois()
      // Sans clé d'administration, on ne devine pas un coût : `sourcer` portera l'absence, et l'écran
      // dira pourquoi il n'affiche rien plutôt que d'écrire « 0 € ».
      if (!r) throw new Error('clé Anthropic Admin absente')
      const espace = process.env.ANTHROPIC_WORKSPACE_PRESTI
      const taux = Number(process.env.TAUX_USD_EUR) || 0.92
      const budget = Number(process.env.BUDGET_IA_MENSUEL_EUR) || null
      const facture = Math.round((espace && r.parEspace ? (r.parEspace[espace] ?? 0) : r.usd) * taux * 100) / 100
      // Un espace qui n'a encore rien facturé n'a pas coûté zéro : il n'a pas encore été facturé. La
      // barre reprend alors la MÊME estimation que la tuile, marquée comme telle — sans quoi on lisait
      // « 0,00 € » à côté de « ≈ 0,07 € », deux chiffres justes qui se contredisent à l'œil.
      if (espace && facture === 0) {
        const est = await estimationDepuisLesCredits()
        if (est && est.euros > 0) return { euros: Math.round(est.euros * 100) / 100, budget, perimetre: 'produit', estimation: true }
      }
      return { euros: facture, budget, perimetre: espace ? 'produit' : 'organisation', estimation: false }
    }, 300_000) : Promise.resolve(null),
  ])

  // La fraîcheur de la barre est celle de sa valeur la PLUS ANCIENNE : annoncer la plus récente
  // laisserait croire que tout vient d'être rafraîchi.
  const dates = [c?.a, s?.a, m?.a, e?.a, ia?.a].filter(Boolean) as string[]
  const synchro = dates.length ? dates.reduce((v, x) => (x < v ? x : v)) : new Date().toISOString()

  return NextResponse.json({
    service: s,
    mrr: m,
    encaisse: e,
    coutIA: ia,
    compteurs: c,
    synchro,
    role: f.role,
    roleInterne: f.roleInterne,
    a: new Date().toISOString(),
  })
}
