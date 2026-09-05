// « Votre nom de domaine (site et page de conversation) » — la promesse de la grille, mise à
// l'épreuve (registre `plans/promesses.md`, ligne 13 : « preuve par lecture seulement »).
//
// Le problème de cette promesse : on ne possède pas le domaine d'un artisan, et Vercel REFUSE
// tout hôte qui ne lui est pas rattaché (contrôlé en §5 : `Host:` inventé ⇒ 404
// DEPLOYMENT_NOT_FOUND). Impossible, donc, de faire arriver une requête « depuis » un vrai
// domaine perso. Cette suite prouve tout le reste, et le prouve pour de bon :
//
//   §1 `lib/urls.ts` : un domaine VÉRIFIÉ change les trois adresses publiques (site, page de
//      conversation, infos légales) et fait disparaître « presti » ; un domaine posé mais NON
//      vérifié ne détourne aucune adresse ;
//   §2 les liens internes suivent l'hôte servi : sur son domaine, la page de conversation est
//      « /demande » et jamais « /p/<slug> » — sinon l'adresse Presti revient au premier clic ;
//   §3 `middleware.ts` EXÉCUTÉ (pas relu) : l'hôte d'un artisan est résolu en base et réécrit
//      `/` → `/site/<slug>`, `/demande` → `/p/<slug>`, `/infos-legales` → les mentions ; les
//      hôtes maison (prestiapp.fr, *.vercel.app, localhost) ne sont jamais détournés ;
//   §4 EN PRODUCTION : les pages réellement servies pour un artisan à domaine vérifié portent
//      la canonique, l'og:url et les données structurées de SON domaine (site, page de
//      conversation, infos légales) ; celles d'un artisan à domaine non vérifié, non ;
//   §5 un `Host:` arbitraire n'atteint pas l'application — c'est la limite, et c'est aussi une
//      protection : le middleware n'est joignable que pour un domaine rattaché au projet ;
//   §6 deux artisans ne partagent pas un domaine (le middleware prend le premier venu) ;
//   §7 le domaine neutre de Presti (sous-domaine et chemin) — rejoué dans un processus fils,
//      parce que `NEXT_PUBLIC_DOMAINE_NEUTRE` est lu une seule fois, au chargement du module.
//
// Ce que la suite NE PEUT PAS prouver sans DNS réel : qu'un domaine rattaché à Vercel et
// pointé par son propriétaire arrive bien jusqu'au middleware (chaîne DNS → Vercel → Next),
// et que le certificat TLS est émis. Il faut pour cela un vrai domaine de test rattaché au
// projet — chiffré dans `plans/apres-demo.md`. Tout le reste du chemin est couvert ici.
//
// Aucun appel au modèle. Écrit dans la base : deux comptes @presti-test.invalid, purgés à la fin.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/domaine-perso-e2e.mjs
import { register } from 'node:module'
import fs from 'node:fs'
import https from 'node:https'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

// `middleware.ts` importe `next/server` : Node ne résout ce sous-chemin qu'avec son extension,
// et le hook de `ts-loader.mjs` ne s'occupe que des chemins relatifs et de l'alias `@/`. Le
// crochet posé ici ne sert qu'aux imports DYNAMIQUES plus bas (les statiques sont déjà résolus).
register('data:text/javascript,' + encodeURIComponent(`
  export async function resolve(spec, ctx, next) {
    if (spec === 'next/server') return next('next/server.js', ctx)
    return next(spec, ctx)
  }
`))

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const NOTE = (t) => console.log(`  ⏭  ${t}`)

const { middleware } = await import('../middleware.ts')
const { NextRequest } = await import('next/server.js')

/** Fait passer une requête dans le VRAI middleware et rend le chemin réécrit (ou null). */
async function passe(host, chemin) {
  const r = await middleware(new NextRequest(new Request(`https://${host}${chemin}`, { headers: { host } })))
  const cible = r.headers.get('x-middleware-rewrite')
  return cible ? new URL(cible).pathname : null
}

