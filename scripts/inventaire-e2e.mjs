// Test permanent — inventaire (v4 §9).
//
// Trois choses à prouver :
//   1. le VERROU D'OFFRE est côté serveur — masquer l'entrée de menu ne protège rien,
//      l'URL de l'API reste appelable par n'importe qui ;
//   2. le stock et son historique restent cohérents : chaque mouvement laisse une trace
//      et la quantité suit, sinon l'inventaire dérive et l'artisan cesse d'y croire ;
//   3. le stock est bien séparé par lieu (atelier / camion), et l'alerte de seuil se
//      déclenche sur le TOTAL — c'est la seule chose qu'un artisan vient vérifier.
//
// Usage : node scripts/inventaire-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { connexion, appelApi } from './aide-connexion.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const mdp = () => crypto.randomBytes(18).toString('base64url')
const comptes = []

async function creer(plan) {
  const email = `verif-inv-${plan}-${Date.now()}@presti-test.invalid`
  const p = mdp()
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: p, email_confirm: true })
  if (error) throw new Error(`compte ${plan} : ${error.message}`)
  await sb.from('artisans').insert({ id: u.user.id, email, nom: `Inv ${plan}`, metier: 'Plombier', slug: `verif-inv-${plan}-${Date.now()}`, plan })
  comptes.push(u.user.id)
  return { uid: u.user.id, email, motDePasse: p }
}

/**
 * Se connecte dans SON PROPRE contexte de navigateur et renvoie une fonction qui appelle
 * l'API avec ce jeton. Un contexte par compte : le localStorage est partagé entre les
 * pages d'un même contexte, donc une deuxième connexion écraserait la session de la
 * première — et le test se mentirait à lui-même sur le cloisonnement.
 */
async function session(nav, c) {
  const { page } = await connexion(nav, { email: c.email, motDePasse: c.motDePasse, base: BASE })
  return appelApi(page, BASE)
}

