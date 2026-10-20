#!/usr/bin/env node
// scripts/crm-carte-e2e.mjs — la CARTE de l'atelier (lot 5, migration 0172, 20/10/2026), de bout en bout, contre un VRAI serveur branché
// sur une base de TEST (jamais la production — même garde que scripts/crm-stock-e2e.mjs).
//
//  1. Valider : refusé (409) tant qu'une tâche reste ; accepté (200) quand toutes sont faites → statut terminé, fin réelle, retiré de
//     la carte ; le chantier reste dans la vue (liste des chantiers avec retireCarte, données de l'atelier), « remettre » le fait revenir.
//  2. Réglage « valider automatiquement » (PUT /api/crm/reglages) : la route qui coche la DERNIÈRE tâche valide le chantier
//     (chantierValide), pas avant.
//  3. Type de bâtiment : PATCH type_batiment accepté (13 valeurs), refusé s'il est inconnu (400).
//  4. Refus : un AUTRE compte reçoit 404 (valider, remettre) ; un corps invalide 400 ; sans jeton 401. Comptes créés puis SUPPRIMÉS.
//
//    Variables : TEST_BASE (le serveur, drapeaux crm et crmAtelierVivant levés), CRM_E2E_SUPABASE_URL, CRM_E2E_ANON_KEY,
//    CRM_E2E_SERVICE_KEY (la base de test, migration 0172 posée). Refus (code 2) si l'une manque, si la base est celle de .env.local,
//    ou si TEST_BASE vise prestiapp.fr. Codes : 0 vert · 1 rouge · 2 appel refusé.
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
  const email = `verif-carte-${nom}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}@presti-test.invalid`
  const motDePasse = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error(`compte ${nom} : ${error.message}`)
  comptes.push(u.user.id)
  const { error: eA } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `Carte ${nom}`, metier: 'Plombier', slug: `verif-carte-${nom}-${Date.now()}`, plan: 'signature' })
  if (eA) throw new Error(`artisan ${nom} : ${eA.message}`)
  const pub = createClient(SB, ANON, { auth: { persistSession: false } })
  const { data: s, error: e2 } = await pub.auth.signInWithPassword({ email, password: motDePasse })
  if (e2) throw new Error(`connexion ${nom} : ${e2.message}`)
  await verifierSessionTest(s.session.access_token)
  const jeton = s.session.access_token
  const appel = async (methode, chemin, body) => { const r = await brut(methode, chemin, jeton, body); return { statut: r.status, corps: await r.json().catch(() => null) } }
  return { uid: u.user.id, appel }
}
async function chantierAvecTaches(A, titre, n) {
  const c = await A.appel('POST', '/api/crm/chantiers', { titre, statut: 'en_cours' })
  const ids = []
  for (let i = 0; i < n; i++) { const t = await A.appel('POST', `/api/crm/chantiers/${c.corps?.id}/taches`, { libelle: `Tâche ${i + 1}` }); ids.push(t.corps?.id) }
  return { id: c.corps?.id, taches: ids }
}

