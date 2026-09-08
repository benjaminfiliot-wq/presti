// Le Registre des apports, AVEC PREUVE (prompt v10 §2.2 ; demande de Benj du 07/09) — suite de production.
//
// Ce qu'elle prouve, et c'est tout le sujet : une preuve d'apport ne se fabrique pas.
//  • un passage par le lien pose une empreinte SIGNÉE (httpOnly) → l'inscription rattache en « prouvé » ;
//  • une empreinte modifiée d'un seul caractère ne rattache RIEN ;
//  • une empreinte de plus de 90 jours ne rattache rien ;
//  • un code inconnu ne pose aucune empreinte, et ne dit pas qu'il est inconnu ;
//  • un artisan déjà au registre n'est pas rattaché une seconde fois ;
//  • un apport déclaré à la main SANS pièce est refusé ; avec pièce, il compte ;
//  • un apport déclaré ne peut JAMAIS devenir « prouvé » (la base elle-même le refuse) ;
//  • contester le ramène à 10 %, retirer le sort du compte — avec motif, re-confirmation et journal ;
//  • le rôle « lecture » voit son registre et n'écrit rien.
//
// 0 appel IA. Comptes `apport-<st>@presti-test.invalid`, purgés en `finally`. Code 2 si le drapeau est baissé.
import fs from 'node:fs'
import crypto from 'node:crypto'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.env.TEST_BASE || 'https://prestiapp.fr'
if (!SB || !SVC || !ANON) { console.log('❌ variables Supabase absentes'); process.exit(1) }
const st = crypto.randomBytes(3).toString('hex')
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })
const api = (chemin, o = {}, jeton, reconf) => fetch(`${APP}${chemin}`, { ...o, headers: { 'Content-Type': 'application/json', 'User-Agent': 'presti-apports-e2e (Chrome; Windows)', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(reconf ? { 'x-presti-reconfirmation': reconf } : {}), ...(o.headers || {}) } })
const json = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) })
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const fin = (code) => { process.exitCode = code; setTimeout(() => {}, 50) }
const comptes = []
const CODE_APPORT = 'ap7k2m9x'

async function creer(nom, { fondateur = false, role = null } = {}) {
  const email = `apport-${nom}-${st}@presti-test.invalid`, password = `Ap-${crypto.randomBytes(9).toString('base64url')}-1`
  const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  if (!u?.id) throw new Error(`création ${nom} : ${JSON.stringify(u).slice(0, 120)}`)
  const r = await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: `Apport ${nom}`, metier: 'Test', slug: `apport-${nom}-${st}`, plan: 'gratuit', aide_vues: ['visite:console'], is_founder: fondateur }) })
  if (!r.ok) throw new Error(`artisans ${nom} : ${r.status}`)
  if (role) await rest('direction_roles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: u.id, role }) })
  comptes.push(u.id)
  return { uid: u.id, email, password }
}
async function session(c) {
  const s = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: c.email, password: c.password }) })).json()
  if (!s?.access_token) throw new Error(`session ${c.email}`)
  await verifierSessionTest(s.access_token)
  return s.access_token
}
/** Le cookie tel que le serveur le pose : on le récupère en suivant le lien d'apport, comme un visiteur. */
async function empreinteDuLien(code = CODE_APPORT) {
  const r = await fetch(`${APP}/a/${code}`, { redirect: 'manual', headers: { 'User-Agent': 'presti-apports-e2e' } })
  const c = r.headers.get('set-cookie') || ''
  const m = c.match(/presti_apport=([^;]+)/)
  return { status: r.status, lieu: r.headers.get('location'), valeur: m ? m[1] : null }
}
/** Inscription : la route de rattachement est appelée avec le jeton de l'artisan ET son cookie d'apport. */
const inscrire = (jeton, cookie) => api('/api/account/inscription', { method: 'POST', headers: cookie ? { Cookie: `presti_apport=${cookie}` } : {} }, jeton)
const ligneDe = async (uid) => (await (await rest(`registre_apports?select=*&artisan_id=eq.${uid}`)).json())[0] ?? null
const purgerPlafonds = async () => { const { spawnSync } = await import('node:child_process'); spawnSync('node', ['scripts/purger-abus.mjs'], { encoding: 'utf8', shell: true }) }
const purgerPlafondsDe = async (...uids) => { for (const u of uids) await rest(`limites?cle=in.(reconf:${u},direction:${u},inscription:${u})`, { method: 'DELETE' }).catch(() => {}) }

