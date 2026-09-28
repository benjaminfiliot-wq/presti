# Analyse d'intérêt légitime — la prospection des professionnels

**Statut : à approuver par Benj.** Rédigée le 28 septembre 2026, par Claude Code (fiche 026-060,
voie gratuite du 25/09). Ce n'est pas un avis juridique ; les lectures non confirmées sont marquées
[interprétation].

Cette analyse porte sur le seul traitement décrit à la section 11 du registre des traitements
(`docs/registre-traitements.md`) : la prospection d'entreprises du bâtiment et d'annonceurs de la
bibliothèque publicitaire de Meta, par le formulaire de contact de leur propre site, sur la base
légale de l'intérêt légitime (RGPD art. 6.1.f et considérant 47).

## 1. L'intérêt poursuivi

L'intérêt poursuivi par Presti est de proposer, à des professionnels du bâtiment qui n'ont pas
encore de site (ou un site daté), un service directement lié à leur métier — et, pour les
annonceurs déjà actifs dans la bibliothèque publicitaire de Meta, des vidéos publicitaires. C'est
un intérêt économique légitime et ordinaire (développer une clientèle par une offre pertinente),
reconnu par la CNIL pour la prospection entre professionnels en rapport avec la profession de la
personne démarchée (page du 10/06/2026).

L'intérêt n'est pas générique : chaque message cite un fait public et daté (une pub Meta vue, un
site sans HTTPS, un copyright ancien), propre à l'entreprise contactée, jamais un texte interchangeable.

## 2. La nécessité

Le formulaire de contact publié par l'entreprise elle-même est le moyen le **moins intrusif**
disponible pour cet intérêt légitime, pour trois raisons :

- **Aucune adresse n'est relevée.** Contrairement à une prospection par e-mail, la voie gratuite
  ne collecte, ne stocke ni ne réutilise aucune adresse e-mail trouvée sur un site : la seule
  adresse jamais gardée est celle qu'une personne donne elle-même en écrivant. La minimisation
  (RGPD art. 5.1.c) est donc maximale : rien n'est retenu que ce que la personne choisit de
  partager.
