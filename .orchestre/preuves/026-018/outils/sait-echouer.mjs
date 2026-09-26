// Preuve que chaque juge du lot A sait échouer (fiche 026-018) : pour chaque critère, une entrée cassée dans la maquette
// (.orchestre/travail/026-018-maquette, une implémentation témoin qui passe) ou dans une copie témoin de l'arbre courant,
// le juge relancé, la ligne rouge relevée, puis l'original restauré (et vérifié octet pour octet).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const R = 'C:/Users/benja/Documents/presti'
const M = path.join(R, '.orchestre/travail/026-018-maquette')
const T = path.join(R, '.orchestre/travail/026-018-temoin')
const PREUVES = path.join(R, '.orchestre/preuves/026-018')
const LOADER = ['--import', './scripts/ts-loader.mjs']
const JUGES = {
  SC: ['scripts/livraison-schema-qa.mjs', '--numero=0103'],
  TR: [...LOADER, 'scripts/tresorerie-qa.mjs'],
  TL: [...LOADER, 'scripts/livraison-tour-qa.mjs'],
  TA: [...LOADER, 'scripts/tuile-argent-qa.mjs'],
}
const lancer = (args) => { const r = spawnSync(process.execPath, args, { cwd: R, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024 }); return { code: r.status, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}` } }
const court = (t, n = 220) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }

// Copie témoin de l'arbre courant (app, lib, supabase) : les critères NR y sont verts.
if (!fs.existsSync(T)) for (const d of ['app', 'lib', 'supabase']) fs.cpSync(path.join(R, d), path.join(T, d), { recursive: true })

// [juge, critère, racine, mode, fichier, avant, après, (texte attendu dans la ligne rouge)]
const CAS = [
  ['SC', 'SC-1', M, 'complet', 'supabase/migrations/0103_livraison_commandes.sql', 'generation_duree_s integer check', 'generation_duree_s bigint check'],
  ['SC', 'SC-2', M, 'complet', 'supabase/migrations/0103_livraison_commandes.sql', '  add column if not exists entreprise text,', '  drop column if exists consigne,\n  add column if not exists entreprise text,'],
  ['SC', 'SC-3', M, 'complet', 'supabase/migrations/0103_livraison_commandes.sql', "'en_ligne', 'retiree'))", "'en_ligne'))"],
  ['SC', 'SC-4', M, 'complet', 'supabase/migrations/0103_livraison_commandes.sql', "comment on column public.sites_commandes.dossier_jeton_hash", "grant select on public.sites_commandes to anon;\ncomment on column public.sites_commandes.dossier_jeton_hash"],
  ['SC', 'SC-5', M, 'complet', 'supabase/migrations/0103_livraison_commandes.sql', 'where artisan_id is null and achat_public;', 'where artisan_id is null;'],
  ['SC', 'SC-6', M, 'complet', 'supabase/migrations/_A_COLLER_sql_editor_0103.sql', "courriels jsonb not null default '{}'::jsonb", "courriels jsonb not null default '[]'::jsonb"],
  ['SC', 'SC-7', M, 'complet', 'supabase/controles/0103_livraison_commandes.sql', "-- Contrôle après application de 0103", "insert into public.sites_commandes (email) values ('x@presti-test.invalid');\n-- Contrôle après application de 0103"],
  ['SC', 'SC-8', M, 'complet', '.orchestre/preuves/026-021/essai-a-sec.md', 'toutes les instructions ont passé', 'toutes les instructions ont échoué'],
  ['SC', 'SC-9', M, 'complet', 'supabase/migrations/0088_site_commande.sql', "comment on table public.sites_commandes is 'Site a la demande", "comment on table public.sites_commandes is 'Site à la demande"],
  ['SC', 'SC-9', T, 'temoin', 'supabase/migrations/0089_sites_bucket.sql', 'insert into storage.buckets', 'insert  into storage.buckets'],
  ['TR', 'TR-1', M, 'complet', 'lib/direction/tresorerie.ts', 'export function ventesSites(', 'function ventesSites('],
  ['TR', 'TR-2', M, 'complet', 'lib/direction/tresorerie.ts', 'depasse: caCents !== null && seuil > 0 && caCents >= seuil,', 'depasse: caCents !== null && seuil > 0 && caCents > seuil,'],
  ['TR', 'TR-3', M, 'complet', 'lib/direction/stripe.ts', '- 7 * 86400', '- 6 * 86400'],
  ['TR', 'TR-3', M, 'complet', 'lib/direction/stripe.ts', 'r.frais += t.fee;', 'r.frais += t.fee + 1;'],
  ['TR', 'TR-4', M, 'complet', 'lib/direction/tresorerie.ts', 'marge: (cents(encaisse.net) - dep) / 100', 'marge: encaisse.net - dep / 100'],
  ['TR', 'TR-5', M, 'complet', 'app/api/controle/compta/route.ts', '.limit(300)', '.limit(301)'],
  ['TR', 'TR-6', M, 'complet', 'lib/direction/tresorerie.ts', '/** Somme d', "export const suspendre = (id: string) => stripe?.subscriptions.update(id, {})\n/** Somme d"],
  ['TR', 'TR-7', M, 'complet', 'lib/direction/tresorerie.ts', '/** Somme d', "export const casse: number = 'texte'\n/** Somme d"],
  ['TR', 'TR-8', M, 'complet', 'app/api/controle/chiffres/route.ts', "import { NextResponse } from 'next/server'", "import { NextResponse } from 'next/server' // retouche"],
  ['TR', 'TR-8', T, 'temoin', 'app/api/controle/barre/route.ts', "import { NextResponse } from 'next/server'", "import { NextResponse } from 'next/server' // retouche"],
  ['TL', 'TL-1', M, 'complet', 'lib/siteLivraison.ts', 'export function heuresOuvreesEntre(', 'function heuresOuvreesEntre('],
  ['TL', 'TL-2', M, 'complet', 'lib/siteLivraison.ts', "if ((c.etat === 'generee' || c.etat === 'validee') && !deja.generee)", "if ((c.etat === 'generee' || c.etat === 'validee' || c.etat === 'en_ligne') && !deja.generee)"],
  ['TL', 'TL-3', M, 'complet', 'lib/siteLivraison.ts', 'Nous avons bien reçu votre paiement de', 'Nous avons bien reçu votre paiement garanti de'],
  ['TL', 'TL-4', M, 'complet', 'lib/siteLivraison.ts', "    await deps.base.from('sites_commandes').update({ courriels: sans }).eq('id', id)", '    void sans'],
  ['TL', 'TL-5', M, 'complet', 'lib/siteLivraison.ts', 'text: g.text, critique: true })', 'text: g.text })'],
  ['TL', 'TL-6', M, 'complet', 'lib/siteLivraison.ts', "if (j !== 'Sat' && j !== 'Sun') n++", "if (j !== 'Sun') n++"],
  ['TL', 'TL-7', M, 'complet', 'lib/siteLivraison.ts', 'sujet: `Commande de site en retard (${c.etat})`', 'sujet: `Commande de ${c.email} en retard (${c.etat})`'],
  ['TL', 'TL-8', M, 'complet', 'app/api/cron/livraison/route.ts', 'export const maxDuration = 60', 'export const maxDuration = 30'],
  ['TL', 'TL-8', M, 'complet', 'app/api/cron/livraison/route.ts', "  const secret = process.env.CRON_SECRET", "  await tourLivraison()\n  const secret = process.env.CRON_SECRET"],
  ['TL', 'TL-8', T, 'temoin', 'app/api/cron/relances/route.ts', "  const nowIso = new Date().toISOString()", "  const nowIso = new Date(Date.now() - 1).toISOString()"],
  ['TL', 'TL-8', T, 'temoin', 'lib/alertes.ts', "{ nom: 'purges-rgpd', maxHeures: 26 }", "{ nom: 'purges-rgpd', maxHeures: 30 }"],
  ['TL', 'TL-9', M, 'complet', 'lib/siteLivraison.ts', 'const FMT = ', "export const casse: number = 'texte'\nconst FMT = "],
  ['TA', 'TA-1', M, 'complet', 'app/api/controle/tresorerie/route.ts', "  if (!actif('comptabilite')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n  const f = await estFondateur(req)", "  const f = await estFondateur(req)\n  if (!actif('comptabilite')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })"],
  ['TA', 'TA-2', M, 'complet', 'app/api/controle/tresorerie/route.ts', 'const achatsMoisCents = sommeCents((achats ?? []).map((a) => a.ttc_cents ?? 0))', 'const achatsMoisCents = (achats ?? []).reduce((n, a) => n + (a.ttc_cents ?? 0), 0)'],
  ['TA', 'TA-3', M, 'complet', 'app/api/controle/tresorerie/route.ts', 'margeDuMois({ encaisse: mois.valeur, achatsMoisCents, coutIaEur })', 'margeDuMois({ encaisse: mois.valeur, achatsMoisCents: 0, coutIaEur })'],
  ['TA', 'TA-4', M, 'complet', 'lib/direction/veilleTresorerie.ts', "if (JOUR.format(maintenant) !== 'Mon') return []", "if (JOUR.format(maintenant) !== 'Mon' && JOUR.format(maintenant) !== 'Tue') return []"],
  ['TA', 'TA-5', M, 'enfant-veille', 'lib/siteLivraison.ts', '  try { await veilleTresorerie() } catch (e) { r.erreurs.push((e as Error).message) }', '  await veilleTresorerie()', 'tourLivraison lève quand la veille lève'],
  ['TA', 'TA-5', T, 'temoin', 'app/controle/Comptabilite.tsx', "import Fraicheur from './Fraicheur'", "import Fraicheur from './Fraicheur'\n// un\n// deux\n// trois\n// quatre"],
  ['TA', 'TA-6', M, 'complet', 'app/controle/TuileArgent.tsx', "(s && s.erreur ? 'non mesuré' : ", "(s && s.erreur ? '0,00 €' : "],
  ['TA', 'TA-7', M, 'complet', 'app/controle/TuileArgent.tsx', "const val = ", "export const casse: number = 'texte'\nconst val = "],
]

const FILTRE = process.env.FILTRE ? process.env.FILTRE.split(',') : null
const ancien = FILTRE ? JSON.parse(fs.readFileSync(path.join(PREUVES, 'sait-echouer-juges.json'), 'utf8')) : null
const resultats = []
// Les témoins : chaque juge sur la maquette (complet) et sur la copie témoin (--temoin), avant toute mutation.
const temoins = {}
for (const [j, args] of Object.entries(JUGES)) {
  if (FILTRE && !CAS.some((x) => x[0] === j && FILTRE.includes(x[1]))) { temoins[j] = ancien.temoins[j]; continue }
  const c = lancer([...args, `--racine=${M}`])
  const t = lancer([...args, `--racine=${T}`, '--temoin'])
  temoins[j] = { complet: { code: c.code, rouges: c.sortie.split(/\r?\n/).filter((l) => l.startsWith('❌')).map((l) => court(l, 160)) }, temoin: { code: t.code } }
  console.log(`témoin ${j} : maquette code ${c.code}${temoins[j].complet.rouges.length ? ` (${temoins[j].complet.rouges.map((l) => l.slice(0, 8)).join(', ')})` : ''} ; copie témoin --temoin code ${t.code}`)
}
if (ancien?.temoins?.veille) temoins.veille = ancien.temoins.veille
for (const [j, critere, racine, mode, fichier, avantTxt, apresTxt, attenduTxt] of CAS) {
  if (FILTRE && !FILTRE.includes(critere)) { const a = ancien.resultats.find((x) => x.critere === critere && x.fichier === fichier && x.avant === avantTxt); if (a) resultats.push(a); continue }
  const f = path.join(racine, fichier)
  const original = fs.readFileSync(f)
  const texte = original.toString('utf8')
  const n = texte.split(avantTxt).length - 1
  const r0 = { juge: j, critere, racine: path.relative(R, racine).split(path.sep).join('/'), mode, fichier, avant: avantTxt, apres: apresTxt }
  if (n !== 1) { resultats.push({ ...r0, pris: false, erreur: `« avant » présent ${n} fois` }); console.log(`✗ ${critere} ${fichier} : avant présent ${n} fois`); continue }
  fs.writeFileSync(f, texte.replace(avantTxt, () => apresTxt))
  // « enfant-veille » : la partie exécutée de TA-5 (la veille lève), lue dans la ligne de résultat de l'enfant du juge, parce
  // que la maquette ne peut pas avoir, dans l'historique git, la version d'avant la veille de lib/siteLivraison.ts.
  const argsEnfant = [...JUGES.TA, '--enfant=complet', `--racine=${racine}`, '--veille-en-panne']
  const lireEnfant = (s) => { const l = s.split(/\r?\n/).find((x) => x.startsWith('@@tuile-argent-qa@@ ')); try { return JSON.parse(l.slice(20)).criteres['TA-5'] } catch { return null } }
  let r
  try { r = lancer(mode === 'enfant-veille' ? argsEnfant : [...JUGES[j], `--racine=${racine}`, ...(mode === 'temoin' ? ['--temoin'] : [])]) } finally { fs.writeFileSync(f, original) }
  if (mode === 'enfant-veille') {
    const c = lireEnfant(r.sortie)
    r = { code: c?.echecs?.length ? 1 : 0, sortie: c?.echecs?.length ? `❌ TA-5 ${c.echecs.join(' ; ')}` : `✅ TA-5 ${c?.detail ?? ''}` }
    if (!temoins.veille) { const t0 = lireEnfant(lancer(argsEnfant).sortie); temoins.veille = { echecs: t0?.echecs ?? ['illisible'], detail: t0?.detail } }
  }
  const restaure = Buffer.compare(fs.readFileSync(f), original) === 0
  const ligneRouge = r.sortie.split(/\r?\n/).find((l) => l.startsWith(`❌ ${critere} `) || l === `❌ ${critere}`) ?? null
  const etaitVert = mode === 'temoin' ? temoins[j].temoin.code === 0 : mode === 'enfant-veille' ? !temoins.veille.echecs.length : !temoins[j].complet.rouges.some((l) => l.startsWith(`❌ ${critere} `))
  const pris = r.code !== 0 && !!ligneRouge && restaure && (!attenduTxt || ligneRouge.includes(attenduTxt))
  resultats.push({ ...r0, code: r.code, etait_vert: etaitVert, pris, restaure, extrait: ligneRouge ? court(ligneRouge, 300) : null })
  console.log(`${pris ? '✓' : '✗'} ${critere} (${mode}) ${fichier} → code ${r.code}, ${ligneRouge ? court(ligneRouge, 120) : 'aucune ligne rouge pour ce critère'}${restaure ? '' : ' — RESTAURATION RATÉE'}`)
}
fs.mkdirSync(PREUVES, { recursive: true })
fs.writeFileSync(path.join(PREUVES, 'sait-echouer-juges.json'), JSON.stringify({ temoins, resultats }, null, 1) + '\n')
const md = [
  '# Les quatre juges du lot A savent échouer',
  '',
  `Produit par un script de Claude Code le ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}. Maquette : \`.orchestre/travail/026-018-maquette/\` (une implémentation témoin des fiches 026-021, 026-055, 026-024 et 026-059, jamais livrée) ; copie témoin : \`.orchestre/travail/026-018-temoin/\` (app, lib, supabase de l'arbre courant). Pour chaque ligne : une entrée cassée, le juge relancé, la ligne rouge relevée telle quelle, puis l'original restauré et vérifié octet pour octet.`,
  '',
  '## Témoins avant mutation',
  '',
  ...Object.entries(temoins).filter(([j]) => j !== 'veille').map(([j, t]) => `- ${j} : maquette, mode complet → code ${t.complet.code}${t.complet.rouges.length ? ` ; rouge(s) de départ : ${t.complet.rouges.map((l) => l.replace(/\|/g, '\\|')).join(' · ')}` : ' (tout vert)'} ; copie témoin, --temoin → code ${t.temoin.code}`),
  '',
  ...(temoins.veille ? [`- TA-5, partie exécutée (enfant du juge, veille qui lève) sur la maquette : ${temoins.veille.echecs.length ? 'rouge : ' + temoins.veille.echecs.join(' ; ') : 'vert — ' + temoins.veille.detail}`, '- TA-5 complet reste rouge sur la maquette : sa base git (la version de lib/siteLivraison.ts d’avant la veille) ne peut pas exister avant 026-024 ; la partie exécutée est prouvée par l’enfant, la partie diff par sait-echouer-diffs.md.'] : []),
  '',
  '## Mutations',
  '',
  '| Juge | Critère | Mode | Fichier cassé | Vert avant | Code | Pris | Ligne rouge (extrait réel) |',
  '|---|---|---|---|---|---|---|---|',
  ...resultats.map((x) => `| ${x.juge} | ${x.critere} | ${x.mode} | ${x.racine}/${x.fichier} | ${x.etait_vert ? 'oui' : 'non'} | ${x.code ?? '—'} | ${x.pris ? 'oui' : 'NON'} | ${String(x.extrait ?? x.erreur ?? '').replace(/\|/g, '\\|')} |`),
  '',
  `Bilan : ${resultats.filter((x) => x.pris).length} mutation(s) prise(s) sur ${resultats.length}.`,
  '',
]
fs.writeFileSync(path.join(PREUVES, 'sait-echouer-juges.md'), md.join('\n'))
console.log(`bilan : ${resultats.filter((x) => x.pris).length}/${resultats.length}`)
