import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'
import { peutFaire } from '@/lib/controle/droits'
import { sourcer } from '@/lib/direction/fraicheur'
import { mrr, encaisseDuMois } from '@/lib/direction/stripe'
import { coutIADuMois } from '@/lib/alertes'
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

/** Le service tient-il debout ? Deux sondes suffisent à la barre ; le détail est dans l'onglet Santé. */
const service = (origine: string) =>
  sourcer('barre:service', 'app', async () => {
    const sonde = async (url: string) => {
      const t = Date.now()
      try {
        const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000), headers: { 'User-Agent': 'presti-barre' } })
        return { ok: r.status === 200, ms: Date.now() - t }
      } catch { return { ok: false, ms: Date.now() - t } }
    }
    const [site, connexion] = await Promise.all([sonde(`${origine}/`), sonde(`${origine}/login`)])
    const etat: Etat = site.ok && connexion.ok ? 'ok' : !site.ok && !connexion.ok ? 'incident' : 'degrade'
    const lent = Math.max(site.ms, connexion.ms)
    return { etat, detail: etat === 'ok' ? `site et connexion en ${lent} ms` : etat === 'degrade' ? 'une page ne répond pas' : 'le site ne répond pas', ms: lent }
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
    voitSante ? service(new URL(req.url).origin) : Promise.resolve(null),
    voitClients ? mrr() : Promise.resolve(null),
    voitCompta ? encaisseDuMois() : Promise.resolve(null),
    voitCompta ? sourcer('barre:ia', 'anthropic', async () => {
      const r = await coutIADuMois()
      // Sans clé d'administration, on ne devine pas un coût : `sourcer` portera l'absence, et l'écran
      // dira pourquoi il n'affiche rien plutôt que d'écrire « 0 € ».
      if (!r) throw new Error('clé Anthropic Admin absente')
      const espace = process.env.ANTHROPIC_WORKSPACE_PRESTI
      const usd = espace && r.parEspace ? (r.parEspace[espace] ?? 0) : r.usd
      const budget = Number(process.env.BUDGET_IA_MENSUEL_EUR) || null
      return { euros: Math.round(usd * (Number(process.env.TAUX_USD_EUR) || 0.92) * 100) / 100, budget }
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
