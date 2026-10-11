// lib/agents/acquisition/gabaritsPremierContactV2.ts — le premier contact « je vous montre d'avance votre site » (07/10).
//
// Accord de Benj pour la prospection en masse, avec ce message, dans son esprit : « Bonjour, je me permets de vous contacter… je
// tente une approche différente en vous montrant d'avance le produit… », un site cohérent comme l'exemple de la vitrine, avec les
// images de l'artisan, « en lui précisant bien sûr ». Ton humain, court, aucune promesse chiffrée ; la première phrase légale, le
// pied (identité, source de la liste, notice, STOP par écrit, référence) et « écrivez à {adresse}. » sont gardés mot pour mot.
//
// Fichier À PART, NON BRANCHÉ et NON APPROUVÉ : les modèles approuvés vivent dans modeles.ts (APPROUVES + empreinte dans
// .orchestre/preuves/026-083/approbation.txt). Ce que le branchement demande, dans l'ordre (docs/agents/premier-contact-v2.md) :
//   1. Benj approuve le texte exact (une ligne d'approbation à l'empreinte de `empreinte`), puis Claude Code le recopie dans
//      MODELES de modeles.ts et l'ajoute à APPROUVES, dans un commit à part ;
//   2. les deux formes AVEC lien demandent que Benj lève la règle « jamais prestiapp.fr avant un oui » (contrat.ts, DOMAINE_PRINCIPAL ;
//      J3 : conformite.ts, codes `lien_formulaire` et `domaine_principal`) pour CE seul lien : exactement un lien, de forme
//      RE_LIEN_MAQUETTE, celui de la maquette prête du prospect — et que le lien de la maquette soit créé AVANT le premier contact
//      (aujourd'hui : après un « oui » seulement, app/api/usine/atelier/lien + maquettesLien.ts) ;
//   3. redacteur.ts (preparerUn) choisit la forme : `formulaire_A_v2_photos` si la maquette montre les photos du site de l'artisan
//      (maquettes/rendu.mjs → rapport.json, photos_artisan > 0), `formulaire_A_v2_illustrations` sinon, et `formulaire_A_v2_sans_lien`
//      tant que le point 2 n'est pas tranché ; la route app/api/cron/redacteur ne change pas (elle passe déjà les drapeaux).
// La forme SANS lien respecte les garde-fous d'aujourd'hui (aucun lien, aucun domaine, aucun prix) : elle peut être approuvée seule.
//
// Module pur, syntaxe effaçable seulement (ts-loader).
import { createHash } from 'node:crypto'
import type { Canal, TypeEnvoi } from './contrat'
import { PREMIERE_PHRASE } from './contrat'
import type { ModeleMessage } from './modeles'
import { PIED_FORMULAIRE } from './modeles'

const empreinteDe = (texte: string): string => createHash('sha256').update(texte, 'utf8').digest('hex')
const emplacementsDe = (texte: string): string[] => [...new Set([...texte.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[0]))]
function gabarit(id: string, texte: string, liens: string[] = []): ModeleMessage {
  return Object.freeze({
    id, canaux: Object.freeze(['formulaire_site'] as Canal[]), types: Object.freeze(['premier_contact'] as TypeEnvoi[]), texte,
    emplacements: Object.freeze(emplacementsDe(texte)), approuve: false, empreinte: empreinteDe(texte),
    chiffres_justifies: Object.freeze([] as string[]), liens_permis: Object.freeze(liens),
  })
}

const OUVERTURE = "Bonjour {entreprise},\nJe me permets de vous contacter : j'ai tenté une approche différente. Plutôt que de vous parler de Presti, je vous montre d'avance à quoi pourrait ressembler votre site"
const FIN = "Si ça vous parle, écrivez à {adresse}. Sans réponse de votre part, je ne vous relancerai pas."

export const GABARITS_PREMIER_CONTACT_V2: Readonly<Record<string, ModeleMessage>> = Object.freeze({
  // la maquette montre les photos du site de l'artisan
  formulaire_A_v2_photos: gabarit('formulaire_A_v2_photos',
    `${PREMIERE_PHRASE}\n${OUVERTURE} : {lien}\nLes photos viennent de votre site actuel. Cet aperçu n'est visible que par vous, rien n'est publié, et tout se remplace à votre convenance.\n${FIN}\n${PIED_FORMULAIRE}`,
    ['{lien}']),
  // le site de l'artisan n'avait pas de photo utilisable : illustrations sous licence libre
  formulaire_A_v2_illustrations: gabarit('formulaire_A_v2_illustrations',
    `${PREMIERE_PHRASE}\n${OUVERTURE} : {lien}\nLes photos sont des illustrations, à remplacer par les vôtres. Cet aperçu n'est visible que par vous et rien n'est publié.\n${FIN}\n${PIED_FORMULAIRE}`,
    ['{lien}']),
  // conforme aux garde-fous d'aujourd'hui : aucun lien avant un « oui », l'aperçu part sur demande
  formulaire_A_v2_sans_lien: gabarit('formulaire_A_v2_sans_lien',
    `${PREMIERE_PHRASE}\nBonjour {entreprise},\nJe me permets de vous contacter : j'ai tenté une approche différente. Plutôt que de vous parler de Presti, j'ai préparé d'avance un aperçu de ce à quoi pourrait ressembler votre site, avec les photos de votre site actuel. Il n'est visible que par vous, rien n'est publié, et tout se remplace à votre convenance.\nPour le voir, écrivez à {adresse} : je vous envoie le lien. Sans réponse de votre part, je ne vous relancerai pas.\n${PIED_FORMULAIRE}`),
})

/** Remplit un gabarit v2 ; `split/join`, jamais `replace` (un « $ » de la valeur reste un « $ »). Rend null si un emplacement reste. */
export function remplirPremierContactV2(id: keyof typeof GABARITS_PREMIER_CONTACT_V2 | string, valeurs: Readonly<Record<string, string>>): string | null {
  const g = GABARITS_PREMIER_CONTACT_V2[id]
  if (!g) return null
  let t = g.texte
  for (const [nom, v] of Object.entries(valeurs)) t = t.split(`{${nom}}`).join(v)
  return /\{[a-z_]+\}/.test(t) ? null : t
}
