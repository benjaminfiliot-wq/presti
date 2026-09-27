#!/usr/bin/env node
// Doublure de `codex exec` pour scripts/usine-relais-qa.mjs (banc d'essai du relais de fournisseur et de l'entraide de
// scripts/usine.mjs tourner). Choisie par PRESTI_CODEX_BIN ; jamais présente sur l'usine. Aucun réseau, aucun modèle.
// Elle lit les mêmes arguments que le vrai Codex (-C, -o, -m, -c model_provider=…, l'instruction en dernier) et note chaque
// appel dans BANC_JOURNAL (JSONL) : fournisseur, modèle, arguments, instruction, présence de FL_KEY.
// Réglages (variables d'environnement, posées par le banc) :
//   BANC_EPUISES     fournisseurs à bout, « chatgpt,ol,fl » ; « chatgpt@2 » = à bout à partir de son 2e appel seulement.
//                    À bout : la ligne d'erreur telle que Codex l'écrit (format réel de codex.log, 026-105 du 27/09), code 1.
//   BANC_BRUIT=1     écrit aussi des lignes qui NE sont PAS des erreurs de Codex (sortie de commande, texte de fiche) mais
//                    qui parlent de quota, de 429, d'Unauthorized : elles ne doivent déclencher aucun relais.
//   BANC_QUESTION=1  pose une question (.orchestre/en-cours/<id>.question.md) au lieu de travailler.
//   BANC_NE_PREND_PAS=1  ne prend pas la fiche (elle reste en file/).
//   BANC_ECRIT_PROSPECT=1  en travaillant, ajoute à sa copie de la fiche une colonne SIREN de prospects.
//   BANC_BRUIT=fin   les mêmes lignes de bruit, mais TOUT EN BAS de sa sortie (après son travail).
//   BANC_FUITE=1     affiche son environnement FL_KEY (comme un `env` lancé par Codex) : la clé atterrit dans codex.log.
//   BANC_LIGNES      lignes recopiées telles quelles en colonne 0 (séparées par |||), en tête de sa sortie (avant tout).
//   BANC_LIGNES_FIN  idem, mais tout en bas de sa sortie (après son travail), avant le dernier message.
//   BANC_DERNIER     texte ajouté à son dernier message (dernier-message.md), qu'il réimprime aussi à la fin de sa sortie,
//                    comme le vrai Codex (codex.log de 026-105 : le message final juste après « tokens used »).
//   BANC_CODE_<f>    code de sortie forcé quand il est servi par le fournisseur <f> (chatgpt, ol, fl), après son travail.
//   BANC_DORT_<f>    secondes d'attente avant de sortir, servi par <f> (pour être tué par le délai du tourneur).
//   BANC_ECRIT_PROSPECT_PAR=<f>  la note SIREN de BANC_ECRIT_PROSPECT n'est écrite que servi par <f>.
import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const val = (drapeau) => { const i = argv.indexOf(drapeau); return i >= 0 ? argv[i + 1] : null }
const configs = argv.flatMap((a, i) => (argv[i - 1] === '-c' ? [a] : []))
const fournisseur = (configs.find((c) => c.startsWith('model_provider=')) || 'model_provider=chatgpt').slice('model_provider='.length)
const instruction = argv[argv.length - 1]
const arbre = val('-C') || process.cwd()
const dernier = val('-o')
const id = (instruction.match(/travail\/usine\/([\w-]+)\.prompt\.md/) || [])[1] || 'inconnu'

const journal = process.env.BANC_JOURNAL
const noter = (o) => { if (journal) fs.appendFileSync(journal, JSON.stringify({ qui: 'codex', t: Date.now(), ...o }) + '\n') }
const appelsAvant = journal && fs.existsSync(journal)
  ? fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.qui === 'codex' && e.fournisseur === fournisseur).length
  : 0
const rang = appelsAvant + 1 // ce appel est le rang-ième pour ce fournisseur
noter({ fournisseur, modele: val('-m'), configs, argv, instruction, flKey: process.env.FL_KEY ?? null, rang, pid: process.pid })

if (process.env.BANC_LIGNES) for (const l of process.env.BANC_LIGNES.split('|||')) console.log(l)

