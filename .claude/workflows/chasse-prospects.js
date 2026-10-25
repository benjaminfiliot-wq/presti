export const meta = {
  name: 'chasse-prospects',
  description: 'Chasse en boucle les petits artisans qui ont besoin de Presti sur toutes les sources, vérifie, rédige, jusqu\'à épuisement',
  whenToUse: 'Prospection Presti récurrente : trouver des artisans qui se plaignent, cherchent de l\'aide ou un outil, ou montrent un signal (avis « devis jamais reçu », recrutement de secrétaire, « débordé »)',
  phases: [
    { title: 'Chercher', detail: 'une recherche par source, en parallèle' },
    { title: 'Vérifier', detail: 'chaque piste neuve vérifiée par un sceptique' },
    { title: 'Rédiger', detail: 'premier message par prospect retenu' },
    { title: 'Ranger', detail: 'fichier du jour et compte rendu' },
  ],
}

// args : { date: 'AAAA-MM-JJ', tours_max?: number }
const DATE = (args && args.date) || 'sans-date'
const TOURS_MAX = (args && args.tours_max) || 4
const DOSSIER = 'C:/Users/benja/Documents/presti-ops/agents-prospection/file'

const COMMUN = `Tu travailles pour Presti (prestiapp.fr), le logiciel d'AUTOMATISATION de Benjamin Filiot (Marans, 17) pour artisans du bâtiment : les demandes de devis reçoivent une réponse en moins d'une minute à son nom, le devis est chiffré avec ses prix, les relances de devis et d'impayés sont faites. Deux offres : Studio (tout est préparé automatiquement, l'artisan valide d'un clic) et Signature (tout part automatiquement). Essai gratuit sans carte, démo de 10 minutes.
AVANT TOUT, le cerveau Obsidian : mcp__cerveau__regles_pour (« prospection », « réseaux ») puis mcp__cerveau__chercher / mcp__cerveau__lire (« signaux », « avis », « prospects ») — applique ce que tu y lis.
CIBLE : PETITS artisans (seuls ou 1 à 10 personnes ; plombier, électricien, chauffagiste/PAC, menuisier, couvreur, maçon, peintre, carreleur, plaquiste, multiservices), priorité Charente-Maritime, Vendée, Deux-Sèvres, Charente, puis toute la France. Pas de groupe, de franchise, de chaîne, ni d'entreprise de plus de 20 salariés.
RÈGLES ABSOLUES : lecture seule (aucun post, commentaire, like, message, groupe rejoint, compte créé, connexion à un compte personnel de Benjamin) ; ne contourne aucun CAPTCHA ni mur de connexion (passe à une autre voie) ; aucun numéro de téléphone relevé ; un contact n'est retenu que s'il est publié par l'entreprise elle-même (site, mentions légales, annuaire pro, fiche Google de l'entreprise) ; n'invente rien : chaque signal = une URL réellement ouverte + la date lue.
DÉDOUBLONNAGE : exclure tout ce qui est dans C:/Users/benja/Documents/presti-ops/prospection/ENVOIS.csv, OPPOSITIONS.csv et ${DOSSIER}/candidats-*.json.`

