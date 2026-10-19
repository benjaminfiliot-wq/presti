import { createHash } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { getIp, ipPseudonyme } from '@/lib/security'
import { actif, enEssai } from '@/lib/flags'
import { ouvertPour } from '@/lib/essais'
import { peut } from '@/lib/plans'
import { suspensionEnCours } from '@/lib/suspension'
import { jourParis } from '@/lib/comptaTableau'
import { evenementsAgenda, genererIcs } from '@/lib/crm/ics'
import { adresseChantier } from '@/lib/crm/vue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/agenda/<jeton>.ics — le FLUX D'AGENDA privé d'un artisan (plan du 18/10, n°6 ; lien créé par POST /api/crm/agenda). Lu par
// Google Agenda, l'iPhone ou Outlook, SANS session : le jeton secret (32 octets aléatoires) est la seule clé, et seule son empreinte
// est en base (table crm_agenda, 0164). Modèle : app/rendez-vous/[jeton] (limite de débit, noindex, aucun cache, 404 muette).
//   • un jeton inconnu, révoqué ou mal formé → 404 sans un mot ; 60 lectures par 10 minutes et par adresse ;
//   • à CHAQUE lecture : drapeau du CRM, offre du compte (capacité `crm`), compte non suspendu — un compte qui quitte Signature ou qui
//     est suspendu cesse aussitôt d'être servi ;
//   • le contenu : chantiers ouverts datés et rendez-vous à venir (lib/crm/ics.ts) ; jamais un e-mail, un téléphone ou un montant.
const ENTETES = {
  'Content-Type': 'text/calendar; charset=utf-8',
  'Content-Disposition': 'inline; filename="agenda.ics"',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}
const introuvable = () => new Response('Introuvable.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })

export async function GET(req: Request, ctx: { params: Promise<{ jeton: string }> }) {
  // Drapeau baissé (lib/flags.ts, crmPlanning) : 404 avant toute lecture.
  if (!actif('crmPlanning')) return introuvable()
  const { jeton: brut } = await ctx.params
  const jeton = brut.replace(/\.ics$/i, '')
  const ip = ipPseudonyme(getIp(req)) ?? 'inconnue'
  if (!(await consommerLimite(`agenda:${ip}`, 60, 600))) return new Response('Trop de demandes.', { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '600' } })
  if (!/^[A-Za-z0-9_-]{43}$/.test(jeton) || !enEssai('crm')) return introuvable()
  const empreinte = createHash('sha256').update(jeton).digest('hex')
  const { data: lien, error } = await supabaseAdmin.from('crm_agenda').select('artisan_id').eq('jeton_empreinte', empreinte).maybeSingle()
  if (error || !lien) return introuvable()
  const uid = lien.artisan_id as string
  if (!ouvertPour('crm', uid)) return introuvable()
  const [{ data: art }, suspendu] = await Promise.all([supabaseAdmin.from('artisans').select('nom, plan').eq('id', uid).maybeSingle(), suspensionEnCours(uid)])
  if (!art || !peut(art.plan as string | null, 'crm') || suspendu) return introuvable()

  const jour = jourParis(new Date())
  const [chantiersR, rappelsR, devisR] = await Promise.all([
    supabaseAdmin.from('chantiers').select('id, titre, statut, date_debut, date_fin_prevue, adresse, code_postal, ville, devis_id').eq('artisan_id', uid).neq('statut', 'annule').not('date_debut', 'is', null).order('date_debut', { ascending: false }).limit(500),
    supabaseAdmin.from('crm_rappels').select('id, type, echeance, heure, texte, fait_le, chantier_id, devis_id, lead_id').eq('artisan_id', uid).is('fait_le', null).in('type', ['visite', 'metre', 'rendez_vous']).limit(500),
    supabaseAdmin.from('devis').select('id, client_adresse').eq('artisan_id', uid).limit(2000),
  ])
  if (chantiersR.error) { console.error('[agenda] lecture :', chantiersR.error.message); return new Response('Indisponible.', { status: 503, headers: { 'Retry-After': '300' } }) }
  const adresseDevis = new Map((devisR.data ?? []).map((d) => [d.id as string, d.client_adresse as string | null]))
  const titres = new Map((chantiersR.data ?? []).map((c) => [c.id as string, c.titre as string]))
  const evenements = evenementsAgenda({
    jour,
    chantiers: (chantiersR.data ?? []).map((c) => ({ id: c.id, titre: c.titre, statut: c.statut, date_debut: c.date_debut, date_fin_prevue: c.date_fin_prevue, adresse: adresseChantier(c, c.devis_id ? adresseDevis.get(c.devis_id) ?? null : null) })),
    // La cible d'un rendez-vous : le titre du chantier quand il en vise un ; sinon un mot neutre (aucun nom de client).
    rappels: (rappelsR.data ?? []).map((r) => ({ id: r.id, type: r.type, echeance: r.echeance, heure: r.heure, texte: r.texte, fait_le: r.fait_le, cible: r.chantier_id ? titres.get(r.chantier_id) ?? 'chantier' : r.devis_id ? 'devis' : r.lead_id ? 'demande' : 'client' })),
  })
  // Noté « lu » (au plus une écriture par heure suffit à l'écran) ; une erreur ici ne prive pas l'agenda de son flux.
  void supabaseAdmin.from('crm_agenda').update({ dernier_acces_le: new Date().toISOString() }).eq('artisan_id', uid).then(() => {}, () => {})
  return new Response(genererIcs({ nom: `${(art.nom as string | null)?.trim() || 'Mes chantiers'} — chantiers`, evenements, maintenant: new Date() }), { status: 200, headers: ENTETES })
}
