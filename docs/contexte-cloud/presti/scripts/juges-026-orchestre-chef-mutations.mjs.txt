#!/usr/bin/env node
// 026-151 : contre-mutations sur copies, sans modifier les juges ni leurs fixtures.
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTIL = path.resolve(RACINE, '..', 'orchestre')
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', '026-151')
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', '026-151')
const GARDER = process.argv.includes('--garder')
const MUTATIONS = []
const ajout = (lot, fichier, avant, apres, critere, nom) => MUTATIONS.push({ lot, fichier, avant, apres, critere, nom })
const outil = (lot, fichier, avant, apres, critere, nom) => ajout(lot, '../orchestre/' + fichier, avant, apres, critere, nom)
outil('source', 'bin/executant.mjs', "'-s', 'workspace-write',", "'-s', 'danger-full-access',", 'ORS-4', 'bac à sable désactivé')
outil('source', 'bin/orchestre.mjs', "    ['bin/antigravity.mjs', 'scripts/antigravity.mjs'],", '', 'ORS-2', 'antigravity absent de maj')
outil('source', 'bin/executant.mjs', 'const vault = configVault()', "const vault = path.resolve(RACINE, '..', 'SaaS')", 'ORS-3', 'vault SaaS figé')
outil('source', 'bin/antigravity.mjs', 'photo = instantane(`ag-${agent}`)', "photo = { ref: 'sans-instantane', commit: '00000000' }", 'ORS-6', 'instantané retiré avant lancer')
outil('baux', 'bin/orchestre.mjs', '    const reference = lock.battement || lock.depuis', '    const reference = lock.depuis', 'ORB-4', 'battement ignoré pour expiration')
outil('baux', 'bin/orchestre.mjs', 'const seuilBailMinutes = () => (CONFIG.bailMinutes > 0 ? CONFIG.bailMinutes : CONFIG.maxMinutes * 2)', 'const seuilBailMinutes = () => 20 * (CONFIG.bailMinutes > 0 ? CONFIG.bailMinutes : CONFIG.maxMinutes * 2)', 'ORB-3', 'seuil multiplié par vingt')
outil('baux', 'bin/orchestre.mjs', "v.verdict === 'FAIL' && v.dossier === D.fait", "v.verdict === 'FAIL' && [D.fait, D.enCours].includes(v.dossier)", 'ORB-6', 'FAIL en-cours comptés')
outil('baux', 'bin/orchestre.mjs', 'if (estDisjonctee(id) && !forcer)', 'if (false && estDisjonctee(id) && !forcer)', 'ORB-7', 'rejeu disjoncté sans forcer')
outil('baux', 'bin/orchestre.mjs', "    ...(budget ? [budget, ''] : []),", "    ...[`## Attention (${construireAttention(questions).length})`, ...construireAttention(questions).map((a) => `- ${a}`), ...(budget ? [budget, ''] : [])],", 'ORB-8', 'Attention avant budget')
outil('baux', 'bin/orchestre.mjs', 'if (sansQuarantaine(avantD) !== sansQuarantaine(actuelD)) violationDecisions', 'if (false && sansQuarantaine(avantD) !== sansQuarantaine(actuelD)) violationDecisions', 'ORB-9', 'décisions tranchées modifiables')
outil('baux', 'bin/orchestre.mjs', 'if (sensible && !benj)', 'if (false && sensible && !benj)', 'ORB-9', 'prix promu sans Benj')
outil('quota', 'bin/executant.mjs', "'liberer', tache], { cwd: RACINE", "'battement', tache], { cwd: RACINE", 'ORQ-1', 'quota garde la fiche verrouillée')
// Un seul remplacement couvre les deux corrections de fuseau consécutives.
outil('quota', 'bin/executant.mjs', '  let ms = naif - decalageParis(naif)\n  ms = naif - decalageParis(ms) // deuxième passe : l’heure d’été peut changer entre la première estimation et l’échéance', '  let ms = naif', 'ORQ-2', 'heure de Paris traitée comme UTC')
outil('quota', 'bin/executant.mjs', 'if (!q.actif) return false', 'if (true) return false', 'ORQ-5', 'lancer ignore le quota')
ajout('appliquer', 'scripts/chef/commun.mjs', 'plein: { taches: 10, decisions: 5 }', 'plein: { taches: 11, decisions: 5 }', 'CH-A2', 'onze tâches admises')
ajout('appliquer', 'scripts/chef/appliquer.mjs', 'const ecarts = validerPlan(plan, cycle)', "await appeler(base, jeton, 'POST', '/api/agents/taches', { type: plan.taches[0].type, cle: plan.taches[0].cle_idempotence, capacite: plan.taches[0].capacite, charge: plan.taches[0].charge }); const ecarts = validerPlan(plan, cycle)", 'CH-A2', 'première tâche envoyée avant validation')
ajout('appliquer', 'scripts/chef/appliquer.mjs', 'const rapport = { le: new Date().toISOString(), cycle,', 'const rapport = { le: new Date().toISOString(), jeton, cycle,', 'CH-A9', 'jeton écrit dans rapport')
ajout('appliquer', 'scripts/chef/commun.mjs', 'if (t.sortante !== false) f.push(', "if (t.sortante === 'jamais') f.push(", 'CH-A5', 'sortante non contrôlé')
ajout('appliquer', 'scripts/chef/appliquer.mjs', 'corps: { type: t.type, cle: t.cle_idempotence,', 'corps: { type: t.type, cle_idempotence: t.cle_idempotence,', 'CH-A13', 'mauvaise clé du bus')
ajout('etat', 'scripts/chef/etat.mjs', 'neutraliser(JSON.stringify(tronquer(r.json), null, 2))', 'JSON.stringify(tronquer(r.json), null, 2)', 'CH-E1', 'balise fermante non neutralisée')
ajout('cycle', 'scripts/chef/cycle.mjs', "'-c', 'sandbox_workspace_write.network_access=false',", "'-c', 'sandbox_workspace_write.network_access=true',", 'CH-C2', 'réseau du modèle activé')
ajout('cycle', 'scripts/chef/cycle.mjs', 'const minuterie = delaiMs ? setTimeout(() => { delai = true; tuerArbre(enfant.pid) }, delaiMs) : null', 'const minuterie = delaiMs ? setTimeout(() => { delai = true; resoudre({ code: 1, sortie, delai }) }, delaiMs) : null', 'CH-C3', 'minuteur sans destruction enfant')
ajout('cycle', 'scripts/chef/cycle.mjs', 'if (quotaActif()) {', 'if (false && quotaActif()) {', 'CH-C4', 'quota cycle ignoré')
ajout('usine', 'scripts/usine/chef-modele.mjs', 'if (refus) { repondre(', 'if (refus && !opts.echange) { repondre(', 'CH-U5', 'danger-full-access accepté avec echange explicite')
ajout('revue', 'scripts/chef/revue-donnees.mjs', "return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)", 'return date.toISOString().slice(0, 10)', 'RV-1', 'semaine UTC')
ajout('revue', 'scripts/chef/revue-donnees.mjs', 'catch { illisibles++ }', 'catch (e) { throw e }', 'RV-3', 'ligne abîmée fait planter')
ajout('revue', 'scripts/chef/revue-donnees.mjs', "const NON_MESURE = 'non mesuré'", 'const NON_MESURE = 0', 'RV-2', 'non mesuré remplacé par zéro')
ajout('chantier', 'scripts/chef/chantier.mjs', "'lib/agents/llm.ts', ", '', 'CT-1', 'zone LLM non protégée')
ajout('chantier', 'scripts/chef/chantier.mjs', "(statut === 'A' && /^scripts\\/[^/]+-e2e\\.mjs$/.test(fichier))", '/^scripts\\/[^/]+-e2e\\.mjs$/.test(fichier)', 'CT-2', 'e2e existant modifié autorisé')
// Le bloc entier est un remplacement unique : supprime contrôle de collision et exclusivité de copie.
ajout('chantier', 'scripts/chef/chantier.mjs', '', '', 'CT-3', 'deposer écrase fiche existante')
ajout('chantier', 'scripts/chef/chantier.mjs', 'const juge = spawnSync(process.execPath, [commande[1]], { cwd: racine, encoding: \'utf8\', timeout: delai })', "const juge = { status: 1, stdout: 'FAIL RD-1 — supposé rouge', stderr: '' }", 'CT-1', 'verifier-fiche ne lance plus juge proposé')
ajout('chantier', 'scripts/chef/chantier.mjs', "&& d.choix === 'lancer')", "&& ['lancer', 'reporter'].includes(d.choix))", 'CT-6', 'reporter conservé')

