// --preuve-echecs de usine-pubs-qa (026-199) : la preuve que le juge JUGE. Quatre temps :
//   1. l'arbre sans fichiers (une racine vide fabriquée ici, jugée par le CLI lui-même) : UP-1 doit échouer, code 1 ; la preuve ne dépend pas de l'état
//      du dépôt (le jour où 026-200 livre ses fichiers, `verifier` de 026-199 reste vert : la preuve ne se périme pas toute seule) ;
//   2. le TÉMOIN (une référence conforme posée dans les fixtures, jamais déployée) : UP-1 à UP-10 doivent tous passer ;
//   3. des SABOTAGES du témoin, chacun posé dans une copie : le critère visé doit échouer (une faute plantée, un critère rouge) ;
//   4. --temoin : package.json identique à HEAD, npm run typecheck vert.
// Les sabotages du tourneur ne tournent que sous Linux : sur le poste, ils sont rejoués sur l'usine (usine-pubs-qa se relance) et leur compte rendu revient
// sur une ligne « @@UP-PREUVE {json} ». Rien n'est jamais modifié dans le dépôt : les sabotages sont dans des copies, effacées à la fin.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { DEPOT, LINUX, TRAVAIL, PREUVES, hasard, vider, court } from './commun.mjs'
import { creerSortie } from './sortie.mjs'
import { jouerFichiers, jouerUnites } from './parties/unites.mjs'
import { jouerRoutes } from './parties/routes.mjs'

const TEMOIN = path.join(DEPOT, 'scripts', 'fixtures', '026-usine-pubs', 'temoin')
const R = {
  travail: 'app/api/usine/pubs/travail/route.ts', depot: 'app/api/usine/pubs/depot/route.ts', rendu: 'app/api/usine/pubs/rendu/route.ts',
  lib: 'lib/pubs/usinePubs.ts', pubs: 'scripts/usine/pubs.mjs', service: 'scripts/usine/systemd/presti-pubs.service', timer: 'scripts/usine/systemd/presti-pubs.timer',
}
const L = 'if (agent.nom !== AGENT) return'

