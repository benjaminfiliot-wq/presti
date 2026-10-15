import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { exigerCapacite } from '@/lib/accesOffreServeur'
import { actif } from '@/lib/flags'
import { peut } from '@/lib/plans'

export const runtime = 'nodejs'

// Les données Presti du tableau de bord comptable (/chiffres), lues CÔTÉ SERVEUR pour le compte de la session.
//
// La route ne fait que LIRE. Chacune des trois requêtes porte `.eq('artisan_id', uid)` : la clé de service passe
// outre la RLS, ce filtre est donc la seule barrière, et l'uid ne vient QUE de la session vérifiée (authArtisan :
// révocation, suspension, double authentification). Aucun paramètre de la requête ne choisit le compte.
// Le calcul se fait dans lib/comptaTableau.ts, qui écarte en plus toute ligne d'un autre compte.
//
// Les colonnes sont choisies une à une : ni adresse ni e-mail du client, ni colonne de taxe (franchise en base).
// Une requête en erreur rend 503 et AUCUNE donnée : un « 0 € » affiché sur une panne serait un mensonge.
const LIMITE = 2000
const COLONNES_FACTURES = 'id, artisan_id, numero, statut, date_emission, date_echeance, total_ttc, devis_id, avoir_de, client_nom, client_id'
const COLONNES_DEVIS = 'id, artisan_id, numero, client_nom, statut, date_emission, total_ttc, envoye_le, accepte_le, created_at, lead_id, validite_jours'
const COLONNES_DEMANDES = 'id, artisan_id, canal, statut, created_at, type_chantier, ville'

export async function GET(req: Request) {
  // 15/10 (Benj) : « Mes chiffres » commence avec Studio, pour tous les comptes — Essentiel et Essai reçoivent 403, sans aucune donnée.
  const garde = await exigerCapacite(req, 'chiffres', 'L’écran « Mes chiffres »')
  if ('reponse' in garde) return garde.reponse
  const uid = garde.uid

  const colonnesFactures = actif('comptaDateReglement') ? `${COLONNES_FACTURES}, payee_le` : COLONNES_FACTURES
  const [f, d, l] = await Promise.all([
    supabaseAdmin.from('factures').select(colonnesFactures).eq('artisan_id', uid).order('date_emission', { ascending: false }).limit(LIMITE),
    supabaseAdmin.from('devis').select(COLONNES_DEVIS).eq('artisan_id', uid).order('created_at', { ascending: false }).limit(LIMITE),
    supabaseAdmin.from('leads').select(COLONNES_DEMANDES).eq('artisan_id', uid).order('created_at', { ascending: false }).limit(LIMITE),
  ])
  if (f.error || d.error || l.error) {
    console.error('[compta/tableau] lecture', f.error?.message ?? d.error?.message ?? l.error?.message)
    return NextResponse.json({ error: 'Vos chiffres n’ont pas pu être lus. Rechargez la page dans un instant.' }, { status: 503 })
  }
  const factures = f.data ?? []
  const devis = d.data ?? []
  const demandes = l.data ?? []
  return NextResponse.json(
    { maintenant: new Date().toISOString(), automatisations: peut(garde.plan, 'chiffres.auto'), factures, devis, demandes, tronque: [factures, devis, demandes].some((x) => x.length >= LIMITE) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
