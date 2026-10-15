// scripts/promesses-suite-qa.mjs — les textes corrigés par l'audit des promesses (plans/promesses-2026-10.md, 12 et 13/10)
// restent corrigés. HORS LIGNE : aucun appel, aucune base ; le juge lit les fichiers sources.
//
//   PS-1  Le Bon Coin : aucune phrase de la vitrine ni de la FAQ ne conseille d'y mettre le lien ; dans l'espace connecté,
//         chaque phrase qui le nomme dit que ses règles l'interdisent (site 3).
//   PS-2  « Chaque demande » (vitrine, métadonnées, FAQ, connexion, pied) dit « faite par votre lien » (site 2).
//   PS-3  Pas de « facture électronique » vendue : grille, fait du crieur, bouton XML (site 42, produit 89).
//   PS-4  Relances : aucune relance automatique d'impayé ni de « devis restés sans réponse » promise ; le fil de la vitrine ne
//         montre plus une relance après « Facture émise » (produit 90, hors site 60).
//   PS-5  Appels : la réponse aux « appels manqués » dit que Presti ne capte pas les appels (hors site 6 et 22).
//   PS-6  Mentions légales : l'écran dit que Presti n'envoie pas un devis incomplet (produit 24).
//   PS-7  Délai du site : compté à partir du paiement d'un dossier complet, pas « après la validation » (site 53).
//   PS-8  Support : la grille dit « Support par écrit » et la demande d'un Signature est marquée prioritaire (site 47).
//   PS-9  Crédits : pas de « vous payez à l'usage », la recherche fournisseurs est comptée (site 29, 30).
//   PS-10 Compta : « rangée par l'IA », jamais « faite par l'IA » ni « votre compta, tenue à jour » (site 14, produit 20).
//
// Substance : chaque fichier lu doit exister et ne pas être vide, sinon le critère échoue.
// Preuve qu'il peut rougir : `--ref=<commit>` lit les fichiers de ce commit au lieu du disque. Sur efce9ca6^ (avant le 12/10),
// PS-1 à PS-10 sont rouges ; sur le disque, verts.
//
// Usage : node scripts/promesses-suite-qa.mjs [--ref=<commit>]   (code 1 au premier rouge)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REF = (process.argv.find((a) => a.startsWith('--ref=')) ?? '').slice(6)

// `--compter` : le décompte du « Suivi des corrections » de plans/promesses-2026-10.md, et la vérification qu'il couvre
// exactement les lignes « À CORRIGER DANS LE CODE » / « À RETIRER DU TEXTE » des tableaux A, B et C (mêmes numéros).
if (process.argv.includes('--compter')) {
  const t = fs.readFileSync(path.join(RACINE, 'plans', 'promesses-2026-10.md'), 'utf8')
  const STATUTS = ['CORRIGÉE DANS LE CODE', 'RETIRÉE DU TEXTE', 'REFORMULÉE', 'RESTE']
  const iA = t.indexOf('\n## A. Site public'), iB = t.indexOf('\n## B. Produit'), iC = t.indexOf('\n## C. Hors site')
  const audit = {}
  for (const [p, s] of Object.entries({ A: t.slice(iA, iB), B: t.slice(iB, iC), C: t.slice(iC) })) {
    for (const l of s.split(/\r?\n/)) {
      const m = l.match(/^\| (\d+) \|/)
      const v = m && (/À CORRIGER DANS LE CODE/.test(l) ? 'À CORRIGER DANS LE CODE' : /À RETIRER DU TEXTE/.test(l) ? 'À RETIRER DU TEXTE' : null)
      if (v) audit[p + m[1]] = v
    }
  }
  const suivi = {}
  for (const l of t.split(/\r?\n/)) {
    const m = l.match(/^\| ([ABC]\d+) \| (À CORRIGER DANS LE CODE|À RETIRER DU TEXTE) \| ([^|]+?) \|/)
    if (m) suivi[m[1]] = { verdict: m[2], statut: m[3].trim() }
  }
  const fautes = [
    ...Object.keys(audit).filter((k) => suivi[k]?.verdict !== audit[k]).map((k) => `${k} : absente du suivi ou verdict différent`),
    ...Object.keys(suivi).filter((k) => !audit[k] || !STATUTS.includes(suivi[k].statut)).map((k) => `${k} : en trop ou statut inconnu`),
  ]
  console.log('| Partie | Lignes | ' + STATUTS.join(' | ') + ' |')
  for (const p of ['A', 'B', 'C', '']) {
    const ks = Object.keys(suivi).filter((k) => !p || k[0] === p)
    console.log(`| ${p || 'Total'} | ${ks.length} | ${STATUTS.map((s) => ks.filter((k) => suivi[k].statut === s).length).join(' | ')} |`)
  }
  if (fautes.length) console.log(fautes.join('\n'))
  console.log(fautes.length ? '✗ suivi incomplet' : `✓ le suivi couvre les ${Object.keys(audit).length} lignes à corriger ou à retirer`)
  process.exit(fautes.length ? 1 : 0)
}

