#!/usr/bin/env node
// Publie une serie ecrite dont le calendrier, les textes et les visuels vivent
// dans un unique fichier maitre.
//
//   node scripts/publier-serie.mjs --maitre=<fichier> [--ancre=AAAA-MM-JJ] [mode]
//
//   --plan-json    imprime le plan calcule (JSON seul sur la sortie standard) ; aucun appel reseau, aucune ecriture.
//   (sans mode)    cree en BROUILLON les parutions absentes du journal ; refuse un doublon deja journalise.
//   --programmer   reprise quotidienne (automatisation de 20 h, relancee telle quelle chaque soir). Dans l'ordre du
//                  calendrier :
//                    - parution deja programmee ou publiee (lue dans Publora) : jamais recreee ;
//                    - parution PROGRAMMEE (journalisee, ou orpheline retrouvee par son texte) dont le visuel en ligne
//                      (empreinte SHA-256 du media telecharge) n'est pas celui du maitre : a plus de 3 h de son heure,
//                      le quota du mois de sa parution est verifie avant toute ecriture. Epuise : rien n'est touche,
//                      une ALERTE BENJ nomme la parution et son visuel faux. Une place disponible est reservee avant
//                      les nouvelles parutions, puis elle repasse en brouillon par update-post (relue draft) et une
//                      nouvelle parution est creee a la meme heure avec le visuel du maitre, relue scheduled ; ancien
//                      et nouvel identifiant au journal, ligne « ALERTE BENJ : visuel remplacé ».
//                      A moins de 3 h, ou si la remise en brouillon echoue : rien n'est touche, « ALERTE BENJ : visuel
//                      faux … ». Si la creation echoue apres la remise en brouillon, le journal et l'ALERTE BENJ disent
//                      que l'ancienne est en brouillon et que la nouvelle n'a pas pu etre creee. Un refus quota 403
//                      arrete les autres creations de ce lancement. Jamais de suppression ;
//                    - parution PUBLIEE au mauvais visuel : elle est publique, rien n'est touche ; « ALERTE BENJ : »
//                      une seule fois, memorisee au journal (« visuel faux signalé : `id` ») ;
//                    - parution « failed » ou « partially_published » : « ALERTE BENJ : » a chaque passage, rien n'est
//                      recree ;
//                    - parution encore « scheduled » (ou pending, processing) plus de 15 min apres son heure : elle n'est
//                      pas partie ; « ALERTE BENJ : » a chaque passage, rien n'est modifie ni recree ;
//                    - parution journalisee illisible : introuvable (HTTP 404 ET absente de list-posts, donc supprimee
//                      dans Publora) → « ALERTE BENJ : » une seule fois, memorisee au journal (« parution introuvable
//                      signalée : `id` »), rien n'est recree ; toute autre lecture en echec (5xx, 403, 404 d'une parution
//                      encore listee) → « ALERTE BENJ : » a chaque passage, rien n'est fait pour elle ce soir-la ;
//                    - creneau passe sans parution : « ALERTE BENJ : » une seule fois, memorisee au journal (« créneau
//                      passé signalé : `pub-NN V canal heure` ») ; les passages suivants ne l'impriment plus qu'en ATTENTION ;
//                    - brouillon journalise, ou parution absente du journal, dont l'heure tombe dans l'horizon Publora
//                      (7 jours) : programmee, tant que le COMPTE entier a moins de 3 parutions programmees
//                      (comptees par GET /list-posts) ;
//                    - brouillon dont le visuel ne convient pas (pas exactement le visuel du maitre ; Instagram : un
//                      JPEG entre 4:5 et 1,91:1) : NOUVELLE parution avec le visuel du maitre. L'ancien brouillon est
//                      laisse et journalise comme remplace : update-post n'ajoute des medias qu'en plus des anciens, et
//                      retirer un media est une suppression (DELETE /media/:id), refusee ici ;
//                    - publication marquee « PROGRAMMATION BLOQUÉE » dans le maitre : jamais programmee.
//                  Le quota mensuel Publora compte les entrees de plateforme publiees ou en cours du mois civil
//                  a Paris, avant toute programmation. PUBLORA_QUOTA_MENSUEL fixe le plafond (entier positif,
//                  15 par defaut). Un quota epuise alerte pour chaque parution arretee ; un quota insuffisant
//                  est signale une fois par mois (marque « quota insuffisant signalé : AAAA-MM » au journal).
//                  Un remplacement reserve une entree du mois de la parution, prioritaire sur les nouvelles.
//                  Hypothese prudente : une programmee remise en brouillon garde son unite ; la recreer en consomme
//                  une autre. Mois civil a Paris, a confirmer au 1er octobre (Publora ne le documente pas).
//                  Chaque changement confirme est ecrit au journal par le script lui-meme.
//
// Codes de sortie : 0 = rien a faire ou tout va bien ; 1 = erreur (dont un second lancement simultane) ; 3 = au moins
// une ligne commencant par « ALERTE BENJ : » a transmettre (creneau manque, visuel faux ou remplace, parution en echec,
// pas partie a son heure, introuvable ou illisible dans Publora, quota epuise ou insuffisant). Une marque au journal n'est ecrite qu'a la fin du
// lancement : s'il s'arrete en code 1 avant, l'alerte revient au passage suivant.
//   --essai        affiche ce qui serait fait : seulement des lectures (GET), aucun appel en ecriture, aucun fichier.
//                  Un remplacement de visuel y est annonce par « SERAIT REMPLACÉE · … ».
//
//   Autres options : --une-seule, --sauf=NN,NN, --passe-maintenant (un creneau passe part tout de suite au lieu
//   d'etre signale), --journal=<fichier> (defaut plans/journal-publications.md), --maintenant=<ISO> (avec --essai
//   seulement : l'horloge du juge).
//
// Cles PUBLORA_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL et PUBLORA_QUOTA_MENSUEL : l'environnement du processus d'abord,
// sinon le fichier .env.local a la racine du depot (KEY=VALUE, guillemets et commentaires admis). Aucune valeur n'est
// jamais imprimee.
//
// Verrou : hors --essai et --plan-json, un seul lancement ecrit a la fois (fichier <journal>.lock). Un second lancement
// s'arrete en code 1 sans rien lire ni ecrire ; un verrou abandonne (processus mort, ou pose depuis plus de 2 h) est repris.
//
// L'ancre (lundi de la semaine 1) vient de --ancre, sinon du chapitre Calendrier du maitre (« --ancre=AAAA-MM-JJ »),
// sinon des parutions deja programmees au journal. En --programmer, une ancre du maitre que le journal contredit
// arrete tout plutot que de programmer un calendrier decale.
//
// Documentation Publora suivie (docs.publora.com, lue le 16/09/2026) : POST /create-post (sans scheduledTime =
// brouillon), PUT /update-post/:postGroupId (status "draft" ou "scheduled" dans les deux sens, l'heure est gardee en
// brouillon ; scheduledTime, content ; mediaUrls en ajout seulement), GET /get-post/:postGroupId, GET /list-posts
// (page, limit <= 100), GET /platform-connections, en-tete Idempotency-Key.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const RACINE = path.resolve(import.meta.dirname, '..')
const PUBLICATIONS = path.join(RACINE, 'publications')
const CARTE = path.join(PUBLICATIONS, 'serie-2', 'medias-en-ligne.json')
const ENV_LOCAL = path.join(RACINE, '.env.local')
const CLES_ENVIRONNEMENT = ['PUBLORA_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'PUBLORA_QUOTA_MENSUEL']
const BASE_PUBLORA = 'https://api.publora.com/api/v1'
const BUCKET = 'promo'
const QUOTA_MO = 1024
const MARGE_MO = 400
const PLAFOND_PROGRAMMEES = 3 // Publora Starter : trois parutions programmees a la fois
const PLAFOND_MENSUEL_DEFAUT = 15 // entrees de plateforme par mois civil, pour tout l'espace de travail
const STATUTS_QUOTA = new Set(['published', 'scheduled', 'pending', 'processing'])
const HORIZON_MS = 7 * 24 * 3_600_000 // Publora Starter : sept jours d'avance au plus
const MARGE_HORIZON_MS = 30 * 60_000 // on reste une demi-heure en deca de la limite
const DELAI_MINIMUM_MS = 5 * 60_000 // un creneau a moins de cinq minutes est traite comme passe
const DELAI_REMPLACEMENT_MS = 3 * 3_600_000 // a moins de 3 h de sa parution, une parution programmee n'est plus touchee
const DELAI_RETARD_MS = 15 * 60_000 // encore programmee 15 min apres son heure : elle n'est pas partie
const VERROU_PERIME_MS = 2 * 3_600_000 // un lancement dure quelques minutes : un verrou de plus de 2 h est abandonne
const STATUTS_OCCUPANTS = new Set(['scheduled', 'pending', 'processing'])
const STATUTS_PARTIS = new Set(['published', 'partially_published'])
const STATUTS_EN_ECHEC = new Set(['failed', 'partially_published'])
const RATIO_INSTAGRAM = [0.8, 1.91]
const TYPES_IMAGE = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const argumentsLigne = process.argv.slice(2)
const option = (nom) => {
  const avecEgal = argumentsLigne.find((argument) => argument.startsWith(`${nom}=`))
  if (avecEgal) return avecEgal.slice(nom.length + 1)
  const position = argumentsLigne.indexOf(nom)
  return position >= 0 ? argumentsLigne[position + 1] || '' : ''
}
const present = (nom) => argumentsLigne.includes(nom)
const PLAN_JSON = present('--plan-json')
const PROGRAMMER = present('--programmer')
const UNE_SEULE = present('--une-seule')
const PASSE_MAINTENANT = present('--passe-maintenant')
const ESSAI = present('--essai')

const informer = (...elements) => console.error(...elements)
const dire = (...elements) => console.log(...elements)
const arreter = (message) => { throw new Error(message) }
let alerteBenj = false
const alerterBenj = (message) => {
  alerteBenj = true
  dire(`ALERTE BENJ : ${message}`)
}

const cheminMaitreBrut = option('--maitre')
if (!cheminMaitreBrut) {
  informer('Usage : node scripts/publier-serie.mjs --maitre=<fichier> [--ancre=AAAA-MM-JJ] [--plan-json|--programmer] [--essai]')
  process.exit(1)
}
const CHEMIN_MAITRE = path.isAbsolute(cheminMaitreBrut)
  ? cheminMaitreBrut
  : path.resolve(RACINE, cheminMaitreBrut)
const JOURNAL = path.resolve(RACINE, option('--journal') || path.join('plans', 'journal-publications.md'))
const VERROU = `${JOURNAL}.lock`

const maintenantBrut = option('--maintenant')
if (maintenantBrut && !ESSAI) {
  informer('--maintenant n’est accepte qu’avec --essai')
  process.exit(1)
}
const MAINTENANT_MS = maintenantBrut ? Date.parse(maintenantBrut) : Date.now()
if (Number.isNaN(MAINTENANT_MS)) {
  informer(`--maintenant illisible : ${maintenantBrut}`)
  process.exit(1)
}

const normaliserNumero = (numero) => String(Number(numero)).padStart(2, '0')
const numerosSauf = new Set(option('--sauf').split(',').map((numero) => numero.trim()).filter(Boolean).map(normaliserNumero))
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const sha256 = (octets) => crypto.createHash('sha256').update(octets).digest('hex')
const normaliserTexte = (texte) => String(texte || '').normalize('NFC').replace(/\r/g, '').trim()
const masquer = (url) => String(url).replace(/^https:\/\/[^/]+\.supabase\.co/, 'https://<supabase>')

const prochainLundi = () => {
  const maintenant = new Date()
  const dateParis = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(maintenant)
  const date = new Date(`${dateParis}T00:00:00Z`)
  const jourLundiZero = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() + (7 - jourLundiZero))
  return date.toISOString().slice(0, 10)
}

