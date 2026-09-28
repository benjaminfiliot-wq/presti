#!/usr/bin/env python3
# scripts/visages.py — détecteur de visages pour les juges de fabrication (fiche 026-124, "Ce qu'il faut faire", point 2).
#
# Lit une liste de fichiers image, applique cv2.FaceDetectorYN (YuNet), rend du JSON sur stdout :
#   [{ "fichier": "...", "visages": [{ "x": .., "y": .., "l": .., "h": .., "score": .. }, ...] }, ...]
# (l = largeur, h = hauteur de la boîte, en pixels ; score dans [0, 1]).
#
# Le modèle est scripts/modeles/face_detection_yunet_2023mar.onnx (dépôt officiel opencv/opencv_zoo, téléchargement
# autorisé par Benj le 28/09 — provenance : .orchestre/preuves/026-124/provenance.md), ou le chemin donné par
# --modele=<fichier> (Claude Code seulement, pour tester un modèle corrompu — jamais utilisé en production).
# Refuse de tourner si le modèle est absent ou si son empreinte sha256 ne correspond pas à celle épinglée ci-dessous :
# c'est la même empreinte que scripts/visages-qa.mjs, vérifiée indépendamment ici (défense en profondeur).
#
# Usage :
#   python scripts/visages.py <image…> [--seuil=0.9] [--modele=<fichier>]
# Codes : 0 JSON rendu (même si aucun visage) · 1 une image illisible · 2 appel invalide, modèle absent ou empreinte
# différente.
import sys
import os
import json
import hashlib

EMPREINTE = '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4'
ICI = os.path.dirname(os.path.abspath(__file__))
MODELE_DEFAUT = os.path.join(ICI, 'modeles', 'face_detection_yunet_2023mar.onnx')


def refuser(msg, code=2):
    sys.stderr.write(f"✗ visages.py : {msg}\n")
    sys.exit(code)


def sha256_fichier(chemin):
    h = hashlib.sha256()
    with open(chemin, 'rb') as f:
        for bloc in iter(lambda: f.read(1 << 20), b''):
            h.update(bloc)
    return h.hexdigest()


def lire_args(argv):
    fichiers, seuil, modele = [], 0.9, MODELE_DEFAUT
    for a in argv:
        if a.startswith('--seuil='):
            try:
                seuil = float(a[len('--seuil='):])
            except ValueError:
                refuser(f"--seuil : nombre attendu (reçu {a[len('--seuil='):]!r})")
        elif a.startswith('--modele='):
            modele = a[len('--modele='):]
        elif a.startswith('--'):
            refuser(f"option inconnue : {a}")
        else:
            fichiers.append(a)
    if not fichiers:
        refuser("usage : python scripts/visages.py <image...> [--seuil=0.9] [--modele=<fichier>]")
    return fichiers, seuil, modele


def main():
    fichiers, seuil, modele = lire_args(sys.argv[1:])

    if not os.path.isfile(modele):
        refuser(f"modèle absent : {modele}")
    empreinte_reelle = sha256_fichier(modele)
    if empreinte_reelle != EMPREINTE:
        refuser(f"empreinte du modèle différente de celle épinglée ({modele} : {empreinte_reelle}, attendu {EMPREINTE})")

    try:
        import cv2
    except ImportError as e:
        refuser(f"OpenCV (cv2) indisponible : {e}")

    detecteur = cv2.FaceDetectorYN.create(modele, '', (320, 320), score_threshold=float(seuil))

    resultat = []
    echec_lecture = False
    for fichier in fichiers:
        img = cv2.imread(fichier)
        if img is None:
            sys.stderr.write(f"✗ visages.py : image illisible : {fichier}\n")
            echec_lecture = True
            resultat.append({"fichier": fichier, "visages": None, "erreur": "illisible"})
            continue
        h, w = img.shape[:2]
        detecteur.setInputSize((w, h))
        n, faces = detecteur.detect(img)
        visages = []
        if faces is not None:
            for f in faces:
                visages.append({
                    "x": float(f[0]), "y": float(f[1]), "l": float(f[2]), "h": float(f[3]),
                    "score": float(f[14]),
                })
        resultat.append({"fichier": fichier, "visages": visages})

    print(json.dumps(resultat, ensure_ascii=False))
    sys.exit(1 if echec_lecture else 0)


if __name__ == '__main__':
    main()
