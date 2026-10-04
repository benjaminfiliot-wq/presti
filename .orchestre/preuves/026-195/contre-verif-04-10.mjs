const ID = '026-195'
const SCRIPT = 'contre-verif-04-10.mjs'
const INTRO = "Le pont Telegram (lib/agents/telegram.ts, les routes sortie et entree, le service scripts/usine/telegram.mjs, l'unité systemd et le document) est jugé par pont-telegram-qa --partie=routes,usine (PT-1 à PT-17). Ce que le pont ne doit JAMAIS pouvoir faire : lever une pause (la liste des commandes est fermée, aucune reprise, la route ne connaît que station_pause_par_agent) ni ouvrir un envoi (aucune commande d'envoi, aucune donnée de prospect ne sort) ; les sabotages 1, 2 et 3 le visent en premier."
const JUGE = 'node --import ./scripts/ts-loader.mjs scripts/pont-telegram-qa.mjs --partie=routes,usine --racine={racine}'
const SABOTAGES = [
  { nom: 'une-commande-de-reprise-dans-la-liste', fichier: 'lib/agents/telegram.ts', critere: 'PT-7',
    de: "Object.freeze(['pause', 'etat', 'consigne'] as const)",
    vers: "Object.freeze(['pause', 'etat', 'consigne', 'reprise'] as const)",
    quoi: 'une commande « reprise » entre dans la liste fermée : le téléphone pourrait lever la pause' },
  { nom: 'la-route-appelle-une-reprise', fichier: 'app/api/agents/telegram/entree/route.ts', critere: 'PT-4',
    de: "supabaseAdmin.rpc('station_pause_par_agent'",
    vers: "supabaseAdmin.rpc('station_reprise_par_agent'",
    quoi: 'la commande pause appelle une fonction de reprise au lieu de station_pause_par_agent' },
  { nom: 'donnees-de-prospect-dans-la-sortie', fichier: 'app/api/agents/telegram/sortie/route.ts', critere: 'PT-3',
    de: ".select('id, motif, cree_le')",
    vers: ".select('id, motif, cree_le, sujet, corps')",
    quoi: "la route sortie lit le sujet et le corps d'une alerte (donnée de prospect)" },
  { nom: 'sortie-sans-le-drapeau-busagents', fichier: 'app/api/agents/telegram/sortie/route.ts', critere: 'PT-2',
    de: "if (!actif('busAgents')) return erreur(404, 'introuvable')",
    vers: '/* drapeau busAgents retiré */',
    quoi: 'la route sortie répond même quand le drapeau busAgents est baissé' },
  { nom: 'mise-en-forme-markdown-des-messages', fichier: 'scripts/usine/telegram.mjs', critere: 'PT-9',
    de: '{ chat_id: chat, text: t, disable_web_page_preview: true }',
    vers: "{ chat_id: chat, text: t, parse_mode: 'Markdown', disable_web_page_preview: true }",
    quoi: 'les messages partent avec parse_mode (un texte piégé serait interprété)' },
  { nom: 'un-port-en-ecoute', fichier: 'scripts/usine/telegram.mjs', critere: 'PT-11',
    de: 'const FENETRE_APPAIRAGE_MS = 10 * 60_000',
    vers: "const FENETRE_APPAIRAGE_MS = 10 * 60_000\nimport('node:http').then((h) => h.createServer(() => {}).listen(0, '127.0.0.1'))",
    quoi: "le service ouvre un serveur HTTP (il doit rester en long polling, sans aucun port)" },
  { nom: 'unite-avec-un-fichier-d-environnement', fichier: 'scripts/usine/systemd/presti-telegram.service', critere: 'PT-13',
    de: 'User=agents\n',
    vers: 'User=agents\nEnvironmentFile=/etc/presti/telegram.env\n',
    quoi: "l'unité lit un EnvironmentFile (les jetons ne doivent venir que du coffre, par avec-coffre.mjs)" },
  { nom: 'appairage-sans-le-bon-code', fichier: 'scripts/usine/telegram.mjs', critere: 'PT-15',
    de: "if (!egaux(message.text.slice('/start '.length), CODE_ENV)) return",
    vers: '/* code non vérifié */',
    quoi: "n'importe quelle conversation qui écrit « /start x » est appairée" },
  { nom: 'le-document-ne-dit-plus-que-le-pont-ne-leve-pas-la-pause', fichier: 'docs/agents/telegram.md', critere: 'PT-14',
    de: "**Le pont ne lève jamais la pause : la reprise se fait à la station.** Il n'existe aucune commande de reprise, ni cachée ni d'un autre nom.",
    vers: 'Le pont est un outil pratique.',
    quoi: 'le document ne promet plus que le pont ne lève jamais la pause (phrase retirée en entier)' },
]
// ── Le corps commun des contre-vérifications du 04/10 (sabotages réversibles, jugés dans un arbre jetable) ─────────────
// Lancé SUR l'usine, dans le bac gelé (HEAD + paquet) : node .orchestre/preuves/<id>/contre-verif-04-10.mjs
// 1. extrait HEAD du bac (git archive) dans un dossier jetable, avec node_modules en liens physiques (cp -al) ;
// 2. juge cet arbre tel quel (le TÉMOIN : il doit passer) ;
// 3. pour chaque sabotage : remplace UN texte exact (il doit exister une fois) dans l'arbre jetable, relance le juge, note les critères
//    rouges, puis REMET le texte d'origine (réversible) ; le juge doit échouer, sur le critère attendu ;
// 4. rejuge l'arbre remis (le témoin revient au vert) et écrit .orchestre/preuves/<id>/contre-verif-04-10.md.
// Rien n'est écrit dans le dépôt du PC ni dans HEAD : l'arbre jetable est sous le dossier temporaire de l'usine, retiré à la fin.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const BAC = process.cwd()
const sh = (cmd, opts = {}) => spawnSync('bash', ['-c', cmd], { cwd: BAC, encoding: 'utf8', maxBuffer: 1 << 28, ...opts })
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `cv-${ID}-`))
const lignes = []
let tousPris = true