function sous(p, borne) { const r = path.relative(borne, p); return r !== '' && !r.startsWith('..' + path.sep) && r !== '..' && !path.isAbsolute(r) }
function liens(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => { const p = path.join(d, e.name); const s = fs.lstatSync(p); return s.isSymbolicLink() ? [p] : s.isDirectory() ? liens(p) : [] }) }
function nettoyer(dir) {
  if (!sous(dir, TRAVAIL)) throw new Error('nettoyage hors périmètre : ' + dir)
  if (!fs.existsSync(dir)) return
  if (fs.lstatSync(dir).isSymbolicLink()) { fs.unlinkSync(dir); try { fs.lstatSync(dir); throw new Error('jonction racine restante : ' + dir) } catch (e) { if (e.code !== 'ENOENT') throw e }; return }
  for (const p of liens(dir)) { fs.unlinkSync(p); try { fs.lstatSync(p); throw new Error('jonction restante : ' + p) } catch (e) { if (e.code !== 'ENOENT') throw e } }
  if (liens(dir).length) throw new Error('jonctions encore présentes')
  fs.rmSync(dir, { recursive: true, force: true })
}
function copier(source, dest) {
  const st = fs.lstatSync(source)
  if (st.isSymbolicLink()) throw new Error('lien source refusé : ' + source)
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const n of fs.readdirSync(source)) if (n !== '.git' && n !== 'node_modules' && n !== '.env' && !n.startsWith('.env.')) copier(path.join(source, n), path.join(dest, n))
  } else if (st.isFile()) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(source, dest) }
}
function copie(lot, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const estOutil = ['source', 'baux', 'quota'].includes(lot)
  const racine = estOutil ? OUTIL : RACINE
  const rels = estOutil ? ['bin', 'hooks', 'gabarits', 'juges', 'test', 'package.json'] : ['scripts/chef', 'scripts/usine', 'scripts/lib', 'scripts/orchestre.mjs', 'scripts/executant.mjs', 'scripts/antigravity.mjs', 'scripts/instantane-quotidien.mjs', 'docs/agents', 'package.json']
  for (const rel of rels) if (fs.existsSync(path.join(racine, rel))) copier(path.join(racine, rel), path.join(dest, rel))
}
const juges = (lot) => ['source', 'baux', 'quota'].includes(lot) ? '../orchestre/test/preuve-026.mjs' : lot === 'revue' ? 'scripts/revue-qa.mjs' : lot === 'chantier' ? 'scripts/chantier-qa.mjs' : 'scripts/chef-qa.mjs'
function commande(lot) {
  const juge = juges(lot), absolu = path.resolve(RACINE, juge).replaceAll('\\', '/')
  return `node "${absolu}" ` + (juge.startsWith('../') ? `--groupe=${lot} --source="{source}"` : `--racine="{racine}"${['revue', 'chantier'].includes(lot) ? '' : ` --groupe=${lot} --repli=poste`}`)
}
function environnement(dir) { const env = {}; for (const k of ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'LANG']) if (process.env[k]) env[k] = process.env[k]; return { ...env, HOME: dir, USERPROFILE: dir, CODEX_HOME: path.join(dir, '.codex'), FORCE_COLOR: '0' } }
function tuer(pid) { if (!pid) return; if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else { try { process.kill(-pid, 'SIGKILL') } catch (e) { if (e.code !== 'ESRCH') throw e } } }
async function lancer(lot, dir) {
  const juge = path.resolve(RACINE, juges(lot))
  const args = [juge, ...(['source', 'baux', 'quota'].includes(lot) ? [`--groupe=${lot}`, `--source=${dir}`] : [`--racine=${dir}`, ...(['revue', 'chantier'].includes(lot) ? [] : [`--groupe=${lot}`, '--repli=poste'])])]
  const debut = Date.now()
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { cwd: dir, env: environnement(dir), windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
    let sortie = '', expire = false
    p.stdout.on('data', d => { sortie += d }); p.stderr.on('data', d => { sortie += d })
    const timer = setTimeout(() => { expire = true; tuer(p.pid) }, 150_000)
    p.on('error', e => { clearTimeout(timer); resolve({ code: 127, sortie: sortie + '\n' + e.message, duree_s: (Date.now() - debut) / 1000, expire }) })
    p.on('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, sortie: sortie.replace(/\u001b\[[0-9;]*m/g, ''), duree_s: (Date.now() - debut) / 1000, expire }) })
  })
}
function echec(sortie, critere) {
  const lignes = sortie.split(/\r?\n/)
  const p = lignes.findIndex(l => l.startsWith(`FAIL ${critere} — `) || l.startsWith(`✗ ${critere} — `))
  const ligne = p >= 0 ? lignes[p] : null
  const detail = p >= 0 && ligne.length < 20 ? lignes.slice(p + 1).find(l => l.startsWith('  ✗ ')) : ''
  const bilan = lignes.filter(l => /(?: : (?:PASS|FAIL)|critère\(s\) vert\(s\)|groupe\(s\) en échec)/.test(l)).at(-1)
  return { ligne, extrait: ligne ? [ligne, detail, bilan].filter(Boolean).join('\n') : lignes.filter(Boolean).slice(-2).join('\n'), bilan }
}
function status(racine) { const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: racine, encoding: 'utf8' }); if (r.status !== 0) throw new Error('git status impossible'); return r.stdout.split(/\r?\n/).filter(l => l && !l.includes('.orchestre/travail/') && !l.includes('.orchestre/preuves/026-151/')).join('\n') }
function preparerMutations() {
  const exec = fs.readFileSync(path.join(OUTIL, 'bin/executant.mjs'), 'utf8')
  const q = MUTATIONS.find(m => m.critere === 'ORQ-2')
  q.avant = exec.match(/  let ms = naif - decalageParis\(naif\)\r?\n  ms = naif - decalageParis\(ms\)[^\r\n]*/)?.[0] || q.avant
  const orch = fs.readFileSync(path.join(OUTIL, 'bin/orchestre.mjs'), 'utf8')
  const orb4 = MUTATIONS.find(m => m.critere === 'ORB-4')
  const expiration = orch.indexOf('function expirerBaux()')
  const finExpiration = orch.indexOf('\nfunction finsDepuisSucces()', expiration)
  if (expiration < 0 || finExpiration < 0) throw new Error('fonction expiration introuvable')
  orb4.avant = orch.slice(expiration, finExpiration)
  orb4.apres = orb4.avant.replace('const reference = lock.battement || lock.depuis', 'const reference = lock.depuis')
  const orb8 = MUTATIONS.find(m => m.critere === 'ORB-8')
  const budget = orch.indexOf('  const budget = blocBudgetExistant()')
  const ordre = orch.indexOf('  const ordre = ', budget)
  if (budget < 0 || ordre < 0) throw new Error('bloc Attention/budget introuvable')
  orb8.avant = orch.slice(budget, ordre)
  const debutAttention = orb8.avant.indexOf('  const attention = construireAttention(questions)')
  const blocAttention = orb8.avant.slice(debutAttention)
  // Même contenu, déplacé réellement avant le budget ; aucune deuxième section Attention.
  const constructionAttention = '  const avantBudget = []\n' + blocAttention.replaceAll('L.push(', 'avantBudget.push(')
  orb8.apres = constructionAttention + orb8.avant.slice(0, debutAttention).replace('  const L = [', '  const L = [\n    ...avantBudget,')
  const chantier = fs.readFileSync(path.join(RACINE, 'scripts/chef/chantier.mjs'), 'utf8')
  const ct = MUTATIONS.find(m => m.critere === 'CT-3')
  const debut = chantier.indexOf('  if (id) for (const d of DOSSIERS)')
  const fin = chantier.indexOf('    catch (e) { console.log(`✗ dépôt refusé', debut)
  if (debut < 0 || fin < 0) throw new Error('bloc de collision CT-3 introuvable')
  ct.avant = chantier.slice(debut, fin)
  ct.apres = ct.avant.replace('if (id) for (const d of DOSSIERS)', 'if (false) for (const d of DOSSIERS)').replace('fs.copyFileSync(emplacement(racine, premier), cible, fs.constants.COPYFILE_EXCL)', 'fs.copyFileSync(emplacement(racine, premier), cible)')
}
async function principal() {
  fs.mkdirSync(TRAVAIL, { recursive: true }); fs.mkdirSync(PREUVES, { recursive: true })
  const avant = [status(RACINE), status(OUTIL)]
  const rapport = { mutations: [], temoins: [], erreurs: [] }
  const run = path.join(TRAVAIL, `tour-${Date.now()}-${process.pid}`)
  const debut = Date.now()
  fs.mkdirSync(run)
  const publier = () => {
    fs.writeFileSync(path.join(PREUVES, 'mutations.json'), JSON.stringify(rapport, null, 2) + '\n')
    const L = ['# 026-151 — contre-mutations', '', ...rapport.erreurs.map(e => `- NON VALIDÉ : ${e}`), '', ...rapport.temoins.map(t => `- Témoin ${t.lot} : code ${t.code}, ${t.duree_s.toFixed(1)} s. ${t.extrait}`), '', ...rapport.mutations.map(m => `- ${m.nom} : ${m.critere}, ${m.attrape ? 'détectée' : 'NON DÉTECTÉE'}, code ${m.code ?? '—'}, ${m.duree_s.toFixed(1)} s. Extrait réel : ${m.extrait.replaceAll('\n', ' / ')}`)]
    fs.writeFileSync(path.join(PREUVES, 'mutations.md'), L.join('\n') + '\n')
  }
  try {
    preparerMutations()
    for (const lot of [...new Set(MUTATIONS.map(m => m.lot))]) {
      const temoinDir = path.join(run, lot, 'temoin'); copie(lot, temoinDir)
      const t = await lancer(lot, temoinDir)
      rapport.temoins.push({ lot, code: t.code, duree_s: t.duree_s, extrait: t.sortie.trim() })
      if (t.code !== 0 || t.expire || t.signal) rapport.erreurs.push(`témoin ${lot} rouge (code ${t.code})`)
      console.log(`TEMOIN ${lot} : code ${t.code}, ${t.duree_s.toFixed(1)} s`)
      publier()
      let n = 0
      for (const m of MUTATIONS.filter(m => m.lot === lot)) {
        if (Date.now() - debut > 17 * 60_000) throw new Error('budget global de 17 minutes atteint')
        const dir = path.join(run, lot, String(++n)); copie(lot, dir)
        const relatif = m.fichier.replace('../orchestre/', '')
        const fichier = path.join(dir, relatif)
        const texte = fs.readFileSync(fichier, 'utf8')
        if (!m.avant || texte.split(m.avant).length !== 2) throw new Error(`${m.critere} : remplacement non unique dans ${m.fichier}`)
        fs.writeFileSync(fichier, texte.replace(m.avant, () => m.apres))
        // Le témoin source/quota rouge rend leur exécution non probante. Ne pas lancer un faux ag contre une API réelle.
        const r = t.code === 0 ? await lancer(lot, dir) : { code: null, duree_s: 0, sortie: `Témoin ${lot} rouge : mutation non exécutée`, expire: false }
        const e = echec(r.sortie, m.critere)
        const attrape = t.code === 0 && r.code !== null && r.code !== 0 && !r.expire && !r.signal && !!e.ligne && !/\b(?:SyntaxError|ReferenceError|TypeError)\b/.test(r.sortie)
        rapport.mutations.push({ ...m, juge: juges(lot), commande: commande(lot), extrait: e.extrait, duree_s: r.duree_s, code: r.code, attrape })
        if (!attrape) rapport.erreurs.push(`${m.critere} — ${m.nom} : faute non démontrée`)
        console.log(`${attrape ? 'DETECTEE' : 'NON VALIDEE'} ${m.critere} — ${m.nom}, ${r.duree_s.toFixed(1)} s`)
        publier()
        if (!GARDER) nettoyer(dir)
      }
      if (!GARDER) nettoyer(temoinDir)
    }
  } catch (e) { rapport.erreurs.push(String(e.message || e)); console.error(e.message || e) }
  finally {
    const apres = [status(RACINE), status(OUTIL)]
    if (avant.some((s, i) => s !== apres[i])) rapport.erreurs.push('git status a changé hors périmètre')
    if (!GARDER) nettoyer(run)
    publier()
  }
  console.log(`mutations-026-151 : ${rapport.erreurs.length ? 'FAIL' : 'PASS'} — ${rapport.mutations.length}/${MUTATIONS.length} mutations documentées`)
  return rapport.erreurs.length ? 1 : 0
}
principal().then(c => { process.exitCode = c }).catch(e => { console.error(e.message || e); process.exitCode = 1 })
