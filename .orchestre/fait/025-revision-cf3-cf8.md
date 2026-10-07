---
id: 025-revision-cf3-cf8
type: test
objectif: Appliquer la révision fermée CF3 et CF8 relue indépendamment, préserver le témoin historique authentique et contrôler le typecheck du HEAD courant sur copie Oracle sans modifier les autres juges
perimetre: [scripts/constructeur-ferme-qa.mjs, .orchestre/preuves/025-revision-cf3-cf8/**]
interdit: [tsconfig.json, package.json, package-lock.json, app/**, lib/**, supabase/**, public/**, scripts/fixtures/**, scripts/juges-025-mutations.mjs, scripts/fermeture-e2e.mjs, scripts/site-sorti-des-formules-verifier.mjs, .orchestre/decisions.md]
verifier: ssh -o BatchMode=yes -o ConnectTimeout=10 -i C:/Users/benja/.ssh/presti-usine usine@88.96.53.3 "cd /home/usine/presti/.orchestre/travail/revision-cf-1007 && node scripts/constructeur-ferme-qa.mjs --critere=CF-1,CF-2,CF-3,CF-4,CF-8"
budget: { fichiers: 8, minutes: 30 }
preuve: sauvegarde octets du juge, inventaire V2 et journal candidat, relecture indépendante, nouveau verdict réel courant Oracle dans verifier.log ; aucun PASS global 025-10 ou déploiement
executant: codex
---

# Révision mécanique bornée CF3 et CF8

Autorisée par Benjamin pour poursuivre le chantier avec l'équipe et par le coordinateur après la relecture indépendante V2. NO-GO V1 conservé. Candidat autorisé uniquement SHA256 4980a79acd429ea88e83da26e27fbe1149ce12f9a07ad61f554599281e2b8b65 ; juge base SHA256 02a77cae1a824d4d150a195f689d0dd22fa91ba1eb5747fe3d30cdd8006749a5.

Le HEAD e58278153f383376b734a3bb798a5387f6c5ef35 a été relu : dépendances CF3 inchangées et six empreintes de l'inventaire identiques ; deux sources TypeScript acquisition changées nécessitent CF8 courant. Conserver tsconfig PC, comprenant ses deux includes audit ; ne jamais appliquer la migration0134 dans cette tâche.

CF3 conserve les contrôles sémantiques de protections, gardes026, FLAGS, 404 et constructeur, plus un inventaire SHA fermé. CF8 autorise uniquement la configuration Next16 exacte ou son extension audit exacte ; vrai typecheck requis. Le témoin historique1620723 demeure contrôlé après construction authentifiée, jamais par une marque arbitraire. Preuves des quatre sabotages CF3 causaux, des deux CF8 et des deux historiques conservées puisque candidat et dépendances CF3 n'ont pas changé.

Prendre le bail avant toute écriture du juge ; sauvegarder octets et SHA. Pas de copie de chemins OPS dans les imports. Pas de test025 global ni d'assouplissement de juge. Faire verifier depuis en-cours puis fait avant commit local strict des seuls chemins autorisés ; pas de push. Une évolution ciblée impose arrêt et relecture, jamais faux PASS.
