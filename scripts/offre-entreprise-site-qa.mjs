// Juge 036-023 : la carte « Presti pour l'entreprise, sur mesure » est sur la page d'accueil et la page abonnement, sans prix,
// avec le bouton « Parler à l'équipe » vers /contact?motif=entreprise, et son accroche vient de lib/plans.ts.
// Il s'attaque lui-même (3 mutants : carte retirée, prix écrit, lien cassé) : chacun DOIT être vu.
// Usage : node scripts/offre-entreprise-site-qa.mjs
import fs from 'node:fs'
import path from 'node:path'

const R = process.cwd()
const lire = (f) => fs.readFileSync(path.join(R, f), 'utf8')
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const PAGES = ['app/page.tsx', 'app/abonnement/page.tsx']
const COMPOSANT = 'app/OffreEntreprise.tsx'

/** Retourne la liste des échecs pour un état donné des sources. */
function juger({ pages, composant, plans }) {
  const e = []
  for (const [f, s] of Object.entries(pages)) {
    if (!/<OffreEntreprise\b/.test(s)) e.push(`${f} ne rend pas <OffreEntreprise /> (carte absente)`)
    if (!/import OffreEntreprise from '@\/app\/OffreEntreprise'/.test(s)) e.push(`${f} n'importe pas OffreEntreprise`)
  }
  const c = sansCommentaires(composant)
  if (/\d\s?(€|euros?|EUR)|€\s?\d/i.test(c)) e.push('un prix est écrit en dur dans la carte')
  if (/\bprix\w*\s*[:=]\s*\d/.test(c) || /\bprixMois\b/.test(c)) e.push('la carte lit ou écrit un prix')
  if (!/href=\{?["'`]?|LIEN/.test(c)) e.push('aucun lien dans la carte')
  const liens = [...c.matchAll(/(?:const LIEN\s*=\s*|href=)['"]([^'"]+)['"]/g)].map((m) => m[1])
  if (!liens.includes('/contact?motif=entreprise')) e.push(`le lien ne mène pas à /contact?motif=entreprise (lu : ${liens.join(', ') || 'aucun'})`)
  if (!/LIEN\}/.test(c) && !/href="\/contact\?motif=entreprise"/.test(c)) e.push('le bouton n\'utilise pas le lien')
  if (!/Parler à l[’']équipe/.test(c)) e.push('bouton « Parler à l’équipe » absent')
  if (!/PLANS\.entreprise/.test(c) || !/\{p\.accroche\}/.test(c) || !/\{p\.label\}/.test(c)) e.push("titre/accroche ne viennent pas de PLANS.entreprise")
  const accroche = plans.match(/entreprise:\s*\{[^}]*accroche:\s*'([^']+)'/)?.[1]
  if (!accroche) e.push("PLANS.entreprise.accroche introuvable dans lib/plans.ts")
  else if (c.includes(accroche.slice(0, 25))) e.push("l'accroche est recopiée en dur dans la carte")
  if (!/surDevis:\s*true/.test(plans.match(/entreprise:\s*\{[^}]*\}/)?.[0] ?? '')) e.push('PLANS.entreprise n\'est pas surDevis')
  const nb = (c.match(/BENEFICES = \[([^\]]*)\]/)?.[1].match(/'[^']+'/g) ?? []).length
  if (nb < 1 || nb > 3) e.push(`${nb} bénéfices (1 à 3 attendus)`)
  if (/\b\d+\s?%|témoignage|logo/i.test(c)) e.push('chiffre de gain, témoignage ou logo inventé')
  if (/Presti/.test(c.replace(/PLANS\.entreprise/g, ''))) e.push('le mot « Presti » est écrit dans la carte (il vient de PLANS)')
  return e
}

const reel = { pages: Object.fromEntries(PAGES.map((f) => [f, lire(f)])), composant: lire(COMPOSANT), plans: lire('lib/plans.ts') }
let n = 0; const echecs = []
const ok = (cond, msg) => { n++; if (!cond) echecs.push(msg) }

const base = juger(reel)
ok(base.length === 0, `état réel : ${base.join(' | ')}`)

// Mutants
const m1 = { ...reel, pages: { ...reel.pages, 'app/abonnement/page.tsx': reel.pages['app/abonnement/page.tsx'].replace(/<OffreEntreprise[^>]*\/>/, '') } }
ok(juger(m1).some((x) => /carte absente/.test(x)), 'mutant « carte retirée » non vu')
const m2 = { ...reel, composant: reel.composant.replace('Sur devis', 'À partir de 199 €') }
ok(juger(m2).some((x) => /prix/.test(x)), 'mutant « prix écrit » non vu')
const m3 = { ...reel, composant: reel.composant.replace("'/contact?motif=entreprise'", "'/contakt'") }
ok(juger(m3).some((x) => /lien/.test(x)), 'mutant « lien cassé » non vu')
const m4 = { ...reel, composant: reel.composant.replaceAll('{p.accroche}', 'Sur mesure pour vous') }
ok(juger(m4).some((x) => /accroche/.test(x)), "mutant « accroche en dur » non vu")

if (echecs.length) { console.error(`ÉCHEC (${echecs.length}/${n}) :\n- ${echecs.join('\n- ')}`); process.exit(1) }
console.log(`OK : ${n} contrôles, carte présente sur ${PAGES.length} pages, 4 mutants vus`)