const SOURCES = [
  { cle: 'avis-google', chrome: false, p: 'Avis Google Maps et PagesJaunes RÉCENTS (moins de 3 mois) où un client écrit « jamais eu de réponse à ma demande de devis », « devis jamais reçu », « injoignable », « ne rappelle pas », « relancé plusieurs fois » sur un petit artisan. Méthode : WebSearch (requêtes métier + ville + ces expressions), WebFetch des fiches PagesJaunes et des pages d\'avis accessibles.' },
  { cle: 'facebook', chrome: true, p: 'Facebook, avec la session ouverte qui est la Page Presti (vérifie-le d\'abord ; si c\'est un autre compte, n\'y fais rien) : recherche de posts et de pages en lecture seule — pages d\'artisans qui écrivent « beaucoup de demandes, merci de votre patience pour les devis », « agenda complet », « on recrute une secrétaire », « désolé si on ne répond pas à tous » ; posts dans des groupes PUBLICS d\'artisans « débordé par les devis », « quel logiciel de devis ». Navigateur Claude in Chrome (outils mcp__claude-in-chrome__*, chargés via ToolSearch en une seule requête) : crée TON onglet, revérifie son URL avant chaque action (d\'autres agents peuvent utiliser Chrome), ferme-le à la fin. Ne lis ni Messenger ni les notifications.' },
  { cle: 'reddit', chrome: false, p: 'Reddit via les flux RSS publics (reddit.com refuse les outils ; une requête toutes les ~20 s) : r/AutoentrepreneurFR, r/EntreprendreenFrance, r/france, r/vosfinances, r/renovation et la recherche globale (https://www.reddit.com/search.rss?q=...&sort=new) sur « devis artisan », « logiciel de devis », « débordé administratif », « relance impayé artisan ». Garde les artisans qui parlent de leur propre entreprise.' },
  { cle: 'linkedin-web', chrome: false, p: 'LinkedIn (posts publics seulement, via WebSearch site:linkedin.com/posts et site:fr.linkedin.com/posts ; aucune connexion) et le web ouvert : forums bâtiment (forum-construction, forums de métiers), Indie Hackers FR, X/Twitter et Threads publics, avec « artisan » + « devis » + « soir », « recherche secrétaire bâtiment », « auto-entrepreneur plombier administratif ».' },
  { cle: 'recrutements', chrome: false, p: 'Offres d\'emploi RÉCENTES (moins de 15 jours) de PETITES entreprises du bâtiment qui recrutent une secrétaire, une assistante administrative ou un(e) chargé(e) de devis : France Travail (candidat.francetravail.fr), HelloWork, Indeed si accessible. Confirme l\'entreprise et son effectif sur recherche-entreprises.api.gouv.fr.' },
  { cle: 'insta-tiktok', chrome: false, p: 'Comptes Instagram et TikTok PUBLICS de petits artisans (sans connexion ; WebSearch site:instagram.com / site:tiktok.com + métier + ville, puis WebFetch) qui montrent un signal : « devis sous 3 semaines », « agenda plein », « on ne répond plus aux messages », vidéos sur la paperasse le soir.' },
]

const PISTES = { type: 'object', properties: { pistes: { type: 'array', items: { type: 'object', properties: {
  entreprise: { type: 'string' }, ville: { type: 'string' }, departement: { type: 'string' }, metier: { type: 'string' },
  signal: { type: 'string' }, source_signal: { type: 'string' }, date_signal: { type: 'string' },
  contact: { type: 'string' }, source_contact: { type: 'string' }, voie: { type: 'string' },
}, required: ['entreprise', 'signal', 'source_signal'] } }, bloque: { type: 'string' } }, required: ['pistes'] }
const VERDICT = { type: 'object', properties: { retenu: { type: 'boolean' }, raison: { type: 'string' }, contact: { type: 'string' }, source_contact: { type: 'string' }, taille: { type: 'string' } }, required: ['retenu', 'raison'] }
const MESSAGE = { type: 'object', properties: { objet: { type: 'string' }, message: { type: 'string' } }, required: ['objet', 'message'] }

