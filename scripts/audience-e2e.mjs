// Audience de la vitrine (migrations 0090 à 0092) — ce que la mesure compte, et surtout ce qu'elle ne fait jamais.
//
// Prouve, dans l'ordre où une panne serait la plus grave :
//   1. le module (sans réseau) : liste FERMÉE de pages (jamais le site ni la plateforme d'un artisan), hôtes de
//      Presti seulement, robots écartés (outils de rendu de Google compris) sans écarter Telegram ni CUBOT, source
//      réduite à un nom de site, utm retenus seulement s'ils sont dans NOS listes, référent interne jamais « arrivée »,
//      empreinte qui change chaque jour, clé de plafond qui ne dépend pas du navigateur ;
//   2. le code dit ce que /confidentialite dit : aucun cookie, aucun identifiant stocké, muet dans l'app, sous
//      navigateur piloté et contre un refus ; aucune IP écrite ni envoyée dans une URL journalisée ; aucun compte
//      nommé à côté des visites ; flux sans attribut ; purge hors drapeau ; plafond du jour visible ;
//   3. la base : PostgREST anonyme muet, flux = page + minute + arrivée, campagnes sans /login ni /signup, la clôture
//      verse le jour, efface empreintes, créneaux de plafond finis et vues de plus de 13 mois ;
//   4. la route publique (déployée, drapeau levé) : une vue valide s'écrit UNE fois, sans IP ni user-agent ni
//      requête de recherche ; robot, page d'artisan, autre origine : rien ;
//   5. la route du Poste : 401 sans jeton, 403 au partenaire, aucun nom ni empreinte ne sort ;
//   6. le navigateur : /faq envoie une arrivée, un lien interne et un rechargement une simple visite, la plateforme
//      d'un artisan rien, `?exclure=1` et « Ne plus me compter » plus rien, un navigateur piloté rien.
//
// Écrit en production : des vues datées de 2019 et du jour marquées par leur campagne, des vues de la route marquées
// `essai-e2e` (campagne déclarée pour ça), deux créneaux de plafond marqués, 2 comptes `@presti-test.invalid` — effacés
// en finally. Les créneaux de plafond que la route pose pour la machine de test partent à la clôture suivante.
// Code 2 = préalable (migration, drapeau, déploiement).
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/audience-e2e.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const APP = (process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !ANON || !SERVICE) { console.log('\n⛔ NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY requis.\n'); process.exit(2) }

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
let ok = 0, ko = 0, prealable = false
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const SAUT = (n, w) => console.log(`  ⏭  ${n} — ${w}`)
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))
// Base 36 : jamais neuf chiffres d'affilée. Une marque en Date.now() décimal ressemblait à un long numéro, et le
// filtre des campagnes la rejetait — la vue de la section 4 s'écrivait sans elle, introuvable (contre-revue du 14/09).
const marque = `audience-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
const CAMPAGNE_ESSAI = 'essai-e2e'
const JOUR_ESSAI = '2019-03-17'
const comptes = []
let debutRoute = null
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 389.0.0.28.84 (iPhone15,2; iOS 18_5; fr_FR)'
const TELEGRAM = 'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.0.0 Mobile Safari/537.36 Telegram-Android/11.14.1 (Samsung SM-A536B; Android 13; SDK 33; AVERAGE)'
const CUBOT = 'Mozilla/5.0 (Linux; Android 12; CUBOT KINGKONG 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
const IPAD_BUREAU = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15'
const src = (f) => fs.readFileSync(f, 'utf8')
// Le code sans ses commentaires : ils racontent justement les défauts corrigés (« Connexion : Dupont », isBanned).
const code = (t) => t.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

async function compte(role) {
  const email = `${marque}-${role}@presti-test.invalid`
  const password = `Au-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !u?.user?.id) return null
  comptes.push(u.user.id)
  const { error: eA } = await admin.from('artisans').insert({ id: u.user.id, email, nom: `Audience ${role}`, metier: 'Test', slug: `${marque}-${role}`, plan: 'gratuit', is_founder: true, role_interne: role, est_demo: true })
  if (eA) { console.log('     insertion :', eA.message); return null }
  await admin.from('direction_roles').upsert({ user_id: u.user.id, role: role === 'partenaire' ? 'lecture' : 'direction' }, { onConflict: 'user_id' })
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password })
  if (!s?.session?.access_token) return null
  await verifierSessionTest(s.session.access_token)
  return { uid: u.user.id, jeton: s.session.access_token }
}

