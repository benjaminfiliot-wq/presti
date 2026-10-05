// scripts/fixtures/relais-ia/faux-codex-chef.mjs — le faux binaire « codex » des essais du relais du chef : il échoue (401 ou quota) tant que
// l'argv ne désigne pas le fournisseur de secours attendu, puis réussit. chef-modele.mjs lui donne un environnement réduit : sa consigne
// est lue dans faux-config.json, DANS SON DOSSIER DE TRAVAIL (le dossier de la demande) : { reussitAvec: « fl » | « ollama-usine » | « jamais »,
// echec: « 401 » | « quota », journal: <fichier> }. Il consigne chaque appel (argv, présence de FL_KEY — jamais sa valeur) dans ce journal.
import fs from 'node:fs'
import path from 'node:path'
const argv = process.argv.slice(2)
let cfg = {}
try { cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'faux-config.json'), 'utf8')) } catch { cfg = {} }
const fournisseur = (argv.find((a) => a.startsWith('model_provider=')) || '').slice('model_provider='.length) || 'openai'
if (cfg.journal) fs.appendFileSync(cfg.journal, `${JSON.stringify({ argv, fournisseur, cle: Boolean(process.env.FL_KEY) })}\n`)
if (fournisseur === (cfg.reussitAvec || 'jamais')) { console.log('plan écrit'); process.exit(0) }
if (cfg.echec === 'quota') console.log("ERROR: You've hit your usage limit. Upgrade to Pro, or try again at Oct 9th, 2026 9:15 PM.")
else console.log('ERROR: unexpected status 401 Unauthorized: Missing bearer or basic authentication in header')
process.exit(1)
