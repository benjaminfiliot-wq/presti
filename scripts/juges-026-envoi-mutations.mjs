import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

// 026-099 : copies isolées, fautes réelles, verdicts nommés. Aucun juge ni témoin n'est corrigé ici.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const known = /^(?:--lister|--garder|--seul=[A-Z0-9-]+)$/
if (args.some(a => !known.test(a))) { console.error('Options : --lister, --garder, --seul=<critere>'); process.exit(2) }
const KEEP = args.includes('--garder'), LIST = args.includes('--lister'), ONLY = args.find(a=>a.startsWith('--seul='))?.slice(7)
const PROOF = path.join(ROOT,'.orchestre/preuves/026-099')
const WORK = path.join(ROOT,'.orchestre/travail/026-099',String(process.pid))
const LIMIT = 19 * 60_000, start = Date.now()
const catalogue = []
const src = f => fs.readFileSync(path.join(ROOT,f),'utf8')
function add(juge, options, critere, fichier, regex, transformer, nom) {
  catalogue.push({juge:`scripts/${juge}-qa.mjs`,options,critere,fichier,regex,transformer,nom})
}
const F='lib/agents/acquisition/facteur.ts',G='lib/agents/acquisition/porteurs/gmail.ts',E='lib/agents/acquisition/envoiMeta.ts'
const D='lib/agents/acquisition/disjoncteurs.ts',J='lib/agents/acquisition/jauges.ts',M='lib/agents/acquisition/metaWebhooks.ts',R='lib/agents/acquisition/repondeur.ts'
const SQL='supabase/migrations/0111_acquisition_envoi.sql',P='scripts/agents/porteur-formulaire.mjs',T='app/api/usine/porteur/travail/route.ts',V='scripts/agents/maquette-video.mjs'
const reg=(j,o,c,f,r,a,n)=>add(j,o,c,f,r,()=>a,n)
// Disjoncteurs : deux fautes droits, deux seuils, ouverture interdite et deux fuites/logiques.
add('disjoncteurs','--partie=sql','DJ-2',SQL,/create or replace function public\.acq_signal\([^\n]+/,a=>a.replace('security definer','security invoker'),'fonction exposée sans security definer')
add('disjoncteurs','--partie=sql','DJ-2',SQL,/grant execute on function public\.acq_signal\([^;]+;/,a=>a.replace('service_role','authenticated'),'grant authenticated')
add('disjoncteurs','--partie=sql','DJ-3',SQL,/if v_echecs\s*>=\s*3 then/,a=>a.replace('3','4'),'quatrième échec au lieu du troisième')
add('disjoncteurs','--partie=sql','DJ-3',SQL,/\('P4',40,null,[^\n]+/,a=>a.replace("'P4',40","'P4',60"),'P4 à soixante')
add('disjoncteurs','--partie=sql','DJ-4',SQL,/create or replace function public\.acq_palier_appliquer\(\)[\s\S]*?\bbegin\b/,a=>a+"\n update ops.interrupteurs set actif=true where nom='envoi_froid';",'palier ouvre le froid')
reg('disjoncteurs','--partie=logique','DJ-7',D,/    if \(envoi\.technologie[^\n]+technologie_en_pause[^\n]+/,'','technologie en pause acceptée')
add('disjoncteurs','--partie=logique','DJ-7',D,/return cartes\[evenement\.type\] \?\? [^\n]+/,a=>a.replace("titre: 'Signal d’envoi'","titre: evenement.resume ?? 'Signal d’envoi'"),'donnée prospect dans carte')
// Jauges : omission, seuil, fuseau, écriture au plafond, environnement impur.
reg('jauges','','JG-2',J,/  definition\(\{ id: 'publora'[^\n]+/,'','jauge Publora omise')
add('jauges','','JG-3',J,/part >= 0\.75/,a=>a.replace('0.75','0.80'),'attention retardée')
add('jauges','','JG-4',J,/timeZone: 'Europe\/Paris'/,a=>a.replace('Europe/Paris','UTC'),'période UTC')
reg('jauges','','JG-4',J,/  if \(utilise \+ n > plafond\) return false/,'','jauge consommée malgré plafond')
add('jauges','','JG-6',J,/export const JAUGES:/,a=>"const environnementFautif = process.env.PATH\n"+a,'process.env dans module pur')
// Facteur et porteurs.
reg('facteur','--partie=facteur','FA-2',F,/if \(typeof lecteur !== 'function'\) \{[^\n]+return rendus \}/,"if (typeof lecteur !== 'function') return [{ envoi_id: travail.envois[0]?.id, empreinte: travail.envois[0]?.empreinte, j2: { verdict: 'ok', raisons: [] }, j2_version: 'fautive' }]",'lecteur absent rend avis approuvant')
reg('facteur','--partie=facteur','FA-2',F,/const j3 = jugerMessage\(entree\)/,"const j3 = { ok: true, raisons: [] }",'J3 non rejoué')
reg('facteur','--partie=facteur','FA-14','app/api/usine/facteur/avis/route.ts',/  if \(typeof corps\.j2_version[^\n]+return null/,'','version du second juge non validée')
add('facteur','--partie=facteur','FA-13','app/api/usine/facteur/travail/route.ts',/empreinte: e\.empreinte \}\)\)/,a=>a.replace('empreinte: e.empreinte','empreinte: e.empreinte, destinataire: e.destinataire'),'adresse du destinataire exposée')
add('facteur','--partie=facteur','FA-12','app/api/usine/facteur/avis/route.ts',/const AGENT = 'facteur'/,a=>a.replace("'facteur'","'facteur_usine'"),'jeton du mauvais agent accepté')
reg('facteur','--partie=facteur','FA-3',F,/  if \(brut\.statut !== undefined && brut\.statut !== 'approuve'\) return 'statut'/,'','envois prepare traités comme approuvés')
reg('facteur','--partie=facteur','FA-4',G,/\.\.\.\(enReponseA \? \{ inReplyTo: enReponseA \} : \{\}\),/,'','In-Reply-To omis')
reg('facteur','--partie=facteur','FA-5',F,/await magasin\.signal\(\{ type: 'gmail_refus'[^\n]+\}\)/,'void 0','refus SMTP sans signal')
add('facteur','--partie=facteur','FA-6',F,/!\(jusqua > maintenant\) \|\| dejaFaite/,a=>a.replace('jusqua > maintenant','jusqua + 86400_000 > maintenant'),'réponse privée valable huit jours')
add('facteur','--partie=facteur','FA-6',E,/messaging_type: 'RESPONSE', message: \{ text: texte \}/,a=>a.replace("messaging_type: 'RESPONSE',","messaging_type: 'RESPONSE', tag: 'HUMAN_AGENT',"),'tag humain interdit')
reg('facteur','--partie=facteur','FA-8','app/api/cron/facteur/route.ts',/  if \(!pause \|\| pause\.active\) return NextResponse\.json\(\{ pause: true \}\)/,'','route ignore pause')
add('facteur','--partie=facteur','FA-9',F,/const bilan: BilanFacteur =/,a=>"console.log(deps.adresseReponse)\n  "+a,'adresse dans journal')
add('facteur','--partie=facteur','FA-10',F,/const envois = await magasin\.envoisApprouves\('email_sollicite', ENVOIS_MAX_PAR_CANAL\)/,a=>a.replace('email_sollicite','formulaire_site'),'Facteur porte formulaires')
reg('facteur','--partie=porteur --ici','PF-3','lib/agents/acquisition/porteurFormulaire.ts',/  if \(\/recaptcha[^\n]+raison: 'captcha'[^\n]+/,'','captcha soumis')
reg('facteur','--partie=porteur --ici','PF-8',P,/if \(verrou === 'occupe'\) return 'passe'/,'','verrou envoi_id omis')
reg('facteur','--partie=porteur --ici','PF-6',T,/[^\n]*acq_porteur_verifier[^\n]*/,"      const data = { ok: true, empreinte_texte: '0'.repeat(64) }, error = null",'relecture opposition supprimée')
reg('facteur','--partie=porteur --ici','PF-6',T,/  if \(!fenetreOuverte\(new Date\(maintenant\)\)\) return rien\(\)/,'','hors heures ouvrées accepté')
add('facteur','--partie=porteur --ici','PF-11',T,/const releveFrais = [^\n]+/,()=>"const releveFrais = (_iso, _maintenant) => true",'relève Gmail ignorée')
add('facteur','--partie=porteur --ici','PF-12',P,/return cible\.screenshot\(\{[^\n]+/,a=>a.replace('cible.screenshot','page.screenshot').replace("{ type:","{ fullPage: true, type:"),'capture entière page')
add('facteur','--partie=porteur --ici','PF-13',P,/async function abandonner\([^\n]+\{/,a=>a+"\n  dossier0700(dossierEnvoi); ecrire0600(path.join(dossierEnvoi, 'avant.jpg'), Buffer.from('capture fautive'))",'capture sur abandon')
reg('facteur','--partie=gmail','GM-4',G,/if \(destinataires\.length > 0 && !destinataires\.includes\(adresse\)\) continue/,'','message autre boîte relevé')
add('facteur','--partie=gmail','GM-2',G,/export const nettoyerMotDePasse = [^\n]+/,()=>"export const nettoyerMotDePasse = (p: string): string => p",'espaces mot de passe conservés')
// SQL garde : seconde soumission à vie.
reg('prospection-sql','--sans-essai','PG-4','supabase/migrations/0099_ops_garde_envois.sql',/raise exception using message = 'ops:formulaire_deja', errcode = 'P0001';/,'null;','second formulaire même entreprise accepté')
// Webhooks Meta : signature, jeton, ordre, aimant, STOP, profil.
reg('meta-webhooks','','MW-2',M,/crypto\.timingSafeEqual\(propose, attendu\)/,"propose.toString('hex') === attendu.toString('hex')",'comparaison signature non constante')
reg('meta-webhooks','','MW-3','app/api/webhooks/meta/route.ts',/ \|\| jeton === null \|\| !memeChaine\(jeton, attendu\)/,'','challenge sans jeton vérifié')
add('meta-webhooks','','MW-4','app/api/webhooks/meta/route.ts',/if \(!verifierSignature\(brut,[^\n]+/,a=>"JSON.parse(new TextDecoder().decode(brut))\n  "+a,'JSON analysé avant signature')
reg('meta-webhooks','','MW-5',M,/return [^\n]+(?:site|SITE)[^\n]+/,"return String(texte).toLowerCase().includes('site')",'site accepté en sous-chaîne')
reg('meta-webhooks','','MW-7',M,/await magasin\.opposer\(cles, 'stop', 'webhook_meta'\)/,'void 0','STOP sans opposition')
add('meta-webhooks','','MW-8',M,/const rempli: ConversationPartielle = \{[^\n]+/,a=>a.replace('{ ...c,','{ ...c, ...profil,'),'profil entier rangé')
// Répondeur : classes, identitéIA, fenêtre, STOP, empreinte, modèles et route.
add('repondeur','','RP-2',R,/const CLASSES_AVEC_REPONSE:[^\n]+/,a=>a.replace("['question'","['sensible', 'question'"),'sensible reçoit une réponse')
reg('repondeur','','RP-3',R,/const IA = "assistant IA de Presti"/,"const IA = 'Presti'",'mention IA supprimée')
add('repondeur','','RP-5',R,/!\(jusqua > deps\.horloge\.maintenant\(\)\)/,a=>a.replace('jusqua > deps.horloge.maintenant()','jusqua + 86400_000 > deps.horloge.maintenant()'),'huitième jour accepté')
add('repondeur','','RP-6',R,/const r = await deps\.magasin\.preparerEnvoi\(envoi\)/,a=>a+"\n  if (!r.ok && d.type === 'confirmation_stop') { const bis = await deps.magasin.preparerEnvoi({ ...envoi, type: 'reponse' }); if (bis.ok) return { etat: 'ok', envoi_id: bis.id } }",'second STOP contourne refus avec une réponse')
reg('repondeur','','RP-7',R,/\(ctx\.deps\.hacherJeton \?\? hacherJetonReel\)\(jeton\)/,'jeton','jeton rendez-vous brut')
reg('repondeur','','RP-8',R,/  if \(modele\.approuve === false\) return [^\n]+/,'','modèle non approuvé utilisé')
reg('repondeur','','RP-9','app/api/cron/repondeur/route.ts',/if \([^\n]+(?:CRON_SECRET|secret|jeton)[^\n]+(?:401|403)[^\n]*/,'','route sans authentification cron')
// Rendez-vous.
reg('rendez-vous','','RV-2','lib/agents/acquisition/rendezVous.ts',/jours: Object\.freeze\(\[1, 2, 3, 4, 5\]\)/,'jours: Object.freeze([1, 2, 3, 4, 5, 6])','créneau samedi')
add('rendez-vous','','RV-3','app/rendez-vous/[jeton]/route.ts',/!lien\.expire_le \|\| Date\.parse\(lien\.expire_le\) <= Date\.now\(\)/,a=>a.replace('Date.parse(lien.expire_le) <= Date.now()','false'),'jeton expiré actif')
reg('rendez-vous','','RV-4','lib/agents/acquisition/rendezVous.ts',/\$\{echapper\(metier\)\}/,'${metier}','métier non échappé')
reg('rendez-vous','','RV-5','app/rendez-vous/[jeton]/route.ts',/  if \(req\.headers\.get\('origin'\)[^\n]+/,'','Origin non vérifié')
reg('rendez-vous','','RV-5','app/rendez-vous/[jeton]/route.ts',/magasinSupabase\.reserverRdv\(empreinte, valide\.creneau, valide\.telephone\)/,'magasinSupabase.reserverRdv(jeton, valide.creneau, valide.telephone)','jeton brut à la réservation')
add('rendez-vous','','RV-6','app/rendez-vous/[jeton]/route.ts',/corps: 'Le numéro est dans le Poste, carte « À appeler »\.'/ ,()=>"corps: `Téléphone : ${valide.telephone}`",'téléphone dans alerte')
// Vidéo : audio lavfi réelle, durée, mouvement, autre hôte, shell.
add('maquette-video','','MV-2',V,/\['-y', '-v', 'error', '-loop', '1',[^\n]+cible\]/,a=>a.replace("'-i', sortieTemporaire,","'-i', sortieTemporaire, '-f', 'lavfi', '-i', 'sine=frequency=440',").replace("'-an',","'-c:a', 'aac', '-shortest',"),'piste audio ajoutée')
reg('maquette-video','','MV-2',V,/'-t', String\(duree\)/,"'-t', '25'",'durée vingt-cinq secondes')
reg('maquette-video','','MV-3',V,/\(in_h-out_h\)\*min\(1,max\(0,\(t-1\.5\)\/\(\$\{duree\}-3\)\)\)/,'0','défilement supprimé')
reg('maquette-video','','MV-5',V,/return demande\.origin === serveur\.adresse \? route\.continue\(\) : route\.abort\(\)/,'return route.continue()','requêtes autre hôte autorisées')
add('maquette-video','','MV-7',V,/stdio: 'ignore', windowsHide: true/,a=>a+', shell: true','shell actif ffmpeg')
// Douleurs toujours en dernier, jamais parallélisées.
const DL='lib/agents/acquisition/douleurs.ts'
add('douleurs','','DL-2',DL,/question: "Quand une même demande[^"\n]+\?"/,a=>a.replace(' ?"','"'),'question sans interrogation')
add('douleurs','','DL-2',DL,/\{ id: "plombier-manque-clientele"[^\n]+/,a=>a.replace('approuve: false','approuve: true'),'douleur approuvée sans décision')
add('douleurs','','DL-3',DL,/citation: "la plateforme vens[^"\n]+"/,a=>a.replace('citation: "','citation: "u/personne-fictive '),'pseudo dans citation')
add('douleurs','','DL-4',DL,/citation: "la plateforme vens[^"\n]+"/,a=>a.replace('plateforme','aubergine'),'citation ne correspond plus à sa source')
add('douleurs','','DL-5',DL,/question: "Quand une même demande[^"\n]+\?"/,a=>a.replace(' ?"',' sans engagement ?"'),'promesse sans engagement')

function prepare(spec) {
 const text=src(spec.fichier),matches=[...text.matchAll(new RegExp(spec.regex.source,'g'))]
 if(matches.length!==1)throw Error(`${spec.critere} ${spec.nom}: ancre présente ${matches.length} fois dans ${spec.fichier}`)
 const avant=matches[0][0],apres=spec.transformer(avant)
 if(avant===apres)throw Error(`${spec.critere}: mutation sans changement (${spec.nom})`)
 return {...spec,avant,apres}
}
const selected=catalogue.filter(m=>!ONLY||m.critere===ONLY),mutations=[],failures=[]
for(const s of selected){try{mutations.push(prepare(s))}catch(e){failures.push(e.message)}}
fs.mkdirSync(PROOF,{recursive:true})
if(LIST){console.log(JSON.stringify({catalogue:catalogue.length,prepared:mutations.length,criteres:[...new Set(catalogue.map(m=>m.critere))],erreurs:failures},null,2));process.exit(failures.length?1:0)}
const report={mutations:[],temoins:[],erreurs:failures}
function save(){fs.writeFileSync(path.join(PROOF,'mutations.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(PROOF,'mutations.md'),'# Contre-vérification026-099\n\n'+(report.erreurs.length?'## Échecs\n'+report.erreurs.map(e=>'- '+e).join('\n')+'\n\n':'')+report.mutations.map(m=>`- ${m.critere} : ${m.nom} ; ${m.extrait}`).join('\n')+'\n')}
function erase(dir){const rel=path.relative(WORK,dir);if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('suppression hors travail');for(const n of fs.readdirSync(dir)){const f=path.join(dir,n),st=fs.lstatSync(f);if(st.isSymbolicLink())fs.unlinkSync(f);else if(st.isDirectory())erase(f);else fs.unlinkSync(f)}fs.rmdirSync(dir)}
let archiveBase = null, overlays = null
function git(argv){const r=spawnSync('git',argv,{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw Error(`git ${argv[0]}: ${r.stderr}`);return r.stdout}
function base(){
 if(archiveBase)return
 archiveBase=path.join(WORK,'base-HEAD.tar')
 git(['archive','--format=tar',`--output=${archiveBase}`,'HEAD'])
 const changed=git(['diff','--name-only','HEAD','-z']).split('\0')
 const added=git(['ls-files','--others','--exclude-standard','-z']).split('\0')
 overlays=[...new Set([...changed,...added])].filter(f=>f&&!f.startsWith('.orchestre/')&&!f.startsWith('.media-travail/')&&!f.startsWith('node_modules/')&&!f.startsWith('public/')&&!/(^|\/)\.env(?:\.|$)/.test(f))
}
function copy(dir){
 base();fs.mkdirSync(dir,{recursive:true})
 const extracted=spawnSync('tar',['-xf',archiveBase,'-C',dir],{cwd:ROOT,encoding:'utf8',maxBuffer:1024*1024})
 if(extracted.status!==0)throw Error(`archive HEAD: ${extracted.stderr}`)
 // HEAD sert de baseline ; les fichiers modifiés/ajoutés du chantier recouvrent cette copie, jamais le dépôt source.
 for(const f of overlays){
  const source=path.join(ROOT,f),target=path.join(dir,f)
  const rel=path.relative(dir,target);if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('overlay hors copie')
  if(!fs.existsSync(source)){if(fs.existsSync(target)&&fs.lstatSync(target).isFile())fs.unlinkSync(target);continue}
  const st=fs.lstatSync(source);if(!st.isFile())continue
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target)
 }
 for(const n of ['node_modules','public']){
  const target=path.join(dir,n)
  if(fs.existsSync(target)){if(fs.lstatSync(target).isSymbolicLink())fs.unlinkSync(target);else erase(target)}
  if(fs.existsSync(path.join(ROOT,n)))fs.symlinkSync(path.join(ROOT,n),target,process.platform==='win32'?'junction':'dir')
 }
}
function command(m){return `node --import ./scripts/ts-loader.mjs ${m.juge}${m.options?' '+m.options:''} --racine={racine}`}
async function run(m,dir){
 if(Date.now()-start>=LIMIT)throw Error('budget global19minutes dépassé')
 const at=Date.now(),opts=m.options?m.options.split(' '):[]
 return await new Promise(resolve=>{
  const child=spawn(process.execPath,['--import','./scripts/ts-loader.mjs',m.juge,...opts,`--racine=${dir}`],{cwd:dir,detached:process.platform!=='win32',env:{...process.env,FORCE_COLOR:'0',NO_COLOR:'1'}})
  let sortie='',expired=false
  const timer=setTimeout(()=>{expired=true;if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F']);else try{process.kill(-child.pid,'SIGKILL')}catch{}},Math.min(180000,LIMIT-(Date.now()-start)))
  for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{if(sortie.length<8*1024*1024)sortie+=d.toString()})
  child.on('error',e=>{clearTimeout(timer);resolve({code:2,sortie,error:e.message,duree_s:(Date.now()-at)/1000})})
  child.on('close',code=>{clearTimeout(timer);resolve({code:expired?124:code,sortie,error:expired?'delai':null,duree_s:(Date.now()-at)/1000})})
 })
}
function verdict(text,id){const lines=text.replace(/\x1b\[[0-9;]*m/g,'').split(/\r?\n/),proper=lines.filter(l=>l.startsWith(`FAIL ${id} — `)),bilan=lines.filter(l=>/ : FAIL — /.test(l)).at(-1);return proper.length===1&&bilan?.split(' — ').at(-1).split(/,\s*/).includes(id)?proper[0]:null}
try{
 if(failures.length)throw Error('préflight incomplet : aucun juge lancé')
 fs.mkdirSync(WORK,{recursive:true});const copies=new Map()
 for(const m of mutations){const key=m.juge+' '+m.options;if(copies.has(key))continue;const dir=path.join(WORK,String(copies.size));copy(dir);copies.set(key,dir);const r=await run(m,dir);console.log(`TÉMOIN ${key}: code ${r.code}, ${r.duree_s.toFixed(1)} s`);report.temoins.push({commande:command(m),code:r.code,duree_s:r.duree_s});if(r.code!==0)report.erreurs.push(`témoin ${key}: code${r.code}: ${r.sortie.slice(-500)}`)}
 if(report.erreurs.length)throw Error('témoin rouge : aucune faute testée')
 let passage=0;for(const m of mutations){passage++;const dir=copies.get(m.juge+' '+m.options),file=path.join(dir,m.fichier),original=fs.readFileSync(file,'utf8');let result;try{fs.writeFileSync(file,original.replace(m.avant,()=>m.apres));result=await run(m,dir)}finally{fs.writeFileSync(file,original)}const extrait=verdict(result.sortie,m.critere);console.log(`${extrait&&result.code===1&&!result.error?'DÉTECTÉE':'NON DÉTECTÉE'} ${passage}/${mutations.length} ${m.critere} ${m.nom}: code ${result.code}, ${result.duree_s.toFixed(1)} s`);fs.writeFileSync(path.join(PROOF,`${passage}-${m.critere}.log`),result.sortie);if(result.code!==1||result.error||!extrait)report.erreurs.push(`non détectée ${m.critere} ${m.nom}: code${result.code}; ${result.sortie.slice(-300)}`);else report.mutations.push({juge:m.juge,commande:command(m),fichier:m.fichier,avant:m.avant,apres:m.apres,critere:m.critere,extrait,duree_s:result.duree_s,nom:m.nom});save()}
}catch(e){report.erreurs.push(e.message)}finally{save();if(!KEEP&&fs.existsSync(WORK))for(const f of fs.readdirSync(WORK)){const item=path.join(WORK,f);if(fs.lstatSync(item).isDirectory())erase(item);else fs.unlinkSync(item)}}
console.log(`juges-026-envoi-mutations : ${report.erreurs.length?'FAIL':'PASS'} — ${report.mutations.length}/${mutations.length} fautes détectées`)
process.exitCode=report.erreurs.length?1:0