// Convertit explicitement une heure murale de Paris en UTC. L'offset est lu a
// midi le meme jour, ce qui couvre automatiquement heure d'ete et heure d'hiver.
const heureParisEnUtc = (jourIso, heure, minute) => {
  const midi = new Date(`${jourIso}T12:00:00Z`)
  const heureParisMidi = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23',
  }).format(midi))
  return new Date(
    Date.parse(`${jourIso}T${String(heure).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`)
      - (heureParisMidi - 12) * 3_600_000,
  ).toISOString()
}

const partiesParis = (instant) => {
  const parties = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant)).map((partie) => [partie.type, partie.value]))
  return { jour: `${parties.year}-${parties.month}-${parties.day}`, heure: Number(parties.hour), minute: Number(parties.minute) }
}
const lisibleParis = (instant) => (instant
  ? new Date(instant).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : 'sans heure')

const moisParis = (instant) => {
  const heure = typeof instant === 'number' ? instant : Date.parse(instant)
  return Number.isNaN(heure) ? null : partiesParis(heure).jour.slice(0, 7)
}
const plafondMensuel = (valeur) => {
  const texte = String(valeur || '').trim()
  const nombre = /^\d+$/.test(texte) ? Number(texte) : 0
  return Number.isSafeInteger(nombre) && nombre > 0 ? nombre : PLAFOND_MENSUEL_DEFAUT
}
// Une parution multicanal consomme une unite par plateforme, selon son propre statut.
// Hypothese non documentee par Publora : le quota suit le mois civil a Paris.
const entreesDuMois = (groupes, mois) => groupes.reduce((total, groupe) => total + (groupe.platforms || [])
  .filter((plateforme) => STATUTS_QUOTA.has(plateforme?.status)
    && moisParis(plateforme?.scheduledTime || groupe.scheduledTime || plateforme?.publishedAt || groupe.publishedAt || plateforme?.createdAt || groupe.createdAt) === mois)
  .length, 0)

// ─── Le fichier maitre ──────────────────────────────────────────────────────────────────────────────────

const blocPublication = (maitre, numero) => {
  const entete = new RegExp(`^#\\s+Publication\\s+n[°o]\\s*${Number(numero)}\\b.*$`, 'mi').exec(maitre)
  if (!entete) return null
  const reste = maitre.slice(entete.index + entete[0].length)
  const prochain = reste.search(/^#\s/m)
  return prochain < 0 ? reste : reste.slice(0, prochain)
}

const partieVariante = (bloc, variante) => {
  const parties = bloc.split(new RegExp(`^##\\s+Variante ${variante}\\b.*$`, 'mi'))
  if (parties.length < 2) return null
  return parties[1].split(/^##\s/m)[0]
}

const texteVariante = (bloc, variante) => {
  const partie = partieVariante(bloc, variante)
  if (partie == null) return null
  return partie.split(/\r?\n/)
    .filter((ligne) => /^>\s?/.test(ligne))
    .map((ligne) => ligne.replace(/^>\s?/, ''))
    .join('\n').trim()
}

const visuelVarianteB = (bloc) => {
  const partie = partieVariante(bloc, 'B') || ''
  const trouve = /^\s*Visuel\s*:\s*`?([^`\n]+?)`?\s*$/im.exec(partie)
  return trouve ? trouve[1].trim() : null
}

// « PROGRAMMATION BLOQUÉE » dans le bloc d'une publication : elle reste au plan, mais --programmer ne la programme
// jamais. C'est une decision humaine (licence, relecture) que seul le retrait de la ligne leve.
const raisonBlocage = (bloc) => {
  const ligne = bloc.split(/\r?\n/).find((texte) => /PROGRAMMATION BLOQU[ÉE]E/.test(texte))
  if (!ligne) return null
  const enGras = /\*\*(PROGRAMMATION BLOQU[ÉE]E[^*]*)\*\*/.exec(ligne)
  return (enGras ? enGras[1] : ligne.replace(/^>\s*/, '').replace(/[*⛔]/g, '')).replace(/\s+/g, ' ').trim()
}

const chapitreCalendrier = (maitre) => {
  const lignes = maitre.split(/\r?\n/)
  const debut = lignes.findIndex((ligne) => /^#\s+Calendrier\b/i.test(ligne))
  if (debut < 0) arreter('Aucun chapitre Calendrier dans le fichier maitre')
  const fin = lignes.findIndex((ligne, index) => index > debut && /^#\s/.test(ligne))
  return lignes.slice(debut + 1, fin < 0 ? lignes.length : fin)
}

const lireCalendrier = (maitre) => {
  const rangees = []
  for (const ligne of chapitreCalendrier(maitre)) {
    const colonnes = ligne.split('|').map((colonne) => colonne.trim())
    if (colonnes.length < 6 || !/^\d+$/.test(colonnes[1] || '')) continue
    const numeroTrouve = (colonnes[4].match(/\d+/) || [])[0]
    const indexJour = JOURS.indexOf((colonnes[2] || '').toLowerCase())
    const heureTrouvee = /(\d{1,2})\s*h\s*(\d{1,2})?/.exec(colonnes[3] || '')
    if (!numeroTrouve || indexJour < 0 || !heureTrouvee) arreter(`Ligne de calendrier illisible : ${ligne}`)
    rangees.push({
      semaine: Number(colonnes[1]),
      indexJour,
      heure: Number(heureTrouvee[1]),
      minute: Number(heureTrouvee[2] || 0),
      num: normaliserNumero(numeroTrouve),
      variante: /variante\s+B|\bvar\b/i.test(colonnes[4]) ? 'B' : 'A',
      canal: colonnes[5].toLowerCase(),
    })
  }
  return rangees
}

const construirePlan = (maitre, calendrier, ancre) => {
  const plan = []
  for (const rangee of calendrier) {
    if (numerosSauf.has(rangee.num)) continue
    const bloc = blocPublication(maitre, rangee.num)
    if (!bloc) arreter(`Publication n° ${rangee.num} introuvable dans le fichier maitre`)
    if (/EN ATTENTE/i.test(bloc)) continue

    const texte = texteVariante(bloc, rangee.variante)
    const media = visuelVarianteB(bloc)
    if (!texte) arreter(`Texte de la variante ${rangee.variante} vide pour la publication n° ${rangee.num}`)
    if (!media) arreter(`Ligne Visuel de la variante B absente pour la publication n° ${rangee.num}`)

    const date = new Date(`${ancre}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + (rangee.semaine - 1) * 7 + rangee.indexJour)
    const entree = {
      num: rangee.num,
      variante: rangee.variante,
      canal: rangee.canal,
      quand: heureParisEnUtc(date.toISOString().slice(0, 10), rangee.heure, rangee.minute),
      texte,
      media,
    }
    const blocage = raisonBlocage(bloc)
    if (blocage) entree.bloque = blocage
    plan.push(entree)
  }
  if (!plan.length) arreter('Le calendrier ne contient aucune publication disponible')
  for (const entree of plan) {
    if (!['facebook', 'instagram'].includes(entree.canal)) arreter(`Canal non autorise pour cette serie : ${entree.canal}`)
  }
  return plan
}

// ─── Le journal ─────────────────────────────────────────────────────────────────────────────────────────

const lignesJournal = () => {
  if (!fs.existsSync(JOURNAL)) return []
  const rangees = []
  fs.readFileSync(JOURNAL, 'utf8').split('\n').forEach((ligne, index) => {
    const colonnes = ligne.split('|').map((colonne) => colonne.trim())
    if (colonnes.length >= 7 && /^\d{4}-\d{2}-\d{2}$/.test(colonnes[1]) && /^\d+$/.test(colonnes[4])) {
      rangees.push({
        index,
        cree: colonnes[1],
        programme: colonnes[2],
        canal: colonnes[3].toLowerCase(),
        num: normaliserNumero(colonnes[4]),
        variante: colonnes[5],
        id: colonnes[6],
      })
    }
  })
  return rangees
}