// Un sabotage : { nom, id (le critère qui doit échouer), fichier, remplacements: [[avant, apres]…], scenarios? (tourneur) }. Chaque `avant` doit figurer EXACTEMENT
// une fois dans le fichier : une ancre introuvable ou multiple est un échec de la preuve, jamais un sabotage « raté en silence ».
export const SABOTAGES = {
  routes: [
    { nom: 'le jeton de livreur_usine accepté', id: 'UP-2', fichier: R.travail, remplacements: [[L, "if (agent.nom !== AGENT && agent.nom !== 'livreur_usine') return"]] },
    { nom: 'le drapeau lu après la garde', id: 'UP-2', fichier: R.depot, remplacements: [["if (actif('busAgents') === false) return erreur(404, 'introuvable')\n  const agent = await authAgent(req)", "const agent = await authAgent(req)\n  if (actif('busAgents') === false) return erreur(404, 'introuvable')"]] },
    { nom: 'aucun battement de studio', id: 'UP-2', fichier: R.rendu, remplacements: [["  try { await ops_battement({ p_nom: agent.nom }) } catch { /* un battement manqué ne change pas le travail */ }\n", '']] },
    { nom: 'la pause générale ignorée', id: 'UP-2', fichier: R.travail, remplacements: [['  if ((await pauseGenerale()).active) return rien()\n', '']] },
    { nom: 'photos hors du dossier de l\'artisan signées', id: 'UP-3', fichier: R.lib, remplacements: [["m[1].startsWith(`${artisanId}/`) && !m[1].includes('..')", 'true']] },
    { nom: 'le courriel du client dans la réponse', id: 'UP-3', fichier: R.lib, remplacements: [["select('id, artisan_id, matiere, verifications').eq('etat', 'payee')", "select('id, artisan_id, matiere, verifications, email').eq('etat', 'payee')"], ['pack: { pack_id: l.id, matiere: l.matiere, site }', 'pack: { pack_id: l.id, matiere: l.matiere, site, email: l.email }']] },
    { nom: 'adresses de lecture de 3 600 s', id: 'UP-3', fichier: R.lib, remplacements: [['const SIGNATURE_LECTURE_S = 600', 'const SIGNATURE_LECTURE_S = 3600']] },
    { nom: 'aucun bail', id: 'UP-3', fichier: R.lib, remplacements: [['export const BAIL_S = 5400', 'export const BAIL_S = 0']] },
    { nom: 'l\'extrait garde adresses et numéros', id: 'UP-3', fichier: R.lib, remplacements: [[".replace(/[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+/g, '[adresse]').replace(/(?:\\+?\\d[\\d .-]{6,}\\d)/g, '[numéro]')", '']] },
    { nom: 'une marque en refus prise', id: 'UP-3', fichier: R.lib, remplacements: [['m.opposition === true || m.refus === true || ', '']] },
    { nom: 'un chemin hors de livraison/ admis', id: 'UP-4', fichier: R.lib, remplacements: [["if (!f.chemin.startsWith(prefixe) || vus.has(f.chemin)) return refus(400, 'chemin_invalide')", "if (vus.has(f.chemin)) return refus(400, 'chemin_invalide')"]] },
    { nom: 'aucune borne de taille', id: 'UP-4', fichier: R.lib, remplacements: [["if ((f.taille as number) > 60 * MO) return refus(400, 'fichier_trop_gros')", '']] },
    { nom: 'stockage à 99 % toléré', id: 'UP-4', fichier: R.lib, remplacements: [['if (mesure.data > GO * 0.6)', 'if (mesure.data > GO * 0.99)']] },
    { nom: 'stockage non mesurable toléré', id: 'UP-4', fichier: R.lib, remplacements: [["if (!mesure.ok || typeof mesure.data !== 'number' || !Number.isFinite(mesure.data) || mesure.data < 0) return refus(507, 'stockage')", '']] },
    { nom: 'le type n\'est pas vérifié', id: 'UP-4', fichier: R.lib, remplacements: [[" || TYPE_PACK[ext] !== f.type", '']] },
    { nom: 'l\'empreinte n\'est pas vérifiée', id: 'UP-5', fichier: R.lib, remplacements: [["if (createHash('sha256').update(octets).digest('hex') !== f.sha256) return 'empreinte_fausse'", '']] },
    { nom: 'les octets magiques ne sont pas vérifiés', id: 'UP-5', fichier: R.lib, remplacements: [["if (!magiques(f.chemin.split('.').pop() ?? '', octets)) return 'octets_magiques'", '']] },
    { nom: 'un juge non vert accepté', id: 'UP-5', fichier: R.lib, remplacements: [[" || j.code !== 0 ||", ' ||']] },
    { nom: 'les fichiers du pack ne sont pas relus', id: 'UP-5', fichier: R.lib, remplacements: [["    const raison = await relire(liste)\n    if (raison) return await echec(raison)\n    const maj", '    const maj']] },
    { nom: 'payee → fabriquee sans condition', id: 'UP-5', fichier: R.lib, remplacements: [["fichiers: liste } })\n      .eq('id', t.id).eq('etat', 'payee').select('id')", "fichiers: liste } })\n      .eq('id', t.id).select('id')"]] },
    { nom: 'le premier échantillon tranché sans Benj', id: 'UP-5', fichier: R.lib, remplacements: [['  if (premier) {', '  if (false) {']] },
    { nom: 'le lien d\'aperçu absent de la décision', id: 'UP-5', fichier: R.lib, remplacements: [["Aperçu (10 min) : ${lien.data?.signedUrl ?? 'indisponible'}", 'Aperçu indisponible']] },
    { nom: 'plus de reprise arrêtée au 3e échec', id: 'UP-5', fichier: R.lib, remplacements: [['    if (Number(v.usine_echecs ?? 0) >= ECHECS_MAX) continue // au 3e échec : plus de reprise automatique, le pack reste payee\n', '']] },
  ],
  unites: [
    { nom: 'User=usine', id: 'UP-10', fichier: R.service, remplacements: [['User=agents', 'User=usine']] },
    { nom: 'Nice=5', id: 'UP-10', fichier: R.service, remplacements: [['Nice=10', 'Nice=5']] },
    { nom: 'MemoryMax=8G', id: 'UP-10', fichier: R.service, remplacements: [['MemoryMax=4G', 'MemoryMax=8G']] },
    { nom: 'le jeton du livreur (UP-10, décision du 27/09)', id: 'UP-10', fichier: R.service, remplacements: [['avec-coffre.mjs PRESTI_JETON_STUDIO --', 'avec-coffre.mjs PRESTI_JETON_LIVREUR_USINE --']] },
    { nom: 'EnvironmentFile= : tout le coffre', id: 'UP-10', fichier: R.service, remplacements: [['MemoryMax=4G', 'MemoryMax=4G\nEnvironmentFile=/home/agents/.config/presti/agents.env']] },
    { nom: 'PRESTI_JETON_STUDIO absent de la liste fermée du coffre', id: 'UP-10', fichier: 'scripts/usine/coffre-regles.mjs', remplacements: [["['PRESTI_JETON_STUDIO', 'PRESTI_JETON_LIVREUR_USINE']", "['PRESTI_JETON_LIVREUR_USINE']"]] },
    { nom: 'Persistent=false', id: 'UP-10', fichier: R.timer, remplacements: [['Persistent=true', 'Persistent=false']] },
    { nom: 'toutes les 30 min', id: 'UP-10', fichier: R.timer, remplacements: [['OnCalendar=*:0/15', 'OnCalendar=*:0/30']] },
  ],
  tourneur: [
    { nom: 'le juge d\'un pack ignoré', id: 'UP-6', fichier: R.pubs, scenarios: ['pack-juge-rouge'], remplacements: [["const juge = lancer(process.execPath, ['scripts/pub-locale-qa.mjs', '--partie=complet', `--dossier=${dossier}`])\n  if (juge.code !== 0) throw new Echec('juge_rouge')", "const juge = lancer(process.execPath, ['scripts/pub-locale-qa.mjs', '--partie=complet', `--dossier=${dossier}`])"]] },
    { nom: 'la voix produite après la fabrication', id: 'UP-6', fichier: R.pubs, scenarios: ['pack'], remplacements: [["  if (matiere.voix === 'synthese') produireVoix(String(matiere.texte_voix ?? ''), dossier)\n  const f = lancer(process.execPath, ['scripts/pack-pub/fabriquer.mjs', dossier])\n  if (f.code !== 0) throw new Echec('fabrication_en_echec')", "  const f = lancer(process.execPath, ['scripts/pack-pub/fabriquer.mjs', dossier])\n  if (matiere.voix === 'synthese') produireVoix(String(matiere.texte_voix ?? ''), dossier)\n  if (f.code !== 0) throw new Echec('fabrication_en_echec')"]] },
    { nom: 'une autre voix que ff_siwis', id: 'UP-6', fichier: R.pubs, scenarios: ['pack'], remplacements: [["const VOIX = 'ff_siwis'", "const VOIX = 'af_heart'"]] },
    { nom: 'aucun verrou par travail', id: 'UP-6', fichier: R.pubs, scenarios: ['pack-verrou'], remplacements: [["fs.openSync(verrou, 'wx', 0o600)", "fs.openSync(verrou, 'w', 0o600)"]] },
    { nom: 'dossiers de travail en 0755', id: 'UP-6', fichier: R.pubs, scenarios: ['pack'], remplacements: [['const dossierPrive = (d) => { fs.mkdirSync(d, { recursive: true, mode: 0o700 }); fs.chmodSync(d, 0o700); return d }', 'const dossierPrive = (d) => { fs.mkdirSync(d, { recursive: true }); return d }']] },
    { nom: 'les photos laissées par adresse', id: 'UP-6', fichier: R.pubs, scenarios: ['pack'], remplacements: [['    delete matiere.photos[i].url\n', '']] },
    { nom: 'aucun rendu en échec', id: 'UP-6', fichier: R.pubs, scenarios: ['pack-juge-rouge'], remplacements: [["    if (raison !== 'bus_injoignable') await rendreEchec(id, raison)\n    else journal(`travail ${id} : bus injoignable au rendu, repris au passage suivant`)", "    journal(`travail ${id} : ${raison}`)"]] },
    { nom: 'des empreintes fausses au rendu', id: 'UP-6', fichier: R.pubs, scenarios: ['pack'], remplacements: [['sha256: sha256(fs.readFileSync(f.local)) }))', 'sha256: sha256(f.chemin) }))']] },
    { nom: 'la garde du Studio ignorée', id: 'UP-7', fichier: R.pubs, scenarios: ['studio-garde-3'], remplacements: [["  if (g.code !== 0) throw new Echec(g.code === 3 ? 'garde_refuse' : 'garde_en_echec')\n", ''], ["  if (!echantillon || !echantillon.startsWith(marque)) throw new Echec('garde_en_echec')\n", '']] },
    { nom: 'l\'accord de la marque envoyé au lanceur', id: 'UP-7', fichier: R.pubs, scenarios: ['studio'], remplacements: [['lecteur(SYSTEME, { page_produit: texte })', 'lecteur(SYSTEME, { page_produit: texte, accord: j.accord })']] },
    { nom: 'l\'extrait des allégations non contrôlé', id: 'UP-7', fichier: R.pubs, scenarios: ['studio-extrait-faux'], remplacements: [[' && normaliser(texte).includes(normaliser(a.extrait))', '']] },
    { nom: 'un présentateur virtuel accepté', id: 'UP-7', fichier: R.pubs, scenarios: ['studio-virtuel'], remplacements: [['script.presentateur_virtuel === false && ', '']] },
    { nom: 'robots.txt ignoré', id: 'UP-7', fichier: R.pubs, scenarios: ['studio-robots'], remplacements: [["  if (robots && robots.ok && /^\\s*disallow:\\s*\\/\\s*$/im.test(await robots.text())) throw new Echec('robots_interdit')\n", '']] },
    { nom: 'plus d\'une requête par seconde vers la marque', id: 'UP-7', fichier: R.pubs, scenarios: ['studio'], remplacements: [['const PAUSE_HOTE_MS = 1_050', 'const PAUSE_HOTE_MS = 0']] },
    { nom: 'le User-Agent du Lecteur oublié', id: 'UP-7', fichier: R.pubs, scenarios: ['studio'], remplacements: [["headers: { 'user-agent': UA_RECENSEUR }", "headers: { 'user-agent': 'node' }"]] },
    { nom: 'pub-qa ignoré avant le dépôt', id: 'UP-7', fichier: R.pubs, scenarios: ['studio-juge-rouge'], remplacements: [["const juge = lancer(process.execPath, ['scripts/pub-qa.mjs', echantillon])\n  if (juge.code !== 0) throw new Echec('juge_rouge')", "const juge = lancer(process.execPath, ['scripts/pub-qa.mjs', echantillon])"]] },
    { nom: 'un outil payant lancé', id: 'UP-7', fichier: R.pubs, scenarios: ['studio'], remplacements: [["  produireVoix(script.lignes.join(' '), echantillon)", "  lancer('elevenlabs', ['voix'])\n  produireVoix(script.lignes.join(' '), echantillon)"]] },
    { nom: 'le jeton dans le journal', id: 'UP-8', fichier: R.pubs, scenarios: ['pack'], remplacements: [['journal(`travail ${j.type} ${id}`)', 'journal(`travail ${j.type} ${id} ${jeton}`)']] },
    { nom: 'le jeton passé aux outils enfants', id: 'UP-8', fichier: R.pubs, scenarios: ['pack'], remplacements: [["for (const k of ['PATH', 'HOME', 'LANG', 'TZ', 'TMPDIR'])", "for (const k of ['PATH', 'HOME', 'LANG', 'TZ', 'TMPDIR', 'PRESTI_JETON_STUDIO'])"]] },
    { nom: 'le texte de la réponse affiché', id: 'UP-8', fichier: R.pubs, scenarios: ['studio'], remplacements: [['  const page = new URL(j.page_produit)', '  console.log(j.accord.extrait)\n  const page = new URL(j.page_produit)']] },
    { nom: 'le jeton envoyé à la marque', id: 'UP-8', fichier: R.pubs, scenarios: ['studio'], remplacements: [["headers: { 'user-agent': UA_RECENSEUR }", "headers: { 'user-agent': UA_RECENSEUR, authorization: `Bearer ${jeton}` }"]] },
    { nom: 'un fichier écrit hors des lieux permis', id: 'UP-8', fichier: R.pubs, scenarios: ['pack'], remplacements: [['async function passe() {\n', "async function passe() {\n  fs.writeFileSync(path.join(HOME, 'cache-pubs.json'), '{}')\n"]] },
    { nom: 'le dossier temporaire laissé plein', id: 'UP-8', fichier: R.pubs, scenarios: ['pack'], remplacements: [['async function passe() {\n', "async function passe() {\n  fs.writeFileSync(path.join(os.tmpdir(), 'passage.tmp'), 'x')\n"]] },
    { nom: 'une exception sur le bus injoignable', id: 'UP-9', fichier: R.pubs, scenarios: ['pack-bus-mort'], remplacements: [['  } catch { return null }\n}', '  } catch (e) { throw e }\n}'], ["try { await passe() } catch (e) { journal(`passe interrompue : ${e?.name ?? 'Error'}`) }", 'await passe()']] },
    { nom: 'hyperframes absent non reconnu', id: 'UP-9', fichier: R.pubs, scenarios: ['pack-sans-hyperframes'], remplacements: [["  if (r.error && r.error.code === 'ENOENT') throw new Echec('outil_absent')\n", '']] },
    { nom: 'le verrou jamais levé', id: 'UP-9', fichier: R.pubs, scenarios: ['pack-stockage-panne'], remplacements: [['  } finally { try { fs.rmSync(verrou, { force: true }) } catch { /* déjà parti */ } }', '  } finally { /* le verrou reste */ }']] },
  ],
}

