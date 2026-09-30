# Conditions de l'API `ads_archive` de Meta : lecture du 2026-09-29

**Verdict prudent : conditions non lisibles le 2026-09-29. Aucun contact de prospect venu de la bibliothèque Meta tant qu'elles ne le sont pas.**

Cette lecture est celle de la fiche 026-162 (point 4 bis, contre-revue I5). Elle ne conclut pas que l'usage est interdit : elle constate qu'on n'a pas pu le lire, et traite ce défaut comme un refus.

## Adresses tentées le 2026-09-29

| Adresse | Résultat |
| --- | --- |
| https://developers.facebook.com/terms/ | HTTP 200, mais la page servie est une coquille : le texte des clauses n'y figure pas (rendu par script, aucune clause lisible sans navigateur connecté). |
| https://www.facebook.com/ads/library/api/ | HTTP 403 : la page d'usage de l'API Ad Library refuse la lecture sans session. |
| https://www.facebook.com/policies_center/ | HTTP 200, page d'aiguillage sans clause sur l'API de la bibliothèque. |
| https://transparency.meta.com/policies/ad-standards/ | HTTP 200, normes publicitaires : ne traite pas de l'usage de l'API. |

Aucune clause n'a pu être citée : rien n'est donc mis entre guillemets ici.

## Un usage par ligne

- Repérer des artisans qui font de la pub : [interprétation] non tranchable, conditions non lues ; traité comme interdit par prudence.
- Repérer des marques pour le Studio : [interprétation] non tranchable, conditions non lues ; traité comme interdit par prudence.
- Contacter ensuite l'entreprise par son propre site : interdit tant que les conditions ne sont pas lues ; le contact passerait par les coordonnées publiques de l'entreprise, jamais par Meta, mais le repérage qui le précède doit d'abord être permis.

## Conséquence

- La vigie Meta (026-072) continue de compter, sans rien préparer.
- La Plume ne prépare rien et le Facteur n'approuve rien pour un prospect venu de la bibliothèque Meta (026-087, 026-063).
- Les prospects venus d'ailleurs (sites, annuaires, Google) ne sont pas touchés.

## Pour lever ce refus

Relire les conditions dans un navigateur connecté (Benj ou un agent avec accès), citer les clauses utiles en moins de 15 mots avec leur adresse, remplacer les trois lignes d'usage par « permis » ou « interdit », dater, et poser en base un nouvel événement `lecture_ads_archive` de l'agent `systeme` (`PERMIS <date>` ou `REFUSE <date> : <clause>`).

Verdict : REFUSE
