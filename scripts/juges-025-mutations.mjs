// Contre-vérification 025-10 : témoins complets, mutations sur copies uniquement.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const T = path.join(R, '.orchestre/travail/025-10', `${Date.now()}-${process.pid}`)
const P = path.join(R, '.orchestre/preuves/025-10')
const rapport = [], journal = [], sauvegardes = new Map()
const sha = b => crypto.createHash('sha256').update(b).digest('hex')
const court = s => String(s).replace(/\x1b\[[0-9;]*m/g, '').replace(/[\r\n|]+/g, ' ').slice(0, 800)
function lire(f) { return fs.readFileSync(f, 'utf8') }
function unique(s, a, b) {
  if (s.split(a).length !== 2) throw Error(`ancre absente ou multiple : ${a}`)
  return s.replace(a, b)
}
function changer(bac, f, transformer) {
  const cible = path.join(bac, f), avant = fs.readFileSync(cible)
  if (!sauvegardes.has(cible)) sauvegardes.set(cible, avant)
  const apres = transformer(avant.toString())
  if (apres === avant.toString()) throw Error(`mutation sans changement : ${f}`)
  fs.writeFileSync(cible, apres)
}
function restaurerCopie() {
  for (const [f, contenu] of sauvegardes) { fs.writeFileSync(f, contenu); if (sha(fs.readFileSync(f)) !== sha(contenu)) throw Error(`copie non restaurée : ${f}`) }
  sauvegardes.clear()
}
function gate() {
  const cmd = process.platform === 'win32'
    ? ['powershell.exe', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.ProcessId -ne ${process.pid} -and $_.CommandLine -match '-qa\\.mjs(?:\\s|$)' } | ForEach-Object { $_.ProcessId }`]]
    : ['ps', ['-eo', 'pid=,args=']]
  const r = spawnSync(cmd[0], cmd[1], { encoding: 'utf8', timeout: 30000 })
  if (r.status !== 0) throw Error('inventaire QA indisponible')
  const actifs = process.platform === 'win32' ? r.stdout.trim() : r.stdout.split('\n').filter(l => /node\b.*-qa\.mjs(?:\s|$)/.test(l) && !new RegExp(`^\\s*${process.pid}\\s`).test(l)).join('\n')
  if (actifs) throw Error(`QA concurrente : ${court(actifs)} ; rien lancé`)
}
function copier(nom) {
  const bac = path.join(T, nom)
  const liste = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: R, encoding: 'utf8', maxBuffer: 32e6 })
  if (liste.status !== 0) throw Error('inventaire Git des sources impossible')
  const fichiers = [...new Set([...liste.stdout.split('\0'), 'next-env.d.ts'])].filter(f => /^(app\/|lib\/|components\/|public\/|scripts\/|supabase\/|maquettes\/|types\/|plans\/|package(?:-lock)?\.json$|tsconfig\.json$|next\.config\.mjs$|next-env\.d\.ts$|proxy\.ts$|postcss\.config\.mjs$)/.test(f) && !/(^|\/)(?:\.env[^/]*|node_modules|\.git)(\/|$)|\.(?:pem|key)$/.test(f))
  for (const f of fichiers) {
    const source = path.join(R, f)
    if (!fs.existsSync(source) || !fs.lstatSync(source).isFile()) continue
    const cible = path.join(bac, f); fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.copyFileSync(source, cible)
  }
  journal.push(`${nom} : copie utile ${fichiers.length} chemins, aucun .git/node_modules/.env`)
  return bac
}
function lancer(juge, bac) {
  gate()
  const r = spawnSync(process.execPath, [path.join(R, 'scripts', `${juge}.mjs`), `--racine=${bac}`], { cwd: R, encoding: 'utf8', timeout: 600000, maxBuffer: 64e6 })
  const sortie = `${r.stdout || ''}${r.stderr || ''}`
  journal.push(`$ node scripts/${juge}.mjs --racine=${bac}\ncode=${r.status}\n${sortie}`)
  return { code: r.status, sortie }
}
const remplacement = (f, a, b) => bac => changer(bac, f, s => unique(s, a, b))
const tous = (f, re, b) => bac => changer(bac, f, s => { if (!re.test(s)) throw Error(`ancre absente ${f}`); re.lastIndex = 0; return s.replace(re, b) })
function sortieHtml(transformer) {
  return bac => changer(bac, 'public/sites-demo/generer.mjs', s => `import fsMutation025 from 'node:fs';\nconst ecrire025=fsMutation025.writeFileSync;\nfsMutation025.writeFileSync=function(f,d,...a){if(String(f).endsWith('.html') && typeof d==='string') d=(${transformer})(d);return ecrire025.call(this,f,d,...a)};\n${s}`)
}
const groupes = [
  ['promesses-qa', [
    ['PR-M1', 'PR-1', 'apostrophe typographique dans manifest', bac => changer(bac, 'app/manifest.ts', s => `${s}\nexport const faute025 = 'Presti répond en moins d’une minute.'\n`)],
    ['PR-M2', 'PR-1', 'entité apos dans page', bac => changer(bac, 'app/page.tsx', s => `${s}\nexport const faute025 = 'Presti répond en moins d&apos;une minute.'\n`)],
    ['PR-M3', 'PR-3', 'présence soignée dans plans', bac => changer(bac, 'lib/plans.ts', s => `${s}\nexport const faute025 = 'Présence en ligne soignée'\n`)],
  ]],
  ['constructeur-ferme-qa', [
    ['CF-M1', 'CF-1', 'constructeur activé', tous('lib/flags.ts', /constructeurSite:\s*false/, 'constructeurSite: true')],
    ['CF-M2', 'CF-5', 'bloc SITE_A_LA_DEMANDE retiré', tous('app/profil/page.tsx', /SITE_A_LA_DEMANDE/g, 'SITE_XX_RETIRE')],
    ['CF-M3', 'CF-2', 'route répond 410', remplacement('app/api/site/generate/route.ts', "if (!actif('constructeurSite')) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })", "if (!actif('constructeurSite')) return NextResponse.json({ error: 'Introuvable' }, { status: 410 })")],
    ['CF-M4', 'CF-2', 'restitution du crédit retirée', remplacement('app/api/site/generate/route.ts', 'if (aRendre) await rendreCredit(aRendre.uid, aRendre.tier, aRendre.fondateur)', 'if (aRendre) void aRendre')],
  ]],
  ['maquette-qa', [
    ['MQ-M1', 'MQ-2', 'génération permise sous public', bac => changer(bac, 'public/sites-demo/generer.mjs', s => unique(s, 'function sortieMaquettePermise(valeur) {', 'function sortieMaquettePermise(valeur) { return valeur ? path.resolve(valeur) : null;'))],
    ['MQ-M2', 'MQ-4', 'année inventée dans texte', sortieHtml("h => h.replace('</body>', '<p>depuis 2011</p></body>')")],
    ['MQ-M3', 'MQ-4', 'témoignage rempli inventé', sortieHtml("h => h.replace('</body>', '<blockquote>Un client ravi de son chantier.</blockquote></body>')")],
    ['MQ-M4', 'T2', 'démo gelée modifiée', bac => changer(bac, 'public/sites-demo/lestraque/index.html', s => `${s}\n<p>faute de gel 025</p>\n`)],
    ['MQ-M5', 'MQ-7', 'page entièrement blanche', sortieHtml("h => h.replace('</head>', '<style>html,body{background:white!important}body>*{visibility:hidden!important}</style></head>')")],
  ]],
  ['formulaire-site-qa', [
    ['FS-M1', 'FS-2', 'data-demo remis', sortieHtml("h => h.replace(/<form /g, '<form data-demo ') ")],
    ['FS-M2', 'FS-2', 'piège website retiré', sortieHtml("h => h.replace(/<input[^>]*name=\"website\"[^>]*>/g, '')")],
    ['FS-M3', 'FS-4', 'bloc de repli retiré', sortieHtml("h => h.replace(/<div class=\"devis__echec\"[\\s\\S]*?<\\/div>/g, '')")],
    ['FS-M4', 'FS-6', 'appel ancien slug retiré', remplacement('app/api/leads/route.ts', 'await artisanParAncienSlug(slug!)', 'null')],
  ]],
  ['verrou-site-qa', [
    ['VS-M1', 'VS-1', 'site_origine retiré', tous('supabase/migrations/0093_site_fige.sql', /^.*new\.site_origine\s*:=.*\r?\n/m, '')],
    ['VS-M2', 'VS-1', 'verrou plan retiré', tous('supabase/migrations/0093_site_fige.sql', /^.*new\.plan\s*:=\s*old\.plan;.*\r?\n/m, '')],
  ]],
  ['webhook-muet-qa', [
    ['WM-M1', 'WM-2', 'alerte orphelin retirée', remplacement('app/api/stripe/webhook/route.ts', 'await envoyerAlertes([alerteOrphelin(event.id, s)])', 'void s')],
    ['WM-M2', 'WM-2', 'orphelin lève une erreur', remplacement('app/api/stripe/webhook/route.ts', 'await envoyerAlertes([alerteOrphelin(event.id, s)])', "throw new Error('orphelin rejeté au lieu de 200')")],
  ]],
  ['parcours-commande-qa', [
    ['PC-M1', 'PC-1', 'citation facultative', tous('lib/siteCommande.ts', /^.*if \(!a\.citation.*e\.push\(.*\r?\n/m, '')],
    ['PC-M2', 'PC-9', 'parcours 200 signes accepté', remplacement('lib/siteCommande.ts', "verifierBorne(a.parcours, 140, 'le parcours')", "verifierBorne(a.parcours, 200, 'le parcours')")],
    ['PC-M3', 'PC-2', 'prix changé', remplacement('lib/siteCommande.ts', 'export const PRIX_SITE_CENTS = 30000', 'export const PRIX_SITE_CENTS = 30001')],
  ]],
]
let erreur = null
try {
  gate()
  for (const [juge, mutations] of groupes) {
    const bac = copier(juge), temoin = lancer(juge, bac)
    rapport.push(`| ${juge} témoin | code 0 et PASS | ${temoin.code === 0 ? 'PASS' : 'FAIL'} | ${court(temoin.sortie.split('\n').filter(Boolean).slice(-1)[0])} |`)
    if (temoin.code !== 0 || !temoin.sortie.includes(`${juge} : PASS`)) throw Error(`${juge} : témoin non conforme ; aucune attribution causale aux mutations`)
    for (const [id, critere, faute, muter] of mutations) {
      const bacMutation = copier(`${juge}-${id}`)
      try {
        muter(bacMutation)
        const r = lancer(juge, bacMutation)
        const ligne = r.sortie.split('\n').find(l => new RegExp(`^FAIL ${critere}\\s`).test(l))
        const ok = r.code === 1 && Boolean(ligne) && !/exception|interrompu|non évalué/i.test(ligne)
        rapport.push(`| ${id} : ${faute} | ${critere} | ${ok ? 'REFUSÉE' : 'ÉCHEC'} | ${court(ligne || r.sortie.split('\n').filter(Boolean).slice(-1)[0])} |`)
        if (!ok) throw Error(`${id} : mutation non refusée causalement en ${critere} (code ${r.code})`)
      } finally { restaurerCopie() }
    }
  }
} catch (e) { erreur = e.message; journal.push(`BLOCAGE : ${erreur}`) }
fs.mkdirSync(P, { recursive: true })
fs.writeFileSync(path.join(P, 'mutations.md'), `# Contre-vérification 025-10\n\n${erreur ? `**FAIL : ${erreur}**\n\nCas après le blocage non exécutés ; aucun PASS global.\n\n` : ''}| Cas / faute | Critère attendu | Verdict | Extrait réel |\n|---|---|---|---|\n${rapport.join('\n')}\n\nVerdict : ${erreur ? 'FAIL' : 'PASS'}.\n`)
fs.writeFileSync(path.join(P, 'verifier.log'), journal.join('\n\n') + '\n')
console.log(journal.join('\n\n'))
console.log(`juges-025-mutations : ${erreur ? 'FAIL' : 'PASS'}${erreur ? ` — ${erreur}` : ''}`)
process.exitCode = erreur ? 1 : 0
