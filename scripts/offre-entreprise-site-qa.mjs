// Juge 036-023, étendu par 036-026 : l'offre « Presti pour l'entreprise » sur le site.
//  - 036-023 : la carte est sur la page d'accueil et la page abonnement, sans prix, avec le bouton « Parler à l'équipe » vers
//    /contact?motif=entreprise, et son titre et son accroche viennent de lib/plans.ts.
//  - 036-026 : la carte de #tarifs est enrichie (six points, les cinq temps, un lien vers /entreprise) ; la page /entreprise existe,
//    avec son canonique, les cinq temps, au moins six outils sous leur vrai nom (et aucun hors de la liste outillée), les sept
//    applications, le bouton vers le contact ; le contact lit motif=entreprise ; aucun prix, aucun « démo », aucun chiffre de gain,
//    aucun témoignage ni logo, aucune fonction derrière un drapeau baissé, aucun mot creux, rien qui dise que rien ne sort d'Europe ;
//    le juge est inscrit au lanceur.
// Il s'attaque lui-même : chaque contrôle a son mutant, qui DOIT être vu. Un mutant qui passe, ou qui ne change rien, fait sortir 1.
// Usage : node scripts/offre-entreprise-site-qa.mjs
import fs from 'node:fs'
import path from 'node:path'

const R = process.cwd()
const lire = (f) => { try { return fs.readFileSync(path.join(R, f), 'utf8') } catch { return '' } }
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const PAGES = ['app/page.tsx', 'app/abonnement/page.tsx']
const COMPOSANT = 'app/OffreEntreprise.tsx'
const PAGE_ENT = 'app/entreprise/page.tsx'
const CONTACT = 'app/contact/page.tsx'
const FORMULAIRE = 'app/contact/Formulaire.tsx'
const LANCEUR = 'scripts/tout-verifier.mjs'
const MOI = 'scripts/offre-entreprise-site-qa.mjs'

// Les cinq temps (prompt 6 § 2.8) et les sept applications (§ 2.5).
const TEMPS = ['Rendez-vous', 'Accueil', 'Proposition', 'Mise en service', 'Suivi mensuel']
const APPLICATIONS = ['Centre de commande de direction', 'CRM sur mesure', 'Vue « monde » de l’entreprise', 'App de terrain', 'Portail de vos clients', 'Formulaires métier', 'Tableaux de bord et rapports']
// La liste outillée : un nœud n8n natif ou une API documentée (plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md § 3 et § 7).
// WhatsApp, Telegram et les SMS en sont exclus ici : leur canal est derrière un drapeau baissé ou attend un webhook exposé.
const OUTILLES = ['Gmail', 'Outlook', 'Google Agenda', 'Google Drive', 'Google Docs', 'Google Sheets', 'Google Chat', 'OneDrive', 'Excel',
  'Slack', 'Microsoft Teams', 'HubSpot', 'Pipedrive', 'Salesforce', 'Zoho CRM', 'Odoo', 'Airtable', 'Notion', 'monday', 'ClickUp',
  'Stripe', 'QuickBooks', 'Xero', 'Pennylane', 'Tiime', 'Sage', 'Yousign', 'DocuSign', 'Fiche Google']
const QUESTIONS = ['Votre entreprise et votre métier', 'Combien vous êtes', 'Vos outils', 'Ce qui vous fait perdre le plus de temps']

// Les interdits de texte (sur le source sans commentaires : identifiants compris, aucun n'y prête).
const PRIX = /\d\s?(€|euros?\b|EUR\b)|€\s?\d|\beuros?\b/i
const DEMO = /(^|[^\p{L}])d[ée]mos?(?![\p{L}])|demander une d[ée]mo/iu
const GAIN = /\d+\s?%|(^|[^\p{L}\d])x\s?\d+\b|\b\d+\s?x(?![\p{L}\d])|gagne[rz]?\s+(jusqu|\d|des heures)|\d+\s*(heures|h)\s+(gagn|économis)|économise[rz]?\s+\d/iu
const TEMOIGNAGE = /<img\b|<blockquote\b|<q\b|<cite\b|témoign|\blogos?\b/i
const DRAPEAU_BAISSE = /WhatsApp|\bSMS\b|multi-membres|mode privé|accueil téléphonique/i
const CREUX = /révolutionn|booster|clé en main|solution innovante/i
const EUROPE_FAUX = /(rien|aucune donnée|tout)\s+(ne\s+)?(sort|quitte|reste)[^.]{0,40}Europe|100\s?%\s+(en\s+)?Europe/i

