#!/usr/bin/env node
// 026-228 — mutations indépendantes du témoin fictif du juge de complétude.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JUGE = 'scripts/juges-026-completude-qa.mjs'
const FIXTURE = 'scripts/fixtures/026-completude/temoin'
const PREUVE = path.join(RACINE, '.orchestre/preuves/026-228')
const FICHIERS = {
  openclaw: 'presti/scripts/usine/openclaw/lanceur.mjs',
  cursor: 'orchestre/bin/cursor.mjs',
  firecrawl: 'presti/lib/agents/lectureFirecrawl.ts',
  fish: 'presti/lib/studio/voixFish.ts',
  entrant: 'presti/docs/agents/recette-entrant-2026-09-27.md',
  douleurs: 'presti/scripts/chef/douleurs.mjs',
  experience: 'presti/scripts/chef/lancer-experience.mjs',
}
// Chaque chaîne « avant » est unique dans la fixture ; une absence arrête le cas.
const CAS = [
  ['OC-8', 'openclaw', 'jeton Claude hérité', 'if (NOM_CLAUDE.test(nom)) return refus(', 'if (false && NOM_CLAUDE.test(nom)) return refus('],
  ['OC-5', 'openclaw', 'montage du coffre', 'for (const v of c.volumes || []) if (!sourceNommee(v.source))', 'for (const v of c.volumes || []) if (false && !sourceNommee(v.source))'],
  ['OC-9', 'openclaw', 'sortie réseau hors liste', 'return config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)', "return u.protocol === 'https:' || config.sorties.some((s) => sortieAdmissible(s) && new URL(s.url).origin === u.origin)"],
  ['CU-2', 'cursor', 'coût inconnu annoncé nul', "const cout = typeof tarif?.cout_par_tache === 'number' ? tarif.cout_par_tache : 'non mesuré'", "const cout = typeof tarif?.cout_par_tache === 'number' ? tarif.cout_par_tache : 0"],
  ['CU-4', 'cursor', 'interdit ignoré', "if (dans(c, tache.interdit)) return refus('interdit'", "if (false && dans(c, tache.interdit)) return refus('interdit'"],
  ['CU-7', 'cursor', 'verrou de reprise non exclusif', "{ flag: 'wx' }", "{ flag: 'w' }"],
  ['FC-3', 'firecrawl', 'robots ignoré', "if (robotsInterdit(robots, u.pathname + u.search)) return { refus: 'robots' }", "if (false && robotsInterdit(robots, u.pathname + u.search)) return { refus: 'robots' }"],
  ['FC-4', 'firecrawl', 'borne de crédits dépassée', 'c.plafond > PLAFOND_CAHIER', 'c.plafond > 100000'],
  ['FC-5', 'firecrawl', 'provenance inventée', 'const source = meta.sourceURL || meta.url', 'const source = meta.sourceURL || meta.url || url'],
  ['FC-6', 'firecrawl', 'repli 429 supprimé', "if (r.statut === 429) return parRepli(url, '429', deps)", "if (r.statut === 429) return { refus: 'quota_firecrawl' }"],
  ['FC-8', 'firecrawl', 'donnée personnelle dans URL lire', "if (PERSONNEL.test(decodeURIComponent(url))) return { refus: 'donnee_personnelle' }", "if (false && PERSONNEL.test(decodeURIComponent(url))) return { refus: 'donnee_personnelle' }"],
  ['FC-8', 'firecrawl', 'donnée personnelle dans recherche', "if (PERSONNEL.test(demande.requete)) return { refus: 'donnee_personnelle' }", "if (false && PERSONNEL.test(demande.requete)) return { refus: 'donnee_personnelle' }"],
  ['FA-2', 'fish', 'HTTP 200 pris pour licence', "  if (d.usage === 'usage_commercial') {", "  if (d.usage === 'usage_commercial' && (await deps.sonder()).statut !== 200) {"],
  ['FA-4', 'fish', 'quota inconnu accepté', "const solde = typeof q?.solde === 'number' ? q.solde : null", "const solde = typeof q?.solde === 'number' ? q.solde : 1e9"],
  ['FA-9', 'fish', 'voix locale annoncée Fish', "fournisseur: 'local', voix: VOIX_LOCALE,", "fournisseur: 'fish', voix: VOIX_LOCALE,"],
  ['EN-3', 'entrant', 'demande sans consentement', '"precoche": false,', '"precoche": true,'],
  ['EN-6', 'entrant', 'accord réutilisé pour réponse', '"id_accord": "acc-essai-002",\n      "id_message": "msg-essai-002"', '"id_accord": "acc-essai-001",\n      "id_message": "msg-essai-002"'],
  ['EN-4', 'entrant', 'texte approuvé modifié', '"id_message": "msg-essai-001",\n      "destinataire": "artisan.essai@presti-test.invalid",\n      "empreinte": "', '"id_message": "msg-essai-001",\n      "destinataire": "artisan.essai@presti-test.invalid",\n      "empreinte": "f'],
  ['EN-8', 'entrant', 'froid ouvert avant le 12 octobre', '"froid_ouvert": false,', '"froid_ouvert": true,'],
  ['DO-3', 'douleurs', 'fréquence sans mesure', "nombre: g.nombres.includes(null) ? 'non mesuré' : g.nombres.reduce((x, y) => x + y, 0),", 'nombre: g.nombres.reduce((x, y) => x + (y || 0), 0),'],
  ['DO-2', 'douleurs', 'passe mensuelle répétée', '  if (deja) return { cle, deja: true, rapport: deja }', '  if (false && deja) return { cle, deja: true, rapport: deja }'],
  ['EX-2', 'experience', 'lancement sans encaissement confirmé', "v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source", "v?.statut === 'encaisse' && v.test === false && v.source"],
  ['EX-8', 'experience', 'non mesuré changé en succès', "const arretee = { ...e, etat: 'arrêtée', conclusion: 'non mesuré', succes: false, suspendue: true }", "const arretee = { ...e, etat: 'conclue', conclusion: 'succès', succes: true, suspendue: false }"],
].map(([critere, partie, nom, avant, apres], n) => ({ id: n + 1, critere, partie, nom, avant, apres, fichier: `${FIXTURE}/${FICHIERS[partie]}` }))

