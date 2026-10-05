#!/usr/bin/env node
// scripts/juges-026-pilotage-mutations.mjs — la contre-vérification des juges du Pilotage et de la station, hors écran
// (fiche 026-130). Elle prouve, sur des COPIES, que chaque juge de logique, de base, de route, de gestes et de réunion échoue
// sur une vraie faute avec le critère nommé et passe sur la copie intacte (le témoin). Elle ne corrige jamais un juge, un jeu
// d'essai ni le dépôt : toutes les écritures vont sous .orchestre/travail/026-130/ (les copies, supprimées ensuite) et
// .orchestre/preuves/026-130/ (le rapport, ses journaux).
//
//   node scripts/juges-026-pilotage-mutations.mjs [--lister] [--garder] [--groupe=<clé>] [--seul=<critère>] [--voie=<n>]
//        [--temoins] [--sans-temoin]
//
//   --lister         prépare les mutations (une ancre exacte, présente une seule fois dans son fichier) et les affiche, sans rien lancer.
//   --groupe=<clé>   ne lance que ce groupe (un juge et sa partie) ; --seul=<critère> ne lance que les mutations de ce critère ;
//   --voie=<n>       ne lance que les groupes de la voie n (une copie) ; --temoins ne lance que les témoins ; --sans-temoin lance les
//                    mutations d'un groupe même si son témoin est rouge. Ces cinq options servent à développer le catalogue : elles écrivent
//                    un rapport PARTIEL (le méta-juge, lui, lance le script sans option).
//   --garder         laisse les copies sous .orchestre/travail/026-130/ (sans jonction) pour l'enquête.
//
// Méthode. Cinq VOIES tournent en parallèle, chacune sur SA copie de l'arbre de travail ; dans une voie, les groupes (un juge et sa
// partie) se suivent :
//   1. la copie : lib/ seule pour les quatre groupes qui font `npm run typecheck` (profil « tsc »), app/, lib/, supabase/, docs/agents,
//      scripts/chef et deux scripts pour les autres (profil « complet ») ; jonction vers node_modules ; jamais un .env ;
//   2. le TÉMOIN : le juge sur la copie intacte, code 0 exigé. Un témoin rouge interdit toutes les mutations de son groupe : la cause
//      exacte est écrite en tête du rapport et le script sort en code 1 ;
//   3. chaque MUTATION : UN remplacement de texte exact dans la copie, le juge relancé, code ≠ 0 exigé avec la ligne en échec du critère
//      nommé (une seule, « FAIL <critère> — … ») et le bilan « <juge> : FAIL — … » qui le nomme ; la copie est remise à l'identique
//      après chaque passage. Une mutation que le juge n'attrape pas est écrite EN TÊTE du rapport, le script sort en code 1 et le juge
//      n'est pas corrigé ici.
//
// Les juges écrivent « ✅ ID … » / « ❌ ID … » ; le méta-juge (scripts/juges-026-mutations-preuve.mjs) lit « PASS|FAIL ID — … ». La commande
// consignée de chaque mutation est donc CE script en mode --lancer : il lance le juge (même commande, mêmes options, même code de
// sortie) et ne fait que récrire les lignes de critères (✅ → PASS, ❌ → FAIL, un critère rapporté plusieurs fois devient une seule ligne,
// les lignes de complément sont indentées) ; les autres lignes, dont le bilan, passent telles quelles.
//   node scripts/juges-026-pilotage-mutations.mjs --lancer=<clé> --racine=<dossier>
//
// Aucun --reel, aucun .env.local lu ni copié, aucune base, aucun serveur ni navigateur : avec --racine les juges ci-dessous jugent
// des sources et des doublures, sans réseau hors 127.0.0.1.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

process.env.UV_THREADPOOL_SIZE ||= '32' // la copie des fichiers se fait 32 à la fois (le pool par défaut n'en fait que 4)
const CE_SCRIPT = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(CE_SCRIPT), '..')
const FICHE = '026-130'
const NOM = 'juges-026-pilotage-mutations'
const SELF = 'scripts/juges-026-pilotage-mutations.mjs'
const PREUVES = path.join(ROOT, '.orchestre', 'preuves', FICHE)
const TRAVAIL = path.join(ROOT, '.orchestre', 'travail', FICHE)
const LIMITE_MS = 18.5 * 60_000 // le méta-juge coupe le script à 20 minutes
const DELAI_JUGE_MS = 8 * 60_000

const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const slash = (p) => String(p).split(path.sep).join('/')
const court = (t, n = 200) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const sansAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
const sous = (enfant, parent) => { const r = path.relative(parent, enfant); return !!r && !r.startsWith('..') && !path.isAbsolute(r) }
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

// ── Les groupes : un juge, une partie ────────────────────────────────────────────────────────────────────────────────────
// loader : le juge se lance avec --import ./scripts/ts-loader.mjs (comme le `verifier` de sa fiche). essai : migration → fiche dont le
// compte rendu d'essai à sec (.orchestre/preuves/<fiche>/essai-a-sec.txt) est lu dans le dépôt d'origine, pas dans la copie.
const GROUPES = {
  'logique-decider': { juge: 'scripts/pilotage-logique-qa.mjs', loader: true, args: ['--partie=decider'] },
  'logique-envois': { juge: 'scripts/pilotage-logique-qa.mjs', loader: true, args: ['--partie=envois'] },
  'logique-agents': { juge: 'scripts/pilotage-logique-qa.mjs', loader: true, args: ['--partie=agents'] },
  'push': { juge: 'scripts/pilotage-push-qa.mjs', loader: true, args: [] },
  'sql-lecture': { juge: 'scripts/pilotage-sql-qa.mjs', loader: false, args: ['--migration=lecture'], essai: '026-076' },
  'sql-echanges': { juge: 'scripts/pilotage-sql-qa.mjs', loader: false, args: ['--migration=echanges'], essai: '026-079' },
  'sql-station': { juge: 'scripts/pilotage-sql-qa.mjs', loader: false, args: ['--migration=station'], essai: '026-088' },
  'route': { juge: 'scripts/pilotage-route-qa.mjs', loader: true, args: [] },
  'gestes': { juge: 'scripts/pilotage-gestes-qa.mjs', loader: true, args: [] },
  'station-modules': { juge: 'scripts/station-logique-qa.mjs', loader: true, args: ['--partie=modules'] },
  'station-lecture': { juge: 'scripts/station-route-qa.mjs', loader: true, args: ['--partie=lecture'] },
  'station-reunion-route': { juge: 'scripts/station-route-qa.mjs', loader: true, args: ['--partie=reunion'] },
  'station-reunion': { juge: 'scripts/station-reunion-qa.mjs', loader: false, args: [] },
}
// Les voies : sept copies en parallèle (la machine est partagée avec toutes les sessions du dépôt : plus on a de processus, plus on a de temps
// de calcul). Les quatre groupes qui font `npm run typecheck` (tsc, 40 à 180 s par passage selon la charge) ont chacun leur voie ; les parties
// d'un même juge d'un profil « complet » restent ensemble.
const VOIES = [
  { profil: 'tsc', cles: ['logique-envois'] },
  { profil: 'tsc', cles: ['logique-decider'] },
  { profil: 'tsc', cles: ['logique-agents'] },
  { profil: 'tsc', cles: ['push'] },
  { profil: 'complet', cles: ['sql-echanges', 'sql-lecture'] },
  { profil: 'complet', cles: ['sql-station', 'station-reunion-route', 'gestes', 'station-reunion'] },
  { profil: 'complet', cles: ['station-lecture', 'station-modules', 'route'] },
]
const PROFIL_DE = Object.fromEntries(VOIES.flatMap((v) => v.cles.map((c) => [c, v.profil])))
const commandeConsignee = (cle) => `node ${SELF} --lancer=${cle} --racine={racine}`
const commandeJuge = (cle, racine) => {
  const g = GROUPES[cle]
  const extra = g.essai && path.resolve(racine) !== ROOT ? [`--essai=${slash(path.join(ROOT, '.orchestre', 'preuves', g.essai, 'essai-a-sec.txt'))}`] : []
  return ['node', ...(g.loader ? ['--import', './scripts/ts-loader.mjs'] : []), g.juge, ...g.args, ...extra, `--racine=${slash(racine)}`].join(' ')
}

