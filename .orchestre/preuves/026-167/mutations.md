# Rapport de mutations 026-167

Note : La commande ex�cut�e pr�pare un index Git local temporaire sur la copie afin d'exclure node_modules et .orchestre de l'analyse, et n'affecte jamais le d�p�t r�el.

## Témoin
PASS (code 0)

* **SO-1** (app/studio/commander/[jeton]/page.tsx) cass� : FAIL SO-1 — « 490 » ou « 49000 » hors de lib/studio/offre.ts : app/studio/commander/[jeton]/page.tsx
* **SO-2** (lib/studio/offre.ts) cass� : FAIL SO-2 — SO-2 : la copie à 59000 centimes affiche encore « 490 €
* **SO-3** (app/api/studio/commander/route.ts) cass� : FAIL SO-3 — payment_intent_data : type: 'pack_studio' introuvable ; payment_intent_data : pack_id introuvable ; payment_intent_data : marque_cle introuvable
* **SO-3** (app/api/studio/commander/route.ts) cass� : FAIL SO-3 — invoice_creation.enabled: true introuvable
* **SO-4** (lib/stripeAiguillage.ts) cass� : FAIL SO-4 — SO-4 : l'aiguillage ne respecte pas les règles strictes : cas {"mode":"subscription","metadata":{"type":"pack_studio","pack_id":"x"},"payment_status":"paid"} -> pack_studio (attendu orphelin)
* **SO-5** (lib/studio/commandeServeur.ts) cass� : FAIL SO-5 — encaisserPackStudio ne met pas à jour avec .eq('etat', 'brouillon')
* **SO-6** (app/api/studio/commander/route.ts) cass� : FAIL SO-6 — chaîne 'subscription' trouvée : le Studio est un paiement unique
* **SO-7** (lib/studio/offre.ts) cass� : FAIL SO-7 — jeton au 22e jour : non expiré (null attendu)
* **SO-8** (scripts/studio/deposer-echantillon.mjs) cass� : FAIL SO-8 — SO-8 : vidéo > 3Mo (3Mo + 1 octet) acceptée (code 0) ; SO-8 : appel Supabase détecté pour une vidéo > 3Mo (le réseau doit être évité si la vidéo est refusée)