function executer(cas, source, mutation) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-026-228-'))
  const debut = Date.now()
  try {
    fs.cpSync(path.join(source, FIXTURE), temp, { recursive: true, errorOnExist: false, dereference: false })
    if (mutation) {
      const cible = path.join(temp, FICHIERS[cas.partie])
      const texte = fs.readFileSync(cible, 'utf8')
      const occurrences = texte.split(cas.avant).length - 1
      if (occurrences !== 1) throw new Error(`${cas.critere} : remplacement présent ${occurrences} fois`)
      fs.writeFileSync(cible, texte.replace(cas.avant, cas.apres))
    }
    const rapport = path.join(temp, 'rapport.json')
    const commande = [path.join(source, JUGE), `--partie=${cas.partie}`, `--racine=${path.join(temp, 'presti')}`, `--rapport=${rapport}`]
    const r = spawnSync(process.execPath, commande, { cwd: source, encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, FORCE_COLOR: '0' } })
    const sortie = `${r.stdout || ''}${r.stderr || ''}`
    let lu = null
    try { lu = JSON.parse(fs.readFileSync(rapport, 'utf8')) } catch { /* échec explicite ci-dessous */ }
    const code = r.status ?? (r.error ? 127 : 1)
    const ligne = sortie.split(/\r?\n/).find((l) => l.startsWith(`FAIL ${cas.critere} `)) || ''
    const rouges = lu?.rouges || []
    return { code, ligne, rouges, duree_s: (Date.now() - debut) / 1000, erreur: r.error?.message || (!lu ? 'rapport du juge absent' : ''), rapport: lu }
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
}

