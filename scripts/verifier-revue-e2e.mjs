#!/usr/bin/env node
// Banc du vérificateur de la revue hebdomadaire du réseau neuronal (scripts/verifier-revue-reseau-neuronal.mjs, 02/11/2026).
// Hors ligne, sans IA, rien d'écrit hors d'un dossier temporaire (os.tmpdir()) : un vault et un dépôt d'essai, un rapport conforme
// et son fichier Anki (ils doivent passer), puis des mutants qui doivent rougir, dont « 7 cartes annoncées pour 8 lignes » (la
// revue réelle du 01/11). Zéro donnée réelle : le nom, le téléphone et l'adresse des mutants sont fabriqués (domaine en .zz, qui
// n'existe pas). Le banc vérifie aussi que les six gestes du brief (plans/011-cadrage-01-11/briefs/revue-hebdo-reseau-neuronal.md)
// sont ceux que cherche le vérificateur : le brief change ses titres, le banc rougit.
// Mutation du vérificateur lui-même : VERIFIER_REVUE_MODULE=<copie modifiée> node scripts/verifier-revue-e2e.mjs doit sortir en 1.
//   node scripts/verifier-revue-e2e.mjs   → « N réussis, M échoués » ; code 0 si tout passe, 1 sinon
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL, fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MODULE = path.resolve(process.env.VERIFIER_REVUE_MODULE || path.join(RACINE, 'scripts', 'verifier-revue-reseau-neuronal.mjs'))
const BRIEF = path.join(RACINE, 'plans', '011-cadrage-01-11', 'briefs', 'revue-hebdo-reseau-neuronal.md')
const V = await import(pathToFileURL(MODULE).href)

let reussis = 0, echecs = 0
const verifier = (nom, ok, detail = '') => { if (ok) { reussis++; console.log(`✓ ${nom}`) } else { echecs++; console.log(`✗ ${nom}${detail ? ` — ${detail}` : ''}`) } }

// Exemples fabriqués, assemblés ici pour qu'aucun ne figure d'un seul tenant dans le fichier.
const TEL = ['06', '39', '98', '12', '34'].join(' ')
const MEL = ['artisan.fictif', 'essai-revue.zz'].join('@')
const NOM = ['Jean', 'Dupont'].join(' ')

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'verifier-revue-'))
const DATE = '2026-11-08'
const VAULT = path.join(TMP, 'vault')
const PRESTI = path.join(TMP, 'presti')
const RACINES = { vault: VAULT, presti: PRESTI }
const ecrire = (abs, s) => { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, s) }
const slash = (p) => p.replace(/\\/g, '/')

// La garde réelle (cerveau/src/garde-contenu.mjs) n'existe que sur le PC de Benj. Ailleurs (audit de nuit sur GitHub), une garde
// d'essai aux motifs simples la remplace, pour que le reste du banc joue quand même ; elle n'est jamais une preuve de la vraie.
const GARDE_REELLE = fs.existsSync(V.GARDE)
const GARDE = GARDE_REELLE ? V.GARDE : path.join(TMP, 'garde-essai.mjs')
if (!GARDE_REELLE) {
  ecrire(GARDE, [
    "export function premierInterdit(texte, quoi = 'texte') {",
    '  const t = String(texte)',
    "  if (/(?<!\\d)0[1-9](?:[\\s.-]?\\d{2}){4}(?!\\d)/.test(t)) return `${quoi} : numéro de téléphone refusé (garde d’essai)`",
    "  if (/[\\p{L}\\p{N}._%+-]+@[\\p{L}\\p{N}-]+(?:\\.[\\p{L}\\p{N}-]+)*\\.\\p{L}{2,}/u.test(t)) return `${quoi} : adresse e-mail refusée (garde d’essai)`",
    "  if (/\\bJean Dupont\\b/.test(t)) return `${quoi} : nom de personne refusé (garde d’essai)`",
    '  return null',
    '}',
  ].join('\n') + '\n')
  console.log(`— garde du réseau neuronal absente de ce poste (${V.GARDE}) : garde d’essai à motifs simples`)
}

