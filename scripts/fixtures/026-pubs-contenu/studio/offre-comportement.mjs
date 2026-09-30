import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { lancer } from '../../025/commun.mjs'

const TRAVAIL = path.join(process.cwd(), '.orchestre/travail/026-258')

export function testerSO2(racine) {
  const echecs = []
  const origine = path.join(racine, 'lib/studio/offre.ts')
  if (!fs.existsSync(origine)) {
    echecs.push('SO-2: lib/studio/offre.ts absent')
    return echecs
  }

  const dossier = path.join(TRAVAIL, 'so2')
  fs.mkdirSync(path.join(dossier, 'lib/studio'), { recursive: true })
  
  let contenu = fs.readFileSync(origine, 'utf8')
  if (!contenu.includes('49000')) {
    echecs.push("SO-2: PRIX_PACK_STUDIO_CENTS n'est pas initialisé à 49000 (impossible de tester la cohérence)")
    return echecs
  }
  
  contenu = contenu.replace(/(PRIX_PACK_STUDIO_CENTS\s*=\s*)49000/, '$159000')
  
  fs.cpSync(path.join(racine, 'lib'), path.join(dossier, 'lib'), { recursive: true, force: true })
  fs.writeFileSync(path.join(dossier, 'lib/studio/offre.ts'), contenu)

  const testScript = path.join(dossier, 'test.mjs')
  fs.writeFileSync(testScript, `
import * as O from './lib/studio/offre.ts'
const cents = O.PRIX_PACK_STUDIO_CENTS
const texte = O.PRIX_PACK_STUDIO_TEXTE
const objCents = O.studio_offre_v1?.prix?.cents || (typeof O.offre === 'function' ? O.offre()?.prix_cents : undefined)
const objTexte = O.studio_offre_v1?.prix?.texte || (typeof O.offre === 'function' ? O.offre()?.prix_texte : undefined)

if (cents !== 59000) process.exit(1)
if (texte !== '590 €' && texte !== '590,00 €' && texte !== '590€') {
  console.error(texte)
  process.exit(2)
}

if (objCents && objCents !== 59000) process.exit(3)
if (objTexte && objTexte !== '590 €' && objTexte !== '590,00 €' && objTexte !== '590€') process.exit(4)

process.exit(0)
`)

  const res = lancer(process.execPath, ['--import', './scripts/ts-loader.mjs', testScript], { cwd: racine })
  if (res.code === 2 || res.code === 4) {
    echecs.push(`SO-2 : la copie à 59000 centimes affiche encore « ${res.stderr || res.stdout || '490 €'} »`)
  } else if (res.code !== 0) {
    echecs.push(`SO-2 : erreur inattendue lors de l'exécution du test : ${res.sortie}`)
  }
  
  return echecs
}

export function testerSO4(racine) {
  const echecs = []
  const origine = path.join(racine, 'lib/stripeAiguillage.ts')
  if (!fs.existsSync(origine)) {
    echecs.push('SO-4: lib/stripeAiguillage.ts absent')
    return echecs
  }

  const dossier = path.join(TRAVAIL, 'so4')
  fs.mkdirSync(dossier, { recursive: true })
  
  const testScript = path.join(dossier, 'test.mjs')
  fs.writeFileSync(testScript, `
import { aiguiller } from '${pathToFileURL(origine).href}'

const cas = [
  { s: { mode: 'payment', metadata: { type: 'pack_studio', pack_id: 'x' }, payment_status: 'paid' }, attendu: 'pack_studio' },
  { s: { mode: 'subscription', metadata: { type: 'pack_studio', pack_id: 'x' }, payment_status: 'paid' }, attendu: 'orphelin' },
  { s: { mode: 'payment', metadata: { type: 'pack_studio', pack_id: 'x' }, payment_status: 'unpaid' }, attendu: 'en_attente' },
  { s: { mode: 'payment', metadata: { type: 'pack_studio' }, payment_status: 'paid' }, attendu: 'orphelin' }
]

for (const c of cas) {
  const res = aiguiller(c.s)
  if (res !== c.attendu) {
    console.error(\`cas \${JSON.stringify(c.s)} -> \${res} (attendu \${c.attendu})\`)
    process.exit(1)
  }
}
process.exit(0)
`)

  const res = lancer(process.execPath, ['--import', './scripts/ts-loader.mjs', testScript], { cwd: racine })
  if (res.code !== 0) {
    echecs.push(`SO-4 : l'aiguillage ne respecte pas les règles strictes : ${res.sortie}`)
  }
  
  return echecs
}

