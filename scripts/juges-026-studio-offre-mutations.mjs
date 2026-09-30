import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { exec } from 'child_process'
import util from 'util'

const execAsync = util.promisify(exec)
const ROOT = process.cwd()
const TRAVAIL = path.join(ROOT, '.orchestre/travail/026-167')
const PREUVES = path.join(ROOT, '.orchestre/preuves/026-167')

const mutations = [
  {
    critere: 'SO-1',
    fichier: 'app/studio/commander/[jeton]/page.tsx',
    avant: '<button type="submit" className="btn btn-primary">Payer {PRIX_PACK_STUDIO_TEXTE}</button>',
    apres: '<button type="submit" className="btn btn-primary">Payer 490 €</button>'
  },
  {
    critere: 'SO-2',
    fichier: 'lib/studio/offre.ts',
    avant: 'export const PRIX_PACK_STUDIO_TEXTE = formaterEuros(PRIX_PACK_STUDIO_CENTS)',
    apres: 'export const PRIX_PACK_STUDIO_TEXTE = "490 €"'
  },
  {
    critere: 'SO-3',
    fichier: 'app/api/studio/commander/route.ts',
    avant: "      payment_intent_data: { metadata: { type: 'pack_studio', pack_id: brouillon.id, marque_cle: lu.marque_cle } },",
    apres: ''
  },
  {
    critere: 'SO-3',
    fichier: 'app/api/studio/commander/route.ts',
    avant: "      invoice_creation: { enabled: true, invoice_data: { description: 'Pack de départ du Studio — Presti', footer: mentionFranchise('auto') } },",
    apres: ''
  },
  {
    critere: 'SO-4',
    fichier: 'lib/stripeAiguillage.ts',
    avant: "    if (s.mode === 'payment' && s.metadata?.pack_id) {",
    apres: '    if (s.metadata?.pack_id) {'
  },
  {
    critere: 'SO-5',
    fichier: 'lib/studio/commandeServeur.ts',
    avant: "  const { data: passe, error: eMaj } = await supabaseAdmin.from('packs_pubs').update(maj).eq('id', packId).eq('etat', 'brouillon').select('id')",
    apres: "  const { data: passe, error: eMaj } = await supabaseAdmin.from('packs_pubs').update(maj).eq('id', packId).select('id')"
  },
  {
    critere: 'SO-6',
    fichier: 'app/api/studio/commander/route.ts',
    avant: "      mode: 'payment',",
    apres: "      mode: 'subscription',"
  },
  {
    critere: 'SO-7',
    fichier: 'lib/studio/offre.ts',
    avant: '    if (!lu.p || !lu.m || lu.e * 1000 <= maintenant.getTime()) return null',
    apres: '    if (!lu.p || !lu.m) return null'
  },
  {
    critere: 'SO-8',
    fichier: 'scripts/studio/deposer-echantillon.mjs',
    avant: '  if (taille > TAILLE_MAX) return sortir(1, `✗ sortie/echantillon.mp4 fait ${(taille / 1048576).toFixed(1)} Mo (3 Mo au plus, le Gmail le joint au message) : rien n\'est déposé.`)',
    apres: ''
  }
]

async function copyRepo(dest) {
  const allowedDirs = ['app', 'components', 'lib', 'scripts', 'public', 'supabase', 'gabarits-pubs']
  const allowedFiles = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'postcss.config.js', 'tailwind.config.ts', 'components.json', '.eslintrc.json']

  for (const dir of allowedDirs) {
    if (fsSync.existsSync(path.join(ROOT, dir))) {
      await fs.cp(path.join(ROOT, dir), path.join(dest, dir), {
        recursive: true,
        filter: (src) => {
          const s = src.replace(/\\/g, '/')
          return !s.includes('/sites-demo/') && !s.includes('/.temp/')
        }
      })
    }
  }

  for (const file of allowedFiles) {
    if (fsSync.existsSync(path.join(ROOT, file))) {
      await fs.copyFile(path.join(ROOT, file), path.join(dest, file))
    }
  }

}

async function safeCleanDir(dir) {
  const resolvedTravail = path.resolve(TRAVAIL)
  const resolvedDir = path.resolve(dir)
  const rel = path.relative(resolvedTravail, resolvedDir)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('S�curit�: tentative de suppression hors de TRAVAIL')
  }
  if (!fsSync.existsSync(dir)) return

  const nmPath = path.join(dir, 'node_modules')
  try {
    const st = await fs.lstat(nmPath)
    if (st.isSymbolicLink() || st.isDirectory()) {
      await fs.rm(nmPath, { recursive: false, force: true })
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }

  try {
    await fs.lstat(nmPath)
    throw new Error('Jonction non supprimee')
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }

  await fs.rm(dir, { recursive: true, force: true })
}

