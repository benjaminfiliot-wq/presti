#!/usr/bin/env node
// scripts/fixtures/026/usine-production/fabricants/faux-fabricant.mjs — le fabricant factice que usine-production-qa.mjs
// (026-052) met dans la table d'une COPIE de scripts/usine/capacites.mjs, à la place de livrer-site.mjs. Écrit par Claude Code.
//
//   node faux-fabricant.mjs --entree=<dossier> --sortie=<dossier> --consigne=<dossier du juge>
//
// Il consigne, dans <consigne>/appel-<commande>-<n>.json : son argv, les NOMS de ses variables d'environnement (jamais une
// valeur), son dossier courant, et ce qu'il a trouvé dans l'entrée (noms, octets, sha256 ; charge.json tel quel). Le mode
// est celui que le juge associe à la commande de la charge dans <consigne>/modes.json (la charge du contrat n'a que
// { commande, essai? } : le mode ne peut pas y être) :
//   ok-site            site/index.html, site/site.json, site/styles.css, site/images/photo.webp (octets magiques RIFF/WEBP),
//                      rapport-qa.json, et manifeste.json qui les liste ;
//   fichier-non-liste  ok-site, plus site/non-liste.html absent du manifeste ;
//   lent               dort 120 s après avoir lancé un petit-enfant qui ajoute une ligne à <consigne>/battement-<commande>.log
//                      chaque seconde (son pid dans la consigne ; détaché sous Windows, hors du job du fabricant) ;
//   gros               ok-site plus site/gros.txt de 6 Mo (listé) ;
//   hors-type          ok-site plus site/outil.php, type application/x-httpd-php, texte UTF-8 valide (listé) ;
//   nom-dangereux      ok-site plus « site/../../x.html » (le « ../x » du contrat, écrit hors de la sortie, listé) ;
//   lien-symbolique    ok-site plus site/lien.html, un lien vers entree/commande.json (listé) ; si le poste refuse le lien :
//                      « lien_impossible » consigné, et rien d'autre en plus ;
//   secret             ok-site, mais site/index.html porte une chaîne au format d'un jeton d'agent (pa_<nom>_<43>),
//                      tirée au hasard ici et consignée ;
//   echec              ok-site partiel, puis code 3 ;
//   manifeste-absent   ok-site sans manifeste.json.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const arg = (n) => { const a = process.argv.slice(2).find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null }
const entree = arg('entree'), sortie = arg('sortie'), consigne = arg('consigne')
const cle = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p))
if (process.argv[1] && cle(process.argv[1]) === cle(fileURLToPath(import.meta.url))) {
  if (process.argv[2] === '--battre') { // le petit-enfant du mode lent
    const f = process.argv[3]
    setInterval(() => { try { fs.appendFileSync(f, `${Date.now()}\n`) } catch { /* dossier parti */ } }, 1000)
    fs.appendFileSync(f, `${Date.now()}\n`)
  } else principal()
}

