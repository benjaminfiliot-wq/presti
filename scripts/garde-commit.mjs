// Garde de pré-commit (prompt v6 §8) : les défauts déjà corrigés par l'audit final ne reviennent
// pas par un copier-coller. Statique, instantané, sans réseau, sans IA. Chaque règle cite le
// défaut qu'elle empêche de renaître.
//
// Usage : node scripts/garde-commit.mjs   (appelé par .husky/pre-commit après le typecheck)
import fs from 'node:fs'
import path from 'node:path'
import { verifierOrphelins, ligneOrphelin, typescriptDisponible } from './lib/imports-orphelins.mjs'

const REGLES = [
  { re: /mailto:contact@prestiapp\.fr/, ou: ['app', 'lib'], quoi: 'boîte contact@prestiapp.fr morte — utiliser /contact (audit final, B bloquant 1)' },
  { re: /replyTo: 'contact@prestiapp\.fr'/, ou: ['app', 'lib'], quoi: 'Reply-To vers une boîte morte (audit final, B bloquant 1)' },
  { re: /ip === 'unknown' \? null : ip\b/, ou: ['app', 'lib'], quoi: 'adresse IP stockée en clair — passer par ipPseudonyme (audit final, B-C7)' },
  { re: /consumeCredit\(artisan\.id, 'standard'/, ou: ['app/api/conversation'], quoi: 'crédit débité au tarif standard quel que soit le modèle (audit final, E-M1)' },
  { re: /statut: \['payee', 'annulee'\]/, ou: ['app/api/factures'], quoi: 'annulation d’une facture sans avoir (audit final, B-A9)' },
  { re: /sk_live_[A-Za-z0-9]{8,}/, ou: ['app', 'lib', 'scripts', 'plans', '.claude'], quoi: 'clé Stripe LIVE en clair dans le dépôt' },
  { re: /sk-ant-[A-Za-z0-9_-]{12,}/, ou: ['app', 'lib', 'scripts', 'plans', '.claude'], quoi: 'clé Anthropic en clair dans le dépôt' },
  { re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/, ou: ['app', 'lib', 'scripts', 'plans', '.claude'], quoi: 'jeton Supabase (service role ?) en clair dans le dépôt' },
  // Les clés Supabase actuelles ne sont PLUS des JWT : la regex ci-dessus épingle l'en-tête base64
  // du format légataire, et laissait passer un `sb_secret_…` copié dans un fichier. La garde
  // protégeait contre le format qu'on n'utilise plus.
  { re: /sb_secret_[A-Za-z0-9_-]{12,}/, ou: ['app', 'lib', 'scripts', 'plans', '.claude'], quoi: 'clé de service Supabase (format actuel) en clair dans le dépôt' },
  // Simulation générale du 16/10 : la base refuse désormais un mot de passe de moins de 12 caractères (weak_password). Vingt-trois suites créaient
  // leurs comptes avec « Test123456! » (11 caractères) : aucun compte ne naissait, la suite s'arrêtait avant son premier contrôle.
  { re: /Test123456!['"`]/, ou: ['scripts'], quoi: 'mot de passe de compte de test de 11 caractères : la base en exige 12 au moins, la suite ne crée plus aucun compte (simulation générale, 16/10)' },
  { re: /rk_live_[A-Za-z0-9]{8,}/, ou: ['app', 'lib', 'scripts', 'plans', '.claude'], quoi: 'clé Stripe restreinte LIVE en clair dans le dépôt' },
]
const EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.md', '.sql', '.json', '.yml'])

function* fichiers(dossier) {
  if (!fs.existsSync(dossier)) return
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name)
    // .claude/worktrees/ : copies de travail des agents Claude (27/09). Ce ne sont pas des fichiers du dépôt, et elles
    // contiennent les faux secrets de test déjà acceptés ici : les scanner bloquait tous les commits pendant qu'un agent travaillait.
    if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === '.next' || (e.name === 'worktrees' && path.basename(dossier) === '.claude')) continue; yield* fichiers(p) }
    else if (EXT.has(path.extname(e.name))) yield p
  }
}

