#!/usr/bin/env node
// 026-159 : catalogue fermé du contrat ; aucun PASS si une faute reste non préparée.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn,spawnSync} from 'node:child_process'
import crypto from 'node:crypto'
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const PROOF=path.join(ROOT,'.orchestre/preuves/026-159'),WORK=path.join(ROOT,'.orchestre/travail/026-159')
const options=process.argv.slice(2)
// Ces commutateurs appartiennent au fabricant de contre-exemples, jamais aux juges.
const MEDIA = {
  gps: false,
  photo: false,
  mentionPack: false,
  age: false,
  mentionStudio: false,
  filigrane: false,
  recommandation: false,
  produit: false,
  regard: false,
}
if(options.some(a=>a.startsWith('--produire-media=')||a.startsWith('--juger-media='))){
  try { await mediaMode(options); } catch(e) { console.error('Fabrication média refusée : '+e.message); process.exitCode=2; }
  process.exit(process.exitCode??0)
}
if(options.some(a=>!/^(?:--lister|--temoins|--garder|--groupe=[a-z-]+|--groupes=[a-z-]+,[a-z-]+|--partie=[a-z]+|--cas=[a-zA-Z]+)$/.test(a))){console.error('Options : --lister, --temoins, --garder, --groupe=<juge>, --groupes=<deux juges>, --partie=<partie>, --cas=<cas>');process.exit(2)}
const ONLY=options.find(a=>a.startsWith('--groupe='))?.slice(9),LIST=options.includes('--lister'),WITNESS=options.includes('--temoins'),KEEP=options.includes('--garder')
const MULTI=options.find(a=>a.startsWith('--groupes='))?.slice(10).split(',')
if(MULTI&&(ONLY||new Set(MULTI).size!==2)){console.error('--groupes attend deux groupes distincts, sans --groupe');process.exit(2)}
const LIMIT=19*60_000, catalogue=[]
const add=(g,c,f,re,transform,nom,opts=[])=>catalogue.push({g,juge:`scripts/${g}-qa.mjs`,critere:c,fichier:f,re,transform,nom,opts})
const replace=(g,c,f,re,after,nom,opts)=>add(g,c,f,re,()=>after,nom,opts)
const pending=(g,c,nom,raison)=>catalogue.push({g,juge:`scripts/${g}-qa.mjs`,critere:c,nom,pending:raison})
const media=(g,c,cas,nom)=>{add(g,c,'scripts/juges-026-pubs-contenu-mutations.mjs',new RegExp('  '+cas+': false,'),a=>a.replace('false','true'),nom,['--juger-media='+(cas==='age'?cas:g==='pub'?'studio':'pack')]);catalogue.at(-1).media=cas}
const SQL='supabase/migrations/0102_packs_pubs.sql',CGU='app/cgu/page.tsx',PACK='lib/packPub.ts',P='app/api/controle/packs/[id]/route.ts'
add('pack-pub-base','PB-3',SQL,/revoke all on public\.packs_pubs from public, anon, authenticated;/,a=>a+'\ncreate policy "mutation ecriture" on public.packs_pubs for insert with check (true);','politique écriture ajoutée')
add('pack-pub-base','PB-4',SQL,/values \('packs-pubs', 'packs-pubs', false, 20971520\)/,a=>a.replace('false','true'),'bucket public')
replace('pack-pub-base','PB-3',SQL,/revoke all on public\.packs_pubs from public, anon, authenticated;/,'','revoke retiré')
add('pack-pub-base','PB-2',SQL,/check \(etat in \('brouillon', 'payee', 'fabriquee', 'livree'\)\)/,a=>a.replace(", 'livree'",''),'état livree retiré')
add('pack-pub-base','PB-8',SQL,/check \(prix_cents > 0\)/,a=>a.replace('>','>='),'migration changée après essai à sec')
add('pack-pub-paiement','PP-3','lib/stripeAiguillage.ts',/s\.mode === 'payment' && s\.metadata\?\.type === 'pack_pub' && s\.metadata\?\.pack_id/,a=>a.replace("s.mode === 'payment' && ",''),'pack en mode abonnement',['--partie=noyau'])
replace('pack-pub-paiement','PP-4','app/api/stripe/webhook/route.ts',/        if \(r === 'introuvable'\) throw new Error\(`paiement de pack pubs sans dossier : session \$\{s\.id\}`\)/,'','introuvable avalé',['--partie=noyau'])
add('pack-pub-paiement','PP-5','lib/packPubServeur.ts',/\.update\(maj\)\.eq\('id', packId\)\.eq\('etat', 'brouillon'\)/,a=>a.replace(".eq('etat', 'brouillon')",''),'garde brouillon retirée',['--partie=noyau'])
replace('pack-pub-paiement','PP-6',PACK,/    invoice_creation: \{[^\r\n]+\},/,'','facture absente',['--partie=noyau'])
replace('pack-pub-paiement','PP-6',PACK,/    payment_intent_data: \{ metadata: \{ \.\.\.metadata \} \},/,'    payment_intent_data: {},','metadata paiement absentes',['--partie=noyau'])
replace('pack-pub-paiement','PP-9','lib/flags.ts',/packPub:\s*false/,'packPub: true','drapeau levé',['--partie=route'])
add('pack-pub-paiement','PP-7','lib/stripe.ts',/import Stripe from 'stripe'/,a=>a+'\n// mutation NR159','Stripe changé',['--partie=noyau'])
replace('cgu-pack-pub','CG-3',CGU,/signalée « Voix générée par IA » à l’écran pendant toute la vidéo/,'signalée à l’écran','mention IA retirée')
add('cgu-pack-pub','CG-4',CGU,/Aucun résultat n’est garanti : ni nombre de contacts, ni chantiers\./,a=>a+' Résultats assurés.','résultats assurés')
add('cgu-pack-pub','CG-2',CGU,/Le site vitrine n’est pas compris dans les abonnements\./,a=>a.replace('vitrine','commercial'),'3 bis modifié')
replace('pack-pub-dossier','PD-1','lib/packPubDossier.ts',/if \(!adresseAutorisee\(url, contexte\)\)/,'if (false)','photo autre artisan acceptée',['--partie=api'])
replace('pack-pub-dossier','PD-1','lib/packPubDossier.ts',/if \(personnes && !accord_personnes\)/,'if (false)','accord personnes ignoré',['--partie=api'])
replace('pack-pub-dossier','PD-1','lib/packPubDossier.ts',/if \(\/\\d\/\.test\(texte_voix\)\)/,'if (false)','chiffres voix acceptés',['--partie=api'])
replace('pack-pub-dossier','PD-5','app/pubs/commander/page.tsx',/<b>\{PRIX_PACK_PUB_TEXTE\}<\/b>/,'<b>149 €</b>','prix page figé',['--partie=page'])
replace('pack-pub-dossier','PD-7','app/dashboard/page.tsx',/actif\('packPubVente'\) && <CartePackPub \/>/,'true && <CartePackPub />','carte hors drapeau',['--partie=page'])
add('pack-pub-livraison','LV-1','scripts/pack-pub/deposer.mjs',/const juge = spawnSync\(/,a=>"if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('configuration Supabase absente'); process.exit(1) }\n"+a,'environnement avant juge',['--partie=depot'])
replace('pack-pub-livraison','LV-4',P,/const refus = await exigerReconfirmation\(req, f\.uid, 'artisan'\)/,'const refus = null','reconfirmation retirée',['--partie=route'])
add('pack-pub-livraison','LV-4',P,/  const journalise = await journaliser\(\{/,a=>"  await supabaseAdmin.from('packs_pubs').update({ etat: vers }).eq('id', id)\n"+a,'écriture avant journal',['--partie=route'])
replace('pack-pub-livraison','LV-3','lib/packPubLivraison.ts',/DUREE_LIEN_S = 2592000/,'DUREE_LIEN_S = 5184000','lien soixante jours',['--partie=route'])
add('pack-pub-livraison','LV-8','app/controle/page.tsx',/\{ id: 'visiteurs', label: 'Visiteurs',/,a=>a.replace("label: 'Visiteurs'","label: 'Clients'"),'contrôle changé hors packs',['--partie=poste'])
add('pack-pub-livraison','LV-10','scripts/pack-pub/exporter.mjs',/JSON\.stringify\(\{ pack_id: packId, matiere: ligne\.matiere, site \}/,a=>a.replace('site }',"site, email: 'essai@fautif.invalid' }"),'courriel exporté',['--partie=depot'])
replace('pack-pub-livraison','LV-12','lib/packPubPurge.ts',/pack\.etat === 'livree'/,"['livree', 'fabriquee'].includes(pack.etat)",'purge fabriquee',['--partie=purge'])
replace('pack-pub-livraison','LV-13','lib/packPubPurge.ts',/if \(error\) \{ bilan\.erreurs\.push\(`lecture : \$\{error\.message\}`\); return bilan \}/,'if (error) throw new Error(error.message)','erreur purge levée',['--partie=purge'])
add('socle-pubs','SP-2','scripts/video-qa.mjs',/a\.meta\.largeur === 1080 && a\.meta\.hauteur === 1920/,a=>a.replace('a.meta.hauteur === 1920','[1920, 1350].includes(a.meta.hauteur)'),'format pub trop permissif')
replace('socle-pubs','SP-5','scripts/visages-qa.mjs',/seuil = 0\.9, ips/,'seuil = 0.5, ips','seuil YuNet abaissé')
replace('socle-pubs','SP-4','scripts/visages-qa.mjs',/if \(empreinteReelle !== EMPREINTE\)/,'if (false)','empreinte juge non vérifiée')
replace('socle-pubs','SP-3','scripts/video-qa.mjs',/POIDS_MAX: 1_500_000/,'POIDS_MAX: 1','profil landing changé')
// Les deux mutations explicites des juges du socle restent présentes même si leur critère est déjà couvert.
add('socle-pubs','SP-2','scripts/video-qa.mjs',/a\.meta\.largeur === 1080 && a\.meta\.hauteur === 1920/,a=>a.replace('a.meta.hauteur === 1920','a.meta.hauteur >= 1350'),'juge vidéo accepte film 1080x1350')
replace('socle-pubs','SP-4','scripts/visages-qa.mjs',/if \(empreinteReelle !== EMPREINTE\)/,'if (false)','juge visages ne compare plus modèle')
add('pub-locale','PL-G3','gabarits-pubs/locale/artisan-ville/index.html',/<img id="img1" class="abs" src="\{\{photo:0\}\}"/,a=>a.replace('{{photo:0}}','https://fautif.invalid/photo.jpg'),'image distante',['--partie=gabarit'])
replace('pub-locale','PL-G4','gabarits-pubs/locale/artisan-ville/index.html',/<div id="mention-ia"[^\r\n]+<\/div>/,'','mention IA retirée',['--partie=gabarit'])
replace('pub-locale','PL-G5','gabarits-pubs/locale/artisan-ville/index.html',/#accroche \{ top: 20%;/,'#accroche { top: 2%;','texte dans zone haute',['--partie=gabarit'])
media('pub-locale','PL-3','gps','GPS remis dans photo')
media('pub-locale','PL-3','photo','photo remplacée manifeste inchangé')
media('pub-locale','PL-7','mentionPack','mention vidéo masquée de cinq à huit secondes')
media('pub-locale','PL-T5','age','âge et logement oui')
// Le contrat 159 autorise --dossier : conserver tous les critères du juge original,
// dont le vrai fabricant appelé sur jeu-visage, sans refabriquer les trois jeux de 156.
replace('pub-locale','PL-12','scripts/pack-pub/fabriquer.mjs',/const aVerifier = bruts\.filter\(\(p\) => !p\.personnes\)/,'const aVerifier = []','jeu visage accepté',['--juger-media=pack'])
catalogue.at(-1).media='visage'
replace('pub-locale','PL-T4','scripts/pack-pub/textes.mjs',/const introduction = amorces\[accroche\] \?\? `Un projet de \$\{metier\} à \$\{ville\} \?`/,"const introduction = 'RGE. ' + (amorces[accroche] ?? `Un projet de ${metier} à ${ville} ?`)",'RGE dans textes',['--partie=textes'])
replace('studio-garde','SG-1','scripts/studio/garde.mjs',/  exigerLigne\(prealables, 'Activité déclarée le'\)/,'','activité déclarée non contrôlée')
add('studio-garde','SG-3','docs/studio/modeles-messages.md',/Texte seul, sans lien, pièce jointe, prix ou affirmation qu’un essai existe déjà\./,a=>a.replace('sans lien','avec le lien https://fautif.invalid/essai'),'adresse web message un')
add('studio-garde','SG-3','docs/studio/modeles-messages.md',/Texte seul, sans lien, pièce jointe, prix ou affirmation qu’un essai existe déjà\./,a=>a+' Premier message : j’ai préparé votre essai.','essai préparé message un')
add('studio-garde','SG-4','docs/studio/seance.md',/9\. Benj regarde le premier échantillon une seule fois, depuis la station\. Les suivants suivent la vérification mécanique\./,a=>a.replace('depuis la station','après l’envoi au prospect, depuis la station'),'Benj regarde après envoi')
media('pub','PQ-2','mentionStudio','mention absente première seconde')
media('pub','PQ-3','filigrane','filigrane masqué trois secondes')
media('pub','PQ-6','recommandation','je recommande ajouté')
media('pub','PQ-7','produit','photo produit remplacée')
media('pub','PQ-9','regard','regard autre planche')
add('crieur','CR-10','app/api/cron/crieur/route.ts',/if \(aSec\) return NextResponse\.json\(\{ semaine, lot \}\)/,a=>a.replace('return NextResponse','{ await ops_battement({ p_nom: \'crieur\' }); return NextResponse')+' }','battement aussi à sec',['--partie=route'])
replace('crieur','CR-1','lib/crieur/faits.ts',/motif: '\| 15 \| « Factures \+ facture électronique »'/,"motif: 'preuve-fautive-introuvable'",'motif inconnu',['--partie=composer'])
replace('crieur','CR-2','lib/crieur/faits.ts',/texte: 'Presti permet de créer des factures et des factures électroniques\.'/,"texte: 'Presti répond.'",'Presti répond seul',['--partie=composer'])
replace('crieur','CR-3','lib/crieur/composer.ts',/  return resultat\b/,'  return [...resultat, ...resultat.slice(0, 1)]','quatre publications',['--partie=composer'])
add('crieur','CR-7','lib/crieur/publora.ts',/const corps = \{ content: publication\.contenu, platforms: publication\.plateformes,/,a=>a+" scheduledTime: '2030-01-01T00:00:00Z',",'scheduledTime envoyé',['--partie=route'])
replace('crieur','CR-5','app/api/cron/crieur/route.ts',/  if \(!secret \|\| req\.headers\.get\('authorization'\) !== `Bearer \$\{secret\}`\) return NextResponse\.json\(\{ error: 'unauthorized' \}, \{ status: 401 \}\)/,'','jeton non contrôlé',['--partie=route'])
add('crieur','CR-11','supabase/migrations/0104_crieur.sql',/revoke all on public\.crieur_posts from public, anon, authenticated;/,a=>a+'\ncreate policy "fautif" on public.crieur_posts for insert with check (true);','politique Crieur ajoutée',['--partie=horloge'])
replace('crieur','CR-12','supabase/migrations/0104_crieur.sql',/'Bearer ' \|\| v_secret/,"'Bearer jeton-fautif-en-clair'",'jeton appel en clair',['--partie=horloge'])

const PARTIE=options.find(a=>a.startsWith('--partie='))?.slice(9)
const CAS=options.find(a=>a.startsWith('--cas='))?.slice(6)
const selected=catalogue.filter(m=>(!ONLY||m.g===ONLY)&&(!MULTI||MULTI.includes(m.g))&&(!PARTIE||m.opts?.includes('--partie='+PARTIE))&&(!CAS||m.media===CAS))
const errors=[],prepared=[]
if(!selected.length)errors.push('groupe inconnu : '+ONLY)
for(const m of selected){try{if(m.pending)throw Error(m.pending);const text=fs.readFileSync(path.join(ROOT,m.fichier),'utf8'),hits=[...text.matchAll(new RegExp(m.re.source,'g'))];if(hits.length!==1)throw Error('ancre présente '+hits.length+' fois');const avant=hits[0][0],apres=m.transform(avant);if(avant===apres)throw Error('aucun changement');prepared.push({...m,avant,apres,ligne:text.slice(0,hits[0].index).split('\n').length})}catch(e){errors.push(m.critere+' — '+m.nom+' : '+e.message)}}
if(LIST){const groupes=new Map();for(const m of prepared){const key=m.juge+' '+m.opts.join(' ');if(!groupes.has(key))groupes.set(key,{juge:m.juge,opts:m.opts,fautes:0});groupes.get(key).fautes++}console.log(JSON.stringify({catalogue:catalogue.length,selection:selected.length,prepares:prepared.length,budget_global_ms:LIMIT,timeout_processus_ms:180000,groupes:[...groupes.values()],criteres:[...new Set(catalogue.map(m=>m.critere))],ancres:prepared.map(m=>({juge:m.juge,critere:m.critere,fichier:m.fichier,ligne:m.ligne,nom:m.nom})),erreurs:errors},null,2));process.exit(errors.length?1:0)}
const report={mutations:[],temoins:[],erreurs:[...errors]},start=Date.now(),run=path.join(WORK,String(Date.now())+'-'+process.pid)
fs.mkdirSync(PROOF,{recursive:true});fs.mkdirSync(run,{recursive:true})
const save=()=>{const name=WITNESS?'temoins':'mutations';fs.writeFileSync(path.join(PROOF,name+'.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(PROOF,name+'.md'),['# 026-159 — '+(WITNESS?'témoins seulement':'contre-mutations'),'',...report.erreurs.map(e=>'- NON VALIDÉ : '+e),...(report.video_original?['- A1 juge original : '+report.video_original.commande+' ; code '+report.video_original.code+' ; '+JSON.stringify(report.video_original.format)]:[]),...report.temoins.map(t=>'- Témoin '+t.commande+' : code '+t.code+', '+t.duree_s+' s'),...report.mutations.map(m=>'- '+m.critere+' '+m.nom+' : '+m.commande+' ; '+m.extrait)].join('\n')+'\n')}
const git=(args)=>{const r=spawnSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:64<<20});if(r.status!==0)throw Error('Git authentique indisponible : '+args[0]);return r.stdout}
const files=git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(f=>f&&!/^\.orchestre\//.test(f)&&!/(^|\/)(?:\.env(?:\.|$)|id_rsa|id_ed25519)/.test(f)&&!/\.(?:key|pem)$/i.test(f)&&(/^(?:app|lib|components|scripts|supabase|docs\/agents|docs\/studio|docs\/pubs|gabarits-pubs|public|plans|\.github)\//.test(f)||/^(?:package.*\.json|tsconfig\.json|next-env\.d\.ts|next\.config\.[^/]+|proxy\.ts|vercel\.json)$/.test(f)))
function cleanup(dir){const rel=path.relative(run,dir);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('cleanup hors copie');if(!fs.existsSync(dir))return;for(const n of fs.readdirSync(dir)){const p=path.join(dir,n),st=fs.lstatSync(p);if(st.isSymbolicLink())fs.unlinkSync(p);else if(st.isDirectory())cleanup(p);else fs.unlinkSync(p)}fs.rmdirSync(dir)}
function copy(dir){fs.mkdirSync(dir,{recursive:true});for(const f of files){const p=path.join(ROOT,f);if(!fs.existsSync(p))continue;const st=fs.lstatSync(p);if(st.isSymbolicLink())throw Error('source lien refusée : '+f);if(st.isFile()){const d=path.join(dir,f);fs.mkdirSync(path.dirname(d),{recursive:true});fs.copyFileSync(p,d)}}for(const f of ['.orchestre/preuves/026-114/essai-a-sec.txt','.orchestre/preuves/026-134/essai-a-sec.txt'])if(fs.existsSync(path.join(ROOT,f))){const d=path.join(dir,f);fs.mkdirSync(path.dirname(d),{recursive:true});fs.copyFileSync(path.join(ROOT,f),d)}if(fs.existsSync(path.join(ROOT,'node_modules')))fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(dir,'node_modules'),process.platform==='win32'?'junction':'dir')}
const command=m=>['node',m.media?'scripts/juges-026-pubs-contenu-mutations.mjs':m.juge,...m.opts,'--racine={racine}'].join(' ')
async function judge(m,dir){const remain=LIMIT-(Date.now()-start);if(remain<=0)throw Error('budget global 19 minutes atteint');const begin=Date.now(),env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(SECRET|KEY|TOKEN|PASSWORD|PASSWD|STRIPE|SUPABASE|RESEND|ANTHROPIC|OPENAI|VERCEL|DATABASE|DIRECT_URL|EMAIL_ENTREPRISE|CRON|WEBHOOK)/i.test(k)));return new Promise(resolve=>{let sortie='',expired=false;const child=spawn(process.execPath,[m.media?'scripts/juges-026-pubs-contenu-mutations.mjs':m.juge,...m.opts,...(m.noRacine?[]:['--racine='+dir])],{cwd:ROOT,env:{...env,NO_COLOR:'1',FORCE_COLOR:'0'},detached:process.platform!=='win32',windowsHide:true});child.stdout.on('data',d=>sortie+=d);child.stderr.on('data',d=>sortie+=d);const timer=setTimeout(()=>{expired=true;if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true});else try{process.kill(-child.pid,'SIGKILL')}catch{}},Math.min(remain,180000));child.on('error',e=>{clearTimeout(timer);resolve({code:127,sortie:sortie+'\n'+e.message,duree_s:(Date.now()-begin)/1000,expired})});child.on('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal,sortie:sortie.replace(/\u001b\[[0-9;]*m/g,''),duree_s:(Date.now()-begin)/1000,expired})})})}
function strict(out,c){const lines=out.split(/\r?\n/),named=lines.filter(l=>new RegExp('^(PASS|FAIL|SAUTE) '+c+'(?: — |$)').test(l));const end=lines.map(l=>/^([a-z][a-z0-9-]*(?: --[a-z0-9-]+=[^\s]+)*) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1);return named.length===1&&named[0].startsWith('FAIL '+c+' — ')&&end?.[2]==='FAIL'&&(end[3]??'').split(/,\s*/).includes(c)&&!/^\s+at .*:\d+:\d+/m.test(out)?named[0]:null}
// Deux groupes au plus ; les chemins fixes des juges déterminent les exclusions.
function ressources(entries) {
  const m=entries[0]
  if(m.g==='pub-locale') {
    if(m.opts.includes('--juger-media=pack')||m.opts.includes('--partie=complet'))return ['pack-snapshot']
    if(m.opts.includes('--partie=gabarit')||m.opts.includes('--partie=textes'))return ['pack-base']
  }
  if(m.g==='pack-pub-livraison'&&m.opts.includes('--partie=depot'))return ['pack-snapshot']
  return [m.juge]
}
function priorite(entries) {
  const m=entries[0]
  if(m.opts.includes('--juger-media=pack'))return 5
  if(m.g==='pub-locale'&&m.opts.includes('--partie=gabarit'))return 4
  if(m.g==='pack-pub-livraison'&&m.opts.includes('--partie=depot'))return 4
  if(m.g==='socle-pubs'||m.opts.includes('--juger-media=studio'))return 3
  return 1
}
async function poolGroupes(jobs,exec,maximum=2) {
  if(maximum!==2)throw Error('pool doit rester limité à deux groupes')
  const queue=[...jobs],running=new Set(),locks=new Set();let fatal
  while(queue.length||running.size){
    while(!fatal&&running.size<maximum){
      const i=queue.findIndex(j=>j.ressources.every(r=>!locks.has(r)))
      if(i<0)break
      const j=queue.splice(i,1)[0];for(const r of j.ressources)locks.add(r)
      let work;work=Promise.resolve().then(()=>exec(j)).catch(e=>{fatal??=e}).finally(()=>{for(const r of j.ressources)locks.delete(r);running.delete(work)})
      running.add(work)
    }
    if(!running.size)break
    await Promise.race(running)
  }
  if(fatal)throw fatal
  if(queue.length)throw Error('verrous de groupes incohérents')
}
try {
  save();if(errors.length)throw Error('préflight incomplet : aucun test lancé')
  const groups=new Map(),ordinal=new Map(prepared.map((m,i)=>[m,i+1]))
  for(const m of prepared){const key=m.juge+' '+m.opts.join(' ');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m)}
  const jobs=[...groups].map(([key,entries],group)=>({key,entries,group,ressources:ressources(entries)})).sort((a,b)=>priorite(b.entries)-priorite(a.entries)||a.group-b.group)
  const witnesses=[],results=[];let actifs=0
  report.scheduler={maximum:2,pic_groupes:0,groupes:jobs.map(j=>({groupe:j.group,commande:j.key,ressources:j.ressources})),evenements:[]}
  await poolGroupes(jobs,async ({key,entries,group})=>{
    actifs++;report.scheduler.pic_groupes=Math.max(report.scheduler.pic_groupes,actifs)
    report.scheduler.evenements.push({groupe:group,action:'debut',ms:Date.now()-start})
    try {
    const dir=path.join(run,'groupe-'+group);let witness
    try{copy(dir);witness=await judge(entries[0],dir)}finally{cleanup(dir)}
    witnesses[group]={commande:command(entries[0]),code:witness.code,duree_s:witness.duree_s,log:'temoin-'+group+'.log'}
    report.temoins=witnesses.filter(Boolean)
    fs.writeFileSync(path.join(PROOF,'temoin-'+group+'.log'),witness.sortie)
    console.log('TÉMOIN '+key+' : code '+witness.code);save()
    if(witness.code!==0||witness.expired||witness.signal){report.erreurs.push('témoin rouge : '+key);save();return}
    if(WITNESS)return
    if(entries[0].g==='socle-pubs'){
      const args=['--profil=pub-locale','--json',path.join(ROOT,'.orchestre/travail/socle/mutation-format.mp4')],a=await judge({juge:'scripts/video-qa.mjs',opts:args,noRacine:true},ROOT)
      let format;try{format=JSON.parse(a.sortie)[0]?.tests?.find(t=>!t.passe&&t.nom==='Format 1080×1920 (pub locale)'&&t.mesure==='1080×1350')}catch{}
      report.video_original={commande:['node','scripts/video-qa.mjs',...args].join(' '),code:a.code,duree_s:a.duree_s,format:format??null}
      fs.writeFileSync(path.join(PROOF,'video-original-format.log'),a.sortie)
      if(a.code!==1||a.expired||a.signal||!format)report.erreurs.push('A1 : vidéo 1080×1350 non refusée par le juge original sur son format')
      save()
    }
    for(const m of entries){
      const index=ordinal.get(m),d=path.join(run,'mutation-'+(index-1))
      try {
        copy(d);const target=path.join(d,m.fichier),original=fs.readFileSync(target,'utf8')
        if(original.split(m.avant).length!==2)throw Error('ancre copie non unique')
        fs.writeFileSync(target,original.replace(m.avant,()=>m.apres))
        const r=await judge(m,d),extrait=strict(r.sortie,m.critere)
        fs.writeFileSync(path.join(PROOF,index+'-'+m.critere+'.log'),r.sortie)
        if(r.code!==1||r.expired||r.signal||!extrait)report.erreurs.push(m.critere+' '+m.nom+' non détectée strictement (code '+r.code+')')
        else results[index-1]={juge:m.juge,commande:command(m),fichier:m.fichier,avant:m.avant,apres:m.apres,critere:m.critere,extrait,duree_s:r.duree_s,nom:m.nom}
        report.mutations=results.filter(Boolean)
        console.log((extrait&&r.code===1?'DÉTECTÉE ':'NON VALIDÉE ')+m.critere+' '+m.nom);save()
      }finally{if(!KEEP)cleanup(d)}
    }
    }finally{actifs--;report.scheduler.evenements.push({groupe:group,action:'fin',ms:Date.now()-start});save()}
  })
}catch(e){if(!report.erreurs.includes(e.message))report.erreurs.push(e.message)}finally{if(!KEEP)cleanup(run);save()}
console.log('juges-026-pubs-contenu-mutations : '+(report.erreurs.length?'FAIL':'PASS')+' — '+(WITNESS?report.temoins.length+' témoins, aucune mutation exécutée':report.mutations.length+'/'+selected.length+' fautes détectées'))
process.exitCode=report.erreurs.length?1:0

async function mediaMode(args){
  const mode=args.find(a=>a.startsWith('--produire-media='))?'produire':'juger'
  const values=Object.fromEntries(args.map(a=>{const i=a.indexOf('=');if(i<0)throw Error('option média invalide');return [a.slice(2,i),a.slice(i+1)]}))
  const allowed=mode==='produire'?['produire-media','base','destination']:['juger-media','racine']
  if(Object.keys(values).some(k=>!allowed.includes(k)))throw Error('option média inconnue')
  const demande=values[mode+'-media'],ensembles={pack:['gps','photo','mentionPack'],studio:['mentionStudio','filigrane','recommandation','produit','regard']}
  if(!Object.hasOwn(MEDIA,demande)&&!Object.hasOwn(ensembles,demande))throw Error('cas média inconnu')
  const selection=(ensembles[demande]??[demande]).filter(c=>MEDIA[c]);if(selection.length>1)throw Error('plus d’une faute média : isolation rompue')
  const cas=selection[0]??ensembles[demande]?.[0]??demande
  const groupe=['gps','photo','mentionPack','age'].includes(cas)?'pack':'studio'
  const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
  function publicCopy(source,dest){
    if(!fs.statSync(source).isDirectory())throw Error('entrée média absente')
    fs.mkdirSync(dest,{recursive:true});for(const item of fs.readdirSync(source)){
      const f=path.join(source,item),d=path.join(dest,item),s=fs.lstatSync(f)
      if(s.isSymbolicLink())throw Error('lien média refusé')
      if(s.isDirectory())publicCopy(f,d);else if(s.isFile()){if(!/\.(json|jpg|html|mp3|mp4|md|txt)$/i.test(item)||/secret|\.env|token|password/i.test(item))throw Error('entrée média non publique');fs.copyFileSync(f,d)}
    }
  }
  const invoke=(bin,argv,cwd)=>{const r=spawnSync(bin,argv,{cwd,encoding:'utf8',timeout:180000,maxBuffer:32<<20,windowsHide:true});if(r.error||r.signal||r.status===null)throw Error('processus média interrompu : '+(r.error?.message??r.signal));return r}
  if(mode==='juger'){
    const racine=path.resolve(values.racine??'');if(!values.racine||racine===ROOT)throw Error('copie indépendante requise')
    const base=path.join(PROOF,'entrees',groupe),destination=path.join(racine,'.orchestre/travail/026-159-media',cas)
    const manifeste=JSON.parse(fs.readFileSync(path.join(PROOF,'recuperation-medias.json'),'utf8').replace(/^\uFEFF/,''))
    const entrees=manifeste.filter(e=>e.groupe===groupe);if(!entrees.length)throw Error('manifeste des entrées absent')
    for(const e of entrees){const f=path.resolve(base,e.fichier),r=path.relative(base,f);if(r.startsWith('..')||path.isAbsolute(r)||hash(f)!==e.sha256.toLowerCase()||fs.statSync(f).size!==e.taille)throw Error('entrée publique altérée : '+e.fichier)}
    // Le fabricant EST celui de la copie mutée : le méta-juge peut refaire ce remplacement.
    const fab=invoke(process.execPath,[path.join(racine,'scripts/juges-026-pubs-contenu-mutations.mjs'),'--produire-media='+demande,'--base='+base,'--destination='+destination],ROOT)
    if(fab.status!==0){process.stdout.write(fab.stdout);process.stderr.write(fab.stderr);process.exitCode=fab.status;return}
    const judgeArgs=groupe==='pack'?['scripts/pub-locale-qa.mjs','--partie='+ (cas==='age'?'textes':'complet'),'--dossier='+destination,'--meta-logement=oui','--racine='+racine]:['scripts/pub-qa.mjs',path.join(destination,'echantillon-1'),'--racine='+racine]
    const r=invoke(process.execPath,judgeArgs,ROOT);process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exitCode=r.status;return
  }
  const base=path.resolve(values.base??''),destination=path.resolve(values.destination??'')
  const work=path.join(ROOT,'.orchestre/travail/026-159-media'),rel=path.relative(work,destination)
  if(!values.base||!values.destination||!rel||rel.startsWith('..')||path.isAbsolute(rel)||fs.existsSync(destination))throw Error('destination média non neuve ou hors copie')
  publicCopy(base,destination)
  const trace={cas,groupe,faute:MEDIA[cas],actions:[]}
  if(MEDIA[cas]){
    const sharp=(await import('sharp')).default
    const rewrite=async(f,make)=>{const before=hash(f),buf=await make(fs.readFileSync(f));fs.writeFileSync(f,buf);trace.actions.push({fichier:path.relative(destination,f),avant_sha256:before,apres_sha256:hash(f)});if(before===hash(f))throw Error('transformation média sans effet')}
    if(cas==='gps'){
      const f=path.join(destination,'photos/01.jpg')
      await rewrite(f,p=>sharp(p).withExif({IFD3:{GPSLatitudeRef:'N',GPSLatitude:'48/1 51/1 0/1',GPSLongitudeRef:'E',GPSLongitude:'2/1 21/1 0/1'}}).jpeg().toBuffer())
      const meta=await sharp(fs.readFileSync(f)).metadata();if(!meta.exif)throw Error('EXIF non produit')
      // Empreinte mise à jour : l'échec attendu est bien l'EXIF/GPS, pas un simple manifeste périmé.
      const mf=path.join(destination,'manifeste-entrees.json'),j=JSON.parse(fs.readFileSync(mf,'utf8')),photo=j.photos.find(p=>p.fichier.endsWith('01.jpg'));if(!photo)throw Error('photo absente manifeste');photo.sha256=hash(f);fs.writeFileSync(mf,JSON.stringify(j,null,2))
      trace.actions.at(-1).exif_octets=meta.exif.length
    }else if(cas==='photo'){
      const f=path.join(destination,'photos/01.jpg');await rewrite(f,p=>sharp(p).modulate({brightness:0.3}).jpeg().toBuffer())
      // Le manifeste reste strictement inchangé.
    }else if(cas==='mentionPack'||cas==='mentionStudio'||cas==='filigrane'){
      const isPack=cas==='mentionPack',f=path.join(destination,isPack?'sortie/video-2.mp4':'echantillon-1/sortie/echantillon.mp4'),temp=f+'.nouveau.mp4'
      let zone,enable
      if(isPack){zone={x:0,y:1450,largeur:1080,hauteur:470};enable='between(t,5,8)'}
      else{const c=JSON.parse(fs.readFileSync(path.join(ROOT,'gabarits-pubs/studio/contrat-habillage.json'),'utf8'));zone=cas==='filigrane'?c.zone_filigrane:c.zone_mention;enable=cas==='filigrane'?'between(t,6,9)':'lt(t,1)'}
      const before=hash(f),filter=`drawbox=x=${zone.x}:y=${zone.y}:w=${zone.largeur}:h=${zone.hauteur}:color=black:t=fill:enable='${enable}'`
      const r=invoke('ffmpeg',['-y','-v','error','-threads','2','-i',f,'-vf',filter,'-c:v','libx264','-threads','2','-preset','veryfast','-b:v','3600k','-minrate','3600k','-maxrate','3600k','-bufsize','1800k','-x264-params','nal-hrd=cbr:force-cfr=1','-c:a','copy',temp],ROOT)
      if(r.status!==0)throw Error('masque ffmpeg : '+r.stderr.slice(0,400));fs.renameSync(temp,f);trace.actions.push({fichier:path.relative(destination,f),avant_sha256:before,apres_sha256:hash(f),filtre:filter})
    }else if(cas==='age'){
      const f=path.join(destination,'sortie/fiche-10-min.md');fs.appendFileSync(f,'\nCiblez les personnes de trente à cinquante ans : réglez l’âge et le genre.\n');trace.actions.push({fichier:path.relative(destination,f),texte:'âge et genre',meta_logement:'oui'})
    }else if(cas==='recommandation'){
      const f=path.join(destination,'echantillon-1/script.json'),j=JSON.parse(fs.readFileSync(f,'utf8'));j.lignes.push('Je recommande ce produit.');fs.writeFileSync(f,JSON.stringify(j,null,2));trace.actions.push({fichier:path.relative(destination,f),ligne:j.lignes.at(-1)})
    }else if(cas==='produit'){
      const f=path.join(destination,'produit.jpg');await rewrite(f,p=>sharp(p).negate().jpeg().toBuffer())
    }else if(cas==='regard'){
      const f=path.join(destination,'echantillon-1/regard.json'),autre=path.join(destination,'autre-planche.jpg');await sharp({create:{width:960,height:1280,channels:3,background:'#c03050'}}).jpeg().toFile(autre)
      const j=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{};j.planche_sha256=hash(autre);fs.writeFileSync(f,JSON.stringify(j,null,2));trace.actions.push({fichier:path.relative(destination,f),planche_sha256:j.planche_sha256,autre_planche_sha256:hash(autre)})
    }
  }
  fs.writeFileSync(path.join(destination,'inspection-mutation.json'),JSON.stringify(trace,null,2)+'\n')
  console.log('Fixture publique réelle : '+destination)
}