// ── Le mode --lancer : le juge, ses lignes de critères récrites pour le méta-juge ────────────────────────────────────────
const RE_CRITERE_LIGNE = /^(✅|❌) ([A-Z0-9]{1,5}-[A-Z0-9-]+)(?: (.*))?$/
/** ✅/❌ → PASS/FAIL, une seule ligne par critère (FAIL si l'une des lignes du critère est en échec), les compléments indentés. */
export function recrireLignes(texte) {
  const L = String(texte).split(/\r?\n/)
  const parId = new Map()
  L.forEach((l, i) => {
    const m = RE_CRITERE_LIGNE.exec(l)
    if (!m) return
    const g = parId.get(m[2]) ?? { premiere: i, vues: [] }
    g.vues.push({ i, ok: m[1] === '✅', detail: (m[3] ?? '').replace(/ \(complément\)$/, '') })
    parId.set(m[2], g)
  })
  return L.map((l, i) => {
    const m = RE_CRITERE_LIGNE.exec(l)
    if (!m) return l
    const g = parId.get(m[2])
    if (g.premiere !== i) return `  (complément) ${l}`
    const rouge = g.vues.find((v) => !v.ok)
    const base = rouge ?? g.vues[0]
    return `${rouge ? 'FAIL' : 'PASS'} ${m[2]} — ${base.detail || (rouge ? 'en échec' : 'conforme')}`
  }).join('\n')
}
function lancerJuge(cle, racine) {
  const g = GROUPES[cle]
  if (!g) { console.error(`${NOM} : groupe inconnu : ${cle}`); return 2 }
  const dossier = path.resolve(racine)
  if (!existe(dossier)) { console.error(`${NOM} : --racine introuvable : ${dossier}`); return 2 }
  const commande = commandeJuge(cle, dossier).split(' ')
  const r = spawnSync(process.execPath, commande.slice(1), {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: DELAI_JUGE_MS, windowsHide: true,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  })
  const sortie = sansAnsi(`${r.stdout ?? ''}${r.stderr ? `\n${r.stderr}` : ''}`)
  process.stdout.write(`${recrireLignes(sortie)}\n`)
  if (r.error?.code === 'ETIMEDOUT') { console.log(`${NOM} : le juge dépasse ${DELAI_JUGE_MS / 60_000} min`); return 124 }
  return r.status ?? 1
}

// ── La lecture d'un verdict (celle du méta-juge, 026-001) ────────────────────────────────────────────────────────────────
/** { ligne, defauts[] } : LA ligne « FAIL <critere> — … » (une seule pour cet id) et le bilan « <juge> : FAIL — ids » qui le nomme. */
export function ligneEnEchec(sortie, critere) {
  const L = String(sortie).split(/\r?\n/)
  const siennes = L.map((l) => ({ l, m: /^(PASS|FAIL|SAUTE) (\S+)(?: — |$)/.exec(l) })).filter((x) => x.m && x.m[2] === critere)
  const defauts = []
  let ligne = null
  if (!siennes.length) defauts.push(`aucune ligne « FAIL ${critere} — … »`)
  else if (siennes.length > 1) defauts.push(`${critere} rapporté ${siennes.length} fois`)
  else if (siennes[0].m[1] !== 'FAIL' || !siennes[0].l.startsWith(`FAIL ${critere} — `)) defauts.push(`${critere} rapporté ${siennes[0].m[1]}`)
  else ligne = siennes[0].l
  const b = L.map((l) => /^([\w.-]+(?: --[a-z][a-z0-9-]*(?:=[A-Za-z0-9_./=-]+)?)*) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1)
  if (!b) defauts.push('aucun bilan « … : FAIL — ids »')
  else if (b[2] !== 'FAIL') defauts.push(`bilan ${b[2]}`)
  else if (!(b[3] || '').split(/,\s*/).map((x) => x.trim()).includes(critere)) defauts.push(`le bilan ne nomme pas ${critere}`)
  if (/^\s+at .*:\d+:\d+/m.test(String(sortie))) defauts.push('stack d’infrastructure dans la sortie')
  return { ligne: defauts.length ? null : ligne, defauts }
}

// ── Le catalogue des mutations ───────────────────────────────────────────────────────────────────────────────────────────
// Une mutation = UN remplacement de texte exact : `avant` (présent une seule fois dans `fichier`) → `apres`. `nom` dit la faute.
const CATALOGUE = []
function ajouter(groupe, critere, fichier, avant, apres, nom) { CATALOGUE.push({ groupe, critere, fichier, avant, apres, nom }) }
/** Variante à ancre en expression régulière : l'ancre doit tomber une seule fois ; `apres` est un texte ou une fonction du texte trouvé. */
function ajouterRe(groupe, critere, fichier, re, apres, nom) { CATALOGUE.push({ groupe, critere, fichier, re, apres, nom }) }

const DEC = 'lib/pilotage/decisions.ts', APP = 'lib/pilotage/appels.ts', LIE = 'lib/pilotage/liens.ts'
// pilotage-logique-qa --partie=decider (026-014)
ajouter('logique-decider', 'DC-3', DEC, 'export const MAX_CARTES = 5', 'export const MAX_CARTES = 6', 'MAX_CARTES passe de 5 à 6 : la sixième décision sort en carte')
ajouter('logique-decider', 'DC-5', DEC, "return d.montant_cents !== null && Number.isFinite(d.montant_cents) && d.montant_cents > 0 ? 'argent' : null", 'return null', 'porteeExigee ignore le montant : une décision chiffrée n’exige plus la portée argent')
ajouter('logique-decider', 'DC-8', LIE, " && UUID.test(o.decision)", '', 'lienPilotage accepte n’importe quelle chaîne en `decision`')
ajouter('logique-decider', 'DC-6', APP, "if (typeof tel !== 'string' || !/^[+\\d\\s.()-]+$/.test(tel)) return null", "if (typeof tel !== 'string') return null; if (/[a-z]/i.test(tel)) return `tel:${tel.replace(/\\s/g, '')}`", 'lienTel garde les lettres : « abc » et javascript:alert(1) deviennent des liens tel:')

// ── Principal ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// pilotage-logique-qa --partie=envois (026-015 réécrite)
const ENV = 'lib/pilotage/envois.ts', ENT = 'lib/pilotage/entonnoir.ts'
ajouter('logique-envois', 'LE-3', ENV, "statut: ligne.statut, metier: ligne.metier ?? null, commune: ligne.commune ?? null,", "statut: ligne.statut, metier: ligne.metier ?? null, commune: ligne.commune ?? null, texte: (ligne as unknown as { texte?: string }).texte ?? null,", 'envoisDesAgents recopie le champ `texte` du message dans chaque envoi')
ajouter('logique-envois', 'LE-4', ENV, "plein: utilises >= plafond, reste:", "plein: utilises >= plafond && plafond > 0, reste:", 'un plafond nul est compté « pas plein »')
ajouter('logique-envois', 'LE-5', ENV, "mesures.some((x) => x == null) ? 'inconnu' : 'vert'", "'vert'", 'santeCanal rend vert quand un compteur est null')
ajouter('logique-envois', 'LE-6', ENV, "e.statut === 'envoye' && !e.complet", "e.statut === 'envoye' && Object.values(e.verdicts).some((v) => v !== null && v !== 'pass')", 'anomalies ne voit plus un verdict null')
ajouter('logique-envois', 'LE-7', ENT, "const froides = presentes.filter((r) => r.froid === true)", "const froides = presentes", 'entonnoir compte aussi les contacts chauds')
ajouter('logique-envois', 'LE-8', ENT, ".slice(0, BILAN.contacts)", ".slice(0, BILAN.contacts + 1)", 'bilan garde 101 contacts au lieu de 100')
// pilotage-logique-qa --partie=agents (026-017)
const AGT = 'lib/pilotage/agents.ts', COD = 'lib/pilotage/code.ts', PUB = 'scripts/pilotage-code-publier.mjs'
ajouter('logique-agents', 'AC-2', AGT, "else if (age > 2 * periode) etat = 'muet'", "else if (age > 3 * periode) etat = 'muet'", 'le seuil de muet passe à trois périodes')
ajouter('logique-agents', 'AC-4', COD, "!liste(x.attention, 7, texte)", "!liste(x.attention, 8, texte)", 'validerSnapshot accepte un attention de 8 lignes')
ajouter('logique-agents', 'AC-6', PUB, "console.log(`publié (${Buffer.byteLength(json, 'utf8')} octets)`)", "console.log(`publié (${Buffer.byteLength(json, 'utf8')} octets) ${cle}`)", 'le script écrit la clé de service sur sa sortie')
ajouter('logique-agents', 'AC-7', PUB, "body: JSON.stringify({ p_etat: etat }),", "body: JSON.stringify({ etat }),", 'le script publie sans la clé p_etat')
// pilotage-push-qa (026-051)
const NOT = 'lib/pilotage/notifications.ts', ALE = 'lib/alertes.ts', PSH = 'lib/push.ts'
ajouter('push', 'PF-3', ALE, "if (charge) envoyerPushFondateurs(charge).catch(", "if (charge) envoyerPushFondateurs({ ...charge, ligne: al.sujet }).catch(", 'le sujet de l’alerte est recopié dans la ligne du push')
ajouter('push', 'PF-5', PSH, ".eq('est_demo', false)", "", 'lireFondateurs sans le filtre est_demo : les comptes de démonstration reçoivent le push')
ajouter('push', 'PF-7', ALE, "if (!simulation && !(await consommerLimite(cle, 1, 86_400))) return false", "if (!simulation && al.a === 'entreprise') { const premier = chargeFondateur(al.motif); if (premier) envoyerPushFondateurs(premier).catch(erreur => console.error('[alertes] push fondateurs :', erreur)) }\n  if (!simulation && !(await consommerLimite(cle, 1, 86_400))) return false", 'le push part avant consommerLimite')

