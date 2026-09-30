// scripts/ecommerce-reservee-qa.mjs — le juge de la branche e-commerce et dropshipping RÉSERVÉE (fiche 026-171, décision 7 de Benj
// du 25/09), écrit par Claude Code AVANT la fiche 026-176 qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
// Hors ligne : ni compte, ni clé, ni serveur ; tourne aussi sur l'usine.
//
//   node scripts/ecommerce-reservee-qa.mjs [--racine=<arbre>] [--base=<commit>] [--temoin]
//
//   --racine=<arbre>   juge cet arbre (référence, témoin ou sabotage de la preuve 026-012) au lieu du dépôt ;
//   --base=<commit>    le commit dont EC-5 mesure le diff de lib/flags.ts et de scripts/fermeture-e2e.mjs (défaut : la variable
//                      JUGE_BASE_GIT posée par la preuve, sinon HEAD) ;
//   --temoin           juge une COPIE (.orchestre/travail/ecommerce-reservee-qa/temoin/) où le juge pose LUI-MÊME les lignes
//                      attendues (le drapeau et son commentaire, la ligne de la CARTE, le LISEZMOI) sur les fichiers du dépôt ;
//                      le diff se mesure alors contre ces mêmes fichiers avant la pose. EC-4 (rien de construit) se lit dans le dépôt.
//
// Critères (le cahier de 026-171) :
//   EC-1 FLAGS.ecommerce === false dans lib/flags.ts (valeur relue par un enfant, pas seulement lue), avec son commentaire
//        (« branche réservée par Benj le 25/09 : rien n'est construit ; elle attend ses trois vidéos sources »)
//   EC-2 la CARTE de scripts/fermeture-e2e.mjs porte 'ecommerce' en ['note', pourquoi]
//   EC-3 docs/ecommerce/LISEZMOI.md : non vide, cite le drapeau `ecommerce`, dit « rien n'est construit » et « trois vidéos sources »
//   EC-4 aucun fichier sous app/**/ecommerce/**, app/api/ecommerce/** ni lib/ecommerce/** ; aucune table ecommerce dans supabase/migrations/
//   EC-5 le diff de lib/flags.ts et de scripts/fermeture-e2e.mjs se limite à ces lignes (rien retiré, un seul bloc chacun)
//
// Sortie : « ✅ EC-n … » ou « ❌ EC-n … » par critère, puis « ecommerce-reservee-qa … : PASS|FAIL ». Code 0 seulement si tout est vert,
// 1 si un critère est rouge, 2 si l'appel est invalide ou si un préalable manque (commit de base introuvable). N'écrit que sous
// .orchestre/travail/ecommerce-reservee-qa/ ; aucun réseau ; ne lit ni .env.local ni aucune clé.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, lireOptions, creerSortie, premiereLigne, court, sansCommentaires, git, exigerSousTravail, lireOuNull } from './fixtures/026-pilotage/a/commun.mjs'
import { LIGNES_ECOMMERCE, diffLignes } from './fixtures/026-pilotage/t/outils.mjs'

