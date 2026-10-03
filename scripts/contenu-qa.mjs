#!/usr/bin/env node
// scripts/contenu-qa.mjs — le juge du domaine « réseaux » (fiche 026-204, écrit par Claude Code AVANT la production
// qu'il juge : lib/contenu/**, scripts/contenu/**, supabase/migrations/*_contenu.sql, docs/marketing/**,
// public/contenu/gabarits/**, tous encore à livrer par 026-205 à 026-218). Treize parties, chacune la garde d'une
// fiche de production précise :
//
//   connaissance (026-205, CN)  mémoire marketing et cinq lignes éditoriales — docs/marketing/**, L1..L5 complètes
//   sql          (026-206, SQ)  schéma contenu — supabase/migrations/*_contenu.sql : tables, statut fermé, RLS
//   lignes       (026-207, LN)  garde des lignes et pont avec le Crieur — lib/contenu/lignes.ts
//   gabarits     (026-208, GA)  cinq gabarits vidéo — public/contenu/gabarits/*.json (forme, licence, verticalité)
//   fabrication  (026-209, FA)  fabrique de vidéos — scripts/contenu/fabriquer.mjs
//   tiktok       (026-210, TT)  publication TikTok avec accord par vidéo — scripts/contenu/publier-tiktok.mjs
//   profil-tiktok(026-211, PT)  conversion de @vibecode.clips — docs/marketing/profil-tiktok.md (geste de Benj)
//   meta         (026-212, MP)  Reels Instagram / vidéos Facebook par Graph — lib/contenu/metaPublier.ts
//   mesure       (026-213, ME)  mesure par publication et attribution prudente — lib/contenu/mesure.ts
//   boucle       (026-214, BO)  boucle d'apprentissage et score de republication — lib/contenu/boucle.ts, brief.ts
//   veille       (026-215, VE)  veille des tendances et labo des accroches — scripts/contenu/veille.mjs, accroches.ts
//   geste        (026-217, GE)  geste d'accord de Benj sur chaque publication — lib/contenu/accord.ts
//   couts        (026-218, CO)  relevé des jetons par agent et par IA — lib/contenu/couts.ts
//
// Décision du 30/09 : LN/MP/GE vérifient l'automatisme sans accord individuel,
// sous pause fail-closed, opposition et coût explicitement nul. Les clauses des autres
// parties hors de ce lot doivent être alignées séparément. Toute affirmation chiffrée passe par `vraisemblance()` (jev noul,
// lib/agents/llm.ts, déjà PASS) — score < 0,5, source absente ou Laya indisponible bloquent, ne serait-ce qu'une
// fois, jamais un passage automatique. Le code jugé n'est JAMAIS réimplémenté ici : chaque critère de code appelle,
// dans un enfant Node isolé (scripts/fixtures/contenu/lib/{executer,executer-meta,executer-exports}.mjs, via
// ts-loader.mjs pour résoudre `@/lib/agents/llm`), la fonction réelle du module jugé — jamais une copie de sa
// logique. Le faux `jev` (scripts/fixtures/contenu/lib/faux-jev.mjs) répond pour de vrai en sous-processus, sans
// double du lanceur `lib/agents/llm.ts` ; le module réel, déjà PASS, choisit lui-même le provider (« laya »
// uniquement, jamais un repli hébergé).
//
// Usage :
//   node scripts/contenu-qa.mjs --partie=<liste virgule parmi les 13 ci-dessus> [--racine=<dossier> | --temoin]
//
//   (sans --racine ni --temoin) juge la racine réelle du dépôt : tant qu'une fiche de production n'a pas livré son
//     module, chaque critère qui en dépend est SAUTÉ (« ➖ », non jugé — un préalable extérieur documenté, jamais un
//     défaut de CE juge) ; un module déjà livré est jugé pour de vrai, avec les mêmes critères que --temoin.
//   --temoin   juge scripts/fixtures/contenu/temoin/ (le témoin de cette fiche, jamais copié en production) : preuve
//     que ce juge sait rendre vert un comportement correct — c'est ce que juges-026-reseaux-preuve.mjs vérifie.
//   --racine=<dossier>  juge une racine explicite (un témoin copié puis muté : 026-219 y prouve chaque mutation).
//
// Sortie : une ligne par critère (« ✅ <ID> — <nom> : <résumé> » vert, « ❌ … — <faute 1> | <faute 2> » rouge,
// « ➖ … » sauté), puis « contenu-qa --partie=<p> : PASS|FAIL|SAUTE » par partie, puis « contenu-qa : PASS|FAIL|SAUTE ».
// Code 0 si tout est vert, 1 si au moins une faute réelle (l'emporte toujours), 2 si rien n'est en faute mais qu'au
// moins un préalable extérieur manque (appel invalide : aussi 2). N'écrit que sous .orchestre/travail/contenu-qa/ ;
// aucun secret, aucun réseau réel, aucun compte réel.
import fs from 'node:fs'
import path from 'node:path'
import {
  DEPOT, TEMOIN, existe, estDossier, lire, lireJsonSi, racineDe, retirerJonctions,
  appelerFonction, appelerMeta, appelerExports, depuisAppel, envJev,
  ok, fail, nonJuge, fusionEtats,
} from './fixtures/contenu/lib/commun.mjs'

const JUGE = 'contenu-qa'

