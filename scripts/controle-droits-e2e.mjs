// Les droits d'Alexandre, éprouvés en rejouant CHAQUE action interdite (prompt v11 §5 et §7).
//
// Le §5 pose la règle : « Toute écriture hors de son périmètre est refusée côté serveur, pas seulement
// masquée dans l'interface. » Cette suite ne regarde donc aucun écran. Elle prend le jeton d'un
// partenaire et frappe chaque route, une par une, en vérifiant le CORPS de la réponse — un 200 qui
// contient la comptabilité de l'entreprise serait un échec même si l'écran ne l'affiche pas.
//
// Ce qu'elle vérifie :
//   1. le partenaire entre dans le Poste de contrôle (le contrat le prévoit — article 7) ;
//   2. il LIT les clients et les abonnements, et n'y écrit rien ;
//   3. il ne voit NI la comptabilité, NI la santé, NI la sécurité, NI les réglages ;
//   4. il ne peut agir sur AUCUN artisan — les huit gestes répondent 403 ;
//   5. il ne voit que SES apports, SES fils de messagerie, SES lignes de journal ;
//   6. et le plus important : avec son jeton de navigateur, PostgREST ne lui rend
//      **aucun devis, aucune demande, aucune facture** d'artisan. C'est le trou trouvé le 07/09 :
//      `is_founder()` ne regardait que le drapeau technique, et lui ouvrait tout.
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/controle-droits-e2e.mjs
// Contrôle de syntaxe : node --check scripts/controle-droits-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const f of ['.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
const APP = (process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !ANON || !SERVICE) { console.log('\n⛔ NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY requis.\n'); process.exit(2) }

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const SAUT = (n, w) => console.log(`  ⏭  ${n} — ${w}`)

const marque = `droits-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
const comptes = []

async function compte({ role }) {
  const email = `${marque}-${role}@presti-test.invalid`
  const password = `Dr-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !u?.user?.id) return null
  comptes.push(u.user.id)
  const { error: eA } = await admin.from('artisans').insert({
    id: u.user.id, email, nom: `Droits ${role}`, metier: 'Test', slug: `${marque}-${role}`,
    plan: 'gratuit', is_founder: true, role_interne: role, est_demo: true,
  })
  if (eA) { console.log('     insertion :', eA.message); return null }
  await admin.from('direction_roles').upsert({ user_id: u.user.id, role: role === 'partenaire' ? 'lecture' : 'direction' }, { onConflict: 'user_id' })
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password })
  const jeton = s?.session?.access_token
  if (!jeton) return null
  await verifierSessionTest(jeton)
  return { uid: u.user.id, email, jeton, password }
}

