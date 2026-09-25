#!/usr/bin/env node
// Juge de la tâche 027-01 — le quota mensuel Publora dans scripts/publier-serie.mjs (mode --programmer).
//
// L'incident (20-23/09/2026) : trois créneaux passés sans publication. Le forfait Publora Starter plafonne à 15
// publications PAR PLATEFORME et par mois pour tout l'espace ; 10 parutions de la série 1 et 5 de la série 2, toutes
// « published », l'avaient épuisé (les brouillons ne comptent pas). Chaque create-post répondait HTTP 403 avec le corps
// INCIDENT_403 ci-dessous ; le script le prenait pour une erreur générique (code 1, message tronqué à 240 caractères) :
// personne n'a compris, rien n'a été anticipé. Publora n'expose aucun point d'usage (/usage, /account, /me : 404) :
// le quota se mesure à partir de GET /list-posts.
//
// Hypothèse retenue (non documentée par Publora, à confirmer au 1er octobre 2026) : la période est le MOIS CIVIL À PARIS,
// et l'heure d'une entrée est son scheduledTime, sinon son publishedAt, sinon son createdAt.
//
// Ce que le juge exige (une ligne PASS/FAIL par scénario, le détail de chaque contrôle en dessous) :
//   F0  le faux Publora lui-même : il compte comme le vrai et renvoie le 403 EXACT de l'incident ;
//   Q1  quota consommé = ENTRÉES DE PLATEFORME (pas groupes) published/scheduled/pending/processing du mois civil à Paris
//       (draft et failed exclus, mois précédent exclu ; scheduledTime passe avant publishedAt) ; plafond
//       PUBLORA_QUOTA_MENSUEL (entier > 0) sinon 15 ; ligne d'information « quota Publora : U/P ce mois » ;
//   Q2  quota épuisé et au moins une parution à programmer : aucun create-post ni update-post, « ALERTE BENJ : » avec
//       « quota » qui nomme chaque parution : « pub-NN » suivi, avant la parution suivante nommée, de sa variante, de son
//       canal et de son heure à Paris (« 17:51 », « 17 h 51 ») ; code 3 ;
//   Q3  quota restant R > 0 mais inférieur aux parutions du mois encore à venir : au plus R programmées, les plus proches
//       d'abord, ALERTE une seule fois par mois (marque « quota insuffisant signalé : AAAA-MM » au journal) ; le passage
//       suivant, même situation, n'imprime plus d'ALERTE BENJ sur le quota ;
//   Q3c/Q3d  les parutions « à venir » de Q3 sont celles du MOIS CIVIL, pas celles de l'horizon de 7 jours : une parution
//       à J+10 du même mois compte (Q3c, sinon rien n'est anticipé), une parution du mois suivant ne compte pas (Q3d). Testé en
//       --essai avec --maintenant (l'horloge du script : le mois du quota est celui de --maintenant), seul moyen d'avoir
//       à coup sûr un créneau hors horizon dans le mois et un créneau le mois suivant ;
//   Q4  create-post répond quand même 403 POST_LIMIT_REACHED : ALERTE avec « quota » et la parution visée, aucune autre
//       création dans ce lancement (ni create-post, ni update-post d'un brouillon vers scheduled), aucune ligne
//       « programmée » au journal, code 3 et non 1 ;
//   Q5  --essai : même détection, mêmes alertes, GET seulement, code 3 ;
//   Q6  PUBLORA_QUOTA_MENSUEL=30 avec 15 consommées : programmation normale ; « 0 », « douze », « -5 », « 30abc » sont
//       invalides et valent 15 (ligne d'information « 15/15 » et comportement du quota épuisé) ;
//   Q8  (027-02, relecture du 24/09, essais B3 et B) une parution déjà PROGRAMMÉE au visuel faux, à plus de 3 h de son
//       heure, que le script remplace (update-post status draft PUIS create-post à la même heure). Remplacer coûte une unité
//       du quota du MOIS DE LA PARUTION (hypothèse prudente, voir le faux Publora ci-dessous) :
//   Q8a quota restant de ce mois <= 0 (15/15, 16/15, --essai, et le mois de la parution plutôt que celui du lancement) :
//       AUCUN PUT ni POST chez Publora ; « ALERTE BENJ : » avec « quota » et « visuel » qui nomme la parution (pub-NN,
//       variante, canal, heure à Paris) ; la parution reste programmée, inchangée, et le journal aussi ; code 3 ; en --essai,
//       aucune ligne « SERAIT REMPLACÉE » pour elle ;
//   Q8b quota restant >= 1 : le remplacement réserve une unité, le reste du passage voit une place de moins. Une place et deux
//       besoins (une nouvelle parution plus proche, puis le remplacement) : le remplacement passe d'abord (il protège une
//       parution déjà annoncée), la nouvelle ne part pas, ALERTE sur le quota, code 3 ; deux places : les deux partent ;
//   Q8c la mesure laisse une place mais Publora refuse quand même la création (403 POST_LIMIT_REACHED) APRÈS la remise en
//       brouillon : « ALERTE BENJ : » avec « quota » qui nomme la parution et dit en toutes lettres qu'elle a été remise en
//       brouillon et n'a pas pu être recréée ; note au journal qui le dit ; aucune ligne « programmée » pour elle ; code 3.
//   Q7  non-régression : scripts/publier-serie-qa.mjs reste vert (code 0) et aucune valeur de clé n'est imprimée.
//
// Comment : comme scripts/publier-serie-qa.mjs (section 4). Un faux Publora PERSISTANT (fichier d'état JSON) est injecté
// par `node --import` : `fetch` est remplacé, toute URL inconnue lève une exception, DELETE est interdit. Il compte le
// quota selon l'hypothèse ci-dessus (plus une consommation « hors liste » pour Q4 : parutions supprimées mais comptées),
// refuse une 4e programmée (LimitExceededError) comme le vrai, et répond le 403 POST_LIMIT_REACHED à l'identique quand
// le quota qu'il simule est atteint. Pour Q8, une hypothèse PRUDENTE, non documentée par Publora, celle qui a fait perdre la
// parution dans l'essai B3 de la relecture : une parution programmée remise en brouillon GARDE son unité du mois (le
// compteur de Publora ne redescend pas) ; la recréer en consomme une autre. F0 vérifie que le faux s'y tient. Tout se
// passe dans un bac HORS du dépôt (os.tmpdir()/publora-quota-qa) : copie du
// script, maître factice écrit par le juge, visuels copiés de publications/serie-2/, journal factice, faux Supabase.
// Le jugement porte sur le comportement : appels envoyés (méthode + chemin), code de sortie, lignes qui commencent par
// « ALERTE BENJ : », ligne d'information, contenu du journal factice. Aucune formulation n'est figée au-delà du préfixe
// « ALERTE BENJ : », du mot « quota », des identifiants (pub-NN, canal), de « quota Publora : U/P » et de la marque.
//
// Horloge : les lancements en écriture refusent --maintenant, le maître factice est donc construit sur l'horloge RÉELLE
// (créneaux à +20, +30, +40, +50 min, et +3 h 30 pour la parution déjà programmée de Q8 ; ancre = lundi de la semaine à
// Paris). Le juge refuse de conclure (code 1, « INDÉTERMINÉ ») dans les 4 dernières heures d'un mois ou les 2 premières
// minutes : relancer plus tard. Les cas de Q8a sur le mois de la parution passent en --essai --maintenant (horloge fictive).
//
// Q7 : le vrai maître plans/publications-serie-2.md porte depuis le 24/09 des lignes « PROGRAMMATION BLOQUÉE »
// (n° 14, 15, 16 abandonnées ou postées hors Publora : décision de Benj, un état voulu). Depuis le 25/09,
// publier-serie-qa.mjs juge lui-même le maître réel tel quel et garde ses contrôles de programmation sur une copie neutre
// qu'il écrit hors du dépôt. Q7 le lance dans un bac, sur une copie À L'IDENTIQUE du vrai maître (jamais modifié).
//
// Sûreté : aucun appel réseau réel ; le juge ne lit JAMAIS .env.local (les trois clés sont des valeurs factices
// aléatoires passées dans l'environnement du processus, ce qui dispense le script de lire le fichier) ; aucun fichier
// du dépôt n'est écrit.
//
// Usage : node scripts/publora-quota-qa.mjs     (code 0 si tout passe, 1 sinon)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const RACINE = path.resolve(import.meta.dirname, '..')
const SCRIPT = path.join(RACINE, 'scripts', 'publier-serie.mjs')
const QA_EXISTANTE = path.join(RACINE, 'scripts', 'publier-serie-qa.mjs')
const MAITRE_REEL = path.join(RACINE, 'plans', 'publications-serie-2.md')
const TMP = path.join(os.tmpdir(), 'publora-quota-qa')
const BAC = path.join(TMP, 'bac')
const FAUX = path.join(TMP, 'faux-publora.mjs')
const CLE_PUBLORA = `cle-factice-${crypto.randomBytes(8).toString('hex')}`
const CLE_SUPABASE = `cle-factice-supabase-${crypto.randomBytes(8).toString('hex')}`
const CLES_PROCESSUS = ['PUBLORA_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PUBLORA_QUOTA_MENSUEL']
// Le corps EXACT reçu du 20 au 23/09 (forfait Starter, 15 consommées, 1 demandée).
const INCIDENT_403 = '{"error":"Post limit reached","code":"POST_LIMIT_REACHED","metric":"posts.platform_monthly","message":"Monthly post limit reached. Your Starter plan allows 15 platform posts per month across the workspace.","limit":15,"used":15,"requested":1}'

