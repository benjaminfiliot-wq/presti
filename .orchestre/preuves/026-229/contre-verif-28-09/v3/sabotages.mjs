// Contre-vérification 026-229 (28/09) : sabotages réversibles de la PRODUCTION (contrat du dépôt + témoin), jamais du
// juge. Chaque sabotage : sauvegarde disque de l'original, remplacement exact (1 occurrence), verifier complet de la
// fiche, restauration octet pour octet vérifiée par sha256 (dans un finally). Usage :
//   node .orchestre/travail/contre-verif-026-229-2809/sabotages.mjs K4 K2 ...   (ou TEMOIN pour le passage sans sabotage)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

const DEPOT = path.resolve(import.meta.dirname, '..', '..', '..')
const W = import.meta.dirname
const PREUVE = path.join(DEPOT, '.orchestre', 'preuves', '026-229', 'echecs-attendus.md')
const T = 'scripts/fixtures/026/savoir/socle/temoin/'
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')

const SABOTAGES = {
  K1: {
    fichier: 'docs/savoir/sources.json', critere: 'SVS-1 (dépôt) → (d) et (a)',
    quoi: 'le motif prospects « saas:Prospection/emails-artisans/** » disparaît : les listes d’e-mails d’artisans retombent sous « saas:Prospection/** » (interne) et partiraient dans general',
    avant: '    "saas:Prospection/emails-artisans/**",\n', apres: '',
    sha_avant: 'e6ce954abe0a3aad617bd25606aabdaabcaf45de6e365cb2c95ec2e7de87f62f',
  },
  K2: {
    fichier: `${T}scripts/savoir/envoyer.mjs`, critere: 'SVS-7 (témoin) → (b)',
    quoi: 'ssh sans « -o BatchMode=yes » : l’envoi planifié peut rester pendu sur une invite de mot de passe',
    avant: "['-i', cle, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', hote,", apres: "['-i', cle, '-o', 'ConnectTimeout=20', hote,",
    sha_avant: '69f21b100716d708d58272bcbfd0098ec336ca9186783f11660b1f8cda3c067e',
  },
  K3: {
    fichier: `${T}scripts/usine/savoir-recevoir.mjs`, critere: 'SVS-8 (témoin) → (b)',
    quoi: 'la réception accepte un fichier de l’archive absent du manifeste (il entre au savoir sans classe ni empreinte vérifiée)',
    avant: "    if (!f) refus('fichier de l’archive absent du manifeste')\n", apres: '    if (!f) continue\n',
    sha_avant: 'f0608f7de743b4f76e0c2e9d187e67f0d0dcc313bfc521c61fd184d2eaac5c60',
  },
  K4: {
    fichier: `${T}scripts/usine/systemd/presti-chef-savoir-recevoir.service`, critere: 'SVS-11 (témoin) → (b)',
    quoi: 'l’unité de réception tourne en root au lieu du compte agents',
    avant: 'User=agents\n', apres: 'User=root\n',
    sha_avant: '1a83d8d1876b4a0632c9254252425f3ee66aac5633f139cfcbb24246dbd18189',
  },
  K5: {
    fichier: `${T}scripts/savoir/exporter.mjs`, critere: 'SVS-2 (témoin) → (b)',
    quoi: 'PLACEHOLDER',
    avant: null, apres: null, sha_avant: '538409a13a48d320b1177661f7e19d4f85177d683b5c725cc21bc296df84b003',
  },
}

function lancerVerifier(log) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const out = fs.openSync(log, 'w')
    fs.writeSync(out, `$ node scripts/savoir-socle-qa.mjs --preuve-echecs\n# début ${new Date().toISOString()}\n\n`)
    const p = spawn(process.execPath, ['scripts/savoir-socle-qa.mjs', '--preuve-echecs'], { cwd: DEPOT, stdio: ['ignore', out, out], windowsHide: true })
    const minuterie = setTimeout(() => { try { p.kill() } catch { /* */ } }, 45 * 60 * 1000)
    p.on('close', (code, signal) => {
      clearTimeout(minuterie)
      const s = Math.round((Date.now() - t0) / 1000)
      fs.writeSync(out, `\n# fin ${new Date().toISOString()} · code ${code}${signal ? ` · signal ${signal}` : ''} · ${s} s\n`)
      fs.closeSync(out)
      resolve({ code, signal, secondes: s })
    })
  })
}

