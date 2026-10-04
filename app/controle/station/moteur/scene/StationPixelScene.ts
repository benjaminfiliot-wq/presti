// La scène pixel art de la station. Reprise de l'atelier (~/claw3d-pixel, src/features/office/phaser/StationPixelScene.ts, notre code du
// 25/09, voir claw3d/PROVENANCE.md), SANS sa fonction `roomFor` : la scène ne devine plus la salle d'un agent d'après son état (le
// prototype envoyait tout agent inactif au Repos et tout agent sans poste au Commandement). Une salle vient de `positions()` seule,
// elle arrive dans l'acteur ; un acteur sans salle n'est pas dessiné ; sans emplacement (le placeur rend null) il ne l'est pas non plus.
//
// À la fiche K1 le moteur est nu : pas de décor (K2 et K3 l'apportent d'après le thème), pas de placeur (il rend toujours null), donc
// rien à dessiner qu'un fond uni. Aucun hasard, aucune horloge : la boucle de Phaser dort dès que rien ne change.
import type PhaserType from "phaser";

import { createDefaultAgentAvatarProfile } from "../claw3d/profile";
import type { FabriqueScene } from "../types";
import { AGENT_FH, AGENT_FRAMES, AGENT_FW, drawAgentSheet } from "./agentPainter";
import { PIXEL_PALETTE } from "./palette";

/** Images laissées à la scène pour peindre l'état final, puis la boucle s'endort (aucune image de plus au repos). */
const IMAGES_DE_CALME = 3;

export const createStationPixelScene: FabriqueScene = (params) => {
  const { Phaser, pont, grille, k, pret, placer } = params;

  class StationScene extends Phaser.Scene {
    private desabonner: (() => void) | null = null;
    private objets: PhaserType.GameObjects.GameObject[] = [];
    private calme = 0;

    constructor() {
      super("station-pixel-scene");
    }

    create() {
      // Le dessin se fait sur la grille logique ; le zoom entier k l'agrandit sans lissage (pixelArt, roundPixels).
      this.cameras.main.setBackgroundColor(PIXEL_PALETTE[0]);
      this.cameras.main.setZoom(k);
      this.cameras.main.centerOn(grille.largeur / 2, grille.hauteur / 2);
      this.dessinerActeurs();
      this.desabonner = pont.subscribe(() => {
        this.calme = 0;
        this.game.loop.wake();
        this.dessinerActeurs();
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.desabonner?.();
        this.desabonner = null;
      });
      pret(this.game.canvas);
    }

    update() {
      // La boucle ne tourne que le temps de peindre : après quelques images sans changement, plus aucune image n'est dessinée.
      this.calme += 1;
      if (this.calme >= IMAGES_DE_CALME) this.game.loop.sleep();
    }

    private dessinerActeurs() {
      for (const objet of this.objets) objet.destroy();
      this.objets = [];
      const { acteurs } = pont.getState();
      const parSalle = new Map<string, number>();
      for (const acteur of acteurs) {
        if (!acteur.salle) continue;
        const rang = parSalle.get(acteur.salle) ?? 0;
        parSalle.set(acteur.salle, rang + 1);
        const place = placer(acteur, rang);
        if (!place) continue;

        const cle = `st_agent_${acteur.nom}_${acteur.avatar}_${acteur.couleur}`;
        if (!this.textures.exists(cle)) {
          const planche = drawAgentSheet(createDefaultAgentAvatarProfile(acteur.avatar || acteur.nom), acteur.couleur);
          if (!planche) continue;
          const texture = this.textures.addCanvas(cle, planche);
          for (let image = 0; image < AGENT_FRAMES; image += 1) texture?.add(image, 0, image * AGENT_FW, 0, AGENT_FW, AGENT_FH);
        }
        // halo fixe au sol sous l'agent qui tient une tâche
        if (acteur.motif === "tache") {
          this.objets.push(this.add.rectangle(place.x, place.y, 14, 1, 0x2fc6e0).setOrigin(0.5, 0).setDepth(20));
        }
        this.objets.push(this.add.image(place.x, place.y, cle, 0).setOrigin(0.5, 1).setDepth(30));
        // étincelle fixe sur l'agent en panne
        if (acteur.motif === "panne") {
          this.objets.push(this.add.rectangle(place.x + 6, place.y - 14, 2, 2, 0xff4d6d).setDepth(41));
        }
      }
    }
  }

  return new StationScene();
};