// Les scénarios positifs gardent la vraie porte de sortie : seule la lecture
// d'interrupteur est inactive dans les enfants. Une pause coupe le vrai faux-jev.
async function pauseContenu(ctx, partie) {
  const post={id:'pause-post',ligne:'L1',canal:'instagram',texte:'10 clients',legende:'20 devis',source:'preuve-essai'}
  const cas={
    lignes:[['lib/contenu/lignes','verdictPublication',[post,{id:'L1',canaux:['instagram']}],true]],
    geste:[['lib/contenu/accord','controlerPublicationAutomatique',[post,{id:'L1',canaux:['instagram']}],true]],
    mesure:[['lib/contenu/mesure','verdictFormulePublique',['10 clients','preuve-essai',false],false]],
    boucle:[['lib/contenu/boucle','recommander',[{id:'pause-post',texte:'contenu public',provenance:'preuve',mesures:[{fenetre:'J+7',disponible:true,valeur:1200}]}],false]],
    veille:[['lib/contenu/accroches','classerAccroche',['Accroche ambiguë'],false],['lib/contenu/accroches','scoreIdee',['idée','source','jour'],false]],
    meta:[['lib/contenu/metaPublier','controlerAvantPublication',[{...post,bucket:'prive-026',cle:'v.mp4'},{bucketAttendu:'prive-026',decision:null,ligneAccordee:true}],true]],
  }[partie]
  const echecs=[]
  for(const [moduleRel,fonction,args,boucle] of cas){
    const jouer=pauseScenario=>appelerFonction({racineEff:ctx.racineEff,moduleRel,fonction,args,env:envJev({reponse:{p:0.9,niveau:4,distribution:{},choix:'question'}}),extra:{pauseScenario}})
    const positif=await jouer('inactive')
    if(!positif.ok||positif.erreurImport||positif.exception||!positif.appelsCout?.length)echecs.push(`${fonction} : voie active non démontrée`)
    for(const scenario of ['active','doute','throw']){
      const r=await jouer(scenario)
      if(!r.ok||r.erreurImport||r.exception||r.appelsCout?.length!==0||!(r.pausesLues>0))echecs.push(`${fonction} : ${scenario} ne coupe pas le modèle`)
    }
    if(boucle){const r=await jouer('apres-premier-modele');if(!r.ok||r.exception||r.appelsCout?.length!==1||r.pausesLues<2)echecs.push(`${fonction} : pause entre textes ne coupe pas le deuxième appel`)}
  }
  if(partie==='meta'){
    for(const extra of [{coutEuros:null},{coutEuros:'0'},{coutEuros:1},{opposition:true}]){
      const r=await appelerMeta({racineEff:ctx.racineEff,variante:VARIANTE_OK,ctx:{bucketAttendu:'prive-026'},extra})
      if(!r.ok||r.exception||r.valeur?.ok!==false||r.appelsReseau?.creerConteneur!==0||r.appelsReseau?.publier!==0)echecs.push('coût inconnu/non nul ou opposition : Graph appelé')
    }
    for(const [pauseScenario,reseauScenario,creer] of [['active','ok',0],['inactive','pause-apres-conteneur',1]]){
      const r=await appelerMeta({racineEff:ctx.racineEff,variante:VARIANTE_OK,ctx:{bucketAttendu:'prive-026',decision:DECISION_OK,ligneAccordee:true},pauseScenario,reseauScenario})
      if(!r.ok||r.exception||r.valeur?.ok!==false||r.appelsReseau?.creerConteneur!==creer||r.appelsReseau?.publier!==0)echecs.push('Graph : pause avant/après conteneur laisse publier')
    }
  }
  return echecs.length?fail(echecs,'pause contenu'):ok('pause active/doute/panne : zéro modèle ; voies positives actives ; relecture entre étapes')
}

// ── options ──────────────────────────────────────────────────────────────────────────────────────────────────────
function lireOptions(argv, { connues }) {
  const valeurs = {}, drapeaux = new Set(), inconnues = [], positionnels = []
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eg = a.indexOf('=')
      const cle = eg === -1 ? a.slice(2) : a.slice(2, eg)
      if (!connues.includes(cle)) { inconnues.push(a); continue }
      if (eg === -1) drapeaux.add(cle); else valeurs[cle] = a.slice(eg + 1)
    } else positionnels.push(a)
  }
  return { valeurs, drapeaux, inconnues, positionnels }
}