const ex = sh(`git archive HEAD | tar -x -C '${tmp}'`)
if (ex.status !== 0) { console.log(`✗ git archive : ${ex.stderr}`); process.exitCode = 2 }
else {
  sh(`cp -al '${BAC}/node_modules' '${tmp}/node_modules'`)
  // Les fichiers du juge corrigés au PC et pas encore commités (le bac les a, HEAD non) : posés sur l'arbre jetable.
  for (const o of (typeof SUPERPOSER === 'undefined' ? [] : SUPERPOSER)) { fs.mkdirSync(path.dirname(path.join(tmp, o)), { recursive: true }); fs.copyFileSync(path.join(BAC, o), path.join(tmp, o)) }
  const tete = sh('git rev-parse --short HEAD').stdout.trim()
  const juger = (extra = '') => {
    const r = spawnSync('bash', ['-c', `${JUGE.replaceAll('{racine}', tmp)} ${extra}`], { cwd: BAC, encoding: 'utf8', timeout: 20 * 60_000, maxBuffer: 1 << 28 })
    const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '')
    // Deux formats de bilan : « ✅ XT-1 … » / « ❌ XT-1 … » (juges du Poste) et « PASS PT-1 — … » / « FAIL PT-1 — … » (juges transverses).
    const rouges = [...sortie.matchAll(/^(?:❌|FAIL)\s+([A-Z]{1,4}-\S+)/gm)].map((m) => m[1])
    const verts = [...sortie.matchAll(/^(?:✅|PASS)\s+([A-Z]{1,4}-\S+)/gm)].map((m) => m[1])
    const rouge1 = (sortie.split(/\r?\n/).find((l) => l.startsWith('❌') || /^FAIL\s+[A-Z]{1,4}-/.test(l)) ?? '').slice(0, 230)
    return { code: r.status ?? 1, rouges, verts, rouge1 }
  }
  const t1 = juger()
  lignes.push(`| (témoin) l'arbre HEAD tel quel | — | — | ${t1.code === 0 ? 'PASS, code 0' : `**FAIL code ${t1.code}** (${t1.rouges.join(', ')})`} | ${t1.verts.length} critère(s) vert(s) | oui |`)
  if (t1.code !== 0) tousPris = false
  for (const s of SABOTAGES) {
    const f = path.join(tmp, s.fichier)
    const origine = fs.readFileSync(f, 'utf8')
    const n = origine.split(s.de).length - 1
    if (n !== 1) { lignes.push(`| ${s.nom} | \`${s.fichier}\` | ${s.critere} | **non appliqué** : le texte à remplacer apparaît ${n} fois (une seule attendue) | — | **non** |`); tousPris = false; continue }
    fs.rmSync(f); fs.writeFileSync(f, origine.replace(s.de, () => s.vers))
    const r = juger()
    fs.rmSync(f); fs.writeFileSync(f, origine) // réversible : le texte d'origine est remis
    const pris = r.code !== 0 && r.rouges.includes(s.critere)
    if (!pris) tousPris = false
    lignes.push(`| ${s.nom} | \`${s.fichier}\` | ${s.critere} | ${r.code === 0 ? '**PASS (non pris)**' : `FAIL code ${r.code}, rouges : ${r.rouges.join(', ') || '—'}`} ${r.rouge1 ? `· « ${r.rouge1.replace(/\|/g, '/')} »` : ''} | ${s.quoi} | ${pris ? 'oui' : '**non**'} |`)
  }
  const t2 = juger()
  lignes.push(`| (retour) l'arbre remis après les sabotages | — | — | ${t2.code === 0 ? 'PASS, code 0' : `**FAIL code ${t2.code}** (${t2.rouges.join(', ')})`} | témoin revenu au vert | ${t2.code === 0 ? 'oui' : '**non**'} |`)
  if (t2.code !== 0) tousPris = false
  const md = `# Contre-vérification du 04/10 — ${ID}

Écrite par \`${SCRIPT}\`, lancé SUR l'usine dans un bac gelé (HEAD \`${tete}\`) le ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}. ${INTRO}

Chaque sabotage remplace UN texte exact du code dans un arbre jetable (extrait de HEAD par \`git archive\`, \`node_modules\` en liens physiques), relance le juge, puis REMET le texte d'origine : rien n'est écrit dans le dépôt, tout est réversible. Pour rejouer : \`node scripts/usine.mjs executer --nom=cv --delai=30 --id=${ID} --rapatrier=.orchestre/preuves/${ID} -- node .orchestre/preuves/${ID}/${SCRIPT}\`.

Juge : \`${JUGE.replaceAll('{racine}', '<arbre jetable>')}\`

| Sabotage | Fichier | Critère attendu | Verdict du juge | Ce qui est cassé | Pris ? |
|---|---|---|---|---|---|
${lignes.join('\n')}

**Bilan : ${tousPris ? `les ${SABOTAGES.length} sabotages sont pris, le témoin est vert avant et après.` : 'AU MOINS UNE LIGNE EST ROUGE : voir « Pris ? » ci-dessus.'}**
`
  fs.mkdirSync(path.join(BAC, '.orchestre', 'preuves', ID), { recursive: true })
  fs.writeFileSync(path.join(BAC, '.orchestre', 'preuves', ID, 'contre-verif-04-10.md'), md)
  console.log(md)
  sh(`rm -rf '${tmp}'`)
  process.exitCode = tousPris ? 0 : 1
}