function principal() {
  if (!entree || !sortie || !consigne) { console.error('faux-fabricant : --entree, --sortie et --consigne attendus'); process.exit(2) }
  let charge = null, chargeBrute = null
  try { chargeBrute = fs.readFileSync(path.join(entree, 'charge.json'), 'utf8'); charge = JSON.parse(chargeBrute) } catch { /* consigné tel quel */ }
  const commande = charge && typeof charge.commande === 'string' ? charge.commande : 'sans-commande'
  let modes = {}
  try { modes = JSON.parse(fs.readFileSync(path.join(consigne, 'modes.json'), 'utf8')) } catch { /* ok-site par défaut */ }
  const mode = modes[commande] || 'ok-site'
  const lister = (d, pre = '') => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lister(path.join(d, e.name), `${pre}${e.name}/`) : [{ nom: `${pre}${e.name}`, octets: fs.statSync(path.join(d, e.name)).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(d, e.name))).digest('hex') }])) : [])
  const trace = { mode, commande, argv: process.argv.slice(2), execPath: process.execPath, script: fileURLToPath(import.meta.url), noms_env: Object.keys(process.env).sort(), cwd: process.cwd(), pid: process.pid, entree: lister(entree), charge_brute: chargeBrute }
  let n = 1
  while (fs.existsSync(path.join(consigne, `appel-${commande}-${n}.json`))) n++
  const fTrace = path.join(consigne, `appel-${commande}-${n}.json`)
  const ecrireTrace = () => fs.writeFileSync(fTrace, JSON.stringify(trace, null, 1))
  ecrireTrace()

  const ecrire = (rel, contenu) => { const f = path.join(sortie, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenu) }
  const fichiers = []
  const ajouter = (nom, type, contenu, lister = true) => { ecrire(nom, contenu); if (lister) fichiers.push({ nom, type }) }
  const site = (html = '<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Site d’essai</title><link rel="stylesheet" href="styles.css"></head><body><h1>Essai</h1><img src="images/photo.webp" alt=""></body></html>\n') => {
    ajouter('site/index.html', 'text/html', html)
    ajouter('site/site.json', 'application/json', JSON.stringify({ version: 1, pages: ['index.html'] }))
    ajouter('site/styles.css', 'text/css', 'body{font-family:system-ui;margin:0}h1{color:#c96442}\n')
    ajouter('site/images/photo.webp', 'image/webp', webpMinimal())
    ajouter('rapport-qa.json', 'application/json', JSON.stringify({ verdict: 'PASS', criteres: 12, echecs: 0 }))
  }
  const manifeste = () => ecrire('manifeste.json', JSON.stringify({ fichiers }, null, 1))
  fs.mkdirSync(sortie, { recursive: true })
  switch (mode) {
    case 'lent': {
      const f = path.join(consigne, `battement-${commande}.log`)
      // Sous Windows, un enfant NON détaché entre dans l'objet job de libuv du fabricant et meurt avec lui : tuer le seul
      // fabricant tuerait aussi le petit-enfant, et UT-4 ne verrait pas la différence avec un arbre tué. Détaché, il sort de ce
      // job mais reste l'enfant du fabricant (taskkill /T le trouve). Sous Linux, il reste dans le groupe du fabricant
      // (non détaché) : process.kill(-pid) l'atteint, un kill du seul fabricant le laisse vivre. Comme un vrai navigateur.
      const enfant = spawn(process.execPath, [fileURLToPath(import.meta.url), '--battre', f], { stdio: 'ignore', detached: process.platform === 'win32', windowsHide: true })
      enfant.unref()
      trace.petit_enfant = enfant.pid; ecrireTrace()
      setTimeout(() => process.exit(0), 120_000)
      return
    }
    case 'echec': ajouter('site/index.html', 'text/html', '<!doctype html><title>partiel</title>\n'); process.exit(3); break
    case 'manifeste-absent': site(); break
    case 'secret': {
      const alph = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
      const b = crypto.randomBytes(43)
      const valeur = ['pa', 'livreur_usine', Array.from(b, (x) => alph[x % 64]).join('')].join('_')
      trace.secret = valeur; ecrireTrace()
      site(`<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>Essai</title></head><body><!-- ${valeur} --><h1>Essai</h1></body></html>\n`)
      manifeste(); break
    }
    case 'gros': site(); ajouter('site/gros.txt', 'text/plain', Buffer.alloc(6 * 1024 * 1024, 0x61)); manifeste(); break
    // Un texte UTF-8 valide : seul le contrôle du TYPE le refuse (pas les octets magiques).
    case 'hors-type': site(); ajouter('site/outil.php', 'application/x-httpd-php', '<?php echo "essai"; ?>\n'); manifeste(); break
    // Commence par « site/ », passe l'expression des noms et porte une extension permise : seul le refus de « .. » l'arrête.
    case 'nom-dangereux': site(); ajouter('site/../../x.html', 'text/html', '<!doctype html><title>hors de la sortie</title>\n'); manifeste(); break
    case 'lien-symbolique': {
      site()
      const lien = path.join(sortie, 'site', 'lien.html')
      try { fs.symlinkSync(path.join(entree, 'commande.json'), lien, 'file'); fichiers.push({ nom: 'site/lien.html', type: 'text/html' }) } catch (e) { trace.lien_impossible = e.code || e.message; ecrireTrace() }
      manifeste(); break
    }
    case 'fichier-non-liste': site(); ajouter('site/non-liste.html', 'text/html', '<!doctype html><title>hors manifeste</title>\n', false); manifeste(); break
    default: site(); manifeste()
  }
  process.exit(0)
}

/** Une image WebP (VP8L 1×1) entière : RIFF <taille> WEBP VP8L … — assez pour des octets magiques justes. */
export function webpMinimal() {
  const vp8l = Buffer.from([0x2f, 0x00, 0x00, 0x00, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe, 0x07]) // 13 octets, puis l'octet de bourrage
  const chunk = Buffer.concat([Buffer.from('VP8L'), u32(vp8l.length), vp8l, Buffer.from([0])])
  const corps = Buffer.concat([Buffer.from('WEBP'), chunk])
  return Buffer.concat([Buffer.from('RIFF'), u32(corps.length), corps])
}
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }
