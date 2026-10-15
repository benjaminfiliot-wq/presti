// « Ma plateforme » et « Mes chiffres » commencent avec Studio, pour TOUS les comptes (décision de Benj, 15/10/2026) ; l'automatique de
// « Mes chiffres » est Signature seulement. Ce juge est SANS réseau et SANS base : il lit la matrice (lib/plans.ts), rejoue la décision pure
// (lib/accesOffre.ts) et lit le code des routes, des pages et du menu pour y retrouver le verrou. La preuve par HTTP, sur de vrais comptes,
// est scripts/ecrans-offre-e2e.mjs.
//
// Échoue si :
//  • la matrice ne donne pas l'écran à Studio / Signature / Business seulement (Essai et Essentiel exclus), ou l'automatique à Signature seulement ;
//  • la décision pure laisse passer un compte sans la capacité, ou refuse un compte qui l'a, ou ne renvoie pas 403 { code: 'offre' } + l'offre ;
//  • une route de l'écran ne passe pas par le verrou serveur (tableau, réglages, assistant comptable, config et apparence de la plateforme) ;
//  • le passage quotidien de la compta sert un compte sans `chiffres.auto` ;
//  • une page ne rend pas l'écran verrouillé, le menu ne porte pas le badge Studio, l'aide dit une autre offre ;
//  • ce qui doit RESTER dans Essentiel (lien de conversation, réponse préparée, messages, pause, comptes clients) n'y est plus.
// Il s'attaque aussi lui-même (mutations que le juge DOIT voir).
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/ecrans-offre-qa.mjs

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
const charger = (f) => import(pathToFileURL(path.join(RACINE, f)).href)
const P = await charger('lib/plans.ts')
const A = await charger('lib/accesOffre.ts')
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8')
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const { PLANS, peut, offreMinimale } = P

const echecs = []
let n = 0
const ok = (cond, msg) => { n++; if (!cond) echecs.push(msg) }

// ── 1. La matrice ───────────────────────────────────────────────────────────────────────────────────────────────────
const TOUS = ['gratuit', 'essentiel', 'studio', 'signature', 'business']
const ATTENDU = {
  'plateforme.gestion': { gratuit: false, essentiel: false, studio: true, signature: true, business: true },
  chiffres: { gratuit: false, essentiel: false, studio: true, signature: true, business: true },
  'chiffres.auto': { gratuit: false, essentiel: false, studio: false, signature: true, business: true },
}
for (const [cap, parPlan] of Object.entries(ATTENDU)) {
  for (const id of TOUS) ok(peut(id, cap) === parPlan[id], `${cap} : ${id} devrait ${parPlan[id] ? 'passer' : 'être refusé'}`)
  const voulu = cap === 'chiffres.auto' ? 'signature' : 'studio'
  ok(offreMinimale(cap) === voulu, `${cap} : l'offre minimale devrait être ${voulu} (${offreMinimale(cap)})`)
}
// Ce qui reste dans TOUTES les offres (le lien de conversation doit marcher) : la page, la réponse préparée par l'IA, les comptes clients, le domaine.
for (const cap of ['plateforme.conversation', 'plateforme.comptes_clients', 'plateforme.domaine_perso', 'site.domaine_perso', 'relances', 'devis.ia', 'factures', 'canaux.email']) {
  for (const id of ['gratuit', 'essentiel', 'studio', 'signature']) ok(peut(id, cap), `${cap} doit rester dans ${id}`)
}
ok(!peut('essentiel', 'plateforme.ia.auto') && peut('studio', 'plateforme.ia.auto'), 'la réponse automatique reste à Studio (la réponse préparée est dans toutes les offres)')
ok(!peut('studio', 'plateforme.regles') && peut('signature', 'plateforme.regles'), "les règles d'automatisation de la plateforme restent à Signature seulement")

// ── 2. La décision pure ─────────────────────────────────────────────────────────────────────────────────────────────
for (const ecran of ['plateforme', 'chiffres']) {
  for (const id of ['gratuit', 'essentiel', null, undefined, '', 'inconnu']) {
    const d = A.decisionPourEcran(id, ecran)
    ok(!d.ok && d.statut === 403 && d.code === 'offre' && d.offre === 'studio' && /Disponible avec l’offre Studio/.test(d.erreur), `${ecran} · ${JSON.stringify(id)} devrait recevoir 403 offre « Studio » (${JSON.stringify(d)})`)
  }
  for (const id of ['studio', 'signature', 'business']) ok(A.decisionPourEcran(id, ecran).ok === true, `${ecran} · ${id} devrait passer`)
}
const dAuto = A.decisionEcran('studio', 'chiffres.auto', 'x')
ok(dAuto.ok === false && dAuto.offre === 'signature', "chiffres.auto : Studio refusé, l'offre demandée est Signature")
ok(A.decisionEcran('signature', 'chiffres.auto', 'x').ok === true, 'chiffres.auto : Signature passe')