const api = async (chemin, jeton, init = {}) => {
  const r = await fetch(`${APP}${chemin}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'presti-controle-droits (Chrome; Windows)', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(init.headers ?? {}) },
  })
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch { /* le statut suffit */ }
  return { statut: r.status, data: j, brut: t }
}

async function main() {
  console.log('\n══ Les droits du partenaire — en production ══\n')
  console.log(`  Cible : ${APP}\n`)

  const ferme = await api('/api/controle/clients', null)
  if (ferme.statut === 404) { console.log('  ⛔ Le Poste de contrôle est fermé (drapeau baissé). Rien à éprouver.\n'); process.exit(2) }

  console.log('1. Le partenaire entre, mais en lecture')
  const p = await compte({ role: 'partenaire' })
  if (!p?.jeton) { console.log('  ⛔ création du partenaire de test impossible\n'); process.exit(1) }
  const clients = await api('/api/controle/clients', p.jeton)
  T('il voit la liste des clients (article 7 du contrat)', clients.statut === 200, `${clients.statut} — ${clients.brut.slice(0, 120)}`)
  T('son rôle est bien « lecture »', clients.data?.role === 'lecture', String(clients.data?.role))

  // ── 2. Les domaines fermés ──────────────────────────────────────────────────────────────────────
  console.log('\n2. Ce qu’il ne doit pas voir du tout')
  for (const [nom, chemin] of [
    ['la santé du système', '/api/controle/etat'],
    ['les tâches de santé', '/api/controle/a-faire'],
    ['les bannissements', '/api/controle/securite/bans'],
    ['les réglages', '/api/controle/reglages'],
    ['la comptabilité', '/api/controle/compta'],
    ['la fréquentation du site', '/api/controle/audience'],
  ]) {
    const r = await api(chemin, p.jeton)
    T(`${nom} → 403`, r.statut === 403 && r.data?.code === 'hors_perimetre', `${r.statut} ${r.data?.code ?? ''} — ${r.brut.slice(0, 100)}`)
  }

  // ── 3. Les huit gestes sur un artisan ───────────────────────────────────────────────────────────
  console.log('\n3. Aucun geste sur un artisan')
  const { data: cible } = await admin.from('artisans').select('id').eq('is_founder', false).limit(1).maybeSingle()
  if (!cible) SAUT('gestes sur un artisan', 'aucun artisan cible en base')
  else {
    for (const corps of [
      { action: 'crediter', credits: 5, motif: 'test droits' },
      { action: 'suspendre', motif: 'test droits' },
      { action: 'reactiver', motif: 'test droits' },
      { action: 'offre', vers: 'studio', motif: 'test droits' },
      { action: 'rembourser', montant: 1, motif: 'test droits' },
      { action: 'pause', motif: 'test droits' },
      { action: 'reprendre', motif: 'test droits' },
      { action: 'portail', motif: 'test droits' },
      { action: 'email', modele: 'bonjour' },
    ]) {
      const r = await api(`/api/controle/clients/${cible.id}/action`, p.jeton, { method: 'POST', body: JSON.stringify(corps) })
      T(`« ${corps.action} » → 403`, r.statut === 403, `${r.statut} — ${r.brut.slice(0, 110)}`)
    }
  }

  // ── 4. Ce qu'il voit, mais borné aux siennes ────────────────────────────────────────────────────
  console.log('\n4. Ce qu’il voit ne concerne que lui')
  const j = await api('/api/controle/journal?limite=50', p.jeton)
  T('le journal lui répond', j.statut === 200, `${j.statut} — ${j.brut.slice(0, 110)}`)
  if (j.statut === 200) {
    const lignes = j.data?.lignes ?? j.data?.journal ?? []
    const etrangeres = lignes.filter((l) => l.acteur_email && l.acteur_email !== p.email)
    T('il n’y voit AUCUNE action d’un autre', etrangeres.length === 0,
      `${etrangeres.length} ligne(s) d’autrui, ex. ${JSON.stringify(etrangeres[0] ?? {}).slice(0, 100)}`)
  }
  // ÉCRIRE dans la messagerie : `relever` va chercher la boîte IMAP de l'entreprise ENTIÈRE et
  // inscrit les courriers de tout le monde. Le partenaire a `messagerie.ecrire` — borné à « les
  // siennes », sauf qu'une boîte commune n'a pas de version sienne. La route ne relisait pas la
  // borne ; la suite n'éprouvait que la lecture.
  const releve = await api('/api/controle/courriers/relever', p.jeton, { method: 'POST' })
  T('⭑ le partenaire ne déclenche pas la relève de la boîte commune',
    [403, 404].includes(releve.statut), `HTTP ${releve.statut} — ${releve.brut.slice(0, 120)}`)
  if (releve.statut === 403) T('… et le refus dit pourquoi, en français',
    /commune|périmètre|vôtres/i.test(releve.brut), releve.brut.slice(0, 120))

  const courriers = await api('/api/controle/courriers?statut=tous', p.jeton)
  if (courriers.statut === 200) {
    const fils = courriers.data?.fils ?? []
    T('la messagerie ne lui montre aucun fil non assigné', fils.length === 0, `${fils.length} fil(s) visibles`)
  } else T('la messagerie lui répond', courriers.statut === 200, `${courriers.statut} — ${courriers.brut.slice(0, 100)}`)

  const apports = await api('/api/controle/apports', p.jeton)
  if (apports.statut === 200) {
    const lignes = apports.data?.lignes ?? apports.data?.apports ?? []
    T('le registre ne lui montre que ses apports (aucun ici)', lignes.length === 0, `${lignes.length} ligne(s)`)
    // Un SAUT est légitime quand le PRÉALABLE manque, pas quand la route répond mal : un 500,
    // ou un 403 qui signalerait une régression de droits, faisait passer la suite au vert.
  } else T('le registre des apports répond au partenaire', false, `HTTP ${apports.statut} — ${apports.brut.slice(0, 120)}`)

  // ── 5. Le trou du 07/09 : PostgREST ─────────────────────────────────────────────────────────────
  console.log('\n5. Avec son jeton de navigateur, la base ne lui donne rien')
  const nav = createClient(URL_SB, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${p.jeton}` } } })
  for (const table of ['devis', 'leads', 'factures', 'devis_lignes']) {
    const { data, error } = await nav.from(table).select('id').limit(5)
    // Il n'a lui-même ni devis ni demande : tout ce qu'il verrait appartiendrait à quelqu'un d'autre.
    T(`aucune ligne de ${table}`, !data?.length, error ? `refus : ${error.message}` : `${data?.length} ligne(s) LUES !`)
  }
  const { data: autres } = await nav.from('artisans').select('id, email').neq('id', p.uid).limit(5)
  T('il ne lit pas la fiche des autres artisans par PostgREST', !autres?.length,
    `${autres?.length} fiche(s) lues, ex. ${autres?.[0]?.email ?? ''}`)
  const { error: eEcr } = await nav.from('artisans').update({ role_interne: 'fondateur' }).eq('id', p.uid)
  const { data: apresEcr } = await admin.from('artisans').select('role_interne').eq('id', p.uid).maybeSingle()
  T('il ne peut pas s’attribuer le rôle de fondateur', apresEcr?.role_interne === 'partenaire',
    `role_interne = ${apresEcr?.role_interne} ${eEcr ? '(refus : ' + eEcr.message.slice(0, 60) + ')' : '(écriture acceptée !)'}`)

  // ── 6. Un fondateur, lui, passe partout ─────────────────────────────────────────────────────────
  console.log('\n6. Le contrôle du contrôle : un fondateur n’est pas bloqué')
  const b = await compte({ role: 'fondateur' })
  if (!b?.jeton) SAUT('fondateur', 'création impossible')
  else {
    for (const [nom, chemin] of [['la santé', '/api/controle/etat'], ['les bannissements', '/api/controle/securite/bans'], ['le journal', '/api/controle/journal?limite=5']]) {
      const r = await api(chemin, b.jeton)
      T(`${nom} → 200 pour un fondateur`, r.statut === 200, `${r.statut} — ${r.brut.slice(0, 100)}`)
    }
  }

  console.log(`\n══ ${ok} vérifications passées, ${ko} en échec ══\n`)
}

/** Le ménage, garanti : ces comptes portent `is_founder`. Privilèges retirés d'abord. */
async function menage() {
  for (const id of comptes) {
    await admin.from('direction_roles').delete().eq('user_id', id).then(() => {}, () => {})
    await admin.from('artisans').update({ is_founder: false, role_interne: null, plan: 'gratuit' }).eq('id', id).then(() => {}, () => {})
    await admin.from('journal_direction').delete().eq('acteur_id', id).then(() => {}, () => {})
    await admin.rpc('purger_compte_test', { p_id: id }).then(() => {}, () => {})
    await admin.from('artisans').delete().eq('id', id).then(() => {}, () => {})
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
  const { count } = await admin.from('artisans').select('id', { count: 'exact', head: true }).like('email', `%${marque}%`)
  if (count) console.error(`  ⚠️  ${count} compte(s) SUBSISTENT — ils portent des privilèges, vérifiez-les.`)
  else if (comptes.length) console.log(`  🧹 ${comptes.length} compte(s) de test purgé(s)`)
}

main()
  .catch((e) => { console.error('\n💥 La suite s’est arrêtée :', e?.message ?? e); ko++ })
  .finally(async () => { await menage(); process.exit(ko === 0 ? 0 : 1) })