// ─── Horloge réelle, mois civil à Paris ────────────────────────────────────────────────────────────────

const MAINTENANT = Date.now()
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const partiesParis = (instant) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant)).map((x) => [x.type, x.value]))
  return { annee: Number(p.year), mois: Number(p.month), jour: `${p.year}-${p.month}-${p.day}`, heure: Number(p.hour), minute: Number(p.minute) }
}
// Même conversion que publier-serie.mjs : l'offset de Paris est lu à midi le même jour.
const heureParisEnUtc = (jourIso, heure, minute) => {
  const midi = new Date(`${jourIso}T12:00:00Z`)
  const heureParisMidi = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(midi))
  return new Date(Date.parse(`${jourIso}T${String(heure).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`) - (heureParisMidi - 12) * 3_600_000).toISOString()
}
const ICI = partiesParis(MAINTENANT)
const MOIS = `${ICI.annee}-${String(ICI.mois).padStart(2, '0')}`
const DEBUT_MOIS = Date.parse(heureParisEnUtc(`${MOIS}-01`, 0, 0))
const MOIS_SUIVANT = ICI.mois === 12 ? `${ICI.annee + 1}-01` : `${ICI.annee}-${String(ICI.mois + 1).padStart(2, '0')}`
const FIN_MOIS = Date.parse(heureParisEnUtc(`${MOIS_SUIVANT}-01`, 0, 0))
const lundi = new Date(`${ICI.jour}T00:00:00Z`)
lundi.setUTCDate(lundi.getUTCDate() - ((lundi.getUTCDay() + 6) % 7))
const ANCRE = lundi.toISOString().slice(0, 10)

const indetermine = (raison) => {
  console.log(`INDÉTERMINÉ · ${raison}`)
  console.log('\n❌ le juge n’a rien conclu : relancer plus tard')
  process.exit(1)
}
if (FIN_MOIS - MAINTENANT < 4 * 3_600_000) indetermine(`moins de 4 h avant la fin du mois civil ${MOIS} à Paris : les créneaux du maître factice changeraient de mois ; relancer après minuit`)
if (MAINTENANT - DEBUT_MOIS < 2 * 60_000) indetermine(`le mois civil ${MOIS} commence à peine à Paris ; relancer dans deux minutes`)

// Un créneau à la minute, `minutes` après l'horloge réelle (semaine et jour comptés depuis l'ancre).
const creneauDans = (minutes) => {
  const instant = Math.floor((MAINTENANT + minutes * 60_000) / 60_000) * 60_000
  const p = partiesParis(instant)
  const ecart = Math.round((Date.parse(`${p.jour}T00:00:00Z`) - Date.parse(`${ANCRE}T00:00:00Z`)) / 86_400_000)
  return { semaine: Math.floor(ecart / 7) + 1, jour: JOURS[ecart % 7], heure: p.heure, minute: p.minute, quand: heureParisEnUtc(p.jour, p.heure, p.minute) }
}
// Quatre créneaux à venir, à la minute, dans le mois courant et dans l'horizon de 7 jours.
const CRENEAUX = [20, 30, 40, 50].map(creneauDans)
// Q8 : la parution déjà programmée, à 3 h 30 : au-delà des 3 h sous lesquelles le script ne touche plus une programmée,
// avec une marge qui couvre la durée du juge.
const CRENEAU_LOIN = creneauDans(210)
const creneauxSains = [...CRENEAUX, CRENEAU_LOIN].every((c, i, tous) => Date.parse(c.quand) > MAINTENANT + 10 * 60_000 && Date.parse(c.quand) < FIN_MOIS && (i === 0 || Date.parse(c.quand) > Date.parse(tous[i - 1].quand)))
  && Date.parse(CRENEAU_LOIN.quand) > MAINTENANT + 200 * 60_000
if (!creneauxSains) indetermine(`créneaux incohérents autour d'un changement d'heure : ${[...CRENEAUX, CRENEAU_LOIN].map((c) => c.quand).join(', ')}`)

const dansLeMois = (k) => new Date(DEBUT_MOIS + Math.floor((MAINTENANT - DEBUT_MOIS) * k / 40)).toISOString() // passé, k de 1 à 39
const moisDernier = (k) => new Date(DEBUT_MOIS - k * 6 * 3_600_000).toISOString() // k de 1 à 6 : mois précédent
const futur = (minutes) => new Date(MAINTENANT + minutes * 60_000).toISOString() // à moins de 3 h : dans le mois

// ─── Le bac, hors du dépôt ─────────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(SCRIPT)) { console.log(`FAIL · ${path.relative(RACINE, SCRIPT)} absent`); process.exit(1) }
fs.rmSync(TMP, { recursive: true, force: true })
fs.mkdirSync(path.join(BAC, 'scripts'), { recursive: true })
fs.copyFileSync(SCRIPT, path.join(BAC, 'scripts', 'publier-serie.mjs'))
const VISUELS_SOURCE = { '01': 'pub-11-instagram.jpg', '02': 'pub-12-instagram.jpg', '03': 'pub-14-instagram.jpg', '04': 'pub-15-instagram.jpg' } // JPEG 1080×1350
// Le dossier des visuels ne contient pas le mot « quota » : une alerte qui cite un visuel (« visuel remplacé … avec
// publications/…/pub-03.jpg ») ne doit pas passer pour une alerte sur le quota.
const visuelDe = (num) => `publications/visuels-du-juge/pub-${num}.jpg`
for (const [num, source] of Object.entries(VISUELS_SOURCE)) {
  fs.mkdirSync(path.join(BAC, 'publications', 'visuels-du-juge'), { recursive: true })
  fs.copyFileSync(path.join(RACINE, 'publications', 'serie-2', source), path.join(BAC, visuelDe(num)))
}

const texteDe = (num, variante = 'A') => `Texte factice du juge du quota, publication ${num}, variante ${variante}.`
// Une publication porte soit un indice de CRENEAUX (horloge réelle), soit un créneau explicite `c` (horloge fictive).
const creneauDe = (p) => p.c || CRENEAUX[p.creneau]
const maitreFactice = (publications, ancre = ANCRE) => {
  const lignes = [
    '# Calendrier du juge du quota', '',
    `Semaine 1 = semaine du lundi ${ancre} (\`--ancre=${ancre}\`).`, '',
    '| Semaine | Jour | Heure | Publication | Canal |', '|---|---|---|---|---|',
  ]
  for (const p of publications) {
    const c = creneauDe(p)
    lignes.push(`| ${c.semaine} | ${c.jour} | ${c.heure} h ${String(c.minute).padStart(2, '0')} | n° ${p.num} | ${p.canal} |`)
  }
  lignes.push('')
  for (const p of publications) {
    lignes.push(`# Publication n° ${Number(p.num)} — parution factice ${p.num}`, '')
    if (p.bloquee) lignes.push('> ⛔ **PROGRAMMATION BLOQUÉE — décision factice du juge.**', '')
    lignes.push('## Variante A', '', `> ${texteDe(p.num, 'A')}`, '', '## Variante B', '', `> ${texteDe(p.num, 'B')}`, '', `Visuel : \`${visuelDe(p.num)}\``, '')
  }
  return lignes.join('\n')
}

// ─── Le faux Publora persistant ────────────────────────────────────────────────────────────────────────