// ── 3. Le verrou est dans le code des routes ────────────────────────────────────────────────────────────────────────
const ROUTES = [
  ['app/api/compta/tableau/route.ts', /exigerCapacite\(req, 'chiffres',/g, 1],
  ['app/api/compta/reglages/route.ts', /exigerCapacite\(req, 'chiffres\.auto',/g, 2],
  ['app/api/plateforme/config/route.ts', /exigerCapacite\(req, 'plateforme\.gestion',/g, 1],
  ['app/api/plateforme/apparence/route.ts', /exigerCapacite\(req, 'plateforme\.gestion',/g, 2],
]
/** Une route est gardée : `fois` appels du verrou d'offre et aucun authArtisan direct (qui contournerait la garde). */
const routeGardee = (source, motif, fois) => { const src = sansCommentaires(source); return (src.match(motif)?.length ?? 0) === fois && !/authArtisan\(/.test(src) }
for (const [f, motif, fois] of ROUTES) ok(routeGardee(lire(f), motif, fois), `${f} : ${fois} appel(s) du verrou d'offre attendu(s) et aucun authArtisan direct`)
{
  const src = lire('app/api/compta/assistant/route.ts')
  const i = src.indexOf("decisionPourEcran(artisan.plan, 'chiffres')"), j = src.indexOf('consumeCredit(userData.user.id')
  ok(i > 0 && j > 0 && i < j, 'app/api/compta/assistant : le verrou « chiffres » doit précéder la consommation du crédit')
}
{
  // Les GET/PUT de réglages ferment d'abord par le drapeau (404), puis par l'offre (403) : le verrou d'offre vient avant toute lecture de la base.
  const src = lire('app/api/compta/reglages/route.ts')
  for (const m of ['GET', 'PUT']) {
    const corps = src.slice(src.indexOf(`export async function ${m}`))
    ok(corps.indexOf('exigerCapacite') > 0 && corps.indexOf('exigerCapacite') < corps.indexOf('supabaseAdmin'), `compta/reglages ${m} : le verrou d'offre doit précéder toute lecture de la base`)
  }
  const tour = lire('lib/comptaAutomatisationsTour.ts')
  const iPeut = tour.indexOf("peut(artisan.plan, 'chiffres.auto')")
  ok(iPeut > 0 && iPeut < tour.indexOf(".from('factures')"), 'le passage quotidien de la compta doit écarter un compte sans chiffres.auto AVANT de lire ses factures')
  const garde = lire('lib/accesOffreServeur.ts')
  ok(/authArtisan\(req\)/.test(garde) && /from\('artisans'\)\.select\('plan'\)\.eq\('id', s\.uid\)/.test(garde) && /status: d\.statut/.test(garde), "lib/accesOffreServeur.ts : session vérifiée, offre lue pour l'uid de la SESSION, statut 403 renvoyé")
  ok(/automatisations: peut\(garde\.plan, 'chiffres\.auto'\)/.test(lire('app/api/compta/tableau/route.ts')), 'le tableau doit dire à la page si les automatisations sont ouvertes (Signature)')
}

// ── 4. Les pages et le menu ─────────────────────────────────────────────────────────────────────────────────────────
{
  const pf = lire('app/plateforme/page.tsx')
  const iV = pf.indexOf("peut(plan, 'plateforme.gestion')"), iC = pf.indexOf('<Conversations onCompte')
  ok(iV > 0 && /<EcranVerrouille ecran="plateforme"/.test(pf) && iC > iV, "app/plateforme/page.tsx : l'écran verrouillé doit être rendu AVANT les volets (aucune lecture sans l'offre)")
  const ch = lire('app/chiffres/page.tsx')
  ok(/peut\(prof\.plan as string \| null, 'chiffres'\)/.test(ch) && /<EcranVerrouille ecran="chiffres"/.test(ch) && /code === 'offre'/.test(ch), "app/chiffres/page.tsx : verrou par l'offre ET par le 403 du serveur")
  ok(/\(auto\s*\?\s*<Automatisations/.test(ch), "app/chiffres/page.tsx : les réglages d'automatisation ne sont montrés qu'avec chiffres.auto")
  const shell = lire('app/AppShell.tsx')
  ok(/key: 'chiffres'[^\n]*offre: 'Studio', cap: 'chiffres'/.test(shell), 'AppShell : « Mes chiffres » porte le badge Studio')
  ok(/key: 'plateforme'[^\n]*offre: 'Studio', cap: 'plateforme\.gestion'/.test(shell), 'AppShell : « Ma plateforme » porte le badge Studio')
  ok(/!peut\(a\.plan, it\.cap\)/.test(shell), "AppShell : le badge ne s'affiche que pour un compte qui n'a pas l'écran")
  const ev = lire('app/EcranVerrouille.tsx')
  ok(/href="\/abonnement"/.test(ev) && /libelleOffreMinimale/.test(ev) && /role="status"/.test(ev), 'EcranVerrouille : explication, offre lue dans la matrice, bouton vers /abonnement')
}
// Ce qui reste accessible en Essentiel pour que le lien de conversation marche : la page publique et les Messages n'ont aucune garde « gestion ».
{
  for (const f of ['app/messages/page.tsx', 'app/p/[slug]/page.tsx', 'app/api/conversation/route.ts', 'app/api/messages/route.ts']) {
    ok(!/plateforme\.gestion/.test(sansCommentaires(lire(f))), `${f} : le lien de conversation et les messages ne doivent pas dépendre de plateforme.gestion`)
  }
  ok(/import Conversations from '@\/app\/plateforme\/Conversations'/.test(lire('app/messages/page.tsx')), 'Messages monte les conversations (réponse préparée à valider) : Essentiel garde la validation')
  ok(/leads_pause/.test(lire('app/profil/page.tsx')), 'la mise en pause des demandes reste possible depuis Ma page (Essentiel)')
}

// ── 5. L'aide ───────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const v = JSON.parse(lire('lib/aide-videos.json')).videos
  for (const id of ['plateforme', 'chiffres']) ok(v.find((x) => x.id === id)?.offre === 'studio', `lib/aide-videos.json : « ${id} » doit annoncer l'offre studio`)
  const aide = await charger('lib/aide.ts')
  for (const id of ['plateforme', 'chiffres']) ok(aide.ARTICLES.find((a) => a.id === id)?.disponibleAvec === 'studio', `lib/aide.ts : l'article « ${id} » doit dire disponibleAvec: 'studio'`)
}

// ── 6. Le juge se teste : ces mutations DOIVENT être vues ───────────────────────────────────────────────────────────
{
  // 1. Une route dont le verrou d'offre est remplacé par la seule session (authArtisan) : le contrôle de la section 3 la voit.
  const [f1, m1, k1] = ROUTES[0]
  ok(!routeGardee(lire(f1).replace("exigerCapacite(req, 'chiffres',", 'authArtisan(req,'), m1, k1), 'mutation 1 non vue : route sans verrou d’offre')
  // 2. Une route qui garde le verrou mais demande la mauvaise capacité (Studio ouvrirait l'automatique de Mes chiffres).
  const [f2, m2, k2] = ROUTES[1]
  ok(!routeGardee(lire(f2).replace(/exigerCapacite\(req, 'chiffres\.auto',/g, "exigerCapacite(req, 'chiffres',"), m2, k2), 'mutation 2 non vue : réglages ouverts à Studio')
  // 3. Le verrou placé après le crédit : l'ordre de la section 3 la voit.
  const faux = "consumeCredit(userData.user.id, 'standard') ... decisionPourEcran(artisan.plan, 'chiffres')"
  ok(faux.indexOf("decisionPourEcran(artisan.plan, 'chiffres')") > faux.indexOf('consumeCredit(userData.user.id'), 'mutation 3 non vue : verrou après le crédit')
  // 4. Une matrice où Studio a l'automatique de Mes chiffres.
  const m = JSON.parse(JSON.stringify(PLANS)); m.studio.capacites.push('chiffres.auto')
  ok(m.studio.capacites.includes('chiffres.auto') && !PLANS.studio.capacites.includes('chiffres.auto'), "mutation 4 non vue : Studio qui a l'automatique de Mes chiffres")
}

if (echecs.length) {
  console.log(`❌ ecrans-offre-qa : ${echecs.length} échec(s) sur ${n} contrôles`)
  for (const e of echecs) console.log('  - ' + e)
  process.exit(1)
}
console.log(`✅ ecrans-offre-qa : ${n}/${n} contrôles — Ma plateforme et Mes chiffres dès ${PLANS[offreMinimale('chiffres')].label} (Essai et Essentiel : 403 + écran verrouillé), automatique de Mes chiffres : ${PLANS[offreMinimale('chiffres.auto')].label} seulement`)
