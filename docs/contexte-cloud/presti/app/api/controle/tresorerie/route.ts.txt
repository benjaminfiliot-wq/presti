import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { encaisseDuJour, encaisseSur7Jours, encaisseDuMois, mrr } from '@/lib/direction/stripe'
import { caDeLAnnee, situerTva, ventesSites, margeDuMois } from '@/lib/direction/tresorerie'
import { coutIADuMois } from '@/lib/alertes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  if (!actif('comptabilite')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'comptabilite', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const maintenant = new Date()
  const debutMois = `${maintenant.toISOString().slice(0, 8)}01`
  const [jour, septJours, mois, abonnements, ca, cout, reglagesLus, achatsLus, sitesLus] = await Promise.all([
    encaisseDuJour(), encaisseSur7Jours(), encaisseDuMois(), mrr(), caDeLAnnee(), coutIADuMois(),
    supabaseAdmin.from('reglages_globaux').select('cle, valeur'),
    supabaseAdmin.from('achats').select('ttc_cents, date_facture').gte('date_facture', debutMois),
    supabaseAdmin.from('sites_commandes').select('etat, prix_cents'),
  ])
  const reglages: Record<string, number | string> = {}
  for (const ligne of reglagesLus.data ?? []) reglages[ligne.cle] = ligne.valeur
  const tva = { valeur: situerTva(ca.valeur, reglages), source: ca.source, a: ca.a, cache: ca.cache, erreur: ca.erreur }
  let achatsMoisCents = 0
  for (const achat of achatsLus.data ?? []) achatsMoisCents += achat.ttc_cents ?? 0
  const taux = Number(process.env.TAUX_USD_EUR) || 0.92
  const coutIaEur = cout && !cout.erreur ? cout.usd * taux : null
  const coutIA = { valeur: coutIaEur, source: 'anthropic', a: maintenant.toISOString(), cache: false, ...(!cout ? { manque: 'clé Anthropic Admin absente' } : cout.erreur ? { erreur: cout.erreur } : {}) }
  const depensesMois = { valeur: achatsLus.error ? null : achatsMoisCents, source: 'supabase', a: maintenant.toISOString(), cache: false, ...(achatsLus.error ? { erreur: achatsLus.error.message } : {}) }
  const marge = { valeur: mois.valeur && !achatsLus.error ? margeDuMois({ encaisse: mois.valeur, achatsMoisCents, coutIaEur }) : null, source: mois.source, a: mois.a, cache: mois.cache, erreur: mois.erreur ?? achatsLus.error?.message }
  const ventes = { valeur: sitesLus.error ? null : ventesSites(sitesLus.data ?? []), source: 'supabase', a: maintenant.toISOString(), cache: false, ...(sitesLus.error ? { erreur: sitesLus.error.message } : {}) }

  return NextResponse.json({ encaisse: { jour, sept_jours: septJours, mois }, mrr: abonnements, ventes_sites: ventes, depenses_mois: depensesMois, cout_ia: coutIA, marge, tva, a: maintenant.toISOString() })
}
