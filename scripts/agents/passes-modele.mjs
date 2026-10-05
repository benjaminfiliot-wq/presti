#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { creerLecteurRelais } from '../../lib/agents/relais.ts'
import { executerJuge } from '../../lib/agents/acquisition/facteur.ts'

const argumentsPasses = process.argv.slice(2)
const agent = argumentsPasses.find(a => a.startsWith('--agent='))?.slice(8)
const soir = argumentsPasses.includes('--soir')
const baseArg = argumentsPasses.find(a => a.startsWith('--base='))?.slice(7)
if (!['standardiste', 'facteur'].includes(agent) || (soir && agent !== 'facteur') || argumentsPasses.some(a => !a.startsWith('--agent=') && !a.startsWith('--base=') && a !== '--soir')) {
  console.error('usage : passes-modele.mjs --agent=standardiste|facteur [--soir] [--base=<url>]')
  process.exit(2)
}
const base = baseArg ?? 'https://prestiapp.fr'
let url
try {
  url = new URL(base)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1')) throw new Error()
  if (url.username || url.password || url.search || url.hash) throw new Error()
} catch { console.error('base_invalide'); process.exit(2) }
const jeton = process.env[agent === 'standardiste' ? 'PRESTI_JETON_STANDARDISTE' : 'PRESTI_JETON_FACTEUR']
if (!jeton) { console.log('jeton_absent'); process.exit(0) }
// La voie Codex est gratuite : autoriser seulement le coût nul sans dépendre d'un bus de coûts sur l'usine.
// Un seul lecteur pour les trois passes, `--soir` compris (décision D-0410-3 du 04/10/2026) : le rejugement du soir se fait sur
// le modèle ÉTALONNÉ (`gpt-6-luna`, l'identité que `jugerTon` reconnaît) ; jamais `modele: 'rejuge'` (`gpt-6-sol`), que le second
// juge refuserait avant tout appel (`second_juge_non_etalonne`).
// Le relais (lib/agents/relais.ts) : Codex d'abord ; à bout, le local de l'usine après le « oui » daté de Benj (jamais l'IA gratuite pour un prospect) ;
// le Facteur ne se replie pas (son second juge est étalonné sur Codex seul).
const lecteur = creerLecteurRelais(agent, {}, {
  verifierPlafond: async (_agent, cout) => cout === 0,
  enregistrerCout: async (_agent, cout) => cout === 0 ? { ok: true } : { coupe: true },
  lancer: (chemin, argv, options) => spawn(chemin, argv, { ...options, env: {
    ...options.env,
    ...(process.env.FAUX_LANCEUR_JOURNAL ? { FAUX_LANCEUR_JOURNAL: process.env.FAUX_LANCEUR_JOURNAL } : {}),
    ...(process.env.FAUX_LANCEUR_BRUT ? { FAUX_LANCEUR_BRUT: process.env.FAUX_LANCEUR_BRUT } : {}),
  } }),
})
if (!lecteur) { console.log('modele_absent'); process.exit(0) }

async function appeler(chemin, corps) {
  try {
    const reponse = await fetch(new URL(`/api/usine/${chemin}`, url), {
      method: corps === undefined ? 'GET' : 'POST',
      headers: { authorization: `Bearer ${jeton}`, ...(corps === undefined ? {} : { 'content-type': 'application/json' }) },
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: AbortSignal.timeout(30_000),
    })
    if (!reponse.ok) return null
    return await reponse.json()
  } catch { return null }
}

// Une passe, puis fin NATURELLE du processus (code 0) : jamais process.exit après un fetch (Node 24 sous Windows : assertion libuv).
async function passer() {
  if (agent === 'standardiste') {
    const travail = await appeler('standard/travail')
    if (!travail) { console.log('bus_injoignable'); return }
    let rendus = 0
    let attente = null
    for (const reponse of (Array.isArray(travail.reponses) ? travail.reponses : []).slice(0, 20)) {
      try {
        const brut = await lecteur(reponse.systeme, reponse.donnees)
        const rendu = await appeler('standard/classement', { reponse_id: reponse.id, brut: typeof brut === 'string' ? brut : JSON.stringify(brut) })
        if (rendu) rendus++
      } catch (e) { attente = e instanceof Error ? e.message : 'echec' /* cette réponse sera reprise au passage suivant */ }
    }
    console.log(`standardiste : rendus=${rendus}`)
    if (attente && !rendus) console.log(`standardiste : reprise au passage suivant (${String(attente).slice(0, 80)})`)
  } else {
    const travail = await appeler(`facteur/travail${soir ? '?passe=soir' : ''}`)
    if (!travail) { console.log('bus_injoignable'); return }
    let rendus = 0
    await executerJuge({
      travail,
      lecteur: Object.assign(async ({ systeme, donnees }) => lecteur(systeme, donnees), { identite: lecteur.identite }),
      rendre: async (avis) => { const reponse = await appeler('facteur/avis', { ...avis, ...(soir ? { passe: 'soir' } : {}) }); if (reponse) rendus++ },
    })
    console.log(`facteur : rendus=${rendus}`)
  }
}
await passer()
process.exitCode = 0
