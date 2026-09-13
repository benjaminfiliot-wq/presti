// Un CANAL d'acquisition n'est pas un apporteur (migration 0086 ; prompt v12 §4).
//
// ── Le défaut que cette suite garde fermé ────────────────────────────────────────────────────────
//
// Donner à Facebook son propre lien prestiapp.fr/a/facebook est la façon la plus simple de savoir
// par où les artisans arrivent. Sauf que ce lien est celui des APPORTEURS, et que la chaîne va
// jusqu'à l'argent sans jamais demander l'avis de personne :
//
//   /a/facebook pose une empreinte signée  →  l'inscription la relit  →  rattacher_apport écrit
//   « prouvé »  →  verdict() rend 20 %  →  le relevé du mois déduit une commission... due à personne.
//
// Sur un seul artisan à 59 € par mois, le relevé se tromperait de 9,44 €. Sur trente, de 283 € par
// mois — dans le sens qui appauvrit l'entreprise, sans qu'aucun écran ne le signale.
// CONDITION, à ne pas taire : depuis 0084 (08/09) plus aucun artisan ne porte role_interne =
// 'partenaire', et app/api/controle/releve/route.ts rend 404 avant même de calculer. Aucune
// commission n'est donc calculée aujourd'hui. Ce garde-fou est une précaution pour le jour où un
// partenaire revient, pas la réparation d'une fuite en cours.
//
// ── Ce qu'elle prouve ────────────────────────────────────────────────────────────────────────────
//
//   1. un canal n'ouvre AUCUN droit à commission, quel que soit son statut au registre, et même si
//      un taux a été réglé à la main dessus ;
//   2. un apporteur normal en ouvre TOUJOURS un — le garde-fou ne se paie pas en faux négatifs ;
//   3. le relevé complet d'un mois : le même artisan à 59 € donne 19,64 € dus s'il a été apporté,
//      et exactement le cas « aucun apport » de l'annexe A du contrat s'il vient d'un canal ;
//   4. les codes 'facebook' et 'linkedin' respectent la contrainte des codes d'apport ;
//   5. la migration 0086 et son jumeau à coller disent bien la même chose ;
//   6. la garde est au bon endroit dans le code (avant le statut, dans verdict()) ;
//   7. et, quand la base est joignable ET 0086 collée : le bout en bout réel. ⚠️ Ce bloc a été
//      ÉCRIT, jamais exécuté à ce jour — il sortait en code 2 tant que 0086 n'était pas collée.
//      Les 0 € et 11,80 € qu'il vérifie sont ce qu'il DOIT produire, pas ce qu'il a produit.
//
// 0 appel IA, 0 euro. Les blocs 1 à 6 tournent partout, sans réseau. Le bloc 7 crée deux comptes
// `canal-*@presti-test.invalid` et un apporteur temporaire, purgés dans un `finally` quoi qu'il
// arrive. Code 2 = « à faire par Benj » (0086 pas encore collée), jamais un faux rouge.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/controle-canaux-e2e.mjs
// Syntaxe : node --check scripts/controle-canaux-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { verdict, RAISON_CANAL, TAUX_PLEIN } from '../lib/direction/apports.ts'
import { calculerReleve } from '../lib/controle/releve.ts'
import { CODE } from '../lib/apports.ts'

if (fs.existsSync('.env.local')) for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const eur = (c) => (c / 100).toFixed(2).replace('.', ',') + ' €'
const lire = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')

const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const rpc = async (f, corps) => (await (await rest(`rpc/${f}`, { method: 'POST', body: JSON.stringify(corps) })).json())
const ligneDe = async (uid) => (await (await rest(`registre_apports?select=*&artisan_id=eq.${uid}`)).json())[0] ?? null

const st = crypto.randomBytes(3).toString('hex')
const comptes = []
let apporteurTest = null

/** Un compte de test, purgeable : l'adresse en @presti-test.invalid est ce qui l'autorise. */
const creer = async (nom) => {
  const email = `canal-${nom}-${st}@presti-test.invalid`
  const password = `Cn-${crypto.randomBytes(9).toString('base64url')}-1`
  const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  if (!u?.id) throw new Error(`création ${nom} : ${JSON.stringify(u).slice(0, 120)}`)
  // Inscrit au ménage AVANT l'insertion dans artisans : si celle-ci lève, l'utilisateur auth vient
  // d'être créé en production et le `finally` ne saurait pas qu'il existe. Un compte orphelin dans
  // une base de production est précisément ce que la règle du ménage veut empêcher.
  comptes.push(u.id)
  const r = await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: `Canal ${nom}`, metier: 'Test', slug: `canal-${nom}-${st}`, plan: 'gratuit', est_demo: true }) })
  if (!r.ok) throw new Error(`artisans ${nom} : ${r.status} ${(await r.text()).slice(0, 120)}`)
  return { uid: u.id, email }
}

