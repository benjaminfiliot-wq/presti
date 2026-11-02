// lib/demoScenes.ts — les scènes de la démo de la landing (captures du VRAI produit, scripts/demo-captures.mjs), en DONNÉES :
// lues par app/DemoSequence.tsx (le lecteur de la landing actuelle) et par la landing v2 (refonte 18/10 : slides de « Comment
// ça marche » et onglets « Fonctionnalités »). Un composant serveur ne peut pas lire les données d'un module 'use client' :
// d'où ce fichier, déplacé tel quel depuis DemoSequence.tsx le 19/10 (aucun texte changé).
import { actif, FLAGS } from '@/lib/flags'
import { PRIX_SITE_TEXTE } from '@/lib/siteCommande'

export type Scene = {
  heure: string
  titre: string
  texte: string
  appareil: 'telephone' | 'ordinateur'
  image: string
  /** Point d'intérêt pour le cadrage (object-position). */
  focus?: string
}

export const TOUTES_SCENES: Scene[] = [
  { heure: '22 h 14', titre: 'Un client écrit sur votre page', texte: 'Sur son téléphone, depuis votre lien. Il décrit ce qu’il veut, avec ses mots.', appareil: 'telephone', image: '/demo/scene-1.webp', focus: '50% 100%' },
  { heure: '22 h 14', titre: 'L’assistant répond seul (formule Studio)', texte: 'Avec Studio, l’assistant peut répondre seul, jour et nuit.', appareil: 'telephone', image: '/demo/scene-2.webp', focus: '50% 100%' },
  { heure: '7 h 50', titre: 'Vous ouvrez votre espace', texte: 'La demande est qualifiée. D’un clic, le devis se chiffre sur vos prix, chaque ligne avec sa provenance. Avec Signature, une règle d’automatisation l’a déjà préparé.', appareil: 'ordinateur', image: '/demo/scene-3.webp', focus: '50% 0%' },
  { heure: '7 h 52', titre: 'Vous validez, le client accepte', texte: 'Le devis part dans la conversation. Il l’accepte sur son téléphone : acceptation horodatée, conservée avec l’échange.', appareil: 'telephone', image: '/demo/scene-4.webp', focus: '50% 100%' },
  // 15/10 — règle « vitrine » : l'assistant qui AGIT et le CRM (offre Signature) sont dans la démo, captures du vrai écran
  // (scripts/demo-gestion-videos.mjs, compte de test jetable, aucune photo du portfolio CC BY-SA). Sous leurs drapeaux.
  { heure: 'Avec Signature', titre: 'L’assistant fait le devis à votre place', texte: 'Vous tapez « Fais le devis de Mme Martin pour 12 m² de carrelage ». Il lit vos tarifs, prépare le brouillon ; ce qui part chez un client attend votre clic « Confirmer ».', appareil: 'ordinateur', image: '/demo/scene-6.webp', focus: '50% 0%' },
  { heure: 'Avec Signature', titre: 'Le CRM : l’atelier sur une carte', texte: 'Vos chantiers, votre équipe et les alertes (retards, livraisons, stock bas) au même endroit, en temps réel. Ici sur des données d’exemple fictives.', appareil: 'ordinateur', image: '/demo/scene-7.webp', focus: '50% 0%' },
  // 18/10 — CRM, lot 1 (plans/crm-idees-twenty-1810.md n°3 et n°2) : la frise du dossier et l'argent du chantier. Capture du vrai
  // écran en mode exemple (scripts/crm-captures.mjs, aucun compte, aucune donnée réelle), sous le drapeau du CRM.
  { heure: 'Avec Signature', titre: 'Où en est chaque chantier, et combien il vous rapporte', texte: 'Une frise : demande, devis, signé, acompte, chantier, facturé, payé. Dessous, ce qui est facturé, encaissé, ce qui reste à encaisser, la matière sortie du stock et la marge sur matériaux, estimée. Données d’exemple fictives.', appareil: 'ordinateur', image: '/demo/scene-8.webp', focus: '50% 30%' },
  // 18/10 — CRM, lot 2 (n°1) : « À faire aujourd'hui » et la relance d'un devis en un geste (message relu, envoyé seulement après
  // confirmation). Capture du vrai écran en mode exemple (scripts/crm-captures.mjs), sous le drapeau du CRM.
  { heure: 'Avec Signature', titre: 'Rien n’est oublié', texte: 'Vos rappels du jour, vos rendez-vous et les devis restés sans réponse : un geste prépare la relance, vous la relisez, elle part quand vous cliquez « Envoyer ». Données d’exemple fictives.', appareil: 'ordinateur', image: '/demo/scene-9.webp', focus: '50% 30%' },
  // Relecture du 25/09 : le constructeur est fermé et le site ne se vend pas encore (siteCommandeVente) ; montrer ce
  // site comme « capture du produit réel » promettait ce qu'un nouvel inscrit ne peut pas obtenir. Il revient avec la vente.
  { heure: 'Votre site', titre: 'Tout ça, à votre marque', texte: `En option, à part de l’abonnement (${PRIX_SITE_TEXTE}, une fois) : le site qui amène la demande porte votre nom, votre adresse, vos réalisations. Jamais le nôtre.`, appareil: 'ordinateur', image: '/demo/scene-5.webp', focus: '50% 0%' },
]
export const SCENES = TOUTES_SCENES.filter((s) =>
  (s.image !== '/demo/scene-5.webp' || actif('siteCommandeVente'))
  && (s.image !== '/demo/scene-6.webp' || FLAGS.assistant)
  && (s.image !== '/demo/scene-7.webp' || FLAGS.crm)
  && (s.image !== '/demo/scene-8.webp' || FLAGS.crm)
  && (s.image !== '/demo/scene-9.webp' || FLAGS.crm))