try {
  const A = await creer('a'), B = await creer('b')
  console.log('\n── 1. Valider à la main')
  const c1 = await chantierAvecTaches(A, 'Salle de bain, étage', 2)
  const tot = await A.appel('POST', `/api/crm/chantiers/${c1.id}/valider`, { action: 'valider' })
  T('refusé tant qu’une tâche reste (409)', tot.statut === 409, `${tot.statut} ${JSON.stringify(tot.corps)}`)
  for (const t of c1.taches) await A.appel('PATCH', `/api/crm/taches/${t}`, { faite: true })
  const v1 = await A.appel('POST', `/api/crm/chantiers/${c1.id}/valider`, { action: 'valider' })
  const { data: l1 } = await admin.from('chantiers').select('statut, date_fin_reelle, retire_carte_le').eq('id', c1.id).single()
  T('validé (200) : terminé, fin réelle, retiré de la carte', v1.statut === 200 && l1?.statut === 'termine' && !!l1?.date_fin_reelle && !!l1?.retire_carte_le, JSON.stringify(l1))
  const vue = await A.appel('GET', '/api/crm/vue')
  T('toujours dans la vue (liste avec retireCarte, données de l’atelier)', vue.corps?.chantiers?.some((c) => c.id === c1.id && c.retireCarte) && vue.corps?.atelier?.chantiers?.some((c) => c.id === c1.id && c.retireCarte))
  const deux = await A.appel('POST', `/api/crm/chantiers/${c1.id}/valider`, { action: 'valider' })
  const rem = await A.appel('POST', `/api/crm/chantiers/${c1.id}/valider`, { action: 'remettre' })
  const { data: l2 } = await admin.from('chantiers').select('retire_carte_le').eq('id', c1.id).single()
  T('déjà validé : 409 ; « remettre » : sur la carte de nouveau', deux.statut === 409 && rem.statut === 200 && l2?.retire_carte_le === null)

  console.log('\n── 2. Valider automatiquement')
  const r0 = await A.appel('GET', '/api/crm/reglages')
  const r1 = await A.appel('PUT', '/api/crm/reglages', { validation_auto: true })
  const c2 = await chantierAvecTaches(A, 'Cuisine ouverte', 2)
  const p1 = await A.appel('PATCH', `/api/crm/taches/${c2.taches[0]}`, { faite: true })
  const p2 = await A.appel('PATCH', `/api/crm/taches/${c2.taches[1]}`, { faite: true })
  const { data: l3 } = await admin.from('chantiers').select('statut, retire_carte_le').eq('id', c2.id).single()
  T('réglage faux par défaut, posé à vrai ; pas de validation à la 1re tâche, validation à la DERNIÈRE (chantierValide)', r0.corps?.validation_auto === false && r1.statut === 200 && !p1.corps?.chantierValide && p2.corps?.chantierValide === true && l3?.statut === 'termine' && !!l3?.retire_carte_le, JSON.stringify({ r0: r0.corps, p1: p1.corps, p2: p2.corps, l3 }))

  console.log('\n── 3. Type de bâtiment')
  const ty = await A.appel('PATCH', `/api/crm/chantiers/${c1.id}`, { type_batiment: 'hotel' })
  const tyMal = await A.appel('PATCH', `/api/crm/chantiers/${c1.id}`, { type_batiment: 'chateau' })
  const { data: l4 } = await admin.from('chantiers').select('type_batiment').eq('id', c1.id).single()
  T('type posé (hôtel) ; type inconnu refusé (400)', ty.statut === 200 && l4?.type_batiment === 'hotel' && tyMal.statut === 400)
  const adr = await A.appel('PATCH', `/api/crm/chantiers/${c1.id}`, { adresse: '1 rue de test', ville: 'Ville de test' })
  const { data: l5 } = await admin.from('chantiers').select('lat, lng, geocode_le').eq('id', c1.id).single()
  T('adresse modifiée : position effacée (sera cherchée de nouveau)', adr.statut === 200 && l5?.geocode_le === null && l5?.lat === null)

  console.log('\n── 4. Refus')
  const autre = await B.appel('POST', `/api/crm/chantiers/${c1.id}/valider`, { action: 'remettre' })
  const corps = await A.appel('POST', `/api/crm/chantiers/${c1.id}/valider`, { action: 'valider', statut: 'termine' })
  const reg = await A.appel('PUT', '/api/crm/reglages', { validation_auto: 'oui' })
  const sans = await brut('POST', `/api/crm/chantiers/${c1.id}/valider`, null, { action: 'valider' })
  T('un AUTRE compte : 404 ; corps invalides : 400 ; sans jeton : 401', autre.statut === 404 && corps.statut === 400 && reg.statut === 400 && sans.status === 401, `${autre.statut}/${corps.statut}/${reg.statut}/${sans.status}`)
} catch (e) {
  ko++; console.log(`  ❌ arrêt : ${e.message}`)
} finally {
  for (const id of comptes) { await admin.from('crm_reglages').delete().eq('artisan_id', id); await admin.from('artisans').delete().eq('id', id); await admin.auth.admin.deleteUser(id).catch(() => {}) }
  const restes = comptes.length ? (await admin.from('artisans').select('id').in('id', comptes)).data ?? [] : []
  T(`ménage : ${comptes.length} compte(s) de test supprimé(s)`, restes.length === 0)
  console.log(`\n${ok} vert(s), ${ko} rouge(s)`)
  process.exitCode = ko ? 1 : 0
}
