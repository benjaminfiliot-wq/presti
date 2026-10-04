// scripts/fixtures/026-garde/stop/lot.mjs — la fiche du lot gstop (le garde-stop), lue par scripts/juges-026-pilotage-preuve.mjs :
//   node scripts/juges-026-pilotage-preuve.mjs --lot=gstop --lot-fichier=scripts/fixtures/026-garde/stop/lot.mjs
// Contrat de tout lot.mjs : voir scripts/fixtures/026-pilotage/a/lot.mjs (il n'importe rien).
//
// Référence : le HEAD du 30/09 (00f0ab51), où lib/agents/acquisition/standardiste.ts classe `hors_fil` AVANT de tester le STOP et la
// demande RGPD (classerEnCode, l.139-147) : un STOP reçu hors fil ne crée ni opposition ni carte. Premier critère attendu en échec : GS-1.
//
// Témoin (./temoin) : le correctif minimal, écrit par Claude Code, que l'agent suivant reporte dans lib/ :
//   - lib/agents/acquisition/standardiste.ts : estStop replié (sans accents ni casse) et élargi (« je m'oppose », « ne me contactez
//     plus », « STOP » entre guillemets) ; classerEnCode teste RGPD et STOP avant hors_fil ; opposerDefinitif oppose l'adresse de
//     l'expéditeur (champ `expediteur`), son alias sans « +étiquette » et son domaine professionnel, ou ouvre une carte
//     verifier_demande quand aucune clé n'est exploitable ;
//   - lib/agents/acquisition/expediteur.ts (nouveau, absent de la référence) : lecture de l'adresse From, alias, domaine.
// Les sabotages : un texte du témoin devient une faute que le juge doit nommer (`tue`) ; ceux dont le premier critère reste vert
// sont les sabotages de contenu.
export const fiche = '026-garde-stop'
export const reference = '00f0ab51dab621a7043d3b57785c41ddd999c56e'
export const temoin = './temoin'
export const absents = ['lib/agents/acquisition/expediteur.ts']

const S = 'lib/agents/acquisition/standardiste.ts'
const X = 'lib/agents/acquisition/expediteur.ts'
const LIGNE_RGPD = "  if (rgpd) return { classe: 'rgpd', source: 'regle', stop, question }\n"
const ORDRE_STOP = "  await opposerDefinitif(magasin, r, 'stop', 'standardiste')\n  if (code.classe === 'rgpd') await carteRgpd(magasin, r, maintenant)\n"
const CARTE_SANS_CLE = "    await carte(magasin, { id: reponse.id, prospect_id: reponse.prospect_id }, 'verifier_demande', 'Un refus a été lu sans clé à mettre en opposition : à vérifier.', extraitCarte(reponse))\n"
const ENVOI = "  await magasin.preparerEnvoi({ prospect_id: null, type: 'confirmation_stop', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'x@x.invalid', objet: null, texte: 'Votre demande est prise en compte.', empreinte_texte: '', modele_id: 'confirmation_stop', variante: null, fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: null })\n"

