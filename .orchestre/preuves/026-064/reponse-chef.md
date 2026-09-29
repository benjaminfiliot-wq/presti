# 026-064 — réponse du chef (29/09)

Question de Codex : le juge JG-4 contredit la fiche (heure de Paris) et `magasinSupabase.jaugeConsommer` fixe jour UTC / plafond 200.

Décision : ni l'option 1 (tâche préalable) ni l'option 2 (UTC).
- La fiche exige l'heure de Paris (« AAAA-MM-JJTHH … heure de Paris », JG-4 « en heure d'été comme d'hiver ») : le patch de Codex (Europe/Paris) est juste, c'est le juge qui se trompait.
- Le juge était faux DEUX fois : (1) 23:59:30Z le 14/10 = 01:59 Paris, donc clé T01, pas T23 (il fallait 21:59:30Z) ; (2) `poserEtat` ne fixe que le plafond (consommé 0), il ne « remplit » pas la période : un appel n'était jamais au plafond. Corrigé par Claude (juge écrit par Claude : permis), exigence gardée, heure d'hiver ajoutée (22:59:30Z = 23:59:30 Paris le 14/12), remplissage réel par 150 consommations.
- Sabotages (2) : fuseau UTC au lieu de Paris -> JG-4 rouge ; refus du magasin ignoré + pré-contrôle retiré -> JG-4 rouge.
- Patch de Codex appliqué tel quel (jauges.ts + route.ts).
- Reste hors périmètre, NON traité ici : `magasinSupabase.jaugeConsommer` garde p_plafond = 200 et p_periode = jour UTC ; comme la clé porte déjà la période (`id:AAAA-MM-JJTHH`) le compteur est bien par heure, mais le plafond réel est 200 au lieu de 150 (`consommerJauge` pré-contrôle à 150, non atomique). À corriger (plafond tiré du préfixe de la clé) par une petite fiche sur 026-063.