// ── connaissance (026-205, CN) — docs/marketing/** et les cinq lignes éditoriales ──────────────────────────────────
const DOSSIERS_DOC = ['accroches', 'audience', 'communaute', 'lignes', 'mesure', 'offre', 'plateformes', 'voix']
function cn1(ctx) {
  const base = path.join(ctx.racineEff, 'docs/marketing')
  if (!existe(base)) return nonJuge('docs/marketing')
  const echecs = []
  for (const d of DOSSIERS_DOC) {
    const p = path.join(base, d, 'README.md')
    if (!existe(p)) { echecs.push(`docs/marketing/${d}/README.md absent`); continue }
    if (lire(p).trim().length < 20) echecs.push(`docs/marketing/${d}/README.md quasi vide`)
  }
  return echecs.length ? fail(echecs, 'mémoire marketing incomplète') : ok(`${DOSSIERS_DOC.length} dossiers documentés`)
}
function cn2(ctx) {
  const p = path.join(ctx.racineEff, 'docs/marketing/lignes/README.md')
  if (!existe(p)) return nonJuge('docs/marketing/lignes/README.md')
  const texte = lire(p)
  const champs = ['gabarit', 'canaux', 'fait', 'cadence', 'plafond', 'appel_action', 'mention']
  const echecs = []
  for (const id of ['L1', 'L2', 'L3', 'L4', 'L5']) {
    const m = texte.match(new RegExp(`##\\s*${id}\\b([\\s\\S]*?)(?=\\n##\\s|$)`))
    if (!m) { echecs.push(`${id} absente`); continue }
    for (const c of champs) if (!new RegExp(`\\b${c}\\s*:`).test(m[1])) echecs.push(`${id} : champ « ${c} » manquant`)
  }
  return echecs.length ? fail(echecs, 'lignes éditoriales incomplètes') : ok('L1..L5 complètes (7 champs chacune)')
}
function cn3(ctx) {
  const p = path.join(ctx.racineEff, 'docs/marketing/lignes/README.md')
  if (!existe(p)) return nonJuge('docs/marketing/lignes/README.md')
  const refs = [...lire(p).matchAll(/fait:\s*([^\s#]+)(?:#\S+)?/g)].map((m) => m[1])
  if (!refs.length) return nonJuge('aucune référence « fait: » dans docs/marketing/lignes/README.md')
  const echecs = refs.filter((r) => !existe(path.join(ctx.racineEff, r))).map((r) => `« ${r} » cité mais absent du dépôt`)
  return echecs.length ? fail(echecs, 'référence inventée') : ok(`${refs.length} référence(s) « fait: » vérifiée(s)`)
}
function cn4(ctx) {
  const p = path.join(ctx.racineEff, 'docs/marketing/plateformes/README.md')
  if (!existe(p)) return nonJuge('docs/marketing/plateformes/README.md')
  const texte = lire(p)
  const echecs = []
  if (!/CC BY-SA/i.test(texte) || !/interdit/i.test(texte)) echecs.push('interdiction CC BY-SA en vidéo absente')
  if (!/mention IA/i.test(texte)) echecs.push('mention IA obligatoire (voix de synthèse) absente')
  return echecs.length ? fail(echecs, 'règles par plateforme incomplètes') : ok('CC BY-SA interdite en vidéo, mention IA exigée')
}

// ── sql (026-206, SQ) — supabase/migrations/*_contenu.sql (jamais appliquée par CE juge) ───────────────────────────
function sqlTexte(ctx) {
  const dir = path.join(ctx.racineEff, 'supabase/migrations')
  if (!existe(dir)) return null
  const f = fs.readdirSync(dir).find((n) => /^\d+_contenu\.sql$/.test(n)) // pas ..._site_contenu.sql (0020, un domaine distinct)
  return f ? { nom: f, texte: lire(path.join(dir, f)) } : null
}
function sq1(ctx) { return sqlTexte(ctx) ? ok(`migration trouvée : ${sqlTexte(ctx).nom}`) : nonJuge('supabase/migrations/*_contenu.sql') }
function sq2(ctx) {
  const m = sqlTexte(ctx); if (!m) return nonJuge('supabase/migrations/*_contenu.sql')
  const tables = ['contenu_lignes', 'contenu_posts', 'contenu_mesures', 'contenu_idees']
  const manquantes = tables.filter((t) => !new RegExp(`create table[^;]*\\b${t}\\b`, 'i').test(m.texte))
  return manquantes.length ? fail(manquantes.map((t) => `table ${t} absente`), 'schéma incomplet') : ok('4 tables créées')
}
function sq3(ctx) {
  const m = sqlTexte(ctx); if (!m) return nonJuge('supabase/migrations/*_contenu.sql')
  const echecs = []
  const bloc = m.texte.match(/statut[\s\S]{0,30}check\s*\(\s*statut\s+in\s*\(([^)]*)\)\)/i)
  if (!bloc) echecs.push('contrainte de statut absente')
  else for (const s of ['brouillon', 'en_attente', 'publiable', 'publie', 'refuse']) if (!bloc[1].includes(s)) echecs.push(`statut « ${s} » absent de la contrainte`)
  if (!/accord_decision_id\s+is\s+not\s+null/i.test(m.texte)) echecs.push('accord_decision_id non exigé pour publiable/publie')
  return echecs.length ? fail(echecs, 'garde du statut incomplète') : ok('statut fermé, accord exigé pour publiable/publie')
}
function sq4(ctx) {
  const m = sqlTexte(ctx); if (!m) return nonJuge('supabase/migrations/*_contenu.sql')
  const echecs = []
  for (const t of ['contenu_lignes', 'contenu_posts', 'contenu_mesures', 'contenu_idees']) {
    if (!new RegExp(`alter table[^;]*\\b${t}\\b[^;]*enable row level security`, 'i').test(m.texte)) echecs.push(`RLS absente sur ${t}`)
  }
  if (!/revoke all[\s\S]*from[\s\S]*anon/i.test(m.texte)) echecs.push('revoke all ... from anon absent')
  if (/grant\s+(insert|update|delete|all)\s+on/i.test(m.texte)) echecs.push('une écriture publique est accordée (grant insert/update/delete/all)')
  return echecs.length ? fail(echecs, 'sécurité SQL incomplète') : ok('RLS active, lecture seule pour anon/authenticated')
}

// ── geste (026-217, GE) — lib/contenu/accord.ts ─────────────────────────────────────────────────────────────────
async function ge1(ctx) {
  const r=await appelerFonction({racineEff:ctx.racineEff,moduleRel:'lib/contenu/accord',fonction:'controlerPublicationAutomatique',args:[{id:'p1',ligne:'L1',canal:'instagram',texte:'Voir la démo'},{id:'L1',canaux:['instagram']} ]})
  return depuisAppel(r,'lib/contenu/accord',v=>v?.ok===true?ok('sans décision individuelle, contrôles automatiques validés'):fail(['publication conforme bloquée par un accord individuel'],'GE-1'))
}
async function ge2(ctx) {
  const echecs=[]
  for(const extra of [{coutEuros:null},{coutEuros:1},{opposition:true}]){
    const r=await appelerFonction({racineEff:ctx.racineEff,moduleRel:'lib/contenu/accord',fonction:'controlerPublicationAutomatique',args:[{id:'p1',ligne:'L1',canal:'instagram',texte:'Voir la démo'},{id:'L1',canaux:['instagram']}],extra})
    if(!r.ok||r.exception||r.valeur?.ok!==false)echecs.push('coût inconnu/positif ou opposition accepté')
  }
  return echecs.length?fail(echecs,'GE-2'):ok('coût inconnu/positif et opposition refusés automatiquement')
}
async function ge3(ctx) {
  const args=[{id:'p1',ligne:'L1',canal:'instagram',texte:'10 clients',source:'preuve'}, {id:'L1',canaux:['instagram']}]
  const bon=await appelerFonction({racineEff:ctx.racineEff,moduleRel:'lib/contenu/accord',fonction:'controlerPublicationAutomatique',args,env:envJev({reponse:{p:0.9}})})
  const mauvais=await appelerFonction({racineEff:ctx.racineEff,moduleRel:'lib/contenu/accord',fonction:'controlerPublicationAutomatique',args,env:envJev({reponse:{p:0.1}})})
  return fusionEtats(depuisAppel(bon,'lib/contenu/accord',v=>v?.ok===true?ok('texte exact contrôlé automatiquement'):fail(['score bon refusé'],'GE-3')),depuisAppel(mauvais,'lib/contenu/accord',v=>v?.ok===false?ok('texte retouché rechiffre contrôlé et refusé'):fail(['score faible accepté'],'GE-3')))
}

// ── lignes (026-207, LN) — lib/contenu/lignes.ts ────────────────────────────────────────────────────────────────
// Chaque cas porte, quand la fiche jugée le permet, un ACCORD DÉJÀ VALIDE (même id, même texte) : verdictPublication
// enchaîne suspendue → canal → quota → chiffre → accord, et un accord manquant refuserait de toute façon TOUT cas
// qui ne va pas jusqu'au bout — une sabotage du seul gate visé (ex. quota) resterait alors invisible, masquée par
// le refus (correct mais hors-sujet) sur l'accord absent. LN-1/LN-2 n'ont pas besoin de cette précaution : rien
// après leur gate (canal indéterminé, pas de chiffre, pas d'accord) n'empêcherait la publication si LEUR gate à
// elles était sabordé — sauf l'accord, ajouté ici aussi pour la même raison.
const appelLignes = (ctx, post, ligne, env) => appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/lignes', fonction: 'verdictPublication', args: [post, ligne], env })
const ACCORD_P1 = (texte) => ({ statut: 'tranchee', choix: 'accorder', cible: 'p1', texte_version: texte })
async function ln1(ctx) {
  const r = await appelLignes(ctx, { id: 'p1', ligne: 'L1', canal: 'tiktok', texte: 'Voir la démo', decision: ACCORD_P1('Voir la démo') }, { id: 'L1', suspendue: true, canaux: ['tiktok'] })
  return depuisAppel(r, 'lib/contenu/lignes', (v) => (v?.decision === 'refuser' ? ok('ligne suspendue refusée') : fail([`décision « ${v?.decision} » (attendu refuser)`], 'LN-1')))
}
async function ln2(ctx) {
  const r = await appelLignes(ctx, { id: 'p1', ligne: 'L1', canal: 'facebook', texte: 'Voir la démo', decision: ACCORD_P1('Voir la démo') }, { id: 'L1', suspendue: false, canaux: ['tiktok', 'instagram'] })
  return depuisAppel(r, 'lib/contenu/lignes', (v) => (v?.decision === 'refuser' ? ok('canal non permis refusé') : fail(['canal non permis accepté'], 'LN-2')))
}
async function ln3(ctx) {
  const r = await appelLignes(ctx, { id: 'p1', ligne: 'L1', canal: 'tiktok', texte: 'Voir la démo', decision: ACCORD_P1('Voir la démo') }, { id: 'L1', suspendue: false, canaux: ['tiktok'], quotaJour: 2, publieAujourdhui: 2 })
  return depuisAppel(r, 'lib/contenu/lignes', (v) => (v?.decision === 'refuser' ? ok('plafond du jour refusé') : fail(['plafond du jour dépassé accepté'], 'LN-3')))
}
async function ln4(ctx) {
  const r = await appelLignes(ctx, { id: 'p1', ligne: 'L1', canal: 'tiktok', texte: 'Devis en 24h', source: 'mesure.md', decision: ACCORD_P1('Devis en 24h') }, { id: 'L1', suspendue: false, canaux: ['tiktok'] }, envJev({ reponse: { p: 0.1 } }))
  return depuisAppel(r, 'lib/contenu/lignes', (v) => (v?.decision === 'refuser' ? ok('affirmation chiffrée sous le seuil refusée') : fail(['affirmation chiffrée sous le seuil acceptée'], 'LN-4')))
}
async function ln5(ctx) {
  const post = { id: 'p1', ligne: 'L1', canal: 'tiktok', texte: 'Voir la démo', origine: 'crieur_posts', crieurStatut: 'brouillon_publora', decision: { statut: 'tranchee', choix: 'accorder', cible: 'p1', texte_version: 'Voir la démo' } }
  const r = await appelLignes(ctx, post, { id: 'L1', suspendue: false, canaux: ['tiktok'] })
  return depuisAppel(r, 'lib/contenu/lignes', (v) => (v?.decision === 'refuser' ? ok('brouillon Publora du Crieur toujours refusé') : fail(['brouillon Publora publié par ce chemin'], 'LN-5')))
}
async function ln6(ctx) {
  const ligne = { id: 'L1', suspendue: false, canaux: ['tiktok'] }
  const sansAccord = await appelLignes(ctx, { id: 'p1', ligne: 'L1', canal: 'tiktok', texte: 'Voir la démo' }, ligne)
  const avecAccord = await appelLignes(ctx, { id: 'p1', ligne: 'L1', canal: 'tiktok', texte: 'Voir la démo', decision: { statut: 'tranchee', choix: 'accorder', cible: 'p1', texte_version: 'Voir la démo' } }, ligne)
  return fusionEtats(
    depuisAppel(sansAccord, 'lib/contenu/lignes', (v) => (v?.decision === 'publier' ? ok('publication conforme sans accord individuel') : fail(['accord individuel encore exigé'], 'LN-6'))),
    depuisAppel(avecAccord, 'lib/contenu/lignes', (v) => (v?.decision === 'publier' ? ok('accord valide accepté') : fail([`décision « ${v?.decision} » malgré un accord valide`], 'LN-6'))),
  )
}

// ── gabarits (026-208, GA) — public/contenu/gabarits/*.json ────────────────────────────────────────────────────
function gabaritsPresents(ctx) {
  const dir = path.join(ctx.racineEff, 'public/contenu/gabarits')
  if (!existe(dir)) return null
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
}
function ga1(ctx) {
  const fichiers = gabaritsPresents(ctx)
  if (fichiers === null) return nonJuge('public/contenu/gabarits')
  if (!fichiers.length) return nonJuge('public/contenu/gabarits/*.json')
  const champs = ['ligne', 'type', 'format', 'duree_s', 'sous_titres_incrustes', 'coupes_par_10s', 'audio']
  const echecs = []
  for (const f of fichiers) {
    const j = lireJsonSi(path.join(ctx.racineEff, 'public/contenu/gabarits', f))
    if (j === null || j === undefined) { echecs.push(`${f} : JSON invalide`); continue }
    for (const c of champs) if (!(c in j)) echecs.push(`${f} : champ « ${c} » manquant`)
    if (j.format !== '1080x1920') echecs.push(`${f} : format « ${j.format} » (attendu 1080x1920, vertical)`)
  }
  return echecs.length ? fail(echecs, 'gabarits mal formés') : ok(`${fichiers.length} gabarit(s) conforme(s)`)
}
function ga2(ctx) {
  const fichiers = gabaritsPresents(ctx)
  if (!fichiers || !fichiers.length) return nonJuge('public/contenu/gabarits/*.json')
  const echecs = []
  for (const f of fichiers) {
    const j = lireJsonSi(path.join(ctx.racineEff, 'public/contenu/gabarits', f))
    if (!j) continue
    if (j.audio?.licence_commerciale !== true) echecs.push(`${f} : licence commerciale non garantie`)
    if (!j.audio?.credit) echecs.push(`${f} : crédit audio absent`)
  }
  return echecs.length ? fail(echecs, 'licence audio incomplète') : ok('licence commerciale et crédit sur chaque gabarit')
}
function ga3(ctx) {
  const fichiers = gabaritsPresents(ctx)
  if (!fichiers || !fichiers.length) return nonJuge('public/contenu/gabarits/*.json')
  const echecs = []
  for (const f of fichiers) {
    const j = lireJsonSi(path.join(ctx.racineEff, 'public/contenu/gabarits', f))
    if (j && j.type !== 'hyperframes') echecs.push(`${f} : type « ${j.type} » (attendu hyperframes)`)
  }
  return echecs.length ? fail(echecs, 'type de gabarit incohérent') : ok('type hyperframes sur chaque gabarit')
}

// ── fabrication (026-209, FA) — scripts/contenu/fabriquer.mjs ──────────────────────────────────────────────────
const M_FAB = 'scripts/contenu/fabriquer'
async function fa1(ctx) {
  const r1 = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_FAB, fonction: 'verdictEntree', args: [{}, { suspendue: true }, []] })
  const r2 = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_FAB, fonction: 'verdictEntree', args: [{ texteLibre: true, approuve: false }, { suspendue: false }, []] })
  return fusionEtats(
    depuisAppel(r1, M_FAB, (v) => (v?.ok === false ? ok('ligne suspendue refusée') : fail(['ligne suspendue acceptée'], 'FA-1'))),
    depuisAppel(r2, M_FAB, (v) => (v?.ok === false ? ok('texte libre non approuvé refusé') : fail(['texte libre non approuvé accepté'], 'FA-1'))),
  )
}
async function fa2(ctx) {
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_FAB, fonction: 'verdictEntree', args: [{ ideeId: 'id1' }, { suspendue: false }, ['id1', 'id2']] })
  return depuisAppel(r, M_FAB, (v) => (v?.ok === false ? ok('idée dupliquée refusée') : fail(['idée dupliquée acceptée'], 'FA-2')))
}
async function fa3(ctx) {
  const rBas = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_FAB, fonction: 'verdictPhrase', args: ['Prix divisé par 3', 'source.md'], env: envJev({ reponse: { p: 0.1 } }) })
  const rHaut = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_FAB, fonction: 'verdictPhrase', args: ['Prix divisé par 3', 'source.md'], env: envJev({ reponse: { p: 0.9 } }) })
  return fusionEtats(
    depuisAppel(rBas, M_FAB, (v) => (v?.ok === false ? ok('score insuffisant refusé') : fail(['score insuffisant accepté'], 'FA-3'))),
    depuisAppel(rHaut, M_FAB, (v) => (v?.ok === true ? ok('score suffisant accepté') : fail(['score suffisant refusé à tort'], 'FA-3'))),
  )
}
async function fa4(ctx) {
  const cas = [
    [{ licence: null, pisteAudio: true, reseau: 'instagram' }, 'licence inconnue'],
    [{ licence: 'cc0', pisteAudio: false, reseau: 'instagram' }, 'vidéo sans piste audio'],
    [{ licence: 'cc0', pisteAudio: true, reseau: 'tiktok', tailleMo: 11 }, 'TikTok > 9,5 Mo'],
  ]
  const resultats = []
  for (const [manifeste, label] of cas) {
    const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_FAB, fonction: 'verdictDepot', args: [manifeste] })
    resultats.push(depuisAppel(r, M_FAB, (v) => (v?.ok === false ? ok(label) : fail([`${label} : dépôt accepté à tort`], 'FA-4'))))
  }
  return fusionEtats(...resultats)
}

