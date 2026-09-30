// scripts/fixtures/026-garde/pause/controles.mjs — l'auto-contrôle des jeux d'essai du juge garde-pause-qa (contrôle « JA-3 » du lot) :
// les doublures se comportent comme la base qu'elles remplacent (une prise conditionnelle est atomique), la liste d'exemptions est
// fermée et bien formée, le témoin est complet, les jeux ne contiennent ni donnée réelle ni secret, le juge refuse un appel invalide.
import fs from 'node:fs'
import path from 'node:path'
import { D, TEMOIN_DIR, exemptions, fichiersTemoin, listerFichiers, lireOuNull } from './commun.mjs'
import { Base, installer } from './doublures.mjs'

const TIERS = ['lib/email.ts', 'lib/crieur/publora.ts', 'lib/contenu/metaPublier.ts']
const ATTENDUS = ['lib/agents/sortie.ts', 'lib/email.ts', 'app/api/cron/relances/route.ts', 'app/api/cron/crieur/route.ts', 'lib/crieur/pauseProgrammees.ts']

export async function controleJeuxGP({ lancerNode }) {
  const e = []
  // 1. les exemptions : une liste fermée, justifiée, sans voie tournée vers un tiers
  const ex = exemptions()
  const vus = new Set()
  for (const x of ex.exemptions) {
    if (vus.has(x.chemin)) e.push(`exemption en double : ${x.chemin}`)
    vus.add(x.chemin)
    if (!ex.classes.includes(x.classe)) e.push(`${x.chemin} : classe « ${x.classe} » hors de la liste fermée`)
    if (String(x.raison ?? '').length < 60) e.push(`${x.chemin} : justification de moins de 60 signes`)
    if (TIERS.includes(x.chemin)) e.push(`${x.chemin} : une voie tournée vers un tiers ne s'exempte pas`)
  }
  if (ex.exemptions.length < 3) e.push('exemptions.json : liste vidée ?')
  // 2. la base en mémoire : atomicité de la prise conditionnelle, limit, count, in, gt, pannes
  installer(path.resolve(D, '..', '..', '..', '..'), [], {})
  const b = new Base({ t: [{ id: 'a', v: false, n: 1 }, { id: 'b', v: false, n: 2 }, { id: 'c', v: true, n: 3 }] }, [{ table: 't', op: 'delete' }])
  const prise = () => b.from('t').update({ v: true }).eq('id', 'a').eq('v', false).select('id')
  const [p1, p2] = await Promise.all([prise(), prise()])
  if ((p1.data?.length ?? 0) + (p2.data?.length ?? 0) !== 1) e.push(`la prise conditionnelle n'est pas atomique : ${(p1.data?.length ?? 0) + (p2.data?.length ?? 0)} gagnant(s), 1 attendu`)
  if ((await b.from('t').select('id').eq('v', false).limit(1)).data.length !== 1) e.push('limit(1) rend plus d\'une ligne')
  if ((await b.from('t').select('id', { count: 'exact', head: true }).in('id', ['a', 'c'])).count !== 2 || (await b.from('t').select('id', { count: 'exact', head: true }).in('id', ['a', 'c'])).data !== null) e.push('count/head/in : comptage faux')
  if ((await b.from('t').select('id').gt('n', 1)).data.length !== 2) e.push('gt : filtre faux')
  if (!(await b.from('t').delete().eq('id', 'a')).error) e.push('une panne déclarée n\'est pas rendue')
  if ((await b.from('t').select('id').maybeSingle()).data?.id !== 'a') e.push('maybeSingle ne rend pas la première ligne')
  // 3. le témoin : les cinq fichiers, non vides, sans secret
  const t = fichiersTemoin()
  for (const f of ATTENDUS) if (!t.has(f)) e.push(`témoin : ${f} absent`)
  for (const [f, buf] of t) {
    const txt = buf.toString('utf8')
    if (!buf.length) e.push(`témoin : ${f} vide`)
    if (/sk_live|sk-ant-|re_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}|service_role\s*[:=]\s*['"]/.test(txt)) e.push(`témoin : ${f} ressemble à un secret`)
  }
  // 4. les jeux : aucune adresse réelle (exemple.test seulement), aucun secret
  for (const f of listerFichiers(D)) {
    if (f.startsWith('temoin/') || f === 'controles.mjs') continue // controles.mjs porte les motifs de secret qu'il cherche
    const txt = lireOuNull(path.join(D, f)) ?? ''
    for (const m of txt.matchAll(/[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g)) if (!/^(?:exemple\.(?:test|invalid)|[\w.-]*\$\{)/.test(m[1])) e.push(`${f} : adresse « ${m[0]} » (exemple.test seulement : aucune donnée réelle)`)
    if (/sk_live|sk-ant-|eyJ[A-Za-z0-9_-]{20,}/.test(txt)) e.push(`${f} ressemble à un secret`)
  }
  if (!fs.existsSync(TEMOIN_DIR)) e.push('dossier temoin absent')
  // 5. le juge refuse un appel invalide en code 2 (option inconnue, racine inexistante)
  for (const args of [['--bidon'], ['--racine=/inexistant-gp']]) {
    const r = lancerNode(['scripts/garde-pause-qa.mjs', ...args], { nom: `refus-${args[0].replace(/\W/g, '')}`, timeout: 60_000 })
    if (r.code !== 2) e.push(`garde-pause-qa ${args[0]} : code ${r.code}, 2 attendu`)
  }
  return { echecs: e, detail: `${ex.exemptions.length} exemptions fermées et justifiées ; base en mémoire : prise conditionnelle atomique, limit, count, in, gt, pannes ; témoin de ${t.size} fichiers sans secret ; jeux sans adresse réelle ; appel invalide ⇒ code 2` }
}