function jugerCas(cas, source) {
  const r = executer(cas, source, false)
  if (r.erreur) { console.error(r.erreur); return 2 }
  if (r.code === 0 && r.rapport?.code === 0 && r.rouges.length === 0) {
    console.log(`juges-026-completude-qa : PASS — ${cas.partie} témoin intact`)
    return 0
  }
  if (r.code !== 0 && r.rapport?.code === r.code && r.rouges.includes(cas.critere) && r.ligne) {
    console.log(`FAIL ${cas.critere} — ${r.ligne.split(' — ').slice(1).join(' — ')}`)
    console.log(`juges-026-completude-qa : FAIL — ${r.rouges.join(', ')}`)
    return r.code
  }
  console.error(`échec non attribuable : ${cas.partie}, code ${r.code}, critère ${cas.critere}, rouges ${r.rouges.join(', ')}`)
  return 2
}

function principal() {
  const id = process.argv.find((a) => a.startsWith('--cas='))?.slice(6)
  const source = path.resolve(process.argv.find((a) => a.startsWith('--racine='))?.slice(9) || RACINE)
  if (id) {
    const cas = CAS.find((c) => String(c.id) === id)
    if (!cas) throw new Error(`cas inconnu : ${id}`)
    return jugerCas(cas, source)
  }
  fs.mkdirSync(PREUVE, { recursive: true })
  const mutations = [], temoins = {}, lignes = ['# Mutations du juge de complétude', '', `Horloge du juge : 2026-09-27T10:00:00.000Z. Exécution : ${new Date().toISOString()}.`, '', '| Partie | Mutation | Témoin | Muté | Critère |', '|---|---|---:|---:|---|']
  let fautes = 0
  for (const cas of CAS) {
    const intact = executer(cas, RACINE, false)
    if (!temoins[cas.partie]) temoins[cas.partie] = { code: intact.code, rouges: intact.rouges }
    if (intact.code !== 0 || intact.rapport?.code !== 0 || intact.rouges.length || intact.erreur) {
      console.error(`Témoin ${cas.partie} rouge : code ${intact.code}, ${intact.erreur || intact.rouges.join(', ')}`)
      fautes++; break
    }
    let mute
    try { mute = executer(cas, RACINE, true) } catch (e) { console.error(e.message); fautes++; break }
    const ok = mute.code === 1 && mute.rapport?.code === 1 && mute.rouges.includes(cas.critere) && !!mute.ligne && !mute.erreur
    if (!ok) { fautes++; console.error(`Mutation ${cas.id} non prise : code ${mute.code}, ${mute.erreur || mute.rouges.join(', ')}`) }
    const commande = `node {racine}/scripts/juges-026-completude-mutations.mjs --cas=${cas.id} --racine={racine}`
    mutations.push({ juge: JUGE, commande, fichier: cas.fichier, avant: cas.avant, apres: cas.apres, critere: cas.critere, extrait: mute.ligne || `échec : ${mute.erreur || 'critère absent dans la sortie du juge'}`, duree_s: intact.duree_s + mute.duree_s, nom: cas.nom, partie: cas.partie, code_temoin: intact.code, code_mute: mute.code, rouges: mute.rouges, horodatage: new Date().toISOString(), zero_effet_externe: !mute.rouges.some((c) => c.endsWith('-R')) })
    lignes.push(`| ${cas.partie} | ${cas.nom} | ${intact.code} | ${mute.code} | ${cas.critere} ${ok ? 'refusé' : 'NON PRIS'} |`)
    console.log(`${cas.partie} ${cas.critere} : témoin ${intact.code}, muté ${mute.code}, ${ok ? 'refusé' : 'NON PRIS'}`)
  }
  fs.writeFileSync(path.join(PREUVE, 'mutations.json'), JSON.stringify({ juge: JUGE, temoins, mutations, fautes }, null, 2) + '\n')
  fs.writeFileSync(path.join(PREUVE, 'mutations.md'), lignes.join('\n') + '\n')
  return fautes ? 1 : 0
}

try { process.exitCode = principal() } catch (e) { console.error(e.stack || e.message); process.exitCode = 2 }
