// POST /api/controle/sites/<id>  { action: 'valider' | 'regenerer' | 'mettre_en_ligne', consigne?: string }
// La validation humaine d'un site généré (v15 §3.2, décision H2 : à 300 €, on ne met pas en ligne un site que
// personne n'a regardé). Trois gestes :
//   valider         : generee → validee (l'aperçu a été regardé, les scores sont verts) ;
//   regenerer       : generee → payee, avec une consigne obligatoire — la génération repart, la consigne est gardée ;
//   mettre_en_ligne : validee → en_ligne — le site déposé (bucket « sites ») est servi, le domaine déclaré rattaché.
// Direction seulement (domaine « clients », verbe « ecrire ») ; chaque geste est journalisé, et si le journal ne
// s'écrit pas, le geste est refusé (règle du Poste de contrôle).
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { journaliser } from '@/lib/direction/journal'
import { transitionValide, type EtatCommande } from '@/lib/siteCommande'
import { siteDepose } from '@/lib/sitesGeneres'
import { addDomain, normalizeDomain, type DnsRecord } from '@/lib/vercelDomains'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIONS = { valider: 'validee', regenerer: 'payee', mettre_en_ligne: 'en_ligne' } as const
type Action = keyof typeof ACTIONS

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'clients', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  const corps = await req.json().catch(() => ({})) as { action?: string; consigne?: string }
  const action = corps.action as Action
  if (!(action in ACTIONS)) return NextResponse.json({ error: 'Action inconnue : valider, regenerer ou mettre_en_ligne.' }, { status: 400 })
  const consigne = String(corps.consigne ?? '').replace(/<[^>]*>/g, '').trim().slice(0, 1000)
  if (action === 'regenerer' && consigne.length < 10) return NextResponse.json({ error: 'Une consigne de régénération est obligatoire (au moins 10 signes) : dire ce qui ne va pas.' }, { status: 400 })

  const { data: avant, error: eLecture } = await supabaseAdmin.from('sites_commandes').select('id, artisan_id, etat, regenerations, consigne, scores, domaine, domaine_mode').eq('id', id).maybeSingle()
  if (eLecture) return NextResponse.json({ error: 'Commande indisponible.', code: 'indisponible' }, { status: 503 })
  if (!avant) return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  const vers = ACTIONS[action]
  if (!transitionValide(avant.etat as EtatCommande, vers)) {
    return NextResponse.json({ error: `Impossible depuis l'état « ${avant.etat} » : ${action} demande une commande générée.` }, { status: 409 })
  }
  const maintenant = new Date().toISOString()
  // Mettre en ligne (validee → en_ligne) : le site doit être déposé, le domaine déclaré est rattaché au projet (Vercel)
  // et les enregistrements DNS à poser chez le registrar sont rendus à la direction pour l'artisan. Le sitemap se
  // soumet dans la Search Console — à la main, par Benj (H8) : rien ici ne le promet.
  let dns: DnsRecord[] = []
  if (action === 'mettre_en_ligne') {
    if (!(await siteDepose(id))) return NextResponse.json({ error: 'Aucun site déposé pour cette commande (scripts/site-deposer.mjs).' }, { status: 409 })
    const domaine = avant.domaine_mode !== 'aucun' && avant.domaine ? normalizeDomain(avant.domaine) : null
    if (domaine) {
      const statut = await addDomain(domaine)
      if (!statut.ok) return NextResponse.json({ error: `Domaine ${domaine} : ${statut.error || 'rattachement refusé'}` }, { status: 502 })
      dns = statut.records
    }
  }
  const maj = action === 'valider'
    ? { etat: vers, valide_le: maintenant, modifie_le: maintenant }
    : action === 'mettre_en_ligne'
      ? { etat: vers, en_ligne_le: maintenant, modifie_le: maintenant }
    : { etat: vers, consigne, regenerations: (avant.regenerations ?? 0) + 1, genere_le: null, scores: null, verifications: null, modifie_le: maintenant }
  // Le journal d'abord : s'il ne s'écrit pas, rien ne bouge.
  const journalise = await journaliser({
    acteur: f, action: action === 'valider' ? 'site_valide' : action === 'regenerer' ? 'site_regeneration' : 'site_en_ligne', cible_type: 'site_commande', cible_id: id, artisan_id: avant.artisan_id ?? undefined,
    avant: { etat: avant.etat, regenerations: avant.regenerations }, apres: { etat: vers, ...(action === 'regenerer' ? { consigne } : {}) }, reconfirme: false,
  }, req).catch(() => false)
  if (!journalise) return NextResponse.json({ error: 'Le journal de direction est indisponible : geste refusé.', code: 'indisponible' }, { status: 503 })
  // La condition sur l'état fait la sûreté : deux validations en même temps ne passent pas deux fois.
  const { data: passe, error: eMaj } = await supabaseAdmin.from('sites_commandes').update(maj).eq('id', id).eq('etat', avant.etat).select('id, etat, valide_le, regenerations, consigne')
  if (eMaj) return NextResponse.json({ error: 'Écriture impossible.', code: 'indisponible' }, { status: 503 })
  if (!passe || passe.length === 0) return NextResponse.json({ error: 'La commande a changé entre-temps : rechargez.' }, { status: 409 })
  // Le site livré est un site « commande » : l'origine de l'artisan change (§2.2), son site historique n'est pas touché.
  if (action === 'mettre_en_ligne' && avant.artisan_id) await supabaseAdmin.from('artisans').update({ site_origine: 'commande' }).eq('id', avant.artisan_id)
  return NextResponse.json({ ok: true, commande: passe[0], ...(action === 'mettre_en_ligne' ? { dns } : {}) })
}
