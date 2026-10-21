import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { getIp, ipPseudonyme } from '@/lib/security'
import { actif, enEssai } from '@/lib/flags'
import { ouvertPour } from '@/lib/essais'
import { peut } from '@/lib/plans'
import { suspensionEnCours } from '@/lib/suspension'
import { libelleNeutre, lireFormulairePointage, pagePointage, RE_JETON_POINTAGE, vuePointage, type TacheAuto } from '@/lib/crm/avancementAuto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// /pointage/<jeton> — la page de POINTAGE d'un chantier pour un COMPAGNON (décision B du 21/10 ; lien créé par
// POST /api/crm/chantiers/<id>/pointage, table chantier_pointage, migration 0174, drapeau crmPointage). Sans session : le jeton
// secret (32 octets aléatoires) est la seule clé, seule son empreinte est en base. Modèle : app/suivi/[jeton].
//   • drapeau d'abord ; débit limité par adresse ; jeton inconnu, révoqué ou mal formé → 404 sans un mot ;
//   • à CHAQUE requête : drapeau du CRM, offre du compte (capacité `crm`), compte non suspendu, chantier ni annulé ni terminé ;
//   • GET : les tâches restantes (libellé et pièce), l'avancement — jamais un prix, une adresse, un nom de client ; le chantier est
//     nommé NEUTREMENT (« Chantier réf. 3F2A — Maison », audit du 21/10, F4) : son titre peut contenir le nom ou l'adresse du client ;
//   • POST (formulaire, sans script) : coche « fait » les tâches NON FAITES de CE chantier, rien d'autre (jamais décocher). Le
//     déclencheur du CRM inscrit chaque tâche cochée au journal du chantier, comme un clic de l'artisan.
const ENTETES = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
}
const introuvable = () => new Response('Introuvable.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
const indisponible = () => new Response('Indisponible.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '300' } })
type Ctx = { params: Promise<{ jeton: string }> }

async function ouvrir(req: Request, ctx: Ctx, cleDebit: string, max: number): Promise<{ reponse: Response } | { chantierId: string; uid: string; entreprise: string | null; titre: string | null; taches: TacheAuto[] }> {
  if (!actif('crmPointage')) return { reponse: introuvable() }
  const { jeton } = await ctx.params
  const ip = ipPseudonyme(getIp(req)) ?? 'inconnue'
  if (!(await consommerLimite(`${cleDebit}:${ip}`, max, 600))) return { reponse: new Response('Trop de demandes.', { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '600' } }) }
  if (!RE_JETON_POINTAGE.test(jeton) || !enEssai('crm')) return { reponse: introuvable() }
  const empreinte = createHash('sha256').update(jeton).digest('hex')
  const { data: lien, error } = await supabaseAdmin.from('chantier_pointage').select('chantier_id, artisan_id').eq('jeton_empreinte', empreinte).maybeSingle()
  if (error || !lien) return { reponse: introuvable() }
  const uid = lien.artisan_id as string
  if (!ouvertPour('crm', uid)) return { reponse: introuvable() }
  const [{ data: art }, suspendu] = await Promise.all([supabaseAdmin.from('artisans').select('nom, plan').eq('id', uid).maybeSingle(), suspensionEnCours(uid)])
  if (!art || !peut(art.plan as string | null, 'crm') || suspendu) return { reponse: introuvable() }
  const [ch, ta] = await Promise.all([
    supabaseAdmin.from('chantiers').select(`statut${actif('crmAtelierVivant') ? ', type_batiment' : ''}`).eq('id', lien.chantier_id).eq('artisan_id', uid).maybeSingle(),
    supabaseAdmin.from('chantier_taches').select(`id, libelle, faite${actif('crmPlan') ? ', piece' : ''}`).eq('chantier_id', lien.chantier_id).eq('artisan_id', uid).limit(1000),
  ])
  if (ch.error || ta.error) { console.error('[pointage] lecture :', (ch.error ?? ta.error)?.message); return { reponse: indisponible() } }
  const chd = ch.data as { statut?: string; type_batiment?: string | null } | null
  if (!chd || chd.statut === 'annule' || chd.statut === 'termine') return { reponse: introuvable() }
  void supabaseAdmin.from('chantier_pointage').update({ dernier_acces_le: new Date().toISOString() }).eq('chantier_id', lien.chantier_id).eq('artisan_id', uid).then(() => undefined, () => undefined)
  return { chantierId: lien.chantier_id as string, uid, entreprise: art.nom as string | null, titre: libelleNeutre(lien.chantier_id as string, chd.type_batiment ?? null), taches: (ta.data ?? []) as unknown as TacheAuto[] }
}

export async function GET(req: Request, ctx: Ctx) {
  const o = await ouvrir(req, ctx, 'pointage', 60)
  if ('reponse' in o) return o.reponse
  return new Response(pagePointage(vuePointage({ entreprise: o.entreprise, titre: o.titre, taches: o.taches })), { status: 200, headers: ENTETES })
}

export async function POST(req: Request, ctx: Ctx) {
  const o = await ouvrir(req, ctx, 'pointage-envoi', 20)
  if ('reponse' in o) return o.reponse
  if (!/^application\/x-www-form-urlencoded/i.test(req.headers.get('content-type') ?? '')) return new Response('Envoi invalide.', { status: 415 })
  const permis = new Set(o.taches.filter((t) => !t.faite).map((t) => t.id.toLowerCase()))
  const ids = lireFormulairePointage(await req.text(), permis)
  let message = 'Rien de coché : rien n’a changé.'
  if (ids.length) {
    // Seulement des tâches NON FAITES de CE chantier et de CE compte (trois filtres) ; jamais l'inverse.
    const { data, error } = await supabaseAdmin.from('chantier_taches').update({ faite: true, faite_le: new Date().toISOString() })
      .in('id', ids).eq('chantier_id', o.chantierId).eq('artisan_id', o.uid).eq('faite', false).select('id')
    if (error) { console.error('[pointage] écriture :', error.message); return indisponible() }
    const n = (data ?? []).length
    message = `${n} tâche${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''} comme faite${n > 1 ? 's' : ''}. Merci !`
    const faites = new Set((data ?? []).map((t) => String(t.id)))
    for (const t of o.taches) if (faites.has(t.id)) t.faite = true
  }
  return new Response(pagePointage(vuePointage({ entreprise: o.entreprise, titre: o.titre, taches: o.taches, message })), { status: 200, headers: ENTETES })
}
