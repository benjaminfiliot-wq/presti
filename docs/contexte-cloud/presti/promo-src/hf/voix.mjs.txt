// Les dix voix off — prompt v14 §3.
//
// La voix retenue par Benj : **Nico** (`MAZdzkb78f8SA7DNBT41`), français natif, timbre chaud.
// Une marque a une voix, pas dix : les dix publications sont dites par elle et par elle seule.
//
// ── Deux règles qui viennent du §3, et une leçon mesurée ─────────────────────────────────────
//
// 1. **45 à 60 mots pour 25 secondes.** Ce n'est pas un ordre de grandeur, c'est une contrainte
//    physique. Premier essai à 78 mots sur la n° 1 : ElevenLabs a rendu **27,6 s pour une vidéo de
//    26,2 s**. Le mixeur l'aurait resserrée de 8 % — le plafond — et Nico aurait débité. Un texte
//    trop long ne se rattrape pas au montage, il se raccourcit à l'écriture.
//
// 2. **La voix ne lit JAMAIS le sous-titre.** Le sous-titre est ramassé (six mots), la voix
//    développe. Si les deux disent la même chose au même moment, on entend un prompteur — et on
//    perd la seule chose qu'une voix apporte : ce que l'écran n'a pas la place de dire.
//
// Le compte de mots est vérifié par `scripts/voix-produire.mjs`, qui refuse de générer au-delà.

export const VOIX = {
  id: 'MAZdzkb78f8SA7DNBT41',
  nom: 'Nico',
  modele: 'eleven_multilingual_v2',
}

export const TEXTES = {
  '01': `Dix-neuf heures. Un client vous écrit, vous êtes encore sur un chantier.
Mon logiciel lit sa demande et chiffre le devis : les postes, les quantités, le total.
Puis il s'arrête. Il le pose en brouillon et l'y laisse.
Il ne l'envoie pas, et il ne peut pas. C'est vous qui cliquez, ou personne.`,

  '02': `Ma base de prix contient huit métiers. Trente-trois lignes.
Si le vôtre n'y est pas, l'assistant partira d'ordres de grandeur du marché, affichés comme tels.
Vos prix passent devant dès que vous les saisissez.
Je préfère vous le dire ici qu'au premier devis.`,

  '03': `Une IA polie promet à votre place. Je passe demain matin. Garantie décennale.
Disponible sept jours sur sept.
Chez moi, un filtre relit chaque réponse et retire ces phrases quand votre profil ne les porte pas.
Pas une consigne qu'on espère voir tenir : du code qui coupe.`,

  '04': `Vos clients vous écrivent des choses qu'ils ne diraient pas à un inconnu.
Pour qu'on regarde un devis chez vous, il faut votre clic.
La fenêtre dure une heure et se referme seule.
Et même ouverte, on voit la forme, jamais le fond.`,

  '05': `La facture électronique est entrée en vigueur le premier septembre.
Un PDF scanné ne suffit plus : il faut des données lisibles par une machine.
Votre métier ne change pas, seulement le format.
Pour votre cas précis, voyez votre comptable, pas une publication.`,

  '06': `J'ai testé mon IA sur une phrase de vitrier. Ma vitre est cassée. Verdict : normal.
La liste des mots d'urgence a été écrite pour la plomberie et l'électricité.
Aucun mot du vitrage, aucun de la serrurerie.
Je le dis avant que vous le découvriez.`,

  '07': `Vingt-neuf, cinquante-neuf, quatre-vingt-dix-neuf euros par mois.
L'essai est gratuit, trois crédits, sans carte bancaire.
Un crédit, c'est une réponse envoyée ou un devis chiffré.
Vous ne payez pas au client, vous payez à la réponse.`,

  '08': `Un site à votre nom, sur votre propre nom de domaine, compris dès la formule d'entrée.
Le mot Presti n'apparaît nulle part côté client.
Mais l'argument est ailleurs : un beau site qui se tait reste un site muet.`,

  '09': `Camion, dépôt, chantier : un seul stock, trois lieux.
Vous posez un seuil, vous êtes alerté avant d'être à sec.
Et vous cherchez une référence chez vos fournisseurs sans quitter l'application.
C'est à partir de cinquante-neuf euros. Photographier une facture, ça n'existe pas.`,

  '10': `Quelqu'un s'est abonné. Un artisan qui ne me connaissait pas.
Je ne dirai pas qui : il a payé un logiciel, pas une publicité.
Un abonné n'est pas une preuve.
Mais entre zéro et un, il y a toute la différence entre une idée et un produit.`,
}
