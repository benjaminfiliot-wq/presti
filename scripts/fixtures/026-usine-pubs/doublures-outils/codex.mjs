// Le faux lanceur de Codex (CODEX_LANCEUR) du tourneur (usine-pubs-qa), lancé par lib/agents/llm.ts comme le vrai : `exec --model … --output-last-message
// <fichier> -`, la consigne et les données sur l'entrée standard. Il CONSIGNE tout ce qu'il reçoit (arguments et entrée complète) : le juge y lit que seule la
// page produit est partie, jamais l'accord, l'adresse ni le Message-ID de la marque. Sa réponse est celle du scénario (mode.codex).
import fs from 'node:fs'
import { lireConfig, noter, option } from './commun.mjs'

const [, , cfgChemin, ...argv] = process.argv
const cfg = lireConfig(cfgChemin)
const morceaux = []
for await (const m of process.stdin) morceaux.push(m)
const entree = Buffer.concat(morceaux).toString('utf8')
noter(cfg, 'codex', { argv, entree, env_cles: Object.keys(process.env).sort() })
const sortie = option(argv, '--output-last-message')
const mode = cfg.mode?.codex ?? 'ok'
const ligne = cfg.page_extrait // une phrase qui figure telle quelle sur la page produit
const valide = { produit: 'Table basse Témoin-Seize', lignes: ['Une table basse en chêne massif.', 'Plateau de trente millimètres.', 'Fabriquée en France.'], allegations: [{ texte: 'Plateau en chêne massif', extrait: ligne }], presentateur_virtuel: false }
let corps
if (mode === 'ok') corps = JSON.stringify(valide)
else if (mode === 'virtuel') corps = JSON.stringify({ ...valide, presentateur_virtuel: true })
else if (mode === 'extrait_faux') corps = JSON.stringify({ ...valide, allegations: [{ texte: 'Garantie dix ans', extrait: 'Garantie décennale offerte sur toute la gamme.' }] })
else if (mode === 'sans_extrait') corps = JSON.stringify({ ...valide, allegations: [{ texte: 'Plateau en chêne massif' }] })
else if (mode === 'json_invalide') corps = 'ceci n\'est pas du JSON'
if (mode === 'panne' || !sortie) process.exitCode = 1
else { fs.writeFileSync(sortie, corps); process.exitCode = 0 }
