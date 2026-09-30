# Recette entrante — jalon du 27/09, contrôle local du 30/09/2026

Verdict du scénario documentaire : **pratiquement prêt**. Ce terme est celui du contrat du juge ; il ne mesure pas la disponibilité du produit. Toutes les étapes sont **simulées**, y compris la demande, les refus et les deux accords. Aucun oui de Benj n'a été recueilli. Aucun message réel envoyé. L'intégration reste non mesurée.

Toutes les personnes et adresses sont fictives. L'horloge du scénario est fixée au 27/09 à 09:00 UTC (11:00 Paris). Les horodatages sont synthétiques ; les durées sont nulles, aucune latence réelle n'est annoncée. Début de l'exécution locale : 2026-09-30T10:21:16.256Z.

Le journal ci-dessous est construit indépendamment du témoin de 026-220. Il décrit la politique attendue, pas une sortie de l'application. Les valeurs juge_faits=ok et ollama-local sont simulées : aucun juge des faits sur ces textes et aucun modèle ne sont invoqués. Aucun transfert vers un fournisseur, aucun appel réseau, aucune dépense. La prospection froide reste fermée jusqu'au 12/10.

## Étapes

- demande : simulé, 2026-09-27T09:00:00.000Z.
- preparation : simulé, 2026-09-27T09:01:00.000Z.
- accord : simulé, 2026-09-27T09:02:00.000Z.
- envoi : simulé, 2026-09-27T09:03:00.000Z.
- reponse : simulé, 2026-09-27T09:04:00.000Z.
- preparation_2 : simulé, 2026-09-27T09:05:00.000Z.
- accord_2 : simulé, 2026-09-27T09:06:00.000Z.
- envoi_2 : simulé, 2026-09-27T09:07:00.000Z.
- opposition : simulé, 2026-09-27T09:08:00.000Z.
- arret : simulé, 2026-09-27T09:09:00.000Z.

Les textes exacts, sources, plafond, destinataire, empreintes, canal et expiration sont dans le journal. La case commence non cochée ; le scénario la coche explicitement. Le second accord est distinct et expire séparément. Opposition STOP puis arrêt : zéro envoi après opposition et zéro relance dans le scénario. Une retouche de texte ou une expiration doit invalider l'accord.

## Preuves et limites

simulation.log contient la sortie brute de génération et l'état des dépendances constaté dans fait/ et verdicts.jsonl. verifier.log contient le contrôle mécanique du document. Les tests de fautes du juge sont distincts de cette recette : ils ne démontrent aucune intégration Gmail ni API entrante. Reprise : contrôler le drapeau prospectsEntrant, la demande explicite, le stockage du consentement et les refus sans effet ; exercer 026-065 sur le texte puis présenter l'accord individuel à Benj avant le porteur de 026-145. Le drapeau est actuellement false dans la carte du code ; aucune activation n'est effectuée ici.

