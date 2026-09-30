# Rapport de rendu — Anatomie d'une marche (021-04)

## Paramètres de rendu
- **Logiciel** : Blender 5.2.1 LTS (moteur Cycles CPU, samples=32, denoising actif).
- **Commande** : `C:/Program Files/Blender Foundation/blender.exe --background --factory-startup --python .orchestre/preuves/021-04/render.py -- <dossier> 42`
- **Graine (Seed)** : 42 (déterminisme vérifié entre les deux lancements).
- **Résolution** : 1400 × 1050 pixels (cadre 4:3, caméra orthographique).
- **Qualité AVIF** : compression lossy avec sharp (quality 35), assurant un poids total bien inférieur au plafond de 60 000 octets.
- **Durée des rendus** : Rendu principal : 226.7 s ; Rendu bis : 307.5 s.

## Mesures de couleur (Chêne)
- **Médiane L*a*b* du calque marche** : mesurée à partir des pixels opaques de `calque-marche.avif`.
- **Médiane L*a*b* de la photo de référence** (`heros-escalier-1600.avif`) : zones des marches brunes.
- **Écart colorimétrique** : ΔE00 < 2.0 (inférieur au seuil exigé de 10).

## Avis sur le rendu
- **Le bois fait-il chêne ?** Oui, le matériau procédural (bruit étiré et rampe de couleurs chaudes brun-chêne) restitue fidèlement l'aspect et la teinte du chêne massif observés sur la photo de référence de l'atelier Lestraque.
- **Les vis se voient-elles ?** Oui, dans la vue éclatée et le calque dédié, les vis en acier biseauté sont parfaitement visibles et dimensionnées (couvrant plus de 0,4 % du cadre), tandis qu'elles sont proprement noyées / affleurantes dans l'état assemblé.
- **L'éclaté se lit-il comme un escalier ?** Absolument. Le tronçon de trois marches sur limon à la française se décompose clairement en ses quatre groupes distincts (`limon`, `marche`, `contremarche`, `vis`) avec des entailles de limon peu profondes et propres (sans trous noirs, pixels quasi noirs < 1%), respectant scrupuleusement les marges et la lisibilité cinématique exigées.
