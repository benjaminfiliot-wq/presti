// scripts/garde-pause-qa.mjs — le juge de la pause générale (fiche 026-garde-pause), écrit par Claude Code AVANT le correctif.
// L'exécutant qui le lance n'y touche jamais.
//
//   node scripts/garde-pause-qa.mjs [--racine=<dossier>] [--temoin]
//
// Règle jugée (décision de Benj du 30/09 : les garde-fous automatiques tiennent lieu d'accord à chaque envoi) : quand la pause
// générale est posée, AUCUNE sortie (e-mail, publication, réponse, relance) ne part, par AUCUNE voie ; et, dans le doute
// (lecture de la pause en erreur ou valeur inattendue), rien ne part non plus.
//
//   GP-1  la route cron/relances lit la pause générale AVANT toute lecture de contact et n'envoie rien (ni mail, ni appel au
//         modèle, ni livraison) quand elle est posée ; sans pause, elle relance toujours (une route morte ne passe pas) ;
//   GP-2  l'inventaire : les voies de sortie sont DÉRIVÉES du code (fetch vers Resend, Publora, Graph en écriture, push, SMTP,
//         toute écriture HTTP vers l'extérieur) ; chacune est gardée (la primitive, ou chacun de ses appelants, lit la pause
//         avant l'envoi) ou listée dans exemptions.json (liste fermée, justifiée, sans voie tournée vers un tiers) ; lib/email.ts
//         refuse un e-mail ordinaire sous pause et laisse passer un e-mail critique (l'alerte au fondateur) ;
//   GP-3  fail-closed : lecture de la pause en erreur, levée ou de forme inattendue (absente, null, {}, « false », 0) ⇒ rien ne
//         part, ni par lib/email.ts, ni par les relances, ni par le Crieur ; PAUSE_GENERALE=1 coupe sans interroger la base ;
//   GP-4  Crieur : pause posée ⇒ aucun nouveau dépôt ET deux publications programmées sont suspendues avec confirmation,
//         puis remises en brouillon dans le registre ; refus ou registre illisible ⇒ 503 avec la raison ;
//   GP-5  idempotence : deux passages successifs (l'écriture « envoyée » ayant échoué au premier), deux passages simultanés
//         (le bouton « purges-rgpd » rejoue le cron) ou deux relances du même prospect ne donnent jamais deux mails au même contact ;
//   GP-6  plafond par passage ≤ 100 (limit de la lecture et envois), limite du jour (emails:jour ≤ 100) et arrêt au premier
//         refus de plafond ;
//   GP-7  la pause est relue à CHAQUE élément d'un lot (relances, Crieur) : posée en cours de passage, le lot s'arrête.
//
// Méthode : lecture des sources de la racine (GP-2, GP-1), puis le code réel importé dans des processus enfants sur des doublures
// (scripts/fixtures/026-garde/pause/) — aucun réseau, aucune base, aucun modèle, aucun secret. Une ligne par critère, code 0
// seulement si tout est vert, 1 sinon, 2 si l'appel est invalide ou si un préalable manque. --temoin : l'état actuel de app/ et
// lib/ avec le témoin du lot posé dessus (scripts/fixtures/026-garde/pause/temoin/). N'écrit que sous .orchestre/travail/garde-pause-qa/.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { R, court, lireOptions, creerSortie, sansCommentaires, exemptions, arbreTemoin, inventaire, sources, litLaPauseAvant, lancerEnfant, posix } from './fixtures/026-garde/pause/commun.mjs'

