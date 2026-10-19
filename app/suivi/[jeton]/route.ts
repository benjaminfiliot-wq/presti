import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { getIp, ipPseudonyme } from '@/lib/security'
import { actif, enEssai } from '@/lib/flags'
import { ouvertPour } from '@/lib/essais'
import { peut } from '@/lib/plans'
import { suspensionEnCours } from '@/lib/suspension'
import { pageSuivi, RE_JETON_SUIVI, vueSuivi } from '@/lib/crm/suivi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /suivi/<jeton> — la page de SUIVI d'un chantier pour le CLIENT (plan du 18/10, n°8, version 3 ; lien créé par
// POST /api/crm/chantiers/<id>/suivi, table chantier_suivi, migration 0167). Sans session : le jeton secret (32 octets aléatoires)
// est la seule clé, et seule son empreinte est en base. Modèle : app/rendez-vous/[jeton] et app/api/agenda/[jeton].
//   • drapeau d'abord ; 60 lectures par 10 minutes et par adresse ; jeton inconnu, révoqué ou mal formé → 404 sans un mot ;
//   • à CHAQUE lecture : drapeau du CRM, offre du compte (capacité `crm`), compte non suspendu ;
//   • le contenu : lib/crm/suivi.ts (avancement par pièce, dates, nom de l'entreprise) — jamais un prix, une adresse, un nom de
//     client ou de compagnon, un libellé de tâche, une photo. Page autonome : aucun script, aucune ressource extérieure.
const ENTETES = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
}
const introuvable = () => new Response('Introuvable.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })

export async function GET(req: Request, ctx: { params: Promise<{ jeton: string }> }) {
  // Drapeau baissé (lib/flags.ts, crmSuivi) : 404 avant toute lecture.
  if (!actif('crmSuivi')) return introuvable()
  const { jeton } = await ctx.params
  const ip = ipPseudonyme(getIp(req)) ?? 'inconnue'
  if (!(await consommerLimite(`suivi:${ip}`, 60, 600))) return new Response('Trop de demandes.', { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '600' } })
  if (!RE_JETON_SUIVI.test(jeton) || !enEssai('crm')) return introuvable()
  const empreinte = createHash('sha256').update(jeton).digest('hex')
  const { data: lien, error } = await supabaseAdmin.from('chantier_suivi').select('chantier_id, artisan_id').eq('jeton_empreinte', empreinte).maybeSingle()
  if (error || !lien) return introuvable()
  const uid = lien.artisan_id as string
  if (!ouvertPour('crm', uid)) return introuvable()
  const [{ data: art }, suspendu] = await Promise.all([supabaseAdmin.from('artisans').select('nom, plan').eq('id', uid).maybeSingle(), suspensionEnCours(uid)])
  if (!art || !peut(art.plan as string | null, 'crm') || suspendu) return introuvable()

  const [ch, ta] = await Promise.all([
    supabaseAdmin.from('chantiers').select('titre, statut, date_debut, date_fin_prevue, date_fin_reelle, maj_le').eq('id', lien.chantier_id).eq('artisan_id', uid).maybeSingle(),
    supabaseAdmin.from('chantier_taches').select(`id, libelle, faite, faite_le, membre_id${actif('crmPlan') ? ', piece' : ''}`).eq('chantier_id', lien.chantier_id).eq('artisan_id', uid).limit(1000),
  ])
  if (ch.error || ta.error) { console.error('[suivi] lecture :', (ch.error ?? ta.error)?.message); return new Response('Indisponible.', { status: 503, headers: { 'Retry-After': '300' } }) }
  if (!ch.data || ch.data.statut === 'annule') return introuvable()
  void supabaseAdmin.from('chantier_suivi').update({ dernier_acces_le: new Date().toISOString() }).eq('chantier_id', lien.chantier_id).eq('artisan_id', uid).then(() => undefined, () => undefined)
  const vue = vueSuivi({ entreprise: art.nom as string | null, chantier: ch.data as Parameters<typeof vueSuivi>[0]['chantier'], taches: (ta.data ?? []) as unknown as Parameters<typeof vueSuivi>[0]['taches'] })
  return new Response(pageSuivi(vue), { status: 200, headers: ENTETES })
}
