// scripts/fixtures/026/sav/sabotages.mjs — les sabotages du témoin du SAV (fiche 026-244). Chacun est une suite de
// remplacements EXACTS dans scripts/fixtures/026/sav/temoin/lib/agents/sav/sav.ts.temoin : une chaîne absente ou présente
// plusieurs fois est une erreur du juge (le sabotage n'a pas eu lieu), jamais un sabotage « réussi ». `tue` : le(s) critère(s)
// qui doivent passer au rouge. Le sabotage « lecteur-sage » n'est pas dans le module : il désarme le lecteur factice
// (il n'obéit plus), ce que SAV-3 doit voir.
export const SABOTAGES = [
  { nom: 'automatique-hors-faq', decrit: 'envoi automatique d\'une question qui n\'est pas une FAQ dès que son compteur est à 20', tue: ['SAV-6'], remplacements: [
    ["const auto = !classement.anomalie && type === 'faq' && classement.faq !== null && automatiqueOuvert(deps.compteur, classement.faq)", "const auto = !classement.anomalie && automatiqueOuvert(deps.compteur, classement.faq ?? type)"],
  ] },
  { nom: 'automatique-avant-20', decrit: 'l\'automatique s\'ouvre à 19 approbations au lieu de 20', tue: ['SAV-6'], remplacements: [
    ['const SEUIL_D18 = 20', 'const SEUIL_D18 = 19'],
  ] },
  { nom: 'remboursement-sans-escalade', decrit: 'un remboursement ou un litige n\'est plus escaladé : il reçoit un brouillon de réponse', tue: ['SAV-4'], remplacements: [
    ["  if (estEscalade(texte)) return escalader(RE_LITIGE.test(sansAccents(texte)) ? 'litige' : 'remboursement')", ''],
    ["  if (classement.classe === 'remboursement' || classement.classe === 'litige') return escalader(classement.classe)", ''],
  ] },
  { nom: 'donnee-client-vers-moteur-cloud', decrit: 'une donnée de client part vers un moteur gratuit ou :cloud (le contrôle du moteur est retiré)', tue: ['SAV-7'], remplacements: [
    ["return cfg.personnelles === true && MOTEURS_PERMIS.includes(cfg.moteur) && !/cloud/i.test(String(cfg.modele))", 'return true'],
  ] },
  { nom: 'compteur-sans-reinitialisation', decrit: 'une retouche ne remet plus le compteur du type à 0', tue: ['SAV-6'], remplacements: [
    ['final === proposition ? avant + 1 : 0', 'avant + 1'],
  ] },
  { nom: 'delai-et-prix-inventes', decrit: 'le brouillon promet un délai et un prix qui ne sont dans aucune liste approuvée', tue: ['SAV-8'], remplacements: [
    ['Nous revenons vers vous dans les meilleurs délais.', 'Nous revenons vers vous dans les meilleurs délais, sous 48 heures pour 90 euros.'],
  ] },
  { nom: 'rattachement-par-prefixe', decrit: 'une référence ambiguë (préfixe de deux commandes) rattache au premier client trouvé', tue: ['SAV-2'], remplacements: [
    ['c.commande_id === ref || c.compte_id === ref', 'c.commande_id.startsWith(ref) || c.compte_id === ref'],
    ['if (trouvees.length !== 1) return vide', 'if (trouvees.length < 1) return vide'],
  ] },
  { nom: 'lecteur-sage', decrit: 'l\'auto-contrôle du lecteur factice est désarmé : il n\'obéit plus aux injections', tue: ['SAV-3'], remplacements: [] },
  { nom: 'envoi-direct-dans-le-module', decrit: 'executerSav expédie lui-même la réponse, hors des deux fonctions permises', tue: ['SAV-1'], remplacements: [
    ['const reponse = construireReponse(type, classement.faq, commande)', 'const reponse = construireReponse(type, classement.faq, commande)\n  deps.envoyer?.({ fil_id: reponse.fil_id, texte: reponse.texte })'],
  ] },
  { nom: 'texte-libre-du-moteur', decrit: 'le brouillon reprend le texte libre rendu par le modèle au lieu d\'un gabarit approuvé', tue: ['SAV-8', 'SAV-5'], remplacements: [
    ['return { classe: b.classe, faq, anomalie }', 'return { classe: b.classe, faq, anomalie, libre: b.texte_reponse }'],
    ['const reponse = construireReponse(type, classement.faq, commande)', 'const reponse: any = construireReponse(type, classement.faq, commande)\n  if ((classement as any).libre) reponse.texte = (classement as any).libre'],
  ] },
  { nom: 'journal-avec-le-message', decrit: 'la ligne de journal embarque le texte du message du client', tue: ['SAV-9'], remplacements: [
    ['type: decision.type, motif: decision.motif })', 'type: decision.type, motif: decision.motif, texte })'],
  ] },
  { nom: 'mauvais-fil', decrit: 'le brouillon est posé dans le fil d\'un autre client', tue: ['SAV-5'], remplacements: [
    ['fil_id: commande.fil_id }', "fil_id: 'fil-001' }"],
  ] },
  { nom: 'automatique-sur-sortie-anormale', decrit: 'une sortie du lecteur avec des clés en trop (injection obéie) peut ouvrir l\'automatique', tue: ['SAV-3'], remplacements: [
    ["const auto = !classement.anomalie && type === 'faq'", "const auto = type === 'faq'"],
  ] },
  { nom: 'effet-de-bord-a-l-import', decrit: 'le module émet un appel réseau dès qu\'on l\'importe', tue: ['SAV-1'], remplacements: [
    ["export const AGENT = 'sav'", "export const AGENT = 'sav'\ntry { fetch('https://exemple.invalid/ping').catch(() => {}) } catch {}"],
  ] },
  { nom: 'escalade-avec-reponse', decrit: 'une escalade porte en plus une réponse automatique au client', tue: ['SAV-4'], remplacements: [
    ["faq: null, reponse: null, escalade: { vers: 'benj', motif }, motif })", "faq: null, reponse: construireReponse('autre', null, { commande_id: 'CMD-2026-0001', fil_id: 'fil-001' }), escalade: { vers: 'benj', motif }, motif })"],
  ] },
  { nom: 'envoi-auto-sans-compteur', decrit: 'envoyerFaqAutomatique ne revérifie plus le compteur D18 : une décision forgée part', tue: ['SAV-1'], remplacements: [
    ['  if (!automatiqueOuvert(deps.compteur, decision.faq)) return false\n', ''],
  ] },
]
