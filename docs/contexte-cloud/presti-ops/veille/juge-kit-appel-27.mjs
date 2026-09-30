#!/usr/bin/env node
// juge-kit-appel-27.mjs — juge du kit d'appel des 30 maquettes du 27/09 (écrit AVANT la production). 0 = PASS, 1 = FAIL.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const D = join(R, 'prospection', 'maquettes-2026-09-27')
const manques = []
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
let man = []
try { man = JSON.parse(lire(join(D, 'manifeste.json'))) } catch { manques.push('manifeste.json illisible') }
const kit = lire(join(D, 'KIT-APPEL.md'))
for (const s of ['## Avant d\'appeler', '## Script par métier', '## Objections', '## Après l\'appel', '## Messages par entreprise', '## Suivi']) if (!kit.includes(s)) manques.push(`KIT-APPEL.md : section « ${s} » absente`)
if (/\bHT\b|TTC/.test(kit)) manques.push('KIT-APPEL.md : « HT »/« TTC » interdits (franchise en base : « 300 €, TVA non applicable »)')
if (!/300\s?€/.test(kit) || !/TVA non applicable/i.test(kit)) manques.push('KIT-APPEL.md : l\'offre exacte « 300 €, TVA non applicable » n\'est pas dite')
if (/\b\d{2,}\s+(clients|artisans|sites)\s+(satisfaits|livrés|créés)\b/i.test(kit)) manques.push('KIT-APPEL.md : chiffre de clients ou de sites inventé')
const msgs = (kit.split("## Messages par entreprise")[1] || '').split(/\n## /)[0]
for (const m of man) {
  const bloc = msgs.split(/\n### /).find((b) => b.includes(String(m.entreprise || '').slice(0, 12)))
  if (!bloc) { manques.push(`messages : aucun bloc « ### » pour ${m.entreprise}`); continue }
  if (!/SMS/i.test(bloc) || !/Mail|E-mail/i.test(bloc)) manques.push(`messages ${m.entreprise} : il faut un SMS ET un mail`)
  if (!bloc.includes(m.dossier)) manques.push(`messages ${m.entreprise} : la maquette à joindre (${m.dossier}) n'est pas nommée`)
  if (!/STOP|ne plus (être|vous) (contacté|recontacter)|désinscri/i.test(bloc)) manques.push(`messages ${m.entreprise} : pas de moyen de refuser (STOP ou « ne plus être contacté »)`)
  if ((bloc.match(/SMS[^]*?(?=\n\*\*|\nMail|\nE-mail|$)/i) || [''])[0].length > 700) manques.push(`messages ${m.entreprise} : SMS trop long`)
}
const suivi = lire(join(D, 'suivi-appels.csv'))
const lignes = suivi.trim().split(/\r?\n/)
if (!/^n;entreprise;telephone;metier;commune;statut;date_appel;maquette_envoyee;prochaine_action;note$/.test(lignes[0] || '')) manques.push('suivi-appels.csv : en-tête attendu « n;entreprise;telephone;metier;commune;statut;date_appel;maquette_envoyee;prochaine_action;note »')
if (lignes.length - 1 !== man.length) manques.push(`suivi-appels.csv : ${lignes.length - 1} ligne(s) pour ${man.length} maquettes`)
if (manques.length) { console.log(`juge-kit-appel-27 : FAIL — ${manques.length} manque(s)`); for (const x of manques.slice(0, 30)) console.log('  - ' + x); process.exit(1) }
console.log(`juge-kit-appel-27 : PASS — kit d'appel complet, ${man.length} SMS + mails avec maquette et refus possible, tableau de suivi prêt`)
