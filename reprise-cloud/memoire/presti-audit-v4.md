---
name: presti-audit-v4
description: Audit indépendant Presti du 2026-09-03 — 15 défauts trouvés dont 3 de moi ; mentions légales livrées ; 2 des 3 réglages Supabase posés, reste la détection de rejeu des jetons
metadata: 
  node_type: memory
  type: project
  originSessionId: f2774700-2996-4ee8-bfc0-5b67f39c3350
  modified: 2026-09-03T08:08:46.351Z
---

Audit final du chantier v4 ([[presti-state]]), le 2026-09-03, par **quatre relecteurs indépendants** du code écrit. Rapport complet : `plans/audit-v4.md` dans le dépôt.

**Ce que ça a appris, et qui vaut au-delà de Presti :**
- **Trois des défauts les plus graves étaient les miens, et deux annulaient une correction livrée le jour même.** La révocation de sessions : faille trouvée, correctif écrit, test écrit, test vert — et le correctif ne marchait pas, parce que le test ne rejouait que le jeton d'accès et jamais le jeton de rafraîchissement. **Un test qui ne vérifie que ce qu'on a pensé à vérifier donne une fausse assurance, ce qui est pire que pas de test : on cesse de chercher.**
- **Quatre défauts sur quinze viennent d'un périmètre oublié, pas d'une erreur de raisonnement** : une colonne ajoutée sans être ajoutée au verrou de privilèges, une branche de code jamais empruntée (le scellement des factures), un bucket resté public depuis sa création, un test a11y vert parce qu'il ne regardait pas les pages de connexion.
- **J'ai remplacé une affirmation inventée par une autre** : en retirant « Travail assuré » de la bande de réassurance, j'y ai mis « réponse en quelques minutes », pas plus fondé. La règle anti-fabrication ne se respecte pas en supprimant les mentions les plus visibles, mais en ne mettant que ce qui est mesuré.

**Corrigé et vérifié le jour même** (`scripts/audit-correctifs-e2e.mjs`, 19/19 en prod, rejoue *exactement* les attaques des auditeurs) : bucket `lead-media` privatisé (les photos de domiciles de clients étaient téléchargeables par n'importe qui), révocation de sessions réellement effective et non annulable, factures scellées à la création, `tva_regime` enfin écrit, domaine non détournable, RPC d'inventaire non anonyme, canoniques des 5 pages légales, deux infractions a11y critiques sur /login et /signup, validation du champ contact, CSP resserrée, promesses de vente alignées sur ce qui est livré.

**Réglages Supabase — état au 2026-09-03 (soir), vérifié par leur EFFET avec `node scripts/verif-supabase-reglages.mjs` :**
1. ✅ **Durée du jeton d'accès ramenée à 900 s** (15 min, contre 3600). Fait par Benj.
2. ❌ **Détection de rejeu des jetons de rafraîchissement** — Auth → Sessions. La **rotation est bien active** (un nouveau jeton est émis à chaque rafraîchissement — vérifié, ce n'est donc pas elle qui manque), mais un ancien jeton rejoué après le délai de grâce répond encore 200 : un jeton volé donne un accès parallèle invisible. **Délai d'attente porté à 70 s** dans le test (le délai de grâce par défaut est de 10 s mais réglable) : même verdict, donc ce n'est pas un artefact de mesure.
3. ✅ **Politique de mot de passe** — fait par Benj le 2026-09-03. Vérifié par l'effet : `12345678`, `password`, `azerty123` sont refusés même par un appel DIRECT à l'API. Le chemin est **Authentication → Providers → Email → Minimum password length** (il n'existe pas de page « Passwords ») ; la protection HaveIBeenPwned native, elle, reste réservée au plan Pro — remplacée par notre implémentation maison (voir plus bas).

**Livré le 2026-09-03 (soir), en remplacement gratuit de la fonction Pro** : la protection contre les mots de passe **fuités**, refaite maison avec l'API libre de Have I Been Pwned en **k-anonymat** (seuls les 5 premiers caractères de l'empreinte SHA-1 quittent la machine ; ni HIBP ni notre serveur ne peuvent savoir de quel mot de passe il s'agit). L'appel passe par `/api/auth/mdp-fuite` plutôt que depuis le navigateur, pour ne pas rouvrir la CSP resserrée par l'audit. **Et un défaut que les quatre auditeurs avaient manqué** : `/api/auth/reset-confirm` n'exigeait que 8 caractères et n'appliquait aucune règle — on se remettait `azerty12` via « mot de passe oublié » (vérifié en prod : la route répondait `{"ok":true}`). **La porte de derrière était plus large que la porte d'entrée** — leçon à garder : une règle posée sur le chemin principal ne s'applique pas toute seule aux chemins de secours. `scripts/fuite-mdp-e2e.mjs` 25/25, `motdepasse-e2e` 30/31 (l'unique rouge étant le réglage Supabase ci-dessus).

**Livré depuis** : l'**existence juridique des surfaces de l'artisan** — `/site/<slug>/infos-legales` (mentions LCEN + RGPD générées depuis ses données, « non communiqué » quand un champ manque, jamais inventé), information au moment de la collecte sous le composeur, champs manquants ajoutés aux Paramètres avec un bandeau qui dit ce qui manque, médiateur de la consommation (migration 0046). `scripts/legal-e2e.mjs` 30/30.

**Reste ouvert, par gravité** (tout est chiffré dans `plans/audit-v4.md`) : l'accord de sous-traitance art. 28 ; le jeton en cookie `httpOnly` plutôt que `localStorage` ; l'atomicité des compteurs de limitation ; l'image de partage et le favicon par artisan (carte cassée sur WhatsApp, favicon Presti dans l'onglet du client) ; les 404 douces sur `/site/` et `/p/`.

Voir aussi [[presti-state]], [[presti-guiding-videos]], [[benj-corrections-incrementales]].
