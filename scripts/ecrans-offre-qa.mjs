// LA PLATEFORME (page de conversation publique, réponse préparée par l'IA, comptes clients, relances de conversation, nom de domaine sur la page,
// boîte e-mail branchée, « Ma plateforme », « Messages », « Réponses instantanées ») et « Mes chiffres » commencent avec Studio, pour TOUS les
// comptes (décision de Benj, 15/10/2026 : « Dans Essentiel il n'y a PAS de plateforme ») ; l'automatique de « Mes chiffres » est Signature seulement. Ce juge est SANS réseau et SANS base : il lit la matrice (lib/plans.ts), rejoue la décision pure
// (lib/accesOffre.ts) et lit le code des routes, des pages et du menu pour y retrouver le verrou. La preuve par HTTP, sur de vrais comptes,
// est scripts/ecrans-offre-e2e.mjs.
//
// Échoue si :
//  • la matrice ne donne pas l'écran à Studio / Signature / Business seulement (Essai et Essentiel exclus), ou l'automatique à Signature seulement ;
//  • la décision pure laisse passer un compte sans la capacité, ou refuse un compte qui l'a, ou ne renvoie pas 403 { code: 'offre' } + l'offre ;
//  • une route de l'écran ne passe pas par le verrou serveur (tableau, réglages, assistant comptable, config et apparence de la plateforme) ;
//  • le passage quotidien de la compta sert un compte sans `chiffres.auto` ;
//  • une page ne rend pas l'écran verrouillé, le menu ne porte pas le badge Studio, l'aide dit une autre offre ;
//  • une route PUBLIQUE de la plateforme (demande, conversation, devis du fil, règles, coordonnées, lien magique) ou le passage quotidien des relances
//    ne ferme pas la porte AVANT d'écrire, de débiter un crédit ou d'envoyer ; la page publique d'un compte sans plateforme n'est pas neutre ;
//  • ce qui doit RESTER dans Essentiel (devis chiffrés par l'IA, factures, export Factur-X) n'y est plus, ou Essai n'est plus aligné sur Essentiel.
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
// LA PLATEFORME : aucune de ses capacités dans Essai ni Essentiel, toutes à Studio et au-dessus.
// 25/10 (Benj, deux offres) : `plateforme.ia.auto` (la réponse qui part SEULE) n'est plus dans cette liste : elle est Signature seulement (vérifiée plus bas).
const PLATEFORME = ['plateforme.conversation', 'plateforme.comptes_clients', 'plateforme.domaine_perso', 'site.domaine_perso', 'relances', 'canaux.email', 'plateforme.personnalisation_avancee']
for (const cap of PLATEFORME) {
  for (const id of ['gratuit', 'essentiel']) ok(!peut(id, cap), `${cap} : ${id} n'a PAS de plateforme`)
  for (const id of ['studio', 'signature', 'business']) ok(peut(id, cap), `${cap} : ${id} a la plateforme`)
  ok(offreMinimale(cap) === 'studio', `${cap} : l'offre minimale est Studio (${offreMinimale(cap)})`)
}
// Ce qui RESTE en Essentiel : ce qui n'est pas la plateforme. L'Essai est aligné sur Essentiel (mêmes capacités).
for (const cap of ['devis.ia', 'devis.prix_artisan', 'factures', 'factures.electronique']) for (const id of ['gratuit', 'essentiel', 'studio', 'signature']) ok(peut(id, cap), `${cap} doit rester dans ${id}`)
ok(JSON.stringify([...PLANS.gratuit.capacites].sort()) === JSON.stringify([...PLANS.essentiel.capacites].sort()), "l'offre Essai a exactement les capacités d'Essentiel")
ok(PLANS.essentiel.capacites.every((c) => !/^plateforme\.|^relances$|^canaux\.|domaine_perso$/.test(c)), 'Essentiel ne contient aucune capacité de la plateforme (préfixes plateforme., relances, canaux., domaine_perso)')
// 25/10 : la réponse préparée est dans Studio et Signature ; celle qui part seule, et les relances envoyées seules, sont Signature seulement.
for (const cap of ['plateforme.ia.auto', 'relances.auto', 'factures.relances.auto']) {
  for (const id of ['gratuit', 'essentiel', 'studio']) ok(!peut(id, cap), `${cap} : ${id} ne doit rien envoyer seul`)
  for (const id of ['signature', 'business']) ok(peut(id, cap), `${cap} : ${id} envoie seul`)
  ok(offreMinimale(cap) === 'signature', `${cap} : l'offre minimale est Signature (${offreMinimale(cap)})`)
}
ok(!peut('studio', 'plateforme.regles') && peut('signature', 'plateforme.regles'), "les règles d'automatisation de la plateforme restent à Signature seulement")