async function nettoyer() {
  for (const id of comptes) {
    await rest(`registre_apports?artisan_id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
    await rest(`journal_direction?acteur_id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
  }
  await purgerPlafondsDe(...comptes)
  for (const id of comptes) await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: id }) }).catch(() => {})
}

console.log(`\ncontrole-apports-e2e — ${APP}\n`)
try {
  console.log('0. Préalables')
  const sonde = await rest('registre_apports?select=id&limit=1')
  const lien = await empreinteDuLien()
  if (sonde.status === 404 || (!lien.valeur && lien.status === 302)) {
    const raison = sonde.status === 404 ? 'la table registre_apports n’existe pas — 0067 n’est pas collée' : 'le lien d’apport ne pose aucune empreinte — FLAGS.apports est baissé'
    console.log(`  ⛔ À faire (Benj) : ${raison}.`)
    await nettoyer(); fin(2)
  } else {
  T('la table registre_apports existe (0067 collée)', sonde.ok)
  T('le lien /a/<code> redirige vers l’accueil et pose une empreinte', lien.status === 302 && !!lien.valeur && /\/$/.test(lien.lieu ?? ''), `HTTP ${lien.status} → ${lien.lieu}`)
  T('l’empreinte est httpOnly, Secure, SameSite=Lax, 90 jours', await (async () => {
    const r = await fetch(`${APP}/a/${CODE_APPORT}`, { redirect: 'manual' })
    const c = r.headers.get('set-cookie') || ''
    return /HttpOnly/i.test(c) && /Secure/i.test(c) && /SameSite=Lax/i.test(c) && /Max-Age=7776000/.test(c)
  })())

  console.log('\n1. Un code inconnu ne dit rien et ne pose rien')
  const inconnu = await empreinteDuLien('zzzz9999')
  T('code inconnu → même redirection, aucune empreinte', inconnu.status === 302 && !inconnu.valeur)

  console.log('\n2. Arrivé par le lien → inscrit au registre, « prouvé »')
  const A = await creer('prouve'), jA = await session(A)
  const rA = await inscrire(jA, lien.valeur)
  const lA = await ligneDe(A.uid)
  T('l’inscription répond 200 et la ligne est créée', rA.status === 200 && !!lA, `HTTP ${rA.status}`)
  T('statut « prouve », preuve avec le code, l’arrivée et l’inscription', lA?.statut === 'prouve' && lA?.preuve?.code === CODE_APPORT && !!lA?.preuve?.arrivee && !!lA?.preuve?.inscription && lA?.preuve?.source === 'lien', JSON.stringify(lA?.preuve).slice(0, 140))
  T('l’offre et la date de souscription sont enregistrées', !!lA?.souscrit_le && !!lA?.offre_souscription)

  console.log('\n3. Une empreinte modifiée d’un seul caractère ne prouve rien')
  const B = await creer('falsifiee'), jB = await session(B)
  const falsifiee = lien.valeur.slice(0, -2) + (lien.valeur.endsWith('A') ? 'B' : 'A')
  await inscrire(jB, falsifiee)
  T('aucune ligne au registre pour une empreinte falsifiée', !(await ligneDe(B.uid)))

  console.log('\n4. Une empreinte de plus de 90 jours ne prouve rien')
  const C = await creer('perimee'), jC = await session(C)
  // On rejoue la signature d'une charge datée de 100 jours : c'est le serveur qui doit la refuser sur l'âge,
  // pas sur la signature (sinon le test ne prouverait rien de l'expiration).
  const secret = crypto.createHmac('sha256', SVC).update('presti:apport:v1').digest()
  const vieille = Buffer.from(JSON.stringify({ c: CODE_APPORT, t: Date.now() - 100 * 86_400_000 })).toString('base64url')
  const signee = `${vieille}.${crypto.createHmac('sha256', secret).update(vieille).digest('base64url')}`
  await inscrire(jC, signee)
  T('aucune ligne pour une empreinte de 100 jours (bien signée)', !(await ligneDe(C.uid)))
  // Contrôle du contrôle : la même charge, datée d'aujourd'hui, DOIT rattacher — sinon le test précédent
  // passerait pour une mauvaise raison (signature invalide, par exemple).
  const D = await creer('fraiche'), jD = await session(D)
  const fraiche = Buffer.from(JSON.stringify({ c: CODE_APPORT, t: Date.now() })).toString('base64url')
  await inscrire(jD, `${fraiche}.${crypto.createHmac('sha256', secret).update(fraiche).digest('base64url')}`)
  T('… mais la même empreinte, fraîche, rattache bien (le test dit vrai)', (await ligneDe(D.uid))?.statut === 'prouve')

  console.log('\n5. Un artisan n’entre au registre qu’une fois')
  await inscrire(jA, lien.valeur)
  const lignesA = await (await rest(`registre_apports?select=id&artisan_id=eq.${A.uid}`)).json()
  T('un second rattachement ne crée pas de doublon', lignesA.length === 1, `${lignesA.length} ligne(s)`)

  console.log('\n6. Le registre vu par la direction')
  const F = await creer('fondateur', { fondateur: true }), jF = await session(F)
  const reg = await json(await api('/api/controle/apports', {}, jF))
  const vue = (reg.body.lignes || []).find((l) => l.artisan?.id === A.uid)
  T('la ligne apparaît avec sa preuve en clair et son verdict', reg.status === 200 && !!vue && vue.compte === true && vue.tauxPct === 20 && /lien/i.test(vue.preuve), JSON.stringify(vue?.preuve ?? '').slice(0, 120))
  T('le lien d’apport est donné pour être copié', (reg.body.apporteurs || []).some((a) => a.code === CODE_APPORT && a.lien.endsWith(`/a/${CODE_APPORT}`)))

  console.log('\n7. Déclarer à la main : la pièce est obligatoire')
  const E = await creer('declare'), jE = await session(E)
  await purgerPlafondsDe(F.uid)
  const sansPiece = await json(await api('/api/controle/apports', { method: 'POST', body: JSON.stringify({ artisan_id: E.uid, code: CODE_APPORT, piece: '' }) }, jF))
  T('déclaration sans pièce → 400, et rien au registre', sansPiece.status === 400 && !(await ligneDe(E.uid)), `HTTP ${sansPiece.status}`)
  const sansJeton = await json(await api('/api/controle/apports', { method: 'POST', body: JSON.stringify({ artisan_id: E.uid, code: CODE_APPORT, piece: 'Email d’introduction du 02/09' }) }, jF))
  T('déclaration sans re-confirmation → 403', sansJeton.status === 403 && sansJeton.body.code === 'reconfirmation_requise', `HTTP ${sansJeton.status}`)
  // Un jeton frais par geste — ils sont à usage unique. Le plafond nominatif de re-confirmation est
  // purgé avant chaque demande : il protège la production, pas une suite qui joue huit gestes d'affilée.
  const reconf = async () => {
    await purgerPlafondsDe(F.uid)
    const r = (await json(await api('/api/controle/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'artisan' }) }, jF))).body.jeton
    if (!r) console.log('     ⚠️  aucun jeton de re-confirmation rendu — plafond ?')
    return r
  }
  const jeton1 = (await json(await api('/api/controle/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'artisan' }) }, jF))).body.jeton
  const avecPiece = await json(await api('/api/controle/apports', { method: 'POST', body: JSON.stringify({ artisan_id: E.uid, code: CODE_APPORT, piece: 'Email d’introduction du 02/09' }) }, jF, jeton1))
  const lE = await ligneDe(E.uid)
  T('avec pièce et confirmation → déclaré, et la pièce est gardée', avecPiece.status === 200 && lE?.statut === 'declare' && /introduction/.test(lE?.piece ?? ''), `HTTP ${avecPiece.status}`)
  const jd = (await (await rest(`journal_direction?select=action,apres&acteur_id=eq.${F.uid}&action=eq.apport_ajoute`)).json())[0]
  T('l’ajout est journalisé (apport_ajoute, avec la pièce)', !!jd && /introduction/.test(JSON.stringify(jd.apres)))

  console.log('\n8. Un apport déclaré ne devient JAMAIS prouvé')
  const jeton2 = (await json(await api('/api/controle/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'artisan' }) }, jF))).body.jeton
  const triche = await json(await api(`/api/controle/apports/${lE.id}/statut`, { method: 'POST', body: JSON.stringify({ statut: 'prouve', motif: 'je le veux' }) }, jF, jeton2))
  T('passer un apport déclaré en « prouvé » → refusé', triche.status === 400 && (await ligneDe(E.uid))?.statut === 'declare', `HTTP ${triche.status} ${triche.body.code ?? ''}`)

  console.log('\n9. Contester (10 %) et retirer, avec motif')
  await purgerPlafondsDe(F.uid)
  const jeton3 = (await json(await api('/api/controle/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'artisan' }) }, jF))).body.jeton
  const sansMotif = await json(await api(`/api/controle/apports/${lE.id}/statut`, { method: 'POST', body: JSON.stringify({ statut: 'conteste' }) }, jF, jeton3))
  T('contester sans motif → 400', sansMotif.status === 400)
  const jeton4 = (await json(await api('/api/controle/reconfirmer', { method: 'POST', body: JSON.stringify({ password: F.password, portee: 'artisan' }) }, jF))).body.jeton
  const conteste = await json(await api(`/api/controle/apports/${lE.id}/statut`, { method: 'POST', body: JSON.stringify({ statut: 'conteste', motif: 'Contact antérieur au lien' }) }, jF, jeton4))
  const reg2 = await json(await api('/api/controle/apports', {}, jF))
  const vue2 = (reg2.body.lignes || []).find((l) => l.id === lE.id)
  T('contesté → 200, compte à 10 %, motif rendu dans la raison', conteste.status === 200 && vue2?.compte === true && vue2?.tauxPct === 10 && /antérieur/.test(vue2?.raison ?? ''), JSON.stringify(vue2?.raison ?? '').slice(0, 120))
  const jm = (await (await rest(`journal_direction?select=avant,apres&acteur_id=eq.${F.uid}&action=eq.apport_modifie`)).json())[0]
  T('le changement est journalisé avant/après', jm?.avant?.statut === 'declare' && jm?.apres?.statut === 'conteste')

  console.log('\n10. Le rôle « lecture »')
  const L = await creer('lecture', { fondateur: true, role: 'lecture' }), jL = await session(L)
  const regL = await json(await api('/api/controle/apports', {}, jL))
  T('lecture : la liste répond 200', regL.status === 200)
  T('lecture : elle ne voit que SON registre (aucun apporteur ne lui est rattaché → aucune ligne)', (regL.body.lignes || []).length === 0, `${(regL.body.lignes || []).length} ligne(s)`)
  const ecritL = await json(await api('/api/controle/apports', { method: 'POST', body: JSON.stringify({ artisan_id: A.uid, code: CODE_APPORT, piece: 'x' }) }, jL))
  const statutL = await json(await api(`/api/controle/apports/${lE.id}/statut`, { method: 'POST', body: JSON.stringify({ statut: 'retire', motif: 'x' }) }, jL))
  T('lecture : déclarer et changer un statut → 403 lecture_seule', ecritL.status === 403 && ecritL.body.code === 'lecture_seule' && statutL.status === 403, `${ecritL.status} ${statutL.status}`)

  console.log('\n11. La liste des clients')
  const cli = await json(await api('/api/controle/clients', {}, jF))
  T('la liste répond 200, avec son résumé et sa source', cli.status === 200 && typeof cli.body.resume?.total === 'number' && !!cli.body.source?.a, `HTTP ${cli.status}`)
  // Les comptes de test en sont exclus par construction : c'est voulu (aucun @presti-test.invalid dans l'écran
  // de direction). Le canal d'acquisition, lui, est prouvé au bloc 6, sur le registre lui-même.
  const fuite = (cli.body.lignes || []).filter((l) => comptes.includes(l.id))
  T('aucun compte de test n’apparaît dans la liste des clients', fuite.length === 0, fuite.map((l) => l.nom).join(' '))
  T('chaque ligne porte un canal d’acquisition (organique ou apporté)', (cli.body.lignes || []).every((l) => l.canal?.type === 'organique' || (l.canal?.type === 'apporte' && typeof l.canal.compte === 'boolean')))
  console.log('\n12. Le faisceau d\u2019indices (v11 \u00a74.3) : un score qui TRIE, avec ses raisons')
  // Le score n'a de valeur que s'il r\u00e9agit aux faits. On pose sur l'artisan une origine d\u00e9clar\u00e9e qui
  // CONTREDIT la d\u00e9claration d'apport, et on v\u00e9rifie que le signal appara\u00eet et fait chuter le score.
  const repeser = async () => {
    await rest(`registre_apports?id=eq.${lE.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ score_maj_le: null }) })
    const r = await json(await api('/api/controle/apports', {}, jF))
    return (r.body.lignes || []).find((l) => l.id === lE.id)
  }
  await rest(`artisans?id=eq.${E.uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ origine_declaree: 'google', origine_precision: null }) })
  const bas = await repeser()
  T('la ligne porte un score et ses signaux', typeof bas?.score === 'number' && Array.isArray(bas?.signaux), JSON.stringify(bas ?? {}).slice(0, 140))
  const contre = (bas?.signaux || []).find((x) => x.cle === 'origine_autre')
  T('le client qui dit \u00ab Google \u00bb produit un signal CONTRE, d\u00e9taill\u00e9 en fran\u00e7ais',
    !!contre && contre.sens === 'contre' && /Google/i.test(contre.detail), JSON.stringify(bas?.signaux ?? []).slice(0, 200))
  T('le score reste born\u00e9 entre 0 et 100', typeof bas?.score === 'number' && bas.score >= 0 && bas.score <= 100, String(bas?.score))
  T('il vient avec un verdict en fran\u00e7ais, jamais un nombre nu', typeof bas?.confiance === 'string' && bas.confiance.length > 3, String(bas?.confiance))

  // L'inverse : le client confirme, en nommant l'apporteur.
  await rest(`artisans?id=eq.${E.uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ origine_declaree: 'presente', origine_precision: 'Alexandre' }) })
  const haut = await repeser()
  const pour = (haut?.signaux || []).find((x) => x.cle === 'origine_presente')
  T('le client qui confirme produit un signal POUR', !!pour && pour.sens === 'pour', JSON.stringify(haut?.signaux ?? []).slice(0, 200))
  T('et le score monte', (haut?.score ?? 0) > (bas?.score ?? 0), `${bas?.score} puis ${haut?.score}`)
  T('chaque ligne est rang\u00e9e dans une des trois files', ['a_valider', 'signales', 'valides'].includes(haut?.file), String(haut?.file))

  console.log('\n13. Les trois d\u00e9cisions (v11 \u00a74.4)')
  const sansMotif13 = await json(await api(`/api/controle/apports/${lE.id}/statut`, { method: 'POST', body: JSON.stringify({ decision: 'refuser' }) }, jF, await reconf()))
  T('refuser sans motif \u2192 400', sansMotif13.status === 400, `${sansMotif13.status} ${JSON.stringify(sansMotif13.body).slice(0, 90)}`)

  const avantV = await (await rest(`registre_apports?id=eq.${lE.id}&select=statut,taux:statut`)).json()
  const valide = await json(await api(`/api/controle/apports/${lE.id}/statut`, { method: 'POST', body: JSON.stringify({ decision: 'valider' }) }, jF, await reconf()))
  T('valider \u2192 200', valide.status === 200, `${valide.status} ${JSON.stringify(valide.body).slice(0, 110)}`)
  const [apresV] = await (await rest(`registre_apports?id=eq.${lE.id}&select=statut,revue_le,revue_par`)).json()
  T('la revue est dat\u00e9e et sign\u00e9e', !!apresV?.revue_le && apresV?.revue_par === F.uid, JSON.stringify(apresV))
  T('valider ne CHANGE PAS le statut : l\u2019histoire n\u2019est pas r\u00e9\u00e9crite', apresV?.statut === avantV[0]?.statut, `${avantV[0]?.statut} puis ${apresV?.statut}`)
  const reg13 = await json(await api('/api/controle/apports', {}, jF))
  T('la ligne rejoint la file \u00ab valid\u00e9s \u00bb', (reg13.body.lignes || []).find((l) => l.id === lE.id)?.file === 'valides', String((reg13.body.lignes || []).find((l) => l.id === lE.id)?.file))
  const jrV = await (await rest(`journal_direction?cible_id=eq.${lE.id}&action=eq.apport_modifie&order=cree_le.desc&limit=1`)).json()
  T('la validation est journalis\u00e9e, avant et apr\u00e8s', jrV[0]?.apres?.revue === 'valid\u00e9e', JSON.stringify(jrV[0]?.apres ?? {}).slice(0, 120))

  const versPreuve = await json(await api(`/api/controle/apports/${lE.id}/statut`, { method: 'POST', body: JSON.stringify({ statut: 'prouve', motif: 'tentative' }) }, jF, await reconf()))
  T('aucune d\u00e9cision ne transforme un d\u00e9clar\u00e9 en prouv\u00e9', versPreuve.status === 400, `${versPreuve.status} ${JSON.stringify(versPreuve.body).slice(0, 90)}`)

  const refuse = await json(await api(`/api/controle/apports/${lE.id}/statut`, { method: 'POST', body: JSON.stringify({ decision: 'refuser', motif: 'test e2e : refus' }) }, jF, await reconf()))
  T('refuser avec motif \u2192 200', refuse.status === 200, `${refuse.status} ${JSON.stringify(refuse.body).slice(0, 110)}`)
  const reg13b = await json(await api('/api/controle/apports', {}, jF))
  const apresR = (reg13b.body.lignes || []).find((l) => l.id === lE.id)
  T('l\u2019apport refus\u00e9 ne compte plus, et le taux tombe \u00e0 0', apresR?.compte === false && apresR?.tauxPct === 0, `compte=${apresR?.compte} taux=${apresR?.tauxPct}`)

  await purgerPlafonds(); await purgerPlafondsDe(F.uid, L.uid)
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e?.stack?.split('\n').slice(0, 3).join(' | ') || e)
} finally {
  await purgerPlafonds().catch(() => {})
  await nettoyer()
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
  if (process.exitCode !== 2) { console.log(`\n${ko === 0 ? '✅' : '❌'} controle-apports-e2e : ${ok}/${ok + ko} — ${APP}`); fin(ko === 0 ? 0 : 1) }
}