// ── tiktok (026-210, TT) — scripts/contenu/publier-tiktok.mjs ──────────────────────────────────────────────────
const M_TT = 'scripts/contenu/publier-tiktok'
async function tt1(ctx) {
  const video = { id: 'v1', legende: 'Devis en 24h', texteIncruste: '', tailleMo: 3 }
  const decisionOk = { statut: 'tranchee', choix: 'accorder', cible: 'v1', texte_version: 'Devis en 24h' }
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_TT, fonction: 'verdictPublicationTikTok', args: [video, { decision: decisionOk }], env: envJev({ reponse: { p: 0.1 } }) })
  return depuisAppel(r, M_TT, (v) => (v?.ok === false ? ok('légende chiffrée sous le seuil refusée') : fail(['légende chiffrée sous le seuil acceptée'], 'TT-1')))
}
async function tt2(ctx) {
  const video = { id: 'v1', legende: 'Voir la démo', texteIncruste: '', tailleMo: 3 }
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_TT, fonction: 'verdictPublicationTikTok', args: [video, { decision: null }] })
  return depuisAppel(r, M_TT, (v) => (v?.ok === false ? ok('accord individuel manquant refusé') : fail(['publication sans accord acceptée'], 'TT-2')))
}
function tt3(ctx) {
  const p = path.join(ctx.racineEff, 'scripts/contenu/publier-tiktok.mjs')
  if (!existe(p)) return nonJuge('scripts/contenu/publier-tiktok.mjs')
  const texte = lire(p).toLowerCase()
  const echecs = []
  if (texte.includes('tiktokstudio')) echecs.push('« tiktokstudio » lu dans le source')
  if (texte.includes('creativecenter')) echecs.push('« creativecenter » lu dans le source')
  return echecs.length ? fail(echecs, 'lecture interdite référencée') : ok('aucune référence à TikTok Studio ni Creative Center')
}
async function tt4(ctx) {
  const decisionOk = { statut: 'tranchee', choix: 'accorder', cible: 'v1', texte_version: 'Voir la démo' }
  const gros = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_TT, fonction: 'verdictPublicationTikTok', args: [{ id: 'v1', legende: 'Voir la démo', texteIncruste: '', tailleMo: 12 }, { decision: decisionOk }] })
  const bon = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_TT, fonction: 'verdictPublicationTikTok', args: [{ id: 'v1', legende: 'Voir la démo', texteIncruste: '', tailleMo: 3 }, { decision: decisionOk }] })
  return fusionEtats(
    depuisAppel(gros, M_TT, (v) => (v?.ok === false ? ok('fichier > 9,5 Mo refusé') : fail(['fichier > 9,5 Mo accepté'], 'TT-4'))),
    depuisAppel(bon, M_TT, (v) => (v?.ok === true ? ok('publication conforme acceptée') : fail(['publication conforme refusée à tort'], 'TT-4'))),
  )
}

