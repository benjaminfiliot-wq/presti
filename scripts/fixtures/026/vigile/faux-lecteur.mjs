// scripts/fixtures/026/vigile/faux-lecteur.mjs — le faux lecteur de modèle de vigile-qa (026-248).
//
// fabriquerCreerLecteur(mode) rend { creerLecteur, appels } : creerLecteur(agent, options) a la signature de celui de
// lib/agents/llm.ts (026-041) et consigne chaque création ; le lecteur rendu consigne le texte REÇU ({ systeme, donnees })
// et répond selon le mode :
//   ok              { texte, evenement } sûrs, bâtis sur le relevé reçu (aucun nombre qui n'y soit) ;
//   nombre-invente  la même chose, plus un nombre absent du relevé ;
//   adresse         plus une adresse e-mail ;
//   secret          plus une chaîne à forme de secret (assemblée à l'exécution, jamais écrite d'un bloc) ;
//   vide            { texte: '', evenement: '' } ;
//   dort            lance un processus qui dort (son pid est consigné) et ne répond qu'au délai `options.delaiMs` (défaut
//                   600 000 ms, le plafond de Codex) : alors il tue ce processus et rend null.
// Lancé seul avec --dormir, ce fichier est le processus qui dort.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const MOI = fileURLToPath(import.meta.url)
const SECTIONS = ['erreurs', 'dependances', 'conseiller', 'echeances', 'bannissements']

function releveDe(donnees) {
  const m = /<releve_vigile>\s*([\s\S]*?)\s*<\/releve_vigile>/.exec(String(donnees ?? ''))
  try { return m ? JSON.parse(m[1]) : null } catch { return null }
}
function reponseSure(r) {
  const lignes = [`Relevé du Vigile, niveau ${r?.niveau ?? 'inconnu'}.`]
  for (const s of SECTIONS) {
    const x = r?.[s] ?? {}
    let l = `${s} : ${x.niveau ?? 'inconnu'}${x.etat === 'mesure' ? '' : ', non mesuré'}`
    if (s === 'erreurs' && x.etat === 'mesure') l += `, ${x.applicatives_24h} erreurs applicatives`
    lignes.push(l)
  }
  return { texte: lignes.join('\n'), evenement: `${r?.niveau ?? 'inconnu'} : relevé résumé par le modèle d'essai` }
}

export function fabriquerCreerLecteur(mode) {
  const appels = { creer: [], lire: [], pids: [] }
  const creerLecteur = (agent, options = {}) => {
    appels.creer.push({ agent, options: options ?? null })
    return async ({ systeme, donnees } = {}) => {
      appels.lire.push({ systeme, donnees })
      const r = releveDe(donnees)
      const sur = reponseSure(r)
      if (mode === 'ok') return sur
      if (mode === 'nombre-invente') return { texte: `${sur.texte}\n9173 tentatives d'intrusion bloquées`, evenement: sur.evenement }
      if (mode === 'adresse') return { texte: `${sur.texte}\nÀ transmettre à jean.temoin@presti-test.invalid`, evenement: sur.evenement }
      if (mode === 'secret') return { texte: `${sur.texte}\nclé vue : ${['sk', 'ant', 'sentinelle', 'vigileqa', 'abcdefghij'].join('-')}`, evenement: sur.evenement }
      if (mode === 'vide') return { texte: '', evenement: '' }
      if (mode === 'dort') {
        const enfant = spawn(process.execPath, [MOI, '--dormir'], { stdio: 'ignore', windowsHide: true })
        appels.pids.push(enfant.pid)
        return new Promise((ok) => {
          setTimeout(() => { try { enfant.kill('SIGKILL') } catch { /* mort */ } ok(null) }, Number(options?.delaiMs) > 0 ? Number(options.delaiMs) : 600_000)
        })
      }
      throw new Error(`mode inconnu : ${mode}`)
    }
  }
  return { creerLecteur, appels }
}

if (process.argv[2] === '--dormir' && path.resolve(process.argv[1] || '') === MOI) setTimeout(() => {}, 600_000)
