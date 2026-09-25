---
name: presti-platform-vision
description: "Vision de la \"plateforme de communication\" artisan à construire pour Presti (gros chantier demandé le 2026-08-30)"
metadata: 
  node_type: memory
  type: project
  originSessionId: f2774700-2996-4ee8-bfc0-5b67f39c3350
  modified: 2026-08-31T16:30:29.918Z
---

**V1 LIVRÉE le 2026-08-31** : mini-site white-label personnalisable (accent+logo) + conversation en direct client↔IA + boîte de réception → devis en 1 clic.

**VISION V2 (demandée le 2026-08-31, « le plus gros morceau », à faire à la perfection avec TOUS les agents + skills)** — Benj juge la V1 « extrêmement pas suffisante ». La plateforme doit devenir un **truc à part, extrêmement puissant et personnalisable** :
1. **/l/[slug] considérablement amélioré** : plus propre, « réel », très personnalisable (nom d'entreprise, branding). Interface un peu meilleure, connectable, mais rester simple.
2. **Portfolio par IMAGE** : montrer par images ce que fait l'artisan, ses différentes **spécialités**, ses réalisations.
3. **Canaux connectés** : son Gmail, son numéro de téléphone, **n'importe quel réseau** (Instagram…). L'artisan reçoit tout (Instagram, ce qu'il veut).
4. **Réponse automatique OU manuelle au CHOIX** (toggle) : peut être auto, ou l'artisan répond lui-même. Dans tous les cas il reçoit tout.
5. **Demandes → plateforme → devis/facture automatiques** sur la plateforme (si l'artisan le veut). Mettre tous les **paramètres** nécessaires.
6. **Constructeur de site web — 3 niveaux** (dans le DERNIER palier d'abonnement, sur demande) : système de création de site perso en 3 niveaux ; le **niveau 3 = équivalent aux vidéos** envoyées (meilleures techniques/animations). **Ajouter les 3 types de sites dans la DÉMO** (vitrine). Pouvoir **connecter la plateforme au site web** (embeddable, activable/désactivable — « enlevé du site et remis »).
7. Extrêmement puissant, très propre, exécution « au mot près ». Utiliser tous les agents/skills.

**Phasage (Claude)** : V2 est multi-semaine.
- (a) **FAIT 31/08** : portfolio par image + spécialités (composant PortfolioUpload, galerie `.plat-gallery` sur /l/[slug]).
- (b) **FAIT 31/08** : canaux connectés (tel_public, email_public, reseaux instagram/facebook/tiktok/linkedin/whatsapp/google/site) → pills section contact + icônes footer.
- (c) **FAIT 31/08** : toggle réponse **auto/manuelle** (reponse_auto) câblé dans /api/leads + /api/conversation (manuel = trace + notifie, pas d'IA ; prospect voit un accusé). Migration 0018.
- Chat plateforme raffiné **inspiration Claude** (barre de saisie unifiée épurée). Interfaces de communication = « comme Claude » (demande de Benj).
- **RESTE (d)** : constructeur de site web **3 niveaux** (dernier abonnement ; niveau 3 = niveau vidéos), **3 types de sites dans la démo**, connexion plateforme↔site (embed activable/désactivable), + devis/facture **automatiques** sur la plateforme plus poussés. Gros morceau à venir. Voir [[presti-state]].

Benj voulait une **plateforme de communication** pour chaque artisan (extension de la page /l/[slug]).

**Le concept (réalisé) :**
- Une page-plateforme par artisan où il met **toutes ses infos** (ce qu'il propose, services…), connectée au site.
- Un lien qu'il colle **dans sa bio** (Facebook, Insta, site perso…). Le client clique → arrive sur la plateforme.
- Le client **communique** (fait sa demande) ; l'**IA répond** — par mail, par message, ou **directement sur la plateforme**.
- But central : **le client de l'artisan communique avec l'artisan via la plateforme**, et l'IA répond (ultra précis, adapté, **très HUMAIN**).
- Ça **relie aux autres fonctionnalités** : l'artisan n'a plus qu'à envoyer les réponses/générer → devis, facture.

C'est la concrétisation du palier "réponse auto 24/7 + site web" (Studio/Signature). L'IA de réponse doit être au niveau de [[presti-ai-architecture]]. Voir [[presti-state]].