const bruit = () => {
  // Ce que Codex recopie d'une commande qu'il a lancée (sed -n d'un fichier, sortie d'un test) : ni en colonne 0, ni « ERROR: ».
  console.log('exec\nbash -lc "sed -n 1,12p lib/banc.ts" in ' + arbre + '\n succeeded in 12ms:')
  console.log("    error: 'Unauthorized', status: 401 — usage limit atteint, 429 Too Many Requests, not included in your free usage")
  console.log("  la fiche dit : « ERROR: You've hit your usage limit » (texte cité, pas une erreur de Codex)")
  console.log('error: expected 429 got 200 (sortie d un test lance par Codex)')
}
if (process.env.BANC_BRUIT === '1') bruit()

if (process.env.BANC_FUITE === '1') console.log(`exec\nbash -lc env in ${arbre}\n succeeded in 3ms:\nFL_KEY=${process.env.FL_KEY ?? ''}`)

const aBout = (process.env.BANC_EPUISES || '').split(',').map((s) => s.trim()).filter(Boolean).some((e) => {
  const [nom, apres] = e.split('@')
  return nom === fournisseur && rang >= Number(apres || 1)
})
if (aBout) {
  const ligne = {
    chatgpt: 'ERROR: You’ve hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at 4:13 PM.',
    ol: 'ERROR: unexpected status 403 Forbidden: {"error":"this model is not included in your free usage, upgrade for access"}',
    fl: 'ERROR: exceeded retry limit, last status: 429 Too Many Requests, request id: banc-relais',
  }[fournisseur] || `ERROR: unexpected status 429 Too Many Requests (${fournisseur})`
  console.log(ligne)
  console.log(ligne) // Codex l'écrit deux fois (codex.log réel)
  process.exit(1)
}

const orch = path.join(arbre, '.orchestre')
const f = (d) => path.join(orch, d, `${id}.md`)
if (process.env.BANC_QUESTION === '1') {
  fs.mkdirSync(path.join(orch, 'en-cours'), { recursive: true })
  if (fs.existsSync(f('file'))) fs.renameSync(f('file'), f('en-cours'))
  fs.writeFileSync(path.join(orch, 'en-cours', `${id}.question.md`), 'Question du banc : quelle colonne garder ?\n')
  if (dernier) fs.writeFileSync(dernier, `${id} : QUESTION posée\n`)
  console.log('question posée')
  process.exit(0)
}
if (process.env.BANC_NE_PREND_PAS !== '1' && fs.existsSync(f('file'))) {
  fs.mkdirSync(path.join(orch, 'en-cours'), { recursive: true })
  fs.renameSync(f('file'), f('en-cours'))
}
if (process.env.BANC_ECRIT_PROSPECT === '1' && (!process.env.BANC_ECRIT_PROSPECT_PAR || process.env.BANC_ECRIT_PROSPECT_PAR === fournisseur) && fs.existsSync(f('en-cours'))) {
  fs.appendFileSync(f('en-cours'), '\nNote de travail : la table gardera la colonne SIREN des prospects importés.\n')
}
fs.writeFileSync(path.join(arbre, 'banc-travail.txt'), `travail de ${fournisseur}, appel ${rang}\n`, { flag: 'a' })
const message = `${id} : PRÊT — travail du banc (${fournisseur})${process.env.BANC_DERNIER ? '\n' + process.env.BANC_DERNIER : ''}\n`
if (dernier) fs.writeFileSync(dernier, message)
console.log(`codex (doublure) : travail fait par ${fournisseur}`)
if (process.env.BANC_BRUIT === 'fin') bruit()
if (process.env.BANC_LIGNES_FIN) for (const l of process.env.BANC_LIGNES_FIN.split('|||')) console.log(l)
if (process.env.BANC_DERNIER) process.stdout.write(message)
const dort = Number(process.env[`BANC_DORT_${fournisseur}`]) || 0
const code = Number(process.env[`BANC_CODE_${fournisseur}`]) || 0
if (dort) setTimeout(() => process.exit(code), dort * 1000)
else process.exitCode = code