// Une parution programmee au journal a l'heure exacte de sa ligne de calendrier donne l'ancre en remontant les jours.
const ancresDuJournal = (calendrier) => {
  const ancres = new Set()
  for (const rangee of lignesJournal()) {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(rangee.programme)) continue
    const ligne = calendrier.find((c) => c.num === rangee.num && c.variante === rangee.variante && c.canal === rangee.canal)
    if (!ligne) continue
    const paris = partiesParis(rangee.programme)
    if (paris.heure !== ligne.heure || paris.minute !== ligne.minute) continue
    const date = new Date(`${paris.jour}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() - ((ligne.semaine - 1) * 7 + ligne.indexJour))
    ancres.add(date.toISOString().slice(0, 10))
  }
  return [...ancres]
}

const resoudreAncre = (maitre, calendrier) => {
  const valider = (valeur, origine) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur) || Number.isNaN(Date.parse(`${valeur}T00:00:00Z`))) arreter(`Ancre illisible (${origine}) : ${valeur}`)
    if (new Date(`${valeur}T00:00:00Z`).getUTCDay() !== 1) arreter(`L’ancre ${valeur} (${origine}) n’est pas un lundi`)
    return { valeur, origine }
  }
  const explicite = option('--ancre')
  if (explicite) return valider(explicite, 'option --ancre')
  const duMaitre = (/--ancre=(\d{4}-\d{2}-\d{2})/.exec(chapitreCalendrier(maitre).join('\n')) || [])[1]
  const duJournal = ancresDuJournal(calendrier)
  if (duMaitre) {
    const contraires = duJournal.filter((ancre) => ancre !== duMaitre)
    if (PROGRAMMER && contraires.length) {
      arreter(`Ancre du maitre ${duMaitre} contredite par le journal (${contraires.join(', ')}) : verifier le calendrier, puis passer --ancre explicitement`)
    }
    return valider(duMaitre, 'fichier maître')
  }
  if (duJournal.length === 1) return valider(duJournal[0], 'journal')
  if (duJournal.length > 1) arreter(`Ancres contradictoires deduites du journal : ${duJournal.join(', ')}`)
  if (PROGRAMMER) arreter('Ancre introuvable : ni --ancre, ni « --ancre=AAAA-MM-JJ » dans le chapitre Calendrier du maitre, ni parution programmee au journal')
  return valider(prochainLundi(), 'prochain lundi, aucune ancre écrite')
}

const assurerEnteteJournal = () => {
  if (!fs.existsSync(JOURNAL) || !/\| postGroupId \|/.test(fs.readFileSync(JOURNAL, 'utf8'))) {
    fs.appendFileSync(JOURNAL, '# Journal des publications\n\n| Cree le | Programme | Canal | N° | Variante | postGroupId |\n|---|---|---|---|---|---|\n')
  }
}

// Relit le journal juste avant d'ecrire (d'autres sessions y ecrivent) et garde la fin de ligne du fichier.
const ajouterAuJournal = (...lignes) => {
  const texte = fs.existsSync(JOURNAL) ? fs.readFileSync(JOURNAL, 'utf8') : ''
  const fin = texte.includes('\r\n') ? '\r\n' : '\n'
  const separation = texte && !texte.endsWith('\n') ? fin : ''
  fs.appendFileSync(JOURNAL, separation + lignes.map((ligne) => `${ligne}${fin}`).join(''), 'utf8')
}

const changerProgrammeAuJournal = (identifiant, programme) => {
  const lignes = fs.readFileSync(JOURNAL, 'utf8').split('\n')
  const index = lignes.findIndex((ligne) => {
    const colonnes = ligne.split('|').map((colonne) => colonne.trim())
    return colonnes.length >= 7 && /^\d{4}-\d{2}-\d{2}$/.test(colonnes[1]) && colonnes[6] === identifiant
  })
  if (index < 0) arreter(`Ligne du journal introuvable pour ${identifiant}`)
  const retour = lignes[index].endsWith('\r') ? '\r' : ''
  const colonnes = lignes[index].replace(/\r$/, '').split('|').map((colonne) => colonne.trim())
  colonnes[2] = programme
  lignes[index] = `| ${colonnes.slice(1, -1).join(' | ')} |${retour}`
  fs.writeFileSync(JOURNAL, lignes.join('\n'), 'utf8')
}

// Change la colonne Programme d'un identifiant deja au journal, ou l'y inscrit (parution orpheline).
const inscrireAuJournal = (entree, identifiant, programme) => {
  if (lignesJournal().some((rangee) => rangee.id === identifiant)) changerProgrammeAuJournal(identifiant, programme)
  else ajouterAuJournal(`| ${partiesParis(Date.now()).jour} | ${programme} | ${entree.canal} | ${entree.num} | ${entree.variante} | ${identifiant} |`)
}

// Une parution publiee au mauvais visuel n'est signalee qu'une fois : cette marque, ecrite au journal, s'en souvient.
const marqueSignalee = (identifiant) => `visuel faux signalé : \`${identifiant}\``
// Un fait qui ne changera plus (parution supprimee dans Publora, creneau passe) n'est signale qu'une fois lui aussi.
const marqueIntrouvable = (identifiant) => `parution introuvable signalée : \`${identifiant}\``
const marqueCreneauPasse = (nom, quand) => `créneau passé signalé : \`${nom} ${quand}\``
const marqueQuotaInsuffisant = (mois) => `quota insuffisant signalé : ${mois}`

const horodatageParis = () => {
  const paris = partiesParis(Date.now())
  return `${paris.jour} ${String(paris.heure).padStart(2, '0')} h ${String(paris.minute).padStart(2, '0')} (Europe/Paris)`
}

// ─── Le verrou ──────────────────────────────────────────────────────────────────────────────────────────

let verrouTenu = false
const processusVivant = (pid) => {
  try { process.kill(pid, 0); return true } catch (erreur) { return erreur.code === 'EPERM' }
}

// Deux lancements simultanes liraient le meme etat Publora et ecriraient chacun le journal : un seul passe.
const prendreVerrou = () => {
  for (let tentative = 0; tentative < 3; tentative++) {
    try {
      const descripteur = fs.openSync(VERROU, 'wx')
      fs.writeSync(descripteur, JSON.stringify({ pid: process.pid, depuis: new Date(Date.now()).toISOString() }))
      fs.closeSync(descripteur)
      verrouTenu = true
      return
    } catch (erreur) {
      if (erreur.code !== 'EEXIST') throw erreur
    }
    let contenu
    try { contenu = fs.readFileSync(VERROU, 'utf8') } catch { continue } // rendu entre-temps : nouvel essai
    let tenant = null
    try { tenant = JSON.parse(contenu) } catch { tenant = null }
    const age = tenant ? Date.now() - Date.parse(tenant.depuis) : Date.now() - fs.statSync(VERROU).mtimeMs
    const mort = tenant && Number.isInteger(tenant.pid) && !processusVivant(tenant.pid)
    if (!mort && !(age > VERROU_PERIME_MS)) {
      arreter(`Un autre lancement de publier-serie.mjs tient le verrou ${VERROU} (pid ${tenant?.pid ?? '?'} depuis ${tenant?.depuis ?? '?'}) : celui-ci s’arrête sans rien lire ni écrire`)
    }
    informer(`Verrou abandonné repris (pid ${tenant?.pid ?? '?'} depuis ${tenant?.depuis ?? '?'})`)
    try { if (fs.readFileSync(VERROU, 'utf8') === contenu) fs.rmSync(VERROU) } catch { /* deja rendu */ }
  }
  arreter(`Verrou ${VERROU} impossible à prendre`)
}

const rendreVerrou = () => {
  if (!verrouTenu) return
  verrouTenu = false
  try {
    if (JSON.parse(fs.readFileSync(VERROU, 'utf8')).pid === process.pid) fs.rmSync(VERROU)
  } catch { /* verrou deja rendu */ }
}

// ─── Les visuels ────────────────────────────────────────────────────────────────────────────────────────

const dimensionsImage = (octets) => {
  try {
    if (octets[0] === 0x89 && octets[1] === 0x50) return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20), format: 'png' }
    if (octets.toString('ascii', 0, 4) === 'RIFF' && octets.toString('ascii', 8, 12) === 'WEBP') {
      const forme = octets.toString('ascii', 12, 16)
      if (forme === 'VP8X') return { largeur: 1 + octets.readUIntLE(24, 3), hauteur: 1 + octets.readUIntLE(27, 3), format: 'webp' }
      if (forme === 'VP8 ') return { largeur: octets.readUInt16LE(26) & 0x3fff, hauteur: octets.readUInt16LE(28) & 0x3fff, format: 'webp' }
      if (forme === 'VP8L') {
        const valeur = octets.readUInt32LE(21)
        return { largeur: (valeur & 0x3fff) + 1, hauteur: ((valeur >> 14) & 0x3fff) + 1, format: 'webp' }
      }
      return null
    }
    if (octets[0] === 0xff && octets[1] === 0xd8) {
      let index = 2
      while (index + 9 < octets.length) {
        if (octets[index] !== 0xff) { index++; continue }
        const marqueur = octets[index + 1]
        if (marqueur === 0xff) { index++; continue }
        if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
          return { largeur: octets.readUInt16BE(index + 7), hauteur: octets.readUInt16BE(index + 5), format: 'jpeg' }
        }
        if (marqueur === 0x01 || (marqueur >= 0xd0 && marqueur <= 0xd8)) { index += 2; continue }
        index += 2 + octets.readUInt16BE(index + 2)
      }
    }
  } catch { /* dimensions illisibles */ }
  return null
}
const taille = (dimensions) => (dimensions ? `${dimensions.largeur}×${dimensions.hauteur} ${dimensions.format}` : 'dimensions illisibles')

const visuelLocal = (media) => {
  const absolu = path.resolve(RACINE, media)
  const relatif = path.relative(RACINE, absolu)
  if (relatif.startsWith('..') || path.isAbsolute(relatif)) arreter(`Visuel hors du depot : ${media}`)
  if (!fs.existsSync(absolu) || !fs.statSync(absolu).isFile()) arreter(`Visuel absent : ${media}`)
  const extension = path.extname(absolu).toLowerCase()
  const type = TYPES_IMAGE[extension]
  if (!type) arreter(`Format de visuel non accepte : ${media}`)
  const octets = fs.readFileSync(absolu)
  return { media, absolu, extension, type, octets, taille: octets.length, empreinte: sha256(octets), dimensions: dimensionsImage(octets) }
}

