// Garde de pré-commit (prompt v6 §8) : les défauts déjà corrigés par l'audit final ne reviennent
// pas par un copier-coller. Statique, instantané, sans réseau, sans IA. Chaque règle cite le
// défaut qu'elle empêche de renaître.
//
// Usage : node scripts/garde-commit.mjs   (appelé par .husky/pre-commit après le typecheck)
import fs from 'node:fs'
import path from 'node:path'

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
  { re: /rk_live_[A-Za-z0-9]{8,}/, ou: ['app', 'lib', 'scripts', 'plans', '.claude'], quoi: 'clé Stripe restreinte LIVE en clair dans le dépôt' },
]
const EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.md', '.sql', '.json', '.yml'])

function* fichiers(dossier) {
  if (!fs.existsSync(dossier)) return
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name)
    if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === '.next') continue; yield* fichiers(p) }
    else if (EXT.has(path.extname(e.name))) yield p
  }
}

let ko = 0
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