/** Retourne la liste des échecs pour un état donné des sources. */
function juger({ pages, composant, plans, ent, contact, formulaire, lanceur }) {
  const e = []
  // — 036-023 : la carte, sur les deux pages —
  for (const [f, s] of Object.entries(pages)) {
    if (!/<OffreEntreprise\b/.test(s)) e.push(`${f} ne rend pas <OffreEntreprise /> (carte absente)`)
    if (!/import OffreEntreprise from '@\/app\/OffreEntreprise'/.test(s)) e.push(`${f} n'importe pas OffreEntreprise`)
  }
  const c = sansCommentaires(composant)
  if (/\d\s?(€|euros?|EUR)|€\s?\d/i.test(c)) e.push('un prix est écrit en dur dans la carte')
  if (/\bprix\w*\s*[:=]\s*\d/.test(c) || /\bprixMois\b/.test(c)) e.push('la carte lit ou écrit un prix')
  if (!/href=\{?["'`]?|LIEN/.test(c)) e.push('aucun lien dans la carte')
  const liens = [...c.matchAll(/(?:const (?:LIEN|PAGE)\s*=\s*|href=)['"]([^'"]+)['"]/g)].map((m) => m[1])
  if (!liens.includes('/contact?motif=entreprise')) e.push(`le lien ne mène pas à /contact?motif=entreprise (lu : ${liens.join(', ') || 'aucun'})`)
  if (!/LIEN\}/.test(c) && !/href="\/contact\?motif=entreprise"/.test(c)) e.push('le bouton n\'utilise pas le lien')
  if (!/Parler à l[’']équipe/.test(c)) e.push('bouton « Parler à l’équipe » absent')
  if (!/PLANS\.entreprise/.test(c) || !/\{p\.accroche\}/.test(c) || !/\{p\.label\}/.test(c)) e.push("titre/accroche ne viennent pas de PLANS.entreprise")
  const accroche = plans.match(/entreprise:\s*\{[^}]*accroche:\s*'([^']+)'/)?.[1]
  if (!accroche) e.push("PLANS.entreprise.accroche introuvable dans lib/plans.ts")
  else if (c.includes(accroche.slice(0, 25))) e.push("l'accroche est recopiée en dur dans la carte")
  if (!/surDevis:\s*true/.test(plans.match(/entreprise:\s*\{[^}]*\}/)?.[0] ?? '')) e.push('PLANS.entreprise n\'est pas surDevis')
  const nb = (c.match(/BENEFICES = \[([^\]]*)\]/)?.[1].match(/'[^']+'/g) ?? []).length
  if (nb < 1 || nb > 3) e.push(`${nb} bénéfices (1 à 3 attendus, variante abo)`)
  if (/\b\d+\s?%|témoignage|logo/i.test(c)) e.push('chiffre de gain, témoignage ou logo inventé')
  if (/Presti/.test(c.replace(/PLANS\.entreprise/g, ''))) e.push('le mot « Presti » est écrit dans la carte (il vient de PLANS)')

  // — 036-026 : la carte enrichie —
  const points = (c.match(/POINTS = \[([\s\S]*?)\n\]/)?.[1].match(/'[^']+'/g) ?? []).length
  if (points < 5 || points > 6) e.push(`la carte porte ${points} points (5 ou 6 attendus) : carte non enrichie`)
  const tempsCarte = c.match(/TEMPS = \[([^\]]*)\]/)?.[1] ?? ''
  for (const t of TEMPS) if (!tempsCarte.includes(`'${t}'`)) e.push(`la carte n'a pas le temps « ${t} »`)
  if (!liens.includes('/entreprise') || !/href=\{PAGE\}/.test(c)) e.push('la carte ne mène pas à /entreprise (lien « Tout savoir »)')
  if ((c.match(/href=\{PAGE\}/g) ?? []).length < 2) e.push('la variante abo n\'a pas le lien vers /entreprise')
  if (DEMO.test(c)) e.push('« démo » dans un texte de la carte')

  // — 036-026 : la page /entreprise —
  const p = sansCommentaires(ent)
  if (!ent) e.push('page /entreprise absente (app/entreprise/page.tsx)')
  else {
    if (!/alternates:\s*\{\s*canonical:\s*'\/entreprise'\s*\}/.test(p)) e.push('la page /entreprise n\'a pas son canonique')
    if (!/title:\s*'[^']+'/.test(p) || !/description:\s*\n?\s*'[^']+'/.test(p)) e.push('la page /entreprise n\'a pas de titre ou de description')
    if (!/<PublicNav\b/.test(p) || !/<PublicPied\b/.test(p)) e.push('la page /entreprise n\'a pas la barre et le pied publics')
    for (const t of TEMPS) if (!p.includes(`titre: '${t}'`)) e.push(`la page n'a pas le temps « ${t} »`)
    for (const a of APPLICATIONS) if (!p.includes(`nom: '${a}'`)) e.push(`la page n'a pas l'application « ${a} »`)
    const blocOutils = p.match(/const OUTILS[\s\S]*?\n\]/)?.[0] ?? ''
    const noms = [...blocOutils.matchAll(/noms:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))
    const horsListe = noms.filter((n) => !OUTILLES.includes(n))
    if (horsListe.length) e.push(`outil hors de la liste outillée : ${horsListe.join(', ')}`)
    if (noms.filter((n) => OUTILLES.includes(n)).length < 6) e.push(`moins de six outils nommés (${noms.length})`)
    if (!/const LIEN = '\/contact\?motif=entreprise'/.test(p) || (p.match(/href=\{LIEN\}/g) ?? []).length < 2) e.push('le bouton de la page ne mène pas à /contact?motif=entreprise (en-tête et bandeau)')
    if (!/Parler à l[’']équipe/.test(p)) e.push('bouton « Parler à l’équipe » absent de la page')
    if (!/Francfort/.test(p) || !/ne sont pas tous en Europe/.test(p)) e.push('les données en Europe ne sont pas dites (Francfort, et les modèles d’IA pas tous en Europe)')
    if (EUROPE_FAUX.test(p)) e.push('la page dit que rien ne sort d’Europe')
  }

  // — 036-026 : le contact —
  const ct = sansCommentaires(contact), fo = sansCommentaires(formulaire)
  if (!/searchParams/.test(ct) || !/motif === 'entreprise'/.test(ct)) e.push('le contact ne lit pas motif=entreprise')
  if (!/Parlons de votre/.test(ct)) e.push('le contact n\'a pas le titre « Parlons de votre entreprise »')
  if (!/motif=\{entreprise \? 'entreprise' : undefined\}/.test(ct)) e.push('le contact ne passe pas le motif au formulaire')
  const qs = (fo.match(/const QUESTIONS_ENTREPRISE = \[([\s\S]*?)\]/)?.[1].match(/'[^']+'/g) ?? []).map((q) => q.slice(1, -1))
  for (const q of QUESTIONS) if (!qs.some((x) => x.startsWith(q))) e.push(`le message prérempli n'a pas la question « ${q} »`)
  const prerempli = qs.map((q) => `${q}\n`).join('\n').trim()
  if (prerempli.length < 10 || prerempli.length > 4000) e.push(`le message prérempli sort des limites de l'API (${prerempli.length} caractères, 10 à 4 000)`)
  if (!/JSON\.stringify\(\{ nom, email, message, societe \}\)/.test(fo)) e.push('le corps envoyé à l’API a changé')

  // — 036-026 : les interdits, sur la page, la carte et le contact —
  const textes = { [PAGE_ENT]: p, [COMPOSANT]: c, [CONTACT]: ct, [FORMULAIRE]: fo }
  for (const [f, s] of Object.entries(textes)) {
    if (PRIX.test(s)) e.push(`${f} : un prix est écrit`)
    if (DEMO.test(s)) e.push(`${f} : « démo » dans un texte visible`)
    if (GAIN.test(s)) e.push(`${f} : un chiffre de gain`)
    if (TEMOIGNAGE.test(s)) e.push(`${f} : un témoignage ou un logo`)
    if (DRAPEAU_BAISSE.test(s)) e.push(`${f} : une fonction derrière un drapeau baissé (WhatsApp, SMS, multi-membres, mode privé…)`)
    if (CREUX.test(s)) e.push(`${f} : un mot creux`)
  }

  // — le lanceur —
  const inscrit = (lanceur.match(new RegExp(`args:\\s*\\['${MOI.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}'\\]`, 'g')) ?? []).length
  if (inscrit !== 1) e.push(`le juge est inscrit ${inscrit} fois dans SUITES de ${LANCEUR} (1 attendu)`)
  return e
}

const reel = {
  pages: Object.fromEntries(PAGES.map((f) => [f, lire(f)])), composant: lire(COMPOSANT), plans: lire('lib/plans.ts'),
  ent: lire(PAGE_ENT), contact: lire(CONTACT).replace(/\r\n/g, '\n'), formulaire: lire(FORMULAIRE).replace(/\r\n/g, '\n'), lanceur: lire(LANCEUR),
}
let n = 0, vus = 0; const echecs = []
const ok = (cond, msg) => { n++; if (!cond) echecs.push(msg) }

const base = juger(reel)
ok(base.length === 0, `état réel : ${base.join(' | ')}`)

/** Un mutant : il doit changer la source ET être vu par le motif attendu. */
function mutant(nom, champ, muter, motif) {
  const avant = champ.includes('.') ? reel[champ.split('.')[0]][champ.split('.').slice(1).join('.')] : reel[champ]
  const apres = muter(avant)
  if (apres === avant) { ok(false, `mutant « ${nom} » inopérant (la source n'a pas changé)`); return }
  const etat = champ.includes('.')
    ? { ...reel, [champ.split('.')[0]]: { ...reel[champ.split('.')[0]], [champ.split('.').slice(1).join('.')]: apres } }
    : { ...reel, [champ]: apres }
  const vu = juger(etat).some((x) => motif.test(x))
  ok(vu, `mutant « ${nom} » non vu`)
  if (vu) vus++
}

// Mutants de 036-023
mutant('carte retirée', 'pages.app/abonnement/page.tsx', (s) => s.replace(/<OffreEntreprise[^>]*\/>/, ''), /carte absente/)
mutant('prix écrit', 'composant', (s) => s.replace('Sur devis, après', 'À partir de 199 €, après'), /prix/)
mutant('lien cassé', 'composant', (s) => s.replace("'/contact?motif=entreprise'", "'/contakt'"), /lien/)
mutant('accroche en dur', 'composant', (s) => s.replaceAll('{p.accroche}', 'Sur mesure pour vous'), /accroche/)
// Mutants de 036-026 : un par contrôle ajouté
mutant('carte non enrichie', 'composant', (s) => s.replace(/const POINTS = \[[\s\S]*?\n\]/, "const POINTS = ['Un', 'Deux', 'Trois']"), /carte non enrichie/)
mutant('un temps manque à la carte', 'composant', (s) => s.replace("'Suivi mensuel']", "'Suivi']"), /la carte n'a pas le temps/)
mutant('carte sans lien vers /entreprise', 'composant', (s) => s.replace("const PAGE = '/entreprise'", "const PAGE = '/entreprize'"), /ne mène pas à \/entreprise/)
mutant('abo sans lien vers /entreprise', 'composant', (s) => s.replace(/<a href=\{PAGE\} data-entreprise-page style[^\n]*\n/, '\n'), /variante abo/)
mutant('page absente', 'ent', () => '', /page \/entreprise absente/)
mutant('canonique retiré', 'ent', (s) => s.replace("alternates: { canonical: '/entreprise' },", ''), /canonique/)
mutant('un temps manque à la page', 'ent', (s) => s.replace("titre: 'Mise en service'", "titre: 'Démarrage'"), /la page n'a pas le temps/)
mutant('une application manque', 'ent', (s) => s.replace("nom: 'App de terrain'", "nom: 'Appli'"), /application « App de terrain »/)
mutant('outil inventé', 'ent', (s) => s.replace("noms: ['Slack',", "noms: ['WaveSpeed', 'Slack',"), /hors de la liste outillée/)
mutant('moins de six outils', 'ent', (s) => s.replace(/const OUTILS[\s\S]*?\n\]/, "const OUTILS: { groupe: string; noms: string[] }[] = [\n  { groupe: 'Messagerie', noms: ['Gmail', 'Slack'] },\n]"), /moins de six outils/)
mutant('bouton cassé sur la page', 'ent', (s) => s.replace("const LIEN = '/contact?motif=entreprise'", "const LIEN = '/contact'"), /bouton de la page/)
mutant('prix sur la page', 'ent', (s) => s.replace('Sur devis, aucun prix public', 'À partir de 490 € par mois'), /un prix est écrit/)
mutant('« démo » sur la page', 'ent', (s) => s.replace('>Comment ça se passe</a>', '>Demander une démo</a>'), /démo/)
mutant('chiffre de gain', 'ent', (s) => s.replace('Base de données à Francfort</li>', 'Base de données à Francfort</li><li>Gagnez 10 heures par semaine</li>'), /chiffre de gain/)
mutant('pourcentage de gain', 'ent', (s) => s.replace('Même autonomie que Signature', '30 % de temps en moins'), /chiffre de gain/)
mutant('témoignage', 'ent', (s) => s.replace('</main>', '<blockquote>« Formidable » — Jean, plombier</blockquote></main>'), /témoignage/)
mutant('logo', 'ent', (s) => s.replace('</main>', '<img src="/logos/client.svg" alt="" /></main>'), /témoignage ou un logo/)
mutant('fonction derrière un drapeau baissé', 'ent', (s) => s.replace("noms: ['Gmail',", "noms: ['WhatsApp', 'Gmail',"), /drapeau baissé|hors de la liste/)
mutant('mot creux', 'ent', (s) => s.replace('construite pour votre entreprise.', 'une solution innovante clé en main.'), /mot creux/)
mutant('« rien ne sort d’Europe »', 'ent', (s) => s.replace('Les modèles d’IA, eux, ne sont pas tous en Europe', 'Rien ne sort d’Europe'), /Europe/)
mutant('contact sourd au motif', 'contact', (s) => s.replace("const entreprise = motif === 'entreprise'", 'const entreprise = false'), /ne lit pas motif=entreprise/)
mutant('question manquante', 'formulaire', (s) => s.replace("  'Combien vous êtes :',\n", ''), /question « Combien vous êtes »/)
mutant('corps de l’API changé', 'formulaire', (s) => s.replace('JSON.stringify({ nom, email, message, societe })', 'JSON.stringify({ nom, email, message, societe, motif })'), /corps envoyé/)
mutant('« démo » au contact', 'contact', (s) => s.replace('Parlons de votre <span>entreprise</span>', 'Demandez votre <span>démo</span>'), /démo|Parlons de votre/)
mutant('juge retiré du lanceur', 'lanceur', (s) => s.replace(`args: ['${MOI}']`, "args: ['scripts/autre.mjs']"), /inscrit 0 fois/)

// Avertissement, hors de ce périmètre : l'accroche de lib/plans.ts dit encore « Sur démonstration » (correction prévue par
// plans/011-cadrage-01-11/p6-entreprise/premiere-reponse.md § 4.2 ; lib/ est interdit à cette tâche).
const accrochePlans = reel.plans.match(/entreprise:\s*\{[^}]*accroche:\s*'([^']+)'/)?.[1] ?? ''
if (/démonstration/i.test(accrochePlans)) console.warn(`avertissement : PLANS.entreprise.accroche contient « démonstration » (lib/plans.ts) — à corriger hors de ce juge : « ${accrochePlans} »`)

if (echecs.length) { console.error(`ÉCHEC (${echecs.length}/${n}) :\n- ${echecs.join('\n- ')}`); process.exit(1) }
console.log(`OK : ${n} contrôles, carte présente sur ${PAGES.length} pages, page /entreprise et contact jugés, ${vus} mutants vus`)
