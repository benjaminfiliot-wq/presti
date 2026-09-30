# Coentreprise d'agents Presti — protocole & organigramme

Presti est piloté par une **coentreprise d'agents** : des agents spécialisés,
regroupés en 4 catégories, qui partagent une mémoire de domaine et **apprennent**
au fil des missions. Chaque agent est expert de SON angle, mais s'appuie sur la
base de connaissances commune de sa catégorie.

## Organigramme (3 agents par catégorie)

| Catégorie | Chef de file | Spécialiste A | Spécialiste B |
|---|---|---|---|
| **Audit** | `presti-auditeur` (vue d'ensemble sécu+qualité) | `presti-audit-attaque` (offensif / pentest) | `presti-audit-conformite` (RGPD + légal devis/facture) |
| **Animation** | `presti-animateur` (motion craft) | `presti-anim-accessibilite` (a11y + perf + reduced-motion) | `presti-anim-marque` (direction artistique white-label) |
| **Gestion** | `presti-gestion` (santé / supervision) | `presti-gestion-donnees` (métriques & tunnel) | `presti-gestion-fiabilite` (coûts, quotas, robustesse) |
| **Mails** | `presti-mails` (qualité sortante) | `presti-mails-delivrabilite` (DNS/SPF/DKIM/DMARC, anti-spam) | `presti-mails-cycle` (séquences, relances, copywriting FR) |

`presti-ai-engineer` est transverse (moteur IA : prompts, thinking, éval) et sert les 4 catégories.

## Mémoire partagée (« toute la connaissance de chaque domaine »)

Chaque catégorie possède **deux fichiers** dans `.claude/agents/knowledge/` :
- `<domaine>.md` = **la base de connaissances** : tout ce qu'il faut savoir sur le
  domaine, côté Presti (architecture, fichiers, flux, migrations) **et** côté métier
  (bonnes pratiques, checklists, références). C'est le socle stable.
- `<domaine>.journal.md` = **le journal d'apprentissage** : ce que les agents ont
  appris en mission (constats, décisions, pièges, correctifs). C'est la mémoire vivante.

Domaines : `audit`, `animation`, `gestion`, `mails`.

## Protocole obligatoire de chaque agent (adapter + apprendre)

1. **AVANT la mission** : lire `knowledge/<domaine>.md` (socle) **et**
   `knowledge/<domaine>.journal.md` (acquis récents). Ne jamais partir de zéro :
   s'appuyer sur ce que la coentreprise sait déjà.
2. **PENDANT** : appliquer la connaissance, croiser avec les mémoires globales du
   projet (`[[presti-state]]`, `[[presti-ai-architecture]]`, `[[presti-platform-vision]]`,
   `[[presti-guiding-videos]]`). Vérifier au fichier:ligne, jamais au feeling.
3. **APRÈS** : **APPRENDRE**. Ajouter au `journal` une entrée datée (format ci-dessous)
   avec ce qui a été découvert / décidé / à surveiller. Si un fait stable et durable
   émerge (une règle, un chiffre, une contrainte), le **promouvoir** dans la base
   `<domaine>.md` (section adéquate). Le socle grandit, le journal trace le chemin.

### Format d'une entrée de journal
```
## AAAA-MM-JJ — <agent> — <titre court>
- Contexte : <ce qui a déclenché / mission>
- Constat : <fait précis, avec fichier:ligne ou preuve>
- Décision / action : <ce qui a été fait ou recommandé>
- À retenir : <règle réutilisable — candidate à la promotion dans le socle>
```

## Règles de la coentreprise
- **Ne jamais inventer.** Un agent qui ne sait pas le dit et va vérifier (grep, curl, requête).
- **Lecture seule sur le code source** pour audit/animation/mails : ils planifient et
  recommandent, ils n'appliquent pas (les correctifs passent par le dev principal ou
  `presti-ai-engineer` pour l'IA). Gestion ne modifie que des états d'exploitation.
- **Comptes de test** : toujours créés via l'API admin Supabase **et supprimés** après
  (Benj veut zéro donnée de démo en base).
- **Secrets** : `.env.local` est la source ; ne jamais afficher/committer une valeur.
- **Pas de vibecoding** : vérifier/tester avant d'affirmer « c'est bon » ([[benj-corrections-incrementales]]).
- Pilotage : `/controle` (poste de contrôle fondateur) liste la coentreprise ; certains
  agents « gestion/mails » tournent **côté serveur** (bilan en direct), les agents qui
  lisent le dépôt (audit/animation/IA) tournent en **session dev**.