const cache = new Map()
function lire(rel) {
  if (cache.has(rel)) return cache.get(rel)
  let t = ''
  try {
    t = REF
      ? execFileSync('git', ['show', `${REF}:${rel}`], { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 })
      : fs.readFileSync(path.join(RACINE, rel), 'utf8')
  } catch { t = '' }
  // Apostrophes ramenées à ’, entités et espaces insécables décodées : le texte tel qu'on le lit à l'écran.
  t = t.replace(/&apos;|&#39;|'/g, '’').replace(/&nbsp;| | /g, ' ')
  cache.set(rel, t)
  return t
}

let verts = 0, rouges = 0
function critere(id, intitule, fichiers, juge) {
  const vides = fichiers.filter((f) => !lire(f).trim())
  if (vides.length) { rouges++; console.log(`  ❌ ${id} ${intitule} — fichier absent ou vide : ${vides.join(', ')}`); return }
  const fautes = juge()
  if (fautes.length) { rouges++; console.log(`  ❌ ${id} ${intitule}\n${fautes.map((f) => `       · ${f}`).join('\n')}`) }
  else { verts++; console.log(`  ✅ ${id} ${intitule}`) }
}
/** Les phrases (coupées à . ! ? suivis d'un blanc, ou à une fin de ligne) qui contiennent `re`. */
function phrases(texte, re) {
  return texte.split(/(?<=[.!?])\s+|\r?\n/).filter((p) => re.test(p)).map((p) => p.trim())
}
const court = (s) => (s.length > 140 ? s.slice(0, 140) + '…' : s)

console.log(`\n── promesses-suite-qa${REF ? ` (fichiers du commit ${REF})` : ' (fichiers du disque)'}`)

const VITRINE = ['app/page.tsx', 'lib/faq.ts']
critere('PS-1', 'Le Bon Coin : jamais conseillé pour le lien', [...VITRINE, 'app/dashboard/page.tsx', 'app/profil/page.tsx'], () => [
  ...VITRINE.flatMap((f) => phrases(lire(f), /le ?bon ?coin/i).filter((p) => !/^\s*(\/\/|\*|\{\/\*)/.test(p)).map((p) => `${f} : « ${court(p)} »`)),
  ...['app/dashboard/page.tsx', 'app/profil/page.tsx'].flatMap((f) => phrases(lire(f), /le ?bon ?coin/i).filter((p) => !/^\s*(\/\/|\*|\{\/\*)/.test(p) && !/interdi/i.test(p)).map((p) => `${f} : « ${court(p)} » (sans dire que c’est interdit)`)),
])

const CHAQUE = ['app/page.tsx', 'lib/faq.ts', 'app/layout.tsx', 'app/AuthCadre.tsx', 'app/PublicPied.tsx']
critere('PS-2', '« Chaque demande » dit « faite par votre lien »', CHAQUE, () =>
  CHAQUE.flatMap((f) => [...lire(f).matchAll(/chaque demande(?! est une)(.{0,30})/gi)]
    .filter((m) => !/faite par/i.test(m[1]))
    .map((m) => `${f} : « ${court(m[0])} »`)))

critere('PS-3', 'pas de « facture électronique » vendue', ['lib/plans.ts', 'lib/crieur/faits.ts', 'app/factures/page.tsx'], () => [
  ...phrases(lire('lib/plans.ts'), /label: ’[^’]*facture électronique/i).map((p) => `lib/plans.ts : « ${court(p)} »`),
  ...[...lire('lib/crieur/faits.ts').matchAll(/texte: ’([^’]*électroniques?[^’]*)’/gi)].map((m) => `lib/crieur/faits.ts : « ${court(m[1])} »`),
  ...(/title="Facture électronique/i.test(lire('app/factures/page.tsx')) ? ['app/factures/page.tsx : bouton « Facture électronique »'] : []),
  ...(lire('lib/plans.ts').includes('Factures + export XML Factur-X') ? [] : ['lib/plans.ts : la ligne « Factures + export XML Factur-X » manque']),
])

critere('PS-4', 'relances : ni impayés ni devis seuls, pas de relance après « Facture émise »', ['lib/agents/acquisition/plaintes.ts', 'app/page.tsx', 'app/AuthCadre.tsx', 'lib/plans.ts'], () => [
  ...phrases(lire('lib/agents/acquisition/plaintes.ts'), /reponse_presti:.*relance automatiquement/i).map((p) => `plaintes.ts : « ${court(p)} »`),
  ...(/Facture émise<\/li>\s*<li[^>]*>Relance/.test(lire('app/page.tsx')) ? ['app/page.tsx : « Facture émise » suivie d’une relance planifiée'] : []),
  ...(/puis la facture en un clic/.test(lire('app/AuthCadre.tsx')) ? ['app/AuthCadre.tsx : « Trois relances…, puis la facture »'] : []),
  ...(/groupe: ’Devis & factures’, label: ’Relances(?! des factures impayées)/.test(lire('lib/plans.ts')) ? ['lib/plans.ts : les relances rangées sous « Devis & factures »'] : []),
])

critere('PS-5', 'appels manqués : Presti ne capte pas les appels', ['lib/agents/acquisition/plaintes.ts'], () => {
  const bloc = lire('lib/agents/acquisition/plaintes.ts').split(/id: ’appels_manques’/)[1]?.split(/id: ’/)[0] ?? ''
  return /reponse_presti:[^\n]*pas les appels/.test(bloc) ? [] : ['plaintes.ts (appels_manques) : la réponse ne dit pas que les appels ne sont pas captés']
})

critere('PS-6', 'mentions légales : un devis incomplet ne part pas (l’écran le dit)', ['app/parametres/SectionLegal.tsx', 'lib/aide.ts'], () => [
  ...(/n’envoie pas de devis/.test(lire('app/parametres/SectionLegal.tsx')) ? [] : ['SectionLegal.tsx : le blocage de l’envoi n’est pas dit']),
  ...(/ne peut pas être envoyé/.test(lire('lib/aide.ts')) ? [] : ['lib/aide.ts : l’article « légal » ne dit pas que le devis ne peut pas être envoyé']),
])

critere('PS-7', 'délai du site compté à partir du paiement', ['lib/siteCommande.ts'], () => {
  const m = lire('lib/siteCommande.ts').match(/export const DELAI_TEXTE = `([^`]*)`/)
  if (!m) return ['lib/siteCommande.ts : DELAI_TEXTE introuvable']
  return /paiement/.test(m[1]) && !/après la validation humaine de votre site/.test(m[1]) ? [] : [`DELAI_TEXTE : « ${m[1]} »`]
})

critere('PS-8', 'support : délais écrits, Signature marqué prioritaire', ['lib/plans.ts', 'app/api/support/demande/route.ts'], () => [
  ...(lire('lib/plans.ts').includes('Support par écrit') ? [] : ['lib/plans.ts : la ligne « Support par écrit » manque']),
  ...(/label: ’Support prioritaire’/.test(lire('lib/plans.ts')) ? ['lib/plans.ts : « Support prioritaire » sans délai écrit'] : []),
  ...(/peut\(a\?\.plan, ’support\.prioritaire’\)/.test(lire('app/api/support/demande/route.ts')) ? [] : ['support/demande : la demande n’est pas marquée selon l’offre']),
])

critere('PS-9', 'crédits : forfait mensuel, recherche fournisseurs comptée', ['app/page.tsx', 'lib/faq.ts'], () => [
  ...phrases(lire('app/page.tsx'), /payez à l’usage/i).map((p) => `app/page.tsx : « ${court(p)} »`),
  ...(/recherche fournisseurs = 2 crédits/.test(lire('app/page.tsx')) ? [] : ['app/page.tsx : la recherche fournisseurs n’est pas comptée']),
  ...(/recherche chez vos fournisseurs en coûte 2/.test(lire('lib/faq.ts')) ? [] : ['lib/faq.ts : la recherche fournisseurs n’est pas comptée']),
])

critere('PS-10', 'compta : rangée par l’IA, pas tenue', ['app/page.tsx', 'lib/aide.ts'], () => [
  ...phrases(lire('app/page.tsx'), /compta, faite par l’IA/i).filter((p) => !/^\s*(\/\/|\{\/\*)/.test(p)).map((p) => `app/page.tsx : « ${court(p)} »`),
  ...phrases(lire('lib/aide.ts'), /votre compta, tenue à jour/i).filter((p) => !/^\s*\/\//.test(p)).map((p) => `lib/aide.ts : « ${court(p)} »`),
])

console.log(`\n${rouges ? '✗' : '✓'} promesses-suite : ${verts} vert(s), ${rouges} rouge(s)`)
process.exitCode = rouges ? 1 : 0