// Instagram (via Publora) refuse un visuel hors de 4:5 a 1,91:1 : MEDIA_ASPECT_RATIO_INVALID, vu le 16/09 sur du 9:16.
const defautVisuelPourCanal = (visuel, canal) => {
  if (canal !== 'instagram') return null
  const dimensions = visuel.dimensions
  if (!dimensions) return `${visuel.media} : dimensions illisibles`
  if (dimensions.format !== 'jpeg') return `${visuel.media} est un ${dimensions.format}, Instagram attend un JPEG`
  const rapport = dimensions.largeur / dimensions.hauteur
  if (rapport < RATIO_INSTAGRAM[0] - 0.001 || rapport > RATIO_INSTAGRAM[1] + 0.001) {
    return `${visuel.media} fait ${dimensions.largeur}×${dimensions.hauteur}, hors de 4:5 à 1,91:1`
  }
  return null
}

const telecharger = async (url) => {
  const reponse = await fetch(url)
  if (!reponse.ok) arreter(`Media illisible (HTTP ${reponse.status}) : ${masquer(url)}`)
  return Buffer.from(await reponse.arrayBuffer())
}

// Compare le media en ligne d'une parution (brouillon, programmee ou publiee) au visuel que le maitre declare pour
// son numero, octet pour octet, sur les deux canaux :
//   {}                        un seul media, exactement le visuel du maitre ;
//   { faux: raison }          aucun media, plusieurs, un media en echec, ou une autre image ;
//   { inverifiable: raison }  media encore en traitement chez Publora, ou sans adresse : rien a comparer.
// Un media qui ne se telecharge pas leve une exception : l'appelant decide.
const examinerMedias = async (groupe, entree, visuel) => {
  const medias = Array.isArray(groupe.media) ? groupe.media : []
  if (!medias.length) return { faux: 'aucun média attaché' }
  const pasPrets = medias.filter((media) => media.status && media.status !== 'ready')
  const statuts = pasPrets.map((media) => media.status).join(', ')
  if (pasPrets.some((media) => /fail|error/i.test(media.status))) return { faux: `média en échec (${statuts})` }
  if (pasPrets.length) return { inverifiable: `média non prêt (${statuts})` }
  const contenus = []
  for (const media of medias) {
    if (!media.url) return { inverifiable: 'média sans adresse lisible' }
    contenus.push(await telecharger(media.url))
  }
  if (contenus.length !== 1) return { faux: `${contenus.length} médias au lieu d’un` }
  return sha256(contenus[0]) === visuel.empreinte
    ? {}
    : { faux: `visuel en ligne ${taille(dimensionsImage(contenus[0]))} ≠ ${visuel.media} ${taille(visuel.dimensions)}` }
}

// ─── Les appels ─────────────────────────────────────────────────────────────────────────────────────────

