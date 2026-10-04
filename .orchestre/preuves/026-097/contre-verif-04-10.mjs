// Contre-vérification de la production de 026-097 : sabotages réversibles, le juge APPLIQUÉ par le chef (scripts/atelier-maquettes-qa.mjs, D-0410-4) (ce
// dossier) est relancé après chacun, la production est restaurée (sha256 comparé avant / après) dans un finally.
//   node .orchestre/preuves/026-097/contre-verif-04-10.mjs <fichier-de-sortie>
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const JUGE = path.join(R, 'scripts', 'atelier-maquettes-qa.mjs')
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const F = {
  maquette: 'app/api/usine/atelier/maquette/route.ts',
  lien: 'app/api/usine/atelier/lien/route.ts',
  travail: 'app/api/usine/atelier/travail/route.ts',
  depot: 'app/api/usine/atelier/depot/route.ts',
  script: 'scripts/agents/atelier-maquettes.mjs',
  client: 'lib/agents/acquisition/magasinUsine.ts',
}
const SABOTAGES = [
  { id: 'S1', fichier: 'maquette', attendu: ['AM-7'], quoi: "enregistrerMaquettePrete ne reçoit plus la table des objets (la page privée ne retrouverait aucun fichier)",
    de: "{ chemin: objets['capture-telephone.jpg'], empreinte: empreintes['capture-telephone.jpg'], variante: null, objets, empreintes, prete_le: new Date().toISOString() }", vers: "{ chemin: objets['capture-telephone.jpg'], empreinte: empreintes['capture-telephone.jpg'], variante: null }" },
  { id: 'S2', fichier: 'lien', attendu: ['AM-8'], quoi: "creerLienMaquette reçoit le jeton en clair au lieu de son empreinte",
    de: "await magasinSupabase.creerLienMaquette(p.id, m.objet ?? m.chemin, hacherJeton(jeton), expireLe)", vers: "await magasinSupabase.creerLienMaquette(p.id, m.objet ?? m.chemin, jeton, expireLe)" },
  { id: 'S3', fichier: 'travail', attendu: ['AM-6'], quoi: "le plafond du jour des entrants (5) n'est plus appliqué",
    de: "limite(Math.min(MAQUETTES_ENTRANTS_JOUR - jour.entrants_faites_aujourdhui, MAQUETTES_ENTRANTS_JOUR))", vers: "limite(MAQUETTES_ENTRANTS_JOUR + 50)" },
  { id: 'S4', fichier: 'script', attendu: ['AM-4'], quoi: "une capture dont les données compressées sont uniformes (structure JPEG intacte) est acceptée",
    de: "return compte.filter(Boolean).length >= 64 && Math.max(...compte) / donnees.length <= 0.5", vers: "return true" },
  { id: 'S5', fichier: 'lien', attendu: ['AM-12'], quoi: "le drapeau siteAchatPublic n'est plus lu : le lien de paiement part toujours",
    de: "drapeaux: { siteAchatPublic: actif('siteAchatPublic') }", vers: "drapeaux: { siteAchatPublic: true }" },
  { id: 'S6', fichier: 'maquette', attendu: ['AM-5'], quoi: "la route maquette accepte le jeton d'un autre agent",
    de: "if (agent.nom !== 'atelier_maquettes') return repondre({ erreur: 'agent' }, 403)\n  if ((await pauseGenerale()).active) return repondre({ erreur: 'pause' }, 423)\n  let corps: { prospect_id?: string; objets", vers: "if ((await pauseGenerale()).active) return repondre({ erreur: 'pause' }, 423)\n  let corps: { prospect_id?: string; objets" },
  { id: 'S7', fichier: 'script', attendu: ['AM-3'], quoi: "un coffre complet qui porte en plus une clé interdite (service Supabase, Stripe) est accepté",
    de: "!m || !['PRESTI_URL', 'PRESTI_JETON_ATELIER'].includes(m[1]) || /sb_secret_|SUPABASE_SERVICE_ROLE_KEY|STRIPE|ANTHROPIC_API_KEY/i.test(ligne)", vers: "!m" },
  { id: 'S8', fichier: 'lien', attendu: ['AM-8'], quoi: "le lien se crée sans mesurer l'occupation du stockage (plafond de 60 %)",
    de: "if (await occupation() > 0.6 * 1024 * 1024 ** 2) {", vers: "if (false) {" },
  { id: 'S9', fichier: 'lien', attendu: ['AM-11'], quoi: "sur Meta, l'identifiant de la conversation est pris pour destinataire à la place de l'identifiant Meta de la personne",
    de: "canal = 'messagerie'; destinataire = conversation?.meta_id ?? null; conversationId = conversation ? idConversation : null", vers: "canal = 'messagerie'; destinataire = idConversation; conversationId = idConversation" },
]
function juger() {
  const r = spawnSync(process.execPath, ['--import', './scripts/ts-loader.mjs', JUGE], { cwd: R, encoding: 'utf8', timeout: 280_000 })
  const rouges = [...(r.stdout ?? '').matchAll(/^❌ (AM-\d+)/gm)].map((m) => m[1])
  const bilan = (r.stdout ?? '').split(/\r?\n/).filter((l) => /^atelier-maquettes-qa : /.test(l)).pop() ?? '(aucun bilan)'
  return { code: r.status, rouges, bilan }
}
const sortie = []
const log = (l) => { sortie.push(l); console.log(l) }
const avant = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, sha(path.join(R, f))]))
log(`# sha256 de la production avant : ${Object.entries(F).map(([k, f]) => `${f} ${avant[k]}`).join(' ; ')}`)
const temoin = juger()
log(`témoin (production corrigée) : code ${temoin.code}, rouges [${temoin.rouges.join(', ')}] — ${temoin.bilan}`)
let tout = temoin.code === 0
for (const s of SABOTAGES) {
  const f = path.join(R, F[s.fichier])
  const original = fs.readFileSync(f)
  const texte = original.toString('utf8')
  if (!texte.includes(s.de)) { log(`${s.id} : ancre introuvable dans ${F[s.fichier]} — sabotage non joué`); tout = false; continue }
  let resultat
  try {
    fs.writeFileSync(f, texte.replace(s.de, () => s.vers))
    resultat = juger()
  } finally {
    fs.writeFileSync(f, original)
  }
  const restaure = sha(f) === avant[s.fichier]
  const pris = s.attendu.every((id) => resultat.rouges.includes(id))
  log(`${s.id} ${F[s.fichier]} : ${s.quoi}\n    → rouges [${resultat.rouges.join(', ')}] (attendu ${s.attendu.join(', ')}) : ${pris ? 'PRIS' : 'NON PRIS'} · code ${resultat.code} · fichier restauré, sha256 identique : ${restaure ? 'oui' : 'NON'}`)
  if (!pris || !restaure) tout = false
}
const apres = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, sha(path.join(R, f))]))
const identique = JSON.stringify(avant) === JSON.stringify(apres)
log(`# sha256 de la production après : ${identique ? 'identiques à ceux d\'avant, pour les six fichiers' : 'DIFFÉRENTS'}`)
const final = juger()
log(`témoin après restauration : code ${final.code}, rouges [${final.rouges.join(', ')}] — ${final.bilan}`)
fs.writeFileSync(path.resolve(process.argv[2]), sortie.join('\n') + '\n')
process.exitCode = tout && identique && final.code === 0 ? 0 : 1