// Règle à part : elle n'inspecte pas un fichier entier mais les seules chaînes `guide` de
// METIER_GUIDES (lib/ai.ts). Ces mémos décrivent la STRUCTURE d'un chiffrage ; les montants,
// eux, ont une source unique — la table `postes_types`, que l'artisan peut voir et surcharger.
// Quand les deux portaient des prix, 23 postes sur 24 avaient fini par diverger (réfection
// toiture 80-200 en base contre 100-250 dans le code). Un € qui revient ici recrée cette
// double vérité, et le modèle reçoit à nouveau deux prix pour le même poste.
const MONTANTS = [
  /\d[\d\s.,]*\s*(?:€|EUR\b|euros?\b)/i,   // « 250 € », « 40 euros »
  /\d[\d.,]*\s*[-–]\s*\d[\d.,]*\s*\/\s*(?:h|j|m²|m2|m³|m3|ml|u)\b/i, // « 45-70/h » sans €
]

function guidesSansMontant() {
  const src = fs.readFileSync('lib/ai.ts', 'utf8')
  const tableau = src.match(/const METIER_GUIDES[^=]*=\s*\[([\s\S]*?)\n\]/)
  if (!tableau) {
    console.error("  ❌ lib/ai.ts — METIER_GUIDES introuvable : la garde des mémos ne s'applique plus")
    return 1
  }
  const guides = [...tableau[1].matchAll(/guide:\s*\n?\s*(['"`])([\s\S]*?)\1,\r?\n/g)].map((m) => m[2])
  if (!guides.length) {
    console.error('  ❌ lib/ai.ts — aucun mémo `guide` lisible : la garde ne vérifie plus rien')
    return 1
  }
  let n = 0
  for (const g of guides) {
    // Les taux de TVA (10%, 5,5%) et les comptages (« 2 couches ») restent permis.
    const m = MONTANTS.map((re) => g.match(re)).find(Boolean)
    if (!m) continue
    n++
    const extrait = g.slice(Math.max(0, m.index - 40), m.index + 40).trim()
    console.error(`  ❌ lib/ai.ts — montant dans un mémo \`guide\` : les prix viennent de la table postes_types, pas du code\n     « …${extrait}… »`)
  }
  return n
}

// Règle à part (04/10) : un fichier suivi qui importe un fichier NON suivi passe le typecheck du hook (qui lit le disque) mais casse le
// build Vercel (qui lit git). d7a1128f : facteur.ts → ./porteurs, porteurs.ts resté hors de git, production figée jusqu'à la correction.
// La garde lit l'INDEX du commit (sous `git commit -- <chemins>`, l'index temporaire que git donne au hook : le commit exact) :
// scripts/lib/imports-orphelins.mjs ; juge : scripts/garde-imports-qa.mjs (témoin, sabotages, vrai crochet).
function importsOrphelins() {
  if (!typescriptDisponible()) {
    console.error("  ❌ typescript introuvable : la garde des imports (fichier suivi → fichier non suivi, d7a1128f) ne peut plus lire le code")
    return 1
  }
  const r = verifierOrphelins({ racine: process.cwd() })
  if (r.erreur) { console.error(`  ❌ garde des imports impossible (${r.erreur})`); return 1 }
  for (const o of r.orphelins) console.error(`  ❌ ${ligneOrphelin(o)}`)
  return r.orphelins.length
}

// Règle à part (28/09) : une page qui lit useSearchParams() sans <Suspense> passe le typecheck mais fait échouer le build
// Next au prérendu. 026-035 l'a introduit à 01:09 ; sept déploiements Vercel en ERROR avant qu'on le voie (894f0c36).
function pagesSansSuspense() {
  let n = 0
  const pages = (d) => [...fichiers(d)].filter((f) => /[\\/]page\.tsx$/.test(f))
  for (const f of pages('app')) {
    // sans commentaires : un commentaire qui cite <Suspense> ne doit pas faire croire que la page en a un
    const t = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    if (/\buseSearchParams\s*\(/.test(t) && !/<Suspense\b/.test(t)) {
      n++
      console.error(`  ❌ ${f} — useSearchParams() sans <Suspense> dans la page : le build Next échoue au prérendu (894f0c36)`)
    }
  }
  return n
}

let ko = guidesSansMontant() + pagesSansSuspense() + importsOrphelins()
for (const r of REGLES) {
  for (const racine of r.ou) {
    for (const f of fichiers(racine)) {
      if (f.endsWith('garde-commit.mjs')) continue
      const txt = fs.readFileSync(f, 'utf8')
      const m = txt.match(r.re)
      if (m) { ko++; console.error(`  ❌ ${f} — ${r.quoi}\n     « ${m[0].slice(0, 60)} »`) }
    }
  }
}
if (ko) { console.error(`\n${ko} régression(s) connue(s) : commit refusé.`); process.exit(1) }
console.log('  ✅ garde-commit : aucune régression connue')
