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

export function OfficePhaserCanvas(props: OfficePhaserCanvasProps) {
  const { pont, grille, fabrique, placer, auJeu } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<PhaserType.Game | null>(null);
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
      const k = echelleEntiere(grille.largeur, cadre.clientWidth, densite);
      // Taille CSS = taille du canevas ÷ densité : chaque pixel logique couvre exactement k pixels de l'appareil.
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

  return <div className={styles.cadre} ref={rootRef} />;
}