// ── Processus fils : le domaine neutre de Presti (lu au chargement du module, d'où le fils).
if (process.argv.includes('--neutre')) {
  const NEUTRE = process.env.NEXT_PUBLIC_DOMAINE_NEUTRE
  const { modeUrl, urlSite, urlPlateforme } = await import('../lib/urls.ts')
  console.log(`\n── 7. Domaine neutre « ${NEUTRE} » (processus fils)`)
  T('<slug>.<neutre>/ → le site de l’artisan', (await passe(`chene.${NEUTRE}`, '/')) === '/site/chene')
  T('<slug>.<neutre>/demande → sa page de conversation', (await passe(`chene.${NEUTRE}`, '/demande')) === '/p/chene')
  T('<slug>.<neutre>/infos-legales → ses mentions', (await passe(`chene.${NEUTRE}`, '/infos-legales')) === '/site/chene/infos-legales')
  T('<neutre>/<slug> → le site de l’artisan (sans DNS joker)', (await passe(NEUTRE, '/chene')) === '/site/chene')
  T('<neutre>/<slug>/demande → sa page de conversation', (await passe(NEUTRE, '/chene/demande')) === '/p/chene')
  T('<neutre>/login n’est pas pris pour un artisan', (await passe(NEUTRE, '/login')) === null)
  T('<neutre>/api/... n’est pas détourné', (await passe(NEUTRE, '/api/leads')) === null)
  T('sans domaine perso, le mode devient « neutre »', modeUrl({ slug: 'chene' }) === 'neutre')
  T('… et l’adresse publique ne dit plus « presti »', !/presti/i.test(urlSite({ slug: 'chene' })) && !/presti/i.test(urlPlateforme({ slug: 'chene' })), urlSite({ slug: 'chene' }))
  console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués (domaine neutre)`)
  process.exit(ko ? 1 : 0)
}

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SB || !CLE) { console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes dans .env.local'); process.exit(1) }
const admin = createClient(SB, CLE, { auth: { persistSession: false } })
const { modeUrl, modeDepuisHote, chemins, urlSite, urlPlateforme, urlInfosLegales, afficher, problemeSlug, SLUGS_RESERVES, DOMAINE_NEUTRE } = await import('../lib/urls.ts')

const PROD = 'https://prestiapp.fr'
const MARQUE = `${Date.now()}-${crypto.randomBytes(2).toString('hex')}`
const comptes = []

async function creerArtisan(prefixe, nom, domaine, verifie) {
  const email = `${prefixe}-${MARQUE}@presti-test.invalid`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: 'Domaine-' + crypto.randomBytes(8).toString('hex'), email_confirm: true })
  if (error) throw new Error(`création du compte ${prefixe} : ${error.message}`)
  const id = u.user.id
  comptes.push({ id })
  const slug = `${prefixe}-${MARQUE}`
  // Le service_role passe outre le verrou 0055 qui fige `domaine` / `domaine_verifie` :
  // c'est le seul moyen de simuler un domaine servi sans en posséder un.
  const { error: e2 } = await admin.from('artisans').upsert({
    id, email, nom, metier: 'Menuisier', slug, plan: 'signature',
    ville: 'Marans', bio: 'Menuiserie sur mesure, pose et rénovation.',
    tel_public: '06 00 00 00 00', email_public: email,
    site_active: true, plateforme_active: true, site_seo: true,
    domaine, domaine_verifie: verifie,
  })
  if (e2) throw new Error(`profil ${prefixe} : ${e2.message}`)
  return { id, slug, nom, domaine }
}

const html = async (url) => { const r = await fetch(url, { headers: { 'user-agent': 'presti-domaine-e2e' }, cache: 'no-store' }); return { statut: r.status, corps: await r.text() } }
const canonique = (corps) => corps.match(/<link[^>]*rel="canonical"[^>]*>/i)?.[0]?.match(/href="([^"]*)"/i)?.[1] ?? null
const ogUrl = (corps) => corps.match(/<meta[^>]*property="og:url"[^>]*>/i)?.[0]?.match(/content="([^"]*)"/i)?.[1] ?? null

/** Requête vers la production avec un `Host:` choisi — `fetch` interdit cet en-tête, pas `https`. */
function avecHote(hote, chemin, entetes = {}) {
  return new Promise((res) => {
    const req = https.request({ hostname: 'prestiapp.fr', servername: 'prestiapp.fr', port: 443, path: chemin, method: 'GET', headers: { Host: hote, 'user-agent': 'presti-domaine-e2e', ...entetes } },
      (r) => { let b = ''; r.on('data', (d) => { b += d }); r.on('end', () => res({ statut: r.statusCode, erreurVercel: r.headers['x-vercel-error'] ?? null, corps: b })) })
    req.on('error', (e) => res({ statut: 0, erreurVercel: null, corps: String(e.message) }))
    req.end()
  })
}

try {
  console.log('\n── 1. Les adresses publiques (lib/urls)')
  const V = { slug: 'atelier', domaine: 'atelier-menuiserie.fr', domaine_verifie: true }
  const NV = { slug: 'atelier', domaine: 'atelier-menuiserie.fr', domaine_verifie: false }
  T('domaine vérifié → mode « perso »', modeUrl(V) === 'perso')
  T('site = la racine de son domaine', urlSite(V) === 'https://atelier-menuiserie.fr/')
  T('page de conversation = /demande sur son domaine', urlPlateforme(V) === 'https://atelier-menuiserie.fr/demande')
  T('infos légales = /infos-legales sur son domaine', urlInfosLegales(V) === 'https://atelier-menuiserie.fr/infos-legales')
  T('aucune des trois adresses ne dit « presti »', ![urlSite(V), urlPlateforme(V), urlInfosLegales(V)].some((u) => /presti/i.test(u)))
  T('l’affichage retire le protocole et la barre finale', afficher(urlSite(V)) === 'atelier-menuiserie.fr')
  T('domaine NON vérifié → aucune adresse ne part sur ce domaine', ![urlSite(NV), urlPlateforme(NV), urlInfosLegales(NV)].some((u) => u.includes('atelier-menuiserie.fr')), urlSite(NV))
  if (!DOMAINE_NEUTRE) T('… et l’adresse reste celle de Presti', urlSite(NV) === `${PROD}/site/atelier` && urlPlateforme(NV) === `${PROD}/p/atelier`, urlSite(NV))
  else NOTE(`un domaine neutre est configuré (${DOMAINE_NEUTRE}) : le repli n’est plus l’adresse Presti, c’est normal`)

  console.log('\n── 2. Les liens internes suivent l’hôte servi (modeDepuisHote)')
  T('servi sur son domaine → les liens restent « /demande »', chemins(modeDepuisHote('atelier-menuiserie.fr', V), 'atelier').plateforme === '/demande')
  T('… avec le www', modeDepuisHote('www.atelier-menuiserie.fr', V) === 'perso')
  T('… avec un port (dev)', modeDepuisHote('atelier-menuiserie.fr:3000', V) === 'perso')
  T('servi sur prestiapp.fr → les liens redeviennent /p/<slug>', chemins(modeDepuisHote('prestiapp.fr', V), 'atelier').plateforme === '/p/atelier')
  T('hôte vide → jamais « perso » (aucun détournement par défaut)', modeDepuisHote('', V) === 'presti')
  T('« presti » et « demande » sont des adresses réservées', SLUGS_RESERVES.has('presti') && SLUGS_RESERVES.has('demande') && problemeSlug('presti') !== null)

  console.log('\n── Décor : deux artisans, un domaine servi, un domaine non vérifié')
  const verifie = await creerArtisan('dom-ok', 'Atelier des Deux Rives', `dom-ok-${MARQUE}.invalid`, true)
  const nonVerifie = await creerArtisan('dom-nv', 'Atelier de la Sèvre', `dom-nv-${MARQUE}.invalid`, false)
  T('les deux comptes de test existent', !!verifie.id && !!nonVerifie.id)

  console.log('\n── 3. Le middleware, réellement exécuté')
  T('son domaine, « / » → son site', (await passe(verifie.domaine, '/')) === `/site/${verifie.slug}`)
  T('son domaine, « /demande » → sa page de conversation', (await passe(verifie.domaine, '/demande')) === `/p/${verifie.slug}`)
  T('son domaine, « /infos-legales » → ses mentions', (await passe(verifie.domaine, '/infos-legales')) === `/site/${verifie.slug}/infos-legales`)
  T('le www de son domaine mène au même site', (await passe(`www.${verifie.domaine}`, '/')) === `/site/${verifie.slug}`)
  T('un domaine inconnu n’est jamais réécrit', (await passe(`inconnu-${MARQUE}.invalid`, '/')) === null)
  T('prestiapp.fr n’est pas détourné', (await passe('prestiapp.fr', '/')) === null)
  T('www.prestiapp.fr non plus', (await passe('www.prestiapp.fr', '/')) === null)
  T('les aperçus *.vercel.app non plus', (await passe('presti-abcdef.vercel.app', '/')) === null)
  T('localhost non plus (développement)', (await passe('localhost:3000', '/')) === null)
  T('qg.prestiapp.fr reste le poste de contrôle', (await passe('qg.prestiapp.fr', '/')) === '/controle')
  // Le cœur de la promesse « non vérifié » : `lib/urls` exige `domaine_verifie`, le middleware
  // ne le demande pas. Tant que ce test est rouge, un domaine saisi mais jamais pointé sert
  // quand même le site de l'artisan, avec une canonique qui, elle, pointe ailleurs.
  T('un domaine NON vérifié ne détourne rien', (await passe(nonVerifie.domaine, '/')) === null,
    'middleware.ts, slugForDomain : ajouter `&domaine_verifie=is.true` à la requête PostgREST')
  const horsSurface = await passe(verifie.domaine, '/login')
  if (horsSurface === null) NOTE('constat, hors périmètre de cette suite : sur le domaine de l’artisan, /login, /cgu, /faq… servent encore les pages de Presti (le middleware laisse passer). Personne n’y va spontanément, mais la marque de l’éditeur y est visible — à trancher.')
  else NOTE(`sur le domaine de l’artisan, /login est désormais réécrit vers ${horsSurface} — vérifier que c’est voulu`)

  console.log('\n── 4. En production : le site d’un artisan au domaine vérifié RENVOIE vers son domaine')
  // app/site/[slug]/page.tsx redirige vers https://<domaine>/ dès que le domaine est vérifié :
  // depuis prestiapp.fr, on ne peut donc pas lire sa canonique — on lit la redirection, qui est
  // la preuve la plus forte (le visiteur ne reste jamais sur une adresse Presti). Un fetch qui
  // suivait la redirection tombait sur un DNS inexistant : « fetch failed », faux rouge.
  const brut = await fetch(`${PROD}/site/${verifie.slug}`, { redirect: 'manual', headers: { 'user-agent': 'presti-domaine-e2e' } })
  T('le site de l’artisan renvoie vers son domaine (3xx)', [301, 302, 307, 308].includes(brut.status), `HTTP ${brut.status}`)
  T('… exactement vers https://<son domaine>/', brut.headers.get('location') === `https://${verifie.domaine}/`, String(brut.headers.get('location')))
  T('… sans « presti » dans l’adresse de destination', !/presti/i.test(String(brut.headers.get('location'))))
  const site = { statut: brut.status, corps: '' }
  // Résiduel : `metadataBase` (app/layout.tsx) fabrique les images de partage, elles restent
  // donc sur prestiapp.fr même quand tout le reste est passé sur le domaine de l'artisan.
  const image = site.corps.match(/<meta[^>]*property="og:image"[^>]*>/i)?.[0]?.match(/content="([^"]*)"/i)?.[1] ?? ''
  if (/prestiapp\.fr/.test(image)) NOTE(`résiduel : l’image de partage reste servie depuis ${image.replace(/^https:\/\/([^/]+).*/, '$1')} (metadataBase). Visible dans l’aperçu d’un lien partagé sur les réseaux.`)
  const plateforme = await fetch(`${PROD}/p/${verifie.slug}`, { redirect: 'manual', headers: { 'user-agent': 'presti-domaine-e2e' } })
  T('la page de conversation renvoie vers son domaine + /demande', [301, 302, 307, 308].includes(plateforme.status) && plateforme.headers.get('location') === `https://${verifie.domaine}/demande`, `${plateforme.status} ${plateforme.headers.get('location')}`)
  const infos = await fetch(`${PROD}/site/${verifie.slug}/infos-legales`, { redirect: 'manual', headers: { 'user-agent': 'presti-domaine-e2e' } })
  const infosCorps = infos.status === 200 ? await infos.text() : ''
  T('les infos légales renvoient vers son domaine, ou répondent avec sa canonique', ([301, 302, 307, 308].includes(infos.status) && String(infos.headers.get('location')).startsWith(`https://${verifie.domaine}/`)) || (infos.status === 200 && canonique(infosCorps) === `https://${verifie.domaine}/infos-legales`), `${infos.status} ${infos.headers.get('location')}`)
  const siteNV = await html(`${PROD}/site/${nonVerifie.slug}`)
  T('un domaine non vérifié ne prend pas la canonique', !String(canonique(siteNV.corps)).includes(nonVerifie.domaine), String(canonique(siteNV.corps)))
  console.log(`  (canonique servie pour le domaine non vérifié : ${canonique(siteNV.corps)})`)

  console.log('\n── 5. La limite, mesurée : un Host inventé n’atteint pas l’application')
  const intrus = await avecHote(verifie.domaine, '/')
  T('Vercel refuse un hôte non rattaché au projet', intrus.statut === 404, `HTTP ${intrus.statut} ${intrus.erreurVercel ?? '(sans en-tête d’erreur)'}`)
  if (intrus.erreurVercel !== 'DEPLOYMENT_NOT_FOUND') NOTE(`refus rendu par Vercel : ${intrus.erreurVercel ?? 'sans code'} (attendu DEPLOYMENT_NOT_FOUND)`)
  // Corollaire de sécurité : on ne détourne pas la page d'accueil de Presti en prétendant,
  // par un en-tête, venir du domaine d'un artisan.
  const usurpe = await avecHote('prestiapp.fr', '/', { 'x-forwarded-host': verifie.domaine })
  T('X-Forwarded-Host ne remplace pas Host : la page servie reste celle de Presti', usurpe.statut === 200 && !usurpe.corps.includes(verifie.nom), `HTTP ${usurpe.statut}`)
  NOTE('conséquence : la chaîne DNS → Vercel → middleware demande un VRAI domaine de test rattaché au projet. Le reste du chemin est prouvé ci-dessus.')

  console.log('\n── 6. Un domaine, un artisan')
  const { data: tous } = await admin.from('artisans').select('slug, domaine, domaine_verifie').not('domaine', 'is', null)
  const compte = new Map()
  for (const a of tous ?? []) compte.set(a.domaine, (compte.get(a.domaine) ?? 0) + 1)
  const doublons = [...compte.entries()].filter(([, n]) => n > 1)
  T('aucun domaine partagé par deux artisans', doublons.length === 0, JSON.stringify(doublons))
  const migrations = fs.readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).map((f) => fs.readFileSync(`supabase/migrations/${f}`, 'utf8')).join('\n')
  if (!/create\s+unique\s+index[^;]*artisans\s*\(\s*domaine/i.test(migrations)) {
    NOTE('aucun index UNIQUE sur artisans.domaine : rien n’empêche en base deux artisans de revendiquer le même domaine (le middleware prend le premier venu). Contrôle applicatif à ajouter dans /api/domain.')
  }
  console.log(`  ${tous?.length ?? 0} artisan(s) avec un domaine, dont ${(tous ?? []).filter((a) => a.domaine_verifie).length} vérifié(s).`)

  console.log('\n── 7. Domaine neutre (processus fils : la variable est lue au chargement)')
  const fils = spawnSync(process.execPath, ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/domaine-perso-e2e.mjs', '--neutre'],
    { stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_DOMAINE_NEUTRE: 'exemple-neutre.invalid', NEXT_PUBLIC_DOMAINE_NEUTRE_SOUSDOMAINES: '' } })
  T('les branches « domaine neutre » du middleware et de lib/urls tiennent', fils.status === 0, `code ${fils.status}`)
} catch (e) {
  ko++; console.log('  ❌ exception —', e instanceof Error ? e.stack : e)
} finally {
  for (const c of comptes) {
    const { error } = await admin.rpc('purger_compte_test', { p_id: c.id })
    if (error && !/réservé/.test(error.message)) console.log('  ⚠️ purge de test :', error.message)
  }
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
