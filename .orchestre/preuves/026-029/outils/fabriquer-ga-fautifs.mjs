// .orchestre/preuves/026-029/outils/fabriquer-ga-fautifs.mjs — les variantes fautives du flux generer-site.yml, une ou plusieurs
// par critère GA-1 à GA-4 (fiche 026-029, Claude Code), pour l'autocontrôle de scripts/generation-actions-qa.mjs.
//
//   node .orchestre/preuves/026-029/outils/fabriquer-ga-fautifs.mjs
//
// Chaque variante part du flux témoin (scripts/fixtures/026-livraison-tresor/c/temoin/.github/workflows/generer-site.yml) et
// y met UNE faute ; elle s'écrit dans c/ga-fautifs/GA-<n>-<faute>.yml. Une substitution qui ne trouve pas son texte arrête tout.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const C = path.join(R, 'scripts', 'fixtures', '026-livraison-tresor', 'c')
const T = fs.readFileSync(path.join(C, 'temoin', '.github', 'workflows', 'generer-site.yml'), 'utf8').replace(/\r\n/g, '\n')
const entete = (faute) => `# Variante FAUTIVE du flux témoin (026-029, autocontrôle de generation-actions-qa) : ${faute}\n`
const VARIANTES = [
  ['GA-1-declencheur-push', 'un déclencheur push en plus', [['  workflow_dispatch:\n', '  push:\n    branches: [main]\n  workflow_dispatch:\n']]],
  ['GA-1-types', 'un second type d\'événement', [['types: [generer-site]', 'types: [generer-site, autre-evenement]']]],
  ['GA-1-sans-entree', 'workflow_dispatch sans l\'entrée commande', [['    inputs:\n      commande:\n        description: Identifiant de la commande (UUID)\n        required: true\n        type: string\n', '    inputs:\n      numero:\n        description: Un autre nom\n        required: true\n        type: string\n']]],
  ['GA-2-delai-45', 'timeout-minutes: 45', [['timeout-minutes: 20', 'timeout-minutes: 45']]],
  ['GA-2-permissions-ecriture', 'permissions contents: write', [['permissions:\n  contents: read', 'permissions:\n  contents: write']]],
  ['GA-2-annulation', 'cancel-in-progress: true', [['cancel-in-progress: false', 'cancel-in-progress: true']]],
  ['GA-3-artefact', 'une étape upload-artifact', [['      - name: Générer, juger et déposer\n', '      - uses: actions/upload-artifact@v4\n        with:\n          name: site\n          path: .orchestre/travail/livraison\n      - name: Générer, juger et déposer\n']]],
  ['GA-3-echo-secret', 'le secret affiché par echo', [['        run: printf \'%s\\n\' "$LIVRAISON_ENV" | grep', '        run: |\n          echo "$LIVRAISON_ENV"\n          printf \'%s\\n\' "$LIVRAISON_ENV" | grep']]],
  ['GA-3-sans-liste-blanche', 'LIVRAISON_ENV écrit sans la liste blanche', [['printf \'%s\\n\' "$LIVRAISON_ENV" | grep -E \'^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=\' > .env.local', 'printf \'%s\\n\' "$LIVRAISON_ENV" > .env.local']]],
  ['GA-3-cle-anthropic', 'la clé Anthropic passée au runner', [['          COMMANDE: ${{ steps.commande.outputs.commande }}\n', '          COMMANDE: ${{ steps.commande.outputs.commande }}\n          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}\n']]],
  ['GA-4-sans-uuid', 'aucune comparaison UUID', [['          if [[ ! "$COMMANDE" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then\n            echo "identifiant de commande refusé (UUID attendu)"\n            exit 1\n          fi\n', '']]],
  ['GA-4-injection', 'l\'identifiant interpolé dans run:', [['run: node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs "$COMMANDE" --ci', 'run: node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs "${{ github.event.client_payload.commande }}" --ci']]],
  ['GA-4-sans-ci', 'livrer-site lancé sans --ci', [['scripts/livrer-site.mjs "$COMMANDE" --ci', 'scripts/livrer-site.mjs "$COMMANDE"']]],
]
const D = path.join(C, 'ga-fautifs')
fs.mkdirSync(D, { recursive: true })
for (const f of fs.readdirSync(D)) fs.rmSync(path.join(D, f))
for (const [nom, faute, subs] of VARIANTES) {
  let t = T.replace(/^# TÉMOIN[\s\S]*?\nname:/m, 'name:')
  for (const [de, vers] of subs) { if (!t.includes(de)) throw new Error(`${nom} : « ${de.slice(0, 60)} » introuvable dans le témoin`); t = t.replace(de, vers) }
  fs.writeFileSync(path.join(D, `${nom}.yml`), entete(faute) + t)
}
console.log(`✓ ${VARIANTES.length} variantes dans ${path.relative(R, D)}`)
