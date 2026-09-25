---
name: facebook-page-pieges
description: "Créer une Page Facebook (2026) — l'assistant ne persiste pas les coordonnées, la photo de profil masque le centre de la couverture, et l'interface charge en différé"
metadata: 
  node_type: memory
  type: reference
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-08T22:20:34.049Z
---

Constaté en créant la Page « Presti » le **2026-09-09**, en pilotant le vrai Chrome de Benj. Trois
choses qui ne se devinent pas :

**1. L'écran d'administration n'affiche PAS les coordonnées enregistrées.** Site web, téléphone et
e-mail saisis dans l'assistant de création : invisibles ensuite sur la Page vue en admin. J'en ai
conclu qu'ils n'étaient pas enregistrés et je l'ai annoncé — **c'était faux**. La **vue visiteur**
(un navigateur sans session Facebook, ou une fenêtre privée) les montre tous les trois.
**Règle : ne jamais conclure « ce n'est pas enregistré » depuis l'écran d'admin.** Le navigateur
intégré de l'app (`mcp__Claude_Browser__`), qui n'a aucune session, est la fenêtre privée idéale
pour ce contrôle — il coûte un appel et tranche.

**1 bis. Le piège du bouton d'action.** Tableau de bord → Statut → carte « Ajouter un bouton
d'action » ouvre une boîte « Effectuez cette tâche » avec **Terminé / Ignorer**. **Terminé** marque
la tâche faite et retire la ligne **sans rien configurer** — et ensuite plus aucun point d'entrée
vers l'éditeur n'est atteignable (ni la Page, ni le menu « … », ni Business Suite qui rend un
panneau vide). Poser le bouton AVANT de toucher à cette carte.

**2. La photo de profil se pose AU CENTRE de la couverture**, sur bureau comme sur mobile — et sur
mobile le cercle en couvre presque toute la surface. Une couverture avec du texte centré est donc
illisible. J'avais fait exactement l'inverse : centrer pour survivre au rognage mobile. La bonne
réponse est une couverture **sans aucun texte** (une toile de fond), le message étant porté par le
nom de la Page et la bio, qui s'affichent en clair juste dessous. Le rendre visible avant de
livrer : `scripts/promo-couverture.mjs --guide` trace le cercle et la bande mobile.

**3. L'interface « profil » des nouvelles Pages charge ses sections en différé** et reste parfois
bloquée sur des squelettes gris (`Coordonnées` notamment). Recharger, ou passer par Meta Business
Suite. Ne pas conclure « le champ n'existe pas » sur un écran qui n'a pas fini de charger.

**Et la limite qui n'est pas technique** : créer le compte Facebook lui-même reste à Benj (je ne
crée pas de compte). La Page, elle, se crée sans problème une fois qu'il est connecté sous son vrai
nom — vérifier ce nom AVANT de créer quoi que ce soit : un premier essai avait un compte au nom de
quelqu'un d'autre, et une Page adossée à un profil sous pseudo se fait suspendre au moment où elle
commence à marcher.

Voir [[social-skills-plugins]] et [[presti-state]].