export function testerSO8(racine) {
  const echecs = []
  const script = path.join(racine, 'scripts/studio/deposer-echantillon.mjs')
  if (!fs.existsSync(script)) {
    echecs.push('SO-8: scripts/studio/deposer-echantillon.mjs absent')
    return echecs
  }

  const dossier = path.join(TRAVAIL, 'so8')
  fs.rmSync(dossier, { recursive: true, force: true })
  fs.mkdirSync(path.join(dossier, 'scripts/studio'), { recursive: true })
  
  fs.copyFileSync(script, path.join(dossier, 'scripts/studio/deposer-echantillon.mjs'))
  fs.writeFileSync(path.join(dossier, 'scripts/pub-qa.mjs'), 'process.exit(0)')
  
  fs.mkdirSync(path.join(dossier, 'node_modules/@supabase/supabase-js'), { recursive: true })
  
  fs.writeFileSync(path.join(dossier, 'node_modules/@supabase/supabase-js/index.js'), `
import fs from 'node:fs'
export function createClient() {
  return {
    rpc: (name) => {
      fs.appendFileSync('supabase-calls.log', 'rpc:' + name + '\\n')
      if (name === 'ops_etat') return { abortSignal: () => Promise.resolve({ data: { decisions_ouvertes: [{ id: '12345678-1234-1234-1234-123456789012', question: 'échantillon' }] } }) }
      if (name === 'ops_decision_trancher') return { abortSignal: () => Promise.resolve({ data: null, error: null }) }
      return { abortSignal: () => Promise.resolve({ data: null }) }
    },
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => {
      return Promise.resolve({ data: [{ id: 'fondateur1' }] }) 
    } }) }) }) }),
    storage: { from: () => ({ list: () => Promise.resolve({ data: [] }), upload: () => {
      fs.appendFileSync('supabase-calls.log', 'upload\\n')
      return Promise.resolve({}) 
    } }) }
  }
}
`)

  const envFictif = {
    SUPABASE_SERVICE_ROLE_KEY: 'mock',
    NEXT_PUBLIC_SUPABASE_URL: 'mock'
  }
  
  const dirOk = path.join(dossier, 'ok/sortie')
  fs.mkdirSync(dirOk, { recursive: true })
  fs.writeFileSync(path.join(dirOk, 'echantillon.mp4'), Buffer.alloc(2 * 1024 * 1024))
  
  const dirTooBig = path.join(dossier, 'toobig/sortie')
  fs.mkdirSync(dirTooBig, { recursive: true })
  fs.writeFileSync(path.join(dirTooBig, 'echantillon.mp4'), Buffer.alloc(3 * 1024 * 1024 + 1)) // 3 Mo + 1 octet

  const cheminScript = path.join(dossier, 'scripts/studio/deposer-echantillon.mjs')
  
  // Test 1: Video Ok
  const logFile = path.join(dossier, 'supabase-calls.log')
  if (fs.existsSync(logFile)) fs.rmSync(logFile)

  const echantillonOk = path.join(dossier, 'ok')
  const r1 = lancer(process.execPath, [cheminScript, '--marque=test', '--echantillon=' + echantillonOk], { cwd: dossier, env: envFictif })
  if (r1.code !== 0) {
    echecs.push(`SO-8 : témoin vidéo sous 3Mo refusé : ${r1.sortie}`)
  } else {
    // Vérifier les accès
    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8')
      const countUpload = (logs.match(/upload/g) || []).length
      const countTrancher = (logs.match(/rpc:ops_decision_trancher/g) || []).length
      if (countUpload !== 1) echecs.push(`SO-8 : upload appelé ${countUpload} fois (1 attendu)`)
      if (countTrancher !== 1) echecs.push(`SO-8 : ops_decision_trancher appelé ${countTrancher} fois (1 attendu)`)
    } else {
      echecs.push('SO-8 : le témoin vert n\'a pas appelé Supabase (upload/trancher manquants)')
    }
  }
  
  // Reset logs
  if (fs.existsSync(logFile)) fs.rmSync(logFile)

  // Test 2: Video Too Big
  const echantillonTooBig = path.join(dossier, 'toobig')
  const r2 = lancer(process.execPath, [cheminScript, '--marque=test', '--echantillon=' + echantillonTooBig], { cwd: dossier, env: envFictif })
  
  if (r2.code !== 1) {
    echecs.push(`SO-8 : vidéo > 3Mo (3Mo + 1 octet) acceptée (code ${r2.code})`)
  } else if (!r2.sortie.includes('3 Mo au plus')) {
    echecs.push(`SO-8 : vidéo > 3Mo refusée mais avec le mauvais message : ${r2.sortie}`)
  }

  if (fs.existsSync(logFile)) {
    echecs.push('SO-8 : appel Supabase détecté pour une vidéo > 3Mo (le réseau doit être évité si la vidéo est refusée)')
  }
  
  return echecs
}
