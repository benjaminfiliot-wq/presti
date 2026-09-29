# Recette de la voie entrante — 27/09/2026 (TÉMOIN FICTIF de 026-220)

> Témoin de référence du juge `scripts/juges-026-completude-qa.mjs --partie=entrant` : il n’est pas la recette de 026-225.
> Toutes les personnes et adresses sont fictives (`@presti-test.invalid`), l’horloge est figée au 27/09/2026 à 10 h (UTC).

## Verdict

**pratiquement prêt** : la demande fictive est prouvée par sa preuve brute (`.orchestre/preuves/026-225/demande-essai.txt`) ;
la suite, préparation → accord → envoi → réponse → second accord → second envoi → opposition → arrêt, est traversée en
simulation. Aucun message n’est parti : 0 envoi prouvé. La voie entrante n’est pas encore opérationnelle pour de vrais
clients.

Écart concret : l’accord réel de Benj et l’envoi par la boîte Gmail ne sont pas exercés. Chemin de reprise : rejouer
avec l’accord de Benj sur le texte exact, par le porteur de 026-145, puis relancer le juge.

## Étapes

| Étape | État | Heure (UTC) |
|---|---|---|
| demande | prouvé | 10:00 |
| preparation | simulé | 10:05 |
| accord | simulé | 10:10 |
| envoi | simulé | 10:12 |
| reponse | simulé | 10:30 |
| preparation_2 | simulé | 10:32 |
| accord_2 | simulé | 10:35 |
| envoi_2 | simulé | 10:37 |
| opposition | simulé | 10:45 |
| arret | simulé | 10:46 |

La prospection froide reste fermée jusqu’au 12/10/2026 ; aucune donnée de la demande ne part vers Ollama Cloud ni
freellmapi (préparation par Ollama local).

## Journal (lu par le juge)

```json recette-entrant
{
  "recette": "026-225",
  "horloge_debut": "2026-09-27T10:00:00.000Z",
  "froid_ouvert": false,
  "verdict": "pratiquement prêt",
  "ecarts": [
    {
      "ecart": "Accord réel de Benj et envoi par la boîte Gmail non exercés : les deux envois sont simulés.",
      "reprise": "Rejouer la recette avec l’accord de Benj sur le texte exact, par le porteur de 026-145, puis relancer --partie=entrant."
    }
  ],
  "dependances": {
    "026-065": "PASS",
    "026-145": "non livrée",
    "026-096": "non livrée"
  },
  "messages_envoyes": 0,
  "etapes": [
    {
      "etape": "demande",
      "etat": "prouvé",
      "heure": "2026-09-27T10:00:00.000Z",
      "duree_s": null,
      "preuve_fichier": ".orchestre/preuves/026-225/demande-essai.txt",
      "id_demande": "dem-essai-001",
      "type": "entrante",
      "adresse": "artisan.essai@presti-test.invalid",
      "consentement": {
        "precoche": false,
        "coche": true
      },
      "preuve": "formulaire « Recevoir une maquette », horodatage serveur fictif",
      "opposition": true,
      "doublon_rejete": true,
      "sans_consentement_rejete": true,
      "retiree_le": null
    },
    {
      "etape": "preparation",
      "etat": "simulé",
      "heure": "2026-09-27T10:05:00.000Z",
      "duree_s": 300,
      "destinataire": "artisan.essai@presti-test.invalid",
      "texte": "Bonjour, merci pour votre demande de maquette sur Presti. Votre maquette d’essai est prête à cette adresse : https://prestiapp.fr/essai/maquette-001. Pour ne plus recevoir de message, répondez STOP.",
      "empreinte": "383f26aa5e3a5ae57973c15c47f7fa9de655b3b43ae05449fe8afe470ff90e0f",
      "source": "fiche artisan fictive dem-essai-001",
      "plafond": 1,
      "modele": {
        "fournisseur": "ollama-local",
        "modele": "qwen3:8b"
      },
      "juge_faits": "ok"
    },
    {
      "etape": "accord",
      "etat": "simulé",
      "heure": "2026-09-27T10:10:00.000Z",
      "duree_s": 300,
      "id_accord": "acc-essai-001",
      "destinataire": "artisan.essai@presti-test.invalid",
      "canal": "email",
      "empreinte": "383f26aa5e3a5ae57973c15c47f7fa9de655b3b43ae05449fe8afe470ff90e0f",
      "expire_le": "2026-09-27T10:40:00.000Z",
      "portee": "envoi-unique"
    },
    {
      "etape": "envoi",
      "etat": "simulé",
      "heure": "2026-09-27T10:12:00.000Z",
      "duree_s": 120,
      "id_accord": "acc-essai-001",
      "id_message": "msg-essai-001",
      "destinataire": "artisan.essai@presti-test.invalid",
      "empreinte": "383f26aa5e3a5ae57973c15c47f7fa9de655b3b43ae05449fe8afe470ff90e0f",
      "type": "reponse-sollicitee"
    },
    {
      "etape": "reponse",
      "etat": "simulé",
      "heure": "2026-09-27T10:30:00.000Z",
      "duree_s": 1080,
      "de": "artisan.essai@presti-test.invalid"
    },
    {
      "etape": "preparation_2",
      "etat": "simulé",
      "heure": "2026-09-27T10:32:00.000Z",
      "duree_s": 120,
      "destinataire": "artisan.essai@presti-test.invalid",
      "texte": "Merci pour votre réponse. Nous ajustons la maquette selon vos remarques et revenons vers vous dans la journée. Pour ne plus recevoir de message, répondez STOP.",
      "empreinte": "e4ceac954186f0f1d40ef260921606bcd554d6324847634ddd52922f571bc2ea",
      "source": "réponse fictive msg-essai-001",
      "plafond": 1,
      "modele": {
        "fournisseur": "ollama-local",
        "modele": "qwen3:8b"
      },
      "juge_faits": "ok"
    },
    {
      "etape": "accord_2",
      "etat": "simulé",
      "heure": "2026-09-27T10:35:00.000Z",
      "duree_s": 180,
      "id_accord": "acc-essai-002",
      "destinataire": "artisan.essai@presti-test.invalid",
      "canal": "email",
      "empreinte": "e4ceac954186f0f1d40ef260921606bcd554d6324847634ddd52922f571bc2ea",
      "expire_le": "2026-09-27T11:05:00.000Z",
      "portee": "envoi-unique"
    },
    {
      "etape": "envoi_2",
      "etat": "simulé",
      "heure": "2026-09-27T10:37:00.000Z",
      "duree_s": 120,
      "id_accord": "acc-essai-002",
      "id_message": "msg-essai-002",
      "destinataire": "artisan.essai@presti-test.invalid",
      "empreinte": "e4ceac954186f0f1d40ef260921606bcd554d6324847634ddd52922f571bc2ea",
      "type": "reponse-sollicitee"
    },
    {
      "etape": "opposition",
      "etat": "simulé",
      "heure": "2026-09-27T10:45:00.000Z",
      "duree_s": 480,
      "de": "artisan.essai@presti-test.invalid",
      "moyen": "réponse STOP"
    },
    {
      "etape": "arret",
      "etat": "simulé",
      "heure": "2026-09-27T10:46:00.000Z",
      "duree_s": 60,
      "envois_apres": 0,
      "relances": 0
    }
  ]
}
```
