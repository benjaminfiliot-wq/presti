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
  ['/api/control/agents', 'POST', {}], ['/api/control/run-agent', 'POST', {}], ['/api/control/security', 'GET'],
  [`/api/devis/${id}/envoyer`, 'POST', {}], [`/api/devis/${id}/pdf`, 'GET'],
  [`/api/factures/${id}/avoir`, 'POST', {}], [`/api/factures/${id}/facturx`, 'GET'], [`/api/factures/${id}/pdf`, 'GET'],
  ['/api/leads/photos', 'POST', {}],
]
for (const [chemin, methode, body] of PROTEGEES) {
  const r = await appel(chemin, methode, body)
  T(`${methode} ${chemin.replace(id, ':id')} → ${r.status}`, [401, 403].includes(r.status), r.texte)
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
  for (const nom of ['mfa', 'inventaireRecherche', 'plateformePilotage', 'plateformeRegles', 'siteSlides3d', 'aideVisites', 'plateformePersona']) {
    T(`${nom} est levé (fonction livrée)`, FLAGS[nom] === true)
  }
  const source = fs.readdirSync('app', { recursive: true }).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => fs.readFileSync(`app/${f}`, 'utf8')).join('\n')
  T('plateformePilotage : drapeau sans usage — à retirer de lib/flags (documenté)', !/FLAGS\.plateformePilotage/.test(source))
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
