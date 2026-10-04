import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'
import { peutFaire } from '@/lib/controle/droits'
import { sourcer } from '@/lib/direction/fraicheur'
import { mrr, encaisseDuMois } from '@/lib/direction/stripe'
import { coutIADuMois, estimationDepuisLesCredits } from '@/lib/alertes'
import { seulsLesVrais } from '@/lib/direction/perimetre'
import { actif } from '@/lib/flags'
import { santeService } from '@/lib/controle/lectures'

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
const compteurs = (uid: string, borneJournal: boolean, voitMessagerie: boolean, voitAlertes: boolean) =>
  // La clé de cache porte le périmètre : sans ça, la réponse mise en cache pour un fondateur
  // serait resservie au partenaire trente secondes plus tard, avec le compteur qu'on vient de lui
  // fermer. Un cache qui ignore les droits les annule.
  sourcer(`barre:compteurs:${uid}:${voitAlertes ? 'a' : '-'}${voitMessagerie ? 'm' : '-'}`, 'supabase', async () => {
    const [alertes, courriers, artisans] = await Promise.all([
      voitAlertes
        ? supabaseAdmin.from('alertes').select('id', { count: 'exact', head: true }).is('acquittee_le', null)
        : Promise.resolve({ count: null }),
      actif('messagerie') && voitMessagerie
        ? supabaseAdmin.from('courriers').select('id', { count: 'exact', head: true }).eq('statut', 'a_traiter')
        : Promise.resolve({ count: null }),
      seulsLesVrais(supabaseAdmin.from('artisans').select('id', { count: 'exact', head: true })),
    ])
    return {
      // `null` et non 0 : l'écran doit pouvoir dire « pas dans votre périmètre », pas « rien à faire ».
      aFaire: voitAlertes ? (alertes.count ?? 0) : null,
      messages: courriers.count ?? null,
      clients: artisans.count ?? 0,
      // Le journal n'a pas de compteur : rien n'y « attend », il se consulte.
      journalBorne: borneJournal,
    }
  }, 30_000)

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
    // Le compteur d'alertes relève du domaine `sante`, que la matrice ferme au partenaire : la
    // barre le lui rendait alors que /api/controle/a-faire le lui refuse. Deux écrans, deux
    // réponses — et c'est toujours le plus bavard qui gagne.
    compteurs(f.uid, journalBorne, voit('messagerie'), voitSante),
    voitSante ? santeService(new URL(req.url).origin, req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null) : Promise.resolve(null),
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
