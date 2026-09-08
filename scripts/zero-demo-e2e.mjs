// Le garde-fou contre le retour du faux (prompt v11 §2.4).
//
// Cette suite existe à cause d'un incident réel, le 07/09 : la suite `smoke-test` créait en production un
// compte `is_founder = true` et ne le supprimait qu'au chemin heureux. Une exception l'a laissé en base.
// La migration 0065, collée plus tard, a fait confiance à la base et lui a donné le rôle « direction » du
// Centre. Un compte de test s'est retrouvé administrateur de l'entreprise, et personne ne l'a vu.
//
// Ce que la suite vérifie, en production, à chaque passage :
//   1. AUCUN compte privilégié inattendu — la liste des fondateurs et des rôles est close, et écrite ici ;
//   2. aucun compte de test ni de démonstration en base, hors ceux qui ont une raison d'être ;
//   3. les chiffres du produit ne comptent aucun compte de test ;
//   4. aucun composant de démonstration importé par une page du produit.
//
// Elle doit rester verte POUR TOUJOURS. Si elle échoue, ce n'est pas elle qu'on ajuste : c'est la base
// ou le code qu'on nettoie. La seule modification légitime de la liste close ci-dessous est l'arrivée
// — ou le DÉPART — d'un associé, décidée par Benj. Le 08/09/2026 : départ d'Alexandre MESROUA, seul
// partenaire qu'ait eu Presti (migration 0084). La liste est repassée à un seul nom.
//
// Et un angle mort levé le même jour : cette suite contrôlait `is_founder` et `direction_roles`, pas
// `artisans.role_interne` — or c'est LUI qui décide du périmètre depuis le v11 (lib/controle/droits.ts),
// et c'est lui que 0068 posait par une instruction nommée. Un rôle d'entreprise accordé hors de la
// liste serait passé inaperçu. Il est contrôlé ci-dessous.
//
// Usage : node scripts/zero-demo-e2e.mjs
// Contrôle de syntaxe : node --check scripts/zero-demo-e2e.mjs

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

for (const f of ['.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !SERVICE) { console.log('\n⛔ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis.\n'); process.exit(2) }
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })

// ── La liste close ────────────────────────────────────────────────────────────────────────────────────
// Les seules adresses autorisées à porter un privilège en production. Toute autre est une anomalie.
const FONDATEURS = ['benjaminfiliot@gmail.com']
// Le compte que les stores exigent pour relire l'application. Il n'est PAS fondateur, et ne compte
// dans aucun chiffre (v11 §2.3).
const COMPTE_STORE = 'relecture-stores@presti-test.invalid'
// Ce à quoi ressemble un compte fabriqué pendant un sprint.
const MOTIFS_TEST = [/@presti-test\.invalid$/i, /@example\.(com|org|net)$/i, /^(smoke|verif|fact|j\d|wl|test|demo)[.-]/i, /@x\.fr$/i]

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

const estTest = (email) => !!email && email !== COMPTE_STORE && MOTIFS_TEST.some((m) => m.test(email))

