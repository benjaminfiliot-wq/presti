---
name: presti-messagerie-entreprise
description: "La boîte de l'entreprise Presti — quelle adresse, quel serveur, et les quatre pièges qui l'avaient bloquée"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7e59f8cf-41af-4413-b326-b03458018a55
  modified: 2026-09-07T19:44:31.809Z
---

La boîte relevée par le Poste de contrôle est **`<e-mail caviardé>`** (`IMAP_USER` sur Vercel,
production seulement), pas `contact@prestiapp.fr`.

**`contact@prestiapp.fr` envoie mais ne reçoit pas** : c'est le domaine signé DKIM chez Resend, et
aucune boîte n'existe derrière — un mail de test y rebondit. Ne plus proposer de la relever. Les
réponses ne se perdent pas pour autant : `replyTo` pointe vers l'artisan (mails au nom d'un artisan)
ou vers l'adresse d'entreprise (mails de Presti).

**Les quatre pièges levés le 2026-09-07**, dans l'ordre où ils bloquaient :

1. deux fichiers devinaient deux serveurs pour le même compte → `boiteEntrepriseResolue()` dans
   `lib/canaux.ts` est désormais la seule résolution, et déduit l'hôte de l'adresse ;
2. l'échec de relève ne remontait nulle part (`passages_cron` disait `reussi: true`) ;
3. `contact@prestiapp.fr` n'existe pas (voir plus haut) ;
4. **un mot de passe d'application Google s'affiche en « abcd efgh ijkl mnop » et les espaces n'en
   font pas partie** — le code les retire quand la valeur a exactement cette forme.

La relève tourne dans le cron des relances (8 h), pas dans sa propre tâche : le plan Vercel n'accorde
que deux crons, tous deux pris. Elle reprend **par UID** depuis le plus haut enregistré, pas par
fenêtre de séquence — sinon une salve fait glisser des messages hors de portée, définitivement.

Le classement par nature vit dans `lib/direction/natures.ts` + migrations 0072 et 0073, **sans aucun
appel de modèle**. Les listes de domaines se remplissent après observation d'un vrai message, jamais
de mémoire. Voir [[deux-chiffres-un-ecran]] pour la règle voisine.