// ── le monde fabriqué ──────────────────────────────────────────────────────────────────────────────────────────────────────────
ecrire(path.join(VAULT, 'Decisions', 'Journal-Essai.md'), Array.from({ length: 30 }, (_, i) => `ligne ${i + 1} du journal d'essai`).join('\n') + '\n')
ecrire(path.join(VAULT, 'Produit', 'Note-Essai.md'), '# Note d’essai\n\nUne règle d’essai.\n')
ecrire(path.join(PRESTI, 'plans', 'briefs', 'brief-essai.md'), '# Brief d’essai\n')
ecrire(path.join(TMP, 'hors-reseau.md'), '# Hors du réseau\n')
const SOURCES = ['vault/Produit/Note-Essai.md', 'vault/Decisions/Journal-Essai.md:12', 'presti/plans/briefs/brief-essai.md',
  'vault/Decisions/Journal-Essai.md#une-section', 'vault/Produit/Note-Essai.md ; presti/plans/briefs/brief-essai.md:1']
const carte = (i, source = SOURCES[i % SOURCES.length]) => `Question d’essai ${i + 1} ?\tRéponse d’essai ${i + 1}.\t${source}`
const cartes = (n) => Array.from({ length: n }, (_, i) => carte(i)).join('\n') + '\n'
const SEPT_PUIS = (huitieme) => cartes(7) + huitieme + '\n'
const rapport = (n, { anki = `anki-${DATE}.tsv` } = {}) => [
  `# Revue hebdomadaire du réseau neuronal — ${DATE}`, '',
  '## Ce qui a bougé (geste 1, `quoi_de_neuf` 7j)', '- `vault/Produit/Note-Essai.md`', '',
  '## Santé du réseau (geste 5, `sante_reseau`, lignes telles quelles)', '- Réseau : 12 notes · 10 rattachées à une carte · 0 îlots · 2 isolées · 1 à revoir', '',
  '## « À revoir » (10 premières, plus ancienne d’abord)', '1. vault/Decisions/Journal-Essai.md — décision — 61 j', '',
  '## Contradictions (geste 2, `contradictions.mjs`)', 'Aucune contradiction nouvelle. Rien corrigé : à trancher par Benj.', '',
  '## Liens (geste 3)', '- Liens ajoutés : 0. Liens proposés à Benj : aucun.', '',
  '## Cartes Anki (geste 4)', `- Fichier : \`${slash(VAULT)}/90 Apprentissages/Anki/${anki}\` (créé).`, `- **${n} cartes**, de 5 à 20 cartes attendues.`, '',
  '## Notes d’agent en attente de Benj (geste 6)', '- 1 note d’agent au premier statut : `vault/90 Apprentissages/Note-Essai-Agent.md` (apprentissage, ouverte).', '',
  `Résumé : 0 contradiction · 0 lien ajouté · ${n} cartes · 1 à revoir.`, '',
].join('\n')
const remplacer = (texte, de, vers) => { if (!texte.includes(de)) throw new Error(`motif absent du banc : ${de}`); return texte.replace(de, vers) }

let k = 0
async function scenario({ rapport: r = rapport(8), tsv = cartes(8), erratum = null, sansRapport = false, sansTsv = false, garde = GARDE } = {}) {
  const cas = path.join(TMP, `cas-${++k}`)
  const dossier = path.join(cas, `revue-${DATE}`)
  fs.mkdirSync(dossier, { recursive: true })
  if (!sansRapport) ecrire(path.join(dossier, 'rapport.md'), r)
  if (erratum) ecrire(path.join(dossier, 'erratum.md'), erratum)
  const anki = path.join(cas, `anki-${DATE}.tsv`)
  if (!sansTsv) ecrire(anki, tsv)
  return V.verifierRevue({ dossier, anki, racines: RACINES, garde })
}
// Un vérificateur qui plante sur une entrée fautive est en échec, pas « refusé » : le plantage est compté, le banc continue.
const jouer = async (cas) => { try { return { ...(await scenario(cas)), plante: null } } catch (e) { return { motifs: [], plante: e.message } } }
const accepte = async (nom, cas) => { const r = await jouer(cas); verifier(`accepté : ${nom}`, !r.plante && r.motifs.length === 0, r.plante ? `le vérificateur a planté : ${r.plante}` : r.motifs.join(' | ')) }
const refuse = async (nom, cas, attendu) => { const r = await jouer(cas); verifier(`refusé : ${nom}`, !r.plante && r.motifs.some((m) => attendu.test(m)), r.plante ? `le vérificateur a planté : ${r.plante}` : (r.motifs.join(' | ') || 'aucun motif : passé à tort')) }