- **Le canal est celui que l'entreprise a elle-même ouvert au public.** Publier un formulaire de
  contact est un geste qui invite au contact professionnel ; les formulaires protégés (captcha,
  question antispam, mention explicite « pas de démarchage », CGU contre l'extraction) sont
  systématiquement exclus, sans contournement.
- **Un seul message, à vie, par entreprise.** Le formulaire n'est jamais relancé une fois soumis
  (`ops.prospects.cle_dedup` unique, migration 0105) : il n'y a ni répétition, ni pression, ni
  volume qui dépasserait ce qu'exige l'intérêt poursuivi.

Aucun moyen plus doux n'atteindrait le même but : un annuaire ou une recherche générique
(Google Maps, PagesJaunes) ne permettrait pas de cibler des entreprises pertinentes par métier et
par indice de besoin (site absent, daté, ou publicité active) ; c'est précisément ce ciblage qui
rend le message utile plutôt qu'un envoi de masse.

## 3. La mise en balance

**Attentes raisonnables.** Un professionnel qui publie un formulaire de contact sur son site
s'attend à recevoir des messages professionnels en rapport avec son activité par ce canal — c'est
sa fonction. Un artisan du bâtiment peut raisonnablement s'attendre à ce qu'un prestataire de
services numériques le contacte ainsi, dès lors que le message dit qui écrit, que le message est
rédigé par une IA, et propose un service explicitement lié à son métier.

**Droits et garanties qui compensent l'atteinte.** L'atteinte à la vie privée du professionnel est
faible (aucune donnée personnelle sensible, un seul message, un canal qu'il a lui-même ouvert) et
elle est compensée par des garanties fortes, détaillées au § 4 : information complète dès le
premier message, opposition appliquée en moins de 10 minutes sur tous les canaux, conservation
limitée à 3 ans depuis le dernier contact émanant du prospect, et vingt garde-fous automatiques
tenus par du code ou par la base, qu'aucun agent ne peut lever.

**Conclusion.** L'intérêt légitime de Presti l'emporte sur l'atteinte, limitée, aux intérêts et
libertés du professionnel contacté, parce que le moyen choisi est le moins intrusif possible et que
des garanties concrètes, vérifiables et automatiques encadrent chaque message.

## 4. Les vingt garde-fous

Chacun est tenu par du code, par un agent ou par la base (migration 0105, 026-060). Aucun agent ne
peut le lever ; seul Benj change un plafond.

1. La première phrase de tout premier message annonce un message **commercial**, rédigé par l'**assistant IA** de Presti, qui n'est **pas une demande de devis** — tenue mot pour mot par J3 (026-083) et par le porteur du formulaire (026-095).
2. L'objet du message est toujours lié au métier du destinataire ; jamais de faux « Re: » ni de « Votre demande » — J3 (026-083).
3. La source (ADEME ou Meta), l'adresse de la notice et le moyen de refuser (« écrivez STOP ») figurent dans le premier message — J3 (026-083), notice publiée par 026-039.
4. Un STOP est repéré par du code, avant tout modèle de langage ; en moins de **10 minutes**, toutes les clés (SIREN, domaine, compte Instagram, page Meta) passent en opposition sur tous les canaux — `acq_opposer` de la migration 0105 (026-060).
5. Au moindre signe de protection (captcha, case robot, question antispam, défi JS, pare-feu, extension antispam) : abandon **définitif**, sans nouvel essai ni contournement — le Lecteur (026-020).
6. Au moindre refus affiché (« pas de démarchage »), ou à la moindre clause de CGU contre l'extraction ou les robots : abandon — le Lecteur (026-020).
7. `robots.txt` est lu pour la page du formulaire **et** pour l'URL de soumission, avec un User-Agent honnête ; au plus une requête par seconde — le Lecteur (026-020) et le porteur du formulaire (026-095).
8. Un formulaire par entreprise, à vie, jamais relancé : la dédoublonnage tient par `cle_dedup`, contrainte unique de `ops.prospects` — 0096 et migration 0105 (026-060).
9. La suite d'une conversation ne part que par le Gmail de prospection, à qui a d'abord écrit, avec une **preuve de demande** — les échanges, migration 0106 (026-061).
10. Aucune adresse d'un professionnel n'est relevée avant qu'il écrive lui-même (R4 : non) — le Lecteur (026-020).
11. Aucun lien `prestiapp.fr` ni sous-domaine n'apparaît dans un message avant un « oui » du destinataire — J3 (026-083).
12. Aucun pixel de suivi n'est posé dans un message envoyé — J3 (026-083).
13. La liste fermée des affirmations vraies que le message peut porter ; un second juge indépendant traque les promesses implicites — J3 et le second juge (026-083).
14. Toute demande liée au RGPD reçoit un accusé de réception puis une réponse dans le mois (art. 12.3) — le Standard (026-085) et le Répondeur (026-096).
15. Conservation de **3 ans** à compter de la collecte ou du **dernier contact émanant du prospect** ; au-delà, l'opposition est gardée, réduite à ses clés — `acq_purger` de la migration 0105 (026-060).
16. Ce registre des traitements et cette analyse d'intérêt légitime sont rédigés une fois par un agent, approuvés par Benj, et citent les sous-traitants et leurs rôles — section 11 du registre et ce document (026-060).
17. Sur Meta : une réponse privée par commentaire dans les 7 jours qui suivent, dans la fenêtre de 24 h de la conversation, jamais le tag `HUMAN_AGENT` — le Répondeur (026-096).
18. Les disjoncteurs du veilleur (STOP au-delà du seuil, plaintes, échecs de soumission répétés, agent muet) arrêtent le canal concerné et ouvrent une décision pour Benj — le veilleur (026-047).
19. La pause générale (`ops.interrupteurs`) est lue avant toute action sortante par chaque porteur — `acq_en_pause` de la migration 0105 (026-060), routes cron (026-077).
20. La notice publique (mentions légales, moyen de contact, page `/robot`) est publiée et son adresse est citée dans chaque premier message — la notice (026-039).

## 5. Sous-traitants cités

Voir la section 11 du registre des traitements (`docs/registre-traitements.md`) : Supabase,
Vercel, Google, Meta, OpenAI, Oracle et GitHub, avec le rôle de chacun.