// ── 2. La décision pure ─────────────────────────────────────────────────────────────────────────────────────────────
for (const ecran of ['plateforme', 'chiffres', 'messages', 'outils']) {
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
  ['app/api/messages/route.ts', /exigerCapacite\(req, 'plateforme\.conversation',/g, 1],
  ['app/api/devis/auto/route.ts', /exigerCapacite\(req, 'plateforme\.conversation',/g, 1],
]
/** Une route est gardée : `fois` appels du verrou d'offre et aucun authArtisan direct (qui contournerait la garde). */
const routeGardee = (source, motif, fois) => { const src = sansCommentaires(source).replace(/async function authArtisan\(req: Request\)/, ''); return (src.match(motif)?.length ?? 0) === fois && !/(^|[^.\w])(authArtisan|verifierSession|getUserRevocable)\(req/.test(src) }
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
  ok(/authArtisan\(req\)/.test(garde) && /from\('artisans'\)\.select\('plan, is_founder'\)\.eq\('id', s\.uid\)/.test(garde) && /status: d\.statut/.test(garde), "lib/accesOffreServeur.ts : session vérifiée, offre lue pour l'uid de la SESSION, statut 403 renvoyé")
  ok(/automatisations: peut\(garde\.plan, 'chiffres\.auto'\)/.test(lire('app/api/compta/tableau/route.ts')), 'le tableau doit dire à la page si les automatisations sont ouvertes (Signature)')
}

// LES ROUTES PUBLIQUES DE LA PLATEFORME : la porte se ferme AVANT toute écriture, tout crédit, tout envoi (15/10 : « pas de plateforme en Essentiel »).
{
  /** Position de la première occurrence d'un motif dans le code sans commentaires (-1 si absent). */
  const pos = (src, re) => { const m = re.exec(src); return m ? m.index : -1 }
  const sansImports = (src) => src.replace(/^import [^\n]*$/gm, '')
  const avantUn = (src, garde, ...suivants) => { const g = pos(src, garde); return g > 0 && suivants.every((re) => { const p = pos(src, re); return p < 0 || g < p }) }
  /** Chaque gestionnaire (GET, POST…) qui écrit, débite ou envoie doit poser la garde avant tout le reste ; au moins un gestionnaire la pose. */
  const avant = (src, garde, ...suivants) => { const morceaux = sansImports(src).split(/export async function /).slice(1); return morceaux.some((m) => garde.test(m)) && morceaux.filter((m) => /\.from\(|supabaseAdmin|consumeCredit|sendEmail|notifierArtisan/.test(m)).every((m) => avantUn(m, garde, ...suivants)) }
  const PUB = [
    // [fichier, motif de la garde, motifs qui doivent venir APRÈS la garde]
    ['app/api/conversation/route.ts', /refusSiSansPlateforme\(lead\.artisan_id\)/, [/consommerLimite/, /\.insert\(/, /consumeCredit/]],
    ['app/api/conversation/stream/route.ts', /refusSiSansPlateforme\(lead\.artisan_id\)/, [/consommerLimite/, /\.insert\(/, /consumeCredit/]],
    ['app/api/conversation/regles/route.ts', /refusSiSansPlateforme\(lead\.artisan_id\)/, [/consommerLimite\(`regles:/, /declencherRegles\(/]],
    ['app/api/conversation/devis/route.ts', /refusSiSansPlateforme\(lead\.artisan_id\)/, [/\.update\(/, /creerFacture\(/, /notifierArtisan\(/]],
    ['app/api/leads/contact/route.ts', /refusSiSansPlateforme\(lead\.artisan_id\)/, [/\.update\(/, /sendEmail\(/, /notifierArtisan\(/, /\.insert\(/]],
    ['app/api/leads/route.ts', /!plateforme && !commandeDonnee/, [/from\('leads'\)\s*\.insert/, /consumeCredit\(/, /generateLeadReply\(/, /storage\.from/]],
    ['app/api/p/auth/route.ts', /plateformeOuverte\(artisan\)/, [/creerLienMagique\(/, /sendEmail\(/]],
    ['app/api/tools/reponse/route.ts', /!plateformeOuverte\(artisan\)/, [/consumeCredit\(/, /generateLeadReply\(/]],
    ['app/api/cron/relances/route.ts', /!plateformeOuverte\(artisan\)/, [/update\(\{ envoyee: true \}\)\.eq\('id', r\.id\)\.eq\('envoyee', false\)/, /generateRelanceReply\(/, /sendEmail\(/]],
    ['app/api/canaux/relever/route.ts', /plateformeOuverte\((a|compte)\)/, [/releverCanal\(c\)/]],
  ]
  for (const [f, garde, apres] of PUB) {
    const src = sansCommentaires(lire(f))
    ok(avant(src, garde, ...apres), `${f} : la garde « plateforme » doit précéder toute écriture, tout crédit et tout envoi`)
  }
  // Le cron ANNULE (marque traitée) les relances d'un compte sans plateforme : sinon elles encombrent le lot de chaque passage et repartent, périmées, à la montée en Studio.
  ok(/!plateformeOuverte\(artisan\)\) \{\s*await supabaseAdmin\.from\('relances'\)\.update\(\{ envoyee: true \}\)/.test(sansCommentaires(lire('app/api/cron/relances/route.ts'))), "cron des relances : une relance d'un compte sans plateforme est annulée, jamais envoyée ni laissée due")
  // L'envoi d'un devis n'arme plus de relance de conversation pour un compte sans plateforme.
  // 21/10 : l'envoi du devis vit dans lib/envoisPdfServeur.ts (partagé par la route et le Pilote automatique) ; la route ne fait que l'appeler.
  ok(/plateformeOuverte\(artisan \?\? \{\}\)[\s\S]{0,400}planifierRelances\(lead\.id\)/.test(sansCommentaires(lire('lib/envoisPdfServeur.ts')))
    && /envoisPdfServeur/.test(lire('app/api/devis/[id]/envoyer/route.ts')), "devis/envoyer : les relances de conversation ne sont armées qu'avec la plateforme")
  // La boîte e-mail : brancher exige la capacité, la relève (cron et bouton) l'écarte.
  const cx = sansCommentaires(lire('app/api/canaux/route.ts'))
  const post = cx.slice(cx.indexOf('export async function POST'), cx.indexOf('export async function DELETE'))
  ok(/exigerCapacite\(req, 'canaux\.email'/.test(post) && post.indexOf('exigerCapacite') < post.indexOf('chiffrementDisponible()'), 'canaux POST : la boîte e-mail branchée exige canaux.email avant tout traitement')
  ok(/GET[\s\S]*DELETE/.test(cx) && !/exigerCapacite/.test(cx.slice(cx.indexOf('export async function DELETE'))), 'canaux DELETE : on peut toujours déconnecter une boîte (rien ne reste coincé)')
  // La page publique d'un compte sans plateforme : neutre, polie, sans conversation, coordonnées publiques seulement, aucune mention de Presti.
  const pp = lire('app/p/[slug]/page.tsx')
  const iFerme = pp.indexOf('!plateformeOuverte(a)'), iChat = pp.indexOf('<PlatChat\n', iFerme)
  ok(iFerme > 0 && iChat > iFerme && /MESSAGE_PUBLIC_SANS_PLATEFORME/.test(pp.slice(iFerme, iChat)) && /tel:|mailto:/.test(pp.slice(iFerme, iChat)) && /return \(/.test(pp.slice(iFerme, iChat)), 'page publique : un compte sans plateforme voit un message neutre et ses coordonnées publiques, AVANT le montage de la conversation')
  ok(!/presti/i.test(pp.slice(iFerme, iChat).replace(/plateformeOuverte|MESSAGE_PUBLIC_SANS_PLATEFORME|--\s*\n/gi, '').replace(/\/\/[^\n]*/g, '')), 'page publique sans plateforme : aucune mention de Presti (marque blanche)')
  const sp = sansCommentaires(lire('app/site/[slug]/page.tsx'))
  ok(/plateformeActive = a\.plateforme_active !== false && !!a\.slug && plateformeOuverte\(a\)/.test(sp), "le site vitrine ne renvoie vers la conversation que si la plateforme est ouverte (sinon : téléphone / formulaire)")
  // Le formulaire d'un site COMMANDÉ continue d'arriver à l'artisan : la demande est gardée et l'artisan prévenu par e-mail seul ; ni IA, ni crédit, ni relance, ni accusé.
  const lr = sansCommentaires(lire('app/api/leads/route.ts'))
  const iGarde = lr.indexOf('if (!plateforme && !commandeDonnee)'), iSans = lr.indexOf('if (!plateforme) {'), iPause = lr.indexOf('if (artisan.leads_pause === true)')
  const blocSans = lr.slice(iSans, iPause)
  ok(iGarde > 0 && /status: 403/.test(lr.slice(iGarde, iSans)) && iSans > iGarde && iPause > iSans, "/api/leads sans plateforme : la page de conversation reçoit un 403, le formulaire d'un site commandé continue plus bas, avant le mode pause et l'IA")
  ok(/sendEmail\(/.test(blocSans) && !/notifierArtisan\(|consumeCredit|generate|relances|planifier|rendreCredit/.test(blocSans) && /return NextResponse\.json\(\{ ok: true/.test(blocSans), "/api/leads sans plateforme (site commandé) : e-mail seul à l'artisan, ni IA, ni crédit, ni relance, ni accusé au client")
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
  ok(/key: 'messages'[^\n]*offre: 'Studio', cap: 'plateforme\.conversation'/.test(shell), 'AppShell : « Messages » porte le badge Studio')
  ok(/key: 'outils'[^\n]*offre: 'Studio', cap: 'plateforme\.conversation'/.test(shell), 'AppShell : « Réponses instantanées » porte le badge Studio')
  for (const [f, ecran] of [['app/messages/page.tsx', 'messages'], ['app/messages/canaux/page.tsx', 'messages'], ['app/outils/page.tsx', 'outils']]) {
    const src = lire(f)
    ok(new RegExp(`<EcranVerrouille ecran="${ecran}"`).test(src) && /!peut\((plan|p), 'plateforme\.conversation'\)/.test(src), `${f} : l'écran verrouillé « ${ecran} » est rendu quand la plateforme n'est pas dans l'offre`)
  }
  {
    const d = lire('app/dashboard/page.tsx')
    ok(/sansPlateforme = ready && !peut\(plan, 'plateforme\.conversation'\)/.test(d) && /if \(peut\(planCompte, 'plateforme\.conversation'\)\) await loadLeads/.test(d) && /data-sans-plateforme/.test(d), "tableau de bord : sans plateforme, ni lien de contact ni demandes (aucune lecture des demandes), seulement devis / factures / tarifs et l'offre Studio")
    const pr = lire('app/profil/page.tsx')
    ok(/avecPlateforme = peut\(plan, 'plateforme\.conversation'\)/.test(pr) && /\{avecPlateforme \? \(/.test(pr) && /\{avecPlateforme && \(/.test(pr), 'Ma page : lien à partager, interrupteur de la page et réglages des réponses seulement avec la plateforme')
  }
}
// Sans plateforme, le menu et les écrans le disent clairement ; l'Essai est aligné sur Essentiel.
{
  const ev = lire('app/EcranVerrouille.tsx')
  ok(/commence avec Studio/.test(ev) && /devis avec l’IA sur vos prix/.test(ev) && !/Votre lien de conversation reste actif/.test(ev), "EcranVerrouille : dit que la plateforme commence avec Studio et ce qui RESTE (devis chiffrés, e-mail, factures) ; ne promet plus le lien actif")
  ok(!/Votre lien de conversation reste actif|Le lien de conversation public d.un Essentiel/.test(sansCommentaires(lire('app/EcranVerrouille.tsx'))), "plus aucune promesse de lien actif en Essentiel dans l'écran verrouillé")
}


// ── 5. L'aide ───────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const v = JSON.parse(lire('lib/aide-videos.json')).videos
  for (const id of ['plateforme', 'chiffres', 'messages', 'outils']) ok(v.find((x) => x.id === id)?.offre === 'studio', `lib/aide-videos.json : « ${id} » doit annoncer l'offre studio`)
  const aide = await charger('lib/aide.ts')
  for (const id of ['plateforme', 'chiffres', 'messages', 'outils', 'canaux']) ok(aide.ARTICLES.find((a) => a.id === id)?.disponibleAvec === 'studio', `lib/aide.ts : l'article « ${id} » doit dire disponibleAvec: 'studio'`)
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
  // 5. La garde « plateforme » retirée d'une route publique : le contrôle d'ordre de la section 3 la voit.
  { const src = sansCommentaires(lire('app/api/conversation/route.ts')).replace(/refusSiSansPlateforme\(lead\.artisan_id\)/g, 'Promise.resolve(null)'); ok(!/refusSiSansPlateforme\(lead\.artisan_id\)/.test(src), 'mutation 5 non vue : route de conversation sans garde plateforme') }
  // 6. Une matrice où Essentiel a la plateforme.
  { const m = JSON.parse(JSON.stringify(PLANS)); m.essentiel.capacites.push('plateforme.conversation'); ok(m.essentiel.capacites.some((c) => /^plateforme\./.test(c)) && !PLANS.essentiel.capacites.some((c) => /^plateforme\./.test(c)), 'mutation 6 non vue : Essentiel qui a la plateforme') }
  // 4. Une matrice où Studio a l'automatique de Mes chiffres.
  const m = JSON.parse(JSON.stringify(PLANS)); m.studio.capacites.push('chiffres.auto')
  ok(m.studio.capacites.includes('chiffres.auto') && !PLANS.studio.capacites.includes('chiffres.auto'), "mutation 4 non vue : Studio qui a l'automatique de Mes chiffres")
}

if (echecs.length) {
  console.log(`❌ ecrans-offre-qa : ${echecs.length} échec(s) sur ${n} contrôles`)
  for (const e of echecs) console.log('  - ' + e)
  process.exit(1)
}
console.log(`✅ ecrans-offre-qa : ${n}/${n} contrôles — la plateforme (Ma plateforme, Messages, Réponses instantanées, page publique, relances) et Mes chiffres dès ${PLANS[offreMinimale('chiffres')].label} (Essai et Essentiel : 403 + écran verrouillé), automatique de Mes chiffres : ${PLANS[offreMinimale('chiffres.auto')].label} seulement`)
