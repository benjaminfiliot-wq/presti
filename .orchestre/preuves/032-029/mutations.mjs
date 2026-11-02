// 032-029 — mutations à la main, écrites par l'auditeur (aucune n'est dans les listes MUTANTS des juges, sauf mention), contre les
// quatre juges : scripts/suivi-artisan-qa.mjs, scripts/briefing-n8n-qa.mjs, scripts/detecteurs-n8n-qa.mjs, scripts/n8n-specs-qa.mjs.
//
// Les copies mutées des exports sont écrites dans CE dossier de preuve, en un seul fichier : mutants.json (nom → export muté).
// Les juges de suivi et de briefing n'ont pas d'option --export : on les rejoue dans une racine factice (/tmp/audit-032-029/…), comme
// l'audit 032-010 : le juge et ts-loader copiés, lib/ plans/ supabase/ node_modules/ en liens vers le dépôt, l'export muté à la place
// du vrai. Un TÉMOIN (export intact) est joué d'abord dans chaque racine : il doit rester vert, sinon la racine factice ment.
// Le juge des détecteurs prend --export=<chemin>. Aucun appel à n8n, à Supabase ni au réseau ; rien n'est écrit hors de ce dossier
// et de /tmp/audit-032-029.
//
// Lancement (depuis la racine du dépôt) : node .orchestre/preuves/032-029/mutations.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const DEPOT = process.cwd()
const ICI = path.join(DEPOT, '.orchestre/preuves/032-029')
const TMP = '/tmp/audit-032-029'
const lire = (f) => JSON.parse(fs.readFileSync(path.join(DEPOT, f), 'utf8'))
const copie = (o) => JSON.parse(JSON.stringify(o))
const wfDe = (e) => e.workflow || e
const noeud = (e, nom) => { const n = wfDe(e).nodes.find((x) => x.name === nom); if (!n) throw new Error('nœud absent : ' + nom); return n }

const EXPORTS = {
  suivi: '.orchestre/preuves/032-014/presti-suivi-artisan.workflow.json',
  briefing: '.orchestre/preuves/032-013/presti-briefing-matin.workflow.json',
  detecteurs: '.orchestre/preuves/032-019/presti-detecteurs.workflow.json',
}
const ORIGINAUX = Object.fromEntries(Object.entries(EXPORTS).map(([k, f]) => [k, lire(f)]))

// Un nœud d'envoi orphelin : jamais relié, mais présent (un geste dans l'éditeur suffit à le relier).
const envoiOrphelin = (nom, type, params) => ({ id: '00000000-0000-4000-8000-0000000000aa', name: nom, type, typeVersion: 2.1, position: [0, 400], parameters: params })

