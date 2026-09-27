// scripts/fixtures/026-pilotage/s/base-essai.mjs — la base d'essai de station-route-qa (fiche 026-067), écrite par Claude
// Code : elle assemble les jeux d'essai de s/ en une configuration pour s/doublures-station.mjs.
//   baseEssai({ pannes, surcharges }) → { rpc(nom, args), table(nom, requete), lectures }
//   pannes : noms de fonctions (« pilotage_agents »), de tables (« table:alertes »), de lectures (« lecture:santeService »),
//            ou « * » (tout échoue).
//   surcharges : { rpc: { nom: valeur }, tables: { nom: lignes }, lectures: { nom: valeur }, evenements: [...] }.
// pilotage_evenements(p_apres, p_limite, p_agent, p_types) filtre les événements de evenements.json et de l'usine :
// avec p_apres, les suivants par id croissant ; sans, les plus récents d'abord.
import { jeuS } from './commun.mjs'

export function baseEssai({ pannes = [], surcharges = {} } = {}) {
  const B = jeuS('base-essai.json')
  const tous = pannes.includes('*')
  const panne = (x) => tous || pannes.includes(x)
  const evts = surcharges.evenements ?? [...jeuS('evenements.json').evenements, ...B.evenements_usine]
  const donnees = {
    ...B.rpc,
    pilotage_agents: jeuS('agents.json').agents,
    pilotage_recettes_agents: jeuS('recettes.json').jours,
    station_reunion_chiffres: jeuS('chiffres-reunion.json').chiffres,
    pilotage_prospects_departements: jeuS('departements.json').departements,
    pilotage_activite_salles: jeuS('activite-salles.json').activite,
    ...(surcharges.rpc ?? {}),
  }
  const decisions = jeuS('decisions.json').decisions
  const rpc = (nom, args = {}) => {
    if (panne(nom)) return new Error(`panne d’essai : ${nom}`)
    if (nom === 'pilotage_evenements') {
      let l = evts.filter((e) => (args.p_agent == null || e.agent === args.p_agent) && (args.p_types == null || args.p_types.includes(e.type)))
      if (args.p_apres != null) l = l.filter((e) => e.id > args.p_apres).sort((a, b) => a.id - b.id)
      else l = l.sort((a, b) => b.id - a.id)
      return l.slice(0, args.p_limite ?? 100)
    }
    if (nom === 'pilotage_decisions_par_cles') return decisions.filter((d) => (args.p_cles ?? []).includes(d.cle_idempotence))
    return donnees[nom]
  }
  const tables = { ...B.tables, alertes: jeuS('alertes.json').alertes, ...(surcharges.tables ?? {}) }
  const table = (nom) => (panne(`table:${nom}`) ? new Error(`panne d’essai : table ${nom}`) : tables[nom] ?? [])
  const brutes = { ...B.lectures, ticketsOuverts: jeuS('tickets.json').ticketsOuverts, ...(surcharges.lectures ?? {}) }
  const lectures = Object.fromEntries(Object.entries(brutes).map(([k, v]) => [k, panne(`lecture:${k}`) ? new Error(`panne d’essai : ${k}`) : v]))
  return { rpc, table, lectures }
}
