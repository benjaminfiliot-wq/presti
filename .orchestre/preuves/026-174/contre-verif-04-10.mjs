const ID = '026-174'
const SCRIPT = 'contre-verif-04-10.mjs'
const BASE = '1b96f8ca39acf4164f00ae8303c9599892eaf67f'
const INTRO = `Les lectures du Poste sorties vers lib/controle/lectures/ et les six routes qui les importent sont jugées par poste-extraction-qa (XT-1 à XT-5). Le juge compare les sorties des routes à une RÉFÉRENCE : par défaut HEAD, qui contient déjà l'extraction (le défaut ne prouve alors que l'accord de l'arbre avec lui-même) ; ces passages donnent donc --base=${BASE}, le commit d'AVANT l'extraction (parent de 78fe3ee5), pour que XT-2 compare l'état extrait au Poste d'origine. Une première série (même jour, 10:03Z) avait laissé passer le sabotage « plafond des abus ramené de 30 à 29 » : le jeu d'essai n'avait que trois IP d'abus, le plafond ne se voyait pas. Le jeu d'essai (scripts/fixtures/026-pilotage/t/extraction/base.mjs, ABUS) a été étoffé de 31 IP distinctes (ajout seul, rien d'assoupli) ; cette série le porte.`
const JUGE = `node scripts/poste-extraction-qa.mjs --base=${BASE} --racine={racine}`
const SABOTAGES = [
  { nom: 'une-route-recalcule-sa-lecture', fichier: 'app/api/controle/audience/route.ts', critere: 'XT-1',
    de: "const avecHistorique = new URL(req.url).searchParams.get('historique') === '1'",
    vers: "const avecHistorique = new URL(req.url).searchParams.get('historique') === '1'\n  await (await import('@/lib/supabaseAdmin')).supabaseAdmin.rpc('audience_direct')",
    quoi: "la route audience relit elle-même audience_direct au lieu de s'en tenir à la lecture extraite" },
  { nom: 'sortie-des-bans-tronquee', fichier: 'lib/controle/lectures/bans.ts', critere: 'XT-2',
    de: '.slice(0, 30)', vers: '.slice(0, 29)',
    quoi: 'la liste des abus rend 29 IP au lieu de 30 : la sortie de la route change' },
  { nom: 'requete-des-bans-modifiee', fichier: 'lib/controle/lectures/bans.ts', critere: 'XT-2',
    de: '.limit(200)', vers: '.limit(100)',
    quoi: 'la requête en base des bans change de limite (la sortie peut rester la même, la requête non)' },
  { nom: 'fenetre-d-historique-changee', fichier: 'lib/controle/lectures/audience.ts', critere: 'XT-2',
    de: "{ p_jours: 30 }", vers: "{ p_jours: 31 }",
    quoi: "l'historique d'audience demande 31 jours au lieu de 30" },
  { nom: 'ticket-avec-une-colonne-de-contenu', fichier: 'lib/controle/lectures/tickets.ts', critere: 'XT-3',
    de: ".select('id', { count: 'exact', head: true })", vers: ".select('id, message', { count: 'exact', head: true })",
    quoi: 'le compte des tickets ouverts sélectionne la colonne message' },
  { nom: 'drapeau-de-la-route-audience-retire', fichier: 'app/api/controle/audience/route.ts', critere: 'XT-4',
    de: "if (!actif('audience')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })", vers: '/* drapeau audience retiré */',
    quoi: "la route audience ne lit plus son drapeau (levée par erreur : la mesure répondrait mesure baissée)" },
  { nom: 'erreur-de-type-dans-une-lecture', fichier: 'lib/controle/lectures/tickets.ts', critere: 'XT-5',
    de: "export async function ticketsOuverts(): Promise<{ nombre: number }> {",
    vers: "export const NOMBRE_FAUX: number = 'oui'\nexport async function ticketsOuverts(): Promise<{ nombre: number }> {",
    quoi: 'une erreur de type : npm run typecheck rougit' },
]
const SUPERPOSER = ['scripts/fixtures/026-pilotage/t/extraction/base.mjs']
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
    const rouges = [...sortie.matchAll(/^❌\s+(\S+)/gm)].map((m) => m[1])
    const verts = [...sortie.matchAll(/^✅\s+(\S+)/gm)].map((m) => m[1])
    const rouge1 = (sortie.split(/\r?\n/).find((l) => l.startsWith('❌')) ?? '').slice(0, 230)
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