try {
  const nav = await chromium.launch()

  console.log('\n── 1. Le verrou d’offre est côté serveur')
  const gratuit = await creer('essentiel')
  const appelEssentiel = await session(nav, gratuit)
  const refus = await appelEssentiel('/api/inventaire')
  T('une offre Essentiel reçoit 403 sur l’API', refus.statut === 403, `${refus.statut}`)
  T('le message explique quelles offres l’incluent', /Studio|Signature/.test(refus.corps?.error || ''), refus.corps?.error)
  const refusEcriture = await appelEssentiel('/api/inventaire', { method: 'POST', body: JSON.stringify({ nom: 'Tentative' }) })
  T('elle ne peut pas non plus écrire', refusEcriture.statut === 403, `${refusEcriture.statut}`)
  const anonyme = await fetch(`${BASE}/api/inventaire`)
  T('sans jeton du tout : 401', anonyme.status === 401, `${anonyme.status}`)

  console.log('\n── 2. Studio : création et mouvements')
  const studio = await creer('studio')
  const appel = await session(nav, studio)
  const vide = await appel('/api/inventaire')
  T('l’inventaire s’ouvre', vide.statut === 200, `${vide.statut}`)
  T('il est vide au départ', (vide.corps?.materiaux ?? []).length === 0)

  const cree = await appel('/api/inventaire', { method: 'POST', body: JSON.stringify({ nom: 'Coude cuivre 16', unite: 'u', seuil_alerte: 10, code_barres: '3760000000017' }) })
  T('un article est créé', cree.statut === 200 && !!cree.corps?.id, JSON.stringify(cree.corps))
  const id = cree.corps.id

  const e1 = await appel('/api/inventaire', { method: 'POST', body: JSON.stringify({ mouvement: { materiau_id: id, type: 'entree', quantite: 50, lieu: 'atelier', cout_unitaire_ht: 1.35 } }) })
  T('entrée de 50 à l’atelier', e1.corps?.reste === 50, JSON.stringify(e1.corps))
  const s1 = await appel('/api/inventaire', { method: 'POST', body: JSON.stringify({ mouvement: { materiau_id: id, type: 'sortie', quantite: 12, lieu: 'atelier' } }) })
  T('sortie de 12 → il reste 38', s1.corps?.reste === 38, JSON.stringify(s1.corps))

  console.log('\n── 3. Chaque lieu a son stock')
  const e2 = await appel('/api/inventaire', { method: 'POST', body: JSON.stringify({ mouvement: { materiau_id: id, type: 'entree', quantite: 6, lieu: 'camion' } }) })
  T('le camion démarre à 6, indépendamment de l’atelier', e2.corps?.reste === 6, JSON.stringify(e2.corps))
  const apres = await appel('/api/inventaire')
  const art = apres.corps.materiaux[0]
  T('l’atelier est toujours à 38', Number(art.stock.find((s) => s.lieu === 'atelier').quantite) === 38)
  T('le total agrège les deux lieux (44)', art.quantite_totale === 44, String(art.quantite_totale))
  T('le dernier prix payé est mémorisé', Number(art.prix_dernier_ht) === 1.35, String(art.prix_dernier_ht))

  console.log('\n── 4. Le comptage POSE la valeur, il ne l’ajoute pas')
  const cpt = await appel('/api/inventaire', { method: 'POST', body: JSON.stringify({ mouvement: { materiau_id: id, type: 'inventaire', quantite: 30, lieu: 'atelier' } }) })
  T('après comptage, l’atelier vaut exactement 30', cpt.corps?.reste === 30, JSON.stringify(cpt.corps))

  console.log('\n── 5. L’alerte de seuil')
  await appel('/api/inventaire', { method: 'POST', body: JSON.stringify({ mouvement: { materiau_id: id, type: 'sortie', quantite: 28, lieu: 'atelier' } }) })
  const alerte = await appel('/api/inventaire')
  T('sous le seuil, l’article remonte en alerte', (alerte.corps?.alertes ?? []).some((a) => a.id === id),
    JSON.stringify(alerte.corps?.alertes))
  T('l’alerte dit combien il en reste', alerte.corps.alertes[0]?.reste === 8, JSON.stringify(alerte.corps.alertes[0]))

  console.log('\n── 6. Le scan retrouve l’article existant')
  const parCode = await appel('/api/inventaire?code=3760000000017')
  T('le code-barres retrouve l’article', parCode.corps?.materiau?.id === id)
  const inconnu = await appel('/api/inventaire?code=0000000000000')
  T('un code inconnu ne renvoie rien (au lieu d’une erreur)', inconnu.statut === 200 && inconnu.corps?.materiau === null)

  console.log('\n── 7. Traçabilité')
  const { data: mvts } = await sb.from('mouvements_stock').select('type, quantite, lieu').eq('artisan_id', studio.uid).order('cree_le')
  T('tous les mouvements sont historisés', mvts.length === 5, `${mvts.length} mouvements`)
  T('l’historique reflète la séquence réelle',
    mvts.map((m) => `${m.type}:${Number(m.quantite)}@${m.lieu}`).join(' ') === 'entree:50@atelier sortie:12@atelier entree:6@camion inventaire:30@atelier sortie:28@atelier',
    mvts.map((m) => `${m.type}:${Number(m.quantite)}@${m.lieu}`).join(' '))

  console.log('\n── 8. Cloisonnement entre artisans')
  const autre = await creer('studio')
  const appelAutre = await session(nav, autre)
  const chezMoi = await appelAutre('/api/inventaire')
  T('un autre artisan ne voit pas cet inventaire', (chezMoi.corps?.materiaux ?? []).length === 0, JSON.stringify(chezMoi.corps?.materiaux))
  const vol = await appelAutre('/api/inventaire', { method: 'POST', body: JSON.stringify({ mouvement: { materiau_id: id, type: 'sortie', quantite: 999, lieu: 'atelier' } }) })
  T('il ne peut pas bouger le stock d’un autre', vol.statut === 400, `${vol.statut}`)
  const intact = await appel('/api/inventaire')
  T('le stock de la victime est intact', intact.corps.materiaux[0].quantite_totale === 8, String(intact.corps.materiaux[0].quantite_totale))

  await nav.close()
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await sb.from('materiaux').delete().eq('artisan_id', uid)
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`🧹 ${comptes.length} comptes de test supprimés`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
