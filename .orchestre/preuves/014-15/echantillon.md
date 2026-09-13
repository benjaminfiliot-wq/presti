# Échantillon de 20 cas (10 urgents, 10 normaux) — Tâche 014-15

## 10 Cas Urgents

1. `{"id":"vitrier-01","message":"Bonjour, ma vitre de salon est cassée, il y a du verre partout.","metier":"vitrier","attendu":"urgent","origine":"audit accroches-par-metier...","statut":"reference"}`
2. `{"id":"serrurier-01","message":"Je suis enfermé dehors, la porte a claqué avec les clés à l'intérieur.","metier":"serrurier","attendu":"urgent","origine":"cas synthétique serrurier (2026-09-13)","statut":"reference"}`
3. `{"id":"plombier-01","message":"J'ai une fuite d'eau sous l'évier, ça inonde la cuisine.","metier":"plombier","attendu":"urgent","origine":"comportement actuel vérifié — garde-fou","statut":"reference"}`
4. `{"id":"chauffagiste-01","message":"Plus de chauffage depuis ce matin, il fait très froid.","metier":"chauffagiste","attendu":"urgent","origine":"comportement actuel vérifié — garde-fou","statut":"reference"}`
5. `{"id":"electricien-01","message":"Le tableau électrique a disjoncté, court-circuit et odeur de brûlé.","metier":"electricien","attendu":"urgent","origine":"comportement actuel vérifié — garde-fou","statut":"reference"}`
6. `{"id":"plombier-s-01","message":"Grosse fuite d'eau sous l'evier de la cuisine, ca inonde partout.","metier":"plombier","attendu":"urgent","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`
7. `{"id":"electricien-s-01","message":"Le tableau electrique a disjoncte, odeur de brule persistante.","metier":"electricien","attendu":"urgent","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`
8. `{"id":"chauffagiste-s-01","message":"Plus de chauffage depuis ce matin, il fait 12 degres dans la maison.","metier":"chauffagiste","attendu":"urgent","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`
9. `{"id":"menuisier-s-01","message":"Porte-fenetre cassee suite a effraction, logement ouvert.","metier":"menuisier","attendu":"urgent","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`
10. `{"id":"serrurier-s-01","message":"Je suis enferme dehors, la porte a claque avec les cles a l'interieur.","metier":"serrurier","attendu":"urgent","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`

## 10 Cas Normaux

1. `{"id":"normal-01","message":"Bonjour, je voudrais un devis pour repeindre mon salon et deux chambres, 60 m² environ.","metier":"peintre","attendu":"normal","origine":"garde-fou contre le sur-déclenchement (2026-09-13)","statut":"reference"}`
2. `{"id":"normal-02","message":"Combien coûte le remplacement d'une vitre de véranda ? C'est pour un projet l'an prochain.","metier":"vitrier","attendu":"normal","origine":"garde-fou : « vitre » sans casse n'est pas une urgence (2026-09-13)","statut":"reference"}`
3. `{"id":"normal-03","message":"Pouvez-vous passer un jour pour voir ma toiture et me faire un devis d'entretien ?","metier":"couvreur","attendu":"normal","origine":"garde-fou (2026-09-13)","statut":"reference"}`
4. `{"id":"normal-05","message":"Bonjour, pourriez-vous me dire vos horaires et si vous intervenez à Villeurbanne ?","metier":"plombier","attendu":"normal","origine":"garde-fou (2026-09-13)","statut":"reference"}`
5. `{"id":"normal-06","message":"Devis pour poser du carrelage dans une salle de bain de 8 m², photos en pièce jointe.","metier":"carreleur","attendu":"normal","origine":"garde-fou (2026-09-13)","statut":"reference"}`
6. `{"id":"plombier-s-26","message":"Bonjour, je voudrais un devis pour remplacer mon vieux mitigeur de cuisine.","metier":"plombier","attendu":"normal","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`
7. `{"id":"electricien-s-26","message":"Bonjour, devis pour rajouter quatre prises dans le bureau.","metier":"electricien","attendu":"normal","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`
8. `{"id":"chauffagiste-s-26","message":"Bonjour, devis pour l'entretien annuel de ma chaudiere gaz.","metier":"chauffagiste","attendu":"normal","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`
9. `{"id":"menuisier-s-26","message":"Bonjour, devis pour remplacer toutes les fenetres en PVC double vitrage.","metier":"menuisier","attendu":"normal","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`
10. `{"id":"serrurier-s-26","message":"Bonjour, je cherche un serrurier pour changer une serrure par un modele 3 points.","metier":"serrurier","attendu":"normal","origine":"synthétique 014-15 (2026-09-13)","statut":"reference"}`