async function main() {
  console.log(`\n══ Audience de la vitrine — ${APP} ══\n`)

  // ── 1. Le module, sans réseau ───────────────────────────────────────────────────────────────────
  console.log('1. Ce qui est compté, et ce qui ne l’est jamais')
  const A = await import('../lib/audience.ts')
  const S = await import('../lib/audienceServeur.ts')
  T('les 8 pages publiques sont mesurées', ['/', '/faq', '/contact', '/login', '/signup', '/cgu', '/confidentialite', '/mentions-legales'].every(A.cheminMesurable))
  const jamais = ['/p/atelier-du-chene', '/site/atelier-du-chene', '/site-genere/x', '/demande', '/infos-legales', '/dashboard', '/controle', '/reset-password', '/parametres', '/messages', '/tarifs', '/abonnement', '/a/instagram', '/faq/', '', 'toString', '__proto__']
  const fuites = jamais.filter(A.cheminMesurable)
  T(`aucune des ${jamais.length} autres surfaces (artisan, espace, poste, jetons) n’est mesurée`, fuites.length === 0, fuites.join(', '))
  T('hôtes : prestiapp.fr et www seulement (ni qg., ni aperçus Vercel, ni localhost, ni domaine d’artisan)',
    A.hoteMesure('prestiapp.fr') && A.hoteMesure('www.prestiapp.fr') && !['qg.prestiapp.fr', 'presti-git-x.vercel.app', 'localhost', 'atelier-lestraque.fr'].some(A.hoteMesure))
  const robots = ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Mozilla/5.0 (Linux; Android 11) Chrome-Lighthouse', 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/139.0', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'TelegramBot (like TwitterBot)',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0;)', 'curl/8.9.1', 'presti-controle-e2e (Chrome; Windows)', '']
  T('robots, sondes, outils de rendu de Google et nos suites sont écartés', robots.every(A.estRobot), robots.filter((u) => !A.estRobot(u)).join(' | '))
  const humains = [CHROME, IPHONE, INSTAGRAM, TELEGRAM, CUBOT, IPAD_BUREAU]
  T('un vrai navigateur ne l’est pas (Chrome, Safari iPhone, Instagram, Telegram intégré, téléphone CUBOT, iPad)', !humains.some(A.estRobot), humains.filter(A.estRobot).join(' | '))
  T('appareils : iPhone mobile, Windows ordinateur, iPad et tablette Android tablette',
    A.appareilDe(IPHONE) === 'mobile' && A.appareilDe(CHROME) === 'ordinateur' && A.appareilDe('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1') === 'tablette' && A.appareilDe('Mozilla/5.0 (Linux; Android 14; SM-X710) Chrome/139.0 Safari/537.36') === 'tablette')
  T('appareils : l’iPad qui se dit Mac est une tablette s’il est tactile, un Mac reste un ordinateur, un PC tactile aussi',
    A.appareilDe(IPAD_BUREAU, true) === 'tablette' && A.appareilDe(IPAD_BUREAU, false) === 'ordinateur' && A.appareilDe(CHROME, true) === 'ordinateur')
  T('navigateurs : la famille, jamais la version', A.navigateurDe(CHROME) === 'Chrome' && A.navigateurDe(IPHONE) === 'Safari' && A.navigateurDe(INSTAGRAM) === 'Instagram')
  const sources = [
    ['https://www.google.fr/search?q=devis+plombier+marans', 'google'], ['https://l.instagram.com/?u=https%3A%2F%2Fprestiapp.fr', 'instagram'],
    ['https://lm.facebook.com/l.php?u=x', 'facebook'], ['https://mail.google.com/', 'gmail'], ['android-app://com.linkedin.android/', 'linkedin'],
    ['https://prestiapp.fr/faq', null], ['https://qg.prestiapp.fr/dashboard', null], ['https://blog.artisan.fr/article?client=dupont', 'blog.artisan.fr'],
    ['javascript:alert(1)', null], ['', null],
  ]
  const fausses = sources.filter(([r, attendu]) => A.hoteSource(r) !== attendu)
  T('source : un nom de site, jamais le chemin ni la requête (ni « devis plombier marans », ni « dupont »)', fausses.length === 0, fausses.map(([r]) => `${r} → ${A.hoteSource(r)}`).join(' | '))
  const v1 = A.lireVue({ c: '/faq?x=1', e: true, r: 'https://www.google.com/search?q=secret', s: null, k: null })
  T('vue d’entrée : chemin sans requête, source google', v1?.chemin === '/faq' && v1.entree && v1.source === 'google' && v1.campagne === null, JSON.stringify(v1))
  const v2 = A.lireVue({ c: '/', e: true, r: 'https://google.com', s: 'Instagram', k: 'Lot 20x20' })
  T('utm_source connu et campagne déclarée priment, nettoyés', v2?.source === 'instagram' && v2.campagne === 'lot-20x20', JSON.stringify(v2))
  const v3 = A.lireVue({ c: '/', e: false, r: 'https://google.com', s: 'x', k: 'y' })
  T('navigation interne : ni source ni campagne', v3?.source === null && v3.campagne === null && v3.entree === false, JSON.stringify(v3))
  const v4 = A.lireVue({ c: '/', e: true, r: 'https://www.google.fr/', s: 'jean.dupont@orange.fr', k: 'relance-dupont-plomberie-rennes-0612345678' })
  T('utm libres qui portent une personne : refusés, la source revient au référent', v4?.source === 'google' && v4.campagne === null, JSON.stringify(v4))
  const campagnes = [['lot-20x20-2026-09-14', 'lot-20x20-2026-09-14'], ['Salon 2026', 'salon-2026'], ['Démarchage Instagram', 'demarchage-instagram'], [CAMPAGNE_ESSAI, CAMPAGNE_ESSAI],
    ['relance-jean-dupont', null], ['salon-dupont', null], ['lot-20x20-99', null], ['+33 (0)6 12 34 56 78', null], ['079 123 45 67', null], ['client@exemple.fr', null], ['offre-rentrée', null]]
  const cFausses = campagnes.filter(([k, attendu]) => A.campagneUtm(k) !== attendu)
  T('campagne : seulement nos campagnes (datées ou non, accents retirés) ; un nom, un numéro, un email non', cFausses.length === 0, cFausses.map(([k]) => `${k} → ${A.campagneUtm(k)}`).join(' | '))
  const v5 = A.lireVue({ c: '/signup', e: true, r: 'https://prestiapp.fr/', s: 'google', k: 'salon' })
  T('un référent Presti n’est jamais une arrivée, quoi que dise le corps', v5?.entree === false && v5.source === null && v5.campagne === null, JSON.stringify(v5))
  T('l’indice tactile est relu', A.lireVue({ c: '/', e: false, t: 1 })?.tactile === true && A.lireVue({ c: '/', e: false, t: 'oui' })?.tactile === false)
  T('corps hostiles → rien', [null, 'texte', 42, {}, { c: 42 }, { c: '/p/atelier-du-chene', e: true }, { c: '/site/x' }].every((c) => A.lireVue(c) === null))
  T('pays : deux lettres majuscules, sinon rien', A.paysDe('FR') === 'FR' && A.paysDe('fr') === null && A.paysDe('XX') === null && A.paysDe(null) === null && A.paysDe('FRA') === null)
  T('origine : l’en-tête Origin prime sur le référent', A.origineMaison('https://prestiapp.fr', null) && A.origineMaison(null, 'https://www.prestiapp.fr/faq') && !A.origineMaison('https://evil.example', 'https://prestiapp.fr/') && !A.origineMaison(null, null))
  const IP = '203.0.113.9', matin = new Date('2026-09-14T06:00:00Z'), soir = new Date('2026-09-14T21:00:00Z'), lendemain = new Date('2026-09-14T22:30:00Z')
  const e1 = S.empreinteDuJour(IP, CHROME, matin)
  T('empreinte : 16 caractères hexadécimaux, sans l’adresse', /^[0-9a-f]{16}$/.test(e1) && !e1.includes('203'))
  T('empreinte : la même personne le même jour → la même', S.empreinteDuJour(IP, CHROME, soir) === e1)
  T('empreinte : minuit à Paris la change (22 h 30 UTC = le 15 à Paris)', S.jourParis(lendemain) === '2026-09-15' && S.empreinteDuJour(IP, CHROME, lendemain) !== e1)
  T('empreinte : un autre navigateur derrière la même adresse → une autre', S.empreinteDuJour(IP, IPHONE, matin) !== e1)
  const p1 = S.clePlafond(IP, matin)
  T('plafond : une clé par adresse et par jour, sans l’adresse ni l’empreinte', /^audience:ip:[0-9a-f]{24}$/.test(p1) && !p1.includes('203') && !p1.includes(e1) && S.clePlafond(IP, soir) === p1 && S.clePlafond(IP, lendemain) !== p1)
  T('plafond : deux adresses IPv6 du même /64 partagent la clé, un autre /64 non',
    S.clePlafond('2a01:e0a:1f2:3b40:1:2:3:4', matin) === S.clePlafond('2a01:e0a:1f2:3b40::99', matin) && S.clePlafond('2a01:e0a:1f2:3b41::1', matin) !== S.clePlafond('2a01:e0a:1f2:3b40::1', matin))
  T('plafond du jour : la clé porte le jour de Paris', S.cleJourAudience(lendemain) === 'audience:jour:2026-09-15' && S.cleJourAudience(matin) === 'audience:jour:2026-09-14' && S.PLAFOND_JOUR_AUDIENCE > 0)
  T('réseau : IPv4 entière, IPv4 mappée, IPv6 compressée',
    S.reseauIp('203.0.113.9') === '203.0.113.9' && S.reseauIp('::ffff:203.0.113.9') === '203.0.113.9' && S.reseauIp('2001:db8::1') === '2001:db8:0:0::/64' && S.reseauIp('2A01:0E0A:01F2:3B40:0:0:0:1') === '2a01:e0a:1f2:3b40::/64')
  T('minuit à Paris : été, hiver, et le jour du passage à l’heure d’été',
    S.minuitParis(new Date('2026-09-14T21:30:00Z')) === '2026-09-13T22:00:00.000Z' && S.minuitParis(new Date('2026-12-01T10:00:00Z')) === '2026-11-30T23:00:00.000Z' && S.minuitParis(new Date('2026-03-29T12:00:00Z')) === '2026-03-28T23:00:00.000Z',
    `${S.minuitParis(new Date('2026-09-14T21:30:00Z'))} ${S.minuitParis(new Date('2026-12-01T10:00:00Z'))} ${S.minuitParis(new Date('2026-03-29T12:00:00Z'))}`)

  // ── 2. Le code dit ce que la politique dit ──────────────────────────────────────────────────────
  console.log('\n2. Le code tient les promesses de /confidentialite')
  const client = src('app/Audience.tsx')
  T('Audience.tsx : aucun cookie', !/document\.cookie/.test(client))
  T('Audience.tsx : aucun identifiant écrit dans le navigateur', !/(localStorage|sessionStorage)\.setItem/.test(client))
  T('Audience.tsx : muet dans l’app, sous navigateur piloté, et contre GPC, DNT, le bouton et ?exclure=1',
    /estNatif\(\)/.test(client) && /webdriver/.test(client) && /globalPrivacyControl/.test(client) && /doNotTrack/.test(client) && /CLE_NE_PAS_COMPTER/.test(client) && /'exclure'/.test(client))
  T('Audience.tsx : une entrée exige le premier passage du document, un référent extérieur, ni rechargement ni retour arrière',
    /estHotePresti\(new URL\(document\.referrer\)/.test(client) && /'reload'/.test(client) && /'back_forward'/.test(client)
    && client.indexOf('const premiere = !dejaEntre') > 0 && client.indexOf('const premiere = !dejaEntre') < client.indexOf('if (!hoteMesure(window.location.hostname)'))
  T('le layout racine monte la mesure', /<Audience \/>/.test(src('app/layout.tsx')))
  const route = src('app/api/audience/route.ts')
  // Les CLÉS de l'objet écrit : l'adresse et le user-agent entrent dans empreinteDuJour(ip, ua), qui les hache.
  const ecriture = (route.split('.insert(')[1] ?? '').split('})')[0]
  T('la route n’écrit ni IP ni user-agent', ecriture.length > 0 && /empreinte: empreinteDuJour\(ip, ua\)/.test(ecriture) && !/[{,]\s*(ip|ua|user_?agent|adresse(_ip)?)\s*[:,}]/i.test(ecriture), ecriture.slice(0, 200))
  T('la route plafonne par adresse et par jour de Paris — jamais par empreinte',
    /consommerLimite\(clePlafond\(ip\)/.test(route) && /cleJourAudience\(\)/.test(route) && /consommerLimite\(cleJour, PLAFOND_JOUR_AUDIENCE/.test(route) && !/audience:\$\{empreinte/.test(route))
  T('la route n’envoie pas l’IP dans une URL journalisée (plus d’isBanned)', !/isBanned/.test(code(route)))
  const m90 = src('supabase/migrations/0090_audience.sql'), m91 = src('supabase/migrations/0091_audience_correctifs.sql'), m92 = src('supabase/migrations/0092_audience_flux_nu.sql')
  T('0090 : RLS sur les deux tables, aucune politique, rien pour anon et authenticated',
    (m90.match(/enable row level security/g) || []).length === 2 && !/create policy/i.test(m90 + m91 + m92) && /revoke all on table[^;]*from anon, authenticated/i.test(m90))
  T('0090 : aucune colonne d’IP ni de user-agent', !/^\s*(ip|adresse_ip|user_agent)\s+(text|inet)/im.test(m90))
  const flux92 = m92.slice(m92.indexOf("'flux'"), m92.indexOf("'premiere_vue'"))
  T('0092 : le flux ne porte que la page, la minute et l’arrivée', flux92.length > 0 && /date_trunc\('minute', vue_le\)/.test(flux92) && !/'(source|appareil|pays|campagne|navigateur|empreinte)'/.test(flux92))
  T('0092 : les campagnes ne comptent pas les arrivées sur /login et /signup', /campagne is not null and chemin not in \('\/login', '\/signup'\)/.test(m92))
  T('0091 : la clôture efface les créneaux de plafond finis et les vues de plus de p_mois mois ; l’ancienne fonction disparaît',
    /delete from public\.limites[\s\S]{0,80}cle like 'audience:%'/.test(m91) && /delete from public\.audience_vues[\s\S]{0,80}make_interval\(months/.test(m91) && /drop function if exists public\.audience_cloturer\(\)/.test(m91))
  T('0091 et 0092 : fonctions retirées à anon et authenticated', /revoke all on function[^;]*audience_cloturer\(integer\)[^;]*from public, anon, authenticated/i.test(m91) && /revoke all on function public\.audience_direct\(\) from public, anon, authenticated/i.test(m92))
  T('jumeaux 0090, 0091 et 0092 présents (identique et nu)', ['0090', '0091', '0092'].every((n) => fs.existsSync(`supabase/migrations/_A_COLLER_sql_editor_${n}.sql`) && fs.existsSync(`supabase/migrations/_A_COLLER_sql_editor_${n}_NU.sql`)))
  const purges = src('lib/purgesRgpd.ts')
  T('la purge quotidienne appelle la clôture avec MOIS_AUDIENCE, hors drapeau', /rpc\('audience_cloturer', \{ p_mois: MOIS_AUDIENCE \}\)/.test(purges) && !/if \(actif\('audience'\)\)/.test(purges))
  const conf = src('app/confidentialite/page.tsx')
  T('/confidentialite décrit la mesure, ses deux empreintes, la durée du détail, les totaux qui restent et le refus (derrière le même drapeau)',
    /actif\('audience'\)/.test(conf) && /MOIS_AUDIENCE/.test(conf) && /<NePasCompter \/>/.test(conf) && /IP n’est pas enregistrée/.test(conf) && /deux empreintes/.test(conf) && /seuls restent des totaux par jour/.test(conf) && /campagne de nos propres liens/.test(conf))
  T('/confidentialite ne dit plus que rien n’est mesuré sur les pages de conversation (plat_events les compte)', !/ni sur les sites et les pages de conversation des artisans/.test(conf) && /pages de conversation des artisans, seules les ouvertures de page/.test(conf))
  const vis = src('app/controle/Visiteurs.tsx'), rc = src('app/api/controle/audience/route.ts')
  T('l’écran et sa route ne montrent aucun compte nommé à côté des visites', !/Connexion : |Inscription : |comptes\.map|nomDe/.test(code(vis) + code(rc)) && !/sessions_verifiees/.test(code(rc)))
  T('l’écran n’affiche aucun attribut ligne par ligne', !/v\.(source|appareil|pays|campagne|navigateur)/.test(code(vis)))
  T('l’écran propose l’exclusion là où elle agit, et dit quand le plafond du jour est atteint', /hoteMesure\(window\.location\.hostname\)/.test(vis) && /confidentialite\?exclure=1/.test(vis) && /saturee/.test(vis) && /limiteAtteinte\(cleJourAudience\(\), PLAFOND_JOUR_AUDIENCE, 86400\)/.test(rc))
  T('le Poste ne pose la clé que sur un hôte mesuré', /hoteMesure\(window\.location\.hostname\) && localStorage\.getItem\(CLE_NE_PAS_COMPTER\) === null/.test(src('app/controle/page.tsx')))
  T('fermeture-e2e : le drapeau audience est dans la carte, sondé sur la route publique', /'audience': \['route', '\/api\/audience', 'POST'/.test(src('scripts/fermeture-e2e.mjs')))
  const { peutFaire } = await import('../lib/controle/droits.ts')
  T('droits : le partenaire ne voit pas la fréquentation', !peutFaire('partenaire', 'audience', 'voir').permis && peutFaire('fondateur', 'audience', 'voir').permis)
  const { FLAGS } = await import('../lib/flags.ts')
  console.log(`  (drapeau audience : ${FLAGS.audience ? 'levé' : 'baissé'})`)

  // ── 3. La base ──────────────────────────────────────────────────────────────────────────────────
  console.log('\n3. La base')
  // PAS de `head: true` : une requête HEAD sur une table absente revient sans corps, donc sans erreur lisible.
  const sonde = await admin.from('audience_vues').select('id').limit(1)
  if (sonde.error) {
    console.log(`  ⛔ À faire : appliquer les migrations 0090 à 0092 (${sonde.error.message.slice(0, 80)})`)
    prealable = true
    return
  }
  T('table audience_vues présente', true)
  const anon = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const lecture = await anon.from('audience_vues').select('id').limit(1)
  T('PostgREST anonyme : la table ne rend rien', !!lecture.error || (lecture.data ?? []).length === 0, JSON.stringify(lecture.data))
  const rpcs = await Promise.all([anon.rpc('audience_direct'), anon.rpc('audience_cloturer', { p_mois: 13 }), anon.rpc('audience_historique', { p_jours: 30 })])
  T('PostgREST anonyme : les trois fonctions refusées', rpcs.every((r) => !!r.error), rpcs.map((r) => r.error?.message ?? 'ACCEPTÉE').join(' | '))
  const heure = Math.floor(Date.now() / 3600_000) * 3600_000
  const cleFinie = `audience:ip:e2e-${marque}-fini`, cleCourante = `audience:ip:e2e-${marque}-courant`
  const { error: eLim } = await admin.from('limites').insert([
    { cle: cleFinie, fenetre: new Date(heure - 3 * 3600_000).toISOString(), fenetre_s: 3600, compteur: 1 },
    { cle: cleCourante, fenetre: new Date(heure).toISOString(), fenetre_s: 3600, compteur: 1 },
  ])
  T('deux créneaux de plafond marqués insérés (un fini, un en cours)', !eLim, eLim?.message)
  const maintenant = new Date().toISOString()
  // `vue_le` sur CHAQUE ligne : dans un insert de plusieurs lignes, PostgREST met NULL (et non la valeur par défaut)
  // dans une colonne absente d'une ligne mais présente dans les autres.
  const { error: eIns } = await admin.from('audience_vues').insert([
    { vue_le: `${JOUR_ESSAI}T10:00:00Z`, chemin: '/', entree: true, source: null, appareil: 'mobile', pays: null, empreinte: 'e2e0000000000001', campagne: marque },
    { vue_le: `${JOUR_ESSAI}T10:05:00Z`, chemin: '/signup', entree: false, source: null, appareil: 'mobile', pays: null, empreinte: 'e2e0000000000001', campagne: marque },
    { vue_le: `${JOUR_ESSAI}T11:00:00Z`, chemin: '/', entree: true, source: null, appareil: 'ordinateur', pays: null, empreinte: 'e2e0000000000002', campagne: marque },
    { vue_le: maintenant, chemin: '/faq', entree: true, source: 'linkedin', appareil: 'mobile', pays: 'BE', empreinte: 'e2e0000000000003', campagne: marque },
    { vue_le: maintenant, chemin: '/signup', entree: true, source: 'instagram', appareil: 'mobile', pays: 'FR', empreinte: 'e2e0000000000004', campagne: `${marque}-inscription` },
  ])
  T('3 vues d’un jour de 2019 et 2 vues du jour insérées', !eIns, eIns?.message)
  const direct = await admin.rpc('audience_direct')
  const flux = direct.data?.flux ?? []
  T('flux : la minute, jamais la seconde', flux.length > 0 && flux.every((v) => new Date(v.a).getUTCSeconds() === 0), JSON.stringify(flux[0]))
  const clesFlux = [...new Set(flux.flatMap((v) => Object.keys(v)))].sort()
  T('flux : seulement page, minute et arrivée', clesFlux.join(',') === 'a,chemin,entree', clesFlux.join(','))
  const camp = (direct.data?.campagnes_7j ?? []).map((c) => c.cle)
  T('campagnes sur 7 jours : la campagne de /faq y est, celle de /signup non', camp.includes(marque) && !camp.includes(`${marque}-inscription`), camp.join(', '))
  const clo = await admin.rpc('audience_cloturer', { p_mois: 13 })
  T('la clôture rend son détail', !clo.error && typeof clo.data?.empreintes === 'number' && typeof clo.data?.plafonds === 'number' && typeof clo.data?.vues === 'number', clo.error?.message ?? JSON.stringify(clo.data))
  const { data: jour } = await admin.from('audience_jours').select('visiteurs, vues').eq('jour', JOUR_ESSAI).maybeSingle()
  T('le jour de 2019 garde son compte : 2 visiteurs, 3 vues', jour?.visiteurs === 2 && jour?.vues === 3, JSON.stringify(jour))
  const { data: restes } = await admin.from('audience_vues').select('vue_le, empreinte').like('campagne', `${marque}%`)
  T('… ses vues de plus de 13 mois sont supprimées, celles du jour restent avec leur empreinte', (restes ?? []).length === 2 && restes.every((r) => /^e2e000000000000[34]$/.test(r.empreinte ?? '')), JSON.stringify(restes))
  const { data: creneaux } = await admin.from('limites').select('cle').like('cle', `audience:ip:e2e-${marque}%`)
  const cles = (creneaux ?? []).map((c) => c.cle)
  T('le créneau de plafond fini est effacé, celui en cours reste (le plafond tient toujours)', !cles.includes(cleFinie) && cles.includes(cleCourante), cles.join(', '))

  // ── 4. La route publique ────────────────────────────────────────────────────────────────────────
  console.log('\n4. La route publique (/api/audience)')
  const envoyer = (corps, { ua = CHROME, origin = 'https://prestiapp.fr' } = {}) => fetch(`${APP}/api/audience`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': ua, ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(corps),
  })
  const vide = await envoyer({})
  const deployee = vide.status !== 404
  if (!deployee) { console.log('  ⛔ /api/audience répond 404 : drapeau audience baissé, ou pas encore déployé.'); prealable = true }
  else {
    T('un corps vide → 204, jamais 500', vide.status === 204, String(vide.status))
    T('la campagne de la suite est une campagne déclarée', A.campagneUtm(CAMPAGNE_ESSAI) === CAMPAGNE_ESSAI)
    debutRoute = new Date(Date.now() - 5000).toISOString()
    // Une page par cas : c'est la page qui dit, dans la base, lequel a été écrit.
    const r1 = await envoyer({ c: '/faq', e: true, t: 0, r: 'https://www.google.fr/search?q=devis+plombier+dupont', s: null, k: CAMPAGNE_ESSAI })
    T('une vue valide → 204', r1.status === 204, String(r1.status))
    await envoyer({ c: '/cgu', e: true, r: '', k: CAMPAGNE_ESSAI }, { ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' })
    await envoyer({ c: '/p/atelier-du-chene', e: true, r: '', k: CAMPAGNE_ESSAI })
    await envoyer({ c: '/mentions-legales', e: true, r: '', k: CAMPAGNE_ESSAI }, { origin: 'https://evil.example' })
    await envoyer({ c: '/confidentialite', e: true, r: '', k: CAMPAGNE_ESSAI }, { origin: null })
    await attendre(2500)
    const { data: lignes } = await admin.from('audience_vues').select('*').eq('campagne', CAMPAGNE_ESSAI).gte('vue_le', debutRoute)
    const pages = (lignes ?? []).map((l) => l.chemin)
    T('seule la vue valide est écrite, une fois — robot (/cgu), page d’artisan, autre origine (/mentions-legales), sans origine (/confidentialite) : rien', pages.length === 1 && pages[0] === '/faq', pages.join(', '))
    const l = (lignes ?? []).find((x) => x.chemin === '/faq') ?? {}
    T('… /faq, entrée, source google, ordinateur, Chrome', l.chemin === '/faq' && l.entree === true && l.source === 'google' && l.appareil === 'ordinateur' && l.navigateur === 'Chrome', JSON.stringify(l))
    const monIp = await fetch('https://api.ipify.org?format=json').then((r) => r.json()).then((j) => j.ip).catch(() => null)
    const texte = JSON.stringify(l)
    T('… une empreinte, et ni IP, ni user-agent, ni requête de recherche dans la ligne', /^[0-9a-f]{16}$/.test(l.empreinte ?? '') && (!monIp || !texte.includes(monIp)) && !/Mozilla|Chrome\/139|plombier|dupont/.test(texte), texte)
    const { data: plafonds } = await admin.from('limites').select('cle').like('cle', 'audience:%')
    T('… et aucune empreinte de visite dans les clés de plafond', !(plafonds ?? []).some((p) => l.empreinte && p.cle.includes(l.empreinte)), (plafonds ?? []).map((p) => p.cle).join(', '))
  }

  // ── 5. La route du Poste ────────────────────────────────────────────────────────────────────────
  console.log('\n5. La route du Poste (/api/controle/audience)')
  const anonyme = await fetch(`${APP}/api/controle/audience`, { headers: { 'User-Agent': 'presti-audience-e2e' } })
  // La garde passe avant le drapeau : une route DÉPLOYÉE répond 401 même baissée. Un 404 = pas encore en ligne.
  if (anonyme.status === 404) { console.log('  ⛔ /api/controle/audience répond 404 : la route n’est pas encore déployée.'); prealable = true; return }
  T('sans jeton → 401', anonyme.status === 401, String(anonyme.status))
  const P = await compte('partenaire'), F = await compte('fondateur')
  if (!P || !F) { T('création des comptes de test', false); return }
  const lire = async (chemin, jeton) => { const r = await fetch(`${APP}${chemin}`, { headers: { Authorization: `Bearer ${jeton}`, 'User-Agent': 'presti-audience-e2e (Chrome; Windows)' } }); const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* statut */ } return { statut: r.status, j, t } }
  const rp = await lire('/api/controle/audience', P.jeton)
  T('le partenaire → 403 hors périmètre', rp.statut === 403 && rp.j?.code === 'hors_perimetre', `${rp.statut} ${rp.t.slice(0, 100)}`)
  const rf = await lire('/api/controle/audience?historique=1', F.jeton)
  if (rf.statut === 404) { console.log('  ⛔ le fondateur reçoit 404 : drapeau audience baissé ou pas déployé.'); prealable = true }
  else {
    T('le fondateur → 200, lectures sourcées, plafond du jour renseigné', rf.statut === 200 && rf.j?.direct?.source === 'supabase' && typeof rf.j?.direct?.valeur?.en_ligne === 'number' && typeof rf.j?.inscriptions?.valeur === 'number' && typeof rf.j?.saturee === 'boolean' && rf.j?.plafondJour > 0, `${rf.statut} ${rf.t.slice(0, 160)}`)
    T('aucune empreinte, aucun nom de compte, aucun attribut de vue ligne par ligne ne sort de la route',
      !/"empreinte"|"navigateur"|Connexion : |Inscription : /.test(rf.t) && !rf.t.includes('e2e000000000000') && (rf.j?.direct?.valeur?.flux ?? []).every((v) => Object.keys(v).sort().join(',') === 'a,chemin,entree'))
    T('historique : 30 jours', rf.j?.historique?.valeur?.jours?.length === 30, String(rf.j?.historique?.valeur?.jours?.length))
    T('les comptes de test n’apparaissent nulle part', !rf.t.includes(`${marque}-partenaire`) && !rf.t.includes(`${marque}-fondateur`) && !rf.t.includes('@presti-test.invalid'))
  }

  // ── 6. Le navigateur ────────────────────────────────────────────────────────────────────────────
  console.log('\n6. Le navigateur n’envoie que ce qu’il doit')
  if (!deployee || !A.hoteMesure(new URL(APP).hostname)) { SAUT('navigateur', deployee ? `${APP} n’est pas un hôte mesuré` : 'route non déployée'); return }
  const { chromium } = await import('playwright')
  const nav = await chromium.launch()
  try {
    const contexte = async (pilote) => {
      const ctx = await nav.newContext({ userAgent: CHROME })
      if (!pilote) await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }))
      const envois = []
      // Interceptée : on prouve ce que le NAVIGATEUR envoie, sans écrire de fausses visites en production.
      await ctx.route('**/api/audience', (r) => { envois.push(r.request().postData() ?? ''); return r.fulfill({ status: 204 }) })
      return { ctx, envois, page: await ctx.newPage() }
    }
    const lu = (e) => { try { return JSON.parse(e) } catch { return null } }
    const humain = await contexte(false)
    await humain.page.goto(`${APP}/faq?utm_campaign=${marque}`, { waitUntil: 'load' })
    await humain.page.waitForTimeout(6000)
    const premier = lu(humain.envois[0])
    T('/faq envoie UNE vue, arrivée, avec sa campagne', humain.envois.length === 1 && premier?.c === '/faq' && premier.e === true && premier.k === marque, humain.envois.join(' | '))
    await humain.page.goto(`${APP}/contact`, { waitUntil: 'load', referer: `${APP}/faq` })
    await humain.page.waitForTimeout(5000)
    const second = lu(humain.envois[1])
    T('une page ouverte depuis la vitrine est une visite, pas une arrivée', humain.envois.length === 2 && second?.c === '/contact' && second.e === false && !('r' in second), humain.envois.slice(1).join(' | '))
    await humain.page.reload({ waitUntil: 'load' })
    await humain.page.waitForTimeout(5000)
    const troisieme = lu(humain.envois[2])
    T('un rechargement est une visite, pas une arrivée', humain.envois.length === 3 && troisieme?.e === false, humain.envois.slice(2).join(' | '))
    const cookies = (await humain.ctx.cookies()).filter((c) => /audience|visit|_ga|presti/i.test(c.name))
    T('aucun cookie de mesure posé', cookies.length === 0, cookies.map((c) => c.name).join(', '))
    await humain.page.goto(`${APP}/p/atelier-du-chene`, { waitUntil: 'load' })
    await humain.page.waitForTimeout(5000)
    T('la plateforme d’un artisan n’envoie rien', humain.envois.length === 3, String(humain.envois.length))
    await humain.page.goto(`${APP}/confidentialite?exclure=1`, { waitUntil: 'load' })
    await humain.page.waitForTimeout(5000)
    const cle = await humain.page.evaluate((c) => localStorage.getItem(c), A.CLE_NE_PAS_COMPTER)
    T('?exclure=1 pose le refus sur la vitrine, sans rien envoyer', cle === 'non' && humain.envois.length === 3, `${cle} / ${humain.envois.length}`)
    await humain.page.goto(`${APP}/`, { waitUntil: 'load' })
    await humain.page.waitForTimeout(5000)
    T('après le refus, plus rien ne part', humain.envois.length === 3, String(humain.envois.length))
    await humain.ctx.close()
    const pilote = await contexte(true)
    await pilote.page.goto(`${APP}/`, { waitUntil: 'load' })
    await pilote.page.waitForTimeout(5000)
    T('un navigateur piloté (nos suites) n’envoie rien', pilote.envois.length === 0, String(pilote.envois.length))
    await pilote.ctx.close()
  } finally { await nav.close() }
}

async function menage() {
  await admin.from('audience_vues').delete().like('campagne', `${marque}%`).then(() => {}, () => {})
  if (debutRoute) await admin.from('audience_vues').delete().eq('campagne', CAMPAGNE_ESSAI).gte('vue_le', debutRoute).then(() => {}, () => {})
  await admin.from('audience_jours').delete().eq('jour', JOUR_ESSAI).then(() => {}, () => {})
  await admin.from('limites').delete().like('cle', `audience:ip:e2e-${marque}%`).then(() => {}, () => {})
  for (const id of comptes) {
    await admin.from('direction_roles').delete().eq('user_id', id).then(() => {}, () => {})
    await admin.from('artisans').update({ is_founder: false, role_interne: null, plan: 'gratuit' }).eq('id', id).then(() => {}, () => {})
    await admin.from('limites').delete().in('cle', [`direction:${id}`, `reconf:${id}`]).then(() => {}, () => {})
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
  .finally(async () => {
    await menage()
    console.log(`\n${ko === 0 ? (prealable ? '⛔' : '✅') : '❌'} ${ok} réussis, ${ko} échoués${prealable ? ' — préalable en attente' : ''}\n`)
    process.exit(ko > 0 ? 1 : prealable ? 2 : 0)
  })
