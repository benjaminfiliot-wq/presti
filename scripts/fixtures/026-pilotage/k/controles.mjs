// scripts/fixtures/026-pilotage/k/controles.mjs — le contrôle « JA-3 » du lot k (fiche 026-170, JK-4), lu par
// scripts/juges-026-pilotage-preuve.mjs --lot=k : l'auto-contrôle des jeux d'essai du lot.
//   · theme.schema.json valide themes/essai/theme.json (schéma ET contraintes hors schéma) ;
//   · il REFUSE, chacun pour la bonne raison (le message attendu doit s'y trouver), un emplacement sans porte, deux
//     emplacements réservés, un réservé avec un poste, une adresse https:// dans le thème, un champ de code (à la racine et
//     dans un emplacement) ; un thème abîmé de plus (tracé du tapis coupé) donne aussi un refus ;
//   · evenements.json est rejouable : une suite d'étapes qui nomme au moins les cinq motifs (tâche, réunion, pause, reprise,
//     panne) et que le juge sait lire (station-claw3d-qa la relit avec la même fonction).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validerTheme } from './validateur.mjs'

const K = path.dirname(fileURLToPath(import.meta.url))
const lire = (rel) => JSON.parse(fs.readFileSync(path.join(K, rel), 'utf8'))
const copie = (x) => JSON.parse(JSON.stringify(x))

export async function controleSchema() {
  const echecs = []
  const notes = []
  let schema, theme
  try { schema = lire('theme.schema.json'); theme = lire('themes/essai/theme.json') } catch (e) { return { echecs: [`theme.schema.json ou themes/essai/theme.json illisible : ${String(e.message).slice(0, 120)}`], detail: '' } }

  const base = validerTheme(theme, schema)
  if (base.length) echecs.push(`le thème d'essai n'est pas conforme à son schéma : ${base.slice(0, 3).join(' ; ')}`)
  else notes.push('thème d\'essai valide')

  const cas = [
    ['emplacement sans porte', (t) => { delete t.emplacements[2].porte }, /porte/],
    ['deux emplacements réservés', (t) => { t.emplacements.find((x) => !x.reservee).reservee = true }, /réservé/],
    ['réservé avec un poste', (t) => { t.emplacements.find((x) => x.reservee).poste = { x: 8, y: 8 } }, /poste/],
    ['adresse https:// dans le thème', (t) => { t.nom = 'https://exemple.invalid/x' }, /nom|adresse/],
    ['adresse dans une plaque', (t) => { t.emplacements[0].plaque.texte = '//exemple.invalid' }, /plaque|adresse/],
    ['champ de code à la racine', (t) => { t.script = 'alert(1)' }, /script/],
    ['champ de code dans un emplacement', (t) => { t.emplacements[1].onclick = 'x()' }, /onclick/],
    ['tracé du tapis coupé', (t) => { t.tapis.trace.splice(3, 2) }, /tracé/],
    ['défaut manquant', (t) => { t.defauts.pop() }, /défaut|defauts/],
  ]
  let refus = 0
  for (const [nom, abimer, attendu] of cas) {
    const t = copie(theme)
    try { abimer(t) } catch (e) { echecs.push(`cas « ${nom} » : le thème d'essai n'a pas la forme attendue (${String(e.message).slice(0, 60)})`); continue }
    const e = validerTheme(t, schema)
    if (!e.length) echecs.push(`le schéma accepte « ${nom} »`)
    else if (!e.some((m) => attendu.test(m))) echecs.push(`« ${nom} » est refusé pour une autre raison que la bonne : ${e[0]}`)
    else refus++
  }
  notes.push(`${refus}/${cas.length} thèmes abîmés refusés pour la bonne raison`)

  try {
    const ev = lire('evenements.json')
    const etapes = ev.etapes ?? ev
    if (!Array.isArray(etapes) || etapes.length < 5) echecs.push('evenements.json : une liste d\'au moins cinq étapes attendue')
    else {
      const texte = JSON.stringify(etapes)
      for (const m of ['tache', 'reunion', 'pause', 'reprise', 'panne']) if (!new RegExp(m, 'i').test(texte)) echecs.push(`evenements.json : aucune étape « ${m} »`)
      notes.push(`evenements.json : ${etapes.length} étapes`)
    }
  } catch (e) { echecs.push(`evenements.json illisible : ${String(e.message).slice(0, 100)}`) }

  return { echecs, detail: notes.join(' ; ') }
}