const JUGE = 'garde-pause-qa'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2), { connues: ['enfant'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.valeurs.racine) refuser('--temoin et --racine ne se combinent pas')

if (o.valeurs.enfant) {
  const { jouer, emettre } = await import('./fixtures/026-garde/pause/enfants.mjs')
  emettre(await jouer(o.valeurs.enfant, o.racine))
  process.exit(0)
}

if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
const RAC = o.temoin ? arbreTemoin() : o.racine
for (const p of ['app/api/cron/relances/route.ts', 'lib/agents/pause.ts', 'lib/email.ts']) {
  if (!fs.existsSync(path.join(RAC, p))) { console.log(`${JUGE} : préalable manquant — ${p} absent de ${posix(path.relative(R, RAC)) || '.'}`); process.exit(2) }
}
const lire = (rel) => { try { return fs.readFileSync(path.join(RAC, rel), 'utf8') } catch { return null } }
const IDS = ['GP-1', 'GP-2', 'GP-3', 'GP-4', 'GP-5', 'GP-6', 'GP-7']
const s = creerSortie(JUGE, IDS, `${JUGE} — racine ${o.temoin ? 'état actuel + témoin du lot' : posix(path.relative(R, RAC)) || '.'}`)

// Les observations : un enfant par groupe de scénarios.
const obs = {}, pannes = {}
for (const g of ['relances', 'crieur', 'pause']) { const r = lancerEnfant(CE_SCRIPT, g, RAC); if (r.obs && !r.obs.erreur) obs[g] = r.obs; else pannes[g] = r.erreur ?? `enfant « ${g} » : ${r.obs?.erreur}` }
const R_ = obs.relances, C_ = obs.crieur, P_ = obs.pause
const sans = (g) => ({ echecs: [pannes[g] ?? `groupe ${g} non joué`] })
const parContact = (emails) => { const m = new Map(); for (const e of emails) m.set(e.to, (m.get(e.to) ?? 0) + 1); return m }
const doublons = (emails) => [...parContact(emails)].filter(([, n]) => n > 1).map(([to, n]) => `${n} mails à ${to}`)
const premiereLecture = (obsv, tables) => obsv.lectures.find((l) => tables.includes(l.table))?.seq ?? null
const TABLES_CONTACT = ['relances', 'leads', 'artisans', 'messages']

// ── GP-1 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
await s.critere('GP-1', () => {
  if (!R_) return sans('relances')
  const e = [], n = R_.normal, p = R_.pause, src = sansCommentaires(lire('app/api/cron/relances/route.ts') ?? '')
  if (!/\b(?:pauseGenerale|sortiePermise)\b/.test(src)) e.push('app/api/cron/relances/route.ts ne lit jamais la pause générale (ni pauseGenerale ni sortiePermise)')
  if (n.emails.length !== 3) e.push(`sans pause, ${n.emails.length} relance(s) partie(s) sur 3 dues : la route ne fait plus son travail`)
  if (p.emails.length) e.push(`pause posée : ${p.emails.length} e-mail(s) de relance partent quand même`)
  if (p.ia) e.push(`pause posée : ${p.ia} appel(s) au modèle pour rédiger des relances`)
  if (p.livraison) e.push(`pause posée : le tour de livraison est joué (${p.livraison})`)
  const lues = p.lectures.filter((l) => TABLES_CONTACT.includes(l.table) && l.op === 'select')
  if (lues.length) e.push(`pause posée : ${lues.length} lecture(s) de contacts (${[...new Set(lues.map((l) => l.table))].join(', ')})`)
  const premiere = premiereLecture(n, TABLES_CONTACT), pause = n.pausesLues[0] ?? null
  if (n.emails.length && premiere !== null && (pause === null || pause > premiere)) e.push('la pause n’est lue qu’après la première lecture de contact')
  if (p.corps?.pause !== true) e.push('la réponse de la route sous pause ne dit pas `pause: true`')
  if (p.statut === null || p.statut >= 500) e.push(`sous pause, la route répond ${p.statut ?? p.erreur} (200 attendu : Vercel ne doit pas compter une pause comme une panne)`)
  return { echecs: e, detail: 'pause lue avant toute lecture de contact ; posée : 0 mail, 0 appel au modèle, 0 livraison, 0 lecture de relance ; levée : 3 relances sur 3' }
})

// ── GP-2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
await s.critere('GP-2', () => {
  const e = [], inv = inventaire(RAC), ex = exemptions(), tous = sources(RAC), texte = (f) => tous.get(f) ?? ''
  const TIERS = ['resend', 'publora', 'graph-ecriture', 'smtp', 'messagerie-tierce']
  const exemptes = new Map()
  for (const x of ex.exemptions) {
    const p = inv.find((q) => q.fichier === x.chemin)
    if (!ex.classes.includes(x.classe) || String(x.raison ?? '').length < 60) e.push(`exemption mal formée : ${x.chemin}`)
    else if (!p) e.push(`exemption périmée : ${x.chemin} n'est plus une voie de sortie (à retirer de exemptions.json)`)
    else if (p.marques.some((m) => TIERS.includes(m))) e.push(`exemption interdite : ${x.chemin} écrit vers un tiers (${p.marques.join(', ')})`)
    else exemptes.set(x.chemin, x)
  }
  const gardees = [], vues = []
  for (const p of inv) {
    if (exemptes.has(p.fichier)) { vues.push(`${p.fichier} (exemptée, ${exemptes.get(p.fichier).classe})`); continue }
    if (p.gardeInterne) { gardees.push(p.fichier); vues.push(`${p.fichier} (gardée au point de passage, ${p.importeurs.length} appelant(s))`); continue }
    if (!p.importeurs.length) { e.push(`voie non gardée et sans appelant : ${p.fichier} (${p.marques.join(', ')})`); continue }
    const nus = p.importeurs.filter((i) => !i.noms.some((n) => litLaPauseAvant(texte(i.fichier), n)))
    vues.push(`${p.fichier} (${p.importeurs.length - nus.length}/${p.importeurs.length} appelant(s) gardé(s))`)
    for (const i of nus.slice(0, 6)) e.push(`voie non gardée : ${i.fichier} appelle ${i.noms.join(', ')} de ${p.fichier} sans lire la pause avant`)
    if (nus.length > 6) e.push(`… ${nus.length} appelants non gardés de ${p.fichier} au total`)
    if (!p.importeurs.some((i) => i.noms.length) && !nus.length) gardees.push(p.fichier)
  }
  if (!inv.some((p) => p.marques.includes('resend'))) e.push('aucune voie e-mail trouvée dans le code : le juge ne voit plus Resend (motif à revoir)')
  if (!P_) return { echecs: [...e, pannes.pause ?? 'groupe pause non joué'] }
  const base = P_.courriers.find((c) => c.nom === 'base : true'), sain = P_.sain
  if (!base || base.ordinaire.envoyes !== 0) e.push(`lib/email.ts : un e-mail ordinaire part pendant la pause (${base?.ordinaire.envoyes ?? '?'} appel(s) à Resend)`)
  if (!base || base.critique.envoyes !== 1) e.push('lib/email.ts : l’e-mail critique (alerte au fondateur) ne passe plus sous pause : le fondateur ne saurait rien')
  if (sain.envoyes !== 1) e.push('lib/email.ts : pause levée, l’e-mail ordinaire ne part plus (le point de passage bloque tout)')
  return { echecs: e, detail: `${inv.length} voie(s) de sortie dérivées du code : ${vues.join(' ; ')} ; e-mail ordinaire refusé sous pause, e-mail critique passé` }
})

// ── GP-3 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
await s.critere('GP-3', () => {
  if (!P_ || !R_ || !C_) return sans(!P_ ? 'pause' : !R_ ? 'relances' : 'crieur')
  const e = []
  for (const l of P_.lecture) {
    const attendu = l.nom !== 'base : false'
    if (l.erreur) e.push(`pauseGenerale lève sur « ${l.nom} » : ${l.erreur}`)
    else if (l.etat?.active !== attendu) e.push(`pauseGenerale sur « ${l.nom} » rend active=${l.etat?.active}, ${attendu} attendu`)
  }
  for (const c of P_.courriers) if (c.nom !== 'base : false' && c.ordinaire.envoyes) e.push(`lib/email.ts : « ${c.nom} » ⇒ un e-mail ordinaire part`)
  if (P_.variable.etat?.active !== true || P_.variable.appelsBus) e.push(`PAUSE_GENERALE=1 : active=${P_.variable.etat?.active}, ${P_.variable.appelsBus} appel(s) à la base (0 attendu)`)
  if (P_.variable.courrier.envoyes) e.push('PAUSE_GENERALE=1 : un e-mail ordinaire part')
  const douteux = (g, lot, cle, nom) => { for (const x of [lot.panne, lot.leve, ...lot.douteuses]) { const n = x[cle].length; if (n) e.push(`${nom} : lecture « ${x.nom ?? (x === lot.panne ? 'panne' : 'levée') } » ⇒ ${n} sortie(s) partie(s)`) } }
  douteux('relances', R_, 'emails', 'relances')
  douteux('crieur', C_, 'publications', 'Crieur')
  for (const f of ['app/api/cron/relances/route.ts', 'app/api/cron/crieur/route.ts', 'lib/email.ts', 'lib/agents/sortie.ts']) {
    const t = sansCommentaires(lire(f) ?? '')
    if (/pauseGenerale\s*\(\s*\)\s*\.catch\s*\(\s*\(\s*\)\s*=>\s*\(\s*\{\s*active\s*:\s*false/.test(t) || /catch\s*(?:\([^)]*\))?\s*\{[^}]*\bpermise\s*:\s*true/.test(t)) e.push(`${f} : repli « pas en pause » quand la lecture échoue`)
  }
  return { echecs: e, detail: 'erreur du bus, lecture qui lève, valeur absente, null, {}, « false », 0 ⇒ actif ; aucun mail ni publication dans ces cas ; PAUSE_GENERALE=1 coupe sans interroger la base' }
})

// ── GP-4 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
await s.critere('GP-4', () => {
  if (!C_) return sans('crieur')
  const e = [], n = C_.normal, p = C_.pause, v = C_.pauseSansProgrammee, r = C_.pauseRegistreEnPanne
  if (n.publications.length !== 3 || n.inscriptions !== 3) e.push(`sans pause, ${n.publications.length} dépôt(s) et ${n.inscriptions} inscription(s) pour un lot de 3 : le Crieur ne fait plus son travail`)
  if (p.publications.length || p.inscriptions) e.push(`pause posée : ${p.publications.length} dépôt(s) Publora, ${p.inscriptions} inscription(s) au registre`)
  if (p.corps?.pause !== true) e.push('pause posée : la réponse ne dit pas `pause: true`')
  if (p.corps?.programmees_suspendues !== 2) e.push(`2 publications déjà programmées, programmees_suspendues = ${JSON.stringify(p.corps?.programmees_suspendues)}`)
  if (JSON.stringify(p.suspensions?.slice().sort()) !== JSON.stringify(['pub-existante-1', 'pub-existante-2'])) e.push('les deux suspensions externes exactes ne sont pas confirmées')
  if (p.registre?.length !== 2 || p.registre.some(l => l.statut !== 'brouillon_publora' || l.programmee_pour !== null)) e.push('suspensions externes non inscrites en brouillon sans date')
  if (p.programmations) e.push('pause posée : une nouvelle programmation part')
  const refus = C_.pauseSuspensionRefusee
  if (!refus || refus.statut !== 503 || typeof refus.corps?.erreur !== 'string' || refus.publications.length || refus.programmations || refus.registre?.[0]?.statut !== 'programmee') e.push('suspension externe refusée : absence de 503 ou programmation/registre faussement suspendu')
  if (v.publications.length || v.notifications.length) e.push('sans publication programmée, la pause dépose ou notifie quand même')
  if (r.publications.length) e.push('registre illisible : des dépôts partent')
  if (r.statut !== 503 || typeof r.corps?.erreur !== 'string' || r.corps.erreur.length < 10) e.push(`registre illisible sous pause : ${r.statut} ${JSON.stringify(r.corps)}, 503 avec la raison (\`erreur\`) attendu`)
  return { echecs: e, detail: 'pause ⇒ 0 dépôt, 0 nouvelle programmation, 2 suspensions externes confirmées puis brouillons sans date ; refus externe ou registre illisible ⇒ 503' }
})

// ── GP-5 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
await s.critere('GP-5', () => {
  if (!R_) return sans('relances')
  const e = []
  for (const [nom, x] of [['deux passages (écriture « envoyée » en panne au premier)', R_.deuxPassages], ['deux passages simultanés', R_.simultanes], ['deux relances du même prospect', R_.memeContact]]) {
    if (!x.emails.length) e.push(`${nom} : aucun mail parti, le scénario ne prouve rien`)
    for (const d of doublons(x.emails)) e.push(`${nom} : ${d}`)
  }
  return { echecs: e, detail: 'un mail par contact : deux passages successifs, deux passages simultanés et deux relances du même prospect' }
})

// ── GP-6 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
await s.critere('GP-6', () => {
  if (!R_ || !P_) return sans(!R_ ? 'relances' : 'pause')
  const e = [], g = R_.plafondPassage, lim = g.lectures.find((l) => l.table === 'relances' && l.op === 'select')?.lim ?? null
  if (lim === null || lim > 100) e.push(`lecture des relances dues : limit(${lim}) — 100 au plus attendu`)
  if (g.emails.length > 100) e.push(`150 relances dues : ${g.emails.length} e-mails en un passage, 100 au plus`)
  if (!g.emails.length) e.push('150 relances dues : aucun mail, le scénario ne prouve rien')
  if (R_.refusPlafond.emails.length > 3) e.push(`plafond du jour atteint au 3e envoi : ${R_.refusPlafond.emails.length} appels à sendEmail, la route doit s’arrêter au premier refus`)
  const cle = P_.limite.appels.find((a) => a?.[0] === 'emails:jour')
  if (!cle || !(cle[1] <= 100)) e.push(`lib/email.ts : plafond du jour ${cle ? cle[1] : 'absent'} (emails:jour, 100 au plus)`)
  if (P_.limite.envoyes) e.push('plafond du jour atteint : le mail part quand même')
  return { echecs: e, detail: 'lecture limit ≤ 100 et ≤ 100 envois sur 150 dues ; arrêt au premier refus de plafond ; emails:jour ≤ 100, rien ne part au-delà' }
})

// ── GP-7 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
await s.critere('GP-7', () => {
  if (!R_ || !C_) return sans(!R_ ? 'relances' : 'crieur')
  const e = [], b = R_.bascule, c = C_.bascule
  if (!b.emails.length) e.push('relances : aucun mail, le scénario ne prouve rien')
  if (b.emails.length > 2) e.push(`relances : pause posée au 2e envoi d’un lot de 5, ${b.emails.length} mails au total (la pause n’est lue qu’une fois)`)
  if (!c.publications.length) e.push('Crieur : aucun dépôt, le scénario ne prouve rien')
  if (c.publications.length > 1) e.push(`Crieur : pause posée après le 1er dépôt d’un lot de 3, ${c.publications.length} dépôts au total`)
  return { echecs: e, detail: 'relances : le lot de 5 s’arrête à 2 quand la pause tombe au 2e envoi ; Crieur : le lot de 3 s’arrête à 1' }
})

process.exit(s.finir())
