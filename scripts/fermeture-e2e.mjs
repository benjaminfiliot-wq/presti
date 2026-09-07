// Fermeture des portes (prompt v6 §2.2 : zéro case vide de couverture) — sans IA, sans paiement.
//
// Chaque route API que personne ne testait encore reçoit ici la requête qu'un inconnu peut lui
// envoyer, et on vérifie qu'elle se ferme proprement : jamais 200 sans identité là où une
// identité est requise, jamais 500 sur une entrée vide, jamais de secret cron accepté à vide.
// Les pages orphelines sont ouvertes ; les capacités d'offre sont confrontées à la grille ;
// les drapeaux baissés sont invisibles en production (§7).
//
// Usage : node scripts/fermeture-e2e.mjs
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const H = { 'Content-Type': 'application/json', 'User-Agent': 'presti-verif' }
const appel = async (chemin, methode = 'GET', body) => {
  const r = await fetch(`${BASE}${chemin}`, { method: methode, headers: H, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' })
  return { status: r.status, texte: (await r.text()).slice(0, 200) }
}
const id = '00000000-0000-4000-8000-000000000000'

console.log('\n── 1. Routes protégées : sans identité, rien ne passe (401/403), jamais 500')
const PROTEGEES = [
  ['/api/account/slug', 'GET'], ['/api/account/slug', 'POST', { slug: 'x' }],
  ['/api/canaux/relever', 'POST', {}],
  // v10 J1 — le Centre de direction : drapeau baissé → 404 (l'espace n'existe pas), levé → 401 ; jamais 500, jamais 200
  ['/api/controle/etat', 'GET'], ['/api/controle/chiffres', 'GET'], ['/api/controle/a-faire', 'GET'], ['/api/controle/fil', 'GET'], ['/api/controle/journal', 'GET'],
  ['/api/controle/reconfirmer', 'POST', {}], ['/api/controle/securite/bans', 'POST', {}],
  // v11 J0-J6 — le Poste de contrôle AU COMPLET. `barre` et `recherche` n'étaient appelées par
  // aucune suite : livrées, déployées, jamais regardées. Les autres sont ici pour que la liste
  // suive le dossier `app/api/controle/` et non ma mémoire.
  ['/api/controle/barre', 'GET'], ['/api/controle/recherche', 'GET'],
  ['/api/controle/apports', 'GET'], ['/api/controle/apports', 'POST', {}],
  ['/api/controle/clients', 'GET'], ['/api/controle/courriers', 'GET'],
  ['/api/controle/compta', 'GET'], ['/api/controle/compta', 'POST', {}],
  ['/api/controle/reglages', 'GET'], ['/api/controle/reglages', 'POST', {}],
  ['/api/controle/releve', 'GET'], ['/api/controle/releve', 'POST', {}],
  // Angles morts mesurés le 07/09 : ces routes n'étaient couvertes que par des suites que l'audit
  // nocturne ne joue jamais (coût IA, ou absentes du lanceur). Les tester à fond chaque nuit
  // coûterait des crédits ; vérifier qu'elles refusent un inconnu ne coûte rien, et c'est déjà
  // la différence entre « surveillé » et « on le saura quand un artisan le dira ».
  ['/api/devis/auto', 'POST', {}],
  ['/api/inventaire/recherche', 'POST', {}], ['/api/inventaire/recherche/retenir', 'POST', {}],
  ['/api/plateforme/apparence', 'GET'], ['/api/plateforme/apparence', 'POST', {}],
  ['/api/stripe/portail', 'GET'], ['/api/stripe/portail', 'POST', {}],
  [`/api/devis/${id}/envoyer`, 'POST', {}], [`/api/devis/${id}/pdf`, 'GET'],
  [`/api/factures/${id}/avoir`, 'POST', {}], [`/api/factures/${id}/facturx`, 'GET'], [`/api/factures/${id}/pdf`, 'GET'],
  ['/api/leads/photos', 'POST', {}],
]
for (const [chemin, methode, body] of PROTEGEES) {
  const r = await appel(chemin, methode, body)
  // /api/controle/* : 404 tant que FLAGS.direction est baissé (l'espace n'existe pas), 401 ensuite
  T(`${methode} ${chemin.replace(id, ':id')} → ${r.status}`, [401, 403].includes(r.status) || (chemin.startsWith('/api/controle/') && r.status === 404), r.texte)
}

console.log('\n── 1 bis. L’ancien poste de contrôle n’existe plus (fuite mesurée le 07/09)')
{
  // Ces six routes gardaient leur porte avec `artisans.is_founder`, la COLONNE — alors que 0070
  // avait corrigé la FONCTION `is_founder()` pour en exclure le partenaire. Une colonne n'est pas
  // une fonction. Résultat mesuré en production avant suppression, avec un compte partenaire :
  // /api/control/stats rendait 9 prospects avec nom, contact et message, plus 8 devis ; /inbox
  // rendait 25 emails de l'entreprise. Aucune trace, aucun journal, un simple GET.
  //
  // On n'exige plus qu'elles se ferment : on exige qu'elles n'existent plus. Une route morte qui
  // répond est une route qui finira par répondre à quelqu'un.
  for (const c of ['/api/control/stats', '/api/control/inbox', '/api/control/security',
                   '/api/control/stripe', '/api/control/agents', '/api/control/run-agent']) {
    const r = await appel(c, 'GET')
    T(`${c} n’existe plus → ${r.status}`, r.status === 404, r.texte)
  }
}

console.log('\n── 2. Crons : sans le secret, 401 — les deux planifiés et les deux appelés')
for (const c of ['/api/cron/relances', '/api/canaux/relever', '/api/cron/alertes', '/api/cron/purge-comptes']) {
  const r = await appel(c, 'GET')
  T(`${c} sans secret → ${r.status}`, r.status === 401, r.texte)
  const f = await fetch(`${BASE}${c}`, { headers: { ...H, Authorization: 'Bearer faux-secret' } })
  T(`${c} avec un faux secret → ${f.status}`, f.status === 401)
}

console.log('\n── 3. Routes publiques : une entrée vide est refusée proprement (400/404/429), jamais 500')
const PUBLIQUES = [
  ['/api/account/inscription', 'POST', {}, [401, 400]],
  ['/api/contact', 'POST', {}, [400, 429]],
  ['/api/leads/contact', 'POST', {}, [400, 404, 429]],
  ['/api/conversation/regles', 'POST', {}, [400, 403, 429]],
  ['/api/plat-event', 'POST', {}, [200, 204, 400, 404]],
  ['/api/report-error', 'POST', {}, [200, 204, 400, 429]],
]
for (const [chemin, methode, body, attendus] of PUBLIQUES) {
  const r = await appel(chemin, methode, body)
  T(`${methode} ${chemin} à vide → ${r.status}`, attendus.includes(r.status), r.texte)
}

console.log('\n── 4. Pages orphelines : elles répondent, sans marque parasite')
const page = async (u) => { const r = await fetch(`${BASE}${u}`, { headers: { 'User-Agent': 'presti-verif' } }); return { status: r.status, html: await r.text() } }
const onb = await page('/onboarding')
T('/onboarding répond (client : renvoie vers /login sans session)', onb.status === 200 && /Ton profil|login/i.test(onb.html))
const rp = await page('/reset-password')
T('/reset-password présente le formulaire', rp.status === 200 && /mot de passe/i.test(rp.html))
const demo = await page('/site/atelier-du-chene/infos-legales')
// « Presti » n'apparaît que là où la loi l'exige : la liste des sous-traitants (art. 13/28). Nulle part ailleurs.
const horsListe = demo.html.replace(/<ul class="legal-liste">[\s\S]*?<\/ul>/g, '').replace(/self\.__next_f[\s\S]*$/, '').replace(/prestiapp\.fr\/(site|p)\//g, '')
T('/site/[slug]/infos-legales de la démo : 200, « Presti » seulement dans la liste des sous-traitants', demo.status === 200 && !/presti/i.test(horsListe), (horsListe.match(/.{30}presti.{30}/i) || [demo.status])[0])

console.log('\n── 5. Capacités d’offre : la grille dit vrai (lib/plans)')
const { peut, offreMinimale } = await import('../lib/plans.ts').catch(() => ({}))
if (peut) {
  // L'essai (gratuit) = l'Essentiel avec 3 crédits (décision Benj 04/09) : le socle est ouvert à tous.
  const ATTENDU = {
    'site.essentiel': 'gratuit', 'plateforme.comptes_clients': 'gratuit', 'devis.prix_artisan': 'gratuit', 'factures.electronique': 'gratuit', 'canaux.email': 'gratuit', 'plateforme.domaine_perso': 'gratuit',
    'export': 'studio', 'site.pro': 'studio', 'plateforme.personnalisation_avancee': 'studio', 'inventaire.recherche_ia': 'studio', 'canaux.whatsapp': 'studio',
    'site.signature': 'signature', 'plateforme.ia.expert': 'signature', 'canaux.reseaux': 'signature', 'support.prioritaire': 'signature',
  }
  const ORDRE = ['gratuit', 'essentiel', 'studio', 'signature']
  for (const [cap, min] of Object.entries(ATTENDU)) {
    const iMin = ORDRE.indexOf(min)
    const coherent = ORDRE.every((plan, i) => peut(plan, cap) === (i >= iMin))
    T(`${cap} : ouvert à partir de « ${min} », fermé en dessous${min !== 'gratuit' ? ` (offreMinimale = ${offreMinimale(cap)})` : ''}`, coherent && (min === 'gratuit' || offreMinimale(cap) === min), ORDRE.map((p) => `${p}:${peut(p, cap) ? 'oui' : 'non'}`).join(' '))
  }
} else T('lib/plans importable', false)

console.log('\n── 6. Drapeaux : un drapeau baissé est invisible en production (§7)')
const { FLAGS } = await import('../lib/flags.ts').catch(() => ({ FLAGS: null }))
if (FLAGS) {
  const landing = (await page('/')).html
  T(`landingVideo=${FLAGS.landingVideo} ↔ vidéo ${/<video/.test(landing) ? 'présente' : 'absente'} sur la landing`, FLAGS.landingVideo === /<video/.test(landing))
  const aide = await page('/aide')
  T(`aideCentre=${FLAGS.aideCentre} ↔ /aide ${aide.status}`, FLAGS.aideCentre === (aide.status === 200))
  T('inventaireOcr baissé → aucun « OCR » vendu sur la landing ni la FAQ', !FLAGS.inventaireOcr && !/\bOCR\b/.test(landing) && !/\bOCR\b/.test((await page('/faq')).html))
  T('canauxWhatsapp / canauxReseaux baissés → pas vendus sur la landing', !FLAGS.canauxWhatsapp && !FLAGS.canauxReseaux && !/whatsapp/i.test(landing))
  // ── Chaque drapeau, et ce qu'il commande ────────────────────────────────────────────────────
  // Une liste de sept noms tenue à la main laissait quatre drapeaux livrés sans surveillance
  // (07/09) : `comptabilite` cachait son onglet sans fermer ses routes, et rien ne le disait.
  // Le verrou plus bas refuse tout drapeau absent de cette carte — ajouter un drapeau oblige
  // maintenant à déclarer ce qu'il ferme.
  //
  //   ['route', chemin, méthode] → baissé ⇒ 404, levé ⇒ tout sauf 404. Le seul vrai verrou.
  //   ['lu']                     → lu par le code (garde, menu, écran) : on vérifie qu'il l'est.
  //   ['note', pourquoi]         → il ne ferme RIEN, et il est baissé : il documente une absence.
  //   ['mort', pourquoi]         → levé, plus personne ne le lit : à retirer de lib/flags.
  const CARTE = {
    'codeEmail': ['route', '/api/auth/code', 'POST', 'app/api/auth/code/route.ts'],
    'pushWeb': ['route', '/api/push/abonner', 'POST', 'app/api/push/abonner/route.ts'],
    // `direction` ne se lit pas dans chaque route : la garde partagee le porte pour toutes.
    // C'est le bon endroit — a condition de le dire, sinon on croit que la route s'en charge.
    'direction': ['route', '/api/controle/etat', 'GET', 'lib/direction/garde.ts'],
    'apports': ['route', '/api/controle/apports', 'GET', 'app/api/controle/apports/route.ts'],
    'actionsArtisan': ['route', `/api/controle/clients/${id}/action`, 'POST', 'app/api/controle/clients/[id]/action/route.ts'],
    'messagerie': ['route', '/api/controle/courriers', 'GET', 'app/api/controle/courriers/route.ts'],
    'comptabilite': ['route', '/api/controle/compta', 'GET', 'app/api/controle/compta/route.ts', 'app/api/controle/releve/route.ts'],
    'inventaireRecherche': ['route', '/api/inventaire/recherche', 'POST', 'app/api/inventaire/recherche/route.ts'],
    'pushNatif': ['lu'], 'mfa': ['lu'], 'plateformeRegles': ['lu'], 'siteSlides3d': ['lu'],
    'aideVisites': ['lu'], 'aideCentre': ['lu'], 'landingVideo': ['lu'],
    'inventaireOcr': ['note', 'rien ne le lit : la preuve est qu’aucun « OCR » n’est vendu (test plus haut)'],
    'canauxWhatsapp': ['note', 'rien ne le lit : la preuve est que WhatsApp n’est pas vendu sur la landing'],
    'canauxReseaux': ['note', 'rien ne le lit : idem WhatsApp'],
    'plateformePilotage': ['mort', 'levé, plus aucun usage dans app/ — à retirer'],
    'plateformePersona': ['mort', 'levé, plus aucun usage : la personnalisation est active sans condition'],
  }
  const lus = ['app', 'lib', 'components'].filter((d) => fs.existsSync(d)).flatMap((d) =>
    fs.readdirSync(d, { recursive: true }).filter((f) => /\.(ts|tsx)$/.test(f) && !/flags\.ts$/.test(f))
      .map((f) => fs.readFileSync(`${d}/${f}`, 'utf8'))).join('\n')
  const estLu = (nom) => new RegExp(`actif\\(['"\`]${nom}['"\`]\\)|FLAGS\\.${nom}\\b`).test(lus)

  // Le verrou : un drapeau qui n'est pas dans la carte n'est vérifié par personne.
  const oublies = Object.keys(FLAGS).filter((n) => !CARTE[n])
  T(`chaque drapeau de lib/flags est dans la carte${oublies.length ? ` — manquent : ${oublies.join(', ')}` : ''}`, oublies.length === 0)

  for (const [nom, [nature, a, b, ...fichiers]] of Object.entries(CARTE)) {
    if (!(nom in FLAGS)) { T(`${nom} : dans la carte mais plus dans lib/flags — carte à nettoyer`, false); continue }
    const leve = FLAGS[nom] === true
    if (nature === 'route') {
      const r = await appel(a, b, b === 'POST' ? {} : undefined)
      T(`${nom}=${leve} ↔ ${b} ${a} → ${r.status}`, leve ? r.status !== 404 && r.status < 500 : r.status === 404, r.texte)
      // « Lu quelque part » ne suffit pas : le 07/09, `comptabilite` était lu par l'écran, qui
      // masquait l'onglet, pendant que ses deux routes répondaient à qui connaissait l'adresse.
      // On exige donc que CE fichier de route lise CE drapeau.
      for (const fichier of fichiers) {
        const source = fs.existsSync(fichier) ? fs.readFileSync(fichier, 'utf8') : ''
        T(`${fichier} lit lui-même « ${nom} » (le bouton caché ne ferme pas la porte)`,
          new RegExp(`actif\\(['"\`]${nom}['"\`]\\)`).test(source), source ? 'le drapeau n’y est pas' : 'fichier introuvable')
      }
    } else if (nature === 'lu') {
      T(`${nom} est lu par le code`, estLu(nom))
    } else if (nature === 'note') {
      // Un drapeau « note » LEVÉ n'a plus de sens : il annoncerait une fonctionnalité que rien
      // n'ouvre. On exige donc qu'il soit baissé, et qu'il reste effectivement sans lecteur.
      T(`${nom} : baissé, et il ne ferme rien — ${a}`, !leve && !estLu(nom))
    } else {
      T(`${nom} : drapeau mort — ${a}`, !estLu(nom))
    }
  }
}

console.log('\n── 7. Aucune suite « gratuite » ne fait répondre le modèle (la réserve ne se dépense pas la nuit)')
{
  // Le 07/09, deux suites postant sur `/api/conversation/stream` ont été branchées en « gratuit » :
  // l'audit nocturne les aurait fait dépenser chaque nuit. Elles avaient été classées en cherchant
  // le mot « anthropic » dans leur source — il n'y est pas, l'appel passe par une route du produit.
  // Ce verrou remplace cette mémoire-là : le coût se déduit de ce que la suite APPELLE vraiment.
  //
  // Citer une route n'est pas l'appeler : `emails-e2e` les liste dans sa carte des envois,
  // `audit-final-e2e` les lit dans le code source. Un verrou qui crie pour rien finit éteint.
  const POST_SEULEMENT = ['/api/conversation/stream', '/api/devis/auto', '/api/devis/generer',
    '/api/tools/reponse', '/api/site/generate', '/api/inventaire/recherche']

  /** Ces suites appellent une route d'IA sans rien dépenser, et voici pourquoi. */
  const SANS_COUT = {
    'fermeture-e2e.mjs': 'elle porte cette liste elle-même, et n’appelle rien',
    // Ses comptes de test naissent avec `credits: 0` : l'assistant s'arrête sur « crédits épuisés »
    // AVANT d'appeler le modèle, et c'est justement ce que la suite prouve. Si un jour ces comptes
    // recevaient des crédits, elle dépenserait — le `credits: 0` est donc load-bearing, pas cosmétique.
    'modes-e2e.mjs': 'ses comptes ont zéro crédit : la route refuse avant le modèle, et c’est ce qu’elle prouve',
  }

  const lanceur = fs.readFileSync('scripts/tout-verifier.mjs', 'utf8')
  const declarees = [...lanceur.matchAll(/args:\s*\[([^\]]*)\][^}]*cout:\s*'(\w+)'/g)]
    .flatMap((m) => [...m[1].matchAll(/scripts\/([\w-]+\.mjs)/g)].map((f) => ({ fichier: f[1], cout: m[2] })))

  const fautives = []
  for (const d of declarees) {
    if (d.cout === 'ia' || SANS_COUT[d.fichier]) continue
    const chemin = `scripts/${d.fichier}`
    if (!fs.existsSync(chemin)) continue
    const lignes = fs.readFileSync(chemin, 'utf8').split(/\r?\n/)
    const touchees = new Set()
    lignes.forEach((ligne, i) => {
      if (!/fetch\(|await post|await api\(/.test(ligne)) return
      for (const r of POST_SEULEMENT) if (ligne.includes(r)) touchees.add(r)
      // `/api/conversation` a un GET qui lit le fil : seul le POST fait répondre le modèle.
      if (/\/api\/conversation[?'"`]/.test(ligne)) {
        const bloc = lignes.slice(i, i + 4).join(' ')
        if (/method:\s*'POST'/.test(bloc)) touchees.add('/api/conversation (POST)')
      }
    })
    if (touchees.size) fautives.push(`${d.fichier} (${d.cout}) → ${[...touchees].join(', ')}`)
  }
  T(`aucune suite non-IA ne fait répondre le modèle${fautives.length ? ` — ${fautives.join(' · ')}` : ''}`, fautives.length === 0)
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
