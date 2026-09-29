import { consommerLimite } from '@/lib/limites'
import { getIp, ipPseudonyme } from '@/lib/security'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'
import { hacherJeton } from '@/lib/agents/acquisition/maquettesLien'
import { creneauxLibres, pageConfirmation, pageRendezVous, REPONSE_404, validerReservation } from '@/lib/agents/acquisition/rendezVous'
import { envoyerAlertes } from '@/lib/alertes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Contexte = { params: Promise<{ jeton: string }> }
const ENTETES = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
}
const introuvable = () => new Response(REPONSE_404.corps, { status: REPONSE_404.statut, headers: REPONSE_404.entetes })
const page = (corps: string, status = 200) => new Response(corps, { status, headers: ENTETES })
const texte = (corps: string, status: number) => new Response(corps, { status, headers: { ...ENTETES, 'Content-Type': 'text/plain; charset=utf-8' } })

async function preparer(req: Request, jeton: string) {
  const adresse = ipPseudonyme(getIp(req)) ?? 'inconnue'
  const permis = await consommerLimite(`rendez-vous:${adresse}`, 30, 600)
  if (!permis) return { erreur: texte('Trop de demandes.', 429) }
  if (!/^[A-Za-z0-9_-]{43}$/.test(jeton)) return { erreur: introuvable() }
  const empreinte = hacherJeton(jeton)
  const lien = await magasinSupabase.rdvParJeton(empreinte)
  if (!lien || lien.statut !== 'propose' || lien.creneau || !lien.expire_le || Date.parse(lien.expire_le) <= Date.now()) return { erreur: introuvable() }
  return { lien, empreinte }
}

async function disponibilites(maintenant: number) {
  const depuis = new Date(maintenant).toISOString()
  const jusqua = new Date(maintenant + 10 * 86_400_000 + 1).toISOString()
  const pris = await magasinSupabase.creneauxPris(depuis, jusqua)
  return { pris, creneaux: creneauxLibres(maintenant, pris) }
}

export async function GET(req: Request, ctx: Contexte) {
  const { jeton } = await ctx.params
  const preparation = await preparer(req, jeton)
  if (preparation.erreur) return preparation.erreur
  const { lien } = preparation
  if (!lien) return introuvable()
  const { creneaux } = await disponibilites(Date.now())
  return page(pageRendezVous({ metier: lien.metier ?? '', commune: lien.commune ?? '', creneaux, expire_le: lien.expire_le }))
}

export async function POST(req: Request, ctx: Contexte) {
  const { jeton } = await ctx.params
  if (req.headers.get('origin') !== 'https://prestiapp.fr') return texte('Origine refusée.', 403)
  const preparation = await preparer(req, jeton)
  if (preparation.erreur) return preparation.erreur
  const { lien, empreinte } = preparation
  if (!lien || !empreinte) return introuvable()
  if (!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(req.headers.get('content-type') ?? '')) return texte('Formulaire invalide.', 415)
  const tailleAnnoncee = Number(req.headers.get('content-length') ?? 0)
  if (tailleAnnoncee > 4096) return texte('Formulaire trop grand.', 413)
  const octets = await req.arrayBuffer()
  if (octets.byteLength > 4096) return texte('Formulaire trop grand.', 413)
  const corps = new URLSearchParams(new TextDecoder().decode(octets))
  const maintenant = Date.now()
  const { pris, creneaux } = await disponibilites(maintenant)
  const valide = validerReservation(corps, maintenant, pris)
  if (!valide.ok) {
    const message = valide.raison === 'creneau' ? 'Choisissez un créneau disponible.' : valide.raison === 'telephone' ? 'Indiquez un numéro français valide.' : 'Cochez la case pour demander cet appel.'
    return page(pageRendezVous({ metier: lien.metier ?? '', commune: lien.commune ?? '', creneaux, expire_le: lien.expire_le, erreur: message }), 422)
  }
  const resultat = await magasinSupabase.reserverRdv(empreinte, valide.creneau, valide.telephone)
  if (!resultat.ok && (resultat.raison === 'pris' || resultat.raison === 'creneau_pris')) {
    const actualise = await disponibilites(Date.now())
    return page(pageRendezVous({ metier: lien.metier ?? '', commune: lien.commune ?? '', creneaux: actualise.creneaux, expire_le: lien.expire_le, erreur: "Ce créneau vient d'être pris : choisissez-en un autre." }), 409)
  }
  if (!resultat.ok) return introuvable()
  const id = 'id' in resultat && typeof resultat.id === 'string' ? resultat.id : lien.prospect_id
  const date = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' }).format(new Date(valide.creneau))
  await envoyerAlertes([{ motif: 'appel', a: 'entreprise', cle: `appel:${id}`, sujet: `Appel réservé : ${lien.metier ?? ''}, ${lien.commune ?? ''}, ${date}`, corps: 'Le numéro est dans le Poste, carte « À appeler ».' }])
  return page(pageConfirmation({ creneau: valide.creneau }))
}