// ── profil-tiktok (026-211, PT) — docs/marketing/profil-tiktok.md (geste de Benj) ──────────────────────────────
function pt1(ctx) {
  const p = path.join(ctx.racineEff, 'docs/marketing/profil-tiktok.md')
  if (!existe(p)) return nonJuge('docs/marketing/profil-tiktok.md')
  const texte = lire(p)
  const champs = ['nouveau_nom_affichage', 'bio', 'lien_bio', 'date_bascule']
  const echecs = champs.filter((c) => !new RegExp(`\\b${c}\\b`).test(texte)).map((c) => `champ « ${c} » absent`)
  return echecs.length ? fail(echecs, 'dossier de conversion incomplet') : ok('nom, bio, lien unique, date documentés')
}
function pt2(ctx) {
  const p = path.join(ctx.racineEff, 'docs/marketing/profil-tiktok.md')
  if (!existe(p)) return nonJuge('docs/marketing/profil-tiktok.md')
  return /geste de benj/i.test(lire(p)) ? ok('geste de Benj rappelé (réglage de compte réel)') : fail(['aucun rappel du geste de Benj'], 'PT-2')
}

// ── meta (026-212, MP) — lib/contenu/metaPublier.ts (le faux Graph compte ses appels, executer-meta.mjs) ──────────
const VARIANTE_OK = { id: 'v1', texte: 'Voir la démo', bucket: 'prive-026', cle: 'v1.mp4' }
const DECISION_OK = { statut: 'tranchee', choix: 'accorder', cible: 'v1', texte_version: 'Voir la démo' }
async function mp1(ctx) {
  const r = await appelerMeta({ racineEff: ctx.racineEff, variante: { ...VARIANTE_OK, bucket: 'AUTRE-BUCKET' }, ctx: { bucketAttendu: 'prive-026', decision: DECISION_OK, ligneAccordee: true } })
  return depuisAppel(r, 'lib/contenu/metaPublier', (v) => (v?.ok === false ? ok('média hors du bucket privé refusé') : fail(['média hors bucket accepté'], 'MP-1')))
}
async function mp2(ctx) {
  const variante = { ...VARIANTE_OK, texte: 'Devis en 24h' }
  const decision = { ...DECISION_OK, texte_version: 'Devis en 24h' }
  const r = await appelerMeta({ racineEff: ctx.racineEff, variante, ctx: { bucketAttendu: 'prive-026', decision, ligneAccordee: true }, env: envJev({ reponse: { p: 0.1 } }) })
  return depuisAppel(r, 'lib/contenu/metaPublier', (v) => (v?.ok === false ? ok('chiffre sous le seuil refusé') : fail(['chiffre sous le seuil accepté'], 'MP-2')))
}
async function mp3(ctx) {
  const r = await appelerMeta({ racineEff: ctx.racineEff, variante: VARIANTE_OK, ctx: { bucketAttendu: 'prive-026', decision: null, ligneAccordee: true } })
  return depuisAppel(r, 'lib/contenu/metaPublier', (v, raw) => {
    if (v?.ok !== true) return fail(['publication conforme encore bloquée par accord individuel'], 'MP-3')
    if (raw.appelsReseau?.creerConteneur!==1 || raw.appelsReseau?.publier!==1) return fail(['publication automatique simulée non démontrée'], 'MP-3')
    return ok('publication conforme automatique sans décision individuelle, Graph simulé')
  })
}
async function mp4(ctx) {
  const r = await appelerMeta({ racineEff: ctx.racineEff, variante: VARIANTE_OK, ctx: { bucketAttendu: 'prive-026', decision: DECISION_OK, ligneAccordee: true, dejaPublie: true } })
  return depuisAppel(r, 'lib/contenu/metaPublier', (v, raw) => {
    if (!(v?.ok === true && v?.idempotent === true)) return fail([`republication non signalée idempotente (${JSON.stringify(v)})`], 'MP-4')
    if ((raw.appelsReseau?.creerConteneur || 0) > 0 || (raw.appelsReseau?.publier || 0) > 0) return fail(['un post déjà publié a relancé un appel Graph'], 'MP-4')
    return ok('post déjà publié : idempotent, zéro appel Graph')
  })
}
async function mp5(ctx) {
  const r = await appelerMeta({ racineEff: ctx.racineEff, variante: VARIANTE_OK, ctx: { bucketAttendu: 'prive-026', decision: DECISION_OK, ligneAccordee: true }, reseauScenario: 'erreur-conteneur' })
  return depuisAppel(r, 'lib/contenu/metaPublier', (v) => ((v?.ok === false && /Graph/.test(v.motif || '')) ? ok('échec Graph (conteneur) remonté avec son motif') : fail([`échec Graph non remonté (${JSON.stringify(v)})`], 'MP-5')))
}