const JUGE = 'ecommerce-reservee-qa'
const o = lireOptions(process.argv.slice(2), { connues: ['base'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
const BASE = o.valeurs.base ?? process.env.JUGE_BASE_GIT ?? 'HEAD'
if (!/^[\w.^~/-]{1,80}$/.test(BASE)) refuser(`--base « ${BASE} » : un commit attendu`)
const NOM = `${JUGE}${o.temoin ? ' --temoin' : ''}`
const posix = (p) => p.split(path.sep).join('/')
const FLAGS = 'lib/flags.ts', FERMETURE = 'scripts/fermeture-e2e.mjs', DOC = 'docs/ecommerce/LISEZMOI.md'
const IDS = ['EC-1', 'EC-2', 'EC-3', 'EC-4', 'EC-5']

// ── La racine jugée, et de quoi mesurer le diff ──────────────────────────────────────────────────────────────────────────
let racine = o.racine, racineRien = o.racine // où EC-4 cherche ce qui ne doit pas exister
let entete = `${NOM} — racine ${posix(path.relative(R, racine)) || '.'}, base ${BASE}`
let prealable = false
const basesTemoin = new Map()
if (o.temoin) {
  try {
    const dest = exigerSousTravail(path.join(TRAVAIL, JUGE, 'temoin'))
    fs.rmSync(dest, { recursive: true, force: true })
    const poser = (rel, texte) => { fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true }); fs.writeFileSync(path.join(dest, rel), texte) }
    const pose = (rel, avant, ajout) => {
      const src = fs.readFileSync(path.join(R, rel), 'utf8')
      basesTemoin.set(rel, src)
      if (/^\s*'?ecommerce'?\s*:/m.test(src)) return poser(rel, src) // déjà posé dans le dépôt (026-176 livrée) : rien à ajouter
      if (src.split(avant).length !== 2) throw new Error(`${rel} : l'ancre « ${avant.trim()} » est absente ou en double (le juge ne sait pas où poser ses lignes)`)
      poser(rel, src.replace(avant, () => ajout + avant))
    }
    pose(FLAGS, '} as const', `${LIGNES_ECOMMERCE.drapeauCommentaire}\n${LIGNES_ECOMMERCE.drapeau}\n`)
    pose(FERMETURE, "    'inventaireOcr':", `${LIGNES_ECOMMERCE.carte}\n`)
    poser(DOC, LIGNES_ECOMMERCE.doc)
    racine = dest; racineRien = R
    entete = `${NOM} — copie de lib/flags.ts et scripts/fermeture-e2e.mjs du dépôt où le juge pose lui-même les lignes attendues, sous ${posix(path.relative(R, dest))}`
  } catch (e) { console.log(`${NOM} : préalable — la copie du témoin ne se fait pas (${premiereLigne(e)})`); process.exit(2) }
}
const s = creerSortie(NOM, IDS, entete)
const lire = (rel) => lireOuNull(path.join(racine, rel))
const brutBase = (rel) => {
  if (basesTemoin.has(rel)) return basesTemoin.get(rel)
  const r = git(['show', `${BASE}:${rel}`])
  if (r.code !== 0) throw new Error(`git show ${BASE}:${rel} : ${court(r.stderr || r.erreur, 100)}`)
  return r.stdout
}

// ── EC-1 : le drapeau, sa valeur, son commentaire ───────────────────────────────────────────────────────────────────────
await s.critere('EC-1', () => {
  const e = []
  const src = lire(FLAGS)
  if (src === null) return { echecs: [`${FLAGS} absent`], detail: '' }
  const code = sansCommentaires(src)
  const bloc = /export const FLAGS = \{([\s\S]*?)\n\} as const/.exec(code)
  if (!bloc) return { echecs: [`${FLAGS} : le bloc « export const FLAGS = { … } as const » est introuvable`], detail: '' }
  const lignes = bloc[1].split('\n').filter((l) => /^\s*ecommerce\s*:/.test(l))
  if (lignes.length !== 1) e.push(`${lignes.length} déclaration(s) de « ecommerce » dans FLAGS, une seule attendue`)
  else if (!/^\s*ecommerce\s*:\s*false\s*,\s*$/.test(lignes[0])) e.push(`« ${lignes[0].trim()} » : « ecommerce: false, » attendu`)
  // La VALEUR, relue : un enfant importe lib/flags.ts (aucune lecture de texte ne remplace cela).
  const f = spawnSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', `const m = await import(${JSON.stringify(pathToFileURL(path.join(racine, FLAGS)).href)}); console.log('@@ ' + JSON.stringify({ v: m.FLAGS.ecommerce, actif: m.actif('ecommerce'), n: Object.keys(m.FLAGS).length }))`], { cwd: R, encoding: 'utf8', timeout: 60_000, env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', NODE_OPTIONS: process.env.NODE_OPTIONS ?? '', PIEGE_RESEAU_JOURNAL: process.env.PIEGE_RESEAU_JOURNAL ?? '' } })
  const l = (f.stdout ?? '').split(/\r?\n/).find((x) => x.startsWith('@@ '))
  let valeur = null
  if (!l) e.push(`lib/flags.ts ne s'importe pas (code ${f.status}) : ${court(f.stderr, 120)}`)
  else { valeur = JSON.parse(l.slice(3)); if (valeur.v !== false || valeur.actif !== false) e.push(`FLAGS.ecommerce vaut ${JSON.stringify(valeur.v)} et actif('ecommerce') ${JSON.stringify(valeur.actif)} : false et false attendus`) }
  // Le commentaire : les lignes de commentaire qui précèdent immédiatement la déclaration, dans le source brut.
  const brut = src.split('\n')
  const i = brut.findIndex((l2) => /^\s*ecommerce\s*:\s*false\s*,/.test(l2))
  if (i >= 0) {
    const c = []
    for (let k = i - 1; k >= 0 && /^\s*(?:\/\*|\*|\/\/|.*\*\/\s*$)/.test(brut[k]); k--) c.unshift(brut[k])
    const t = c.join(' ')
    if (!c.length) e.push('« ecommerce: false, » n\'a pas de commentaire au-dessus (la règle de lib/flags.ts : chaque drapeau dit pourquoi)')
    else {
      if (!/branche r[ée]serv[ée]e par Benj le 25\/09/i.test(t)) e.push('le commentaire ne dit pas « branche réservée par Benj le 25/09 »')
      if (!/rien n['’]est construit/i.test(t)) e.push('le commentaire ne dit pas « rien n\'est construit »')
      if (!/(?:trois|six) vid[ée]os sources/i.test(t)) e.push('le commentaire ne dit pas « trois vidéos sources »')
    }
  }
  return { echecs: e, detail: `FLAGS.ecommerce === false (importé : ${valeur ? `${valeur.n} drapeaux, ecommerce ${valeur.v}, actif ${valeur.actif}` : '—'}), déclaré une fois, avec son commentaire (branche réservée par Benj le 25/09, rien n'est construit, trois vidéos sources)` }
})

