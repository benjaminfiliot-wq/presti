#!/usr/bin/env node
// scripts/crm-stock-e2e.mjs — le STOCK de l'atelier EST l'inventaire (lot 4, 20/10/2026) : une seule source de vérité, de bout en bout,
// contre un VRAI serveur branché sur une base de TEST (jamais la production — même garde que scripts/crm-e2e.mjs).
//
//  1. Un article créé par la route d'inventaire existante (POST /api/inventaire/materiaux, puis une entrée POST /api/inventaire) est
//     PRÉSENT dans la vue du CRM (GET /api/crm/vue → atelier.materiaux), avec sa quantité.
//  2. Un article créé comme le fait l'atelier (./app/crm/atelier/Stock.tsx : mêmes routes, même corps) est PRÉSENT dans la lecture de
//     l'écran Inventaire (GET /api/inventaire) — celle que lit aussi l'assistant de gestion.
//  3. Le seuil se modifie (fiche relue puis renvoyée) sans rien perdre d'autre ; sortie et comptage font bouger le stock.
//  4. Un AUTRE compte ne peut ni faire de mouvement sur l'article du premier (400), ni modifier sa fiche (404) ; un corps invalide est
//     refusé (400) ; sans jeton : 401. Comptes créés puis SUPPRIMÉS dans un finally.
//
//    Variables : TEST_BASE (le serveur, drapeaux crm et crmAtelierVivant levés), CRM_E2E_SUPABASE_URL, CRM_E2E_ANON_KEY,
//    CRM_E2E_SERVICE_KEY (la base de test). Refus (code 2) si l'une manque, si la base est celle de .env.local, ou si TEST_BASE
//    vise prestiapp.fr. Codes : 0 vert · 1 rouge · 2 appel refusé.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
const SB = process.env.CRM_E2E_SUPABASE_URL, ANON = process.env.CRM_E2E_ANON_KEY, SVC = process.env.CRM_E2E_SERVICE_KEY
if (!BASE || !SB || !ANON || !SVC) { console.error('TEST_BASE, CRM_E2E_SUPABASE_URL, CRM_E2E_ANON_KEY et CRM_E2E_SERVICE_KEY sont obligatoires (base de TEST).'); process.exit(2) }
let prod = null
try { prod = fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^"'\r\n]+)/m)?.[1]?.trim() ?? null } catch { /* rien à comparer */ }
const hote = (u) => { try { return new URL(u).host.toLowerCase() } catch { return u } }
if (prod && hote(prod) === hote(SB)) { console.error('⛔ CRM_E2E_SUPABASE_URL est la base de PRODUCTION (.env.local). Refusé : rien n’a été écrit.'); process.exit(2) }
if (/prestiapp\.fr/i.test(BASE)) { console.error('⛔ TEST_BASE vise le domaine de production. Refusé.'); process.exit(2) }

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${String(d).slice(0, 300)}` : ''}`) } }
const brut = (methode, chemin, jeton, body) => fetch(BASE + chemin, { method: methode, headers: { ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined })

const { createClient } = await import('@supabase/supabase-js')
const admin = createClient(SB, SVC, { auth: { persistSession: false } })
process.env.NEXT_PUBLIC_SUPABASE_URL = SB
process.env.SUPABASE_SERVICE_ROLE_KEY = SVC
const { verifierSessionTest } = await import('./lib/connexion-test.mjs')

const comptes = []
async function creer(nom) {
  const email = `verif-stock-${nom}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@presti-test.invalid`
  const motDePasse = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error(`compte ${nom} : ${error.message}`)
  comptes.push(u.user.id)
  const { error: eA } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `Stock ${nom}`, metier: 'Maçon', slug: `verif-stock-${nom}-${Date.now()}`, plan: 'signature' })
  if (eA) throw new Error(`artisan ${nom} : ${eA.message}`)
  const pub = createClient(SB, ANON, { auth: { persistSession: false } })
  const { data: s, error: e2 } = await pub.auth.signInWithPassword({ email, password: motDePasse })
  if (e2) throw new Error(`connexion ${nom} : ${e2.message}`)
  await verifierSessionTest(s.session.access_token)
  const jeton = s.session.access_token
  const appel = async (methode, chemin, body) => { const r = await brut(methode, chemin, jeton, body); return { statut: r.status, corps: await r.json().catch(() => null) } }
  return { uid: u.user.id, appel }
}