async function main() {
  console.log('\n══ Zéro démo, zéro test : le garde-fou ══\n')

  // ── 1. Les privilèges ───────────────────────────────────────────────────────────────────────────────
  console.log('1. Qui a des privilèges en production')
  const { data: artisans, error } = await admin.from('artisans').select('id, email, nom, is_founder, role_interne, est_demo, plan, created_at')
  if (error) { console.log(`  ⛔ base injoignable : ${error.message}\n`); process.exit(2) }

  const fondateurs = (artisans ?? []).filter((a) => a.is_founder)
  const intrus = fondateurs.filter((a) => !FONDATEURS.includes((a.email ?? '').toLowerCase()))
  T('aucun fondateur inattendu', intrus.length === 0,
    intrus.map((a) => `${a.email} (créé le ${String(a.created_at).slice(0, 10)}) — retirer is_founder et supprimer`).join(' · '))
  T('les deux fondateurs attendus sont là', FONDATEURS.every((e) => fondateurs.some((a) => (a.email ?? '').toLowerCase() === e)),
    `trouvés : ${fondateurs.map((a) => a.email).join(', ')}`)

  // Le rôle d'ENTREPRISE — celui qui décide réellement du périmètre (v11 §5). Il se pose par
  // migration nommée, donc il survit à tout, y compris à un départ : à contrôler comme les autres.
  const avecRole = (artisans ?? []).filter((a) => a.role_interne)
  const rolesInternesIntrus = avecRole.filter((a) => !FONDATEURS.includes((a.email ?? '').toLowerCase()))
  T('aucun rôle d’entreprise accordé hors des fondateurs', rolesInternesIntrus.length === 0,
    rolesInternesIntrus.map((a) => `${a.email} → role_interne = ${a.role_interne}`).join(' · '))

  const { data: roles } = await admin.from('direction_roles').select('user_id, role')
  const parId = new Map((artisans ?? []).map((a) => [a.id, a]))
  const rolesIntrus = (roles ?? []).filter((r) => !FONDATEURS.includes((parId.get(r.user_id)?.email ?? '').toLowerCase()))
  T('aucun rôle du Centre accordé hors des fondateurs', rolesIntrus.length === 0,
    rolesIntrus.map((r) => `${parId.get(r.user_id)?.email ?? r.user_id} → ${r.role}`).join(' · '))

  // ── 2. Les comptes fabriqués ────────────────────────────────────────────────────────────────────────
  //
  // La règle n'est pas « aucun compte de test en base » — la purge est irréversible et attend Benj, et
  // le compte de relecture des stores doit rester (Apple et Google l'exigent). La règle est : un compte
  // de test est soit ABSENT, soit MARQUÉ `est_demo`, donc exclu de tous les chiffres. Un compte de test
  // qui n'est pas marqué gonfle silencieusement le nombre de clients : c'est ça, l'anomalie.
  console.log('\n2. Ce qui traîne en base')
  const tests = (artisans ?? []).filter((a) => estTest(a.email))
  const nonMarques = tests.filter((a) => !a.est_demo)
  T('tout compte de test est marqué « démo », donc hors des chiffres', nonMarques.length === 0,
    nonMarques.map((a) => `${a.email} — ${a.nom ?? 'sans nom'}, créé le ${String(a.created_at).slice(0, 10)} — poser est_demo`).join('\n        '))
  if (tests.length) {
    // La purge du 07/09 a effacé tout ce qui pouvait l'être. Ce qui reste, reste POUR UNE RAISON, et
    // la raison doit être lisible ici — sinon quelqu'un finira par « finir le ménage » et casser
    // les captures de la vitrine ou la relecture des stores.
    console.log(`     ℹ️  ${tests.length} compte(s) conservé(s) volontairement (marqués, hors de tous les chiffres) :`)
    for (const a of tests) {
      // La raison est CALCULÉE, pas supposée. Elle était écrite en dur — « porte une facture émise »
      // pour tout compte qui n'était ni le compte des stores ni la démo. Le 08/09, un compte affichait
      // donc cette raison avec zéro facture : la suite justifiait sa présence par un fait qu'elle
      // n'avait pas vérifié. Un garde-fou qui invente ses raisons finit par couvrir n'importe quoi.
      const { count: nFactures } = await admin.from('factures').select('id', { count: 'exact', head: true }).eq('artisan_id', a.id)
      const pourquoi = a.email === COMPTE_STORE ? 'exigé par Apple et Google pour relire l’application'
        : a.email === 'demo-menuisier@presti-test.invalid' ? 'alimente les captures de la vitrine, et quatre suites s’appuient dessus'
        : (nFactures ?? 0) > 0 ? `porte ${nFactures} facture(s) émise(s) : dix ans de conservation (art. L. 102 B du LPF)`
        : 'AUCUNE raison identifiée — hors des chiffres, mais purgeable : il ne tient à rien'
      console.log(`        · ${a.email} — ${pourquoi}`)
    }
  }
  // Un compte marqué « démo » dont l'adresse n'a rien d'un compte de test : c'est un compte INTERNE,
  // écarté des chiffres parce qu'il n'est pas un client. Sans cette ligne, personne ne saurait dans six
  // mois pourquoi une vraie adresse porte le marqueur — et quelqu'un finirait par le retirer.
  const internes = (artisans ?? []).filter((a) => a.est_demo && !estTest(a.email))
  if (internes.length) {
    console.log(`     ℹ️  ${internes.length} compte(s) interne(s), écarté(s) des chiffres sans être des comptes de test :`)
    for (const a of internes) console.log(`        · ${a.email} — ${a.plan}, offert ; n'est pas un client`)
  }

  T('le compte de relecture des stores est présent et NON fondateur',
    (artisans ?? []).some((a) => a.email === COMPTE_STORE && !a.is_founder),
    (artisans ?? []).find((a) => a.email === COMPTE_STORE) ? 'il est fondateur !' : 'absent — Apple et Google l’exigent')

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 })
  const orphelins = (users?.users ?? []).filter((u) => estTest(u.email) && !parId.has(u.id))
  T('aucun compte de connexion orphelin', orphelins.length === 0, orphelins.map((u) => u.email).join(' · '))

  // ── 3. Les chiffres du Poste de contrôle ────────────────────────────────────────────────────────────
  //
  // C'est le contrôle qui compte vraiment : peu importe ce qui traîne en base, aucun compte marqué ne
  // doit apparaître dans un chiffre montré à Benj. On le vérifie sur la même règle que le serveur.
  console.log('\n3. Les chiffres ne comptent que de vrais artisans')
  const compte = (a) => !a.is_founder && !a.est_demo && !(a.email ?? '').endsWith('@presti-test.invalid')
  const vrais = (artisans ?? []).filter(compte)
  const marquesQuiComptent = (artisans ?? []).filter((a) => (a.est_demo || estTest(a.email)) && compte(a))
  T('aucun compte marqué ne passe le filtre des chiffres', marquesQuiComptent.length === 0,
    marquesQuiComptent.map((a) => a.email).join(' · '))
  console.log(`     ℹ️  ${vrais.length} artisan(s) comptent aujourd'hui : ${vrais.map((a) => a.email).join(', ') || 'aucun'}`)

  // ── 3 bis. Les données attachées aux comptes de test ─────────────────────────────────────────────────
  console.log('\n3 bis. Ce que ces comptes ont produit (signalé, pas supprimé)')
  const idsTest = new Set(tests.map((a) => a.id))
  for (const [table, colonne] of [['leads', 'artisan_id'], ['devis', 'artisan_id'], ['factures', 'artisan_id']]) {
    const { count } = await admin.from(table).select('id', { count: 'exact', head: true }).in(colonne, [...idsTest, '00000000-0000-0000-0000-000000000000'])
    // ⚠️ Une facture émise est scellée (0041, conservation 10 ans) : on la SIGNALE, on ne la supprime pas.
    // Informatif : ces lignes appartiennent à des comptes marqués, donc hors des chiffres. Les faire
    // échouer bloquerait la suite pour un état que Benj a choisi de garder — et un garde-fou toujours
    // rouge ne signale plus rien.
    console.log(`     · ${table} : ${count ?? 0} ligne(s) rattachée(s) à un compte marqué${table === 'factures' && (count ?? 0) > 0 ? ' (scellées par 0041 — à exclure, jamais à supprimer)' : ''}`)
  }

  // ── 4. Le code ──────────────────────────────────────────────────────────────────────────────────────
  console.log('\n4. Aucun écran du produit ne montre du fabriqué')
  const racine = process.cwd()
  const pages = []
  const parcourir = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name.startsWith('_to_delete')) continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) parcourir(p)
      else if (/\.(tsx|ts)$/.test(e.name)) pages.push(p)
    }
  }
  parcourir(path.join(racine, 'app'))

  // La règle juste n'est pas « aucun composant de démonstration » — la vitrine marketing a le droit d'en
  // avoir (v11 §2.3 : la séquence est tournée sur le vrai produit, c'est du marketing honnête). C'est le
  // PRODUIT qui n'en veut aucun : ce qu'un artisan, ou la direction, voit après s'être connecté.
  const PRODUIT = /app[\\/]+(dashboard|parametres|direction|controle|inventaire|devis|factures|clients|conversations|plateforme|onboarding|api)[\\/]/i
  const estProduit = (p) => PRODUIT.test(p)
  const suspects = []
  for (const p of pages) {
    if (!estProduit(p)) continue
    const src = fs.readFileSync(p, 'utf8')
    const m = src.match(/\b(?:const|let)\s+(DEMO|MOCK|FIXTURE|EXEMPLES?|SAMPLE)[A-Z_]*\s*[:=]/i)
    if (m) suspects.push(`${path.relative(racine, p)} → ${m[1]}`)
  }
  T('aucune donnée fabriquée en dur dans un écran du produit', suspects.length === 0, suspects.join('\n        '))

  const importsDemo = pages.filter((p) => estProduit(p) && /from\s+['"][^'"]*(Demo|Showcase|Mock|Fixture)[^'"]*['"]/.test(fs.readFileSync(p, 'utf8')))
  T('aucune page du produit n’importe un composant de démonstration', importsDemo.length === 0,
    importsDemo.map((p) => path.relative(racine, p)).join(' · '))

  console.log(`\n══ ${ok} vérifications passées, ${ko} en échec ══`)
  if (ko > 0) console.log('\n⚠️  Cette suite ne s’ajuste pas : c’est la base ou le code qu’il faut nettoyer.\n')
  else console.log('')
  process.exit(ko === 0 ? 0 : 1)
}

main().catch((e) => { console.error('\n💥', e?.message ?? e, '\n'); process.exit(1) })