// ── EC-2 : la ligne « note » de la CARTE ───────────────────────────────────────────────────────────────────────────────
await s.critere('EC-2', () => {
  const src = lire(FERMETURE)
  if (src === null) return { echecs: [`${FERMETURE} absent`], detail: '' }
  const code = sansCommentaires(src)
  const debut = code.indexOf('const CARTE = {')
  if (debut < 0) return { echecs: [`${FERMETURE} : « const CARTE = { » est introuvable`], detail: '' }
  const fin = code.indexOf('\n  }', debut)
  const bloc = code.slice(debut, fin < 0 ? undefined : fin)
  const lignes = bloc.split('\n').filter((l) => /^\s*['"`]?ecommerce['"`]?\s*:/.test(l))
  const e = []
  if (lignes.length !== 1) e.push(`${lignes.length} ligne(s) « ecommerce » dans la CARTE, une seule attendue`)
  else {
    const m = /^\s*(['"`])ecommerce\1\s*:\s*\[\s*(['"`])note\2\s*,\s*(['"`])((?:(?!\3).){10,})\3\s*\]\s*,\s*$/.exec(lignes[0])
    if (!m) e.push(`« ${court(lignes[0], 100)} » : « 'ecommerce': ['note', 'pourquoi'], » attendu (la branche ne ferme rien : elle est réservée)`)
    else if (!/r[ée]serv/i.test(m[4])) e.push('la note ne dit pas que la branche est réservée')
  }
  return { echecs: e, detail: 'la CARTE porte \'ecommerce\' en [\'note\', …] : le drapeau ne ferme rien et documente une absence (fermeture-e2e le veut baissé et sans lecteur)' }
})

// ── EC-3 : le LISEZMOI ─────────────────────────────────────────────────────────────────────────────────────────────────
await s.critere('EC-3', () => {
  const t = lire(DOC)
  if (t === null) return { echecs: [`${DOC} absent`], detail: '' }
  const e = []
  if (t.trim().length < 200) e.push(`${DOC} ne compte que ${t.trim().length} signes (200 au moins : un fichier vide ou d'un mot n'est pas un LISEZMOI)`)
  if (!/drapeau[^.\n]{0,40}`ecommerce`|`ecommerce`[^.\n]{0,40}drapeau/i.test(t)) e.push('le LISEZMOI ne cite pas le drapeau « `ecommerce` » (le mot « drapeau » et `ecommerce` dans la même phrase)')
  if (!/rien n['’]est construit/i.test(t)) e.push('le LISEZMOI ne dit pas « rien n\'est construit »')
  const v = /(trois|six) vid[ée]os sources/i.exec(t)
  if (!v) e.push('le LISEZMOI ne dit pas « trois vidéos sources »')
  else if (/six/i.test(v[1]) && !(/(?:quatorze|14) inventaires/i.test(t) && /\b\d{2}\/09\b/.test(t))) e.push('la correction du 27/09 (six vidéos) veut aussi « quatorze inventaires » et des dates (JJ/09)')
  return { echecs: e, detail: `${DOC} : ${t.trim().length} signes, cite le drapeau \`ecommerce\`, dit « rien n'est construit » et « ${v ? v[0] : '?'} »` }
})

// ── EC-4 : rien n'est construit ────────────────────────────────────────────────────────────────────────────────────────
await s.critere('EC-4', () => {
  const e = []
  const marche = (dossier, filtre) => {
    const abs = path.join(racineRien, dossier)
    if (!fs.existsSync(abs)) return
    const voir = (d, r) => {
      for (const x of fs.readdirSync(d, { withFileTypes: true })) {
        if (x.name === 'node_modules' || x.name === '.next') continue
        const rr = r ? `${r}/${x.name}` : x.name
        if (filtre(rr, x)) e.push(`${dossier}/${rr} : rien n'est construit pour la branche e-commerce`)
        if (x.isDirectory()) voir(path.join(d, x.name), rr)
      }
    }
    voir(abs, '')
  }
  const nomEcommerce = /^ecommerce(?:[-_.].*)?$/i
  marche('app', (rr) => nomEcommerce.test(rr.split('/').at(-1) ?? ''))
  marche('lib', (rr) => rr.split('/')[0] === 'ecommerce' || nomEcommerce.test(rr.split('/').at(-1) ?? '') && rr.split('/').length === 1)
  const mig = path.join(racineRien, 'supabase', 'migrations')
  let n = 0
  if (fs.existsSync(mig)) for (const f of fs.readdirSync(mig)) {
    n++
    if (/ecommerce/i.test(f)) e.push(`supabase/migrations/${f} : le nom parle d'e-commerce`)
    if (!f.endsWith('.sql')) continue
    const sql = fs.readFileSync(path.join(mig, f), 'utf8').replace(/--[^\n]*/g, '')
    if (/\b(?:create|alter|drop|comment\s+on)\s+(?:table|view|materialized\s+view|type|index)\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:"?\w+"?\.)?"?ecommerce/i.test(sql)) e.push(`supabase/migrations/${f} : une table ou un objet « ecommerce »`)
  }
  return { echecs: e, detail: `aucun fichier « ecommerce » sous app/ ni lib/, aucune table « ecommerce » dans ${n} migrations (relu sur ${o.temoin ? 'le dépôt' : posix(path.relative(R, racineRien)) || 'le dépôt'})` }
})

// ── EC-5 : le diff se limite à ces lignes ──────────────────────────────────────────────────────────────────────────────
await s.critere('EC-5', () => {
  const e = [], notes = []
  const COMMENTAIRE = /^\s*(?:\/\*|\*|\/\/|.*\*\/\s*$)/
  for (const [rel, regle] of [[FLAGS, 'flags'], [FERMETURE, 'carte']]) {
    const actuel = lire(rel)
    if (actuel === null) { e.push(`${rel} absent`); continue }
    let base
    try { base = brutBase(rel) } catch (err) { prealable = true; e.push(`préalable manquant : ${premiereLigne(err)}`); continue }
    const blocs = diffLignes(base, actuel)
    let marque = 0
    for (const b of blocs) {
      const cible = regle === 'flags' ? /^\s*ecommerce\s*:\s*false\s*,\s*$/ : /^\s*'ecommerce'\s*:\s*\['note'\s*,/
      if (b.ajoutees.some((l) => cible.test(l))) {
        marque++
        if (b.retirees.length) e.push(`${rel} : une ligne retirée à côté de celle de la branche (« ${court(b.retirees[0], 70)} »)`)
        for (const l of b.ajoutees) if (!cible.test(l) && !COMMENTAIRE.test(l)) e.push(`${rel} : « ${court(l, 70)} » ajouté avec la ligne de la branche (le commentaire et la ligne seulement)`)
      } else if (regle === 'carte' && b.retirees.length === 1 && b.ajoutees.length === 1 && /^\s*'pilotage'\s*:\s*\['route'\s*,\s*'\/api\/controle\/pilotage'\s*,\s*'GET'/.test(b.retirees[0]) && /^\s*'pilotage'\s*:\s*\['route'\s*,\s*'\/api\/controle\/pilotage'\s*,\s*'GET'/.test(b.ajoutees[0])) {
        notes.push('la ligne « pilotage » de la CARTE est celle d\'une fiche antérieure (026-177, ses routes), tolérée')
      } else e.push(`${rel} : ${b.ajoutees.length} ligne(s) ajoutée(s) et ${b.retirees.length} retirée(s) hors de la branche e-commerce (« ${court(b.ajoutees[0] ?? b.retirees[0], 80)} »)`)
    }
    if (marque > 1) e.push(`${rel} : ${marque} blocs pour la branche, un seul attendu`)
    notes.push(`${rel} : ${blocs.length} bloc de différence${blocs.length > 1 ? 's' : ''} contre ${o.temoin ? 'le fichier du dépôt avant la pose' : BASE}`)
  }
  return { echecs: e, detail: `${notes.join(' ; ')} ; rien de retiré, seulement le drapeau (avec son commentaire) et la ligne de la CARTE` }
})

const code = s.finir()
process.exit(code === 0 ? 0 : prealable ? 2 : 1)
