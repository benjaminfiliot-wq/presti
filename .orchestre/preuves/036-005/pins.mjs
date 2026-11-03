// 036-005 — fabrique les données épinglées des essais n8n : pour chaque chef, la sortie de chaque « Appeler lib-* » est la sortie de l'export du lib
// rejoué hors ligne (le modèle de lib-rediger-message reste épinglé, jamais appelé). n8n exécute ensuite SES PROPRES nœuds Code sur ces entrées.
//   node .orchestre/preuves/036-005/pins.mjs <dossier>   → <dossier>/essai-<chef>.pin.json (le paramètre pinData de test_workflow)
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { executer } from '../../../scripts/demo-entreprise-qa.mjs'
import * as C from './construire.mjs'
const ICI = path.dirname(fileURLToPath(import.meta.url)), R = path.join(ICI, '..')
const dossier = process.argv[2] || '/tmp/argent'
mkdirSync(dossier, { recursive: true })
const L = {}
for (const d of ['035-003', '035-004', '035-005']) for (const f of readdirSync(path.join(R, d)).filter((x) => x.endsWith('.workflow.json'))) { const w = JSON.parse(readFileSync(path.join(R, d, f), 'utf8')); L[w.name] = w }
// Les chefs : l'export de n8n s'il est là (rapatrié), sinon l'export attendu de la fabrique.
const E = C.exports_()
const lu = (n) => { try { return JSON.parse(readFileSync(path.join(ICI, `${n}.workflow.json`), 'utf8')) } catch { return E[n] } }
const W = { ...L, 'presti-dep-devis': lu('presti-dep-devis'), 'presti-dep-facturation': lu('presti-dep-facturation') }
const lettres = (iso) => { const [a, m, d] = iso.split('-'); return `${Number(d) === 1 ? '1er' : Number(d)} ${['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][Number(m) - 1]} ${a}` }
const eur = (c) => `${String(c).slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${String(c).slice(-2)} € TTC`
const modele = (j) => { const f = j.enveloppe?.donnees?.faits ?? j.faits; return { objet: `Exemple. Rappel : facture ${f.numero}`, faits_cites: ['numero', 'montant', 'echeance'], champs_inconnus: [], texte: `{{salutation}}\n\nNous nous permettons de revenir vers vous au sujet de la facture ${f.numero} (${f.objet ?? 'Exemple. Travaux'}), d'un montant de ${eur(f.montant_ttc_centimes)}, arrivée à échéance le ${lettres(f.echeance_le)}. Si le règlement est déjà parti, merci de ne pas tenir compte de ce message ; s'il y a une difficulté, il vous suffit de nous répondre.\n\nBien cordialement,\nExemple. L’équipe` } }
const banc = C.banc()
// Les essais n8n portent un sous-ensemble du banc (le compte Signature, quelques dossiers) : les nœuds Code de n8n sont les mêmes pour les deux comptes,
// et un appel d'essai trop gros n'est pas rejoué. Le juge rejoue le banc entier sur l'export ; ici, seul compte la parité n8n / rejeu.
const GARDER = { devis: [5, 6, 9, 11], facturation: [31, 34, 35, 36] }
for (const dep of Object.keys(GARDER)) {
  const env = banc[dep].find((v) => v.organisation_id.endsWith('b2'))
  const numero = (ev) => Number(ev.id.slice(-10))
  env.donnees.evenements = env.donnees.evenements.filter((ev) => GARDER[dep].includes(numero(ev)) || (dep === 'devis' && numero(ev) === 11))
  const ids = new Set(env.donnees.evenements.flatMap((ev) => [ev.donnees.devis_id, ev.donnees.facture_id].filter(Boolean)))
  const lec = env.config.lectures_simulees
  for (const [k, rows] of Object.entries(lec)) lec[k] = rows.filter((r) => !('devis_id' in r || 'facture_id' in r) || ids.has(r.devis_id ?? r.facture_id))
  banc[dep] = [env]
}
for (const [nom, dep] of [['presti-dep-devis', 'devis'], ['presti-dep-facturation', 'facturation']]) {
  const r = executer(W[nom], banc[dep], W, { politique: 'notee', modele })
  if (r.erreur) throw new Error(`${nom} : ${r.erreur}`)
  const pin = { 'Appelé par le Cerveau': banc[dep].map((json) => ({ json })) }
  for (const n of W[nom].nodes.filter((x) => x.type === 'n8n-nodes-base.executeWorkflow')) if (r.par[n.name]) pin[n.name] = r.par[n.name][0].map((json) => ({ json }))
  writeFileSync(path.join(dossier, `essai-${nom}.pin.json`), JSON.stringify(pin))
  console.log(`${nom} : ${Object.keys(pin).length} nœud(s) épinglé(s), ${JSON.stringify(pin).length} octets ; sorties finales : ${r.sorties.map((s) => s.statut).join(',')}`)
}
