import fs from 'node:fs'
import crypto from 'node:crypto'
import cp from 'node:child_process'
const dossier = '.orchestre/preuves/026-225/'
const debut = new Date().toISOString()
const adresse = 'relais.recette@presti-test.invalid'
const sha = t => crypto.createHash('sha256').update(t).digest('hex')
const dates = [0, 60, 120, 180, 240, 300, 360, 420, 480, 540].map(s => new Date(Date.parse('2026-09-27T09:00:00Z') + s * 1000).toISOString())
const texte1 = 'Merci pour votre demande fictive. Voici le compte rendu de votre essai. Pour vous opposer à tout autre message, répondez STOP.'
const texte2 = 'Merci pour votre réponse fictive. Votre remarque est enregistrée dans cet essai. Pour vous opposer à tout autre message, répondez STOP.'
const noms = ['demande','preparation','accord','envoi','reponse','preparation_2','accord_2','envoi_2','opposition','arret']
const etapes = noms.map((etape,i)=>({etape,etat:'simulé',heure:dates[i],duree_s:null}))
Object.assign(etapes[0], {id_demande:'dem-relais-225',type:'entrante',adresse,consentement:{precoche:false,coche:true},preuve:'entrée fictive construite par simulation.mjs, aucune soumission API',opposition:true,doublon_rejete:true,sans_consentement_rejete:true,retiree_le:null})
for (const [p,a,e,texte,id] of [[1,2,3,texte1,1],[5,6,7,texte2,2]]) {
 Object.assign(etapes[p], {destinataire:adresse,texte,empreinte:sha(texte),source:`scénario fictif dem-relais-225 / tour ${id}`,plafond:1,modele:{fournisseur:'ollama-local',modele:'simulation-sans-inference'},juge_faits:'ok'})
 Object.assign(etapes[a], {id_accord:`acc-relais-${id}`,destinataire:adresse,canal:'email',empreinte:sha(texte),expire_le:'2026-09-27T10:00:00.000Z',portee:'envoi-unique'})
 Object.assign(etapes[e], {id_accord:`acc-relais-${id}`,id_message:`msg-relais-${id}`,destinataire:adresse,empreinte:sha(texte),type:'reponse-sollicitee'})
}
Object.assign(etapes[4],{de:adresse})
Object.assign(etapes[8],{de:adresse,moyen:'STOP fictif'})
Object.assign(etapes[9],{envois_apres:0,relances:0})
const deps = {}
const lignes = fs.readFileSync('.orchestre/verdicts.jsonl','utf8').trim().split('\n').map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
for(const id of ['026-220','026-065','026-145','026-096']) deps[id]={fiche_fait:fs.existsSync(`.orchestre/fait/${id}.md`),dernier_verdict:lignes.filter(l=>l.id===id).at(-1) ?? 'absent'}
const journal={recette:'026-225',horloge_debut:dates[0],froid_ouvert:false,verdict:'pratiquement prêt',ecarts:[{ecart:'Cette recette exerce exclusivement le contrat documentaire : aucune API formulaire, inférence Ollama, autorisation humaine ni connexion Gmail.',reprise:'Faire une recette intégrée autorisée avec les composants des dépendances, conserver leurs sorties brutes et obtenir chaque accord individuel avant un envoi réel.'}],dependances:deps,messages_envoyes:0,etapes}
const prose = `# Recette entrante — jalon du 27/09, contrôle local du 30/09/2026

Verdict du scénario documentaire : **pratiquement prêt**. Ce terme est celui du contrat du juge ; il ne mesure pas la disponibilité du produit. Toutes les étapes sont **simulées**, y compris la demande, les refus et les deux accords. Aucun oui de Benj n'a été recueilli. Aucun message réel envoyé. L'intégration reste non mesurée.

Toutes les personnes et adresses sont fictives. L'horloge du scénario est fixée au 27/09 à 09:00 UTC (11:00 Paris). Les horodatages sont synthétiques ; les durées sont nulles, aucune latence réelle n'est annoncée. Début de l'exécution locale : ${debut}.

Le journal ci-dessous est construit indépendamment du témoin de 026-220. Il décrit la politique attendue, pas une sortie de l'application. Les valeurs juge_faits=ok et ollama-local sont simulées : aucun juge des faits sur ces textes et aucun modèle ne sont invoqués. Aucun transfert vers un fournisseur, aucun appel réseau, aucune dépense. La prospection froide reste fermée jusqu'au 12/10.

## Étapes

${etapes.map(e=>`- ${e.etape} : simulé, ${e.heure}.`).join('\n')}

Les textes exacts, sources, plafond, destinataire, empreintes, canal et expiration sont dans le journal. La case commence non cochée ; le scénario la coche explicitement. Le second accord est distinct et expire séparément. Opposition STOP puis arrêt : zéro envoi après opposition et zéro relance dans le scénario. Une retouche de texte ou une expiration doit invalider l'accord.

## Preuves et limites

simulation.log contient la sortie brute de génération et l'état des dépendances constaté dans fait/ et verdicts.jsonl. verifier.log contient le contrôle mécanique du document. Les tests de fautes du juge sont distincts de cette recette : ils ne démontrent aucune intégration Gmail ni API entrante. Reprise : contrôler le drapeau prospectsEntrant, la demande explicite, le stockage du consentement et les refus sans effet ; exercer 026-065 sur le texte puis présenter l'accord individuel à Benj avant le porteur de 026-145. Le drapeau est actuellement false dans la carte du code ; aucune activation n'est effectuée ici.

\`\`\`json recette-entrant
${JSON.stringify(journal,null,2)}
\`\`\`
`
fs.writeFileSync('docs/agents/recette-entrant-2026-09-27.md',prose)
console.log(JSON.stringify({debut_execution:debut,fin_execution:new Date().toISOString(),dependances:deps,etapes_simulees:10,messages_reels:0,appels_reseau:0,mode:'construction documentaire hors réseau',sha256_document:sha(prose)},null,2))
