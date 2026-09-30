// scripts/fixtures/026-garde/plafond/controles.mjs — le contrôle « JA-3 » du lot garde-plafond (auto-contrôle des jeux d'essai),
// écrit par Claude Code. Appelé par scripts/juges-026-pilotage-preuve.mjs : controleJeuxGarde(ctx) → { echecs, detail }.
// Il ne juge pas le dépôt : il vérifie que les jeux d'essai ne mentent pas (effectifs, unicité, plan de base accepté par la référence,
// témoin sans fichier vide ni nom sans suffixe) et que le juge refuse un appel invalide (code 2) sans rien écrire hors de sa zone.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { planDeBase, VARIANTES_GF1, COUTS_INCONNUS, PLAFONDS_REFUSES, DEMANDES, PROPOSITIONS_ARGENT, PROPOSITIONS_ANODINES } from './corpus.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const fichiers = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? fichiers(path.join(d, e.name)).map((f) => path.join(e.name, f)) : [e.name]))

export async function controleJeuxGarde(ctx) {
  const echecs = []
  const uniques = (liste, nom) => { if (new Set(liste).size !== liste.length) echecs.push(`${nom} : doublon`) }
  uniques([...PROPOSITIONS_ARGENT, ...PROPOSITIONS_ANODINES], 'propositions de la quarantaine')
  uniques(DEMANDES.map((d) => d.nom), 'noms des demandes de dépense')
  uniques(COUTS_INCONNUS.map((d) => d.nom), 'coûts inconnus')
  uniques(PLAFONDS_REFUSES.map((d) => d.nom), 'plafonds refusés')
  uniques(VARIANTES_GF1.map((d) => d.nom), 'variantes de GF-1')
  if (PROPOSITIONS_ARGENT.length < 10 || PROPOSITIONS_ANODINES.length < 3) echecs.push('quarantaine : 10 propositions d’argent et 3 anodines au moins')
  if (DEMANDES.filter((d) => d.ok).length < 3 || DEMANDES.filter((d) => !d.ok).length < 12) echecs.push('demandes de dépense : 3 accordées et 12 refusées au moins')
  if (!DEMANDES.some((d) => d.demande?.jeton_depense)) echecs.push('demandes de dépense : aucune ne porte de jeton')

  // Le plan de base est accepté par la RÉFÉRENCE (l'arbre d'avant le correctif) : sinon GF-1 jugerait un jeu d'essai cassé.
  if (!ctx.reference) echecs.push('arbre de référence indisponible : le plan de base ne peut pas être essayé')
  else {
    try {
      const m = await import(`${pathToFileURL(path.join(ctx.reference, 'scripts', 'chef', 'commun.mjs')).href}?ja3=${Date.now()}`)
      const maintenant = new Date('2026-09-30T10:00:00Z')
      const fautes = m.validerPlan(planDeBase(maintenant), 'plein', maintenant)
      if (fautes.length) echecs.push(`le plan de base est refusé par la référence : ${fautes.slice(0, 2).join(' | ')}`)
      for (const v of VARIANTES_GF1) {
        const p = planDeBase(maintenant)
        v.modifier(p)
        const f = m.validerPlan(p, 'plein', maintenant)
        if (f.length) echecs.push(`variante ${v.nom} : la référence la refuse déjà (${f[0]}) — GF-1 ne serait pas rouge pour la bonne raison`)
      }
    } catch (e) { echecs.push(`commun.mjs de la référence : ${String(e?.message ?? e).split('\n')[0]}`) }
  }

  // Le témoin : des fichiers .temoin, aucun de 0 octet, et les deux fichiers neufs que GF-5 et GF-4 exigent.
  const dossier = path.join(ICI, 'temoin')
  let n = 0
  if (!fs.existsSync(dossier)) echecs.push('témoin absent')
  else {
    for (const f of fichiers(dossier)) {
      n++
      if (!f.endsWith('.temoin')) echecs.push(`${f} : sans le suffixe .temoin`)
      else if (fs.statSync(path.join(dossier, f)).size === 0) echecs.push(`${f} : 0 octet`)
    }
    for (const neuf of ['lib/agents/depense.mjs.temoin', 'supabase/migrations/0121_plafond_avant_coup.sql.temoin']) if (!fs.existsSync(path.join(dossier, ...neuf.split('/')))) echecs.push(`témoin : ${neuf} absent`)
  }

  // Le juge lui-même : --temoin vert sur l'état actuel, un appel invalide refusé en code 2.
  const vert = ctx.lancerNode(['scripts/garde-plafond-qa.mjs', '--temoin'], { nom: 'juge-temoin' })
  if (vert.code !== 0) echecs.push(`garde-plafond-qa --temoin : code ${vert.code}, 0 attendu (${String(vert.sortie).split('\n').filter((l) => l.startsWith('❌')).join(' ; ').slice(0, 160)})`)
  const inconnue = ctx.lancerNode(['scripts/garde-plafond-qa.mjs', '--option-inconnue'], { nom: 'juge-option' })
  if (inconnue.code !== 2) echecs.push(`option inconnue : code ${inconnue.code}, 2 attendu`)
  const racine = ctx.lancerNode(['scripts/garde-plafond-qa.mjs', '--racine=/inexistant-garde-plafond'], { nom: 'juge-racine' })
  if (racine.code !== 2) echecs.push(`racine inexistante : code ${racine.code}, 2 attendu`)
  return { echecs, detail: `${PROPOSITIONS_ARGENT.length}+${PROPOSITIONS_ANODINES.length} propositions, ${DEMANDES.length} demandes, ${n} fichiers de témoin, plan de base accepté par la référence, juge --temoin en code 0, option et racine invalides en code 2` }
}