const MUTATIONS = [
  // ── presti-suivi-artisan
  { wf: 'suivi', nom: 'S1 « Garde du suivi » désactivée (n8n fait passer l’entrée telle quelle : registre, 5 jours et plafond sautés)',
    f: (e) => { noeud(e, 'Garde du suivi').disabled = true } },
  { wf: 'suivi', nom: 'S2 nœud e-mail orphelin (emailSend, non relié)',
    f: (e) => { wfDe(e).nodes.push(envoiOrphelin('Envoyer le suivi', 'n8n-nodes-base.emailSend', { fromEmail: 'contact@prestiapp.fr', toEmail: '={{ $json.email }}', subject: 'x', text: 'x' })) } },
  { wf: 'suivi', nom: 'S3 « Lire comptes » : created_at=gte.2000-01-01 (tous les comptes depuis 2000, filtre de fenêtre neutralisé)',
    f: (e) => { noeud(e, 'Lire comptes').parameters.queryParameters.parameters.find((p) => p.name === 'created_at').value = 'gte.2000-01-01' } },
  { wf: 'suivi', nom: 'S4 réglages : exécutions en erreur et manuelles conservées en plus (saveDataErrorExecution, saveManualExecutions)',
    f: (e) => { Object.assign(wfDe(e).settings, { saveDataErrorExecution: 'all', saveManualExecutions: true }) } },
  // ── presti-briefing-matin
  { wf: 'briefing', nom: 'B1 « Contrôle des lectures » désactivé (lectures tronquées ou inattendues plus vérifiées)',
    f: (e) => { noeud(e, 'Contrôle des lectures').disabled = true } },
  { wf: 'briefing', nom: 'B2 « Lire factures » : continueOnFail (ancienne clé de n8n ; une lecture en panne devient « aucun impayé »)',
    f: (e) => { noeud(e, 'Lire factures').continueOnFail = true } },
  { wf: 'briefing', nom: 'B3 « Lire messages » : hôte suffixé (gorcdvmueakcncsmrouo.supabase.co.exemple.invalid), même identifiant',
    f: (e) => { const n = noeud(e, 'Lire messages'); n.parameters.url = n.parameters.url.replace('.supabase.co/', '.supabase.co.exemple.invalid/') } },
  // ── presti-detecteurs
  { wf: 'detecteurs', nom: 'D1 « Lecture de connexion » : table artisans, returnAll (toutes les colonnes de tous les comptes, dont nom et e-mail)',
    f: (e) => { const p = noeud(e, 'Lecture de connexion (regles_automatisation)').parameters; p.tableId = 'artisans'; p.returnAll = true; delete p.limit } },
  { wf: 'detecteurs', nom: 'D2 « Niveau proposé selon l offre » désactivé (constats sans plafond d’offre ni portes du pilote)',
    f: (e) => { noeud(e, 'Niveau proposé selon l offre').disabled = true } },
  { wf: 'detecteurs', nom: 'D3 branche d’erreur : Slack après « Message d échec », qui poste le texte brut de l’erreur',
    f: (e) => {
      const w = wfDe(e)
      w.nodes.push({ id: '00000000-0000-4000-8000-0000000000bb', name: 'Poster l échec', type: 'n8n-nodes-base.slack', typeVersion: 2.3, position: [600, 900],
        parameters: { select: 'channel', channelId: { __rl: true, mode: 'name', value: '#presti-auto' }, text: "={{ $('Échec du passage').first().json.execution.error.message }}" },
        credentials: { slackApi: { id: 'slackFictif000001', name: 'Slack account' } } })
      w.connections['Message d échec'] = { main: [[{ node: 'Poster l échec', type: 'main', index: 0 }]] }
    } },
]

const mutants = {}
for (const m of MUTATIONS) { const e = copie(ORIGINAUX[m.wf]); m.f(e); mutants[m.nom] = { wf: m.wf, export: e } }
fs.writeFileSync(path.join(ICI, 'mutants.json'), JSON.stringify(mutants, null, 1))

