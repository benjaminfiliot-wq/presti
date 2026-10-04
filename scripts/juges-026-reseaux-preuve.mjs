#!/usr/bin/env node
// scripts/juges-026-reseaux-preuve.mjs — la preuve de contenu-qa.mjs et contenu-ecran-qa.mjs (fiche 026-204, écrite
// par Claude Code AVANT la production qu'elle couvre). C'est le `verifier` de 026-204 elle-même.
//
// Ce qu'elle prouve, elle-même, sans rien lire qu'un autre agent aurait déposé :
//   TEMOIN        les treize parties de contenu-qa.mjs passent d'un bloc sur scripts/fixtures/contenu/temoin/ (appel
//                 en mémoire de `executerParties`, exporté par contenu-qa.mjs — le même code que le CLI, sans un
//                 second processus Node par partie : ~45 critères, chacun appelle pour de vrai le module témoin
//                 correspondant dans un enfant isolé, voir scripts/fixtures/contenu/lib/commun.mjs).
//   CLI-*         le CLI réel (`node scripts/contenu-qa.mjs …`) est lancé trois fois pour de vrai (options,
//                 racine réelle sans production = SAUTÉ code 2, appel invalide = refusé code 2) — pas plus : le
//                 comportement des critères eux-mêmes est déjà couvert par TEMOIN, en mémoire.
//   SB-<partie>   (--preuve-echecs) pour chacune des treize parties, une mutation nommée d'UN SEUL fichier témoin
//                 (scripts/fixtures/contenu/lib/commun.mjs, copierTemoinMute) fait rougir SON critère et lui seul —
//                 jamais un autre critère de la même partie, jamais un critère « générique ».
//   JV-*          (--preuve-echecs) les deux bords non couverts par les treize parties : Laya indisponible (jev
//                 absent ou en panne, sans attendre son délai de 60 s — JEV_CHEMIN pointe sur un fichier qui
//                 n'existe pas, panne immédiate) bloque `verdictChiffre` — LN-4/FA-3/TT-1/MP-2/ME-3 ne couvrent que
//                 le score insuffisant, pas la panne ; et le faux `jev` (scripts/fixtures/contenu/lib/faux-jev.mjs)
//                 refuse tout fournisseur qui ne serait pas EXACTEMENT « laya » (aucun repli hébergé, jamais un
//                 Ollama `:cloud`) — appelé ICI directement, hors du chemin `lib/agents/llm.ts` qui n'envoie jamais
//                 autre chose que « laya ».
// Le verrou de publication (étape 3 : zéro requête au faux réseau quand refusé) et jev score/decide qui classent
// sans jamais publier (étape 5) sont déjà prouvés par MP-3/MP-4 et BO-2/VE-4 dans TEMOIN — répétés nulle part ici.
//
// Usage : node scripts/juges-026-reseaux-preuve.mjs [--preuve-echecs]
// Sans l'option : seulement TEMOIN et les CLI-* (rapide, un fumée). Avec : plus SB-* et JV-* (la preuve complète,
// c'est le `verifier` de 026-204). Code 0 si tout est vert, 1 sinon. N'écrit que sous .orchestre/travail/ et
// .orchestre/preuves/026-204/echecs-attendus.md (une ligne par sabotage) ; aucun secret, aucun réseau réel.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  DEPOT, TEMOIN, FAUX_JEV, TRAVAIL, dossierTravail, garantirDossier,
  appelerFonction, envJev, retirerJonctions, copierTemoinMute, court,
} from './fixtures/contenu/lib/commun.mjs'
import { PARTIES, executerParties } from './contenu-qa.mjs'

const JUGE = 'juges-026-reseaux-preuve'
const PREUVE_ECHECS = process.argv.includes('--preuve-echecs')
const inconnues = process.argv.slice(2).filter((a) => a !== '--preuve-echecs')
if (inconnues.length) { console.log(`${JUGE} : appel refusé — option(s) inconnue(s) : ${inconnues.join(' ')}`); process.exitCode = 2; process.exit() }

let nPass = 0, nFail = 0
const echecsAttendus = ['# Preuve des échecs — 026-204', '', 'Une ligne par sabotage : le critère visé, la mutation, le verdict obtenu.', '']
function rapporter(id, reussi, detail) {
  const etat = reussi ? '✅' : '❌'
  console.log(`${etat} ${id} — ${detail}`)
  if (reussi) nPass++; else nFail++
  return reussi
}