/** Le ménage, quoi qu'il arrive : les apports, puis les comptes, puis l'apporteur (clé étrangère). */
const nettoyer = async () => {
  if (!SB || !SVC) return
  for (const id of comptes) await rest(`registre_apports?artisan_id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
  for (const id of comptes) await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: id }) }).catch(() => {})
  if (apporteurTest?.id) await rest(`apporteurs?id=eq.${apporteurTest.id}`, { method: 'DELETE' }).catch(() => {})
  if (comptes.length) console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)${apporteurTest ? ' + l’apporteur temporaire' : ''}`)
}

/** La ligne de relevé d'un client, telle que la construit app/api/controle/releve/route.ts. */
const ligneReleve = (apport, encaisse, canal) => {
  const v = verdict({ ...apport, canal })
  return { artisan_id: 'x', nom: 'Artisan', encaisse, tauxApport: v.compte ? v.tauxPct : 0, statutApport: canal ? 'canal' : apport.statut }
}

console.log('\n══ Canaux d’acquisition et commission ══\n')

try {
  // ── 1. La règle, à sa source ────────────────────────────────────────────────────────────────────
  console.log('1. Un canal ne compte JAMAIS, quel que soit son statut')
  const statuts = [
    { statut: 'prouve', piece: null, motif: null },
    { statut: 'saisi', piece: null, motif: null },
    { statut: 'declare', piece: 'Email du 02/09', motif: null },
    { statut: 'conteste', piece: null, motif: 'désaccord' },
  ]
  for (const s of statuts) {
    const v = verdict({ ...s, canal: true })
    T(`« ${s.statut} » sur un canal → ne compte pas, 0 %`, v.compte === false && v.tauxPct === 0, JSON.stringify(v))
  }
  T('la raison est écrite en français, et dit pourquoi',
    verdict({ ...statuts[0], canal: true }).raison === RAISON_CANAL, verdict({ ...statuts[0], canal: true }).raison)
  // Le chemin le plus vicieux : quelqu'un règle un taux à la main sur la ligne d'un canal (0077).
  T('un taux réglé à la main sur un canal ne rouvre pas la porte',
    verdict({ statut: 'prouve', piece: null, motif: null, taux_pct: 20, canal: true }).tauxPct === 0)
  const source = lire('lib/direction/apports.ts')
  T('la garde passe AVANT le statut dans verdict() — sinon « prouvé » gagnerait',
    source.indexOf('if (l.canal)') > 0 && source.indexOf('if (l.canal)') < source.indexOf('switch (l.statut)'),
    'le test du canal doit précéder le switch sur le statut')

  // ── 2. Le contrôle du contrôle : un apporteur normal garde tous ses droits ──────────────────────
  console.log('\n2. Un apporteur normal, lui, ouvre toujours un droit')
  const normal = verdict({ statut: 'prouve', piece: null, motif: null })
  T(`un apport prouvé SANS canal compte à ${TAUX_PLEIN} %`, normal.compte === true && normal.tauxPct === TAUX_PLEIN, JSON.stringify(normal))
  T('… avec canal: false explicite aussi', verdict({ statut: 'prouve', piece: null, motif: null, canal: false }).tauxPct === 20)
  T('… et un apport déclaré avec pièce également', verdict({ statut: 'declare', piece: 'Email du 02/09', motif: null }).compte === true)
  T('un apport contesté reste à 10 %', verdict({ statut: 'conteste', piece: null, motif: 'x' }).tauxPct === 10)

  // ── 3. Le relevé du mois, au centime — le piège traversé de bout en bout ────────────────────────
  console.log('\n3. Le relevé du mois : ce que le piège coûtait, au centime')
  // L'annexe A du contrat, premier cas : 59 € encaissés d'un client apporté, 8 € de coûts.
  const apporte = calculerReleve('2026-09', [ligneReleve({ statut: 'prouve', piece: null, motif: null }, 5900, false)], 800)
  const parCanal = calculerReleve('2026-09', [ligneReleve({ statut: 'prouve', piece: null, motif: null }, 5900, true)], 800)
  T('apporté : 11,80 € de commission et 19,64 € dus (annexe A, cas 1)',
    apporte.commission === 1180 && apporte.dûAuPartenaire === 1964, `${eur(apporte.commission)} / ${eur(apporte.dûAuPartenaire)}`)
  T('⭑ venu d’un canal : 0 € de commission', parCanal.commission === 0, eur(parCanal.commission))
  // Le même mois, vu autrement : un artisan venu de Facebook doit donner EXACTEMENT le relevé du
  // cas « aucun apport » de l'annexe A — 10,20 € au partenaire, 40,80 € au fondateur.
  T('⭑ … et le relevé retombe sur le cas « aucun apport » de l’annexe A : 10,20 € / 40,80 €',
    parCanal.dûAuPartenaire === 1020 && parCanal.partFondateur === 4080, `${eur(parCanal.dûAuPartenaire)} / ${eur(parCanal.partFondateur)}`)
  T('le chiffre d’affaires, lui, ne bouge pas : un client reste un client',
    parCanal.encaisse === apporte.encaisse && parCanal.resultat === apporte.resultat, `${eur(parCanal.encaisse)} / ${eur(parCanal.resultat)}`)
  T(`le piège coûtait ${eur(apporte.dûAuPartenaire - parCanal.dûAuPartenaire)} par mois et par artisan à 59 €`,
    apporte.dûAuPartenaire - parCanal.dûAuPartenaire === 944, eur(apporte.dûAuPartenaire - parCanal.dûAuPartenaire))
  // Un remboursement sur un client venu d'un canal : rien à reprendre, puisque rien n'a été versé.
  const rendu = calculerReleve('2026-09', [{ ...ligneReleve({ statut: 'prouve', piece: null, motif: null }, 5900, true), rembourse: 5900 }], 0)
  T('un remboursement sur un client de canal ne reprend rien (il n’y avait rien)',
    rendu.commission === 0 && rendu.reprise === 0, `${eur(rendu.commission)} / ${eur(rendu.reprise)}`)

  // ── 4. Les codes ───────────────────────────────────────────────────────────────────────────────
  console.log('\n4. Les codes des canaux passent la contrainte des liens d’apport')
  // Un seul endroit énumère les canaux attendus : le bloc 5 vérifie qu’une migration les crée, le
  // bloc 7 qu’ils sont en base. Ajouter un canal, c’est ajouter une ligne ici — et la suite dit
  // aussitôt ce qui manque, au lieu de laisser un lien de bio muet pendant un mois.
  const CANAUX = ['facebook', 'linkedin', 'instagram', 'linkedindm']
  for (const c of CANAUX) T(`« ${c} » respecte ${CODE}`, CODE.test(c))
  for (const c of ['Facebook', 'fb', 'face book', 'facebook!', 'linked-in']) T(`« ${c} » est refusé`, !CODE.test(c))
  const m0067 = lire('supabase/migrations/0067_apports.sql')
  T('la contrainte SQL de 0067 et la regex du serveur sont la même',
    m0067.includes(CODE.source.replace(/^\^|\$$/g, '')), CODE.source)

  // ── 5. La migration et son jumeau à coller ──────────────────────────────────────────────────────
  console.log('\n5. La migration 0086 et le fichier que Benj colle')
  const m = lire('supabase/migrations/0086_canaux_apport.sql')
  const jumeau = lire('supabase/migrations/_A_COLLER_sql_editor_0086_NU.sql')
  T('0086 existe', m.length > 0, 'supabase/migrations/0086_canaux_apport.sql')
  T('elle ajoute la colonne sans casser l’existant (add column if not exists, default false)',
    /add column if not exists canal boolean not null default false/i.test(m))
  T('elle explique la colonne en base (comment on column)', /comment on column public\.apporteurs\.canal/i.test(m))
  T('elle insère les deux canaux du §4', /'facebook'/.test(m) && /'linkedin'/.test(m))
  T('… et elle les marque bien comme canaux, même si le code existait déjà',
    /on conflict \(code\) do update set canal = true/i.test(m))
  T('aucun bloc « do » ni mot-clé CONSTANT (ce qui a fait refuser un collage le 08/09)',
    !/^\s*do \$/im.test(m) && !/\bconstant\b/i.test(m.replace(/^\s*--.*$/gm, '')))
  T('le jumeau à coller existe', jumeau.length > 0, 'supabase/migrations/_A_COLLER_sql_editor_0086_NU.sql')
  T('… et il porte la colonne et les deux codes',
    /add column if not exists canal/i.test(jumeau) && /'facebook'/.test(jumeau) && /'linkedin'/.test(jumeau))

  // 0087 ajoute Instagram, le jour où @prem_iumagence est devenu @prestiapp. Fichier séparé plutôt
  // que ligne ajoutée à 0086 : 0086 est déjà collée, la retoucher ne changerait rien à la base.
  const m87 = lire('supabase/migrations/0087_canal_instagram.sql')
  const jumeau87 = lire('supabase/migrations/_A_COLLER_sql_editor_0087_NU.sql')
  T('0087 existe', m87.length > 0, 'supabase/migrations/0087_canal_instagram.sql')
  T('elle insère les deux nouveaux canaux et les marque comme tels',
    /'instagram'/.test(m87) && /'linkedindm'/.test(m87) && /on conflict \(code\) do update set canal = true/i.test(m87))
  T('elle tient debout seule (elle reprend la colonne de 0086)',
    /add column if not exists canal boolean not null default false/i.test(m87))
  T('son jumeau à coller porte les deux codes', /'instagram'/.test(jumeau87) && /'linkedindm'/.test(jumeau87), '_A_COLLER_sql_editor_0087_NU.sql')
  // Chaque canal du bloc 4 doit être créé par une migration : sinon /a/<code> redirige sans poser
  // d’empreinte (app/a/[code]/route.ts) et l’arrivée n’est comptée nulle part.
  const migrationsCanaux = m + m87
  for (const c of CANAUX) T(`« ${c} » est créé par une migration`, new RegExp(`'${c}'`).test(migrationsCanaux))

  // ── 6. Les gardes, là où l'argent se calcule ────────────────────────────────────────────────────
  console.log('\n6. Les gardes sont aux endroits qui décident de l’argent')
  const releve = lire('app/api/controle/releve/route.ts')
  // Le select est vérifié CHAMP PAR CHAMP, pas par sa chaîne exacte : figer la chaîne rendait le
  // test rouge dès qu'on ajoutait une colonne — ce qui vient d'arriver avec `taux_pct`, et ce
  // n'était pas une régression. Un test doit rougir quand le comportement change, pas quand la
  // ponctuation change.
  const selectApports = releve.match(/from\('registre_apports'\)\s*\.select\('([^']+)'\)/)?.[1] ?? ''
  const champs = selectApports.split(',').map((c) => c.trim())
  T('le relevé lit l’apporteur de chaque apport', champs.includes('apporteur_id'))
  // `taux_pct` manquait au select : verdict() sait lire un taux réglé à la main (fourchette 10-20 %
  // de 0077) mais il ne lui arrivait jamais, donc tout était payé au taux plein de 20 %. Sans cette
  // ligne, la régression revient sans bruit sur l'écran qui engage l'argent.
  T('… et le taux réglé à la main (0077), sinon la fourchette 10-20 % est ignorée', champs.includes('taux_pct'))
  T('… et passe le canal à verdict() au lieu de recopier un taux',
    /const canal = estCanal\(/.test(releve) && /verdict\(\{[\s\S]{0,160}canal \}\)/.test(releve))
  const registre = lire('app/api/controle/apports/route.ts')
  T('le registre écarte les canaux de la file de revue', /filter\(\(l\) => !estCanal\(/.test(registre))
  T('déclarer un apport sur un code de canal est refusé', /canalParCode\(/.test(registre))
  T('régler une commission sur un canal est refusé', /estCanal\(apporteurs, avant\.apporteur_id\)/.test(registre))
  T('le score de confiance ne pèse pas les canaux', /eq\('canal', true\)/.test(lire('lib/controle/confiance.ts')))
  const clients = lire('app/api/controle/clients/route.ts')
  T('la liste des clients distingue « apporté » et « canal »', /type: 'canal'/.test(clients) && /type: 'apporte'/.test(clients))

  // ── 7. Le bout en bout, contre la vraie base ────────────────────────────────────────────────────
  console.log('\n7. Bout en bout : la base, le rattachement, et le relevé qui en découle')
  if (!SB || !SVC) {
    console.log('  ⏭  base non configurée (.env.local) — les blocs 1 à 6 tournent sans elle')
  } else {
    const sonde = await rest('apporteurs?select=id,code,canal&limit=1')
    if (!sonde.ok) {
      const raison = sonde.status === 401 || sonde.status === 403
        ? `clé de service refusée (HTTP ${sonde.status}) — ce n’est pas la migration`
        : `la colonne « canal » n’existe pas encore (HTTP ${sonde.status})`
      console.log(`  ⛔ À faire (Benj) : coller supabase/migrations/_A_COLLER_sql_editor_0086_NU.sql dans le SQL Editor.`)
      console.log(`     ${raison}`)
      process.exitCode = 2
    } else {
      const canaux = await (await rest('apporteurs?select=id,code,nom,canal,actif&canal=is.true')).json()
      const codes = canaux.map((a) => a.code).sort()
      // Un canal attendu absent de la base n’est pas un échec de code : c’est un collage en
      // attente. On le dit comme tel (sortie 2, comme la colonne manquante plus haut) — mais on
      // le dit, sinon le lien de la bio reste muet sans que personne s’en aperçoive.
      const manquants = CANAUX.filter((c) => !codes.includes(c))
      if (manquants.length) {
        console.log(`  ⛔ À faire (Benj) : coller supabase/migrations/_A_COLLER_sql_editor_0087_NU.sql — canal absent : ${manquants.join(', ')}`)
        process.exitCode = 2
      }
      T('les canaux de 0086, déjà collée, sont en base et actifs',
        codes.includes('facebook') && codes.includes('linkedin') && canaux.every((a) => a.actif), codes.join(', ') || 'aucun')
      const autres = await (await rest('apporteurs?select=code,canal&canal=is.false')).json()
      T('les apporteurs déjà en place n’ont pas été transformés en canaux',
        Array.isArray(autres) && autres.every((a) => a.canal === false), `${autres.length ?? 0} apporteur(s) rémunéré(s)`)

      // Un artisan qui arrive par /a/facebook, comme le ferait un vrai visiteur.
      const A = await creer('facebook')
      const rA = await rpc('rattacher_apport', { p_artisan: A.uid, p_code: 'facebook', p_source: 'lien', p_preuve: { code: 'facebook', arrivee: new Date().toISOString(), source: 'lien' } })
      const lA = await ligneDe(A.uid)
      T('l’arrivée par le canal entre bien au registre (le suivi marche)', rA === 'ok' && !!lA, String(rA))
      T('… avec le statut le plus fort, « prouvé » — c’est là qu’était le piège', lA?.statut === 'prouve', String(lA?.statut))
      const canalA = canaux.some((c) => c.id === lA?.apporteur_id)
      const relA = calculerReleve('2026-09', [ligneReleve({ statut: lA?.statut, piece: lA?.piece ?? null, motif: lA?.motif ?? null }, 5900, canalA)], 800)
      T('⭑ et pourtant le relevé ne doit rien : 0 € de commission sur ce client',
        canalA === true && relA.commission === 0, `canal=${canalA}, ${eur(relA.commission)}`)

      // Le contrôle du contrôle, contre la même base : un apporteur ordinaire commissionne toujours.
      const cree = await (await rest('apporteurs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ code: `e2ecan${st}`, nom: `Apporteur e2e ${st}` }) })).json()
      apporteurTest = Array.isArray(cree) ? cree[0] : null
      T('un apporteur ordinaire se crée avec canal = false par défaut', apporteurTest?.canal === false, JSON.stringify(cree).slice(0, 140))
      const B = await creer('apporteur')
      const rB = await rpc('rattacher_apport', { p_artisan: B.uid, p_code: apporteurTest.code, p_source: 'lien', p_preuve: { code: apporteurTest.code, arrivee: new Date().toISOString(), source: 'lien' } })
      const lB = await ligneDe(B.uid)
      const canalB = canaux.some((c) => c.id === lB?.apporteur_id)
      const relB = calculerReleve('2026-09', [ligneReleve({ statut: lB?.statut, piece: lB?.piece ?? null, motif: lB?.motif ?? null }, 5900, canalB)], 800)
      T('⭑ le même parcours derrière un vrai apporteur commissionne 11,80 €',
        rB === 'ok' && canalB === false && relB.commission === 1180, `${rB} · ${eur(relB.commission)}`)
    }
  }
} catch (e) {
  ko++
  console.log('  ❌ exception :', e?.stack?.split('\n').slice(0, 3).join(' | ') || e)
} finally {
  await nettoyer()
  if (process.exitCode === 2 && ko === 0) {
    console.log(`\n⛔ controle-canaux-e2e : ${ok}/${ok + ko} — la partie base attend un collage\n`)
  } else {
    console.log(`\n${ko === 0 ? '✅' : '❌'} controle-canaux-e2e : ${ok}/${ok + ko}\n`)
    process.exitCode = ko === 0 ? 0 : 1
  }
}