// Lecture simple d'un .env.local : KEY=VALUE, « export » admis, valeur entre guillemets simples ou doubles, lignes
// et fins de ligne « # commentaire » ignorees. Les valeurs ne sont jamais imprimees.
const lireFichierEnv = (fichier) => {
  const valeurs = {}
  if (!fs.existsSync(fichier)) return valeurs
  for (const brute of fs.readFileSync(fichier, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const ligne = brute.trim()
    if (!ligne || ligne.startsWith('#')) continue
    const trouve = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(ligne)
    if (!trouve) continue
    let valeur = trouve[2]
    if (valeur.startsWith('"') || valeur.startsWith('\'')) {
      const fin = valeur.indexOf(valeur[0], 1)
      valeur = fin > 0 ? valeur.slice(1, fin) : valeur.slice(1)
    } else {
      valeur = valeur.replace(/\s+#.*$/, '').trim()
    }
    valeurs[trouve[1]] = valeur
  }
  return valeurs
}

// L'environnement du processus d'abord (automatisation, juge), sinon .env.local a la racine du depot.
const lireEnvironnement = () => {
  const environnement = {}
  let fichier = null
  for (const cle of CLES_ENVIRONNEMENT) {
    if (process.env[cle]) { environnement[cle] = process.env[cle]; continue }
    fichier ??= lireFichierEnv(ENV_LOCAL)
    if (fichier[cle]) environnement[cle] = fichier[cle]
  }
  return environnement
}

const exigerClePublora = (environnement) => {
  if (!environnement.PUBLORA_API_KEY) arreter(`PUBLORA_API_KEY absente : ni dans l’environnement du processus, ni dans ${ENV_LOCAL}`)
  return environnement.PUBLORA_API_KEY
}

const appelJson = async (url, options = {}) => {
  const methode = (options.method || 'GET').toUpperCase()
  if (ESSAI && methode !== 'GET') arreter(`--essai : appel en ecriture refuse (${methode} ${masquer(url)})`)
  const reponse = await fetch(url, options)
  const texte = await reponse.text()
  let donnees = {}
  try { donnees = texte ? JSON.parse(texte) : {} } catch { donnees = texte }
  if (!reponse.ok) {
    const erreur = new Error(`${methode} ${masquer(url)} : HTTP ${reponse.status} · ${String(texte).slice(0, 240)}`)
    erreur.http = reponse.status
    erreur.corps = donnees
    throw erreur
  }
  return donnees
}

const refusQuotaPublora = (erreur) => erreur?.http === 403 && erreur?.corps?.code === 'POST_LIMIT_REACHED'

const lirePublora = async (chemin, entetes) => {
  const reponse = await fetch(`${BASE_PUBLORA}${chemin}`, { headers: entetes })
  const texte = await reponse.text()
  let donnees = null
  try { donnees = JSON.parse(texte) } catch { donnees = null }
  return { http: reponse.status, donnees }
}

// Relecture qui ne leve jamais : une relecture impossible est un resultat, pas une panne.
const relireGroupe = async (identifiant, entetes) => {
  try { return await lirePublora(`/get-post/${identifiant}`, entetes) } catch (erreur) { return { http: 0, donnees: null, erreur: erreur.message } }
}
const resumeRelecture = (lu) => (lu.http === 200
  ? `${lu.donnees?.status} à ${lu.donnees?.scheduledTime || 'sans heure'}`
  : `HTTP ${lu.http}${lu.erreur ? ` ${lu.erreur}` : ''}`)

const connexionsPublora = async (cle) => {
  const entetes = { 'x-publora-key': cle, 'Content-Type': 'application/json' }
  let derniereErreur
  for (let essai = 0; essai < 2; essai++) {
    try {
      const donnees = await appelJson(`${BASE_PUBLORA}/platform-connections`, { headers: entetes })
      return { connexions: donnees?.connections || [], entetes }
    } catch (erreur) {
      derniereErreur = erreur
      if (essai === 0) informer('Lecture des connexions impossible, un seul nouvel essai…')
    }
  }
  throw derniereErreur
}

const plateformesParCanal = (connexions) => {
  const parCanal = {}
  for (const connexion of connexions) {
    const canal = String(connexion.platformId || '').split('-')[0]
    const saine = !connexion.tokenStatus || /ok|valid|active|healthy/i.test(String(connexion.tokenStatus))
    if (saine && !parCanal[canal]) parCanal[canal] = connexion.platformId
  }
  return parCanal
}

const listerGroupes = async (entetes) => {
  const groupes = []
  for (let page = 1; page <= 50; page++) {
    const donnees = await appelJson(`${BASE_PUBLORA}/list-posts?page=${page}&limit=100`, { headers: entetes })
    if (!Array.isArray(donnees?.posts)) arreter('list-posts : reponse sans liste de parutions, comptage impossible')
    groupes.push(...donnees.posts)
    if (!donnees.pagination?.hasNextPage) return groupes
  }
  return arreter('list-posts : plus de 50 pages, comptage interrompu')
}

const cleIdempotence = (...parties) => {
  const empreinte = sha256(parties.join('|'))
  return `${empreinte.slice(0, 8)}-${empreinte.slice(8, 12)}-${empreinte.slice(12, 16)}-${empreinte.slice(16, 20)}-${empreinte.slice(20, 32)}`
}

const listerObjets = async (urlSupabase, entetes, bucket, prefixe = '') => {
  const donnees = await appelJson(`${urlSupabase}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: { ...entetes, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: prefixe, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  })
  return Array.isArray(donnees) ? donnees : []
}

const occupationTotale = async (urlSupabase, entetes, buckets) => {
  let octets = 0
  for (const bucket of buckets) {
    const parcourir = async (prefixe) => {
      for (const objet of await listerObjets(urlSupabase, entetes, bucket.name, prefixe)) {
        const chemin = prefixe ? `${prefixe}/${objet.name}` : objet.name
        if (objet.id === null) await parcourir(chemin)
        else octets += Number(objet.metadata?.size || 0)
      }
    }
    await parcourir('')
  }
  return octets
}

// Heberge les visuels dans le bucket public promo. La cle porte l'empreinte du contenu : un visuel change recoit
// une nouvelle cle, et rien de ce qui est deja en ligne n'est jamais ecrase.
const hebergerVisuels = async (visuels, environnement) => {
  const urlSupabase = environnement.NEXT_PUBLIC_SUPABASE_URL
  const cleSupabase = environnement.SUPABASE_SERVICE_ROLE_KEY
  if (!urlSupabase || !cleSupabase) arreter(`NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absente : ni dans l’environnement du processus, ni dans ${ENV_LOCAL}`)
  const entetes = { apikey: cleSupabase, Authorization: `Bearer ${cleSupabase}` }
  const uniques = new Map(visuels.map((visuel) => [visuel.media, visuel]))
  const cleObjet = (visuel) => `serie-2/${path.basename(visuel.media, path.extname(visuel.media))}-${visuel.empreinte.slice(0, 10)}${visuel.extension}`

  const buckets = await appelJson(`${urlSupabase}/storage/v1/bucket`, { headers: entetes })
  if (!Array.isArray(buckets)) arreter('Impossible de lister les buckets Supabase')
  const bucketExiste = buckets.some((bucket) => bucket.name === BUCKET || bucket.id === BUCKET)
  const objets = bucketExiste ? await listerObjets(urlSupabase, entetes, BUCKET, 'serie-2') : []
  const taillesEnLigne = new Map(objets.filter((objet) => objet.id !== null).map((objet) => [`serie-2/${objet.name}`, Number(objet.metadata?.size || 0)]))

  const aDeposer = []
  for (const visuel of uniques.values()) {
    const enLigne = taillesEnLigne.get(cleObjet(visuel))
    if (enLigne === undefined) aDeposer.push(visuel)
    else if (enLigne !== visuel.taille) arreter(`REFUS : ${cleObjet(visuel)} existe deja avec une autre taille ; rien n’est ecrase`)
  }
  if (aDeposer.length) {
    const occupation = await occupationTotale(urlSupabase, entetes, buckets)
    const supplement = aDeposer.reduce((total, visuel) => total + visuel.taille, 0)
    const restantMo = QUOTA_MO - (occupation + supplement) / 1_048_576
    if (restantMo < MARGE_MO) {
      arreter(`REFUS stockage : il ne resterait que ${restantMo.toFixed(1)} Mo libres ; la marge reservee est ${MARGE_MO} Mo`)
    }
    if (!bucketExiste) {
      await appelJson(`${urlSupabase}/storage/v1/bucket`, {
        method: 'POST',
        headers: { ...entetes, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: BUCKET, name: BUCKET, public: true, file_size_limit: 52_428_800,
          allowed_mime_types: ['video/mp4', ...new Set(Object.values(TYPES_IMAGE))],
        }),
      })
    }
    for (const visuel of aDeposer) {
      await appelJson(`${urlSupabase}/storage/v1/object/${BUCKET}/${cleObjet(visuel)}`, {
        method: 'POST',
        headers: { ...entetes, 'Content-Type': visuel.type, 'x-upsert': 'false', 'cache-control': 'public, max-age=31536000' },
        body: visuel.octets,
      })
      informer(`Image deposee : ${cleObjet(visuel)}`)
    }
  }

  let carte = {}
  try { carte = JSON.parse(fs.readFileSync(CARTE, 'utf8')) } catch { carte = {} }
  const urls = new Map()
  for (const visuel of uniques.values()) {
    const url = `${urlSupabase}/storage/v1/object/public/${BUCKET}/${cleObjet(visuel)}`
    if (sha256(await telecharger(url)) !== visuel.empreinte) arreter(`L’adresse publique de ${cleObjet(visuel)} ne rend pas le visuel attendu`)
    urls.set(visuel.media, url)
    carte[visuel.media] = url
  }
  fs.mkdirSync(path.dirname(CARTE), { recursive: true })
  fs.writeFileSync(CARTE, `${JSON.stringify(carte, null, 2)}\n`, 'utf8')
  return urls
}

// ─── Mode brouillon (sans --programmer) ────────────────────────────────────────────────────────────────

const creerBrouillons = async (plan) => {
  const aFaire = UNE_SEULE ? plan.slice(0, 1) : plan
  const dejaJournalisees = new Set(lignesJournal().map((rangee) => `${rangee.num}|${rangee.variante}|${rangee.canal}`))
  const doublons = aFaire.filter((entree) => dejaJournalisees.has(`${entree.num}|${entree.variante}|${entree.canal}`))
  if (doublons.length) arreter(`Doublon refuse : ${doublons.map((entree) => `pub-${entree.num} ${entree.variante} ${entree.canal}`).join(', ')}`)
  const visuels = aFaire.map((entree) => visuelLocal(entree.media))
  if (ESSAI) {
    for (const entree of aFaire) dire(`SERAIT CRÉÉE EN BROUILLON · pub-${entree.num} ${entree.variante} ${entree.canal} · ${entree.media}`)
    return
  }

  const environnement = lireEnvironnement()
  const clePublora = exigerClePublora(environnement)
  const { connexions, entetes } = await connexionsPublora(clePublora)
  const parCanal = plateformesParCanal(connexions)
  const manquants = [...new Set(aFaire.map((entree) => entree.canal))].filter((canal) => !parCanal[canal])
  if (manquants.length) arreter(`Connexion Publora absente ou malsaine : ${manquants.join(', ')}`)

  const urls = await hebergerVisuels(visuels, environnement)
  assurerEnteteJournal()
  for (const entree of aFaire) {
    const corps = { content: entree.texte, platforms: [parCanal[entree.canal]], mediaUrls: [urls.get(entree.media)] }
    const reponse = await appelJson(`${BASE_PUBLORA}/create-post`, {
      method: 'POST', headers: entetes, body: JSON.stringify(corps),
    })
    const identifiant = reponse?.postGroupId
    if (!identifiant) arreter(`Publora n’a pas renvoye de postGroupId pour pub-${entree.num}`)
    ajouterAuJournal(`| ${partiesParis(Date.now()).jour} | brouillon | ${entree.canal} | ${entree.num} | ${entree.variante} | ${identifiant} |`)
    informer(`Brouillon cree : pub-${entree.num} ${entree.variante} ${entree.canal}`)
  }
}

// ─── Mode --programmer : la reprise quotidienne ────────────────────────────────────────────────────────

const decider = async (plan, contexte) => {
  const { entetes, parCanal, groupes, environnement } = contexte
  const occupants = groupes.filter((groupe) => STATUTS_OCCUPANTS.has(groupe.status))
  let placesLibres = Math.max(0, PLAFOND_PROGRAMMEES - occupants.length)
  dire(`Compte Publora : ${occupants.length} parution(s) programmée(s) sur ${PLAFOND_PROGRAMMEES} permises → ${placesLibres} place(s) libre(s)`)
  const moisCourant = moisParis(MAINTENANT_MS)
  const plafond = plafondMensuel(environnement.PUBLORA_QUOTA_MENSUEL)
  const utilisees = entreesDuMois(groupes, moisCourant)
  const restantInitial = Math.max(0, plafond - utilisees)
  const restantsParMois = new Map([[moisCourant, restantInitial]])
  dire(`quota Publora : ${utilisees}/${plafond} ce mois (${moisCourant}, mois civil à Paris)`)
  const journal = lignesJournal()
  const texteJournal = fs.existsSync(JOURNAL) ? fs.readFileSync(JOURNAL, 'utf8') : ''
  const actions = []
  const remplacements = []
  const candidates = []
  const signaler = (attention, texte) => dire(`${attention ? 'ATTENTION · ' : '  · '}${texte}`)
  // Une marque de memoire n'est ecrite au journal qu'a la fin du lancement (voir executer).
  const memoriser = (entree, note) => actions.push({ type: 'memoire', entree, note })
  let aVenirCeMois = 0
  let premiereAVenir = null

  // Parution encore programmee (ou en traitement) bien apres son heure : elle n'est pas partie. Alerte a chaque passage,
  // comme une parution en echec : c'est un etat de Publora a regarder, pas un fait passe.
  const controlerRetard = (groupe, identifiant, nom) => {
    const heure = Date.parse(groupe.scheduledTime)
    if (!STATUTS_OCCUPANTS.has(groupe.status) || !(heure < MAINTENANT_MS - DELAI_RETARD_MS)) return
    const retardMinutes = Math.round((MAINTENANT_MS - heure) / 60_000)
    const retard = retardMinutes >= 60 ? `${Math.floor(retardMinutes / 60)} h ${String(retardMinutes % 60).padStart(2, '0')}` : `${retardMinutes} min`
    alerterBenj(`parution pas partie : ${nom} · ${identifiant} toujours « ${groupe.status} » dans Publora pour ${lisibleParis(groupe.scheduledTime)}, ${retard} après son heure ; rien n’est modifié ni recréé, à regarder dans Publora`)
  }

  // Parution PUBLIEE : elle est publique, on n'y touche jamais ; un visuel faux est signale une seule fois.
  const controlerVisuelPublie = async (entree, groupe, identifiant, nom) => {
    if (texteJournal.includes(marqueSignalee(identifiant))) return
    let examen
    try { examen = await examinerMedias(groupe, entree, visuelLocal(entree.media)) } catch (erreur) {
      signaler(true, `${nom} publiée · ${identifiant} : visuel invérifiable (${erreur.message})`)
      return
    }
    if (examen.inverifiable) { signaler(true, `${nom} publiée · ${identifiant} : visuel invérifiable (${examen.inverifiable})`); return }
    if (!examen.faux) return
    alerterBenj(`visuel faux sur une parution PUBLIÉE : ${nom} · ${identifiant} · ${lisibleParis(groupe.scheduledTime)} · ${examen.faux} ; elle est publique, rien n’est modifié (signalée une seule fois)`)
    actions.push({ type: 'signalement-visuel-publie', entree, id: identifiant, raison: examen.faux })
  }

  // Parution PROGRAMMEE : { remplacement } si son visuel est faux et qu'on peut encore la remplacer ; sinon l'alerte
  // est donnee ici et rien n'est touche.
  const controlerVisuelProgramme = async (entree, groupe, identifiant, nom) => {
    const quand = groupe.scheduledTime
    const reperee = `${nom} programmée ${lisibleParis(quand)} · ${identifiant}`
    let visuel
    let examen
    try {
      visuel = visuelLocal(entree.media)
      examen = await examinerMedias(groupe, entree, visuel)
    } catch (erreur) {
      alerterBenj(`visuel invérifiable : ${reperee} · ${erreur.message} ; rien n’est modifié`)
      return {}
    }
    if (examen.inverifiable) { alerterBenj(`visuel invérifiable : ${reperee} · ${examen.inverifiable} ; rien n’est modifié`); return {} }
    if (!examen.faux) return {}
    const refuser = (pourquoi) => {
      alerterBenj(`visuel faux : ${reperee} · ${examen.faux} ; ${pourquoi}, rien n’est modifié : à corriger à la main dans Publora`)
      return {}
    }
    if (!(Date.parse(quand) - MAINTENANT_MS > DELAI_REMPLACEMENT_MS)) return refuser('à moins de 3 h de sa parution')
    if (entree.bloque) return refuser(`publication bloquée dans le maître (${entree.bloque})`)
    const defaut = defautVisuelPourCanal(visuel, entree.canal)
    if (defaut) return refuser(`le visuel du maître est refusé (${defaut})`)
    if (!parCanal[entree.canal]) return refuser(`connexion Publora ${entree.canal} absente ou malsaine`)
    return { remplacement: { type: 'remplacement-visuel', entree, quand, ancienId: identifiant, visuel, raison: examen.faux } }
  }

  // Parution orpheline (hors journal, retrouvee par son texte) : relue en entier pour juger son statut et son visuel.
  const examinerOrpheline = async (entree, orpheline, nom, rangee) => {
    const identifiant = orpheline.postGroupId
    const retrouvee = { type: 'parution-retrouvee', entree, quand: orpheline.scheduledTime || entree.quand, id: identifiant, statut: orpheline.status, ancienId: rangee?.id }
    if (!['scheduled', ...STATUTS_PARTIS].includes(orpheline.status)) {
      controlerRetard(orpheline, identifiant, `${nom} (orpheline)`)
      return retrouvee
    }
    const lu = await relireGroupe(identifiant, entetes)
    if (lu.http !== 200 || !lu.donnees?.status) {
      const texte = `${nom} : orpheline ${identifiant} rattachée sans contrôle du visuel, relecture impossible (${resumeRelecture(lu)})`
      if (orpheline.status === 'scheduled') alerterBenj(`visuel invérifiable : ${texte}`)
      else signaler(true, texte)
      return retrouvee
    }
    const groupe = { ...orpheline, ...lu.donnees }
    controlerRetard(groupe, identifiant, `${nom} (orpheline)`)
    if (STATUTS_EN_ECHEC.has(groupe.status)) {
      alerterBenj(`statut Publora « ${groupe.status} » : ${nom} · ${identifiant} (orpheline rattachée au journal) · ${lisibleParis(groupe.scheduledTime)} ; rien n’est recréé ni modifié, à regarder dans Publora`)
    } else if (groupe.status === 'published') {
      await controlerVisuelPublie(entree, groupe, identifiant, nom)
    } else if (groupe.status === 'scheduled') {
      const controle = await controlerVisuelProgramme(entree, groupe, identifiant, nom)
      if (controle.remplacement) return { ...controle.remplacement, orpheline: true, brouillonRemplace: rangee?.id }
    }
    return { ...retrouvee, quand: groupe.scheduledTime || retrouvee.quand, statut: groupe.status }
  }

  for (const entree of [...plan].sort((a, b) => Date.parse(a.quand) - Date.parse(b.quand))) {
    const nom = `pub-${entree.num} ${entree.variante} ${entree.canal}`
    const quandLisible = lisibleParis(entree.quand)
    const rangee = journal
      .filter((ligne) => ligne.num === entree.num && ligne.variante === entree.variante && ligne.canal === entree.canal && !/remplac/i.test(ligne.programme))
      .at(-1)

    let groupe = null
    if (rangee) {
      const { http, donnees } = await lirePublora(`/get-post/${rangee.id}`, entetes)
      if (http !== 200 || !donnees?.status) {
        // 404 ET absente de la liste du compte : elle a ete supprimee dans Publora. Rien n'est recree sans Benj (une
        // parution programmee supprimee a la main peut etre une decision) ; l'alerte est donnee une fois.
        const supprimee = http === 404 && !groupes.some((autre) => autre.postGroupId === rangee.id)
        if (!supprimee) {
          alerterBenj(`lecture impossible : ${nom} · ${rangee.id} illisible dans Publora (HTTP ${http}) ; rien n’est fait ni recréé pour elle ce soir, nouvel essai au prochain passage`)
        } else if (texteJournal.includes(marqueIntrouvable(rangee.id))) {
          signaler(true, `${nom} : ${rangee.id} introuvable dans Publora (HTTP 404), déjà signalée ; rien n’est recréé`)
        } else {
          alerterBenj(`parution introuvable : ${nom} · ${rangee.id} (journal : ${rangee.programme}) n’existe plus dans Publora (HTTP 404, absente de la liste du compte), supprimée ? Rien n’est recréé sans décision de Benj (signalée une seule fois)`)
          memoriser(entree, `${nom} · ${marqueIntrouvable(rangee.id)} (HTTP 404, absente de list-posts, journal : ${rangee.programme}) ; rien n’est recréé, l’ALERTE BENJ est transmise et ne sera plus répétée pour cet identifiant.`)
        }
        continue
      }
      groupe = donnees
      controlerRetard(groupe, rangee.id, nom)
      if (STATUTS_EN_ECHEC.has(groupe.status)) {
        alerterBenj(`statut Publora « ${groupe.status} » : ${nom} · ${rangee.id} · ${lisibleParis(groupe.scheduledTime)} ; rien n’est recréé ni modifié, à regarder dans Publora`)
        continue
      }
      if (groupe.status === 'published') {
        await controlerVisuelPublie(entree, groupe, rangee.id, nom)
        if (!/^\d{4}-\d{2}-\d{2}T/.test(rangee.programme) && groupe.scheduledTime) {
          actions.push({ type: 'reconfirmation', entree, quand: entree.quand, id: rangee.id, statut: groupe.status })
        } else signaler(false, `déjà publiée : ${nom} · ${rangee.id}`)
        continue
      }
      if (groupe.status === 'scheduled') {
        const controle = await controlerVisuelProgramme(entree, groupe, rangee.id, nom)
        if (controle.remplacement) { remplacements.push(controle.remplacement); continue }
      }
      if (STATUTS_OCCUPANTS.has(groupe.status)) {
        const ecart = Date.parse(groupe.scheduledTime) !== Date.parse(entree.quand)
        if (!ecart && groupe.status === 'scheduled' && !/^\d{4}-\d{2}-\d{2}T/.test(rangee.programme)) {
          actions.push({ type: 'reconfirmation', entree, quand: entree.quand, id: rangee.id, statut: groupe.status })
        } else if (!ecart && groupe.status !== 'scheduled' && !/^\d{4}-\d{2}-\d{2}T/.test(rangee.programme)) {
          signaler(true, `à reconfirmer : ${nom} · ${groupe.status} · ${rangee.id} ; les autres publications continuent`)
        } else {
          signaler(ecart, `déjà programmée : ${nom} · ${lisibleParis(groupe.scheduledTime)} · ${rangee.id}${ecart ? ` · le calendrier dit ${quandLisible}, rien n’est modifié` : ''}`)
        }
        continue
      }
      if (groupe.status !== 'draft') { signaler(true, `${nom} : statut Publora « ${groupe.status} » (${rangee.id}), à regarder ; rien n’est recréé`); continue }
    }

    if (entree.bloque) { signaler(false, `bloquée : ${nom} · ${entree.bloque}`); continue }

    // Une reponse create-post peut se perdre apres que Publora a cree la parution. La liste du compte est alors
    // la source de verite : on rattache l'orpheline par son texte et son canal avant de juger son creneau passe.
    const texteMaitre = normaliserTexte(entree.texte)
    const dejaHorsJournal = groupes.find((autre) => autre.postGroupId !== rangee?.id
      && (STATUTS_OCCUPANTS.has(autre.status) || STATUTS_PARTIS.has(autre.status))
      && normaliserTexte(autre.content) === texteMaitre
      && (autre.platforms || []).some((plateforme) => String(plateforme?.platform || plateforme?.platformId || plateforme).split('-')[0] === entree.canal))
    if (dejaHorsJournal) {
      const action = await examinerOrpheline(entree, dejaHorsJournal, nom, rangee)
      if (action.type === 'remplacement-visuel') remplacements.push(action)
      else actions.push(action)
      continue
    }

    const quandMs = Date.parse(entree.quand)
    let quand = entree.quand
    if (quandMs <= MAINTENANT_MS + DELAI_MINIMUM_MS) {
      if (!PASSE_MAINTENANT) {
        const marque = marqueCreneauPasse(nom, entree.quand)
        if (texteJournal.includes(marque)) {
          signaler(true, `créneau passé, déjà signalé : ${nom} · ${quandLisible} · rien n’est programmé`)
        } else {
          alerterBenj(`créneau passé : ${nom} · ${quandLisible} · rien n’est programmé (--passe-maintenant pour la publier tout de suite ; signalé une seule fois)`)
          memoriser(entree, `${marque} ; rien n’est programmé, l’ALERTE BENJ est transmise et ne sera plus répétée pour ce créneau.`)
        }
        continue
      }
      quand = new Date(Math.max(quandMs, MAINTENANT_MS + 2 * 60_000)).toISOString()
    }
    if (moisParis(quand) === moisCourant && (quandMs > MAINTENANT_MS + DELAI_MINIMUM_MS || PASSE_MAINTENANT)) {
      aVenirCeMois++
      premiereAVenir ??= entree
    }
    if (quandMs - MAINTENANT_MS > HORIZON_MS - MARGE_HORIZON_MS) { signaler(false, `hors horizon de 7 jours : ${nom} · ${quandLisible}`); continue }
    candidates.push({ entree, groupe, rangee, nom, quand, quandLisible, texteMaitre })
  }

  // La parution deja annoncee garde la priorite, meme si une nouvelle est plus proche dans le calendrier.
  // Remettre l'ancienne en brouillon ne libere pas son unite mensuelle chez Publora.
  for (const action of remplacements) {
    const moisParution = moisParis(action.quand)
    if (!restantsParMois.has(moisParution)) restantsParMois.set(moisParution, Math.max(0, plafond - entreesDuMois(groupes, moisParution)))
    const nom = `pub-${action.entree.num} ${action.entree.variante} ${action.entree.canal}`
    if (moisParution === moisCourant) {
      aVenirCeMois++
      premiereAVenir ??= action.entree
    }
    if (restantsParMois.get(moisParution) <= 0) {
      alerterBenj(`visuel faux : ${nom} programmée ${lisibleParis(action.quand)} · ${action.ancienId} · ${action.raison} ; quota Publora épuisé pour ${moisParution}, rien n’est modifié : à corriger à la main dans Publora`)
      continue
    }
    actions.push(action)
    restantsParMois.set(moisParution, restantsParMois.get(moisParution) - 1)
  }

  for (const { entree, groupe, rangee, nom, quand, quandLisible, texteMaitre } of candidates) {
    const moisParution = moisParis(quand)
    if (!restantsParMois.has(moisParution)) restantsParMois.set(moisParution, Math.max(0, plafond - entreesDuMois(groupes, moisParution)))
    if (restantsParMois.get(moisParution) <= 0) {
      if (restantInitial === 0 && moisParution === moisCourant) alerterBenj(`quota Publora épuisé : ${nom} · ${quandLisible} à Paris · rien n’est programmé`)
      else signaler(true, `quota Publora atteint : ${nom} · ${quandLisible} à Paris · rien n’est programmé`)
      continue
    }
    if (placesLibres <= 0) { signaler(false, `attend une place : ${nom} · ${quandLisible}`); continue }
    if (UNE_SEULE && actions.some((action) => ['brouillon-programme', 'nouvelle-parution'].includes(action.type))) { signaler(false, `--une-seule : ${nom} attendra`); continue }

    let visuel
    try { visuel = visuelLocal(entree.media) } catch (erreur) { signaler(true, `${nom} : ${erreur.message}`); continue }
    const defautVisuel = defautVisuelPourCanal(visuel, entree.canal)
    if (defautVisuel) { signaler(true, `${nom} : visuel du maître refusé, ${defautVisuel}`); continue }

    let action = { type: 'nouvelle-parution', entree, quand, visuel }
    if (groupe) {
      const plateformes = (groupe.platforms || []).map((plateforme) => String(typeof plateforme === 'string' ? plateforme : plateforme?.platformId || ''))
      let raison = plateformes.length === 1 && plateformes[0].split('-')[0] === entree.canal
        ? null
        : `plateformes du brouillon : ${plateformes.join(', ') || 'aucune'}`
      if (!raison) {
        try {
          const examen = await examinerMedias(groupe, entree, visuel)
          raison = examen.faux || examen.inverifiable || null
        } catch (erreur) { signaler(true, `${nom} : ${erreur.message}`); continue }
      }
      if (!raison) {
        const contenu = groupe.posts?.[0]?.content ?? groupe.content
        action = { type: 'brouillon-programme', entree, quand, id: rangee.id, visuel, texteARemettre: normaliserTexte(contenu) !== texteMaitre }
      } else {
        action = { ...action, ancienId: rangee.id, raison }
      }
    }
    if (action.type === 'nouvelle-parution' && !parCanal[entree.canal]) { signaler(true, `${nom} : connexion Publora ${entree.canal} absente ou malsaine`); continue }
    actions.push(action)
    placesLibres--
    restantsParMois.set(moisParution, restantsParMois.get(moisParution) - 1)
  }
  if (restantInitial > 0 && aVenirCeMois > restantInitial) {
    const marque = marqueQuotaInsuffisant(moisCourant)
    if (texteJournal.includes(marque)) signaler(true, `quota Publora insuffisant déjà signalé pour ${moisCourant} : ${restantInitial} place(s) pour ${aVenirCeMois} parution(s) à venir`)
    else {
      alerterBenj(`quota Publora insuffisant : ${restantInitial} place(s) pour ${aVenirCeMois} parution(s) à venir en ${moisCourant}`)
      memoriser(premiereAVenir, `${marque} ; ${restantInitial} place(s) pour ${aVenirCeMois} parution(s) à venir ; l’ALERTE BENJ est transmise et ne sera plus répétée ce mois.`)
    }
  }
  return actions
}

const decrireAction = (action) => {
  const { entree } = action
  if (action.type === 'reconfirmation') return `pub-${entree.num} ${entree.variante} ${entree.canal} · ${action.id} · programmation confirmée dans le journal`
  if (action.type === 'parution-retrouvee') return `pub-${entree.num} ${entree.variante} ${entree.canal} · ${action.id} · parution ${action.statut} retrouvée par son texte et rattachée au journal`
  if (action.type === 'remplacement-visuel') {
    return `pub-${entree.num} ${entree.variante} ${entree.canal} · ${action.quand} · remplacement de visuel · ${lisibleParis(action.quand)} à Paris · l’ancienne ${action.ancienId}${action.orpheline ? ' (orpheline)' : ''} repasse en brouillon, sans suppression, puis nouvelle parution à la même heure avec ${action.visuel.media} ${taille(action.visuel.dimensions)} (${action.raison})`
  }
  const debut = `pub-${entree.num} ${entree.variante} ${entree.canal} · ${action.quand} · ${action.type === 'brouillon-programme' ? 'brouillon programmé' : 'nouvelle parution'} · ${lisibleParis(action.quand)} à Paris`
  if (action.type === 'brouillon-programme') return `${debut} · ${action.id}${action.texteARemettre ? ' · texte remis à celui du maître' : ''}`
  const visuel = `${action.visuel.media} ${taille(action.visuel.dimensions)}`
  return action.ancienId
    ? `${debut} · ${visuel} · l’ancien brouillon ${action.ancienId} reste non publié, sans suppression (${action.raison})`
    : `${debut} · ${visuel}`
}

// Remplace une parution programmee au mauvais visuel, sans suppression et sans jamais depasser le plafond :
//   1. l'ancienne repasse en brouillon (update-post status draft) et doit etre RELUE draft, sinon rien d'autre n'est tente ;
//   2. une nouvelle parution est creee a la meme heure avec le visuel du maitre, puis relue.
const remplacerVisuel = async (action, entetes, parCanal, urls) => {
  const { entree, ancienId, quand, visuel } = action
  const nom = `pub-${entree.num} ${entree.variante} ${entree.canal}`
  const reperee = `${nom} programmée ${lisibleParis(quand)} · ancienne \`${ancienId}\`${action.orpheline ? ' (orpheline)' : ''} (${action.raison})`

  let erreurBrouillon = ''
  try {
    await appelJson(`${BASE_PUBLORA}/update-post/${ancienId}`, {
      method: 'PUT',
      headers: { ...entetes, 'Idempotency-Key': cleIdempotence('publier-serie', 'remise-en-brouillon', ancienId, quand) },
      body: JSON.stringify({ status: 'draft' }),
    })
  } catch (erreur) {
    if (refusQuotaPublora(erreur)) {
      alerterBenj(`quota Publora refusé : ${nom} · ${lisibleParis(quand)} à Paris ; aucune autre programmation tentée`)
      return true
    }
    erreurBrouillon = erreur.message
  }
  const luAncienne = await relireGroupe(ancienId, entetes)
  if (luAncienne.http !== 200 || luAncienne.donnees?.status !== 'draft') {
    const etat = `relue ${resumeRelecture(luAncienne)}${erreurBrouillon ? ` ; ${erreurBrouillon.slice(0, 200)}` : ''}`
    ajouterAuJournal(`> ${horodatageParis()}, publier-serie.mjs : ${reperee} · visuel faux ; remise en brouillon non confirmée (${etat}) ; aucune nouvelle parution créée.`, '')
    alerterBenj(`visuel faux : ${reperee} ; la remise en brouillon a échoué (${etat}), rien d’autre n’est tenté : à corriger à la main dans Publora`)
    return
  }
  inscrireAuJournal(entree, ancienId, 'remis en brouillon, visuel faux')
  if (action.brouillonRemplace) changerProgrammeAuJournal(action.brouillonRemplace, 'brouillon remplacé')

  let identifiant = ''
  let erreurCreation = ''
  try {
    const reponse = await appelJson(`${BASE_PUBLORA}/create-post`, {
      method: 'POST',
      headers: { ...entetes, 'Idempotency-Key': cleIdempotence('publier-serie', 'remplacement-visuel', ancienId, nom, quand, visuel.empreinte, sha256(entree.texte)) },
      body: JSON.stringify({ content: entree.texte, platforms: [parCanal[entree.canal]], mediaUrls: [urls.get(visuel.media)], scheduledTime: quand }),
    })
    identifiant = reponse?.postGroupId || ''
    if (!identifiant) erreurCreation = 'Publora n’a pas renvoyé de postGroupId'
  } catch (erreur) {
    if (refusQuotaPublora(erreur)) {
      ajouterAuJournal(`> ${horodatageParis()}, publier-serie.mjs : ${reperee} · visuel faux ; l’ancienne est remise en brouillon (relue draft), sans suppression, mais la nouvelle parution n’a pas pu être créée (quota Publora refusé). Aucune autre programmation tentée.`, '')
      alerterBenj(`visuel faux : ${nom} · ${lisibleParis(quand)} à Paris ; quota Publora refusé après la remise en brouillon : l’ancienne a été remise en brouillon et la nouvelle parution n’a pas pu être recréée ; aucune autre programmation tentée`)
      return true
    }
    erreurCreation = erreur.message
  }
  if (!identifiant) {
    ajouterAuJournal(`> ${horodatageParis()}, publier-serie.mjs : ${reperee} · visuel faux ; l’ancienne est remise en brouillon (relue draft), sans suppression, mais la nouvelle parution n’a pas pu être créée (${erreurCreation.slice(0, 200)}). Le prochain passage la recrée, ou la rattache par son texte si Publora l’a créée malgré tout.`, '')
    alerterBenj(`visuel faux : ${reperee} ; l’ancienne est remise en brouillon, mais la nouvelle parution n’a pas pu être créée (${erreurCreation.slice(0, 160)}) ; le prochain passage la recrée`)
    return
  }

  const luNouvelle = await relireGroupe(identifiant, entetes)
  const relue = resumeRelecture(luNouvelle)
  const programmee = luNouvelle.http === 200 && luNouvelle.donnees?.status === 'scheduled' && Date.parse(luNouvelle.donnees?.scheduledTime) === Date.parse(quand)
  changerProgrammeAuJournal(ancienId, 'remplacé, visuel faux')
  ajouterAuJournal(
    `| ${partiesParis(Date.now()).jour} | ${programmee ? luNouvelle.donnees.scheduledTime : 'à reconfirmer'} | ${entree.canal} | ${entree.num} | ${entree.variante} | ${identifiant} |`,
    '',
    `> ${horodatageParis()}, publier-serie.mjs : ${nom} · visuel remplacé : l’ancienne \`${ancienId}\`${action.orpheline ? ' (orpheline)' : ''} (${action.raison}) est remise en brouillon par update-post (relue draft), sans suppression ; nouvelle parution \`${identifiant}\` créée pour ${quand} (${lisibleParis(quand)} à Paris) avec ${visuel.media} (${taille(visuel.dimensions)}), relue ${relue}${programmee ? '' : ' : à reconfirmer au prochain passage'}.`,
    '',
  )
  alerterBenj(`visuel remplacé : ${nom} · ${lisibleParis(quand)} à Paris · ancienne \`${ancienId}\` remise en brouillon (${action.raison}) · nouvelle \`${identifiant}\` avec ${visuel.media}, relue ${relue}${programmee ? '' : ', à reconfirmer'}`)
  dire(`REMPLACÉE · ${decrireAction(action)} · nouvel identifiant ${identifiant} · relu côté serveur : ${relue}`)
}

const executer = async (actions, contexte) => {
  const { entetes, parCanal, environnement } = contexte
  const aHeberger = actions.filter((action) => ['nouvelle-parution', 'remplacement-visuel'].includes(action.type)).map((action) => action.visuel)
  const urls = aHeberger.length ? await hebergerVisuels(aHeberger, environnement) : new Map()

  // Les marques « signalé une seule fois » passent en dernier : si le lancement s'arrete avant (code 1), elles ne sont
  // pas ecrites et l'alerte revient au passage suivant.
  const estMemoire = (action) => ['signalement-visuel-publie', 'memoire'].includes(action.type)
  let quotaRefuse = false
  for (const action of [...actions.filter((action) => !estMemoire(action)), ...actions.filter(estMemoire)]) {
    const { entree } = action
    const nom = `pub-${entree.num} ${entree.variante} ${entree.canal}`
    if (action.type === 'memoire') {
      ajouterAuJournal(`> ${horodatageParis()}, publier-serie.mjs : ${action.note}`, '')
      continue
    }
    if (action.type === 'signalement-visuel-publie') {
      ajouterAuJournal(`> ${horodatageParis()}, publier-serie.mjs : ${nom} · ${marqueSignalee(action.id)} (publiée ; ${action.raison}) ; l’ALERTE BENJ est transmise et ne sera plus répétée pour cet identifiant.`, '')
      continue
    }
    if (action.type === 'remplacement-visuel') {
      if (quotaRefuse) { dire(`ATTENTION · quota Publora refusé : ${nom} attendra`); continue }
      quotaRefuse = await remplacerVisuel(action, entetes, parCanal, urls) === true
      continue
    }
    if (action.type === 'reconfirmation') {
      changerProgrammeAuJournal(action.id, action.quand)
      ajouterAuJournal(`> ${horodatageParis()}, publier-serie.mjs : relecture de \`${action.id}\` (${nom}) confirmée ${action.statut} à ${action.quand} ; programmation inscrite au journal.`, '')
      dire(`CONFIRMÉE · ${decrireAction(action)}`)
      continue
    }
    if (action.type === 'parution-retrouvee') {
      if (action.ancienId) changerProgrammeAuJournal(action.ancienId, 'brouillon remplacé')
      ajouterAuJournal(
        `| ${partiesParis(Date.now()).jour} | ${action.quand} | ${entree.canal} | ${entree.num} | ${entree.variante} | ${action.id} |`,
        '',
        `> ${horodatageParis()}, publier-serie.mjs : ${nom} · parution orpheline \`${action.id}\` retrouvée par son texte, statut ${action.statut}, rattachée au journal sans recréation.`,
        '',
      )
      dire(`RETROUVÉE · ${decrireAction(action)}`)
      continue
    }
    if (quotaRefuse) { dire(`ATTENTION · quota Publora refusé : ${nom} attendra`); continue }
    let identifiant
    try {
      if (action.type === 'brouillon-programme') {
        const corps = { status: 'scheduled', scheduledTime: action.quand }
        if (action.texteARemettre) corps.content = entree.texte
        await appelJson(`${BASE_PUBLORA}/update-post/${action.id}`, {
          method: 'PUT',
          headers: { ...entetes, 'Idempotency-Key': cleIdempotence('publier-serie', 'update-post', action.id, JSON.stringify(corps)) },
          body: JSON.stringify(corps),
        })
        identifiant = action.id
      } else {
        const corps = {
          content: entree.texte,
          platforms: [parCanal[entree.canal]],
          mediaUrls: [urls.get(action.visuel.media)],
          scheduledTime: action.quand,
        }
        const reponse = await appelJson(`${BASE_PUBLORA}/create-post`, {
          method: 'POST',
          headers: { ...entetes, 'Idempotency-Key': cleIdempotence('publier-serie', 'create-post', nom, action.quand, action.visuel.empreinte, sha256(entree.texte)) },
          body: JSON.stringify(corps),
        })
        identifiant = reponse?.postGroupId
        if (!identifiant) arreter(`Publora n’a pas renvoye de postGroupId pour ${nom}`)
      }
    } catch (erreur) {
      if (!refusQuotaPublora(erreur)) throw erreur
      alerterBenj(`quota Publora refusé : ${nom} · ${lisibleParis(action.quand)} à Paris ; aucune autre programmation tentée`)
      quotaRefuse = true
      continue
    }

    let relecture = { http: 0, donnees: null }
    try { relecture = await lirePublora(`/get-post/${identifiant}`, entetes) } catch (erreur) { relecture.erreur = erreur.message }
    const { http, donnees } = relecture
    const relu = http === 200 ? `${donnees?.status} à ${donnees?.scheduledTime || 'sans heure'}` : `HTTP ${http}${relecture.erreur ? ` ${relecture.erreur}` : ''}`
    const confirme = http === 200 && donnees?.status === 'scheduled' && Date.parse(donnees?.scheduledTime) === Date.parse(action.quand)
    if (!confirme) {
      if (action.type === 'brouillon-programme') changerProgrammeAuJournal(identifiant, 'à reconfirmer')
      else {
        if (action.ancienId) changerProgrammeAuJournal(action.ancienId, 'brouillon remplacé')
        ajouterAuJournal(`| ${partiesParis(Date.now()).jour} | à reconfirmer | ${entree.canal} | ${entree.num} | ${entree.variante} | ${identifiant} |`)
      }
      ajouterAuJournal(`> ${horodatageParis()}, publier-serie.mjs : relecture de \`${identifiant}\` (${nom}) : ${relu}, au lieu de scheduled à ${action.quand}. À reconfirmer au prochain passage ; les autres publications continuent.`, '')
      dire(`À RECONFIRMER · ${nom} · ${identifiant} · relu ${relu} ; poursuite des autres publications`)
      continue
    }

    const programme = donnees.scheduledTime
    if (action.type === 'brouillon-programme') {
      changerProgrammeAuJournal(identifiant, programme)
      ajouterAuJournal('', `> ${horodatageParis()}, publier-serie.mjs : ${nom} · brouillon \`${identifiant}\` passé en programmé pour ${programme} (${lisibleParis(programme)} à Paris) par update-post${action.texteARemettre ? ', texte remis à celui du maître' : ''}.`, '')
    } else {
      if (action.ancienId) changerProgrammeAuJournal(action.ancienId, 'brouillon remplacé')
      ajouterAuJournal(
        `| ${partiesParis(Date.now()).jour} | ${programme} | ${entree.canal} | ${entree.num} | ${entree.variante} | ${identifiant} |`,
        '',
        `> ${horodatageParis()}, publier-serie.mjs : ${nom} · nouvelle parution \`${identifiant}\` programmée pour ${programme} (${lisibleParis(programme)} à Paris) avec ${action.visuel.media} (${taille(action.visuel.dimensions)})${action.ancienId ? ` ; l’ancien brouillon \`${action.ancienId}\` reste non publié, sans suppression (${action.raison})` : ''}.`,
        '',
      )
    }
    dire(`PROGRAMMÉE · ${decrireAction({ ...action, id: identifiant })}${action.type === 'nouvelle-parution' ? ` · nouvel identifiant ${identifiant}` : ''} · relu côté serveur : ${relu}`)
  }
}

const reprendre = async (plan, ancre) => {
  dire(`${ESSAI ? 'ESSAI, lectures seulement, rien n’est écrit · ' : ''}Série ${path.relative(RACINE, CHEMIN_MAITRE).replace(/\\/g, '/')} · ancre ${ancre.valeur} (${ancre.origine}) · ${lisibleParis(MAINTENANT_MS)} à Paris`)
  const environnement = lireEnvironnement()
  const clePublora = exigerClePublora(environnement)
  const { connexions, entetes } = await connexionsPublora(clePublora)
  const contexte = { environnement, entetes, parCanal: plateformesParCanal(connexions), groupes: await listerGroupes(entetes) }

  const actions = await decider(plan, contexte)
  const travaux = actions.filter((action) => !['signalement-visuel-publie', 'memoire'].includes(action.type))
  if (!travaux.length) dire('Rien à programmer.')
  if (ESSAI) {
    for (const action of travaux) dire(`${action.type === 'remplacement-visuel' ? 'SERAIT REMPLACÉE' : 'SERAIT PROGRAMMÉE'} · ${decrireAction(action)}`)
    return
  }
  if (!actions.length) return
  await executer(actions, contexte)
  if (travaux.length) dire(`Journal ${path.relative(RACINE, JOURNAL).replace(/\\/g, '/')} mis à jour par le script : ne rien y recopier à la main. Premier commentaire à poster dans la minute de chaque parution.`)
}

try {
  if (!PLAN_JSON && !ESSAI) prendreVerrou()
  if (!fs.existsSync(CHEMIN_MAITRE)) arreter(`Fichier maitre absent : ${cheminMaitreBrut}`)
  const maitre = fs.readFileSync(CHEMIN_MAITRE, 'utf8')
  const calendrier = lireCalendrier(maitre)
  const ancre = resoudreAncre(maitre, calendrier)
  const plan = construirePlan(maitre, calendrier, ancre.valeur)
  if (PLAN_JSON) {
    process.stdout.write(`${JSON.stringify(plan)}\n`)
  } else if (PROGRAMMER) {
    await reprendre(plan, ancre)
  } else {
    informer(`Ancre ${ancre.valeur} (${ancre.origine})`)
    await creerBrouillons(plan)
  }
  if (alerteBenj) process.exitCode = 3
} catch (erreur) {
  informer(`Erreur : ${erreur.message}`)
  process.exitCode = 1
} finally {
  rendreVerrou()
}
