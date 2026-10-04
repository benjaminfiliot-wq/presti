// scripts/fixtures/026-garde/plafond/executer-llm.mjs — l'enfant du juge garde-plafond-qa pour lib/agents/llm.ts (GF-2, GF-3).
// Lancé par le juge : `node --experimental-strip-types --import <dépôt>/scripts/ts-loader.mjs <ce fichier> <config.json>`, cwd = la
// racine jugée (donc « @/lib/… » s'y résout). Il importe <cwd>/lib/agents/llm.ts, fabrique un lecteur (agent `douleurs`, voie
// freellmapi en boucle locale) avec des DOUBLURES seulement — fetch, enregistrerCout, et les deux prises que le juge exige :
//   deps.coutDeVoie(id, detail)        → le coût en euros de la voie (un nombre fini ≥ 0) ; autre chose : l'appel est refusé ;
//   deps.verifierPlafond(agent, cout)  → Promise<true> pour autoriser ; TOUT autre retour (ou une exception) : refusé.
// et consigne l'ordre des événements (cout, verifier, appel, inscrire). Jamais de réseau hors 127.0.0.1, jamais de clé.
// Sortie : une ligne `@@JSON@@{…}` (un résultat par scénario) ; aucune autre ligne n'est lue.
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const config = JSON.parse(process.argv[2] ?? '{}')
const llm = await import(pathToFileURL(path.join(process.cwd(), 'lib', 'agents', 'llm.ts')).href)

const valeurDe = (v) => {
  switch (v?.type) {
    case 'undefined': return undefined
    case 'null': return null
    case 'nan': return Number.NaN
    case 'infini': return Number.POSITIVE_INFINITY
    case 'chaine': return v.v
    case 'nombre': return v.v
    case 'nombre-ou-bool': return v.v
    case 'objet': return {}
    default: return undefined
  }
}

async function essai(nom, fabriquerPrises) {
  const journal = [], couts = [], recus = {}
  const reponse = () => new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":1}' } }] }), { status: 200, headers: { 'content-type': 'application/json' } })
  const deps = {
    env: { FREELLMAPI_URL: 'http://127.0.0.1:9' },
    fetch: async () => { journal.push('appel'); return reponse() },
    enregistrerCout: async (_agent, montant) => { journal.push('inscrire'); couts.push(montant); return { ok: true } },
    maintenant: () => Date.now(),
    attendre: async () => {},
    ...fabriquerPrises(journal, recus),
  }
  let lecteur = null
  try { lecteur = llm.creerLecteur('douleurs', {}, deps) } catch (e) { return { nom, ok: false, erreur: `creerLecteur : ${String(e?.message ?? e).slice(0, 120)}`, journal, couts, recus, sansLecteur: true } }
  if (typeof lecteur !== 'function') return { nom, ok: false, erreur: 'aucun lecteur rendu', journal, couts, recus, sansLecteur: true }
  try { await lecteur('système', { essai: 1 }); return { nom, ok: true, erreur: null, journal, couts, recus } }
  catch (e) { return { nom, ok: false, erreur: String(e?.message ?? e).slice(0, 120), journal, couts, recus } }
}

const resultats = []
for (const c of config.couts ?? []) {
  resultats.push(await essai(`cout-inconnu:${c.nom}`, (j) => ({ coutDeVoie: () => { j.push('cout'); return valeurDe(c.valeur) }, verifierPlafond: async () => { j.push('verifier'); return true } })))
}
resultats.push(await essai('cout-zero', (j) => ({ coutDeVoie: () => { j.push('cout'); return 0 }, verifierPlafond: async () => { j.push('verifier'); return true } })))
resultats.push(await essai('cout-par-defaut', (j) => ({ verifierPlafond: async () => { j.push('verifier'); return true } })))
for (const p of config.plafonds ?? []) {
  resultats.push(await essai(`plafond-refuse:${p.nom}`, (j) => ({
    coutDeVoie: () => { j.push('cout'); return 0 },
    verifierPlafond: async () => { j.push('verifier'); if (p.valeur.type === 'exception') throw new Error('base injoignable'); return valeurDe(p.valeur) },
  })))
}
resultats.push(await essai('ordre-et-arguments', (j, r) => ({
  coutDeVoie: () => { j.push('cout'); return 0 },
  verifierPlafond: async (agent, cout) => { j.push('verifier'); r.agent = agent; r.cout = cout; return true },
})))
// Les prises par défaut, sans aucune doublure du plafond : la base est injoignable (hors ligne) → l'appel doit être refusé.
resultats.push(await essai('defaut-sans-base', () => ({})))
console.log(`@@JSON@@${JSON.stringify({ resultats })}`)