try {
  const A = await creer('a'), B = await creer('b')
  console.log('\n── 1. Inventaire → atelier')
  const f1 = await A.appel('POST', '/api/inventaire/materiaux', { nom: 'Sac de ciment fictif', unite: 'sac', categorie: 'Liants', seuil_alerte: 4 })
  const e1 = await A.appel('POST', '/api/inventaire', { mouvement: { materiau_id: f1.corps?.id, type: 'entree', quantite: 10, source: 'manuel' } })
  T('fiche et entrée par les routes d’inventaire existantes', f1.statut === 200 && e1.statut === 200 && e1.corps?.reste === 10, `${f1.statut}/${e1.statut}`)
  const vue = await A.appel('GET', '/api/crm/vue')
  const m1 = vue.corps?.atelier?.materiaux?.find((m) => m.id === f1.corps?.id)
  T('l’article est dans la vue du CRM (atelier), avec sa quantité et son seuil', vue.statut === 200 && m1?.reste === 10 && m1?.seuil === 4 && m1?.categorie === 'Liants', JSON.stringify(m1))

  console.log('\n── 2. Atelier → inventaire (même corps que app/crm/atelier/Stock.tsx)')
  const f2 = await A.appel('POST', '/api/inventaire/materiaux', { nom: 'Parpaing fictif 20', unite: 'u', categorie: 'Blocs', seuil_alerte: 50, fournisseur_prefere: 'Négoce fictif' })
  const e2 = await A.appel('POST', '/api/inventaire', { mouvement: { materiau_id: f2.corps?.id, type: 'entree', quantite: 120, source: 'manuel', note: 'Saisi depuis l’atelier' } })
  const inv = await A.appel('GET', '/api/inventaire')
  const m2 = inv.corps?.materiaux?.find((m) => m.id === f2.corps?.id)
  T('l’article saisi depuis l’atelier est dans l’écran Inventaire (et donc pour l’assistant)', f2.statut === 200 && e2.statut === 200 && !!m2, JSON.stringify(m2)?.slice(0, 200))

  console.log('\n── 3. Seuil, sortie, comptage')
  const lu = await A.appel('GET', `/api/inventaire/materiaux?id=${f2.corps?.id}`)
  const maj = await A.appel('POST', '/api/inventaire/materiaux', { ...lu.corps?.materiau, id: f2.corps?.id, seuil_alerte: 80 })
  const relu = await A.appel('GET', `/api/inventaire/materiaux?id=${f2.corps?.id}`)
  T('seuil modifié (fiche relue puis renvoyée), le fournisseur préféré est resté', maj.statut === 200 && Number(relu.corps?.materiau?.seuil_alerte) === 80 && relu.corps?.materiau?.fournisseur_prefere === 'Négoce fictif')
  const so = await A.appel('POST', '/api/inventaire', { mouvement: { materiau_id: f2.corps?.id, type: 'sortie', quantite: 20 } })
  const co = await A.appel('POST', '/api/inventaire', { mouvement: { materiau_id: f2.corps?.id, type: 'inventaire', quantite: 95 } })
  T('sortie puis comptage : 100 puis 95', so.corps?.reste === 100 && co.corps?.reste === 95, `${so.corps?.reste}/${co.corps?.reste}`)

  console.log('\n── 4. Refus')
  const mB = await B.appel('POST', '/api/inventaire', { mouvement: { materiau_id: f1.corps?.id, type: 'sortie', quantite: 1 } })
  const fB = await B.appel('POST', '/api/inventaire/materiaux', { id: f1.corps?.id, nom: 'Détourné', seuil_alerte: 0 })
  const intact = await A.appel('GET', `/api/inventaire/materiaux?id=${f1.corps?.id}`)
  T('un AUTRE compte : mouvement refusé (400), fiche introuvable (404), l’article du premier est intact', mB.statut === 400 && fB.statut === 404 && intact.corps?.materiau?.nom === 'Sac de ciment fictif', `${mB.statut}/${fB.statut}`)
  const bad1 = await A.appel('POST', '/api/inventaire', { mouvement: { materiau_id: f1.corps?.id, type: 'entree', quantite: -3 } })
  const bad2 = await A.appel('POST', '/api/inventaire', { mouvement: { materiau_id: f1.corps?.id, type: 'vol', quantite: 1 } })
  const bad3 = await A.appel('POST', '/api/inventaire/materiaux', { nom: '   ' })
  const sans = await brut('POST', '/api/inventaire', null, { mouvement: { materiau_id: f1.corps?.id, type: 'entree', quantite: 1 } })
  T('corps invalides refusés (quantité négative, type inconnu, nom vide : 400) ; sans jeton : 401', bad1.statut === 400 && bad2.statut === 400 && bad3.statut === 400 && sans.status === 401, `${bad1.statut}/${bad2.statut}/${bad3.statut}/${sans.status}`)
} catch (e) {
  ko++; console.log(`  ❌ arrêt : ${e.message}`)
} finally {
  for (const id of comptes) { await admin.from('artisans').delete().eq('id', id); await admin.auth.admin.deleteUser(id).catch(() => {}) }
  const restes = comptes.length ? (await admin.from('artisans').select('id').in('id', comptes)).data ?? [] : []
  T(`ménage : ${comptes.length} compte(s) de test supprimé(s)`, restes.length === 0)
  console.log(`\n${ok} vert(s), ${ko} rouge(s)`)
  process.exitCode = ko ? 1 : 0
}
