// Lance toute la suite de vérification (v4 §15) — une seule commande.
//
// Pourquoi ce script : 26 fichiers de test, personne ne les lance tous à la main, donc
// personne ne les lance. Ici on a un état global en une commande, et surtout un ORDRE :
// ce qui ne coûte rien d'abord, ce qui consomme des crédits IA à la fin, pour qu'un
// échec bête (typage, build) ne se paie pas en appels au modèle.
//
// Usage :
//   node scripts/tout-verifier.mjs          → tout sauf ce qui consomme des crédits
//   node scripts/tout-verifier.mjs --tout   → y compris les tests qui appellent l'IA
//   node scripts/tout-verifier.mjs --rapide → seulement les tests sans navigateur

import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const tout = args.includes('--tout')
const rapide = args.includes('--rapide')

// couts : 'gratuit' (pur calcul) · 'navigateur' (Playwright, lent) · 'ia' (crédits Anthropic)
const SUITES = [
  { nom: 'Typage', cmd: 'npx', args: ['tsc', '--noEmit'], cout: 'gratuit' },
  { nom: 'Build', cmd: 'npx', args: ['next', 'build'], cout: 'gratuit' },
  { nom: 'Budgets de performance', cmd: 'node', args: ['scripts/budget-perf.mjs'], cout: 'gratuit' },

  { nom: 'Chiffrement des canaux', cmd: 'node', args: ['scripts/canaux-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Lecture des emails', cmd: 'node', args: ['--experimental-strip-types', 'scripts/maillite-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Réglages du site', cmd: 'node', args: ['--experimental-strip-types', 'scripts/site-style-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Tarifs et provenance des prix', cmd: 'node', args: ['--experimental-strip-types', 'scripts/tarifs-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Conformité de facturation', cmd: 'node', args: ['--experimental-strip-types', 'scripts/facturation-e2e.mjs'], cout: 'gratuit' },
  { nom: 'XML de facture électronique', cmd: 'node', args: ['--experimental-strip-types', 'scripts/facturx-e2e.mjs'], cout: 'gratuit' },

  { nom: 'Isolation entre artisans (RLS)', cmd: 'node', args: ['scripts/rls-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Force des mots de passe', cmd: 'node', args: ['--experimental-strip-types', 'scripts/motdepasse-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Mots de passe fuités (HIBP)', cmd: 'node', args: ['--experimental-strip-types', 'scripts/fuite-mdp-e2e.mjs'], cout: 'gratuit' },
  // ── Sprint v5 (J-1 démo)
  { nom: 'Offres = verrous (matrice)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/offres-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Limites atomiques', cmd: 'node', args: ['scripts/limites-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Plafond de réinitialisation', cmd: 'node', args: ['scripts/reset-plafond-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Mentions bloquantes à l émission', cmd: 'node', args: ['scripts/mentions-bloquantes-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Cache mutualisé des prix', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/cache-prix-e2e.mjs'], cout: 'gratuit' },
  { nom: 'IA — unitaires (métiers, playbooks, anti-fabrication)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/ia-unit-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Aide (panneau, ⓘ, visite, centre)', cmd: 'node', args: ['scripts/aide-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Inventaire v2 (fiches, fournisseurs, isolation)', cmd: 'node', args: ['scripts/inventaire-v2-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Slides 3D (Signature)', cmd: 'node', args: ['scripts/slides-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Paramètres (navigation, sécurité, données)', cmd: 'node', args: ['scripts/parametres-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Poste de pilotage (propositions, prise de main, règles)', cmd: 'node', args: ['scripts/pilotage-e2e.mjs'], cout: 'ia' },
  { nom: 'Correctifs de l audit', cmd: 'node', args: ['scripts/audit-correctifs-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Inventaire', cmd: 'node', args: ['scripts/inventaire-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Photos et géolocalisation', cmd: 'node', args: ['scripts/photos-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Visionneuse et réassurance', cmd: 'node', args: ['scripts/site-motion-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Accessibilité (axe-core)', cmd: 'node', args: ['scripts/a11y-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Indexation et white-label', cmd: 'node', args: ['scripts/seo-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Existence juridique des surfaces', cmd: 'node', args: ['scripts/legal-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Canaux — interface', cmd: 'node', args: ['scripts/canaux-visuel.mjs'], cout: 'navigateur' },

  { nom: 'Injection de prompt', cmd: 'node', args: ['scripts/injection-e2e.mjs'], cout: 'ia' },
  { nom: 'Provenance dans un devis réel', cmd: 'node', args: ['scripts/devis-source-e2e.mjs'], cout: 'ia' },
]

const retenues = SUITES.filter((s) => {
  if (rapide) return s.cout === 'gratuit'
  if (s.cout === 'ia') return tout
  return true
})

console.log(`\n▶ ${retenues.length} suites${rapide ? ' (mode rapide)' : ''}${tout ? ' — crédits IA compris' : ' — hors tests IA (--tout pour les inclure)'}\n`)

const resultats = []
const debut = Date.now()
for (const s of retenues) {
  process.stdout.write(`… ${s.nom}`)
  const t0 = Date.now()
  const r = spawnSync(s.cmd, s.args, { encoding: 'utf8', shell: true, env: process.env })
  const secondes = Math.round((Date.now() - t0) / 1000)
  const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`
  // Les scripts annoncent leur score : on le reprend tel quel plutôt que de le recompter.
  const score = sortie.match(/(\d+) réussis, (\d+) échoués/)
  const ok = r.status === 0
  resultats.push({ nom: s.nom, ok, secondes, score: score ? `${score[1]}/${Number(score[1]) + Number(score[2])}` : '', sortie })
  process.stdout.write(`\r${ok ? '✅' : '❌'} ${s.nom}${score ? ` — ${score[1]}/${Number(score[1]) + Number(score[2])}` : ''} (${secondes}s)\n`)
}

const echecs = resultats.filter((r) => !r.ok)
console.log(`\n${'─'.repeat(60)}`)
console.log(`${resultats.length - echecs.length}/${resultats.length} suites vertes · ${Math.round((Date.now() - debut) / 1000)}s au total`)

if (echecs.length) {
  console.log(`\n${echecs.length} suite(s) en échec — détail :`)
  for (const e of echecs) {
    console.log(`\n── ${e.nom}`)
    // On ne recrache que les lignes qui disent quelque chose, pas les 200 lignes de build.
    const lignes = e.sortie.split('\n').filter((l) => /❌|error|Error|Failed/.test(l)).slice(0, 12)
    console.log(lignes.length ? lignes.join('\n') : e.sortie.split('\n').slice(-12).join('\n'))
  }
}
process.exit(echecs.length ? 1 : 0)