try {
  // ── 1. le brief et le vérificateur cherchent les mêmes six gestes ──────────────────────────────────────────────────────────
  if (!fs.existsSync(BRIEF)) console.log(`— brief de la revue absent de ce poste (${BRIEF}) : comparaison des gestes sautée`)
  else {
    const brief = fs.readFileSync(BRIEF, 'utf8')
    const section = (brief.split(/^## /m).find((s) => /^Les six gestes/.test(s)) || '')
    const titres = [...section.matchAll(/^\s*(\d)\.\s+\*\*(.+?)\*\*/gm)].map((m) => ({ numero: Number(m[1]), titre: m[2].trim().replace(/\.$/, '') }))
    verifier('le brief compte six gestes numérotés, autant que le vérificateur', titres.length === 6 && titres.length === V.GESTES.length && titres.every((t, i) => t.numero === i + 1), JSON.stringify(titres.map((t) => t.titre)))
    for (const [i, t] of titres.entries()) {
      const g = V.GESTES[i]
      verifier(`geste ${i + 1} : le vérificateur cherche « ${t.titre} »`, !!g && V.plier(g.titre) === V.plier(t.titre) && g.parties.every((p) => p.re.test(V.plier(t.titre))),
        g ? `le brief dit « ${t.titre} », le vérificateur « ${g.titre} »` : 'geste absent du vérificateur')
    }
  }
  verifier('les nombres annoncés : la fourchette « de 5 à 20 cartes » n’en est pas un', JSON.stringify(V.cartesAnnoncees('de 5 à 20 cartes ; **8 cartes**, 1 carte')) === '[8,1]', JSON.stringify(V.cartesAnnoncees('de 5 à 20 cartes ; **8 cartes**, 1 carte')))

  // ── 2. ce qui doit passer ──────────────────────────────────────────────────────────────────────────────────────────────────
  await accepte('rapport conforme, 8 cartes, sources du vault et du dépôt (ligne, section, deux sources)', {})
  await accepte('5 cartes (borne basse)', { tsv: cartes(5), rapport: rapport(5) })
  await accepte('20 cartes (borne haute)', { tsv: cartes(20), rapport: rapport(20) })
  await accepte('fichier Anki avec BOM et fins de ligne CRLF', { tsv: '﻿' + cartes(8).replace(/\n/g, '\r\n') })
  await accepte('source en chemin absolu dans le vault', { tsv: SEPT_PUIS(carte(7, slash(path.join(VAULT, 'Produit', 'Note-Essai.md')))) })
  await accepte('erratum.md : le rapport annonçait 7, l’erratum dit 8', { rapport: rapport(7), erratum: '# Erratum — 2026-11-09\n\nLe fichier Anki compte 8 cartes ; le rapport en annonçait une de moins.\n' })
  await accepte('section « Erratum » du rapport : 7 corrigé en 8', { rapport: `${rapport(7)}\n## Erratum (09/11)\n\nLe fichier Anki compte 8 cartes.\n` })

  // ── 3. ce qui doit rougir ──────────────────────────────────────────────────────────────────────────────────────────────────
  await refuse('7 cartes annoncées pour 8 lignes (la revue réelle du 01/11)', { rapport: rapport(7) }, /^7 carte\(s\) annoncée\(s\) pour 8 ligne\(s\)/)
  await refuse('le résumé seul annonce 7 cartes', { rapport: remplacer(rapport(8), '· 8 cartes ·', '· 7 cartes ·') }, /^7 carte\(s\) annoncée\(s\) pour 8/)
  await refuse('aucun nombre de cartes annoncé', { rapport: remplacer(remplacer(rapport(8), '- **8 cartes**, de 5 à 20 cartes attendues.', '- Des cartes.'), '· 8 cartes ·', '·') }, /aucun nombre de cartes annoncé/)
  await refuse('erratum.md qui annonce encore un faux nombre', { rapport: rapport(7), erratum: '# Erratum\n\nLe fichier Anki compte 9 cartes.\n' }, /^9 carte\(s\) annoncée\(s\) \(erratum\) pour 8/)
  for (const [geste, titre] of [[1, '## Ce qui a bougé (geste 1, `quoi_de_neuf` 7j)'], [2, '## Contradictions (geste 2, `contradictions.mjs`)'], [3, '## Liens (geste 3)'],
    [4, '## Cartes Anki (geste 4)'], [5, '## Santé du réseau (geste 5, `sante_reseau`, lignes telles quelles)'], [5, '## « À revoir » (10 premières, plus ancienne d’abord)'],
    [6, '## Notes d’agent en attente de Benj (geste 6)']]) {
    await refuse(`section du geste ${geste} absente (${titre.slice(3, 30)}…)`, { rapport: remplacer(rapport(8), titre, `## Autre chose ${geste}`) }, new RegExp(`^section manquante — geste ${geste} `))
  }
  await refuse('section du geste 2 vide', { rapport: remplacer(rapport(8), 'Aucune contradiction nouvelle. Rien corrigé : à trancher par Benj.', '') }, /^section vide — geste 2 /)
  await refuse('le titre du document ne vaut pas pour un geste', { rapport: remplacer(remplacer(rapport(8), `# Revue hebdomadaire du réseau neuronal — ${DATE}`, '# Revue — liens et contradictions'), '## Liens (geste 3)', '## Autre chose 3') }, /^section manquante — geste 3 /)
  await refuse('4 cartes : sous la borne', { tsv: cartes(4), rapport: rapport(4) }, /4 ligne\(s\), attendu de 5 à 20/)
  await refuse('21 cartes : au-dessus de la borne', { tsv: cartes(21), rapport: rapport(21) }, /21 ligne\(s\), attendu de 5 à 20/)
  await refuse('une carte à 2 champs', { tsv: SEPT_PUIS('Question sans source ?\tRéponse sans source.') }, /^carte 8 : 2 champ\(s\)/)
  await refuse('une carte à 4 champs', { tsv: SEPT_PUIS(`${carte(7)}\tchamp en trop`) }, /^carte 8 : 4 champ\(s\)/)
  await refuse('une réponse vide', { tsv: SEPT_PUIS('Question ?\t \tvault/Produit/Note-Essai.md') }, /^carte 8 : réponse vide/)
  await refuse('une ligne vide au milieu du fichier', { tsv: cartes(4) + '\n' + cartes(3) }, /^carte 5 : 1 champ\(s\)/)
  await refuse('source introuvable', { tsv: SEPT_PUIS(carte(7, 'vault/Decisions/Absente.md')) }, /^carte 8 : source « vault\/Decisions\/Absente\.md » : fichier introuvable/)
  await refuse('source : ligne hors du fichier', { tsv: SEPT_PUIS(carte(7, 'vault/Decisions/Journal-Essai.md:99')) }, /ligne hors du fichier \(30 lignes\)/)
  await refuse('source : préfixe inconnu', { tsv: SEPT_PUIS(carte(7, 'ailleurs/Note-Essai.md')) }, /préfixe inconnu/)
  await refuse('source qui sort de son dossier', { tsv: SEPT_PUIS(carte(7, 'vault/../presti/plans/briefs/brief-essai.md')) }, /sort de son dossier/)
  await refuse('source : un dossier, pas un fichier', { tsv: SEPT_PUIS(carte(7, 'vault/Produit')) }, /n'est pas un fichier/)
  await refuse('source absolue hors du réseau neuronal', { tsv: SEPT_PUIS(carte(7, slash(path.join(TMP, 'hors-reseau.md')))) }, /chemin absolu hors des dossiers du réseau neuronal/)
  await refuse('une source sur deux introuvable', { tsv: SEPT_PUIS(carte(7, 'vault/Produit/Note-Essai.md ; vault/Produit/Absente.md')) }, /« vault\/Produit\/Absente\.md » : fichier introuvable/)
  await refuse('téléphone dans le rapport', { rapport: remplacer(rapport(8), 'Aucune contradiction nouvelle.', `Rappeler au ${TEL}.`) }, /^rapport\.md : numéro de téléphone refusé/)
  await refuse('e-mail dans une carte', { tsv: SEPT_PUIS(carte(7).replace('Réponse d’essai 8.', `Écrire à ${MEL}.`)) }, /^carte 8 \(réponse\) : adresse e-mail refusée/)
  await refuse('nom de personne dans une carte', { tsv: SEPT_PUIS(carte(7).replace('Question d’essai 8 ?', `${NOM} a-t-il rappelé ?`)) }, /^carte 8 \(question\) : nom de personne refusé/)
  await refuse('nom de personne dans erratum.md', { rapport: rapport(8), erratum: `# Erratum\n\nVu avec ${NOM} : 8 cartes.\n` }, /^erratum\.md : nom de personne refusé/)
  await refuse('fichier Anki absent', { sansTsv: true }, /^fichier Anki introuvable/)
  await refuse('rapport absent', { sansRapport: true }, /^rapport\.md absent/)
  await refuse('le rapport ne cite pas le fichier Anki', { rapport: rapport(8, { anki: 'anki-autre-jour.tsv' }) }, /ne cite pas le fichier Anki vérifié/)
  await refuse('garde de contenu introuvable : refus, jamais un passage sans contrôle', { garde: path.join(TMP, 'garde-absente.mjs') }, /^garde de contenu illisible/)

  // ── 4. la ligne de commande : codes de sortie, fichier Anki du jour tiré du nom du dossier ─────────────────────────────────
  const cli = (...args) => { const r = spawnSync(process.execPath, [MODULE, ...args], { encoding: 'utf8' }); return { code: r.status, sortie: `${r.stdout}${r.stderr}` } }
  const racinesCli = [`--racine=vault=${VAULT}`, `--racine=presti=${PRESTI}`, `--garde=${GARDE}`]
  const dossierCli = path.join(TMP, 'cli', `revue-${DATE}`)
  ecrire(path.join(dossierCli, 'rapport.md'), rapport(8))
  ecrire(path.join(VAULT, '90 Apprentissages', 'Anki', `anki-${DATE}.tsv`), cartes(8))
  let r = cli(dossierCli, ...racinesCli)
  verifier('commande : revue conforme → code 0, fichier Anki du jour trouvé dans le vault', r.code === 0 && /REVUE CONFORME/.test(r.sortie) && r.sortie.includes(`anki-${DATE}.tsv`), r.sortie.trim().split('\n').slice(-3).join(' / '))
  ecrire(path.join(dossierCli, 'rapport.md'), rapport(7))
  r = cli(dossierCli, ...racinesCli)
  verifier('commande : 7 cartes annoncées pour 8 lignes → code 1, motif en clair', r.code === 1 && /✗ 7 carte\(s\) annoncée\(s\) pour 8 ligne\(s\)/.test(r.sortie) && /REVUE REFUSÉE : 1 motif/.test(r.sortie), r.sortie.trim().split('\n').slice(-3).join(' / '))
  r = cli()
  verifier('commande : sans dossier → code 2 (usage)', r.code === 2, `code ${r.code}`)
  r = cli(path.join(TMP, 'pas-de-dossier'))
  verifier('commande : dossier absent → code 2', r.code === 2, `code ${r.code}`)
} finally {
  if (path.basename(TMP).startsWith('verifier-revue-') && path.dirname(TMP) === path.resolve(os.tmpdir())) fs.rmSync(TMP, { recursive: true, force: true })
}

console.log(`\n${reussis} réussis, ${echecs} échoués${process.env.VERIFIER_REVUE_MODULE ? ` (module : ${MODULE})` : ''}`)
process.exit(echecs ? 1 : 0)