fs.writeFileSync(FAUX, `// Faux Publora et faux Supabase du juge publora-quota-qa.mjs (état persistant, fetch remplacé).
import fs from 'node:fs'
import crypto from 'node:crypto'
const FICHIER = process.env.PUBLORA_QUOTA_QA_ETAT
const lire = () => JSON.parse(fs.readFileSync(FICHIER, 'utf8'))
const sauver = (etat) => fs.writeFileSync(FICHIER, JSON.stringify(etat, null, 1))
const json = (statut, corps) => new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json' } })
const COMPTEES = ['published', 'scheduled', 'pending', 'processing']
const OCCUPANTS = ['scheduled', 'pending', 'processing']
const moisParis = (instant) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).format(new Date(instant))
// Comme le vrai (hypothèse du 24/09) : entrées de plateforme, heure = scheduledTime sinon publishedAt sinon createdAt,
// mois civil à Paris ; plus les parutions supprimées mais comptées (horsListe), invisibles dans list-posts.
const consommees = (etat) => {
  const mois = moisParis(Date.now())
  let total = etat.horsListe || 0
  for (const g of Object.values(etat.groupes)) {
    const heure = g.scheduledTime || g.publishedAt || g.createdAt
    if (!heure || moisParis(heure) !== mois) continue
    for (const p of g.platforms || []) if (COMPTEES.includes(p.status)) total++
  }
  return total
}
const corps403 = (limite, utilisees, demandees) => JSON.stringify({ error: 'Post limit reached', code: 'POST_LIMIT_REACHED', metric: 'posts.platform_monthly', message: 'Monthly post limit reached. Your Starter plan allows ' + limite + ' platform posts per month across the workspace.', limit: limite, used: utilisees, requested: demandees })
const occupants = (etat, sauf) => Object.values(etat.groupes).filter((g) => g.postGroupId !== sauf && OCCUPANTS.includes(g.status)).length
globalThis.fetch = async (url, options = {}) => {
  const etat = lire()
  const methode = String(options.method || 'GET').toUpperCase()
  const u = new URL(url)
  const entetes = options.headers || {}
  const chemin = u.pathname
  etat.appels.push(methode + ' ' + u.hostname + chemin)
  const finir = (reponse) => { sauver(etat); return reponse }
  if (methode === 'DELETE') { sauver(etat); throw new Error('DELETE interdit : ' + url) }
  if (u.hostname === 'api.publora.com') {
    const cle = entetes['x-publora-key']
    if (!etat.clesPublora.includes(cle)) etat.clesPublora.push(cle)
    if (methode === 'GET' && chemin.endsWith('/platform-connections')) return finir(json(200, { connections: etat.connexions }))
    if (methode === 'GET' && chemin.endsWith('/list-posts')) return finir(json(200, { posts: Object.values(etat.groupes).map((g) => ({ ...g, media: undefined })), pagination: { hasNextPage: false } }))
    if (methode === 'GET' && chemin.includes('/get-post/')) {
      const g = etat.groupes[chemin.split('/get-post/')[1]]
      return finir(g ? json(200, g) : json(404, { error: 'Post not found' }))
    }
    const corps = options.body ? JSON.parse(options.body) : {}
    if (methode === 'POST' && chemin.endsWith('/create-post')) {
      etat.ecritures.push({ methode, chemin, corps })
      const plateformes = corps.platforms || []
      if (corps.scheduledTime) {
        const utilisees = consommees(etat)
        const demandees = plateformes.length || 1
        if (utilisees + demandees > etat.limite) { etat.refusQuota++; return finir(json(403, corps403(etat.limite, utilisees, demandees))) }
        if (occupants(etat) >= 3) { etat.refusPlafond++; return finir(json(403, { error: 'LimitExceededError' })) }
      }
      const id = 'cree-' + String(++etat.sequence).padStart(3, '0')
      const statut = corps.scheduledTime ? 'scheduled' : 'draft'
      etat.groupes[id] = { postGroupId: id, content: corps.content, status: statut, scheduledTime: corps.scheduledTime || null, publishedAt: null, createdAt: new Date().toISOString(), platforms: plateformes.map((p) => ({ platform: String(p).split('-')[0], platformId: p, status: statut })), media: (corps.mediaUrls || []).map((adresse) => ({ url: adresse, status: 'ready' })) }
      return finir(json(200, { postGroupId: id, scheduledTime: corps.scheduledTime || null }))
    }
    if (methode === 'PUT' && chemin.includes('/update-post/')) {
      etat.ecritures.push({ methode, chemin, corps })
      const id = chemin.split('/update-post/')[1]
      const g = etat.groupes[id]
      if (!g) return finir(json(404, { error: 'Post not found' }))
      if (corps.status === 'scheduled' && g.status !== 'scheduled') {
        const utilisees = consommees(etat)
        const demandees = (g.platforms || []).length || 1
        if (utilisees + demandees > etat.limite) { etat.refusQuota++; return finir(json(403, corps403(etat.limite, utilisees, demandees))) }
        if (occupants(etat, id) >= 3) { etat.refusPlafond++; return finir(json(403, { error: 'LimitExceededError' })) }
      }
      // Hypothèse prudente (non documentée par Publora ; essai B3 de la relecture du 24/09) : une parution programmée
      // remise en brouillon GARDE son unité du mois, le compteur ne redescend pas. Elle rejoint les unités hors liste.
      if (corps.status === 'draft' && OCCUPANTS.includes(g.status)) {
        const heure = g.scheduledTime || g.publishedAt || g.createdAt
        if (heure && moisParis(heure) === moisParis(Date.now())) etat.horsListe = (etat.horsListe || 0) + (g.platforms || []).filter((p) => COMPTEES.includes(p.status)).length
      }
      Object.assign(g, { status: corps.status || g.status, scheduledTime: corps.scheduledTime || g.scheduledTime, content: corps.content || g.content })
      for (const p of g.platforms || []) p.status = g.status
      return finir(json(200, { success: true, postGroup: { _id: id, status: g.status }, scheduledTime: g.scheduledTime }))
    }
  }
  if (u.hostname === 'media.test') {
    if (!etat.medias[u.href]) return finir(json(404, { error: 'media absent' }))
    return finir(new Response(fs.readFileSync(etat.medias[u.href]), { status: 200 }))
  }
  if (u.hostname === 'faux.supabase.co') {
    if (methode === 'GET' && chemin === '/storage/v1/bucket') return finir(json(200, [{ id: 'promo', name: 'promo', public: true }]))
    if (methode === 'POST' && chemin === '/storage/v1/object/list/promo') {
      const prefixe = JSON.parse(options.body).prefix || ''
      return finir(json(200, Object.keys(etat.objets).filter((cle) => cle.startsWith(prefixe)).map((cle) => ({ name: cle.slice(prefixe.length + (prefixe ? 1 : 0)), id: crypto.createHash('md5').update(cle).digest('hex'), metadata: { size: Buffer.from(etat.objets[cle], 'base64').length } }))))
    }
    if (methode === 'GET' && chemin.startsWith('/storage/v1/object/public/promo/')) {
      const cle = decodeURIComponent(chemin.slice('/storage/v1/object/public/promo/'.length))
      return finir(etat.objets[cle] ? new Response(Buffer.from(etat.objets[cle], 'base64'), { status: 200 }) : json(404, { error: 'absent' }))
    }
    if (methode === 'POST' && chemin.startsWith('/storage/v1/object/promo/')) {
      etat.objets[decodeURIComponent(chemin.slice('/storage/v1/object/promo/'.length))] = Buffer.from(options.body).toString('base64')
      return finir(json(200, { Key: 'ok' }))
    }
  }
  sauver(etat)
  throw new Error('appel inattendu dans le faux reseau : ' + methode + ' ' + url)
}
`)

// ─── Fixtures ──────────────────────────────────────────────────────────────────────────────────────────

let numeroHorsSerie = 0
// Parution hors série (série 1, autres comptes…) : elle ne compte que pour le quota et le plafond.
const horsSerie = ({ statut, plateformes, scheduledTime = null, publishedAt = null, createdAt = null }) => {
  const id = `hors-serie-${String(++numeroHorsSerie).padStart(3, '0')}`
  return {
    postGroupId: id, content: `Parution hors série n° ${numeroHorsSerie}, sans rapport avec le maître factice.`, status: statut,
    scheduledTime, publishedAt, createdAt: createdAt || scheduledTime || publishedAt,
    platforms: plateformes.map(([canal, s]) => ({ platform: canal, platformId: `${canal}-1`, status: s, ...(publishedAt ? { publishedAt } : {}) })),
    media: [],
  }
}
const publieesCeMois = (nombre, depart = 1) => Array.from({ length: nombre }, (_, i) => horsSerie({ statut: 'published', plateformes: [[i % 2 ? 'instagram' : 'facebook', 'published']], scheduledTime: dansLeMois(depart + i) }))
const deuxPlateformesPubliees = (k) => horsSerie({ statut: 'published', plateformes: [['facebook', 'published'], ['instagram', 'published']], scheduledTime: dansLeMois(k) })

// Q1 : 14 entrées comptées, 2 programmées sur le compte (1 place) ; tout le reste ne compte pas.
const fixtureQ1 = () => [
  deuxPlateformesPubliees(1), //                                                     2 (un groupe, deux entrées)
  horsSerie({ statut: 'partially_published', plateformes: [['facebook', 'published'], ['instagram', 'failed']], scheduledTime: dansLeMois(2) }), // 1
  ...publieesCeMois(5, 3), //                                                         5
  // Minuit et demie le 1er à Paris : encore le mois précédent en UTC. Un calcul en UTC la perdrait (1).
  horsSerie({ statut: 'published', plateformes: [['facebook', 'published']], scheduledTime: new Date(DEBUT_MOIS + Math.min(30 * 60_000, Math.floor((MAINTENANT - DEBUT_MOIS) / 2))).toISOString() }),
  horsSerie({ statut: 'published', plateformes: [['instagram', 'published']], publishedAt: dansLeMois(9), createdAt: moisDernier(1) }), // 1 (publishedAt)
  horsSerie({ statut: 'published', plateformes: [['facebook', 'published']], createdAt: dansLeMois(10) }), // 1 (createdAt seul)
  horsSerie({ statut: 'scheduled', plateformes: [['facebook', 'scheduled']], scheduledTime: futur(120) }), // 1, occupe le plafond
  horsSerie({ statut: 'pending', plateformes: [['facebook', 'pending'], ['instagram', 'processing']], scheduledTime: futur(130) }), // 2, occupe
  // Ne comptent pas :
  horsSerie({ statut: 'draft', plateformes: [['facebook', 'draft']], scheduledTime: dansLeMois(11) }),
  horsSerie({ statut: 'draft', plateformes: [['instagram', 'draft']], createdAt: dansLeMois(12) }),
  horsSerie({ statut: 'draft', plateformes: [['facebook', 'draft'], ['instagram', 'draft']], createdAt: dansLeMois(13) }),
  horsSerie({ statut: 'failed', plateformes: [['instagram', 'failed']], scheduledTime: dansLeMois(14) }),
  horsSerie({ statut: 'failed', plateformes: [['facebook', 'failed']], scheduledTime: dansLeMois(15) }),
  ...[1, 2, 3, 4].map((k) => horsSerie({ statut: 'published', plateformes: [['facebook', 'published']], scheduledTime: moisDernier(k) })),
  horsSerie({ statut: 'published', plateformes: [['instagram', 'published']], scheduledTime: new Date(DEBUT_MOIS - 30 * 60_000).toISOString() }), // la veille à 23 h 30 à Paris
  horsSerie({ statut: 'published', plateformes: [['facebook', 'published']], scheduledTime: moisDernier(5), createdAt: dansLeMois(16) }), // scheduledTime d'abord
  horsSerie({ statut: 'published', plateformes: [['instagram', 'published']], publishedAt: moisDernier(6), createdAt: dansLeMois(17) }), // publishedAt avant createdAt
  // Programmée la veille à 23 h 55 à Paris, partie le 1er à 0 h 01 : scheduledTime passe avant publishedAt, elle est du
  // mois précédent. Un calcul « publishedAt d'abord » la compterait (15).
  horsSerie({ statut: 'published', plateformes: [['facebook', 'published']], scheduledTime: new Date(DEBUT_MOIS - 5 * 60_000).toISOString(), publishedAt: new Date(DEBUT_MOIS + Math.min(60_000, Math.floor((MAINTENANT - DEBUT_MOIS) / 2))).toISOString() }),
]
const QUINZE_CONSOMMEES = () => [deuxPlateformesPubliees(1), ...publieesCeMois(13, 2)]

