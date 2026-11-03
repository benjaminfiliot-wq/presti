## Ressources utilisées
- MCP cerveau (`regles_pour`) : a rendu la consigne de Benj du 03/11 — Entreprise = carte « Sur mesure » + « Nous contacter », pas de démonstration, offres façon claude.com ; d'où une carte sobre, sans prix.
- Skill presti-design (palette/cartes de la landing) : j'ai réutilisé les classes existantes (`lp-plan`, `lp-spot`, `lp-btn`, `abo-card`, `psh-btn`) plutôt que d'inventer un style ; une seule règle CSS ajoutée.
- Prompt 6 § 2.2 (`plans/011-cadrage-01-11/prompts-benj/p6-...md:445-457`) : source des trois bénéfices.
- `lib/plans.ts` (`PLANS.entreprise`) : label, accroche et `surDevis`, lus et non recopiés.
- Juge existant `offres-affichage-qa.mjs` : resté vert (286/286), donc Studio et Signature inchangés.

## Fait
- `app/OffreEntreprise.tsx` (nouveau) : carte pleine largeur sous Studio/Signature, trois bénéfices, « Parler à l’équipe » → `/contact?motif=entreprise`.
- `app/page.tsx` et `app/abonnement/page.tsx` : une ligne d'import, une ligne de rendu. `app/accueil.css` : 3 règles.
- `scripts/offre-entreprise-site-qa.mjs` : juge + 4 mutants (carte retirée, prix écrit, lien cassé, accroche en dur), tous vus.
- Contraste/mouvement réduit : mêmes classes que les cartes existantes, aucune animation ajoutée. Aucune capture prise (pas d'écran ici).
- Hors périmètre, à noter : la page /contact ignore encore `?motif=` et l'enregistrement dépend du drapeau `demandesDemo` (baissé).