// pilotage-sql-qa --migration=lecture (026-076, migration 0107)
const M107 = 'supabase/migrations/0107_pilotage_lecture.sql', M108 = 'supabase/migrations/0108_pilotage_echanges.sql', M112 = 'supabase/migrations/0112_pilotage_station.sql'
ajouter('sql-lecture', 'SQ-3', M107, "revoke all on function public.pilotage_decision(uuid) from public, anon, authenticated;", "", 'le revoke de pilotage_decision(uuid) est retiré : la fonction reste exécutable par public')
ajouterRe('sql-lecture', 'SQ-5', M107, /where d\.statut = 'ouverte'\n   order by coalesce\(d\.montant_cents, 0\) desc/, (a) => a.replace("where d.statut = 'ouverte'", 'where true'), 'pilotage_decisions sans le filtre statut = ouverte : les décisions tranchées reviennent')
ajouter('sql-lecture', 'SQ-6', M107, "if octet_length(p_etat::text) > 20000 then", "if false then", 'pilotage_code_publier sans la borne de 20 000 octets')
ajouterRe('sql-lecture', 'SQ-7', M107, /returns table\(id uuid, type text, statut text, objet text, derniere_erreur text, preuve_presente boolean, maj_le timestamptz\)[\s\S]*?t\.preuve_url is not null as preuve_presente/, (a) => a.replace('preuve_presente boolean', 'preuve_url text').replace('t.preuve_url is not null as preuve_presente', 't.preuve_url'), 'pilotage_taches_agent rend preuve_url elle-même au lieu de sa seule présence')
// pilotage-sql-qa --migration=echanges (026-079, migration 0108)
ajouter('sql-echanges', 'SE-5', M108, "coalesce((public.acq_envois_du_jour(c.canal)->>'envois')::integer,0),", "(select count(*)::integer from ops.envois e where e.canal=c.canal),", 'pilotage_compteurs_du_jour compte lui-même from ops.envois au lieu de lire acq_envois_du_jour')
ajouter('sql-echanges', 'SE-4', M108, " select a.id,a.source,a.prospect,a.telephone,a.contexte,a.creneau,a.recu_le from (", " with maj as (update ops.reponses set appel_rendu_le = now() where false) select a.id,a.source,a.prospect,a.telephone,a.contexte,a.creneau,a.recu_le from (", 'un update glissé dans pilotage_appels (une lecture qui écrit)')
ajouter('sql-echanges', 'SE-6', M108, "where r.classe='appel' and r.appel_rendu_le is null", "where r.classe='appel' and r.traitee_le is null", 'pilotage_appels filtre sur traitee_le is null au lieu d’appel_rendu_le is null')
ajouter('sql-echanges', 'SE-6', M108, "r.classe='appel'),\n ops.acq_commande_du_prospect(p.id) is not null", "r.classe='appel'),\n exists(select 1 from public.sites_commandes c where c.matiere->>'siren' = p.siren)", 'pilotage_entonnoir recopie la jointure matiere->>siren au lieu de lire acq_commande_du_prospect')
ajouter('sql-echanges', 'SE-7', M108, " select e.id,e.canal,e.technologie,e.type,e.statut,e.envoyeur,p.metier,", " select e.id,e.canal,e.technologie,e.type,e.statut,e.destinataire,p.metier,", 'pilotage_envois_du_jour rend destinataire')
ajouterRe('sql-echanges', 'SE-12', M108, / select v\.id,'rdv'::text[^\n]*\n from ops\.rendez_vous v[^\n]*\n where v\.statut = 'reserve' and v\.appel_rendu_le is null\n union all\n/, '', 'pilotage_appels sans sa source ops.rendez_vous : les rendez-vous réservés ne sortent plus')
// pilotage-sql-qa --migration=station (026-088, migration 0112)
ajouter('sql-station', 'SS-3', M112, "revoke all on function public.station_consigne_transmettre(text, uuid, text) from public, anon, authenticated;", "", 'le revoke de station_consigne_transmettre est retiré')
ajouterRe('sql-station', 'SS-5', M112, /v_id bigint;\nbegin\n  if p_auteur is null or not exists \(select 1 from public\.artisans ar where ar\.id = p_auteur and ar\.is_founder\) then/, (a) => a.replace(' and ar.is_founder', ''), 'station_consigne_transmettre sans le contrôle is_founder de l’auteur')
ajouterRe('sql-station', 'SS-6', M112, /if p_agent is not null and not exists \(select 1 from ops\.agents a where a\.nom = p_agent\) then[\s\S]*?>= 20 then/, (a) => a.replace('>= 20 then', '>= 100000 then'), 'le quota de 20 consignes par jour est retiré de station_consigne_transmettre')
ajouter('sql-station', 'SS-7', M112, "'evenements_jour', (select count(*) from ops.evenements e where e.agent = a.nom and e.le >= v_minuit),", "'evenements_jour', (select count(*) from ops.evenements e where e.agent = a.nom and e.le >= v_minuit), 'dernier', (select e.resume from ops.evenements e where e.agent = a.nom order by e.id desc limit 1),", 'station_reunion_chiffres recopie le resume des événements : un texte libre dans les chiffres')
ajouterRe('sql-station', 'SS-8', M112, /  insert into ops\.evenements \(agent, type, objet, resume\)\n  select 'chef', 'reunion_compte_rendu'[^\n]*\n  insert into ops\.evenements \(agent, type, objet, resume\)\n  values \('chef', 'reunion_close'[^\n]*\n/, '', 'station_reunion_clore sans ses événements reunion_compte_rendu et reunion_close')
ajouter('sql-station', 'SS-13', M112, "case when p_agent is null then 'fondateur' else 'agent:' || p_agent end", "'fondateur'", 'station_consigne_transmettre ignore p_agent : l’objet reste fondateur')

// station-logique-qa --partie=modules (026-070 ; règles nouvelles de la décision Claw3D du 25/09)
const BAR = 'lib/pilotage/barre.ts', EQU = 'lib/pilotage/equipage.ts', ATT = 'lib/pilotage/attention.ts', FIL = 'lib/pilotage/fil.ts', TAP = 'lib/pilotage/tapis.ts', MIS = 'lib/pilotage/missions.ts', EXP = 'lib/pilotage/experience.ts'
ajouter('station-modules', 'SM-1', BAR, "const ecart = cible.getTime() - maintenant.getTime()", "const ecart = cible.getTime() - Date.now()", 'compteARebours lit Date.now() au lieu de l’instant reçu')
ajouter('station-modules', 'BA-3', BAR, "part == null || !Number.isFinite(part) ?", "!Number.isFinite(part ?? 0) ?", 'quota(null) rend « 0 % » au lieu de « non mesuré »')
ajouter('station-modules', 'BA-3', BAR, "const actifs = cartes?.filter(x => x.point === 'cyan').length ?? 0", "const actifs = total", 'AGENTS ACTIFS compte toutes les lignes reçues, pas ceux de la sortie d’equipage au point cyan')
ajouter('station-modules', 'EQ-3', EQU, "const reunion = evenement.type === 'reunion_ouverte' ? true :", "const reunion = evenement.type === 'reunion_ouverte' || nom === 'chef' ? true :", 'positions met tout l’équipage en réunion sur un événement du Chef, sans reunion_ouverte')
ajouter('station-modules', 'EQ-3', EQU, "etat === 'pause' ? { salle: 'repos', motif: 'pause' }", "etat === 'pause' ? { salle: titulaire(a.nom).salle, motif: 'pause' }", 'positions laisse un agent en pause dans sa salle au lieu de la salle de repos')
ajouter('station-modules', 'EQ-3', EQU, "{ salle, motif: taches[agent] ? 'tache' : 'porte' }", "taches[agent] ? { salle, motif: 'tache' } : { salle: 'repos', motif: 'porte' }", 'positions envoie au Repos un agent à la porte (inactif → Repos)')
ajouter('station-modules', 'EQ-4', EQU, "evenement.type === 'battement' || evenement.id != null && etat.vus.includes(evenement.id)", "evenement.id != null && etat.vus.includes(evenement.id)", 'un battement déplace un agent (il compte comme une tâche)')
ajouter('station-modules', 'EQ-5', EQU, "a0:['Veilleur','Surveillance','machines']", "a0:['Veilleur','Surveillance','ecommerce']", 'positions rend la salle réservée ecommerce pour un agent qui la porte')
ajouter('station-modules', 'EQ-6', EQU, "<= 7 * 86400000", "<= 9 * 86400000", 'modeleAffiche rend « vu » pour une ligne vieille de 8 jours')
ajouter('station-modules', 'AT-1', ATT, "export const ORDRE = ['rouge', 'orange', 'jaune', 'bleu'] as const", "export const ORDRE = ['rouge', 'jaune', 'orange', 'bleu'] as const", 'l’ordre des couleurs met le jaune avant l’orange')
ajouter('station-modules', 'AT-2', ATT, "jaune: ['taches_bloquees',", "jaune: ['retrait_echoue','taches_bloquees',", 'retrait_echoue est remis dans COULEUR_DE, en jaune')
ajouter('station-modules', 'AT-3', ATT, "bilan: 'Bilan à décider'", "bilan: 'Envoyer le bilan'", 'un titre de carte commence par « Envoyer » (la station ne propose aucun envoi)')
ajouter('station-modules', 'AT-5', ATT, "geste: geste(cle, x!), agent: x!.agent ?? null, depuis:", "geste: geste(cle, x!), depuis:", 'le champ agent des cartes est retiré de cartesAttention')
ajouter('station-modules', 'FI-1', FIL, String.raw`.replace(/(?<!\w)(?:(?:\+33|0033|0)[\s.()-]*[1-9](?:[\s.()-]*\d){8}|[1-9](?:[\s.()-]*\d){8})(?!\w)/g, '[numéro]')`, "",'masquer laisse passer les numéros de téléphone')
ajouter('station-modules', 'FI-2', FIL, ".filter(x => x && x.type !== 'battement')", ".filter(x => x)", 'bulles garde les battements du fil')
ajouter('station-modules', 'TA-1', TAP, "carres: x.jour - (anciennes.get(x.cle) ?? 0) }", "carres: Math.abs(x.jour - (anciennes.get(x.cle) ?? 0)) }", 'mouvements fait avancer des carrés sur une baisse au lieu de la remise à zéro')
ajouter('station-modules', 'MI-1', MIS, "xp = valeur(mesures.encaisse_eur)", "xp = valeur(mesures.contacts_froids)", 'le niveau est calculé sur les contacts froids au lieu des euros encaissés')
ajouter('station-modules', 'XP-1', EXP, "barre: statut === 'en_cours' ? ", "barre: statut ? ", 'etatExperience montre le compteur d’une expérience arrêtée')

// station-route-qa --partie=lecture (026-092) et --partie=reunion
const RSTA = 'app/api/controle/station/route.ts', STA = 'lib/pilotage/station.ts', RREU = 'app/api/agents/reunion/route.ts'
ajouterRe('station-lecture', 'SV-1', RSTA, /if \(!actif\('pilotage'\)\) return NextResponse\.json\(\{ error: 'Introuvable\.' \}, \{ status: 404 \}\)(\r?\n)  const f = await estFondateur\(req\)\r?\n  if \(estRefus\(f\)\) return reponseRefus\(f\)/, (a) => { const [t, f, r] = a.split(/\r?\n/); return [f, r, t].join(a.includes('\r\n') ? '\r\n' : '\n') }, 'le test du drapeau pilotage est déplacé après estFondateur : un inconnu reçoit 401 au lieu de 404')
ajouter('station-lecture', 'SV-5', STA, "for (const [k, valeur] of Object.entries(x)) y[k] =", "for (const [k, valeur] of Object.entries(x).sort()) y[k] =", 'un .sort( est ajouté dans station.ts : la station trie au lieu de lire')
ajouter('station-lecture', 'SV-6', STA, ".from('alertes').select('motif, cree_le')", ".from('alertes').select('motif, sujet, cree_le')", 'la colonne sujet des alertes est sélectionnée (un texte libre)')
ajouter('station-lecture', 'SV-9', STA, "async function lireSalle(c: Contexte, salle: string) {", "async function lireSalle(c: Contexte, salle: string) { void c.deps.db.rpc('station_reunion_ouvrir', { p_agent: 'chef' });", 'station.ts appelle station_reunion_ouvrir : une lecture qui ouvre une réunion')
ajouter('station-lecture', 'SV-15', STA, "'direct.tapis.paye': 'comptabilite'", "'direct.tapis.paye': 'sante'", 'DOMAINE_DE range l’étape PAYÉ du tapis sous sante au lieu de comptabilite')
ajouter('station-lecture', 'SV-16', STA, "'direct.barre.commandes_mois': 'comptabilite'", "'direct.barre.commandes_mois': 'sante'", 'trier laisse passer commandes_mois quand peut(comptabilite) est faux (sous-partie d’argent servie sans comptabilite)')
ajouter('station-lecture', 'SV-18', STA, "if (salle === 'ecommerce') return { valeur: null,", "if (salle === 'ecommerce') return { valeur: [],", 'vue=salle&salle=ecommerce rend un tableau vide au lieu de l’enveloppe réservée')
ajouter('station-reunion-route', 'RA-1', RREU, "!actif('busAgents') || ", "", 'le test du drapeau busAgents est retiré de la route de réunion')
ajouter('station-reunion-route', 'RA-2', RREU, "p_agent: a.nom, p_id: id, p_lignes: lignes", "p_agent: String(corps.agent ?? a.nom), p_id: id, p_lignes: lignes", 'p_agent est pris du corps de la requête au lieu de l’agent authentifié')
ajouter('station-reunion-route', 'RA-3', RREU, "const lignesOk = Array.isArray(lignes) && lignes.length >= 1 && lignes.length <= 5 && lignes.every((l) => texte(l, 140))", "const lignesOk = true", 'la validation des lignes du compte rendu est retirée')
// station-reunion-qa (026-103)
const REU = 'scripts/chef/reunion.mjs'
// signes() sert au contrôle à la main ET à la validation par le schéma (maxLength) : plafonner son résultat à 120 retire les deux 140 d'un coup.
ajouter('station-reunion', 'RU-3', REU, "const signes = (s) => [...s].length", "const signes = (s) => Math.min(120, [...s].length)", 'la validation des 140 signes par ligne est retirée (le décompte des signes plafonne à 120)')
ajouter('station-reunion', 'RU-4', REU, "minuterie = setTimeout(() => { tuerArbre(enfant.pid); finir('delai') }, o.delai * 1000)", "minuterie = null", 'le délai n’est pas appliqué : un modèle muet n’est jamais interrompu')
ajouter('station-reunion', 'RU-6', REU, "if (id && !close) {", "if (false) {", 'le finally n’abandonne plus la réunion ouverte')
ajouter('station-reunion', 'RU-8', REU, "fs.appendFileSync(JOURNAL, masquer(`${new Date().toISOString()} ${etape}", "fs.appendFileSync(JOURNAL, (`${new Date().toISOString()} ${etape} ${JETON}", 'le jeton est écrit dans le journal')
// pilotage-route-qa (026-068)
const RPIL = 'app/api/controle/pilotage/route.ts', BLO = 'lib/pilotage/blocs.ts'
ajouterRe('route', 'RL-2', RPIL, /if \(!actif\('pilotage'\)\) return NextResponse\.json\(\{ error: 'Introuvable\.' \}, \{ status: 404 \}\)(\r?\n)  const f = await estFondateur\(req\)\r?\n  if \(estRefus\(f\)\) return reponseRefus\(f\)/, (a) => { const [t, f, r] = a.split(/\r?\n/); return [f, r, t].join(a.includes('\r\n') ? '\r\n' : '\n') }, 'le test du drapeau pilotage est déplacé après estFondateur')
ajouter('route', 'RL-5', BLO, "cartesDecisions(exigerLecture(lecture, 'Décisions') as Decision[], options.epingle, maintenant)", "cartesDecisions((exigerLecture(lecture, 'Décisions') as Decision[]).sort(() => 0), options.epingle, maintenant)", 'un .sort( est ajouté dans blocs.ts : le bloc trie au lieu de lire')
ajouter('route', 'RL-6', BLO, "supabaseAdmin.rpc('pilotage_code_lire')", "supabaseAdmin.rpc('ops_etat')", 'blocs.ts lit ops_etat au lieu des fonctions pilotage_*')
// pilotage-gestes-qa (026-074)
const GP = 'app/api/controle/pilotage', GST = `${GP}/gestes/route.ts`, GAG = `${GP}/agents/[nom]/route.ts`, GAP = `${GP}/appels/[id]/route.ts`, GDE = `${GP}/decisions/[id]/route.ts`, GCO = `${GP}/consignes/route.ts`
ajouter('gestes', 'GE-1', GST, "const f = await estDirection(req)", "const f = await estFondateur(req)", 'la route des gestes lit estFondateur au lieu d’estDirection')
ajouter('gestes', 'GE-3', GAG, "const refus = await exigerReconfirmation(req, f.uid, 'securite')", "const refus = b.pause ? await exigerReconfirmation(req, f.uid, 'securite') : null", 'la reconfirmation d’agent n’est demandée que sous pause : la reprise passe sans elle')
ajouter('gestes', 'GE-4', GAP, "supabaseAdmin.rpc('acq_reponse_appel_rendu', { p_reponse: id })", "supabaseAdmin.rpc('acq_envoi_marquer', { p_reponse: id })", 'la route des appels appelle acq_envoi_marquer au lieu de acq_reponse_appel_rendu')
ajouterRe('gestes', 'GE-5', GAG, /  const journalOk = await journaliser\(\{ acteur: f, action: 'agent_pause'[^\n]*\r?\n  if \(!journalOk\) return refusJournal\(\)\r?\n  const resultat = await supabaseAdmin\.rpc\('ops_agent_pause'[^\n]*/, (a) => { const [j, s, r] = a.split(/\r?\n/); return [r, j, s].join(a.includes('\r\n') ? '\r\n' : '\n') }, 'journaliser est appelé après le rpc d’écriture')
ajouter('gestes', 'GE-11', GCO, "apres: { longueur: texte.length, agent }", "apres: { texte, agent }", 'le texte de la consigne est passé à journaliser')
ajouter('gestes', 'GE-12', GAP, "? await supabaseAdmin.rpc('acq_rdv_appel_rendu', { p_id: id })", "? await supabaseAdmin.rpc('acq_reponse_appel_rendu', { p_reponse: id })", '?source=rdv appelle acq_reponse_appel_rendu au lieu de acq_rdv_appel_rendu')
ajouter('gestes', 'GE-13', GST, "const refus = await exigerReconfirmation(req, f.uid, 'securite')", "const refus = action === 'ouvrir_envoi_froid' ? null : await exigerReconfirmation(req, f.uid, 'securite')", 'exigerReconfirmation est retiré du geste ouvrir_envoi_froid')
// Décision du 05/10/2026 soir (0131) : l'épreuve de bout en bout ne ferme plus l'ouverture ; la route qui la rendrait de nouveau bloquante est prise par GE-13 (503 attendu).
ajouter('gestes', 'GE-13', GST, "  'ops:mesure_absente': \"La mesure à sec n'a pas réussi (026-165) : envoi_froid reste fermé.\",\n", "  'ops:mesure_absente': \"La mesure à sec n'a pas réussi (026-165) : envoi_froid reste fermé.\",\n  'ops:epreuve_absente': \"L'épreuve de bout en bout n'a pas encore réussi (026-163) : envoi_froid reste fermé.\",\n", 'la route des gestes refuse de nouveau l\'ouverture faute d\'épreuve de bout en bout (409)')
ajouter('gestes', 'GE-14', GDE,"if (reponseStandard && (!resultat.error || dejaTranchee)) {", "if (false) {", 'acq_reponse_reclasser n’est jamais appelé après le tranchage d’une carte acq:reponse:')
ajouter('gestes', 'GE-15', GCO, "{ p_texte: texte, p_auteur: f.uid, p_agent: agent }", "{ p_texte: texte, p_auteur: f.uid, p_agent: null }", 'la consigne ignore p_agent : la route passe toujours p_agent: null')

// ── Préparation : chaque ancre, une seule fois dans son fichier ──────────────────────────────────────────────────────────
function preparer(m) {
  const chemin = path.join(ROOT, m.fichier)
  if (!existe(chemin)) throw new Error(`${m.critere} ${m.nom} : ${m.fichier} absent du dépôt`)
  const texte = lire(chemin)
  let avant = m.avant
  if (m.re) {
    const re = new RegExp(m.re.source, m.re.flags.includes('g') ? m.re.flags : `${m.re.flags}g`)
    const trouvees = [...texte.matchAll(re)]
    if (trouvees.length !== 1) throw new Error(`${m.critere} ${m.nom} : ancre présente ${trouvees.length} fois dans ${m.fichier} (une seule attendue)`)
    avant = trouvees[0][0]
  }
  const n = texte.split(avant).length - 1
  if (n !== 1) throw new Error(`${m.critere} ${m.nom} : « ${court(avant, 70)} » présent ${n} fois dans ${m.fichier} (une seule attendue)`)
  const apres = typeof m.apres === 'function' ? m.apres(avant) : m.apres
  if (avant === apres) throw new Error(`${m.critere} ${m.nom} : mutation sans changement`)
  return { groupe: m.groupe, critere: m.critere, fichier: m.fichier, avant, apres, nom: m.nom }
}

// ── Les copies ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const PROFILS = {
  // Les quatre groupes qui font `npm run typecheck` (tsc, 40 à 250 s selon la charge de la machine) ne lisent que lib/ (rien dans lib/ n'importe app/ ni
  // components/) et scripts/pilotage-code-publier.mjs : une copie de lib/ seule fait un tsc bien plus court.
  tsc: { dossiers: ['lib'], fichiers: ['scripts/pilotage-code-publier.mjs'] },
  // Les autres juges lisent app/ (routes), lib/ (modules), supabase/ (migrations), docs/agents (schéma du Chef), scripts/chef (réunion) et deux scripts.
  complet: { dossiers: ['app', 'lib', 'supabase', 'docs/agents', 'docs/station', 'scripts/chef'], fichiers: ['scripts/fermeture-e2e.mjs', 'scripts/pilotage-code-publier.mjs'] },
}
// Les jeux d'essai des juges se lisent dans le dépôt d'origine (R) ; la copie n'a besoin que de ce que les juges jugent : on n'y recopie
// ni les autres jeux d'essai de scripts/fixtures/ (plus de mille fichiers), ni les outils de l'usine.
const ECARTES = [/^scripts\/fixtures\/(?!026-pilotage\/)/, /^scripts\/usine\//]
const FICHIERS_RACINE = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']
const LISTES_COPIE = {}
function listeDeCopie(profil) {
  if (LISTES_COPIE[profil]) return LISTES_COPIE[profil]
  const r = spawnSync('git', ['-C', ROOT, 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...PROFILS[profil].dossiers], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  if (r.status !== 0) throw new Error(`git ls-files : ${court(r.stderr)}`)
  LISTES_COPIE[profil] = [...PROFILS[profil].fichiers, ...new Set(r.stdout.split('\0').filter(Boolean))].filter((rel) => !/(^|\/)\.env(\.|$)/.test(rel) && !ECARTES.some((re) => re.test(rel)))
  return LISTES_COPIE[profil]
}
/** La copie de l'arbre de travail sous `dest` (les .env et node_modules exclus, jonction vers node_modules), 32 fichiers à la fois. */
async function copierArbre(dest, profil) {
  const rels = [...listeDeCopie(profil), ...FICHIERS_RACINE].filter((rel) => { try { return fs.lstatSync(path.join(ROOT, rel)).isFile() } catch { return false } })
  const dossiers = new Set(rels.map((rel) => path.dirname(path.join(dest, rel))))
  for (const d of dossiers) fs.mkdirSync(d, { recursive: true })
  let i = 0, n = 0
  const travailleur = async () => {
    while (i < rels.length) {
      const rel = rels[i++]
      try { await fs.promises.copyFile(path.join(ROOT, rel), path.join(dest, rel)); n++ } catch (e) { if (e.code !== 'ENOENT') throw e } // supprimé de l'arbre de travail entre-temps
    }
  }
  await Promise.all(Array.from({ length: 32 }, travailleur))
  if (existe(path.join(ROOT, 'node_modules'))) fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dest, 'node_modules'), 'junction')
  return n
}
/** Supprime une copie : la jonction d'abord (unlink, jamais traversée), le reste ensuite. */
function supprimerCopie(dossier) {
  if (!existe(dossier)) return
  if (!sous(dossier, TRAVAIL)) throw new Error(`suppression refusée hors de ${slash(TRAVAIL)} : ${slash(dossier)}`)
  const jonction = path.join(dossier, 'node_modules')
  try { if (fs.lstatSync(jonction).isSymbolicLink()) fs.unlinkSync(jonction) } catch { /* absente */ }
  fs.rmSync(dossier, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}

// ── Un processus sous délai, arbre tué au besoin ─────────────────────────────────────────────────────────────────────────
function tuerArbre(pid) {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-pid, 'SIGKILL') } catch { /* déjà mort */ }
}
function executer(commande, delaiMs) {
  return new Promise((resoudre) => {
    const enfant = spawn(commande, { cwd: ROOT, shell: true, windowsHide: true, detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
    let sortie = '', expire = false
    const prendre = (d) => { if (sortie.length < 16 * 1024 * 1024) sortie += d }
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', prendre); enfant.stderr.on('data', prendre)
    const t0 = Date.now()
    const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, Math.max(1000, delaiMs))
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 128), sortie: sansAnsi(sortie), expire, duree: (Date.now() - t0) / 1000 }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sansAnsi(sortie)}\n${e.message}`, expire, duree: (Date.now() - t0) / 1000 }) })
  })
}
// La dernière ligne qui compte : le bilan « <juge> : PASS|FAIL … » (les avertissements de Node viennent après), sinon la dernière ligne.
const derniereLigne = (s) => {
  const L = String(s).split(/\r?\n/).filter((l) => l.trim())
  return L.filter((l) => /^[\w.-]+(?: --[a-z][a-z0-9-]*(?:=[A-Za-z0-9_./=-]+)?)* : (?:PASS|FAIL)\b/.test(l)).at(-1) ?? L.at(-1) ?? ''
}

// ── L'invariant (MU-3) : ni juge, ni jeu d'essai, ni outil commun ne bouge ───────────────────────────────────────────────
const GARDES = ['scripts/pilotage-logique-qa.mjs', 'scripts/pilotage-push-qa.mjs', 'scripts/pilotage-sql-qa.mjs', 'scripts/pilotage-route-qa.mjs',
  'scripts/pilotage-gestes-qa.mjs', 'scripts/pilotage-ecran-qa.mjs', 'scripts/pilotage-recette.mjs', 'scripts/station-logique-qa.mjs', 'scripts/station-route-qa.mjs',
  'scripts/station-reunion-qa.mjs', 'scripts/juges-026-mutations-preuve.mjs', 'scripts/juges-026-preuve.mjs', 'scripts/juges-026-pilotage-preuve.mjs']
const DOSSIERS_GARDES = ['scripts/fixtures/026-pilotage/a', 'scripts/fixtures/026-pilotage/b', 'scripts/fixtures/026-pilotage/s', 'scripts/lib']
function empreintes() {
  const m = new Map()
  const parcourir = (d) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n)
      const st = fs.lstatSync(p)
      if (st.isDirectory()) parcourir(p)
      else if (st.isFile()) m.set(slash(path.relative(ROOT, p)), sha(fs.readFileSync(p)))
    }
  }
  for (const f of GARDES) m.set(f, existe(path.join(ROOT, f)) ? sha(fs.readFileSync(path.join(ROOT, f))) : 'absent')
  for (const d of DOSSIERS_GARDES) if (existe(path.join(ROOT, d))) parcourir(path.join(ROOT, d))
  return m
}
function comparer(avant, apres) {
  const d = []
  for (const k of new Set([...avant.keys(), ...apres.keys()])) if (avant.get(k) !== apres.get(k)) d.push(`${k} ${avant.has(k) ? (apres.has(k) ? 'modifié' : 'supprimé') : 'apparu'}`)
  return d
}
function empreintesProduction(fichiers) {
  return new Map(fichiers.map((f) => [f, existe(path.join(ROOT, f)) ? sha(fs.readFileSync(path.join(ROOT, f))) : 'absent']))
}

// ── Une voie : une copie, puis ses groupes l'un après l'autre (témoin, puis mutations) ──────────────────────────────────
// Les voies tournent en parallèle, chacune sur SA copie (chemin stable : le fichier incrémental de tsc, rangé par chemin de copie sous
// .orchestre/travail/<juge>/tsbuildinfo/, reste chaud d'un passage à l'autre). Un groupe ne se lance que sur une copie intacte.
async function faireVoie(numero, cles, profil, mutations, ctx) {
  const racineCopie = path.join(TRAVAIL, String(numero), 'presti')
  const resultats = []
  let copie = false
  try {
    supprimerCopie(path.dirname(racineCopie))
    const n = await copierArbre(racineCopie, profil)
    copie = true
    ctx.journal(`voie ${numero} : ${n} fichiers copiés, profil ${profil} (${cles.join(', ')})`)
    for (const cle of cles) resultats.push(await faireGroupe(cle, mutations.filter((m) => m.groupe === cle), numero, racineCopie, ctx))
  } catch (e) {
    ctx.journal(`ERREUR voie ${numero} : ${e.message}`)
    for (const cle of cles) if (!resultats.some((r) => r.cle === cle)) resultats.push({ cle, temoin: null, mutations: [], erreur: e.message })
  } finally {
    if (copie && !o.garder) { try { supprimerCopie(path.dirname(racineCopie)) } catch (e) { resultats.push({ cle: `voie ${numero}`, temoin: null, mutations: [], menage: e.message }) } }
  }
  return resultats
}
async function faireGroupe(cle, mutations, numero, racineCopie, ctx) {
  const res = { cle, temoin: null, mutations: [] }
  const reste = () => ctx.finMs - Date.now()
  try {
    const lancer = commandeConsignee(cle).replaceAll('{racine}', slash(racineCopie))
    if (/--reel\b/.test(lancer) || /--reel\b/.test(commandeJuge(cle, racineCopie))) throw new Error('--reel interdit')
    // 1. Le témoin : la copie intacte, code 0.
    const t = await executer(lancer, Math.min(DELAI_JUGE_MS + 60_000, reste()))
    res.temoin = { code: t.code, duree_s: t.duree, derniere: derniereLigne(t.sortie), expire: t.expire, rouges: t.sortie.split(/\r?\n/).filter((l) => /^FAIL /.test(l)).map((l) => court(l, 260)) }
    ctx.journal(`TÉMOIN ${cle} : code ${t.code} en ${t.duree.toFixed(1)} s — ${court(res.temoin.derniere, 120)}`)
    ecrireJournal(`temoin-${cle}.log`, `$ ${lancer}\n# code ${t.code} · ${t.duree.toFixed(1)} s\n\n${t.sortie}`)
    if (t.code !== 0 && !o.sansTemoin) {
      // Un témoin rouge interdit les mutations du groupe : elles sont listées, non lancées, avec la cause.
      res.mutations = mutations.map((m) => ({ m, statut: 'non lancée', extrait: null, code: null, duree_s: 0, raison: `le témoin du groupe est rouge (code ${t.code}) : une mutation ne prouve rien sur un juge qui échoue déjà sur la copie intacte` }))
      return res
    }
    if (o.temoins) return res
    // 2. Les mutations, une à la fois : un remplacement exact, le juge, la copie remise à l'identique.
    for (const m of mutations) {
      const un = { m, statut: 'non lancée', extrait: null, code: null, duree_s: 0, raison: '' }
      res.mutations.push(un)
      if (reste() < 20_000) { un.raison = 'budget de temps épuisé avant son passage'; continue }
      const cible = path.join(racineCopie, m.fichier)
      const original = existe(cible) ? fs.readFileSync(cible) : null
      if (original === null) { un.statut = 'erreur'; un.raison = `${m.fichier} absent de la copie`; continue }
      const texte = original.toString('utf8')
      const occ = texte.split(m.avant).length - 1
      if (occ !== 1) { un.statut = 'erreur'; un.raison = `ancre présente ${occ} fois dans la copie de ${m.fichier} (le fichier a bougé depuis la préparation)`; continue }
      const i = texte.indexOf(m.avant)
      try {
        fs.writeFileSync(cible, texte.slice(0, i) + m.apres + texte.slice(i + m.avant.length))
        const x = await executer(lancer, Math.min(DELAI_JUGE_MS + 60_000, reste()))
        un.code = x.code; un.duree_s = x.duree
        ecrireJournal(`${cle}-${m.critere}-${slugue(m.nom)}.log`, `$ ${lancer}\n# ${m.fichier} : « ${m.avant} » → « ${m.apres} »\n# code ${x.code} · ${x.duree.toFixed(1)} s\n\n${x.sortie}`)
        const lu = ligneEnEchec(x.sortie, m.critere)
        if (x.expire) { un.statut = 'erreur'; un.raison = 'délai dépassé' }
        else if (x.code === 0) { un.statut = 'PASSE'; un.raison = 'code 0 : la mutation n’est pas attrapée' }
        else if (!lu.ligne) { un.statut = 'NON ATTRAPÉE'; un.raison = `code ${x.code}, ${m.critere} non attrapé : ${lu.defauts.join(' ; ')} (en échec : ${court(x.sortie.split(/\r?\n/).filter((l) => /^FAIL /.test(l)).join(' | '), 200) || '—'})` }
        else { un.statut = 'attrapée'; un.extrait = lu.ligne.trim() }
        ctx.journal(`${un.statut === 'attrapée' ? 'DÉTECTÉE' : un.statut.toUpperCase()} ${m.critere} (${m.nom}) : code ${x.code}, ${x.duree.toFixed(1)} s${un.raison ? ` — ${un.raison}` : ''}`)
      } finally {
        fs.writeFileSync(cible, original) // la copie redevient intacte, octet pour octet
      }
    }
  } catch (e) {
    res.erreur = e.message
    ctx.journal(`ERREUR ${cle} : ${e.message}`)
  }
  return res
}
const slugue = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40).replace(/^-|-$/g, '')
function ecrireJournal(nom, texte) {
  const d = path.join(PREUVES, 'journaux')
  fs.mkdirSync(d, { recursive: true })
  fs.writeFileSync(path.join(d, nom), texte)
}