const ENTETE_JOURNAL = ['# Journal factice du juge du quota', '', '| Créé le | Programmé | Canal | N° | Variante | postGroupId |', '|---|---|---|---|---|---|']
const creerCas = (nom, { publications, groupes = [], brouillons = [], programmees = [], limite = 15, horsListe = 0, ancre = ANCRE }) => {
  const dossier = path.join(BAC, 'cas', nom)
  fs.mkdirSync(dossier, { recursive: true })
  const maitre = path.join(dossier, 'maitre.md')
  const journal = path.join(dossier, 'journal.md')
  const etatF = path.join(dossier, 'etat.json')
  fs.writeFileSync(maitre, maitreFactice(publications, ancre))
  const etat = {
    connexions: [{ platformId: 'facebook-1', tokenStatus: 'valid' }, { platformId: 'instagram-1', tokenStatus: 'valid' }],
    groupes: {}, medias: {}, objets: {}, sequence: 0, limite, horsListe,
    appels: [], ecritures: [], refusQuota: 0, refusPlafond: 0, clesPublora: [],
  }
  for (const g of groupes) etat.groupes[g.postGroupId] = g
  const lignes = [...ENTETE_JOURNAL]
  for (const num of brouillons) {
    const p = publications.find((x) => x.num === num)
    const id = `brouillon-${num}`
    const adresse = `https://media.test/${id}`
    etat.medias[adresse] = path.join(BAC, visuelDe(num))
    etat.groupes[id] = { postGroupId: id, content: texteDe(num, 'A'), status: 'draft', scheduledTime: null, publishedAt: null, createdAt: dansLeMois(18), platforms: [{ platform: p.canal, platformId: `${p.canal}-1`, status: 'draft' }], media: [{ url: adresse, status: 'ready' }] }
    lignes.push(`| ${ICI.jour} | brouillon | ${p.canal} | ${num} | A | ${id} |`)
  }
  // Q8 : parution déjà PROGRAMMÉE à son heure et journalisée, dont le média en ligne est le visuel d'une AUTRE
  // publication (visuel faux) : le script voudra la remplacer.
  for (const { num, visuelFaux } of programmees) {
    const p = publications.find((x) => x.num === num)
    const c = creneauDe(p)
    const id = `programmee-${num}`
    const adresse = `https://media.test/${id}`
    etat.medias[adresse] = path.join(BAC, visuelDe(visuelFaux))
    etat.groupes[id] = { postGroupId: id, content: texteDe(num, 'A'), status: 'scheduled', scheduledTime: c.quand, publishedAt: null, createdAt: dansLeMois(19), platforms: [{ platform: p.canal, platformId: `${p.canal}-1`, status: 'scheduled' }], media: [{ url: adresse, status: 'ready' }] }
    lignes.push(`| ${ICI.jour} | ${c.quand} | ${p.canal} | ${num} | A | ${id} |`)
  }
  fs.writeFileSync(journal, `${lignes.join('\n')}\n`)
  fs.writeFileSync(etatF, JSON.stringify(etat, null, 1))
  return { nom, maitre, journal, etatF }
}

const environnementPropre = (supplement = {}) => {
  const env = { ...process.env }
  for (const cle of CLES_PROCESSUS) delete env[cle]
  return { ...env, PUBLORA_API_KEY: CLE_PUBLORA, NEXT_PUBLIC_SUPABASE_URL: 'https://faux.supabase.co', SUPABASE_SERVICE_ROLE_KEY: CLE_SUPABASE, ...supplement }
}
const lancer = (cas, { essai = false, env = {}, maintenant = null } = {}) => {
  const journalAvant = fs.readFileSync(cas.journal, 'utf8')
  const etatAvant = JSON.parse(fs.readFileSync(cas.etatF, 'utf8'))
  if (maintenant && !essai) throw new Error('--maintenant n’est permis qu’avec --essai')
  const args = ['--import', pathToFileURL(FAUX).href, path.join(BAC, 'scripts', 'publier-serie.mjs'), `--maitre=${cas.maitre}`, `--journal=${cas.journal}`, '--programmer', ...(essai ? ['--essai'] : []), ...(maintenant ? [`--maintenant=${maintenant}`] : [])]
  const res = spawnSync(process.execPath, args, { cwd: BAC, encoding: 'utf8', timeout: 120_000, env: environnementPropre({ PUBLORA_QUOTA_QA_ETAT: cas.etatF, ...env }) })
  const etat = JSON.parse(fs.readFileSync(cas.etatF, 'utf8'))
  const nouveau = (liste, avant) => liste.slice(avant.length)
  return {
    code: res.status, sortie: res.stdout || '', tout: `${res.stdout || ''}${res.stderr || ''}${res.error ? `\n${res.error.message}` : ''}`,
    etat, etatAvant, journal: fs.readFileSync(cas.journal, 'utf8'), journalAvant,
    appels: nouveau(etat.appels, etatAvant.appels), ecritures: nouveau(etat.ecritures, etatAvant.ecritures),
    refusQuota: etat.refusQuota - etatAvant.refusQuota,
  }
}

// ─── Lectures du résultat ──────────────────────────────────────────────────────────────────────────────

const numeroDe = (ecriture) => (/publication (\d+), variante/.exec(ecriture.corps?.content || '') || [])[1] || (/brouillon-(\d+)/.exec(ecriture.chemin) || [])[1] || '?'
const creations = (r) => r.ecritures.filter((e) => e.methode === 'POST' && e.chemin.endsWith('/create-post'))
const misesAJour = (r) => r.ecritures.filter((e) => e.methode === 'PUT' && e.chemin.includes('/update-post/'))
const alertes = (r) => r.sortie.split(/\r?\n/).filter((ligne) => ligne.startsWith('ALERTE BENJ : '))
const alertesQuota = (r) => alertes(r).filter((ligne) => /quota/i.test(ligne))
// Une parution est « nommée » quand, dans une ALERTE sur le quota, « pub-NN » est suivi, AVANT la parution suivante
// nommée (« pub-MM »), de son canal et, si demandé, de sa variante et de son heure à Paris. Une ligne qui énumère
// « pub-01, pub-02 (instagram, facebook) » ne dit pas quel canal va avec quelle parution : refusée.
// `mots` : expressions que la MÊME ligne d'alerte doit aussi contenir (Q8 : « visuel », « brouillon »…).
const alerteQuotaNomme = (r, num, canal, { creneau = null, variante = null, mots = [] } = {}) => alertesQuota(r).some((ligne) => {
  if (!mots.every((mot) => mot.test(ligne))) return false
  const ancres = [...ligne.matchAll(/pub-\d+/g)]
  return ancres.some((ancre, i) => {
    if (ancre[0] !== `pub-${num}`) return false
    const morceau = ligne.slice(ancre.index, i + 1 < ancres.length ? ancres[i + 1].index : ligne.length)
    if (!morceau.toLowerCase().includes(canal)) return false
    if (variante && !new RegExp(`(?<![\\p{L}\\d])${variante}(?![\\p{L}\\d])`, 'u').test(morceau.slice(`pub-${num}`.length))) return false
    if (creneau && !new RegExp(`(?<!\\d)0?${creneau.heure}\\s*(?::|h)\\s*${String(creneau.minute).padStart(2, '0')}(?!\\d)`).test(morceau)) return false
    return true
  })
})
const nommeeEnEntier = (r, p, mots = []) => alerteQuotaNomme(r, p.num, p.canal, { creneau: creneauDe(p), variante: 'A', mots })
const ligneInfo = (r, utilisees, plafond) => r.tout.split(/\r?\n/).some((ligne) => !ligne.startsWith('ALERTE BENJ') && new RegExp(`quota Publora\\s*:\\s*${utilisees}\\s*/\\s*${plafond}(?!\\d)`, 'i').test(ligne))
const cleImprimee = (r) => r.tout.includes(CLE_PUBLORA) || r.tout.includes(CLE_SUPABASE)
const rangees = (journal) => journal.split(/\r?\n/).map((l) => l.split('|').map((c) => c.trim())).filter((c) => c.length >= 7 && /^\d{4}-\d{2}-\d{2}$/.test(c[1]) && /^\d+$/.test(c[4])).map((c) => ({ programme: c[2], canal: c[3], num: c[4].padStart(2, '0'), id: c[6] }))
const programmeesAuJournal = (journal, num) => rangees(journal).filter((x) => x.num === num && /^\d{4}-\d{2}-\d{2}T/.test(x.programme))
const MARQUE = new RegExp(`quota insuffisant signalé\\s*:\\s*\`?${MOIS}(?!\\d)`, 'g')
const marques = (journal) => (journal.match(MARQUE) || []).length
const masquer = (texte) => String(texte).split(CLE_PUBLORA).join('<clé Publora factice>').split(CLE_SUPABASE).join('<clé Supabase factice>')
const extrait = (journal) => `journal : …\n         ${journal.trim().split(/\r?\n/).filter(Boolean).slice(-10).join('\n         ')}`
const resume = (r) => masquer(`code ${r.code} · écritures ${JSON.stringify(r.ecritures.map((e) => `${e.methode} ${e.chemin.split('/').slice(-1)[0]}${e.chemin.endsWith('/create-post') ? ` pub-${numeroDe(e)}` : ''}${e.corps?.status ? ` ${e.corps.status}` : ''}`))} · refus quota du faux ${r.refusQuota}\n         ${r.tout.split(/\r?\n/).filter(Boolean).slice(0, 22).join('\n         ')}`)
const controlesCommuns = (verifier, r) => {
  verifier('aucune valeur de clé imprimée ; la clé Publora factice du processus est bien celle envoyée', !cleImprimee(r) && JSON.stringify(r.etat.clesPublora) === JSON.stringify([CLE_PUBLORA]), JSON.stringify(r.etat.clesPublora.map(masquer)))
}