// ── racines factices
const JUGES = {
  suivi: { script: 'suivi-artisan-qa.mjs', dossier: '.orchestre/preuves/032-014', fichiers: ['essai-n8n.json'], exportNom: 'presti-suivi-artisan.workflow.json' },
  briefing: { script: 'briefing-n8n-qa.mjs', dossier: '.orchestre/preuves/032-013', fichiers: ['essai.json', 'resume.md'], exportNom: 'presti-briefing-matin.workflow.json' },
}
function racine(cle, exportJson) {
  const J = JUGES[cle]
  const r = path.join(TMP, 'racine-' + cle)
  fs.rmSync(r, { recursive: true, force: true })
  fs.mkdirSync(path.join(r, 'scripts'), { recursive: true })
  fs.mkdirSync(path.join(r, J.dossier), { recursive: true })
  for (const f of [J.script, 'ts-loader.mjs']) fs.copyFileSync(path.join(DEPOT, 'scripts', f), path.join(r, 'scripts', f))
  for (const d of ['lib', 'plans', 'supabase', 'node_modules', 'app']) fs.symlinkSync(path.join(DEPOT, d), path.join(r, d))
  for (const f of ['package.json', 'tsconfig.json']) fs.copyFileSync(path.join(DEPOT, f), path.join(r, f))
  for (const f of J.fichiers) fs.copyFileSync(path.join(DEPOT, J.dossier, f), path.join(r, J.dossier, f))
  fs.writeFileSync(path.join(r, J.dossier, J.exportNom), JSON.stringify(exportJson, null, 2))
  return r
}
const nodeTs = ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs']
function jouer(cle, exportJson) {
  if (cle === 'detecteurs') {
    const f = path.join(TMP, 'detecteurs-mutant.workflow.json')
    fs.mkdirSync(TMP, { recursive: true })
    fs.writeFileSync(f, JSON.stringify(exportJson, null, 2))
    return spawnSync(process.execPath, [...nodeTs, 'scripts/detecteurs-n8n-qa.mjs', '--export=' + f], { cwd: DEPOT, encoding: 'utf8', maxBuffer: 1 << 26 })
  }
  const r = racine(cle, exportJson)
  return spawnSync(process.execPath, [...nodeTs, 'scripts/' + JUGES[cle].script], { cwd: r, encoding: 'utf8', maxBuffer: 1 << 26 })
}
function specs(exportJson) {
  const f = path.join(TMP, 'specs-mutant.workflow.json')
  fs.mkdirSync(TMP, { recursive: true })
  fs.writeFileSync(f, JSON.stringify(exportJson, null, 2))
  return spawnSync(process.execPath, [...nodeTs, 'scripts/n8n-specs-qa.mjs', f], { cwd: DEPOT, encoding: 'utf8', maxBuffer: 1 << 26 })
}
// Les lignes d'échec de la SUITE PRINCIPALE (avant la phase des mutants du juge, dont les « ✓ mutant … » ne nous disent rien).
const raisons = (sortie) => sortie.split('\n').filter((l) => /^\s*(✗|✘|×|KO|ÉCHEC|R\d |→)|ko|interdit|non permis|inattendu|hors gabarit|attendu/i.test(l) && !/✓ mutant|fait rougir la suite/.test(l)).slice(0, 4).map((l) => l.trim().slice(0, 220))

const resultats = []
for (const cle of ['suivi', 'briefing', 'detecteurs']) {
  const t = jouer(cle, ORIGINAUX[cle])
  console.log(`TÉMOIN ${cle} (export intact, même racine) : code ${t.status} — ${t.status === 0 ? 'vert, la racine factice ne ment pas' : 'ROUGE : racine factice à revoir'}`)
  if (t.status !== 0) console.log(t.stdout.slice(-1500), t.stderr.slice(-800))
}
for (const [nom, { wf, export: e }] of Object.entries(mutants)) {
  const j = jouer(wf, e)
  const s = specs(e)
  const r = { nom, juge: j.status === 0 ? 'VERT (trou)' : 'ROUGE', specs: s.status === 0 ? 'VERT' : 'ROUGE' }
  resultats.push(r)
  console.log(`\n${r.juge === 'ROUGE' ? '✓' : '✗'} ${nom}\n  juge du lot : ${r.juge} (code ${j.status})`)
  for (const l of raisons(j.stdout + '\n' + j.stderr)) console.log('    ' + l)
  console.log(`  n8n-specs-qa : ${r.specs} (code ${s.status})`)
  for (const l of raisons(s.stdout + '\n' + s.stderr)) console.log('    ' + l)
}
// Contrôle : les vrais exports n'ont pas bougé.
for (const [k, f] of Object.entries(EXPORTS)) if (JSON.stringify(lire(f)) !== JSON.stringify(ORIGINAUX[k])) console.log('ALERTE : export du dépôt modifié : ' + f)
console.log(`\n${resultats.filter((r) => r.juge === 'ROUGE').length}/${resultats.length} mutations rougies par le juge du lot ; ${resultats.filter((r) => r.specs === 'ROUGE').length}/${resultats.length} par n8n-specs-qa`)