// ── Le rapport ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * `duree_s` du rapport : le temps que le méta-juge doit prévoir pour refaire cette mutation sur SA copie (3 × duree_s + 60 s de délai, et le tri
 * de ses contre-mutations : celles qui tiennent dans le temps qui reste d'abord). La plus longue des deux durées mesurées ici (copie mutée,
 * copie intacte) ; doublée pour les groupes du profil « tsc », dont la copie ici ne porte que lib/ alors que la sienne est l'arbre entier, où
 * `npm run typecheck` est plus long et refait tout au premier passage sur une copie neuve.
 */
function dureeEstimee(r, u) {
  const mesuree = Math.max(u.duree_s, r.temoin?.duree_s ?? 0)
  return Number((PROFIL_DE[r.cle] === 'tsc' ? 2 * mesuree : mesuree).toFixed(1))
}
function ecrireRapports({ resultats, erreursPrep, partiel, avantApres, debut }) {
  const detectees = [], ratees = [], erreurs = [...erreursPrep]
  for (const r of resultats) {
    if (r.erreur) erreurs.push(`${r.cle} : ${r.erreur}`)
    if (r.menage) erreurs.push(`${r.cle} : ménage de la copie : ${r.menage}`)
    if (r.temoin && r.temoin.code !== 0) erreurs.push(`TÉMOIN ROUGE ${r.cle} : code ${r.temoin.code}${r.temoin.expire ? ' (délai)' : ''} — ${r.temoin.rouges.slice(0, 4).join(' | ') || court(r.temoin.derniere, 200)}`)
    for (const u of r.mutations) {
      if (u.statut === 'attrapée') detectees.push({ r, u })
      else ratees.push({ r, u })
    }
  }
  const attendues = resultats.reduce((n, r) => n + r.mutations.length, 0)
  const nonLancees = ratees.filter(({ u }) => u.statut === 'non lancée' || u.statut === 'erreur')
  const passent = ratees.filter(({ u }) => u.statut === 'PASSE' || u.statut === 'NON ATTRAPÉE')
  const ok = !erreurs.length && !ratees.length && !avantApres.length && !partiel
  const json = {
    fiche: FICHE, partiel: !!partiel, genere_le: new Date().toISOString(),
    mutations: detectees.map(({ r, u }) => ({
      juge: GROUPES[r.cle].juge, commande: commandeConsignee(r.cle), fichier: u.m.fichier, avant: u.m.avant, apres: u.m.apres,
      critere: u.m.critere, extrait: u.extrait, duree_s: dureeEstimee(r, u), nom: u.m.nom, groupe: r.cle,
    })),
    non_detectees: passent.map(({ r, u }) => ({ groupe: r.cle, critere: u.m.critere, fichier: u.m.fichier, nom: u.m.nom, raison: u.raison })),
    non_lancees: nonLancees.map(({ r, u }) => ({ groupe: r.cle, critere: u.m.critere, nom: u.m.nom, raison: u.raison })),
    temoins: resultats.map((r) => ({ groupe: r.cle, commande: commandeConsignee(r.cle), code: r.temoin?.code ?? null, duree_s: Number((r.temoin?.duree_s ?? 0).toFixed(1)) })),
    erreurs, invariants: avantApres,
  }
  fs.mkdirSync(PREUVES, { recursive: true })
  fs.writeFileSync(path.join(PREUVES, 'mutations.json'), JSON.stringify(json, null, 2))
  const L = [`# Contre-vérification 026-130 — juges du Pilotage et de la station (hors écran)`, '',
    `> Écrit par \`node ${SELF}\` le ${json.genere_le}${partiel ? ' — **rapport PARTIEL** (--groupe ou --seul), pas celui que lit le méta-juge' : ''}.`,
    `> Une copie de l'arbre de travail par voie (sous \`.orchestre/travail/${FICHE}/\`, supprimée ensuite ; lib/ seule pour les groupes qui font tsc), le juge sur la copie intacte (témoin), puis une faute par passage ; la copie est remise à l'identique après chaque passage. Aucun juge, jeu d'essai ni dépôt n'est modifié en place.`, '']
  L.push(`**Verdict : ${ok ? 'PASS' : 'FAIL'}** — ${detectees.length}/${attendues} mutation(s) attrapée(s) par leur critère, ${resultats.filter((r) => r.temoin?.code === 0).length}/${resultats.length} témoin(s) vert(s), durée ${((Date.now() - debut) / 60_000).toFixed(1)} min.`, '')
  if (passent.length || nonLancees.length || erreurs.length || avantApres.length) {
    L.push('## À lire d’abord : ce qui ne passe pas', '')
    for (const { r, u } of passent) L.push(`- **MUTATION NON ATTRAPÉE** — ${u.m.critere} (${r.cle}) : ${u.m.nom} (${u.m.fichier}) — ${u.raison}. Le juge n'est PAS corrigé ici : la fiche du juge concerné est à rouvrir par Claude Code.`)
    for (const { r, u } of nonLancees) L.push(`- non lancée — ${u.m.critere} (${r.cle}) : ${u.m.nom} — ${u.raison}`)
    for (const e of erreurs) L.push(`- ${e}`)
    for (const d of avantApres) L.push(`- invariant (MU-3) : ${d}`)
    L.push('')
  }
  L.push('## Témoins (MU-1) : le juge sur la copie intacte, code 0 attendu', '', '| groupe | commande consignée | code | durée | dernière ligne réelle |', '|---|---|---|---|---|')
  for (const r of resultats) L.push(`| ${r.cle} | \`${commandeConsignee(r.cle)}\` | ${r.temoin?.code ?? '—'} | ${(r.temoin?.duree_s ?? 0).toFixed(1)} s | ${(r.temoin?.derniere ?? '').replace(/\|/g, '\\|')} |`)
  L.push('', '## Mutations (MU-2) : ce qui est cassé, critère attendu en échec, extrait réel du verdict', '')
  for (const r of resultats) {
    L.push(`### ${r.cle} — \`${GROUPES[r.cle].juge}\` (${GROUPES[r.cle].args.join(' ') || 'sans option'})`, '')
    for (const u of r.mutations) L.push(`- **${u.m.critere}** · ${u.statut === 'attrapée' ? 'attrapée' : `**${u.statut}**`} · ${u.m.nom} · \`${u.m.fichier}\` : « ${court(u.m.avant, 90)} » → « ${court(u.m.apres, 90)} » · code ${u.code ?? '—'} · extrait réel : « ${u.extrait ? court(u.extrait, 260).replace(/\|/g, '\\|') : '—'} »`)
    L.push('')
  }
  L.push('## Méthode et invariants', '',
    '- **Lecture des verdicts (MU-2).** Les juges écrivent « ✅ ID … » / « ❌ ID … » ; le méta-juge lit « PASS|FAIL ID — … ». La commande consignée de chaque mutation est donc ce script en mode `--lancer=<clé>`, qui lance le juge (même commande, mêmes options, même code de sortie) et récrit seulement les lignes de critères (✅ → PASS, ❌ → FAIL ; un critère rapporté plusieurs fois devient une seule ligne). Les lignes de bilan « <juge> : FAIL — ids » passent telles quelles.',
    `- **Commandes réellement lancées sur la copie (MU-4, aucune n'a \`--reel\`) :** ${Object.keys(GROUPES).filter((c) => resultats.some((r) => r.cle === c)).map((c) => `\`${commandeJuge(c, path.join(TRAVAIL, '<n>', 'presti'))}\``).join(' ; ')}.`,
    `- **\`pilotage-route-qa\` : RL-1 corrigé par le chef (D-0410-14).** RL-1 retirait la ligne 'pilotage' de la carte (scripts/fermeture-e2e.mjs) de l'arbre jugé seulement : vrai le jour de 026-068, faux dès que HEAD porte la ligne. Il la retire désormais des DEUX côtés (l'arbre jugé et le commit --base), donc le témoin est vert quel que soit HEAD ; toute AUTRE ligne ajoutée, retirée ou modifiée, et l'absence ou le doublon de la ligne 'pilotage', restent rouges (sabotages sur copie dans \`.orchestre/preuves/${FICHE}/contre-verif-04-10.md\`). Ce script ne touche jamais ce juge : l'invariant MU-3 en prend l'empreinte avant et après.`,
    `- **\`duree_s\` du rapport.** La plus longue des durées mesurées (copie mutée, copie intacte) ; doublée pour les groupes dont la copie ne porte que lib/ (profil « tsc ») : le méta-juge juge sur l'arbre entier, où \`npm run typecheck\` est plus long et refait tout au premier passage sur une copie neuve. Il en tire le délai de ses propres passages (3 × duree_s + 60 s) et l'ordre de ses contre-mutations.`,
    '- **\`pilotage-sql-qa\` : \`--essai=<dépôt d’origine>/.orchestre/preuves/<fiche>/essai-a-sec.txt\`** quand la racine jugée est une copie : le compte rendu d’essai à sec (SQ-9, SE-9, SS-9) est une preuve du dépôt d’origine, pas un fichier à copier ; l’empreinte du jumeau nu qu’il porte est celle de la migration, que la copie intacte n’a pas changée.',
    `- **Invariant (MU-3).** Empreintes sha256 de chaque juge, de scripts/fixtures/026-pilotage/** et de scripts/lib/** avant et après : ${avantApres.length ? 'DIFFÉRENCES (voir plus haut)' : 'identiques'}. Les mutations ne touchent que les copies de .orchestre/travail/${FICHE}/ ; aucune jonction n'est laissée.`, '')
  fs.writeFileSync(path.join(PREUVES, 'mutations.md'), L.join('\n'))
  return { ok, detectees: detectees.length, attendues, passent, nonLancees, erreurs }
}