```json recette-entrant
{
  "recette": "026-225",
  "horloge_debut": "2026-09-27T09:00:00.000Z",
  "froid_ouvert": false,
  "verdict": "pratiquement prêt",
  "ecarts": [
    {
      "ecart": "Cette recette exerce exclusivement le contrat documentaire : aucune API formulaire, inférence Ollama, autorisation humaine ni connexion Gmail.",
      "reprise": "Faire une recette intégrée autorisée avec les composants des dépendances, conserver leurs sorties brutes et obtenir chaque accord individuel avant un envoi réel."
    }
  ],
  "dependances": {
    "026-220": {
      "fiche_fait": true,
      "dernier_verdict": {
        "id": "026-220",
        "verdict": "PASS",
        "ligne": "",
        "code": 0,
        "date": "2026-09-28T05:49:03Z",
        "duree_s": 52,
        "agent": "?",
        "executant": "claude-code",
        "lignes": 0,
        "dossier": "fait"
      }
    },
    "026-065": {
      "fiche_fait": true,
      "dernier_verdict": {
        "id": "026-065",
        "verdict": "PASS",
        "ligne": "",
        "code": 0,
        "date": "2026-09-26T15:57:21Z",
        "duree_s": 8,
        "agent": "ag-065g",
        "executant": "antigravity",
        "lignes": 527,
        "dossier": "fait"
      }
    },
    "026-145": {
      "fiche_fait": true,
      "dernier_verdict": {
        "id": "026-145",
        "verdict": "PASS",
        "ligne": "",
        "code": 0,
        "date": "2026-09-30T01:29:21Z",
        "duree_s": 35,
        "agent": "usine-codex-506",
        "executant": "codex",
        "lignes": 519,
        "dossier": "fait",
        "machine": "usine"
      }
    },
    "026-096": {
      "fiche_fait": true,
      "dernier_verdict": {
        "id": "026-096",
        "verdict": "PASS",
        "ligne": "",
        "code": 0,
        "date": "2026-09-29T21:11:58Z",
        "duree_s": 44,
        "agent": "claude-code",
        "executant": "codex",
        "lignes": 1218,
        "dossier": "fait",
        "machine": "usine"
      }
    }
  },
  "messages_envoyes": 0,
  "etapes": [
    {
      "etape": "demande",
      "etat": "simulé",
      "heure": "2026-09-27T09:00:00.000Z",
      "duree_s": null,
      "id_demande": "dem-relais-225",
      "type": "entrante",
      "adresse": "relais.recette@presti-test.invalid",
      "consentement": {
        "precoche": false,
        "coche": true
      },
      "preuve": "entrée fictive construite par simulation.mjs, aucune soumission API",
      "opposition": true,
      "doublon_rejete": true,
      "sans_consentement_rejete": true,
      "retiree_le": null
    },
    {
      "etape": "preparation",
      "etat": "simulé",
      "heure": "2026-09-27T09:01:00.000Z",
      "duree_s": null,
      "destinataire": "relais.recette@presti-test.invalid",
      "texte": "Merci pour votre demande fictive. Voici le compte rendu de votre essai. Pour vous opposer à tout autre message, répondez STOP.",
      "empreinte": "22d25faa81668fb887d487fb3804a4a23033acde695821d973c2f2ccffc3b29d",
      "source": "scénario fictif dem-relais-225 / tour 1",
      "plafond": 1,
      "modele": {
        "fournisseur": "ollama-local",
        "modele": "simulation-sans-inference"
      },
      "juge_faits": "ok"
    },
    {
      "etape": "accord",
      "etat": "simulé",
      "heure": "2026-09-27T09:02:00.000Z",
      "duree_s": null,
      "id_accord": "acc-relais-1",
      "destinataire": "relais.recette@presti-test.invalid",
      "canal": "email",
      "empreinte": "22d25faa81668fb887d487fb3804a4a23033acde695821d973c2f2ccffc3b29d",
      "expire_le": "2026-09-27T10:00:00.000Z",
      "portee": "envoi-unique"
    },
    {
      "etape": "envoi",
      "etat": "simulé",
      "heure": "2026-09-27T09:03:00.000Z",
      "duree_s": null,
      "id_accord": "acc-relais-1",
      "id_message": "msg-relais-1",
      "destinataire": "relais.recette@presti-test.invalid",
      "empreinte": "22d25faa81668fb887d487fb3804a4a23033acde695821d973c2f2ccffc3b29d",
      "type": "reponse-sollicitee"
    },
    {
      "etape": "reponse",
      "etat": "simulé",
      "heure": "2026-09-27T09:04:00.000Z",
      "duree_s": null,
      "de": "relais.recette@presti-test.invalid"
    },
    {
      "etape": "preparation_2",
      "etat": "simulé",
      "heure": "2026-09-27T09:05:00.000Z",
      "duree_s": null,
      "destinataire": "relais.recette@presti-test.invalid",
      "texte": "Merci pour votre réponse fictive. Votre remarque est enregistrée dans cet essai. Pour vous opposer à tout autre message, répondez STOP.",
      "empreinte": "5dee42190b42f246e13056cafb6b5fd1d2628dbc4209c40fc415744bf94f231e",
      "source": "scénario fictif dem-relais-225 / tour 2",
      "plafond": 1,
      "modele": {
        "fournisseur": "ollama-local",
        "modele": "simulation-sans-inference"
      },
      "juge_faits": "ok"
    },
    {
      "etape": "accord_2",
      "etat": "simulé",
      "heure": "2026-09-27T09:06:00.000Z",
      "duree_s": null,
      "id_accord": "acc-relais-2",
      "destinataire": "relais.recette@presti-test.invalid",
      "canal": "email",
      "empreinte": "5dee42190b42f246e13056cafb6b5fd1d2628dbc4209c40fc415744bf94f231e",
      "expire_le": "2026-09-27T10:00:00.000Z",
      "portee": "envoi-unique"
    },
    {
      "etape": "envoi_2",
      "etat": "simulé",
      "heure": "2026-09-27T09:07:00.000Z",
      "duree_s": null,
      "id_accord": "acc-relais-2",
      "id_message": "msg-relais-2",
      "destinataire": "relais.recette@presti-test.invalid",
      "empreinte": "5dee42190b42f246e13056cafb6b5fd1d2628dbc4209c40fc415744bf94f231e",
      "type": "reponse-sollicitee"
    },
    {
      "etape": "opposition",
      "etat": "simulé",
      "heure": "2026-09-27T09:08:00.000Z",
      "duree_s": null,
      "de": "relais.recette@presti-test.invalid",
      "moyen": "STOP fictif"
    },
    {
      "etape": "arret",
      "etat": "simulé",
      "heure": "2026-09-27T09:09:00.000Z",
      "duree_s": null,
      "envois_apres": 0,
      "relances": 0
    }
  ]
}
```