const cle = p => (p.entreprise || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '|' + (p.ville || '').toLowerCase().replace(/[^a-z]/g, '')
const vus = new Set()
const retenus = []
const blocages = []
let secs = 0
let tour = 0

while (secs < 2 && tour < TOURS_MAX) {
  tour++
  phase('Chercher')
  const deja = Array.from(vus).join(', ') || 'aucune'
  // Les sources Chrome passent l'une après l'autre ; les autres en parallèle.
  const trouvees = (await parallel(SOURCES.map(s => () => agent(
    `${COMMUN}\n\nTOUR ${tour}. Ta source : ${s.p}\nCherche autrement qu'aux tours précédents (autres villes, autres métiers, autres mots). Déjà vues ce cycle (à ne pas rendre) : ${deja}.\nRends jusqu'à 10 pistes neuves, chacune avec son signal sourcé et daté ; dans « bloque », dis en une phrase ce qui a bloqué.`,
    { phase: 'Chercher', label: `chercher:${s.cle}:t${tour}`, schema: PISTES })))).filter(Boolean)
  trouvees.forEach((r, i) => { if (r.bloque) blocages.push(`t${tour} ${SOURCES[i] ? SOURCES[i].cle : ''} : ${r.bloque}`) })
  const neuves = trouvees.flatMap(r => r.pistes || []).filter(p => !vus.has(cle(p)))
  neuves.forEach(p => vus.add(cle(p)))
  log(`Tour ${tour} : ${neuves.length} pistes neuves`)
  if (!neuves.length) { secs++; continue }
  secs = 0

  const ok = await pipeline(neuves,
    p => agent(`${COMMUN}\n\nTu es un VÉRIFICATEUR SCEPTIQUE. Piste : ${JSON.stringify(p)}\nOuvre source_signal et vérifie que le signal existe vraiment, qu'il est récent (moins de 3 mois, 15 jours pour une offre d'emploi), qu'il vient bien de cette entreprise ou la concerne. Confirme sur recherche-entreprises.api.gouv.fr que c'est un PETIT artisan (pas un groupe ni une franchise). Trouve ou confirme un e-mail PUBLIÉ par l'entreprise (site, mentions légales, annuaire pro) — sinon contact = « réponse publique » avec l'URL du post. Vérifie l'absence dans ENVOIS.csv, OPPOSITIONS.csv et les candidats-*.json. En cas de doute : retenu = false.`,
      { phase: 'Vérifier', label: `verifier:${(p.entreprise || '').slice(0, 24)}`, schema: VERDICT })
      .then(v => (v && v.retenu ? { ...p, contact: v.contact || p.contact, source_contact: v.source_contact || p.source_contact, taille: v.taille } : null)),
    p => p && agent(`${COMMUN}\n\nRédige le PREMIER MESSAGE pour ce prospect : ${JSON.stringify(p)}\nModèle de ton et de forme : ${DOSSIER}/a-envoyer-2026-10-22-b.json (lis-le) et C:/Users/benja/Documents/outils-ia/harvey/skills/product_knowledge.md. Structure : Bonjour (+ nom si publié) / « Je m'appelle Benjamin Filiot, je suis à mon compte à Marans. » + un fait vrai lié à son signal, avec tact (un avis négatif ne se cite jamais : parle de « quand les demandes s'accumulent pendant les chantiers ») / 2-3 phrases sur l'AUTOMATISATION : ses demandes reçoivent une réponse en moins d'une minute à son nom, le devis est préparé sur ses prix, les relances partent ; avec Studio il valide d'un clic, avec Signature tout part tout seul / « Je peux vous le montrer en 10 minutes cette semaine ? L'essai est gratuit, sans carte. » / où j'ai trouvé son adresse / « Si ce n'est pas le moment, un simple "stop" et je ne vous écris plus. » / Benjamin Filiot, Presti, à Marans, 06 30 78 16 47. 90 à 130 mots, vouvoiement, aucun prix, aucune promesse fausse. Pour une « réponse publique » (Reddit…), commence par un vrai conseil utile, puis présente Presti ouvertement comme son fondateur. Objet court, en minuscules, spécifique.`,
      { phase: 'Rédiger', label: `rediger:${(p.entreprise || '').slice(0, 24)}`, schema: MESSAGE })
      .then(m => (m ? { ...p, ...m } : null)))
  const bons = ok.filter(Boolean)
  retenus.push(...bons)
  log(`Tour ${tour} : ${bons.length} prospects retenus (total ${retenus.length})`)
}
if (tour >= TOURS_MAX && secs < 2) log(`Arrêt au tour ${TOURS_MAX} (plafond) alors que des pistes neuves arrivaient encore : la prochaine exécution planifiée reprendra.`)

phase('Ranger')
const rapport = await agent(
  `Écris le fichier JSON ${DOSSIER}/candidats-auto-${DATE}.json avec exactement ce tableau (s'il existe déjà, fusionne sans doublon par entreprise+ville) :\n${JSON.stringify(retenus)}\nPuis ajoute une ligne datée dans ${DOSSIER}/envoi-journal.log : « ${DATE} chasse-prospects : ${retenus.length} prospects retenus en ${tour} tours ; rien envoyé ». Enfin, rends un compte rendu de 8 lignes : nombre par source, les 5 meilleurs (entreprise, ville, signal, voie), et ces blocages : ${JSON.stringify(blocages)}. Ne modifie rien d'autre.`,
  { phase: 'Ranger', label: 'ranger', effort: 'low' })

return { tours: tour, retenus: retenus.length, fichier: `${DOSSIER}/candidats-auto-${DATE}.json`, rapport }