// ── mesure (026-213, ME) — lib/contenu/mesure.ts ────────────────────────────────────────────────────────────────
async function me1(ctx) {
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/mesure', fonction: 'normaliserMesure', args: [{ erreur: true, source: 'ga4', le: '2026-09-20' }] })
  return depuisAppel(r, 'lib/contenu/mesure', (v) => ((v && v.disponible === false && v.valeur === null) ? ok('donnée en erreur reste non_mesure') : fail([`valeur inventée (${JSON.stringify(v)})`], 'ME-1')))
}
async function me2(ctx) {
  const r1 = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/mesure', fonction: 'verdictFormulePublique', args: ['3 ventes attribuées à L1 cette semaine', 'mesure.md', true] })
  const r2 = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/mesure', fonction: 'verdictFormulePublique', args: ['3 ventes (estimation) attribuées à L1 cette semaine', 'mesure.md', true], env: envJev({ reponse: { p: 0.9 } }) })
  return fusionEtats(
    depuisAppel(r1, 'lib/contenu/mesure', (v) => (v?.ok === false ? ok('attribution sans « estimation » refusée') : fail(['attribution sans « estimation » acceptée'], 'ME-2'))),
    depuisAppel(r2, 'lib/contenu/mesure', (v) => (v?.ok === true ? ok('attribution avec « estimation » acceptée') : fail(['attribution avec « estimation » refusée à tort'], 'ME-2'))),
  )
}
async function me3(ctx) {
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/mesure', fonction: 'verdictFormulePublique', args: ['Délai moyen 24h', null, false] })
  return depuisAppel(r, 'lib/contenu/mesure', (v) => (v?.ok === false ? ok('chiffre sans source refusé') : fail(['chiffre sans source accepté'], 'ME-3')))
}