export const juges = [
  {
    commande: 'scripts/garde-stop-qa.mjs', arguments: [], loader: true, attendu: 'GS-1', criteresMin: 7,
    sabotages: [
      // GS-1 : le STOP hors fil
      { nom: 'hors-fil-avant-le-stop', fichier: S, avant: LIGNE_RGPD, apres: `  if (horsFil) return { classe: 'hors_fil', source: 'regle', stop: false, question: false }\n${LIGNE_RGPD}`, tue: 'GS-1' },
      { nom: 'je-m-oppose-oublie', fichier: S, avant: "|je\\s+m'?oppose|ne\\s+me\\s+contactez\\s+plus/", apres: '|ne\\s+me\\s+contactez\\s+plus/', tue: 'GS-1' },
      { nom: 'accents-non-replies', fichier: S, avant: "const replier = (texte: unknown) => plier(texteDe(texte)).replace(/[’`´]/g, \"'\")", apres: 'const replier = (texte: unknown) => texteDe(texte).toLowerCase()', tue: 'GS-1' },
      { nom: 'opposition-temporaire', fichier: S, avant: '  await magasin.opposer(cles, motif, source)\n  for (const c of supplementaires)', apres: "  await magasin.opposer(cles, motif, source, '2026-12-01T00:00:00.000Z')\n  for (const c of supplementaires)", tue: 'GS-1' },
      { nom: 'adresse-expediteur-non-opposee', fichier: S, avant: '    cles.email = expediteur\n', apres: '', tue: 'GS-1' },
      { nom: 'module-expediteur-retire', fichier: X, retirer: true, tue: 'GS-1' },
      // GS-2 : la demande RGPD
      { nom: 'rgpd-ignore-hors-fil', fichier: S, avant: LIGNE_RGPD, apres: "  if (rgpd && !horsFil) return { classe: 'rgpd', source: 'regle', stop, question }\n", tue: 'GS-2' },
      { nom: 'echeance-a-90-jours', fichier: S, avant: 'export const RGPD_ECHEANCE_JOURS = 25', apres: 'export const RGPD_ECHEANCE_JOURS = 90', tue: 'GS-2' },
      // GS-3 : l'expéditeur inexploitable
      { nom: 'carte-attention-retiree', fichier: S, avant: CARTE_SANS_CLE, apres: '    // carte retirée\n', tue: 'GS-3' },
      { nom: 'adresse-non-validee', fichier: X, avant: "candidate.length > 254 || candidate.includes('..') || !RE_ADRESSE.test(candidate)", apres: 'candidate.length > 254', tue: 'GS-3' },
      // GS-4 : pas de faux positif
      { nom: 'stop-partout', fichier: S, avant: '|laissez[- ]moi\\s+tranquille|', apres: '|laissez[- ]moi\\s+tranquille|stop|', tue: 'GS-4' },
      { nom: 'non-suivi-de-tout', fichier: S, avant: 'const RE_NON_SEUL = /^\\s*non(\\s+merci)?\\s*[.!…]*\\s*$/', apres: 'const RE_NON_SEUL = /^\\s*non\\b/', tue: 'GS-4' },
      // GS-5 : la durabilité
      { nom: 'alias-plus-oublie', fichier: X, avant: '  if (base) sortie.push({ email: base })\n', apres: '', tue: 'GS-5' },
      { nom: 'nom-affiche-non-lu', fichier: X, avant: 'const candidate = (chevrons ? chevrons[1] : t).trim().toLowerCase()', apres: 'const candidate = t.trim().toLowerCase()', tue: 'GS-5' },
      { nom: 'messagerie-gratuite-opposee', fichier: X, avant: '  return MESSAGERIES_GRATUITES.includes(d) ? null : d', apres: '  return d', tue: 'GS-5' },
      // GS-6 : l'ordre
      { nom: 'carte-rgpd-avant-l-opposition', fichier: S, avant: ORDRE_STOP, apres: "  if (code.classe === 'rgpd') await carteRgpd(magasin, r, maintenant)\n  await opposerDefinitif(magasin, r, 'stop', 'standardiste')\n", tue: 'GS-6' },
      { nom: 'reponse-auto-avant-le-stop', fichier: S, avant: LIGNE_RGPD, apres: `  if (reponse.auto === true) return { classe: 'reponse_auto', source: 'regle', stop: false, question: false }\n${LIGNE_RGPD}`, tue: 'GS-6' },
      // GS-7 : aucun envoi
      { nom: 'confirmation-envoyee', fichier: S, avant: ORDRE_STOP, apres: `  await opposerDefinitif(magasin, r, 'stop', 'standardiste')\n${ENVOI}  if (code.classe === 'rgpd') await carteRgpd(magasin, r, maintenant)\n`, tue: 'GS-7' },
    ],
  },
]

export const controles = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleJeuxGarde' },
]
