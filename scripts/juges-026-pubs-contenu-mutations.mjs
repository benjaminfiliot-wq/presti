#!/usr/bin/env node
// 026-159 : catalogue fermé du contrat ; aucun PASS si une faute reste non préparée.
//
// Contre-vérifie les dix juges du domaine pubs et contenu : sur une COPIE du dépôt (jamais en place), le juge est lancé intact (témoin :
// code 0 attendu) puis une faute réelle posée dans la copie (code 1 attendu, avec « FAIL <critère> — » une seule fois et le bilan qui
// nomme le critère). La faute est ôtée octet pour octet après chaque lancement. Les juges tournent depuis la racine du dépôt, sur la copie
// passée par --racine (le méta-juge 026-001 rejoue la commande écrite dans le rapport).
//
// Quatre issues par faute : DÉTECTÉE · NON ATTRAPÉE (le juge a fini et laisse passer la faute : découverte, rapport en tête, code 1,
// aucun juge corrigé ici) · NON JUGÉE (délai, sortie vide) · AUTRE CRITÈRE. Code 0 seulement si toutes sont DÉTECTÉES et tous les témoins verts.
//
// Options : --lister (préflight : chaque ancre présente une seule fois) · --temoins (témoins seulement) · --groupe=<juge> · --partie=<p> ·
// --cas=<média> · --critere=<ID> · --sauf=<juge[:partie],…> · --pool=1|2 · --reprendre (reprend un rapport précédent : jamais le méta-juge) ·
// --minutes=<n> (budget global, 48 par défaut) · --garder · --recuperer-medias (pose une fois les entrées publiques des fautes média).
// Écrit sous .orchestre/preuves/026-159/ (mutations.json lu par le méta-juge, mutations.md, un journal par lancement) et sous
// .orchestre/travail/026-159/ (copies, supprimées en fin de lancement, jonction node_modules retirée par unlink).
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
  plan: false,
}
if(options.some(a=>a.startsWith('--produire-media=')||a.startsWith('--juger-media='))){
  try { await mediaMode(options); } catch(e) { console.error('Fabrication média refusée : '+e.message); process.exitCode=2; }
  process.exit(process.exitCode??0)
}
// --recuperer-medias : pose, une fois, les deux jeux d'entrées publics des fautes média sous .orchestre/preuves/026-159/entrees/
// (le pack témoin fabriqué par fixtures/026-pubs-contenu/pack/fabriquer-temoin.mjs ; l'échantillon témoin (marque fictive) de
// pub-qa --temoin) et écrit recuperation-medias.json (groupe, fichier, sha256, taille) que --juger-media relit : une entrée altérée
// est refusée. Refuse d'écraser des entrées existantes. Marque et produit fictifs, aucune donnée réelle.
if(options.includes('--recuperer-medias')){
  try{
    // La marque fictive du témoin de pub-qa n'est jamais écrite ici : studio-garde-qa (SG-5) refuse son nom hors des jeux d'essai.
    const tm=path.join(ROOT,'.orchestre/travail/pub-qa/temoin'),marque=fs.existsSync(tm)?fs.readdirSync(tm).find(n=>fs.existsSync(path.join(tm,n,'echantillon-1'))):null
    const sources={pack:path.join(ROOT,'.orchestre/travail/026-pubs-contenu/pack-temoin'),studio:path.join(tm,marque??'absente')}
    const base=path.join(PROOF,'entrees'),manifeste=[],hashF=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
    if(fs.existsSync(base)||fs.existsSync(path.join(PROOF,'recuperation-medias.json')))throw Error('entrées déjà posées : rien n’est écrasé')
    const parcourir=(source,dest,groupe,racine)=>{fs.mkdirSync(dest,{recursive:true});for(const n of fs.readdirSync(source).sort()){
      const f=path.join(source,n),d=path.join(dest,n),st=fs.lstatSync(f)
      if(st.isSymbolicLink())throw Error('lien refusé : '+f)
      if(st.isDirectory()){if(n==='_snap-visuel')continue;parcourir(f,d,groupe,racine);continue}
      if(!/\.(json|jpg|html|mp3|mp4|md|txt)$/i.test(n)||/secret|\.env|token|password/i.test(n)||!st.size)continue
      fs.copyFileSync(f,d);manifeste.push({groupe,fichier:path.relative(racine,d).split(path.sep).join('/'),sha256:hashF(d),taille:fs.statSync(d).size})}}
    for(const [g,src] of Object.entries(sources)){if(!fs.existsSync(src))throw Error('source absente : '+path.relative(ROOT,src));parcourir(src,path.join(base,g),g,path.join(base,g))}
    fs.writeFileSync(path.join(PROOF,'recuperation-medias.json'),JSON.stringify(manifeste,null,2)+'\n')
    console.log('Entrées posées : '+manifeste.length+' fichiers ('+manifeste.filter(e=>e.groupe==='pack').length+' pack, '+manifeste.filter(e=>e.groupe==='studio').length+' studio)')
  }catch(e){console.error('Récupération refusée : '+e.message);process.exitCode=2}
  process.exit(process.exitCode??0)
}
if(options.some(a=>!/^(?:--lister|--temoins|--garder|--groupe=[a-z-]+|--groupes=[a-z-]+,[a-z-]+|--partie=[a-z]+|--cas=[a-zA-Z]+|--minutes=[0-9]+|--pool=[12]|--reprendre|--critere=[A-Z0-9-]+|--sauf=[a-z:,-]+)$/.test(a))){console.error('Options : --lister, --temoins, --garder, --groupe=<juge>, --groupes=<deux juges>, --partie=<partie>, --cas=<cas>');process.exit(2)}
const ONLY=options.find(a=>a.startsWith('--groupe='))?.slice(9),LIST=options.includes('--lister'),WITNESS=options.includes('--temoins'),KEEP=options.includes('--garder')
const MULTI=options.find(a=>a.startsWith('--groupes='))?.slice(10).split(',')
if(MULTI&&(ONLY||new Set(MULTI).size!==2)){console.error('--groupes attend deux groupes distincts, sans --groupe');process.exit(2)}
// Budget global : 48 min (la série complète dure bien plus de 20 min : voir mutations.md, « Durée »). Le méta-juge (MP-1) ne laisse que
// 20 min au script, sauf dérogation par fiche (comme 026-091) : sans elle il coupe avant la fin et le verdict est un délai.
const LIMIT=(Number(options.find(a=>a.startsWith('--minutes='))?.slice(10))||48)*60_000, catalogue=[]
const SAUF=(options.find(a=>a.startsWith('--sauf='))?.slice(7)??'').split(',').filter(Boolean)
const POOL=Number(options.find(a=>a.startsWith('--pool='))?.slice(7)||2),RESUME=options.includes('--reprendre'),CRIT=options.find(a=>a.startsWith('--critere='))?.slice(10)
const add=(g,c,f,re,transform,nom,opts=[])=>catalogue.push({n:catalogue.length+1,g,juge:`scripts/${g}-qa.mjs`,critere:c,fichier:f,re,transform,nom,opts})
const replace=(g,c,f,re,after,nom,opts)=>add(g,c,f,re,()=>after,nom,opts)
const pending=(g,c,nom,raison)=>catalogue.push({n:catalogue.length+1,g,juge:`scripts/${g}-qa.mjs`,critere:c,nom,pending:raison})
const media=(g,c,cas,nom)=>{add(g,c,'scripts/juges-026-pubs-contenu-mutations.mjs',new RegExp('  '+cas+': false,'),a=>a.replace('false','true'),nom,['--juger-media='+(cas==='age'?cas:g==='pub'?'studio':'pack')]);catalogue.at(-1).media=cas}
// Écarts entre la liste de la fiche et les juges tels qu'ils sont aujourd'hui (écrits dans mutations.md, jamais cachés).
const ECARTS=[
  "CR-10 : la fiche nomme CR-10 « le battement crieur appelé aussi en mode à sec » ; 026-122 l’a renommé CR-16 (CR-10 est devenu « un seul *_crieur.sql, numéro unique », partie horloge). La faute est jugée sur CR-16 ; une faute sur CR-10 ne s’écrit pas comme un remplacement de texte (elle exige un second fichier de migration). La liste du méta-juge (« CR-10 ») est périmée.",
  "PQ-9 : la fiche parle d’un regard.json d’une autre planche ; PQ-9 ne lit plus de regard.json (réécrit le 25/09, 026-128) et mesure que chaque plan est une transformation de produit.jpg. La faute jugée est un plan où le produit est remplacé par un aplat de 4 à 9 s.",
  "PB-8 : la fiche parle de la migration changée d’un caractère après l’essai à sec ; PB-8 relit l’empreinte du jumeau nu que l’essai à sec a exécuté (la migration seule est la faute de PB-5, aussi mutée).",
  "SG-4 : la faute est la permutation réelle des étapes 9 (Benj regarde) et 11 (envoi) de docs/studio/seance.md.",
  "SP-2 et SP-4 : video-qa.mjs et visages-qa.mjs sont mutés eux-mêmes, dans la copie ; une seule entrée par faute (les deux entrées « explicites » du premier jet étaient des doublons exacts).",
]
const SQL='supabase/migrations/0102_packs_pubs.sql',CGU='app/cgu/page.tsx',PACK='lib/packPub.ts',P='app/api/controle/packs/[id]/route.ts'
add('pack-pub-base','PB-3',SQL,/revoke all on public\.packs_pubs from public, anon, authenticated;/,a=>a+'\ncreate policy "mutation ecriture" on public.packs_pubs for insert with check (true);','politique écriture ajoutée')
add('pack-pub-base','PB-4',SQL,/values \('packs-pubs', 'packs-pubs', false, 20971520\)/,a=>a.replace('false','true'),'bucket public')
replace('pack-pub-base','PB-3',SQL,/revoke all on public\.packs_pubs from public, anon, authenticated;/,'','revoke retiré')
add('pack-pub-base','PB-2',SQL,/check \(etat in \('brouillon', 'payee', 'fabriquee', 'livree'\)\)/,a=>a.replace(", 'livree'",''),'état livree retiré')
// PB-8 relit l'empreinte du JUMEAU NU que l'essai à sec a exécuté (pas celle de la migration, que PB-5 lie au jumeau) :
// changer d'un caractère le texte exécuté par l'essai le rend périmé ; changer la migration seule est la faute de PB-5.
add('pack-pub-base','PB-8','supabase/migrations/_A_COLLER_sql_editor_0102_NU.sql',/check \(prix_cents > 0\)/,a=>a.replace('>','>='),'jumeau nu changé après essai à sec')
add('pack-pub-base','PB-5',SQL,/check \(prix_cents > 0\)/,a=>a.replace('>','>='),'migration changée, jumeau inchangé')
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
add('pack-pub-livraison','LV-10','scripts/pack-pub/exporter.mjs',/JSON\.stringify\(\{ pack_id: packId, matiere: ligne\.matiere, site \}/,a=>a.replace('site }','site, email: ligne.email }'),'courriel exporté',['--partie=depot'])
replace('pack-pub-livraison','LV-12','lib/packPubPurge.ts',/pack\.etat === 'livree'/,"['livree', 'fabriquee'].includes(pack.etat)",'purge fabriquee',['--partie=purge'])
replace('pack-pub-livraison','LV-13','lib/packPubPurge.ts',/if \(error\) \{ bilan\.erreurs\.push\(`lecture : \$\{error\.message\}`\); return bilan \}/,'if (error) throw new Error(error.message)','erreur purge levée',['--partie=purge'])
add('socle-pubs','SP-2','scripts/video-qa.mjs',/a\.meta\.largeur === 1080 && a\.meta\.hauteur === 1920/,a=>a.replace('a.meta.hauteur === 1920','[1920, 1350].includes(a.meta.hauteur)'),'format pub trop permissif')
replace('socle-pubs','SP-5','scripts/visages-qa.mjs',/seuil = 0\.9, ips/,'seuil = 0.5, ips','seuil YuNet abaissé')
replace('socle-pubs','SP-4','scripts/visages-qa.mjs',/if \(empreinteReelle !== EMPREINTE\)/,'if (false)','empreinte juge non vérifiée')
replace('socle-pubs','SP-3','scripts/video-qa.mjs',/POIDS_MAX: 1_500_000/,'POIDS_MAX: 1','profil landing changé')
// (Les mutations « juge vidéo » et « juge visages » du socle sont SP-2 et SP-4 ci-dessus : video-qa.mjs et visages-qa.mjs sont mutés eux-mêmes.)
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
// SG-4 : permutation réelle des étapes 9 (« Benj regarde ») et 11 (« envoie ») de la séance : Benj regarde alors après l'envoi.
add('studio-garde','SG-4','docs/studio/seance.md',/9\. Benj regarde[^\n]*\n10\. [^\n]*\n11\. [^\n]*/,bloc=>{const [regard,depot,envoi]=bloc.split('\n').map(l=>l.replace(/^\d+\. /,''));return ['9. '+depot,'10. '+envoi,'11. '+regard].join('\n')},'Benj regarde après l’envoi')
media('pub','PQ-2','mentionStudio','mention absente première seconde')
media('pub','PQ-3','filigrane','filigrane masqué trois secondes')
media('pub','PQ-6','recommandation','je recommande ajouté')
media('pub','PQ-7','produit','photo produit remplacée')
// PQ-9 ne lit plus de regard.json (réécrit par la contre-revue du 25/09, fiche 026-128) : il mesure que chaque plan reste
// une transformation de produit.jpg. La faute réelle est donc un plan où le produit est remplacé (aplat posé sur lui de 4 à 9 s).
media('pub','PQ-9','plan','plan du produit remplacé par un aplat de 4 à 9 s')
add('crieur','CR-16','app/api/cron/crieur/route.ts',/if \(aSec\) return NextResponse\.json\(\{ semaine, lot \}\)/,a=>a.replace('return NextResponse','{ await ops_battement({ p_nom: \'crieur\' }); return NextResponse')+' }','battement aussi à sec',['--partie=route'])
replace('crieur','CR-1','lib/crieur/faits.ts',/motif: 'Factures \+ export XML Factur-X'/,"motif: 'preuve-fautive-introuvable'",'motif inconnu',['--partie=composer'])
replace('crieur','CR-2','lib/crieur/faits.ts',/texte: 'Presti permet de créer des factures et d’en exporter le fichier XML Factur-X\.'/,"texte: 'Presti répond.'",'Presti répond seul',['--partie=composer'])
replace('crieur','CR-3','lib/crieur/composer.ts',/  return resultat\b/,'  return [...resultat, ...resultat.slice(0, 1)]','quatre publications',['--partie=composer'])
add('crieur','CR-7','lib/crieur/publora.ts',/const corps = \{ content: publication\.contenu, platforms: publication\.plateformes,/,a=>a+" scheduledTime: '2030-01-01T00:00:00Z',",'scheduledTime envoyé',['--partie=route'])
replace('crieur','CR-5','app/api/cron/crieur/route.ts',/  if \(!secret \|\| req\.headers\.get\('authorization'\) !== `Bearer \$\{secret\}`\) return NextResponse\.json\(\{ error: 'unauthorized' \}, \{ status: 401 \}\)/,'','jeton non contrôlé',['--partie=route'])
add('crieur','CR-11','supabase/migrations/0104_crieur.sql',/revoke all on public\.crieur_posts from public, anon, authenticated;/,a=>a+'\ncreate policy "fautif" on public.crieur_posts for insert with check (true);','politique Crieur ajoutée',['--partie=horloge'])
replace('crieur','CR-12','supabase/migrations/0104_crieur.sql',/'Bearer ' \|\| v_secret/,"'Bearer jeton-fautif-en-clair'",'jeton appel en clair',['--partie=horloge'])

const PARTIE=options.find(a=>a.startsWith('--partie='))?.slice(9)
const CAS=options.find(a=>a.startsWith('--cas='))?.slice(6)
const selected=catalogue.filter(m=>(!ONLY||m.g===ONLY)&&(!MULTI||MULTI.includes(m.g))&&(!PARTIE||m.opts?.includes('--partie='+PARTIE))&&(!CAS||m.media===CAS)&&(!CRIT||m.critere===CRIT)&&!SAUF.some(x=>x===m.g||x===m.g+':'+(m.opts?.find(o=>o.startsWith('--partie='))?.slice(9)??'')))
const errors=[],prepared=[]
if(!selected.length)errors.push('groupe inconnu : '+ONLY)
for(const m of selected){try{if(m.pending)throw Error(m.pending);const text=fs.readFileSync(path.join(ROOT,m.fichier),'utf8'),hits=[...text.matchAll(new RegExp(m.re.source,'g'))];if(hits.length!==1)throw Error('ancre présente '+hits.length+' fois');const avant=hits[0][0],apres=m.transform(avant);if(avant===apres)throw Error('aucun changement');prepared.push({...m,avant,apres,ligne:text.slice(0,hits[0].index).split('\n').length})}catch(e){errors.push(m.critere+' — '+m.nom+' : '+e.message)}}
if(LIST){const groupes=new Map();for(const m of prepared){const key=m.juge+' '+m.opts.join(' ');if(!groupes.has(key))groupes.set(key,{juge:m.juge,opts:m.opts,fautes:0});groupes.get(key).fautes++}console.log(JSON.stringify({catalogue:catalogue.length,selection:selected.length,prepares:prepared.length,budget_global_ms:LIMIT,timeout_processus_ms:'6 min ; 15 min gabarit ; 12 min pack complet et dépôt',groupes:[...groupes.values()],criteres:[...new Set(catalogue.map(m=>m.critere))],ancres:prepared.map(m=>({juge:m.juge,critere:m.critere,fichier:m.fichier,ligne:m.ligne,nom:m.nom})),erreurs:errors},null,2));process.exit(errors.length?1:0)}
const erreursFixes=[...errors],report={mutations:[],temoins:[],erreurs:[],survivants:[],indetermines:[],autres:[]},start=Date.now(),run=path.join(WORK,String(Date.now())+'-'+process.pid)
fs.mkdirSync(PROOF,{recursive:true});fs.mkdirSync(run,{recursive:true})
// Quatre issues par faute : détectée (code 1 ET « FAIL <critère> — » une seule fois ET bilan qui le nomme) ; non attrapée (le juge a fini
// et reste vert : c'est la découverte que cette fiche cherche) ; non jugée (délai, sortie vide) ; attrapée par un autre critère.
const detectees=new Map(),survivants=new Map(),indetermines=new Map(),autres=new Map(),rang=new Map(),cle=m=>[m.juge,m.opts.join(' '),m.critere,m.nom].join('|')
const parRang=(x,y)=>(rang.get(x[0])??0)-(rang.get(y[0])??0)
const rebuild=()=>{
  const v=map=>[...map.entries()].sort(parRang).map(e=>e[1])
  report.mutations=v(detectees);report.survivants=v(survivants);report.indetermines=v(indetermines);report.autres=v(autres)
  report.erreurs=[...erreursFixes,...report.survivants.map(x=>'MUTATION NON ATTRAPÉE : '+x.critere+' '+x.nom+' — '+x.verdict),...report.indetermines.map(x=>'non jugée : '+x.critere+' '+x.nom+' — '+x.raison),...report.autres.map(x=>x.critere+' '+x.nom+' non attrapée sur son critère — '+x.verdict)]
}
const save=()=>{rebuild();const name=WITNESS?'temoins':'mutations';fs.writeFileSync(path.join(PROOF,name+'.json'),JSON.stringify(report,null,2)+'\n')
  const L=['# 026-159 — '+(WITNESS?'témoins seulement':'contre-mutations des juges pubs et contenu'),'']
  if(report.survivants.length)L.push('## MUTATIONS NON ATTRAPÉES : le juge reste vert sur une vraie faute','','Aucun juge n’a été corrigé ici (règle de la fiche) : chaque ligne rouvre la fiche du juge concerné.','',...report.survivants.map(x=>'- **'+x.critere+'** '+x.nom+' ('+x.juge+', '+x.fichier+') : '+x.commande+' ; verdict réel : '+x.verdict),'')
  if(report.indetermines.length)L.push('## Non jugées (délai ou sortie vide : ni attrapées ni survivantes)','',...report.indetermines.map(x=>'- '+x.critere+' '+x.nom+' : '+x.commande+' ; '+x.raison),'')
  if(report.autres.length)L.push('## Échecs sur un autre critère que celui attendu (non comptés)','',...report.autres.map(x=>'- '+x.critere+' '+x.nom+' : '+x.commande+' ; '+x.verdict),'')
  if(erreursFixes.length)L.push('## Autres erreurs','',...erreursFixes.map(e=>'- NON VALIDÉ : '+e),'')
  L.push('## Écarts entre la fiche et les juges actuels','',...ECARTS.map(e=>'- '+e),'')
  if(report.video_original)L.push('- A1 juge original : '+report.video_original.commande+' ; code '+report.video_original.code+' ; '+JSON.stringify(report.video_original.format),'')
  L.push('## Témoins (copie intacte : code 0 attendu)','',...report.temoins.map(t=>'- Témoin '+t.commande+' : code '+t.code+', '+t.duree_s+' s'+(t.repris?' (repris d’un lancement précédent)':'')),'','## Mutations attrapées (code ≠ 0 sur le critère attendu)','',...report.mutations.map(m=>'- '+m.critere+' '+m.nom+' : '+m.commande+' ; '+m.extrait))
  fs.writeFileSync(path.join(PROOF,name+'.md'),L.join('\n')+'\n')}
const git=(args)=>{const r=spawnSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:64<<20});if(r.status!==0)throw Error('Git authentique indisponible : '+args[0]);return r.stdout}
const files=git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(f=>f&&!/^\.orchestre\//.test(f)&&!/(^|\/)(?:\.env(?:\.|$)|id_rsa|id_ed25519)/.test(f)&&!/\.(?:key|pem)$/i.test(f)&&(/^(?:app|lib|components|scripts|supabase|docs\/agents|docs\/studio|docs\/pubs|gabarits-pubs|public|plans|\.github)\//.test(f)||/^(?:package.*\.json|tsconfig\.json|next-env\.d\.ts|next\.config\.[^/]+|proxy\.ts|vercel\.json)$/.test(f)))
function cleanup(dir){const rel=path.relative(run,dir);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('cleanup hors copie');if(!fs.existsSync(dir))return;for(const n of fs.readdirSync(dir)){const p=path.join(dir,n),st=fs.lstatSync(p);if(st.isSymbolicLink())fs.unlinkSync(p);else if(st.isDirectory())cleanup(p);else fs.unlinkSync(p)}fs.rmdirSync(dir)}
// Windows : un antivirus ou un autre agent verrouille parfois une source (« UNKNOWN: unknown error, copyfile ») ; on réessaie.
function copyFile(source,destination){for(let essai=1;;essai++){try{fs.copyFileSync(source,destination);return}catch(e){if(essai>=8||!/^(?:UNKNOWN|EBUSY|EPERM|EACCES|EMFILE)$/.test(e.code??''))throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,150*essai)}}}
function copy(dir){fs.mkdirSync(dir,{recursive:true});for(const f of files){const p=path.join(ROOT,f);if(!fs.existsSync(p))continue;const st=fs.lstatSync(p);if(st.isSymbolicLink())throw Error('source lien refusée : '+f);if(st.isFile()){const d=path.join(dir,f);fs.mkdirSync(path.dirname(d),{recursive:true});copyFile(p,d)}}for(const f of ['.orchestre/preuves/026-114/essai-a-sec.txt','.orchestre/preuves/026-134/essai-a-sec.txt'])if(fs.existsSync(path.join(ROOT,f))){const d=path.join(dir,f);fs.mkdirSync(path.dirname(d),{recursive:true});fs.copyFileSync(path.join(ROOT,f),d)}if(fs.existsSync(path.join(ROOT,'tsconfig.tsbuildinfo')))copyFile(path.join(ROOT,'tsconfig.tsbuildinfo'),path.join(dir,'tsconfig.tsbuildinfo'));if(fs.existsSync(path.join(ROOT,'node_modules')))fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(dir,'node_modules'),process.platform==='win32'?'junction':'dir')}
// Délai d'UN lancement de juge, selon sa partie : un pack complet (films, transcription, hyperframes) dépasse trois minutes
// même sur un poste libre (186 s mesurés en 026-126) ; les parties de lecture de texte tiennent en quelques secondes.
const delaiDe=m=>m.opts.includes('--juger-media=pack')||m.opts.includes('--partie=depot')?12*60_000:m.opts.includes('--partie=gabarit')?15*60_000:m.opts.includes('--juger-media=studio')||m.opts.includes('--partie=noyau')||m.g==='socle-pubs'?6*60_000:6*60_000
const command=m=>['node',m.media?'scripts/juges-026-pubs-contenu-mutations.mjs':m.juge,...m.opts,'--racine={racine}'].join(' ')
async function judge(m,dir){const remain=LIMIT-(Date.now()-start);if(remain<=0)throw Error('budget global atteint');const begin=Date.now(),env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(SECRET|KEY|TOKEN|PASSWORD|PASSWD|STRIPE|SUPABASE|RESEND|ANTHROPIC|OPENAI|VERCEL|DATABASE|DIRECT_URL|EMAIL_ENTREPRISE|CRON|WEBHOOK)/i.test(k)));return new Promise(resolve=>{let sortie='',expired=false;const child=spawn(process.execPath,[m.media?'scripts/juges-026-pubs-contenu-mutations.mjs':m.juge,...m.opts,...(m.noRacine?[]:['--racine='+dir])],{cwd:ROOT,env:{...env,NO_COLOR:'1',FORCE_COLOR:'0'},detached:process.platform!=='win32',windowsHide:true});child.stdout.on('data',d=>sortie+=d);child.stderr.on('data',d=>sortie+=d);const timer=setTimeout(()=>{expired=true;if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true});else try{process.kill(-child.pid,'SIGKILL')}catch{}},Math.min(remain,delaiDe(m)));child.on('error',e=>{clearTimeout(timer);resolve({code:127,sortie:sortie+'\n'+e.message,duree_s:(Date.now()-begin)/1000,expired})});child.on('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal,sortie:sortie.replace(/\u001b\[[0-9;]*m/g,''),duree_s:(Date.now()-begin)/1000,expired})})})}
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
// Coût relatif d'un groupe (typecheck, hyperframes, ffmpeg) : les groupes sont lancés du moins cher au plus cher, de sorte qu'un
// balayage interrompu ait déjà rendu le plus de verdicts possible.
function priorite(entries) {
  const m=entries[0],o=m.opts
  const cout=o.includes('--juger-media=pack')?7:o.includes('--partie=depot')?6:o.includes('--partie=gabarit')?5:o.includes('--juger-media=studio')?4:['--partie=noyau','--partie=api','--partie=page','--partie=route','--partie=poste','--partie=purge'].some(x=>o.includes(x))&&/^(pack-pub|cgu)/.test(m.g)?3:m.g==='cgu-pack-pub'?3:m.g==='socle-pubs'?2:1
  return -cout
}
async function poolGroupes(jobs,exec,maximum=2) {
  if(maximum!==1&&maximum!==2)throw Error('pool doit rester limité à deux groupes')
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
const ligneNommee=(sortie,c)=>{const l=sortie.split(/\r?\n/).filter(x=>new RegExp('^(PASS|FAIL|SAUTE) '+c+'(?: — |$)').test(x));return l.length===1?l[0]:null}
const verdictDe=(sortie,c)=>{const l=sortie.split(/\r?\n/),n=l.find(x=>new RegExp('^(PASS|FAIL|SAUTE) '+c+'(?: — |$)').test(x)),bilan=l.filter(x=>/^[a-z][a-z0-9-]*(?: --[a-z0-9-]+=[^\s]+)* : (PASS|FAIL)/.test(x)).at(-1);return [n,bilan].filter(Boolean).join(' | ').slice(0,400)||'sortie sans verdict'}
const optsDe=commande=>(commande.match(/ (--[a-z-]+=[^\s{]+)/g)??[]).map(t=>t.trim()).filter(t=>!t.startsWith('--racine')).join(' ')
try {
  if(errors.length){save();throw Error('préflight incomplet : aucun test lancé')}
  const groups=new Map(),ordinal=new Map(prepared.map(m=>[m,m.n]))
  for(const m of catalogue)rang.set(cle(m),m.n)
  for(const m of prepared){const key=m.juge+' '+m.opts.join(' ');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m)}
  // --reprendre : reprend le rapport d'un lancement précédent (fautes déjà jugées et témoins verts) ; jamais utilisé par le méta-juge.
  let precedent=null
  if(RESUME&&!WITNESS){try{precedent=JSON.parse(fs.readFileSync(path.join(PROOF,'mutations.json'),'utf8'))}catch{}}
  const presents=new Set(catalogue.map(cle))
  if(precedent){
    // Les juges médias n'ont pas de « juge » propre dans leur commande : la clé reprend celle du catalogue (juge + options du groupe).
    const optsGroupe=new Map(catalogue.map(m=>[m.juge+'|'+m.critere+'|'+m.nom,m.opts.join(' ')]))
    const clePrec=x=>[x.juge,optsGroupe.get(x.juge+'|'+x.critere+'|'+x.nom)??optsDe(x.commande),x.critere,x.nom].join('|')
    for(const x of precedent.mutations??[]){const k=clePrec(x);if(presents.has(k))detectees.set(k,x)}
    for(const x of precedent.survivants??[]){const k=clePrec(x);if(presents.has(k))survivants.set(k,x)}
    if(precedent.video_original)report.video_original=precedent.video_original
    report.temoins=(precedent.temoins??[]).filter(t=>t.code===0)
  }
  save()
  const jobs=[...groups].map(([key,entries],group)=>({key,entries,group,ressources:ressources(entries)})).sort((a,b)=>priorite(b.entries)-priorite(a.entries)||a.group-b.group)
  const witnesses=[],libres=Array.from({length:POOL},(_,i)=>i),pretes=new Set();let actifs=0
  const nettoyerMedia=d=>{const w=path.join(d,'.orchestre/travail/026-159-media');if(fs.existsSync(w))cleanup(w)}
  report.scheduler={maximum:POOL,pic_groupes:0,groupes:jobs.map(j=>({groupe:j.group,commande:j.key,ressources:j.ressources})),evenements:[]}
  await poolGroupes(jobs,async ({key,entries,group})=>{
    const aFaire=entries.filter(m=>!detectees.has(cle(m))&&!survivants.has(cle(m)))
    if(!aFaire.length&&!WITNESS){console.log('REPRIS '+key+' : toutes les fautes déjà jugées');return}
    actifs++;report.scheduler.pic_groupes=Math.max(report.scheduler.pic_groupes,actifs)
    report.scheduler.evenements.push({groupe:group,action:'debut',ms:Date.now()-start})
    try {
    // Une copie du dépôt par place du pool (deux au plus), réutilisée : chaque faute est posée puis ôtée octet pour octet, la copie
    // revient intacte pour la suivante. Recopier 120 Mo pour chacune des fautes dépassait le budget.
    const place=libres.shift(),dir=path.join(run,'copie-'+place);let witness
    try{
    if(!pretes.has(place)){copy(dir);pretes.add(place)}
    const commandeT=command(entries[0]),repris=precedent?.temoins?.find(t=>t.commande===commandeT&&t.code===0)
    if(repris){witnesses[group]={...repris,repris:true};console.log('TÉMOIN '+key+' : code 0 (repris)')}
    else{
      nettoyerMedia(dir);witness=await judge(entries[0],dir)
      // Un juge court qui regarde l'état git du dépôt PARTAGÉ (SG-2) rougit si une autre session y écrit pendant ses deux secondes :
      // trois essais au plus, pour les seuls juges qui finissent en moins d'une minute.
      let essais=1;while(witness.code!==0&&!witness.expired&&!witness.signal&&witness.duree_s<60&&essais<3){essais++;nettoyerMedia(dir);witness=await judge(entries[0],dir)}
      witnesses[group]={commande:commandeT,code:witness.code,duree_s:witness.duree_s,log:'temoin-'+group+'.log',...(essais>1?{essais}:{})}
      fs.writeFileSync(path.join(PROOF,'temoin-'+group+'.log'),witness.sortie)
      console.log('TÉMOIN '+key+' : code '+witness.code)
    }
    report.temoins=witnesses.filter(Boolean);save()
    if(witness&&(witness.code!==0||witness.expired||witness.signal)){erreursFixes.push('témoin rouge : '+key+(witness.expired?' (délai dépassé)':''));save();return}
    if(WITNESS)return
    if(entries[0].g==='socle-pubs'&&!report.video_original?.format){
      const args=['--profil=pub-locale','--json',path.join(ROOT,'.orchestre/travail/socle/mutation-format.mp4')],a=await judge({juge:'scripts/video-qa.mjs',opts:args,noRacine:true},ROOT)
      let format;try{format=JSON.parse(a.sortie)[0]?.tests?.find(t=>!t.passe&&t.nom==='Format 1080×1920 (pub locale)'&&t.mesure==='1080×1350')}catch{}
      report.video_original={commande:['node','scripts/video-qa.mjs',...args].join(' '),code:a.code,duree_s:a.duree_s,format:format??null}
      fs.writeFileSync(path.join(PROOF,'video-original-format.log'),a.sortie)
      if(a.code!==1||a.expired||a.signal||!format)erreursFixes.push('A1 : vidéo 1080×1350 non refusée par le juge original sur son format')
      save()
    }
    for(const m of aFaire){
      const index=ordinal.get(m),d=dir,target=path.join(d,m.fichier),original=fs.readFileSync(target,'utf8'),k=cle(m)
      try {
        if(original.split(m.avant).length!==2)throw Error('ancre copie non unique')
        fs.writeFileSync(target,original.replace(m.avant,()=>m.apres))
        nettoyerMedia(d)
        const r=await judge(m,d),extrait=strict(r.sortie,m.critere),commande=command(m)
        fs.writeFileSync(path.join(PROOF,index+'-'+m.critere+'.log'),r.sortie)
        let issue
        if(r.code===1&&!r.expired&&!r.signal&&extrait){detectees.set(k,{juge:m.juge,commande,fichier:m.fichier,avant:m.avant,apres:m.apres,critere:m.critere,extrait,duree_s:r.duree_s,nom:m.nom});indetermines.delete(k);issue='DÉTECTÉE'}
        else if(r.expired||r.signal||!r.sortie.trim()){indetermines.set(k,{juge:m.juge,commande,critere:m.critere,nom:m.nom,raison:'délai ou sortie vide (code '+r.code+(r.expired?', délai dépassé':'')+')',duree_s:r.duree_s});issue='NON JUGÉE'}
        else if(r.code===0||ligneNommee(r.sortie,m.critere)?.startsWith('PASS ')){survivants.set(k,{juge:m.juge,commande,fichier:m.fichier,avant:m.avant,apres:m.apres,critere:m.critere,nom:m.nom,verdict:verdictDe(r.sortie,m.critere),duree_s:r.duree_s});indetermines.delete(k);issue='NON ATTRAPÉE'}
        else{autres.set(k,{juge:m.juge,commande,critere:m.critere,nom:m.nom,verdict:'code '+r.code+' : '+verdictDe(r.sortie,m.critere),duree_s:r.duree_s});indetermines.delete(k);issue='AUTRE CRITÈRE'}
        console.log(issue+' '+m.critere+' '+m.nom+' ('+r.duree_s.toFixed(0)+' s)');save()
      }finally{
        // La faute est ôtée dans tous les cas ; une copie qui ne revient pas à l'original est une erreur, jamais ignorée.
        fs.writeFileSync(target,original)
        if(fs.readFileSync(target,'utf8')!==original)throw Error('copie non restaurée : '+m.fichier)
      }
    }
    }finally{libres.push(place)}
    }finally{actifs--;report.scheduler.evenements.push({groupe:group,action:'fin',ms:Date.now()-start});save()}
  },POOL)
}catch(e){if(!erreursFixes.includes(e.message))erreursFixes.push(e.message)}finally{if(!KEEP)cleanup(run);save()}
console.log('juges-026-pubs-contenu-mutations : '+(report.erreurs.length?'FAIL':'PASS')+' — '+(WITNESS?report.temoins.length+' témoins, aucune mutation exécutée':report.mutations.length+'/'+selected.length+' fautes détectées, '+report.survivants.length+' non attrapée(s), '+report.indetermines.length+' non jugée(s), '+report.autres.length+' sur un autre critère'))
process.exitCode=report.erreurs.length?1:0

async function mediaMode(args){
  const mode=args.find(a=>a.startsWith('--produire-media='))?'produire':'juger'
  const values=Object.fromEntries(args.map(a=>{const i=a.indexOf('=');if(i<0)throw Error('option média invalide');return [a.slice(2,i),a.slice(i+1)]}))
  const allowed=mode==='produire'?['produire-media','base','destination']:['juger-media','racine']
  if(Object.keys(values).some(k=>!allowed.includes(k)))throw Error('option média inconnue')
  const demande=values[mode+'-media'],ensembles={pack:['gps','photo','mentionPack'],studio:['mentionStudio','filigrane','recommandation','produit','plan']}
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
  const invoke=(bin,argv,cwd,delai=180000)=>{const r=spawnSync(bin,argv,{cwd,encoding:'utf8',timeout:delai,maxBuffer:32<<20,windowsHide:true});if(r.error||r.signal||r.status===null)throw Error('processus média interrompu : '+(r.error?.message??r.signal));return r}
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
    const r=invoke(process.execPath,judgeArgs,ROOT,11*60_000);process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exitCode=r.status;return
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
      const before=hash(f),filter=`drawbox=x=${zone.x}:y=${zone.y}:w=${zone.largeur}:h=${zone.hauteur}:color=white:t=fill:enable='${enable}'`
      const r=invoke('ffmpeg',['-y','-v','error','-threads','2','-i',f,'-vf',filter,'-c:v','libx264','-threads','2','-preset','veryfast','-b:v','3600k','-minrate','3600k','-maxrate','3600k','-bufsize','1800k','-x264-params','nal-hrd=cbr:force-cfr=1','-c:a','copy',temp],ROOT)
      if(r.status!==0)throw Error('masque ffmpeg : '+r.stderr.slice(0,400));fs.renameSync(temp,f);trace.actions.push({fichier:path.relative(destination,f),avant_sha256:before,apres_sha256:hash(f),filtre:filter})
    }else if(cas==='age'){
      const f=path.join(destination,'sortie/fiche-10-min.md');fs.appendFileSync(f,'\nCiblez les personnes de trente à cinquante ans : réglez l’âge et le genre.\n');trace.actions.push({fichier:path.relative(destination,f),texte:'âge et genre',meta_logement:'oui'})
    }else if(cas==='recommandation'){
      const f=path.join(destination,'echantillon-1/script.json'),j=JSON.parse(fs.readFileSync(f,'utf8'));j.lignes.push('Je recommande ce produit.');fs.writeFileSync(f,JSON.stringify(j,null,2));trace.actions.push({fichier:path.relative(destination,f),ligne:j.lignes.at(-1)})
    }else if(cas==='produit'){
      const f=path.join(destination,'produit.jpg');await rewrite(f,p=>sharp(p).negate().jpeg().toBuffer())
    }else if(cas==='plan'){
      const f=path.join(destination,'echantillon-1/sortie/echantillon.mp4'),temp=f+'.nouveau.mp4',before=hash(f),filter="drawbox=x=140:y=500:w=800:h=900:color=0x2040a0:t=fill:enable='between(t,4,9)'"
      const r=invoke('ffmpeg',['-y','-v','error','-threads','2','-i',f,'-vf',filter,'-c:v','libx264','-threads','2','-preset','veryfast','-b:v','3600k','-minrate','3600k','-maxrate','3600k','-bufsize','1800k','-x264-params','nal-hrd=cbr:force-cfr=1','-c:a','copy',temp],ROOT)
      if(r.status!==0)throw Error('aplat ffmpeg : '+r.stderr.slice(0,400));fs.renameSync(temp,f);trace.actions.push({fichier:path.relative(destination,f),avant_sha256:before,apres_sha256:hash(f),filtre:filter})
    }
  }
  fs.writeFileSync(path.join(destination,'inspection-mutation.json'),JSON.stringify(trace,null,2)+'\n')
  console.log('Fixture publique réelle : '+destination)
}