function lirePreuve() {
  const txt = fs.existsSync(PREUVE) ? fs.readFileSync(PREUVE, 'utf8') : ''
  const section = (titre) => { const i = txt.indexOf(titre); if (i < 0) return ''; const j = txt.indexOf('\n## ', i + 3); return txt.slice(i, j < 0 ? undefined : j) }
  const temoin = section('## (b) Témoin')
  const depot = section('## (a) Arbre courant')
  const d = section('## (d) SVS-1 seul')
  const c = section('## (c) Sabotages')
  return {
    genere: (txt.match(/Généré le (\S+)/) || [])[1] || null,
    bilan: (txt.match(/^\(a\) .*$/m) || [])[0] || null,
    verdict: (txt.match(/\*\*026-229 : (PASS|FAIL)\*\*/) || [])[1] || null,
    premier_echec_a: (depot.match(/premier échec réel : (\S+)/) || [])[1] || null,
    svs1_depot: (d.match(/^(PASS|FAIL) SVS-1 — .*$/m) || [])[0] || null,
    svs1_depot_detail: d.split('\n').filter((l) => /^\s+✗/.test(l)).slice(0, 4),
    temoin_echecs: temoin.split('\n').filter((l) => /^FAIL SVS-|^\s+✗|^Copies du contrat/.test(l)).slice(0, 14),
    sabotages_non: c.split('\n').filter((l) => /: NON —|critères sans sabotage|introuvable/.test(l)),
  }
}

const bilanPath = path.join(W, 'bilan.json')
const bilan = fs.existsSync(bilanPath) ? JSON.parse(fs.readFileSync(bilanPath, 'utf8')) : []
for (const id of process.argv.slice(2)) {
  const entree = { id, debut: new Date().toISOString() }
  const log = path.join(W, `${id}.log`)
  if (id === 'TEMOIN') {
    Object.assign(entree, { fichier: '(aucun)', critere: 'témoin : tout vert après restauration', quoi: 'passage sans sabotage' })
    Object.assign(entree, await lancerVerifier(log), lirePreuve())
  } else {
    const S = SABOTAGES[id]
    if (!S || !S.avant) { console.error(`sabotage inconnu ou vide : ${id}`); process.exitCode = 2; break }
    const cible = path.join(DEPOT, ...S.fichier.split('/'))
    const orig = fs.readFileSync(cible)
    const shaAvant = sha(orig)
    Object.assign(entree, { fichier: S.fichier, critere: S.critere, quoi: S.quoi, avant: S.avant, apres: S.apres, sha_avant: shaAvant })
    if (shaAvant !== S.sha_avant) { entree.erreur = `sha avant inattendu (${shaAvant}), sabotage non appliqué`; bilan.push(entree); fs.writeFileSync(bilanPath, JSON.stringify(bilan, null, 2)); continue }
    fs.writeFileSync(path.join(W, 'sauvegardes', `${id}.orig`), orig)
    fs.writeFileSync(path.join(W, 'en-cours.json'), JSON.stringify({ id, fichier: S.fichier, sha_avant: shaAvant, sauvegarde: `sauvegardes/${id}.orig` }))
    const t = orig.toString('utf8')
    try {
      const n = t.split(S.avant).length - 1
      entree.occurrences = n
      if (n !== 1) throw new Error(`remplacement : ${n} occurrence(s)`)
      const sabote = Buffer.from(t.replace(S.avant, () => S.apres), 'utf8')
      fs.writeFileSync(cible, sabote)
      entree.sha_sabote = sha(fs.readFileSync(cible))
      Object.assign(entree, await lancerVerifier(log), lirePreuve())
    } catch (e) {
      entree.erreur = e.message
    } finally {
      fs.writeFileSync(cible, orig)
      entree.sha_restaure = sha(fs.readFileSync(cible))
      entree.restaure_ok = entree.sha_restaure === shaAvant
      fs.rmSync(path.join(W, 'en-cours.json'), { force: true })
    }
  }
  if (fs.existsSync(PREUVE)) fs.copyFileSync(PREUVE, path.join(W, `${id}-echecs-attendus.md`))
  entree.fin = new Date().toISOString()
  bilan.push(entree)
  fs.writeFileSync(bilanPath, JSON.stringify(bilan, null, 2))
  console.log(`${id} : code ${entree.code} · ${entree.secondes} s · ${entree.bilan} · restauré ${entree.restaure_ok ?? '-'}`)
}