function appliquer(copie, sab) {
  const f = path.join(copie, sab.fichier)
  let t = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
  for (const [avant, apres] of sab.remplacements) {
    const n = t.split(avant).length - 1
    if (n !== 1) return `ancre ${n === 0 ? 'introuvable' : `trouvée ${n} fois`} : « ${court(avant, 70)} »`
    t = t.split(avant).join(apres) // pas de String.replace : un « $' » du texte serait interprété
  }
  fs.writeFileSync(f, t)
  return null
}

const silencieux = (ids) => creerSortie('usine-pubs-qa', ids, { ecrire: () => {} })

/** Joue les sabotages d'une famille ; `limite` : combien en parallèle. */
async function jouerSabotages(famille, jouer, limite) {
  const essais = []
  const liste = SABOTAGES[famille]
  for (let i = 0; i < liste.length; i += limite) {
    const lot = await Promise.all(liste.slice(i, i + limite).map(async (sab, k) => {
      const copie = path.join(TRAVAIL, `sabotage-${famille}-${i + k}-${hasard(5)}`)
      fs.rmSync(copie, { recursive: true, force: true })
      fs.cpSync(TEMOIN, copie, { recursive: true })
      try {
        const e = appliquer(copie, sab)
        if (e) return { nom: sab.nom, id: sab.id, ok: false, detail: e, ligne: '' }
        const s = silencieux(['UP-1', 'UP-2', 'UP-3', 'UP-4', 'UP-5', 'UP-6', 'UP-7', 'UP-8', 'UP-9', 'UP-10'])
        await jouer(copie, s, sab)
        const ligne = s.lignes().find((l) => l.startsWith(`FAIL ${sab.id} `)) ?? ''
        const autres = ['UP-2', 'UP-3', 'UP-4', 'UP-5', 'UP-6', 'UP-7', 'UP-8', 'UP-9', 'UP-10'].filter((x) => x !== sab.id && s.enEchec(x) && s.evalue(x))
        return { nom: sab.nom, id: sab.id, ok: !!ligne, detail: ligne ? court(ligne.replace(/^FAIL \S+ — /, ''), 170) : `${sab.id} reste vert : la faute n'est pas vue`, ligne, autres }
      } catch (e) { return { nom: sab.nom, id: sab.id, ok: false, detail: `exception : ${court(e?.message, 120)}`, ligne: '' } }
      finally { fs.rmSync(copie, { recursive: true, force: true }) }
    }))
    essais.push(...lot)
  }
  return essais
}

