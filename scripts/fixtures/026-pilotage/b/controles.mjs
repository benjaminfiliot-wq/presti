// scripts/fixtures/026-pilotage/b/controles.mjs — les contrôles propres au lot b (fiche 026-066), déclarés par b/lot.mjs et
// lancés par scripts/juges-026-pilotage-preuve.mjs --lot=b. Chacun rend { echecs, detail } ; ctx.lancerNode lance node sous le
// piège réseau de la preuve ; ctx.reference est l'arbre de référence extrait (4041ec9).
//
//   controleJeux     (JA-3, JB-3) --generer-essai de pilotage-sql-qa, pour les quatre migrations, rend UN énoncé
//                    `do $essai_026$ … $essai_026$;` qui se parse (tokenizer de sql-nu.mjs), finit par raise exception
//                    'ESSAI_A_SEC %' et ne contient ni commit, ni rollback, ni grant, ni drop schema hors des jumeaux ;
//                    les comptes rendus FACTICES du témoin portent exactement les clés du scénario courant et l'empreinte
//                    du nu de référence courant (sinon : relancer fabriquer-temoin.mjs) ; les doublures répondent.
//   controleReel     (JA-4, JB-4) lu dans le source : le --reel de --migration=station n'appelle station_consigne_transmettre,
//                    station_reunion_ouvrir et station_experience_lancer (et station_pause_par_agent) que par refusService,
//                    avec des arguments refusés d'avance ; aucun autre juge du lot ne les appelle.
//   controleEnvois   (JA-6, JB-6) sur une copie de la référence à qui l'on ajoute un faux
//                    app/api/controle/pilotage/envois/[id]/route.ts, pilotage-gestes-qa sort en code ≠ 0 avec ❌ GE-4 ; et
//                    sur la même copie portant le témoin, GE-4 est le seul critère statique en échec (l'échec lui revient).
import fs from 'node:fs'
import path from 'node:path'
import { B, R, TRAVAIL, exigerSousTravail, fichiersTemoin, listerFichiers, lf } from './commun.mjs'
import { analyserEssai, instructions, jumeauNuCoupe, empreinte, clesScenario } from '../../../lib/sql-essai.mjs'
import { SCENARIOS } from './scenarios-sql.mjs'

const REF = '4041ec9b41432576037dbc0b45e0647bd60a0347'
const MIGS = [['lecture', '0107_pilotage_lecture'], ['echanges', '0108_pilotage_echanges'], ['station', '0112_pilotage_station'], ['reglages', '0113_station_reglages']]
const court = (t, n = 120) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }

export async function controleJeux(ctx) {
  const echecs = [], vus = []
  for (const [mig] of MIGS) {
    const r = ctx.lancerNode(['scripts/pilotage-sql-qa.mjs', `--migration=${mig}`, '--temoin', `--base=${REF}`, '--generer-essai'], { nom: `generer-${mig}` })
    if (r.code !== 0) { echecs.push(`--generer-essai ${mig} : code ${r.code} — ${court(r.stderr || r.stdout)}`); continue }
    const bloc = r.stdout
    const a = analyserEssai(bloc)
    if (!a.ok) echecs.push(`--generer-essai ${mig} : ${a.raisons.slice(0, 3).join(' ; ')}`)
    if (instructions(bloc).length !== 1) echecs.push(`--generer-essai ${mig} : ${instructions(bloc).length} énoncés, un seul attendu`)
    if (!/^do \$essai_026\$/.test(bloc.trim()) || !/raise exception 'ESSAI_A_SEC %/.test(bloc)) echecs.push(`--generer-essai ${mig} : pas de do $essai_026$ … raise exception 'ESSAI_A_SEC %'`)
    vus.push(`${mig} ${a.octets} octets, ${a.enonces} énoncé, ${clesScenario(SCENARIOS[mig]).length} clés`)
  }
  // Les comptes rendus factices du témoin suivent le scénario et le nu courants.
  const T = fichiersTemoin()
  const tmp = exigerSousTravail(path.join(TRAVAIL, 'juges-026-pilotage', 'controle-b-nus'))
  fs.mkdirSync(tmp, { recursive: true })
  for (const [mig, fichier] of MIGS) {
    const n = fichier.slice(0, 4)
    const nu = T.get(`supabase/migrations/_A_COLLER_sql_editor_${n}_NU.sql`), cr = T.get(`scripts/fixtures/026-pilotage/b/essais/${mig}.txt`)
    if (!nu || !cr) { echecs.push(`témoin ${mig} : nu ou compte rendu factice absent`); continue }
    const f = path.join(tmp, `${n}_NU.sql`)
    fs.writeFileSync(f, nu)
    const texte = lf(cr.toString('utf8'))
    const m = /ESSAI_A_SEC ([0-9a-f]{64}) (\{.*\})/.exec(texte)
    if (!m) { echecs.push(`compte rendu factice ${mig} illisible`); continue }
    if (m[1] !== empreinte(jumeauNuCoupe(f))) echecs.push(`compte rendu factice ${mig} : empreinte d'un autre nu (relancer fabriquer-temoin.mjs)`)
    const cles = Object.keys(JSON.parse(m[2])), attendues = clesScenario(SCENARIOS[mig])
    if (cles.length !== attendues.length || attendues.some((k) => !cles.includes(k))) echecs.push(`compte rendu factice ${mig} : clés différentes du scénario courant (relancer fabriquer-temoin.mjs)`)
    if (!/^COMPTE RENDU FACTICE/.test(texte)) echecs.push(`compte rendu factice ${mig} : l'en-tête « COMPTE RENDU FACTICE » manque (il ne doit jamais passer pour un essai)`)
  }
  // Les doublures des gestes répondent comme les modules qu'elles remplacent.
  const D = await import(`${new URL('./doublures-gestes.mjs', import.meta.url).href}?m=controle`)
  D.etat.config = { reconfirme: false, journalOk: false, drapeaux: { pilotage: true } }
  D.etat.appels.length = 0
  const rec = await D.exigerReconfirmation(new Request('http://127.0.0.1/'), 'u', 'securite')
  if (rec?.status !== 403 || (await rec.json()).code !== 'reconfirmation_requise') echecs.push('doublure : exigerReconfirmation ne refuse pas sans jeton')
  if ((await D.journaliser({ action: 'x' })) !== false || D.refusJournal().status !== 503) echecs.push('doublure : journal indisponible mal rendu')
  if (!D.actif('pilotage') || D.actif('siteAchatPublic')) echecs.push('doublure : actif ne lit pas la configuration')
  if (D.etat.appels.length !== 4) echecs.push(`doublure : ${D.etat.appels.length} appels consignés, 4 attendus`)
  return { echecs, detail: `--generer-essai sur le témoin : ${vus.join(' ; ')} ; comptes rendus factices du témoin à jour (clés et empreintes) ; doublures des gestes vérifiées` }
}

export async function controleReel(ctx) {
  const echecs = []
  const src = fs.readFileSync(path.join(R, 'scripts', 'pilotage-sql-qa.mjs'), 'utf8')
  const i = src.indexOf('async function reel()'), j = src.indexOf('\n}\n', i)
  if (i < 0 || j < 0) return { echecs: ['pilotage-sql-qa.mjs : function reel() introuvable'], detail: '' }
  const reel = src.slice(i, j)
  const ECRIVAINS = ['station_consigne_transmettre', 'station_reunion_ouvrir', 'station_experience_lancer', 'station_pause_par_agent', 'station_reglages_ecrire', 'station_consigne_par_agent', 'station_reunion_clore', 'station_experience_arreter']
  let n = 0
  for (const l of reel.split('\n')) {
    for (const nom of ECRIVAINS) {
      if (!l.includes(`'${nom}'`)) continue
      if (/for \(const n of NOMS\) await refusAnon/.test(l)) continue
      n++
      if (!/^\s*await refusService\(/.test(l)) echecs.push(`${nom} appelée hors de refusService : « ${court(l, 90)} »`)
      else if (!/NON_FONDATEUR|'pont'|'essai_sans_capacite'|version \+ 1000/.test(l)) echecs.push(`${nom} appelée avec des arguments qui ne sont pas refusés d'avance : « ${court(l, 90)} »`)
    }
  }
  if (!/const NON_FONDATEUR = '00000000-0000-4000-8000-000000000000'/.test(src)) echecs.push('NON_FONDATEUR n’est plus un uuid qui ne peut être aucun artisan')
  if (!/if \(o\.valeurs\.racine \|\| TEMOIN\) \{ S\.echoue\(id, '--reel se lance sur la racine réelle seulement'\)/.test(reel)) echecs.push('--reel n’est plus refusé sur une racine autre que la réelle')
  if (!/p_texte: ''/.test(reel)) echecs.push('la consigne de --reel n’a plus un texte vide')
  for (const juge of ['pilotage-route-qa.mjs', 'pilotage-gestes-qa.mjs']) {
    const s = fs.readFileSync(path.join(R, 'scripts', juge), 'utf8')
    if (s.includes('rest/v1/rpc')) echecs.push(`${juge} appelle PostgREST directement`)
    if (/station_consigne|\/consignes', \{ texte: '[^']{3,200}' \}/.test(s.slice(s.indexOf('async function vivant')))) echecs.push(`${juge} : une consigne valide envoyée au serveur`)
  }
  return { echecs, detail: `--reel de pilotage-sql-qa : ${n} appel(s) aux fonctions d'écriture, tous par refusService avec un auteur non fondateur, un texte vide, l'agent pont, un agent sans capacité ou une version périmée ; les juges de route n'appellent jamais PostgREST eux-mêmes ; leur partie vivante des juges de route n'envoie aucune consigne valide` }
}

export async function controleEnvois(ctx) {
  const echecs = []
  if (!ctx.reference) return { echecs: ['arbre de référence indisponible'], detail: '' }
  const FAUX = 'app/api/controle/pilotage/envois/[id]/route.ts'
  const faux = "// Faux fichier de la preuve (JB-6) : une route d'envoi, qu'aucune fiche ne doit créer.\nexport async function POST() { return new Response(null, { status: 204 }) }\n"
  const lancer = (dossier, nom) => ctx.lancerNode(['--import', './scripts/ts-loader.mjs', 'scripts/pilotage-gestes-qa.mjs', `--racine=${dossier}`, `--base=${REF}`], { nom })
  const poser = (dest, avecTemoin) => {
    fs.rmSync(dest, { recursive: true, force: true })
    for (const f of listerFichiers(ctx.reference)) {
      if (!/^(app|lib|scripts\/fermeture-e2e\.mjs)/.test(f)) continue
      const d = path.join(dest, f)
      fs.mkdirSync(path.dirname(d), { recursive: true })
      try { fs.linkSync(path.join(ctx.reference, f), d) } catch { fs.copyFileSync(path.join(ctx.reference, f), d) }
    }
    if (avecTemoin) for (const [rel, buf] of fichiersTemoin()) { if (!/^(app|lib|scripts\/fermeture-e2e\.mjs)/.test(rel)) continue; const d = path.join(dest, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.rmSync(d, { force: true }); fs.writeFileSync(d, buf) }
    const d = path.join(dest, FAUX)
    fs.mkdirSync(path.dirname(d), { recursive: true })
    fs.writeFileSync(d, faux)
  }
  const lignes = (r) => r.stdout.split(/\r?\n/).map((l) => l.trim())
  const d1 = exigerSousTravail(path.join(TRAVAIL, 'juges-026-pilotage', 'ja6-envois-b', 'reference'))
  poser(d1, false)
  const r1 = lancer(d1, 'envois-reference')
  if (r1.code === 0 || r1.code === null) echecs.push(`référence + faux ${FAUX} : code ${r1.code}, ≠ 0 attendu`)
  if (!lignes(r1).some((l) => l.startsWith('❌ GE-4'))) echecs.push(`référence + faux ${FAUX} : « ❌ GE-4 » absent`)
  const d2 = exigerSousTravail(path.join(TRAVAIL, 'juges-026-pilotage', 'ja6-envois-b', 'temoin'))
  poser(d2, true)
  const r2 = lancer(d2, 'envois-temoin')
  const rouges = lignes(r2).filter((l) => l.startsWith('❌ ')).map((l) => l.split(' ')[1])
  if (r2.code !== 1 || rouges.join(',') !== 'GE-4') echecs.push(`témoin + faux ${FAUX} : code ${r2.code}, en échec ${rouges.join(', ') || 'rien'} ; GE-4 seul attendu`)
  return { echecs, detail: `faux ${FAUX} ajouté par la preuve : sur la référence, code ${r1.code} avec ❌ GE-4 ; sur le témoin, code ${r2.code} avec ❌ GE-4 seul` }
}