// ── un fichier de requête jev minimal, pour parler à faux-jev.mjs directement (JV-PROVIDER) ────────────────────────
function fichierRequeteJev(corps) {
  const dir = dossierTravail('jv-requete')
  const p = path.join(dir, 'requete.json')
  fs.writeFileSync(p, JSON.stringify(corps))
  return p
}

// ── SB-<partie> : un fichier témoin muté, un critère nommé qui doit rougir seul ────────────────────────────────────
// [partie, fichier relatif à TEMOIN, mutation(texte)=>texte, id du critère attendu en échec]
const SABOTAGES = [
  ['connaissance', 'docs/marketing/lignes/README.md', (t) => t.replace('- plafond: 2 par semaine\n', ''), 'CN-2'],
  ['sql', 'supabase/migrations/0114_contenu.sql', (t) => t.replace('alter table public.contenu_idees enable row level security;\n', ''), 'SQ-4'],
  // 04/10/2026 (décision « tout est automatique », D-0410-1) : GE-1 juge désormais « une publication conforme passe SANS accord individuel »,
  // et plus la valeur par défaut du geste d'accord (`DEFAUT`, qui reste exportée par le témoin pour le seul chemin TikTok). Le sabotage
  // vise donc la garde que le critère GE-2 protège : STOP ou opposition connue (retirée du noyau du témoin, GE-2 seul doit rougir).
  ['geste', 'lib/contenu/_noyau.ts', (t) => t.replace("if (deps.opposition === true) return 'STOP ou opposition : aucune publication'", "if (false) return 'STOP ou opposition : aucune publication'"), 'GE-2'],
  // 04/10/2026 : trois sabotages de plus, un par garde que la décision « tout est automatique » met à la place de l'accord individuel :
  // la pause relue avant CHAQUE appel au modèle (LN-7), le coût exactement nul (GE-2), la pause relue avant la publication Graph après la
  // fabrication du conteneur (MP-6). Chacun doit rougir son critère SEUL : si le juge ne les voit pas, l'accord n'a plus de remplaçant.
  ['lignes', 'lib/contenu/_noyau.ts', (t) => t.replace("  if (!(await pausePermise())) return { ok: false, motif: 'pause générale : aucun appel au modèle' }\n", ''), 'LN-7'],
  ['geste', 'lib/contenu/_noyau.ts', (t) => t.replace("  if (deps.coutEuros !== 0) return 'coût inconnu ou positif : publication refusée'\n", ''), 'GE-2'],
  ['meta', 'lib/contenu/metaPublier.ts', (t) => t.replace("  if (!(await pausePermise())) return refus('pause générale : aucune publication Graph')\n", ''), 'MP-6'],
  ['lignes', 'lib/contenu/lignes.ts', (t) => t.replace('(ligne.publieAujourdhui || 0) >= ligne.quotaJour', '(ligne.publieAujourdhui || 0) > ligne.quotaJour'), 'LN-3'],
  ['gabarits', 'public/contenu/gabarits/L2.json', (t) => t.replace('"licence_commerciale": true', '"licence_commerciale": false'), 'GA-2'],
  ['fabrication', 'scripts/contenu/fabriquer.mjs', (t) => t.replace('(manifeste.tailleMo ?? 0) > 9.5)', '(manifeste.tailleMo ?? 0) > 95)'), 'FA-4'],
  ['tiktok', 'scripts/contenu/publier-tiktok.mjs', (t) => t.replace('(video.tailleMo ?? 0) > 9.5)', '(video.tailleMo ?? 0) > 95)'), 'TT-4'],
  ['profil-tiktok', 'docs/marketing/profil-tiktok.md', (t) => t.replace(/## Geste de Benj[\s\S]*$/, '## Notes\n\nRAS.\n'), 'PT-2'],
  ['meta', 'lib/contenu/metaPublier.ts', (t) => t.replace('  if (ctx.dejaPublie) return { ok: true, idempotent: true }\n', ''), 'MP-4'],
  ['mesure', 'lib/contenu/mesure.ts', (t) => t.replace('{ valeur: null, disponible: false, source: brut.source, le: brut.le }', '{ valeur: 0, disponible: false, source: brut.source, le: brut.le }'), 'ME-1'],
  ['boucle', 'lib/contenu/boucle.ts', (t) => t.replace("return dispo.has('H+24') || dispo.has('J+7')", 'return true'), 'BO-1'],
  ['veille', 'scripts/contenu/veille.mjs', (t) => t.replace('RE_EMAIL.test(url) || RE_TEL_FR.test(url)', 'RE_EMAIL.test(url) || false'), 'VE-2'],
  ['couts', 'lib/contenu/couts.ts', (t) => t.replace('return { ...brut, montant: null, connu: false }', 'return { ...brut, montant: 0, connu: true }'), 'CO-1'],
]

async function sabotage(partie, fichier, mutation, idAttendu) {
  const avant = mutation === null // jamais vrai ici, gardé pour lisibilité
  const dir = copierTemoinMute([fichier], mutation)
  let applique = false
  try { applique = fs.readFileSync(path.join(dir, fichier), 'utf8') !== fs.readFileSync(path.join(TEMOIN, fichier), 'utf8') } catch { applique = false }
  if (!applique) {
    fs.rmSync(dir, { recursive: true, force: true })
    return rapporter(`SB-${partie}`, false, `la mutation de ${fichier} n'a rien changé (texte cible introuvable) — sabotage inopérant`)
  }
  let detail
  try { ({ detail } = await executerParties([partie], dir, { silencieux: true })) } finally { fs.rmSync(dir, { recursive: true, force: true }) }
  const criteres = detail[0].criteres
  const c = criteres.find((c) => c.id === idAttendu)
  const autresRouges = criteres.filter((c) => c.id !== idAttendu && c.ok === false).map((c) => c.id)
  const bon = !!c && c.ok === false && autresRouges.length === 0
  const ligne = `${idAttendu} attendu seul en échec sur « ${fichier} » muté → obtenu : ${criteres.map((c) => `${c.id}=${c.ok === true ? 'ok' : c.ok === false ? 'FAIL' : 'sauté'}`).join(', ')}`
  echecsAttendus.push(`- **${partie}** (${idAttendu}) — ${ligne}`)
  return rapporter(`SB-${partie}`, bon, bon ? `${idAttendu} rougit seul` : `attendu ${idAttendu} seul en échec ; obtenu : autres rouges = [${autresRouges.join(', ')}], ${idAttendu} = ${c ? (c.ok === false ? 'FAIL (ok)' : 'PAS rouge (FAUTE)') : 'absent (FAUTE)'}`)
}

async function main() {
  // ── TEMOIN : les treize parties, en mémoire ───────────────────────────────────────────────────────────────────
  const toutesParties = Object.keys(PARTIES)
  const { code: codeTemoin, detail: detailTemoin } = await executerParties(toutesParties, TEMOIN, { silencieux: true })
  const nCriteres = detailTemoin.reduce((n, p) => n + p.criteres.length, 0)
  rapporter('TEMOIN', codeTemoin === 0, codeTemoin === 0
    ? `les ${toutesParties.length} parties passent sur le témoin (${nCriteres} critères)`
    : `témoin non vert (code ${codeTemoin}) — ${detailTemoin.filter((p) => p.code !== 0).map((p) => `${p.partie}:${p.criteres.filter((c) => c.ok !== true).map((c) => c.id).join(',')}`).join(' ; ')}`)
  retirerJonctions() // sinon copierTemoinMute (sabotages) listerait la jonction node_modules posée ci-dessus DANS TEMOIN

  // ── le CLI réel, au moins une fois par cas (options, exit codes) — des parties bon marché seulement ─────────────
  const lancerCli = (args) => spawnSync(process.execPath, ['scripts/contenu-qa.mjs', ...args], { cwd: DEPOT, encoding: 'utf8', windowsHide: true })
  const cliTemoin = lancerCli(['--partie=couts,gabarits', '--temoin'])
  rapporter('CLI-TEMOIN', cliTemoin.status === 0 && /contenu-qa : PASS/.test(cliTemoin.stdout), `--temoin (couts,gabarits) : code ${cliTemoin.status}`)
  // 04/10/2026 (juge périmé, audit C §5.4) : « sans production, racine réelle » n'est plus vrai depuis que 026-205 a livré docs/marketing/
  // (29/09) : la racine réelle est jugée pour de vrai (PASS, code 0) et ce critère rougissait à vide. Le cas qu'il garde — une racine SANS
  // production rend « préalable extérieur », code 2, jamais un faux vert — se prouve maintenant sur un dossier vide.
  const racineVide = fs.mkdtempSync(path.join(os.tmpdir(), 'contenu-qa-vide-'))
  const cliReel = lancerCli(['--partie=connaissance', `--racine=${racineVide}`])
  fs.rmSync(racineVide, { recursive: true, force: true })
  rapporter('CLI-REEL', cliReel.status === 2 && /contenu-qa : SAUTE/.test(cliReel.stdout), `racine sans production (dossier vide) : code ${cliReel.status} (attendu 2 — préalable extérieur documenté)`)
  const cliInvalide = lancerCli(['--partie=inexistante'])
  rapporter('CLI-INVALIDE', cliInvalide.status === 2 && /appel refusé/.test(cliInvalide.stdout), `partie inconnue : code ${cliInvalide.status}`)
  const cliCombinaison = lancerCli(['--temoin', '--racine=.', '--partie=sql'])
  rapporter('CLI-COMBINAISON', cliCombinaison.status === 2 && /ne se combine pas/.test(cliCombinaison.stdout), `--temoin avec --racine : code ${cliCombinaison.status}`)

  if (PREUVE_ECHECS) {
    // ── SB-<partie> : treize sabotages, un par partie ───────────────────────────────────────────────────────────
    for (const [partie, fichier, mutation, idAttendu] of SABOTAGES) await sabotage(partie, fichier, mutation, idAttendu)

    // ── JV-PANNE / JV-SANS-SOURCE : les deux bords de vraisemblance() non couverts par les treize parties ─────────
    const panne = await appelerFonction({ racineEff: TEMOIN, moduleRel: 'lib/contenu/_noyau', fonction: 'verdictChiffre', args: ['Devis en 24h', 'source.md'], env: envJev({ indisponible: true }) })
    rapporter('JV-PANNE', panne.ok && panne.valeur?.ok === false && !panne.exception, `Laya indisponible, jamais un passage automatique : ${court(JSON.stringify(panne.valeur))}`)
    const sansSource = await appelerFonction({ racineEff: TEMOIN, moduleRel: 'lib/contenu/_noyau', fonction: 'verdictChiffre', args: ['Devis en 24h', null], env: envJev({ reponse: { p: 0.95 } }) })
    rapporter('JV-SANS-SOURCE', sansSource.ok && sansSource.valeur?.ok === false, `source absente, refusé avant tout appel à jev : ${court(JSON.stringify(sansSource.valeur))}`)

    // ── JV-PROVIDER : le faux jev refuse tout provider qui ne serait pas EXACTEMENT « laya » ───────────────────────
    // (lib/agents/llm.ts n'envoie jamais autre chose ; ce critère prouve la DIGUE elle-même, appelée hors de ce
    // chemin — un repli hébergé Jev ou un Ollama `:cloud` glissé en argv/env par erreur ailleurs serait refusé ici.)
    const reqFile = fichierRequeteJev({ mode: 'noul', texte: 'Devis en 24h', options: undefined })
    const rHeberge = spawnSync(process.execPath, [FAUX_JEV, 'ask', '-f', reqFile, '--provider', 'jev-heberge'], { encoding: 'utf8', windowsHide: true, env: { PATH: process.env.PATH, JEV_PROVIDER: 'jev-heberge' } })
    rapporter('JV-PROVIDER-HEBERGE', rHeberge.status === 3, `fournisseur hébergé (argv et env « jev-heberge ») refusé : code ${rHeberge.status}`)
    const rCloud = spawnSync(process.execPath, [FAUX_JEV, 'ask', '-f', reqFile, '--provider', 'laya'], { encoding: 'utf8', windowsHide: true, env: { PATH: process.env.PATH, JEV_PROVIDER: 'ollama:cloud' } })
    rapporter('JV-PROVIDER-OLLAMA-CLOUD', rCloud.status === 3, `argv « laya » mais env JEV_PROVIDER « ollama:cloud » (dépareillés) refusé : code ${rCloud.status}`)
    const rLaya = spawnSync(process.execPath, [FAUX_JEV, 'ask', '-f', reqFile, '--provider', 'laya'], { encoding: 'utf8', windowsHide: true, env: { PATH: process.env.PATH, JEV_PROVIDER: 'laya' } })
    rapporter('JV-PROVIDER-LAYA-ACCEPTE', rLaya.status === 0, `« laya » en argv et en env : accepté, code ${rLaya.status} (témoin négatif : la digue ne refuse pas tout)`)
  }

  // ── preuve écrite (une ligne par sabotage), dans le périmètre de 026-204 ───────────────────────────────────────
  if (PREUVE_ECHECS) {
    garantirDossier(path.join(DEPOT, '.orchestre', 'preuves', '026-204'))
    fs.writeFileSync(path.join(DEPOT, '.orchestre', 'preuves', '026-204', 'echecs-attendus.md'), echecsAttendus.join('\n') + '\n')
  }

  const global = nFail === 0
  console.log(`${JUGE} : ${global ? 'PASS' : 'FAIL'} (${nPass} ok, ${nFail} en échec)`)
  process.exitCode = global ? 0 : 1
}

try {
  await main()
} finally {
  retirerJonctions()
}