/** Les preuves du tourneur (Linux) : le témoin complet, puis chaque sabotage sur ses seuls scénarios. */
export async function preuvesTourneur() {
  const { jouerTourneur } = await import('./parties/tourneur.mjs')
  const essais = []
  const s = silencieux(['UP-6', 'UP-7', 'UP-8', 'UP-9'])
  await jouerTourneur({ racine: TEMOIN, s })
  for (const id of ['UP-6', 'UP-7', 'UP-8', 'UP-9']) { const l = s.lignes().find((x) => x.includes(` ${id} `)); essais.push({ nom: `témoin du tourneur ${id}`, id, ok: !!l && l.startsWith('PASS'), detail: l ? court(l.replace(/^(PASS|FAIL) \S+ — /, ''), 160) : 'non évalué', temoin: true }) }
  const sab = await jouerSabotages('tourneur', async (copie, so, sabotage) => { await jouerTourneur({ racine: copie, s: so, ids: [sabotage.id], scenarios: sabotage.scenarios }) }, 2)
  return [...essais, ...sab]
}

export async function jouerPreuveEchecs({ parties, nom, moi, nonRegression, surUsine }) {
  const seulTourneur = Array.isArray(parties) && parties.length === 1 && parties[0] === 'tourneur'
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const essais = [], journaux = []
  const sortirTourneur = (liste) => { for (const e of liste) essais.push(e) }

  if (seulTourneur) {
    // le mode de l'usine : seulement le tourneur ; le compte rendu revient sur une ligne lisible par la machine
    if (!LINUX) { console.error(`✗ ${nom} : le tourneur ne se juge que sous Linux`); return 2 }
    const liste = await preuvesTourneur()
    for (const e of liste) console.log(`${e.ok ? 'PASS' : 'FAIL'} AUTO-${e.nom} — ${e.id} ${e.detail}`)
    console.log(`@@UP-PREUVE ${JSON.stringify(liste)}`)
    const ok = liste.every((e) => e.ok)
    console.log(`${nom} --preuve-echecs --partie=tourneur : ${ok ? 'PASS' : 'FAIL'}`)
    return ok ? 0 : 1
  }

  // 1. l'arbre sans fichiers : une racine vide, jugée par le CLI lui-même
  const vide = vider(path.join(TRAVAIL, `arbre-vide-${hasard(5)}`))
  try {
    const r = spawnSync(process.execPath, [moi, `--racine=${vide}`, '--partie=routes,unites'], { cwd: DEPOT, encoding: 'utf8', windowsHide: true, timeout: 120_000 })
    essais.push({ nom: 'arbre sans fichiers', id: 'UP-1', ok: r.status === 1 && /^FAIL UP-1 — /m.test(r.stdout) && r.stdout.includes(`${nom} : FAIL — UP-1`), detail: r.stdout.trim().split(/\r?\n/).filter((l) => /^FAIL UP-1|: FAIL/.test(l)).join(' | ') })
    journaux.push(`=== arbre sans fichiers ===\n${r.stdout}${r.stderr}`)
  } finally { fs.rmSync(vide, { recursive: true, force: true }) }
  const s0 = silencieux(['UP-1'])
  const livre = jouerFichiers({ racine: DEPOT, s: s0 })
  journaux.push(`courant : ${livre ? 'les sept fichiers de 026-200 sont livrés — information non bloquante (le scénario « avant 026-200 » est jugé par « arbre sans fichiers »)' : s0.lignes()[0]}`)

  // 2. le témoin : les critères locaux (routes, unités) passent
  const st = silencieux(['UP-1', 'UP-2', 'UP-3', 'UP-4', 'UP-5', 'UP-10'])
  jouerFichiers({ racine: TEMOIN, s: st }); jouerUnites({ racine: TEMOIN, s: st }); await jouerRoutes({ racine: TEMOIN, s: st })
  for (const id of ['UP-1', 'UP-2', 'UP-3', 'UP-4', 'UP-5', 'UP-10']) { const l = st.lignes().find((x) => x.includes(` ${id} `)); essais.push({ nom: `témoin ${id}`, id, ok: !!l && l.startsWith('PASS'), detail: l ? court(l.replace(/^(PASS|FAIL) \S+ — /, ''), 150) : 'non évalué', temoin: true }) }
  journaux.push(`=== témoin ===\n${st.lignes().join('\n')}`)

  // 3. les sabotages des routes et des unités (ici), du tourneur (Linux : ici ; sinon, sur l'usine)
  const sr = await jouerSabotages('routes', async (copie, s, sab) => { jouerFichiers({ racine: copie, s }); await jouerRoutes({ racine: copie, s, ids: [sab.id] }) }, 3)
  const su = await jouerSabotages('unites', async (copie, s) => { jouerFichiers({ racine: copie, s }); jouerUnites({ racine: copie, s }) }, 4)
  sortirTourneur(sr); sortirTourneur(su)
  const ids = (parties ?? ['routes', 'tourneur', 'unites'])
  if (ids.includes('tourneur')) {
    if (LINUX) sortirTourneur(await preuvesTourneur())
    else {
      const u = surUsine(['--preuve-echecs', '--partie=tourneur'])
      journaux.push(`=== tourneur (usine) ===\n${u.brut}`)
      if (!u.preuve) { console.error(`✗ ${nom} : usine injoignable ou preuve du tourneur non rendue (code ${u.code}) : ${u.erreur || court(u.brut, 200)}`); return 2 }
      sortirTourneur(u.preuve.map((e) => ({ ...e, usine: true })))
    }
  }
  // 4. la non-régression
  const n = nonRegression(DEPOT)
  essais.push({ nom: 'non-régression (--temoin)', id: 'NR', ok: n.ok, detail: n.detail })
  journaux.push(`=== non-régression ===\n${n.brut ?? n.detail}`)

  for (const e of essais) console.log(`${e.ok ? 'PASS' : 'FAIL'} AUTO-${e.nom} — ${e.id} ${e.detail ?? ''}`)
  const ok = essais.every((e) => e.ok)
  // la part d'echecs-attendus.md (jamais écrite depuis l'usine : le bac n'est pas le dépôt)
  if (process.env.USINE_EXECUTER_RUN === undefined && !LINUX) {
    fs.mkdirSync(PREUVES, { recursive: true })
    fs.writeFileSync(path.join(PREUVES, 'UP-resultats.json'), `${JSON.stringify(essais, null, 2)}\n`)
    fs.writeFileSync(path.join(PREUVES, 'UP-contrepreuves-brutes.log'), journaux.join('\n\n'))
    const lignes = essais.map((e) => `- ${e.ok ? 'PASS' : 'FAIL'} ${e.nom} (${e.id}) : ${e.detail ?? ''}${e.usine ? ' [rejoué sur l\'usine]' : ''}`)
    fs.writeFileSync(path.join(PREUVES, 'UP-echecs-attendus.md'), `# usine-pubs-qa — preuves du juge\n\nUn critère « attendu en échec » est un critère que le juge DOIT mettre au rouge sur la faute plantée dans une copie du témoin ; « témoin » : le critère passe sur la référence conforme. Une ligne PASS = le juge a vu ce qu'il devait voir.\n\n${lignes.join('\n')}\n\nFaux Supabase, faux Presti, faux stockage et faux site de marque sur 127.0.0.1 ; aucune clé réelle, aucun appel public. UP-R (--reel) se joue en 026-202, hors de ce juge.\n`)
  }
  console.log(`${nom} --preuve-echecs : ${ok ? 'PASS' : 'FAIL'}`)
  return ok ? 0 : 1
}