async function main() {
  await fs.mkdir(TRAVAIL, { recursive: true })
  await fs.mkdir(PREUVES, { recursive: true })
  
  let mdReport = '# Rapport de mutations 026-167\n\nNote : La commande ex�cut�e pr�pare un index Git local temporaire sur la copie afin d\'exclure node_modules et .orchestre de l\'analyse, et n\'affecte jamais le d�p�t r�el.\n\n'
  const jsonReport = { mutations: [] }
  
  // 1. Témoin
  const temoinDir = path.join(TRAVAIL, 'temoin')
  await safeCleanDir(temoinDir)
  await fs.mkdir(temoinDir, { recursive: true })
  await copyRepo(temoinDir)
  
  console.log('Lancement du témoin...')
  try {
    const { stdout, stderr } = await execAsync('node --import ./scripts/ts-loader.mjs scripts/studio-offre-qa.mjs', { cwd: temoinDir })
    console.log('Témoin OK (code 0)')
    mdReport += `## Témoin\nPASS (code 0)\n\n`
  } catch (err) {
    console.error('Témoin ÉCHOUÉ', err.message)
    console.error('STDOUT:', err.stdout)
    console.error('STDERR:', err.stderr)
    mdReport += `## Témoin\nFAIL (code ${err.code})\n\n`
    await safeCleanDir(temoinDir)
    process.exit(1)
  }

  let anyPassed = false
  let index = 1
  for (const mut of mutations) {
    console.log(`Mutation ${index} (${mut.critere}) sur ${mut.fichier}...`)
    const mutDir = path.join(TRAVAIL, `mut-${index}`)
    await safeCleanDir(mutDir)
    await fs.mkdir(mutDir, { recursive: true })
    await copyRepo(mutDir)
    
    const filePath = path.join(mutDir, mut.fichier)
    let content = await fs.readFile(filePath, 'utf8')
    if (!content.includes(mut.avant)) {
      console.error(`Texte 'avant' introuvable dans ${mut.fichier}`)
      process.exit(1)
    }
    content = content.replace(mut.avant, mut.apres)
    await fs.writeFile(filePath, content, 'utf8')
    
    const start = Date.now()
    let exitedWithZero = false
    let output = ''
    try {
      const { stdout, stderr } = await execAsync('node --import ./scripts/ts-loader.mjs scripts/studio-offre-qa.mjs', { cwd: mutDir })
      exitedWithZero = true
      output = stdout + stderr
    } catch (err) {
      output = (err.stdout || '') + (err.stderr || '')
    }
    const duration = (Date.now() - start) / 1000
    
    if (exitedWithZero) {
      console.error(`Mutation ${index} a passé avec succès (attendu: échec ${mut.critere})`)
      mdReport = `UNE MUTATION A PASSÉ LE JUGE ! NE PAS CORRIGER LE JUGE.\nMutation ${index} (${mut.critere}) a renvoyé code 0.\n\n` + mdReport
      anyPassed = true
      
      jsonReport.mutations.push({
        juge: 'scripts/studio-offre-qa.mjs',
        commande: 'cd {racine} && git init && echo node_modules > .gitignore && echo .orchestre >> .gitignore && git add . && node --import ./scripts/ts-loader.mjs scripts/studio-offre-qa.mjs',
        fichier: mut.fichier,
        avant: mut.avant,
        apres: mut.apres,
        critere: mut.critere,
        extrait: 'A PASSÉ LE JUGE',
        duree_s: duration
      })
      index++
      continue
    }
    
    if (!output.includes(mut.critere)) {
      console.error(`Mutation ${index} a échoué mais le critère ${mut.critere} n'est pas cité.`)
      console.error(`Sortie: ${output}`)
      process.exit(1)
    }
    
    const lines = output.replace(/\x1B\[\d+m/g, '').split(/\r?\n/)
    const errLine = lines.find(l => l.includes('FAIL') && l.includes(mut.critere)) || (lines.find(l => l.includes(mut.critere)) || output.substring(0, 100).replace(/\n/g, ' '))
    
    mdReport += '* **' + mut.critere + '** (' + mut.fichier + ') cass� : ' + errLine.trim() + '\n'
    
    jsonReport.mutations.push({
      juge: 'scripts/studio-offre-qa.mjs',
      commande: 'cd {racine} && git init && echo node_modules > .gitignore && echo .orchestre >> .gitignore && git add . && node --import ./scripts/ts-loader.mjs scripts/studio-offre-qa.mjs',
      fichier: mut.fichier,
      avant: mut.avant,
      apres: mut.apres,
      critere: mut.critere,
      extrait: errLine.trim(),
      duree_s: duration
    })
    
    index++
  }
  
  await fs.writeFile(path.join(PREUVES, 'mutations.md'), mdReport, 'utf8')
  await fs.writeFile(path.join(PREUVES, 'mutations.json'), JSON.stringify(jsonReport, null, 2), 'utf8')
  
  console.log('Nettoyage...')
  await safeCleanDir(temoinDir)
  for (let i = 1; i <= mutations.length; i++) {
    await safeCleanDir(path.join(TRAVAIL, `mut-${i}`))
  }
  await fs.rm(TRAVAIL, { recursive: true, force: true })
  
  if (anyPassed) {
    console.log('Une ou plusieurs mutations ont passé.')
    process.exit(1)
  }
  
  console.log('Toutes les mutations ont échoué comme prévu.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})






