import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { boiteEntreprise } from '@/lib/direction/courriers'
import { actif } from '@/lib/flags'
import { estNature } from '@/lib/direction/natures'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/courriers — la boîte de l'entreprise, par FIL (prompt v10 §2.3).
//
// Un fil, une ligne : le dernier message donne le titre et la date, le statut du fil est le plus
// urgent de ses messages. C'est ce qu'on veut voir d'un coup d'œil — une pile de fils à traiter,
// pas une liste de messages où la même conversation revient six fois.
export async function GET(req: Request) {
  if (!actif('messagerie')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'messagerie', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const url = new URL(req.url)
  const filtre = url.searchParams.get('statut') ?? 'a_traiter'
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80)
  // « toutes » par défaut : une nature est un filtre, pas un dossier. Le jour où le défaut serait
  // une nature précise, le reste du courrier disparaîtrait de la vue principale sans prévenir.
  const nat = url.searchParams.get('nature') ?? 'toutes'
  if (nat !== 'toutes' && !estNature(nat)) return NextResponse.json({ error: 'Cette nature n’existe pas.' }, { status: 400 })

  // Les colonnes de nature arrivent avec la migration 0072. Tant qu'elle n'est pas collée, les
  // demander fait échouer la requête entière et l'écran répond 503 : la boîte devient illisible
  // pour une fonctionnalité qui n'est même pas encore ouverte (constaté en production le 07/09).
  // On lit donc avec, puis sans — un courrier lisible sans son rangement vaut mieux qu'une erreur.
  // Écrites en toutes lettres : le typage de supabase-js analyse le LITTÉRAL du select pour déduire
  // la forme du résultat. Un template le rend aveugle, et plus aucune colonne n'est vérifiée.
  const lire = (avecNature: boolean) => {
    let r = supabaseAdmin.from('courriers')
      .select(avecNature
        ? 'id, fil, sens, correspondant_email, correspondant_nom, sujet, apercu, recu_le, statut, assigne_a, artisan_id, nature, nature_source, nature_motif'
        : 'id, fil, sens, correspondant_email, correspondant_nom, sujet, apercu, recu_le, statut, assigne_a, artisan_id')
      .order('recu_le', { ascending: false }).limit(300)
    if (filtre !== 'tous') r = r.eq('statut', filtre)
    if (avecNature && nat !== 'toutes') r = r.eq('nature', nat)
    // Le partenaire ne voit que les fils qui LUI sont assignés (v11 §5) — pas la boîte de l'entreprise.
    if (perimetre.borne) r = r.eq('assigne_a', f.uid)
    if (q) r = r.or(`sujet.ilike.%${q}%,correspondant_email.ilike.%${q}%,correspondant_nom.ilike.%${q}%,apercu.ilike.%${q}%`)
    return r
  }
  type Ligne = { id: string; fil: string; sens: string; correspondant_email: string; correspondant_nom: string | null
    sujet: string | null; apercu: string | null; recu_le: string; statut: string; assigne_a: string | null; artisan_id: string | null
    nature?: string | null; nature_source?: string | null; nature_motif?: string | null }
  const premier = await lire(true)
  let data = premier.data as Ligne[] | null
  let error = premier.error
  let natureConnue = true
  if (error && /column|does not exist|42703|schema cache/i.test(error.message)) {
    console.warn('[courriers] migration 0072 absente : la boîte s’affiche sans les natures.')
    natureConnue = false
    const r = await lire(false)
    data = r.data as Ligne[] | null; error = r.error
  }
  if (error) return NextResponse.json({ error: 'Boîte indisponible pour l’instant.' }, { status: 503 })

  const parFil = new Map<string, { fil: string; sujet: string | null; correspondant: string; email: string; dernier: string; messages: number; statut: string; artisan_id: string | null; sens: string; nature: string; nature_source: string; nature_motif: string | null }>()
  for (const c of data ?? []) {
    const e = parFil.get(c.fil)
    if (!e) {
      parFil.set(c.fil, {
        fil: c.fil, sujet: c.sujet, correspondant: c.correspondant_nom || c.correspondant_email, email: c.correspondant_email,
        dernier: c.recu_le, messages: 1, statut: c.statut, artisan_id: c.artisan_id, sens: c.sens,
        // Les lignes arrivent du plus récent au plus ancien : le premier vu donne la nature du fil.
        nature: c.nature ?? 'a_lire', nature_source: c.nature_source ?? 'auto', nature_motif: c.nature_motif ?? null,
      })
    } else {
      e.messages++
      // Le fil est « à traiter » dès qu'un seul de ses messages l'est.
      if (c.statut === 'a_traiter') e.statut = 'a_traiter'
      if (!e.artisan_id && c.artisan_id) e.artisan_id = c.artisan_id
      // Une correction faite à la main gagne, même sur un message plus ancien : la nature d'un fil,
      // c'est celle que la personne a choisie, pas celle que la règle a recalculée depuis.
      if (c.nature_source === 'manuel' && e.nature_source !== 'manuel') {
        e.nature = c.nature ?? e.nature; e.nature_source = 'manuel'; e.nature_motif = c.nature_motif ?? null
      }
    }
  }
  const fils = [...parFil.values()].sort((a, b) => b.dernier.localeCompare(a.dernier))
  const { count: aTraiter } = await supabaseAdmin.from('courriers').select('id', { count: 'exact', head: true }).eq('statut', 'a_traiter')
  // Les compteurs viennent de la BASE, pas des 300 lignes chargées plus haut : une pastille dérivée
  // d'une page mentirait dès que la boîte grossit, et un compteur qui ment est pire qu'aucun.
  const { data: parNature } = natureConnue
    ? await supabaseAdmin.rpc('compter_courriers_par_nature', { p_assigne: perimetre.borne ? f.uid : null })
    : { data: null }

  return NextResponse.json({
    fils, aTraiter: aTraiter ?? 0, parNature: (parNature as Record<string, number>) ?? {}, nature: nat,
    // L'écran cache la rangée des piles tant que la base ne sait pas classer : proposer un filtre
    // qui ne filtre rien serait pire que ne rien proposer.
    natureConnue,
    configuree: !!boiteEntreprise(), role: f.role,
    source: { source: 'base', a: new Date().toISOString(), cache: false },
    a: new Date().toISOString(),
  })
}
