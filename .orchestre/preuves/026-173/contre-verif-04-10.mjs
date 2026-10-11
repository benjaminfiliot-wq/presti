const ID = '026-173'
const SCRIPT = 'contre-verif-04-10.mjs'
const INTRO = "Les trois modules purs de la personnalisation (lib/pilotage/theme.ts, disposition.ts, reglages.ts) sont jugés par station-themes-qa --partie=modules (TH-1 à TH-6), dont le témoin est vert sur l'arbre HEAD."
const JUGE = 'node --import ./scripts/ts-loader.mjs scripts/station-themes-qa.mjs --partie=modules --racine={racine}'
const SABOTAGES = [
  { nom: 'date-now-dans-un-module-pur', fichier: 'lib/pilotage/disposition.ts', critere: 'TH-1',
    de: 'const refus = (raison: string): VerdictDisposition => ({ ok: false, raison })',
    vers: 'const refus = (raison: string): VerdictDisposition => ({ ok: false, raison: raison + String(Date.now()) })',
    quoi: "un module pur lit l'horloge (Date.now)" },
  { nom: 'reservee-deplacable', fichier: 'lib/pilotage/disposition.ts', critere: 'TH-3',
    de: 'if (aCle(salles, SALLE_RESERVEE.cle) && salles[SALLE_RESERVEE.cle] !== reservee?.cle) return refus(',
    vers: 'if (false && salles[SALLE_RESERVEE.cle] !== reservee?.cle) return refus(',
    quoi: 'la salle réservée E-commerce peut être déplacée' },
  { nom: 'schema-des-reglages-ouvert', fichier: 'lib/pilotage/reglages.ts', critere: 'TH-4',
    de: "inconnues(brut, CLES_REGLAGES, 'les réglages', raisons)",
    vers: '/* clés inconnues tolérées */',
    quoi: "une clé inconnue des réglages n'est plus refusée" },
  { nom: 'nom-de-17-signes-accepte', fichier: 'lib/pilotage/reglages.ts', critere: 'TH-4',
    de: 'texteBorne(v.nom, 2, 16)',
    vers: 'texteBorne(v.nom, 2, 40)',
    quoi: 'la borne des noms passe de 16 à 40 signes' },
  { nom: 'defauts-plus-forts-que-les-reglages', fichier: 'lib/pilotage/reglages.ts', critere: 'TH-5',
    de: 'if (estObjet(reglages)) injecter(base, reglages)',
    vers: 'if (estObjet(reglages)) { const inverse = copier(reglages); injecter(inverse, base); return inverse }',
    quoi: 'la fusion donne le dessus au défaut du thème' },
  { nom: 'css-libre-pose-sur-le-noeud', fichier: 'lib/pilotage/reglages.ts', critere: 'TH-6',
    de: "if ((MISES_EN_PAGE as readonly string[]).includes(page)) noeud.setAttribute('data-mise-en-page', page)",
    vers: "if ((MISES_EN_PAGE as readonly string[]).includes(page)) noeud.setAttribute('data-mise-en-page', page)\n  noeud.style.setProperty('background-image', 'url(x)')",
    quoi: 'appliquerReglages pose une propriété CSS hors des jetons --mc-*' },
  { nom: 'couleur-libre-dans-le-theme', fichier: 'lib/pilotage/theme.ts', critere: 'TH-2',
    de: "const COULEUR: Sch = { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }",
    vers: "const COULEUR: Sch = { type: 'string' }",
    quoi: "validerTheme accepte une couleur qui n'est pas #RRGGBB" },
  { nom: 'champ-inconnu-tolere-dans-le-theme', fichier: 'lib/pilotage/theme.ts', critere: 'TH-2',
    de: "({ type: 'object', required, additionalProperties: false, properties })",
    vers: "({ type: 'object', required, additionalProperties: true, properties })",
    quoi: 'validerTheme tolère un champ inconnu' },
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