// ─── Scénarios ─────────────────────────────────────────────────────────────────────────────────────────

const bilan = []
const scenario = (id, titre, corps) => {
  const controles = []
  const verifier = (libelle, condition, detail = '') => controles.push({ libelle, ok: Boolean(condition), detail })
  let erreur = null
  try { corps(verifier) } catch (e) { erreur = e }
  const ok = !erreur && controles.length > 0 && controles.every((c) => c.ok)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} · ${titre}`)
  let dejaMontre = ''
  for (const c of controles) {
    let detail = ''
    if (!c.ok && c.detail) {
      detail = c.detail === dejaMontre ? '(même lancement que ci-dessus)' : c.detail
      dejaMontre = c.detail
    }
    console.log(`   ${c.ok ? '✓' : '✗'} ${c.libelle}${detail ? `\n       → ${detail}` : ''}`)
  }
  if (erreur) console.log(`   ✗ scénario interrompu : ${masquer(erreur.stack || erreur.message)}`)
  bilan.push({ id, ok })
}

console.log(`Juge du quota Publora · horloge réelle ${new Date(MAINTENANT).toISOString()} · mois civil ${MOIS} à Paris · ancre ${ANCRE} · créneaux ${CRENEAUX.map((c) => `${c.jour} ${c.heure} h ${String(c.minute).padStart(2, '0')}`).join(', ')}`)
console.log(`Bac hors du dépôt : ${BAC}\n`)

scenario('F0', 'le faux Publora compte comme le vrai et renvoie le 403 exact de l’incident', (verifier) => {
  const cas = creerCas('f0-faux', { publications: [{ num: '01', canal: 'facebook', creneau: 0 }], groupes: fixtureQ1() })
  const code = `const appel = async (corps) => { const r = await fetch('https://api.publora.com/api/v1/create-post', { method: 'POST', headers: { 'x-publora-key': 'essai' }, body: JSON.stringify(corps) }); return { status: r.status, corps: await r.text() } }