async function principal() {
  const debut = Date.now()
  const erreursPrep = [], mutations = []
  for (const m of CATALOGUE) {
    if (o.groupe && m.groupe !== o.groupe) continue
    if (o.seul && m.critere !== o.seul) continue
    try { mutations.push(preparer(m)) } catch (e) { erreursPrep.push(e.message) }
  }
  if (o.lister) {
    for (const m of mutations) console.log(`${m.groupe} ${m.critere} ${m.fichier} : « ${court(m.avant, 80)} » → « ${court(m.apres, 80)} » (${m.nom})`)
    console.log(`${NOM} : ${mutations.length}/${CATALOGUE.length} mutation(s) préparée(s), ${erreursPrep.length} erreur(s)`)
    for (const e of erreursPrep) console.log(`  ✗ ${e}`)
    process.exitCode = erreursPrep.length ? 1 : 0
    return
  }
  if (erreursPrep.length) {
    console.log(`${NOM} : préparation incomplète, aucun juge lancé`)
    for (const e of erreursPrep) console.log(`  ✗ ${e}`)
    ecrireRapports({ resultats: [], erreursPrep, partiel: true, avantApres: [], debut })
    process.exitCode = 1
    return
  }
  const partiel = !!(o.groupe || o.seul || o.temoins || o.voie || o.sansTemoin)
  const voies = VOIES.map(({ cles, profil }, i) => ({ numero: i + 1, profil, cles: cles.filter((c) => (o.temoins ? !o.groupe || o.groupe === c : mutations.some((m) => m.groupe === c))) })).filter((v) => v.cles.length && (!o.voie || String(v.numero) === o.voie))
  const productions = [...new Set(mutations.map((m) => m.fichier))]
  const avant = empreintes(), avantProd = empreintesProduction(productions)
  fs.mkdirSync(TRAVAIL, { recursive: true })
  // Un passage complet repart de journaux vides : ceux d'un passage de développement (autres numéros, autres noms) ne passent pas pour les siens.
  if (!partiel) fs.rmSync(path.join(PREUVES, 'journaux'), { recursive: true, force: true })
  for (const v of voies) supprimerCopie(path.join(TRAVAIL, String(v.numero))) // une copie laissée par un lancement coupé
  const ctx = { finMs: debut + LIMITE_MS, journal: (t) => console.log(`${((Date.now() - debut) / 1000).toFixed(0).padStart(4)} s  ${t}`) }
  // Une voie par copie, toutes en parallèle : les groupes d'une voie se suivent, ceux d'un même juge sont dans la même voie quand ils partagent
  // ses écritures sous .orchestre/travail/<juge>/.
  const resultats = (await Promise.all(voies.map((v) => faireVoie(v.numero, v.cles, v.profil, mutations, ctx)))).flat()
  try { if (!o.garder && existe(TRAVAIL) && !fs.readdirSync(TRAVAIL).length) fs.rmdirSync(TRAVAIL) } catch { /* relevé plus bas */ }
  const apres = empreintes()
  const diff = comparer(avant, apres).map((d) => `${d} pendant l'exécution (jamais écrit par ce script : une autre session ?)`)
  const prodApres = empreintesProduction(productions)
  const ecartsProd = comparer(avantProd, prodApres)
  if (ecartsProd.length) console.log(`(information : ${ecartsProd.join(', ')} — fichier(s) jugé(s) modifié(s) pendant l'exécution par une autre session ; les copies ont été faites à leur démarrage)`)
  const rap = ecrireRapports({ resultats: resultats.filter(Boolean), erreursPrep, partiel, avantApres: diff, debut })
  for (const { r, u } of rap.passent) console.log(`✗ MUTATION NON ATTRAPÉE ${u.m.critere} (${r.cle}, ${u.m.nom}) : ${u.raison}`)
  for (const e of rap.erreurs) console.log(`✗ ${e}`)
  for (const d of diff) console.log(`✗ MU-3 ${d}`)
  console.log(`${NOM} : ${rap.ok ? 'PASS' : 'FAIL'} — ${rap.detectees}/${rap.attendues} mutation(s) attrapée(s)${partiel ? ' (rapport partiel)' : ''} ; rapport : .orchestre/preuves/${FICHE}/mutations.md`)
  process.exitCode = rap.ok ? 0 : 1
}

function lireOptions(argv) {
  const o = { lister: false, garder: false, temoins: false, sansTemoin: false, voie: null, groupe: null, seul: null, lancer: null, racine: null }
  for (const a of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a)
    if (!m) { console.error(`${NOM} : argument inattendu : ${a}`); process.exit(2) }
    const [, cle, val] = m
    if (cle === 'lister' || cle === 'garder' || cle === 'temoins') o[cle] = true
    else if (cle === 'sans-temoin') o.sansTemoin = true
    else if (['groupe', 'seul', 'lancer', 'racine', 'voie'].includes(cle) && val) o[cle] = val
    else { console.error(`${NOM} : option inconnue ou sans valeur : ${a}`); process.exit(2) }
  }
  if (o.groupe && !GROUPES[o.groupe]) { console.error(`${NOM} : groupe inconnu : ${o.groupe} (${Object.keys(GROUPES).join(', ')})`); process.exit(2) }
  return o
}
const o = lireOptions(process.argv.slice(2))
if (o.lancer) { process.exitCode = lancerJuge(o.lancer, o.racine ?? ROOT) }
else await principal()