// ── boucle (026-214, BO) — lib/contenu/boucle.ts et brief.ts ────────────────────────────────────────────────────
async function bo1(ctx) {
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/boucle', fonction: 'classable', args: [[{ fenetre: 'H+1', disponible: true }]] })
  return depuisAppel(r, 'lib/contenu/boucle', (v) => (v === false ? ok('H+1 seul jugé insuffisant') : fail([`classable a rendu ${JSON.stringify(v)}`], 'BO-1')))
}
async function bo2(ctx) {
  const candidat = { id: 'c1', texte: 'Test A', mesures: [{ fenetre: 'H+24', disponible: true }], provenance: 'campagne' }
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/boucle', fonction: 'recommander', args: [candidat], env: envJev({ reponse: { niveau: 5, distribution: {} } }) })
  return depuisAppel(r, 'lib/contenu/boucle', (v) => {
    if (!v || !['refaire', 'suspendre', 'tendance', 'insuffisant'].includes(v.statut)) return fail([`statut hors liste fermée (${JSON.stringify(v)})`], 'BO-2')
    if ('url' in v || 'publie' in v) return fail(['recommander a rendu un objet de publication'], 'BO-2')
    return ok(`statut « ${v.statut} » — classement seul`)
  })
}
async function bo3(ctx) {
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/brief', fonction: 'nouveauBrief', args: ['b1', 'L1', 'motif', 'c1'] })
  return depuisAppel(r, 'lib/contenu/brief', (v) => (v?.statut === 'proposition' ? ok('republication repart en proposition') : fail([`statut « ${v?.statut} » (attendu proposition)`], 'BO-3')))
}

// ── veille (026-215, VE) — scripts/contenu/veille.mjs et lib/contenu/accroches.ts ──────────────────────────────
const M_VE = 'scripts/contenu/veille'
async function ve1(ctx) {
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_VE, fonction: 'verdictFirecrawl', args: ['chercher', 'https://exemple-artisan.fr'] })
  return depuisAppel(r, M_VE, (v) => (v?.ok === false ? ok('« chercher » refusé, seul « lire » est permis') : fail(['« chercher » accepté'], 'VE-1')))
}
async function ve2(ctx) {
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_VE, fonction: 'verdictFirecrawl', args: ['lire', 'https://exemple.fr/contact?tel=0612345678'] })
  return depuisAppel(r, M_VE, (v) => (v?.ok === false ? ok('URL portant un téléphone refusée avant tout appel') : fail(['URL portant un téléphone acceptée'], 'VE-2')))
}
async function ve3(ctx) {
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: M_VE, fonction: 'verdictEnvoiIA', args: ['contact : jean@artisan.fr', 'ollama:cloud'] })
  return depuisAppel(r, M_VE, (v) => (v?.ok === false ? ok('donnée de prospect vers Ollama :cloud refusée') : fail(['donnée de prospect envoyée à un moteur :cloud'], 'VE-3')))
}
async function ve4(ctx) {
  const r1 = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/accroches', fonction: 'classerAccroche', args: ['texte anonymisé'], env: envJev({ reponse: { choix: 'chiffre' } }) })
  const r2 = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/accroches', fonction: 'scoreIdee', args: ['idée test', 'source.md', 'jour'], env: envJev({ reponse: { niveau: 4, distribution: {} } }) })
  return fusionEtats(
    depuisAppel(r1, 'lib/contenu/accroches', (v) => ((v && Object.keys(v).join(',') === 'categorie') ? ok('jev decide catégorise seulement') : fail([`classerAccroche a rendu ${JSON.stringify(v)}`], 'VE-4'))),
    depuisAppel(r2, 'lib/contenu/accroches', (v) => ((v?.alimenteFileIdees === true && v?.publicationAutomatique === false) ? ok('idée versée à la file, jamais publiée seule') : fail([`scoreIdee a rendu ${JSON.stringify(v)}`], 'VE-4'))),
  )
}

// ── couts (026-218, CO) — lib/contenu/couts.ts ──────────────────────────────────────────────────────────────────
async function co1(ctx) {
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/couts', fonction: 'normaliserCout', args: [{ agent: 'contenu', moteur: 'freellmapi' }] })
  return depuisAppel(r, 'lib/contenu/couts', (v) => ((v && v.connu === false && (v.montant === null || v.montant === undefined)) ? ok('montant absent reste connu:false') : fail([`montant inventé (${JSON.stringify(v)})`], 'CO-1')))
}
async function co2(ctx) {
  const lignes = [{ agent: 'contenu', moteur: 'laya' }, { agent: 'contenu', moteur: 'freellmapi', montant: 0.02 }]
  const r = await appelerFonction({ racineEff: ctx.racineEff, moduleRel: 'lib/contenu/couts', fonction: 'agregerParModele', args: [lignes] })
  return depuisAppel(r, 'lib/contenu/couts', (v) => {
    const laya = v?.['contenu:laya'], free = v?.['contenu:freellmapi']
    if (!laya || laya.appelsLaya !== 1 || laya.connuEur !== 0) return fail([`appel Laya mal compté (${JSON.stringify(laya)})`], 'CO-2')
    if (!free || free.connuEur !== 0.02) return fail([`coût facturé mal compté (${JSON.stringify(free)})`], 'CO-2')
    return ok('appels Laya comptés à part du coût facturé')
  })
}

