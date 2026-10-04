// scripts/fixtures/026-garde/stop/controles.mjs — le contrôle « JA-3 » du lot gstop : les jeux d'essai du juge garde-stop-qa se
// contrôlent eux-mêmes (corpus, doublure de la base, étiquettes confirmées par un contrôle indépendant), en ce processus puis par
// l'option --auto-controle du juge lancée sous le piège réseau de la preuve.
import { autoControle } from './autocontrole.mjs'

export async function controleJeuxGarde(ctx) {
  const echecs = []
  const interne = await autoControle()
  echecs.push(...interne.echecs)
  const r = ctx.lancerNode(['--import', './scripts/ts-loader.mjs', 'scripts/garde-stop-qa.mjs', '--auto-controle'], { nom: 'auto-controle' })
  if (r.code !== 0 || !/garde-stop-qa --auto-controle : PASS/.test(r.stdout)) echecs.push(`garde-stop-qa --auto-controle : code ${r.code}, « ${r.stdout.trim().split(/\r?\n/).pop()} »`)
  return { echecs, detail: `${interne.detail} ; le juge --auto-controle sort en code 0` }
}
