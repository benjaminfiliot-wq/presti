"use client";

// Hôte Phaser. Copié de Claw3D (src/features/office/components/OfficePhaserCanvas.tsx, commit 0565b78, MIT, voir PROVENANCE.md),
// puis réécrit en MODE STATION SEUL : plus de `mode` viewer/builder (les imports d'OfficeBuilderScene et d'OfficeViewerScene sont
// retirés), plus de classes Tailwind (absentes de Presti : le cadre ferait 0 px) mais un module CSS, plus de `map` ni de `presence`
// (la scène vient de l'extérieur par `fabrique` et lit le pont), et la configuration de Phaser de la station :
// pixel art, un canevas de `grille × k` pixels de l'appareil (k entier), une graine fixe et pas de son.
// Phaser n'est chargé que par `await import("phaser")`, ici, au montage.

import { useEffect, useRef } from "react";
import type PhaserType from "phaser";

import type { ActeurStation, FabriqueScene, Grille, Placeur } from "../types";
import type { OfficeSceneBridge } from "./OfficeSceneBridge";
import styles from "./OfficePhaserCanvas.module.css";

type OfficePhaserCanvasProps = {
  pont: OfficeSceneBridge<ActeurStation>;
  grille: Grille;
  fabrique: FabriqueScene;
  placer: Placeur;
  /** Appelé une fois, quand le jeu est construit. */
  auJeu?: (jeu: PhaserType.Game) => void;
};

/** Le plus grand entier k tel que la grille × k, en pixels de l'appareil, tienne dans le cadre. */
export const echelleEntiere = (largeurGrille: number, cadreCss: number, densite: number) =>
  Math.max(1, Math.floor((cadreCss * densite) / largeurGrille));

/** Ce que le cadre peut déborder de chaque côté pour gagner un cran d'échelle : la marge vide de la coque (8 % de la largeur, 4 % de chaque côté). */
const DEBORD_MAX = 1.08;
/** Au bureau, ce que la zone garde pour la barre de la caméra (40 px de bouton, 6 px de marge) en plus de ses propres marges. */
const BARRE_CAMERA = 46;

/**
 * L'échelle de la carte (toujours un entier : un pixel logique couvre k pixels de l'appareil) : le plus grand k que la LARGEUR du cadre
 * permet (jusqu'à 8 % de débord : la marge vide de la coque se rogne, jamais une salle) ; au bureau, jamais plus que ce que la HAUTEUR de la
 * zone laisse voir d'un coup d'œil (la liste des salles défile dessous), mais ×2 au moins dès que la largeur le permet : à ×1 la carte
 * n'est qu'une vignette de 400 px que le texte ne peut pas habiller.
 */
export function echelleCarte(grille: Grille, cadre: HTMLElement, densite: number): number {
  let k = echelleEntiere(grille.largeur, cadre.clientWidth * DEBORD_MAX, densite);
  const zone = cadre.closest<HTMLElement>("[data-station-carte]");
  if (zone && k > 2) {
    const style = getComputedStyle(zone);
    // Au téléphone la zone est haute de ce qu'elle contient : la mesurer serait circulaire.
    if (style.position === "fixed") {
      const utile = zone.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - BARRE_CAMERA;
      while (k > 2 && (grille.hauteur * k) / densite > utile) k -= 1;
    }
  }
  return k;
}

export function OfficePhaserCanvas(props: OfficePhaserCanvasProps) {
  const { pont, grille, fabrique, placer, auJeu } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<PhaserType.Game | null>(null);
  /** L'échelle du jeu construit : un changement de taille qui en donnerait une autre fait rebâtir la carte. */
  const echelle = useRef(0);
  const dernieres = useRef({ fabrique, placer, auJeu });
  dernieres.current = { fabrique, placer, auJeu };

  useEffect(() => {
    let canceled = false;
    const setup = async () => {
      const cadre = rootRef.current;
      if (!cadre) return;
      const Phaser = (await import("phaser")).default;
      if (canceled || !rootRef.current) return;
      const densite = window.devicePixelRatio || 1;
      const k = echelleCarte(grille, cadre, densite);
      echelle.current = k;
      // Taille CSS = taille du canevas ÷ densité : chaque pixel logique couvre exactement k pixels de l'appareil. Quand le canevas déborde un
      // peu du cadre (jusqu'à 8 %), il est centré par le cadre (flex, qui centre aussi ce qui déborde) : la coque est rognée des deux côtés.
      const regler = (toile: HTMLCanvasElement) => {
        toile.style.width = `${toile.width / densite}px`;
        toile.style.height = `${toile.height / densite}px`;
        toile.style.display = "block";
      };
      const scene = dernieres.current.fabrique({
        Phaser,
        pont,
        grille,
        k,
        pret: regler,
        placer: dernieres.current.placer,
      });
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: cadre,
        width: grille.largeur * k,
        height: grille.hauteur * k,
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        seed: ["station"],
        audio: { noAudio: true },
        banner: false,
        scale: { mode: Phaser.Scale.NONE },
        scene: [scene],
      });
      gameRef.current = game;
      dernieres.current.auJeu?.(game);
    };
    void setup();
    return () => {
      canceled = true;
      const game = gameRef.current;
      gameRef.current = null;
      if (game) {
        // La boucle dort au repos : sans la réveiller, la destruction demandée ne s'exécuterait jamais.
        game.destroy(true);
        game.loop.wake();
      }
    };
    // Le jeu se construit une fois par grille : les autres propriétés sont lues à la construction (dernieres).
  }, [pont, grille.largeur, grille.hauteur]); // eslint-disable-line react-hooks/exhaustive-deps

  // La taille de la fenêtre ou des colonnes change : si une autre échelle entière devient possible, la carte se rebâtit (l'événement que l'hôte,
  // entree.tsx, écoute déjà pour la perte du contexte WebGL). La largeur du cadre ne dépend pas du canevas (le défilement de la zone a sa
  // gouttière réservée) : la mesure ne boucle pas.
  useEffect(() => {
    const cadre = rootRef.current;
    if (!cadre || typeof ResizeObserver === "undefined") return;
    let attente = 0;
    const verifier = () => {
      if (!echelle.current || !gameRef.current) return;
      if (echelleCarte(grille, cadre, window.devicePixelRatio || 1) !== echelle.current) window.dispatchEvent(new CustomEvent("mc-rebatir"));
    };
    const observeur = new ResizeObserver(() => { window.clearTimeout(attente); attente = window.setTimeout(verifier, 250); });
    observeur.observe(cadre);
    const zone = cadre.closest<HTMLElement>("[data-station-carte]");
    if (zone) observeur.observe(zone);
    return () => { window.clearTimeout(attente); observeur.disconnect(); };
  }, [grille.largeur, grille.hauteur]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className={styles.cadre} ref={rootRef} />;
}
