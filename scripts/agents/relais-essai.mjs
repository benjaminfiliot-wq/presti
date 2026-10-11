#!/usr/bin/env node
// scripts/agents/relais-essai.mjs — l'ESSAI RÉEL du relais d'IA (lib/agents/relais.ts), à lancer SUR L'USINE :
//   node scripts/usine.mjs executer --nom=relais --delai=30 -- bash -c 'PRESTI_HOTE=usine CODEX_LANCEUR=/usr/local/bin/presti-ia-modele node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/agents/relais-essai.mjs'
// Pour chaque moteur : une sonde (« réponds ok », donnée publique triviale) ; puis les agents de bout en bout : le relais choisit seul.
// Rien d'autre que cette consigne publique ne part, aucune donnée réelle ; aucune clé n'est affichée ; la mémoire des moteurs à bout et le
// journal vont dans un dossier jetable (--garder pour le conserver). Le moteur « prospect » de l'essai (le standardiste) reçoit la MÊME consigne publique,
// avec un « oui » daté posé DANS CE PROCESSUS SEULEMENT pour essayer le local : aucun drapeau n'est levé nulle part.
//   --seul=<moteur>  une seule sonde ; --sans-agents  sans l'essai de bout en bout ; --json  la sortie en JSON.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { creerLecteurRelais, lireEtatRelais, sonderMoteur } from '../../lib/agents/relais.ts'

const args = process.argv.slice(2)
const seul = args.find((a) => a.startsWith('--seul='))?.slice(7)
const json = args.includes('--json')
const sansAgents = args.includes('--sans-agents')
const garder = args.includes('--garder')
const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'relais-essai-'))
const env = { ...process.env, IA_RELAIS_DOSSIER: dossier }
const deps = { env, dossier, verifierPlafond: async (_a, c) => c === 0, enregistrerCout: async (_a, c) => (c === 0 ? { ok: true } : { coupe: true }) }

const sorties = { moteurs: [], agents: [], etat: null }
const IDS = ['codex', 'freellmapi', 'ollama_cloud', 'ollama_8b', 'ollama_4b']
for (const id of IDS) {
  if (seul && seul !== id) continue
  const r = await sonderMoteur(id, deps)
  sorties.moteurs.push(r)
  if (!json) console.log(`sonde ${id.padEnd(13)} ${r.ok ? 'OK' : (r.configure ? 'ÉCHEC' : 'non configuré')}  modèle=${r.modele}${r.ms !== undefined ? `  ${r.ms} ms` : ''}${r.raison ? `  raison=${r.raison}` : ''}${r.fournisseurReel ? `  via=${r.fournisseurReel}` : ''}${r.reponse ? `  réponse=${r.reponse}` : ''}`)
}

if (!sansAgents && !seul) {
  const SYSTEME = 'Réponds uniquement par un objet JSON : {"ok": true}.'
  const DONNEES = { consigne: 'réponds ok' } // publique, triviale
  const essais = [
    ['douleurs', {}, 'public : freellmapi puis Codex, Ollama Cloud, le local'],
    ['studio', {}, 'public : Codex, freellmapi, Ollama Cloud, le local (8B puis 4B)'],
    ['standardiste', { IA_LOCALE_PROSPECTS_OUI: '2026-09-01' }, 'prospect (consigne publique, « oui » daté posé dans ce processus seulement) : Codex puis le LOCAL'],
    ['standardiste', {}, 'prospect SANS « oui » daté : rien ne doit partir hors Codex'],
    ['facteur', { IA_LOCALE_PROSPECTS_OUI: '2026-09-01' }, 'Facteur : Codex seul, aucun repli'],
  ]
  for (const [agent, extra, role] of essais) {
    const l = creerLecteurRelais(agent, {}, { ...deps, env: { ...env, ...extra } })
    const debut = Date.now()
    let ok = false, servi = null, erreur = null
    if (!l) erreur = 'aucun lecteur (aucun moteur configuré)'
    else { try { const v = await l(SYSTEME, DONNEES); ok = v?.ok === true; servi = l.dernier } catch (e) { erreur = e instanceof Error ? e.message : 'echec' } }
    const ligne = { agent, role, ok, servi_par: servi, erreur, ms: Date.now() - debut, chaine: l?.chaine ?? null }
    sorties.agents.push(ligne)
    if (!json) console.log(`agent ${agent.padEnd(13)} ${ok ? `OK servi par ${servi}` : `rien : ${erreur}`}  (${ligne.ms} ms)  — ${role}`)
  }
}
sorties.etat = lireEtatRelais(deps)
if (!json) { console.log(`état : à bout = ${sorties.etat.a_bout.map((x) => `${x.moteur}(${x.raison})`).join(', ') || 'aucun'}`); try { for (const f of fs.readdirSync(dossier).filter((x) => x.startsWith('relais-'))) console.log(`journal ${f} : ${fs.readFileSync(path.join(dossier, f), 'utf8').split('\n').filter(Boolean).length} ligne(s)`) } catch { /* rien */ } }
else console.log(JSON.stringify(sorties))
if (!garder) fs.rmSync(dossier, { recursive: true, force: true })
process.exitCode = 0