// ── les treize parties ───────────────────────────────────────────────────────────────────────────────────────────
const PARTIES = {
  connaissance: { fiche: '026-205', criteres: [['CN-1', 'mémoire marketing présente', cn1], ['CN-2', 'L1..L5 complètes', cn2], ['CN-3', 'références « fait: » vérifiées', cn3], ['CN-4', 'règles plateformes (CC BY-SA, mention IA)', cn4]] },
  sql: { fiche: '026-206', criteres: [['SQ-1', 'migration *_contenu.sql présente', sq1], ['SQ-2', '4 tables créées', sq2], ['SQ-3', 'statut fermé + accord exigé', sq3], ['SQ-4', 'RLS + lecture seule publique', sq4]] },
  lignes: { fiche: '026-207', criteres: [['LN-1', 'ligne suspendue refusée', ln1], ['LN-2', 'canal non permis refusé', ln2], ['LN-3', 'plafond du jour refusé', ln3], ['LN-4', 'affirmation chiffrée contrôlée', ln4], ['LN-5', 'brouillon Publora du Crieur refusé ici', ln5], ['LN-6', 'validation automatique sans accord individuel', ln6]] },
  gabarits: { fiche: '026-208', criteres: [['GA-1', 'gabarits bien formés, format vertical', ga1], ['GA-2', 'licence commerciale et crédit', ga2], ['GA-3', 'type hyperframes cohérent', ga3]] },
  fabrication: { fiche: '026-209', criteres: [['FA-1', 'ligne suspendue / texte libre non approuvé refusés', fa1], ['FA-2', 'idée dupliquée refusée', fa2], ['FA-3', 'phrase chiffrée contrôlée', fa3], ['FA-4', 'dépôt refusé (licence, audio, taille)', fa4]] },
  tiktok: { fiche: '026-210', criteres: [['TT-1', 'chiffres de la légende contrôlés', tt1], ['TT-2', 'accord individuel exact requis', tt2], ['TT-3', 'jamais TikTok Studio ni Creative Center', tt3], ['TT-4', 'taille et publication conforme', tt4]] },
  'profil-tiktok': { fiche: '026-211', criteres: [['PT-1', 'dossier de conversion complet', pt1], ['PT-2', 'geste de Benj rappelé', pt2]] },
  meta: { fiche: '026-212', criteres: [['MP-1', 'bucket privé attendu', mp1], ['MP-2', 'chiffres contrôlés', mp2], ['MP-3', 'publication automatique sous garde-fous', mp3], ['MP-4', 'idempotence par ID', mp4], ['MP-5', 'échec Graph remonté', mp5]] },
  mesure: { fiche: '026-213', criteres: [['ME-1', 'donnée indisponible jamais un zéro', me1], ['ME-2', 'attribution de vente = estimation', me2], ['ME-3', 'libellé chiffré sans source refusé', me3]] },
  boucle: { fiche: '026-214', criteres: [['BO-1', 'H+1 seul insuffisant', bo1], ['BO-2', 'jev score classe, ne publie jamais', bo2], ['BO-3', 'republier exige un nouveau brief', bo3]] },
  veille: { fiche: '026-215', criteres: [['VE-1', 'Firecrawl en lecture seule', ve1], ['VE-2', 'URL nominative refusée', ve2], ['VE-3', 'prospect jamais vers une IA gratuite ou :cloud', ve3], ['VE-4', 'jev decide/score ne rédigent ni ne publient', ve4]] },
  geste: { fiche: '026-217', criteres: [['GE-1', 'validation automatique sans accord individuel', ge1], ['GE-2', 'budget et opposition bloquent automatiquement', ge2], ['GE-3', 'texte exact recontrôlé sous seuil de qualité', ge3]] },
  couts: { fiche: '026-218', criteres: [['CO-1', 'montant absent reste non connu', co1], ['CO-2', 'appel Laya compté à part', co2]] },
}
for(const [partie,id] of [['lignes','LN-7'],['meta','MP-6'],['mesure','ME-4'],['boucle','BO-4'],['veille','VE-5'],['geste','GE-4']]) {
  PARTIES[partie].criteres.push([id,'pause fail-closed avant modèles et sorties',ctx=>pauseContenu(ctx,partie)])
}
export { PARTIES }

// ── moteur ───────────────────────────────────────────────────────────────────────────────────────────────────────
export async function executerParties(demandees, racineEff, { silencieux = false } = {}) {
  const journal = []
  const log = (l) => { journal.push(l); if (!silencieux) console.log(l) }
  let rangGlobal = 0
  const detail = []
  for (const nomPartie of demandees) {
    const partie = PARTIES[nomPartie]
    let rang = 0
    const critereDetail = []
    for (const [id, nom, fn] of partie.criteres) {
      let r
      try { r = await fn({ racineEff }) } catch (e) { r = fail([String(e?.stack || e?.message || e)], 'exception du juge lui-même') }
      const etat = r.ok === true ? '✅' : r.ok === false ? '❌' : '➖'
      const suffixe = r.ok === false ? ` — ${r.echecs.join(' | ')}` : (r.resume ? ` : ${r.resume}` : '')
      log(`${etat} ${id} — ${nom}${suffixe}`)
      critereDetail.push({ id, ok: r.ok })
      if (r.ok === false) rang = Math.max(rang, 2)
      else if (r.ok === null) rang = Math.max(rang, 1)
    }
    const codePartie = rang === 2 ? 1 : rang === 1 ? 2 : 0
    log(`${JUGE} --partie=${nomPartie} : ${codePartie === 0 ? 'PASS' : codePartie === 1 ? 'FAIL' : 'SAUTE'}`)
    detail.push({ partie: nomPartie, code: codePartie, criteres: critereDetail })
    rangGlobal = Math.max(rangGlobal, rang)
  }
  const codeGlobal = rangGlobal === 2 ? 1 : rangGlobal === 1 ? 2 : 0
  log(`${JUGE} : ${codeGlobal === 0 ? 'PASS' : codeGlobal === 1 ? 'FAIL' : 'SAUTE'}`)
  return { code: codeGlobal, journal, detail }
}

async function main() {
  const o = lireOptions(process.argv.slice(2), { connues: ['partie', 'racine', 'temoin'] })
  const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exitCode = 2 }
  if (o.inconnues.length || o.positionnels.length) return refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
  if (!o.valeurs.partie) return refuser(`--partie=<${Object.keys(PARTIES).join('|')}> attendu`)
  const demandees = o.valeurs.partie.split(',').map((s) => s.trim()).filter(Boolean)
  const inconnuesParties = demandees.filter((p) => !PARTIES[p])
  if (!demandees.length || inconnuesParties.length) return refuser(`partie(s) inconnue(s) : ${inconnuesParties.join(', ') || '(vide)'} — attendu ${Object.keys(PARTIES).join('|')}`)
  if (o.drapeaux.has('temoin') && o.valeurs.racine) return refuser('--temoin ne se combine pas avec --racine')
  const racineEff = racineDe({ racine: o.valeurs.racine, temoin: o.drapeaux.has('temoin') })
  if (!estDossier(racineEff)) return refuser(`--racine : ${racineEff} n'est pas un dossier`)

  try {
    const { code } = await executerParties(demandees, racineEff)
    process.exitCode = code
  } finally {
    retirerJonctions()
  }
}

if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))) main()