const q = ${JSON.stringify(CRENEAUX[0].quand)}
const resultats = [await appel({ content: 'a', platforms: ['facebook-1'], scheduledTime: q }), await appel({ content: 'b', platforms: ['instagram-1'], scheduledTime: q }), await appel({ content: 'c', platforms: ['facebook-1'] })]
const brouillon = await fetch('https://api.publora.com/api/v1/update-post/cree-001', { method: 'PUT', headers: { 'x-publora-key': 'essai' }, body: JSON.stringify({ status: 'draft' }) })
resultats.push({ status: brouillon.status, corps: await brouillon.text() }, await appel({ content: 'e', platforms: ['facebook-1'], scheduledTime: q }))
console.log(JSON.stringify(resultats))`
  const res = spawnSync(process.execPath, ['--import', pathToFileURL(FAUX).href, '--input-type=module', '-e', code], { encoding: 'utf8', timeout: 60_000, env: environnementPropre({ PUBLORA_QUOTA_QA_ETAT: cas.etatF }) })
  let resultats = []
  try { resultats = JSON.parse((res.stdout || '').trim()) } catch { resultats = [] }
  verifier('fixture Q1 (14 entrées comptées) : une 15e programmée acceptée (HTTP 200)', resultats[0]?.status === 200, `${res.stdout}${res.stderr}`.slice(0, 400))
  verifier('16e programmée : HTTP 403 et corps IDENTIQUE, octet pour octet, à celui du 20-23/09', resultats[1]?.status === 403 && resultats[1]?.corps === INCIDENT_403, JSON.stringify(resultats[1] || null))
  verifier('un brouillon (sans scheduledTime) ne consomme rien et reste accepté quota plein', resultats[2]?.status === 200, JSON.stringify(resultats[2] || null))
  let refusApres = null
  try { refusApres = JSON.parse(resultats[4]?.corps || 'null') } catch { refusApres = null }
  verifier('Q8, hypothèse prudente : la 15e remise en brouillon (update-post status draft, HTTP 200) garde son unité ; la recréer à quota plein → 403 POST_LIMIT_REACHED', resultats[3]?.status === 200 && resultats[4]?.status === 403 && refusApres?.code === 'POST_LIMIT_REACHED', JSON.stringify(resultats.slice(3)))
})

scenario('Q1', 'quota mesuré en entrées de plateforme du mois civil à Paris (14/15), programmation normale', (verifier) => {
  const cas = creerCas('q1-comptage', { publications: [{ num: '01', canal: 'facebook', creneau: 0 }], groupes: fixtureQ1() })
  const r = lancer(cas)
  verifier('ligne d’information « quota Publora : 14/15 » (groupe à deux plateformes = 2, partially_published = son entrée published, pending + processing, publishedAt puis createdAt, 1er du mois à 0 h 30 à Paris ; draft, failed et mois précédent exclus, scheduledTime de la veille avant un publishedAt du 1er)', ligneInfo(r, 14, 15), resume(r))
  verifier('la ligne d’information n’est pas une ALERTE BENJ, et aucune ALERTE BENJ ne parle de quota (R = 1 = besoin du mois)', alertesQuota(r).length === 0, resume(r))
  verifier('pub-01 programmée normalement : un seul create-post, aucun refus du faux', creations(r).length === 1 && numeroDe(creations(r)[0]) === '01' && creations(r)[0].corps.scheduledTime === CRENEAUX[0].quand && r.refusQuota === 0 && misesAJour(r).length === 0, resume(r))
  verifier('code 0 et pub-01 inscrite au journal à son heure', r.code === 0 && programmeesAuJournal(r.journal, '01').length === 1, resume(r))
  controlesCommuns(verifier, r)
})

const PUBLICATIONS_Q2 = [
  { num: '01', canal: 'facebook', creneau: 0 },
  { num: '02', canal: 'instagram', creneau: 1 }, // brouillon journalisé au bon visuel : update-post si rien ne l'arrête
  { num: '03', canal: 'facebook', creneau: 2, bloquee: true },
]
scenario('Q2', 'quota épuisé (15/15) : ni create-post ni update-post, ALERTE nominative, code 3', (verifier) => {
  const cas = creerCas('q2-epuise', { publications: PUBLICATIONS_Q2, groupes: QUINZE_CONSOMMEES(), brouillons: ['02'] })
  const r = lancer(cas)
  verifier('aucun create-post ni update-post envoyé (le faux n’a eu aucun refus à faire)', creations(r).length === 0 && misesAJour(r).length === 0 && r.refusQuota === 0, resume(r))
  const [p01, p02] = PUBLICATIONS_Q2
  verifier(`« ALERTE BENJ : » avec « quota » qui nomme pub-01 : variante A, facebook, ${creneauDe(p01).heure} h ${String(creneauDe(p01).minute).padStart(2, '0')} à Paris (avant la parution suivante nommée)`, nommeeEnEntier(r, p01), resume(r))
  verifier(`« ALERTE BENJ : » avec « quota » qui nomme pub-02 (le brouillon) : variante A, instagram, ${creneauDe(p02).heure} h ${String(creneauDe(p02).minute).padStart(2, '0')} à Paris`, nommeeEnEntier(r, p02), resume(r))
  verifier('code de sortie 3', r.code === 3, resume(r))
  verifier('aucune ligne ajoutée au tableau du journal (rien n’y est dit programmé), le brouillon pub-02 reste « brouillon »', rangees(r.journal).length === rangees(r.journalAvant).length && programmeesAuJournal(r.journal, '02').length === 0, extrait(r.journal))
  controlesCommuns(verifier, r)
})

const PUBLICATIONS_Q3 = [
  { num: '01', canal: 'facebook', creneau: 0 },
  { num: '02', canal: 'instagram', creneau: 1 },
  { num: '03', canal: 'facebook', creneau: 2 },
]
scenario('Q3a', 'quota insuffisant (13/15, 3 parutions à venir) : au plus 2 programmées, les plus proches, ALERTE + marque', (verifier) => {
  const cas = creerCas('q3a-insuffisant', { publications: PUBLICATIONS_Q3, groupes: [deuxPlateformesPubliees(1), ...publieesCeMois(11, 2)] })
  const r = lancer(cas)
  const nums = creations(r).map(numeroDe)
  verifier('exactement 2 create-post, pub-01 puis pub-02 (les plus proches), aucun 403 provoqué, aucun update-post', JSON.stringify(nums) === '["01","02"]' && r.refusQuota === 0 && misesAJour(r).length === 0, resume(r))
  verifier('pub-01 et pub-02 au journal à leur heure, rien pour pub-03', programmeesAuJournal(r.journal, '01').length === 1 && programmeesAuJournal(r.journal, '02').length === 1 && rangees(r.journal).filter((x) => x.num === '03').length === 0, extrait(r.journal))
  verifier('une ligne « ALERTE BENJ : » contenant « quota »', alertesQuota(r).length >= 1, resume(r))
  verifier(`marque « quota insuffisant signalé : ${MOIS} » écrite une fois au journal`, marques(r.journal) === 1, extrait(r.journal))
  verifier('code de sortie 3', r.code === 3, resume(r))
  controlesCommuns(verifier, r)
})

scenario('Q3b', 'quota insuffisant signalé une seule fois par mois (2 passages, plafond de 3 à une place)', (verifier) => {
  const groupes = [...publieesCeMois(11, 1), horsSerie({ statut: 'scheduled', plateformes: [['facebook', 'scheduled']], scheduledTime: futur(120) }), horsSerie({ statut: 'scheduled', plateformes: [['instagram', 'scheduled']], scheduledTime: futur(125) })]
  const cas = creerCas('q3b-une-fois', { publications: PUBLICATIONS_Q3, groupes })
  const premier = lancer(cas)
  verifier('passage 1 (13/15, une place) : un seul create-post, pub-01', JSON.stringify(creations(premier).map(numeroDe)) === '["01"]' && premier.refusQuota === 0 && misesAJour(premier).length === 0, resume(premier))
  verifier('passage 1 : « ALERTE BENJ : » avec « quota », marque écrite une fois, code 3', alertesQuota(premier).length >= 1 && marques(premier.journal) === 1 && premier.code === 3, `${resume(premier)}\n         ${extrait(premier.journal)}`)
  const second = lancer(cas)
  verifier('passage 2 (14/15, 2 parutions encore à venir, même situation) : aucune ALERTE BENJ sur le quota, code 0', alertesQuota(second).length === 0 && second.code === 0, resume(second))
  verifier('passage 2 : aucune écriture chez Publora, toujours une seule marque au journal', second.ecritures.length === 0 && marques(second.journal) === 1, `${resume(second)}\n         ${extrait(second.journal)}`)
  controlesCommuns(verifier, premier)
  controlesCommuns(verifier, second)
})

// Q3c et Q3d : horloge FICTIVE en --essai (le seul mode où --maintenant est permis). Mardi 3 novembre 2026, 12 h à Paris
// (heure d'hiver) : pub-01 à +1 h (dans l'horizon), pub-02 le vendredi 13/11 (hors horizon, même mois), pub-03 le
// jeudi 3/12 (mois suivant). Le mois du quota est celui de --maintenant : novembre 2026.
const MAINTENANT_FICTIF = '2026-11-03T11:00:00.000Z'
const ANCRE_FICTIVE = '2026-11-02'
const PUBLICATIONS_Q3C = [
  { num: '01', canal: 'facebook', c: { semaine: 1, jour: 'mardi', heure: 13, minute: 0 } },
  { num: '02', canal: 'instagram', c: { semaine: 2, jour: 'vendredi', heure: 18, minute: 0 } },
  { num: '03', canal: 'facebook', c: { semaine: 5, jour: 'jeudi', heure: 18, minute: 0 } },
]
// n entrées publiées en novembre 2026 à Paris (1er novembre, 0 h 30 puis d'heure en heure), dont un groupe à deux
// plateformes, plus deux entrées du 31 octobre à Paris qui ne comptent pas.
const consommeesNovembre = (n) => [
  horsSerie({ statut: 'published', plateformes: [['facebook', 'published'], ['instagram', 'published']], scheduledTime: '2026-10-31T23:30:00.000Z' }),
  ...Array.from({ length: n - 2 }, (_, i) => horsSerie({ statut: 'published', plateformes: [[i % 2 ? 'instagram' : 'facebook', 'published']], scheduledTime: new Date(Date.parse('2026-11-01T00:30:00.000Z') + i * 3_600_000).toISOString() })),
  horsSerie({ statut: 'published', plateformes: [['facebook', 'published']], scheduledTime: '2026-10-31T22:30:00.000Z' }),
  horsSerie({ statut: 'published', plateformes: [['instagram', 'published']], scheduledTime: '2026-10-20T17:00:00.000Z' }),
]
const seraitProgrammee = (r, num) => new RegExp(`^SERAIT PROGRAMMÉE · pub-${num}\\b`, 'm').test(r.sortie)

scenario('Q3c', '--essai --maintenant=3/11/2026 : une parution hors horizon mais du même mois compte dans « à venir » (14/15, 2 à venir)', (verifier) => {
  if (new Date(`${ANCRE_FICTIVE}T00:00:00Z`).getUTCDay() !== 1) throw new Error(`ancre fictive ${ANCRE_FICTIVE} : pas un lundi`)
  const cas = creerCas('q3c-hors-horizon', { publications: PUBLICATIONS_Q3C, groupes: consommeesNovembre(14), ancre: ANCRE_FICTIVE })
  const r = lancer(cas, { essai: true, maintenant: MAINTENANT_FICTIF })
  verifier('seulement des GET, dont list-posts ; journal intact', r.appels.length > 0 && r.appels.every((a) => a.startsWith('GET ')) && r.appels.some((a) => a.endsWith('/list-posts')) && r.journal === r.journalAvant, JSON.stringify(r.appels))
  verifier('ligne d’information « quota Publora : 14/15 » (mois de --maintenant : novembre 2026 à Paris ; le 31 octobre exclu)', ligneInfo(r, 14, 15), resume(r))
  verifier('« ALERTE BENJ : » sur le quota : 1 restante pour 2 parutions à venir en novembre (pub-01 à +1 h, pub-02 le 13/11 hors horizon ; pub-03 de décembre ne compte pas), code 3', alertesQuota(r).length >= 1 && r.code === 3, resume(r))
  verifier('pub-01, la plus proche, serait programmée ; ni pub-02 ni pub-03', seraitProgrammee(r, '01') && !seraitProgrammee(r, '02') && !seraitProgrammee(r, '03'), resume(r))
  controlesCommuns(verifier, r)
})

scenario('Q3d', '--essai --maintenant=3/11/2026 : une parution du mois suivant ne compte pas dans « à venir » (13/15, 2 à venir)', (verifier) => {
  const cas = creerCas('q3d-mois-suivant', { publications: PUBLICATIONS_Q3C, groupes: consommeesNovembre(13), ancre: ANCRE_FICTIVE })
  const r = lancer(cas, { essai: true, maintenant: MAINTENANT_FICTIF })
  verifier('seulement des GET, dont list-posts ; journal intact', r.appels.length > 0 && r.appels.every((a) => a.startsWith('GET ')) && r.appels.some((a) => a.endsWith('/list-posts')) && r.journal === r.journalAvant, JSON.stringify(r.appels))
  verifier('ligne d’information « quota Publora : 13/15 »', ligneInfo(r, 13, 15), resume(r))
  verifier('aucune ALERTE BENJ sur le quota (2 restantes = 2 à venir en novembre ; pub-03 est de décembre), code 0', alertesQuota(r).length === 0 && r.code === 0, resume(r))
  verifier('pub-01 serait programmée', seraitProgrammee(r, '01'), resume(r))
  controlesCommuns(verifier, r)
})

scenario('Q4', 'Publora répond quand même 403 POST_LIMIT_REACHED : ALERTE, arrêt des créations, code 3', (verifier) => {
  // list-posts montre 12 consommées ; 3 parutions supprimées restent comptées par Publora : le vrai compteur est à 15.
  // pub-02 est un brouillon journalisé au bon visuel : après le 403, son update-post vers scheduled serait une autre
  // création (elle consommerait le quota) et ne doit pas être tentée.
  const cas = creerCas('q4-403', { publications: [{ num: '01', canal: 'facebook', creneau: 0 }, { num: '02', canal: 'instagram', creneau: 1 }], groupes: [deuxPlateformesPubliees(1), ...publieesCeMois(10, 2)], horsListe: 3, brouillons: ['02'] })
  const r = lancer(cas)
  verifier('un seul create-post (pub-01), refusé 403 par le faux ; ensuite ni create-post ni update-post du brouillon pub-02', JSON.stringify(creations(r).map(numeroDe)) === '["01"]' && r.refusQuota === 1 && misesAJour(r).length === 0, resume(r))
  verifier('« ALERTE BENJ : » avec « quota » qui nomme la parution visée (pub-01, facebook)', alerteQuotaNomme(r, '01', 'facebook'), resume(r))
  verifier('code de sortie 3 (et non 1)', r.code === 3, resume(r))
  verifier('aucune ligne ajoutée au tableau du journal, le brouillon pub-02 reste « brouillon », aucune ligne « PROGRAMMÉE » en sortie', rangees(r.journal).length === rangees(r.journalAvant).length && programmeesAuJournal(r.journal, '02').length === 0 && !/^PROGRAMMÉE · pub-0[12]/m.test(r.sortie), `${resume(r)}\n         ${extrait(r.journal)}`)
  controlesCommuns(verifier, r)
})

scenario('Q5', '--essai sur un quota épuisé : mêmes alertes, GET seulement, code 3', (verifier) => {
  const cas = creerCas('q5-essai', { publications: PUBLICATIONS_Q2, groupes: QUINZE_CONSOMMEES(), brouillons: ['02'] })
  const r = lancer(cas, { essai: true })
  verifier('seulement des GET, dont list-posts', r.appels.length > 0 && r.appels.every((a) => a.startsWith('GET ')) && r.appels.some((a) => a.endsWith('/list-posts')), JSON.stringify(r.appels))
  verifier('ligne d’information « quota Publora : 15/15 »', ligneInfo(r, 15, 15), resume(r))
  verifier('« ALERTE BENJ : » avec « quota » qui nomme pub-01 (A, facebook, heure à Paris) et pub-02 (A, instagram, heure à Paris)', nommeeEnEntier(r, PUBLICATIONS_Q2[0]) && nommeeEnEntier(r, PUBLICATIONS_Q2[1]), resume(r))
  verifier('aucune ligne « SERAIT PROGRAMMÉE » pour pub-01 ni pub-02', !/^SERAIT PROGRAMMÉE · pub-0[12]/m.test(r.sortie), resume(r))
  verifier('code 3, journal intact', r.code === 3 && r.journal === r.journalAvant, resume(r))
  controlesCommuns(verifier, r)
})

scenario('Q6', 'PUBLORA_QUOTA_MENSUEL : 30 avec 15 consommées programme normalement ; « 0 », « douze », « -5 », « 30abc » valent 15', (verifier) => {
  const publications = [{ num: '01', canal: 'facebook', creneau: 0 }, { num: '02', canal: 'instagram', creneau: 1 }]
  const cas = creerCas('q6-trente', { publications, groupes: QUINZE_CONSOMMEES(), limite: 30 })
  const r = lancer(cas, { env: { PUBLORA_QUOTA_MENSUEL: '30' } })
  verifier('ligne d’information « quota Publora : 15/30 »', ligneInfo(r, 15, 30), resume(r))
  verifier('pub-01 puis pub-02 programmées (2 create-post), aucun refus, aucune ALERTE sur le quota, code 0', JSON.stringify(creations(r).map(numeroDe)) === '["01","02"]' && r.refusQuota === 0 && alertesQuota(r).length === 0 && r.code === 0, resume(r))
  controlesCommuns(verifier, r)
  // Avec 15 consommées, un plafond 0 (ou négatif) accepté donnerait AUSSI « quota épuisé » : seule la ligne
  // d'information « 15/15 » prouve que la valeur invalide a été remplacée par 15. « 30abc » lu par parseInt donnerait 30
  // et une programmation normale : le comportement le prouve.
  for (const valeur of ['0', 'douze', '-5', '30abc']) {
    const invalide = creerCas(`q6-invalide-${valeur.replace(/[^\w]/g, '_')}`, { publications, groupes: QUINZE_CONSOMMEES() })
    const s = lancer(invalide, { env: { PUBLORA_QUOTA_MENSUEL: valeur } })
    verifier(`PUBLORA_QUOTA_MENSUEL=${valeur} (invalide, donc 15) avec 15 consommées : ligne « quota Publora : 15/15 », aucune création, ALERTE sur le quota, code 3`, ligneInfo(s, 15, 15) && creations(s).length === 0 && misesAJour(s).length === 0 && alertesQuota(s).length >= 1 && s.code === 3, resume(s))
  }
})

// ─── Q8 : remplacer le visuel d'une parution déjà programmée coûte une unité du mois de la parution ────────────────────
// pub-03 est programmée à 3 h 30 (CRENEAU_LOIN) et journalisée, avec en ligne le visuel de pub-04 : le script veut la
// remettre en brouillon puis la recréer à la même heure avec le visuel du maître. Le faux garde l'unité d'une programmée
// remise en brouillon (hypothèse prudente, F0) : sans quota pour la recréer, la parution annoncée serait perdue.
const P01_PROCHE = { num: '01', canal: 'facebook', creneau: 0 }
const P03_LOIN = { num: '03', canal: 'facebook', c: CRENEAU_LOIN }
const PROGRAMMEE_03 = [{ num: '03', visuelFaux: '04' }]
const heureDe = (p) => `${creneauDe(p).heure} h ${String(creneauDe(p).minute).padStart(2, '0')}`
const misesAJourDe = (r, id) => misesAJour(r).filter((e) => e.chemin.endsWith(`/update-post/${id}`))
// Nouvelles parutions créées dans le faux pour une publication (texte du maître), programmées à une heure donnée.
const creeesPour = (r, num, quand) => Object.values(r.etat.groupes).filter((g) => g.postGroupId.startsWith('cree-') && g.content === texteDe(num, 'A') && g.status === 'scheduled' && (!quand || g.scheduledTime === quand))
const lignesAjoutees = (avant, apres) => { const deja = new Set(avant.split(/\r?\n/)); return apres.split(/\r?\n/).filter((ligne) => ligne.trim() && !deja.has(ligne)) }
const seraitRemplacee = (r, num) => new RegExp(`^SERAIT REMPLACÉE · pub-${num}\\b`, 'm').test(r.sortie)
// La parution programmée n'a pas bougé : même groupe (statut, heure, média), aucune parution créée, lignes du journal
// identiques (une note ajoutée au journal est permise).
const resteProgrammee = (r, id) => JSON.stringify(r.etat.groupes[id]) === JSON.stringify(r.etatAvant.groupes[id]) && r.etat.groupes[id]?.status === 'scheduled'
  && Object.keys(r.etat.groupes).length === Object.keys(r.etatAvant.groupes).length && JSON.stringify(rangees(r.journal)) === JSON.stringify(rangees(r.journalAvant))
const CRE = /cré(?:e|é|er|ation)/i // créée, recréée, créer, création (pas « créneau »)
const NEGATION = /pas pu|pas été|n.a pas|impossible|échou|refus/i

scenario('Q8a', 'visuel faux sur une programmée, quota du mois de la parution épuisé : ni PUT ni POST, ALERTE nominative, elle reste programmée, code 3', (verifier) => {
  const nommee = (r) => nommeeEnEntier(r, P03_LOIN, [/visuel/i])
  const jugerEcriture = (etiquette, r) => {
    verifier(`${etiquette} : aucun PUT ni POST chez Publora (ni remise en brouillon, ni création)`, r.ecritures.length === 0 && r.refusQuota === 0, resume(r))
    verifier(`${etiquette} : pub-03 reste programmée à son heure avec son média, aucune parution créée, lignes du journal inchangées`, resteProgrammee(r, 'programmee-03'), `${resume(r)}\n         ${extrait(r.journal)}`)
    verifier(`${etiquette} : « ALERTE BENJ : » avec « quota » et « visuel » qui nomme pub-03 : variante A, facebook, ${heureDe(P03_LOIN)} à Paris ; code 3`, nommee(r) && r.code === 3, resume(r))
    controlesCommuns(verifier, r)
  }
  // L'essai B3 de la relecture : 15/15 exactement, la programmée elle-même comprise (14 publiées + pub-03).
  jugerEcriture('15/15 (14 publiées + pub-03 programmée au visuel faux, à 3 h 30)', lancer(creerCas('q8a-quinze', { publications: [P03_LOIN], groupes: [deuxPlateformesPubliees(1), ...publieesCeMois(12, 2)], programmees: PROGRAMMEE_03 })))
  // L'essai B : 16/15 (le compteur dépasse le plafond, avec ou sans l'hypothèse prudente).
  jugerEcriture('16/15 (15 publiées + pub-03 programmée au visuel faux)', lancer(creerCas('q8a-seize', { publications: [P03_LOIN], groupes: QUINZE_CONSOMMEES(), programmees: PROGRAMMEE_03 })))
  // --essai : même décision, annoncée sans « SERAIT REMPLACÉE ».
  const essai = lancer(creerCas('q8a-essai', { publications: [P03_LOIN], groupes: [deuxPlateformesPubliees(1), ...publieesCeMois(12, 2)], programmees: PROGRAMMEE_03 }), { essai: true })
  verifier('--essai 15/15 : seulement des GET, journal intact, aucune ligne « SERAIT REMPLACÉE » pour pub-03', essai.appels.length > 0 && essai.appels.every((a) => a.startsWith('GET ')) && essai.journal === essai.journalAvant && !seraitRemplacee(essai, '03'), resume(essai))
  verifier(`--essai 15/15 : « ALERTE BENJ : » avec « quota » et « visuel » qui nomme pub-03 (A, facebook, ${heureDe(P03_LOIN)}), code 3`, nommee(essai) && essai.code === 3, resume(essai))
  // Le quota qui compte est celui du MOIS DE LA PARUTION, pas celui du lancement : --essai --maintenant=samedi 28/11/2026
  // 12 h à Paris, pub-03 programmée le mardi 1er/12 à 18 h (au visuel faux), plafond 2 (PUBLORA_QUOTA_MENSUEL).
  const p03Decembre = { num: '03', canal: 'facebook', c: { semaine: 2, jour: 'mardi', heure: 18, minute: 0, quand: '2026-12-01T17:00:00.000Z' } }
  const decembreCas = (nom, groupes) => creerCas(nom, { publications: [p03Decembre], groupes, programmees: PROGRAMMEE_03, ancre: '2026-11-23' })
  const decembrePlein = lancer(decembreCas('q8a-decembre-plein', [
    horsSerie({ statut: 'published', plateformes: [['facebook', 'published']], scheduledTime: '2026-11-10T17:00:00.000Z' }), // novembre : 1/2
    horsSerie({ statut: 'scheduled', plateformes: [['instagram', 'scheduled']], scheduledTime: '2026-12-02T11:30:00.000Z' }), // décembre : pub-03 + celle-ci = 2/2
  ]), { essai: true, maintenant: '2026-11-28T11:00:00.000Z', env: { PUBLORA_QUOTA_MENSUEL: '2' } })
  verifier('mois de la parution : novembre 1/2 (une place), décembre 2/2 → pub-03 du 1er/12 n’est pas remplacée (aucune « SERAIT REMPLACÉE »), ALERTE « quota » + « visuel » qui la nomme (A, facebook, 18 h 00), code 3, GET seulement', !seraitRemplacee(decembrePlein, '03') && nommeeEnEntier(decembrePlein, p03Decembre, [/visuel/i]) && decembrePlein.code === 3 && decembrePlein.appels.every((a) => a.startsWith('GET ')), resume(decembrePlein))
  const novembrePlein = lancer(decembreCas('q8a-novembre-plein', consommeesNovembre(15)), { essai: true, maintenant: '2026-11-28T11:00:00.000Z' })
  verifier('mois de la parution : novembre 15/15, décembre 1/15 → pub-03 du 1er/12 SERAIT REMPLACÉE, aucune ALERTE sur le quota', seraitRemplacee(novembrePlein, '03') && alertesQuota(novembrePlein).length === 0, resume(novembrePlein))
})

scenario('Q8b', 'quota restant >= 1 : le remplacement réserve une unité et passe avant une nouvelle parution', (verifier) => {
  // 14/15 (13 publiées + pub-03 programmée au visuel faux) : une place, deux besoins. pub-01 (nouvelle, à +20 min) vient
  // AVANT pub-03 dans le calendrier ; le remplacement protège une parution déjà annoncée : c'est lui qui prend la place.
  const une = lancer(creerCas('q8b-une-place', { publications: [P01_PROCHE, P03_LOIN], groupes: [deuxPlateformesPubliees(1), ...publieesCeMois(11, 2)], programmees: PROGRAMMEE_03 }))
  const put = misesAJourDe(une, 'programmee-03')
  verifier('une place : un seul PUT (pub-03 status draft), un seul create-post, celui du remplacement de pub-03 à son heure avec le visuel du maître ; rien pour pub-01 ; aucun refus du faux', misesAJour(une).length === 1 && put.length === 1 && put[0].corps.status === 'draft'
    && JSON.stringify(creations(une).map(numeroDe)) === '["03"]' && creations(une)[0].corps.scheduledTime === CRENEAU_LOIN.quand && /\/pub-03-[0-9a-f]+\.jpg$/.test(creations(une)[0].corps.mediaUrls?.[0] || '') && une.refusQuota === 0, resume(une))
  verifier('une place : dans Publora, une nouvelle pub-03 programmée à son heure, aucune pub-01 ; au journal, rien pour pub-01', creeesPour(une, '03', CRENEAU_LOIN.quand).length === 1 && creeesPour(une, '01').length === 0 && rangees(une.journal).filter((x) => x.num === '01').length === 0, `${resume(une)}\n         ${extrait(une.journal)}`)
  verifier('une place pour deux besoins : « ALERTE BENJ : » sur le quota, code 3', alertesQuota(une).length >= 1 && une.code === 3, resume(une))
  controlesCommuns(verifier, une)
  // 13/15 : deux places, deux besoins : les deux partent, sans ALERTE sur le quota (le remplacement a réservé la sienne).
  const deux = lancer(creerCas('q8b-deux-places', { publications: [P01_PROCHE, P03_LOIN], groupes: [deuxPlateformesPubliees(1), ...publieesCeMois(10, 2)], programmees: PROGRAMMEE_03 }))
  verifier('deux places : un PUT (pub-03 status draft) et deux create-post (pub-01 à son heure, remplacement de pub-03 à la sienne), aucun refus, aucune ALERTE sur le quota', misesAJour(deux).length === 1 && misesAJourDe(deux, 'programmee-03')[0]?.corps.status === 'draft'
    && JSON.stringify(creations(deux).map(numeroDe).sort()) === '["01","03"]' && creeesPour(deux, '01', CRENEAUX[0].quand).length === 1 && creeesPour(deux, '03', CRENEAU_LOIN.quand).length === 1 && deux.refusQuota === 0 && alertesQuota(deux).length === 0, resume(deux))
  controlesCommuns(verifier, deux)
})

scenario('Q8c', 'Publora refuse la création du remplacement (403) après la remise en brouillon : ALERTE qui le dit, note au journal, code 3', (verifier) => {
  // 13/15 mesurées (12 publiées + pub-03 programmée) : la mesure laisse deux places. Mais 2 parutions supprimées restent
  // comptées par Publora : son compteur est à 15. La remise en brouillon passe, la création est refusée 403.
  const r = lancer(creerCas('q8c-403-remplacement', { publications: [P03_LOIN], groupes: [deuxPlateformesPubliees(1), ...publieesCeMois(10, 2)], programmees: PROGRAMMEE_03, horsListe: 2 }))
  verifier('un PUT (pub-03 status draft) puis un create-post du remplacement de pub-03, refusé 403 POST_LIMIT_REACHED par le faux ; rien d’autre', misesAJour(r).length === 1 && misesAJourDe(r, 'programmee-03')[0]?.corps.status === 'draft' && JSON.stringify(creations(r).map(numeroDe)) === '["03"]' && r.refusQuota === 1, resume(r))
  verifier(`« ALERTE BENJ : » avec « quota » qui nomme pub-03 (facebook, ${heureDe(P03_LOIN)} à Paris) et dit en toutes lettres qu’elle a été remise en brouillon et n’a pas pu être recréée`, alerteQuotaNomme(r, '03', 'facebook', { creneau: CRENEAU_LOIN, mots: [/brouillon/i, CRE, NEGATION] }), resume(r))
  const notes = lignesAjoutees(r.journalAvant, r.journal).filter((ligne) => !ligne.trim().startsWith('|') && /pub-03|programmee-03/.test(ligne) && /brouillon/i.test(ligne) && CRE.test(ligne) && NEGATION.test(ligne))
  verifier('note au journal : pub-03 remise en brouillon, pas recréée', notes.length >= 1, extrait(r.journal))
  verifier('aucune ligne du journal ne dit pub-03 programmée (ni l’ancienne, ni une nouvelle)', programmeesAuJournal(r.journal, '03').length === 0, extrait(r.journal))
  verifier('code de sortie 3 (et non 1)', r.code === 3, resume(r))
  controlesCommuns(verifier, r)
})

scenario('Q7', 'non-régression : scripts/publier-serie-qa.mjs reste vert sur le vrai maître, aucune clé imprimée', (verifier) => {
  const bacQa = path.join(TMP, 'q7')
  fs.mkdirSync(path.join(bacQa, 'scripts'), { recursive: true })
  fs.mkdirSync(path.join(bacQa, 'plans'), { recursive: true })
  fs.copyFileSync(SCRIPT, path.join(bacQa, 'scripts', 'publier-serie.mjs'))
  fs.copyFileSync(QA_EXISTANTE, path.join(bacQa, 'scripts', 'publier-serie-qa.mjs'))
  fs.copyFileSync(MAITRE_REEL, path.join(bacQa, 'plans', 'publications-serie-2.md'))
  const maitre = fs.readFileSync(path.join(bacQa, 'plans', 'publications-serie-2.md'), 'utf8')
  const bloquees = maitre.split('\n').filter((ligne) => /PROGRAMMATION BLOQU[ÉE]E/.test(ligne)).length
  const images = new Set()
  for (const source of [maitre, fs.readFileSync(QA_EXISTANTE, 'utf8')]) {
    for (const m of source.matchAll(/((?:publications|public)\/[\w./-]+\.(?:jpe?g|png|webp))/g)) images.add(m[1])
  }
  for (const image of images) {
    if (!fs.existsSync(path.join(RACINE, image))) continue
    fs.mkdirSync(path.dirname(path.join(bacQa, image)), { recursive: true })
    fs.copyFileSync(path.join(RACINE, image), path.join(bacQa, image))
  }
  verifier(`bac de la QA existante prêt : copie à l’identique du vrai maître (${bloquees} ligne(s) « PROGRAMMATION BLOQUÉE », jugées par la QA elle-même), ${images.size} visuel(s) copié(s)`, maitre === fs.readFileSync(MAITRE_REEL, 'utf8') && maitre.length > 0 && images.size > 0)
  const res = spawnSync(process.execPath, [path.join(bacQa, 'scripts', 'publier-serie-qa.mjs')], { cwd: bacQa, encoding: 'utf8', timeout: 600_000, env: environnementPropre() })
  const tout = `${res.stdout || ''}${res.stderr || ''}${res.error ? `\n${res.error.message}` : ''}`
  const echecs = tout.split(/\r?\n/).filter((ligne) => /❌/.test(ligne))
  const derniere = tout.trim().split(/\r?\n/).slice(-1)[0] || ''
  verifier(`node scripts/publier-serie-qa.mjs sort en 0 (${masquer(derniere.trim())})`, res.status === 0, masquer(`code ${res.status}\n       ${echecs.slice(0, 12).join('\n       ')}`))
  verifier('aucune valeur de clé factice injectée n’apparaît dans sa sortie', !tout.includes(CLE_PUBLORA) && !tout.includes(CLE_SUPABASE), 'une clé factice a été imprimée')
})

const verts = bilan.filter((b) => b.ok).length
console.log(`\n${verts === bilan.length ? '✅' : '❌'} ${verts}/${bilan.length} scénarios verts${verts === bilan.length ? '' : ` · rouges : ${bilan.filter((b) => !b.ok).map((b) => b.id).join(', ')}`}`)
process.exit(verts === bilan.length ? 0 : 1)
