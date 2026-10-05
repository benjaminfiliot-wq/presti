// La scène pixel art de la station. Reprise de l'atelier (~/claw3d-pixel, src/features/office/phaser/StationPixelScene.ts, notre code du
// 25/09, voir claw3d/PROVENANCE.md), SANS sa fonction `roomFor` : la scène ne devine jamais la salle d'un agent d'après son état (le
// prototype envoyait tout agent inactif au Repos et tout agent sans poste au Commandement). Une salle vient de `positions()` seule, elle
// arrive dans l'acteur ; un acteur sans salle n'est pas dessiné ; sans destination il ne l'est pas non plus.
//
// Fiche 026-181 (K3) : la règle de vérité. Un agent ne bouge que sur un VRAI événement.
//   · la scène ne traite que les acteurs qui ont changé (leur signature), ne déduit jamais une salle ;
//   · une salle donne une destination (le poste, la porte pour le motif `porte`), `astar2D` calcule le chemin UNE fois, une seule vitesse
//     de marche, l'image de marche dépend de la distance parcourue ;
//   · le miroir (moteur/calque/) n'est mis à jour qu'à chaque PAS (une case) et à l'arrivée : la suite des positions ne dépend donc pas de
//     la cadence des images, deux pages jouant la même suite relèvent les mêmes chemins ;
//   · à l'arrivée la boucle de Phaser s'endort : plus aucune image n'est dessinée (aucun hasard, aucune horloge dans ce fichier : le
//     temps est celui que Phaser passe à `update`, et la boucle ne tourne que pour une marche, un tour d'antenne ou un changement).
// Le premier relevé (et tout acteur qui paraît sans position connue) est posé directement à sa place, sans marche. Le mouvement réduit
// fait de même pour chaque changement de salle.
import type PhaserType from "phaser";

import { createDefaultAgentAvatarProfile } from "../claw3d/profile";
import type { Monde } from "../theme/grille";
import type { ActeurStation, Emplacement, FabriqueScene } from "../types";
import { AGENT_FH, AGENT_FRAMES, AGENT_FW, drawAgentSheet } from "./agentPainter";
import { avancer, cheminVers, VITESSE } from "./marche";
import { PIXEL_PALETTE } from "./palette";
import type { EtatScene, Suivi } from "./suivi";

/** Images laissées à la scène pour peindre l'état final, puis la boucle s'endort (aucune image de plus au repos). */
const IMAGES_DE_CALME = 2;
/** Un tour d'antenne : 2 s, deux révolutions. */
const TOUR_MS = 2000;
/** Une image de marche toutes les 4 unités parcourues. */
const PAS_D_IMAGE = 4;
const DELTA_MAX_MS = 250;

/** Ce que la scène sait du monde du thème, de la marche et de ce qu'elle partage ; sans eux (moteur nu) elle ne dessine que le placeur. */
export type ExtrasScene = { monde: Monde; suivi: Suivi; etat: EtatScene };

/** La zone de l'antenne du toit : un emplacement libre du bord haut (sinon du bord bas), jamais sur une salle. */
export function zoneAntenne(monde: Monde): { x: number; y: number; l: number; h: number } {
  const { width: largeur, height: hauteur } = monde.carte.canvas;
  const l = 16, h = 8;
  const boites = monde.carte.emplacements.map((e) => {
    const f = e.forme;
    if (f.type === "polygone" && f.points?.length) {
      const xs = f.points.map((p) => p[0]), ys = f.points.map((p) => p[1]);
      return { x: Math.min(...xs), y: Math.min(...ys), l: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    return { x: f.x ?? 0, y: f.y ?? 0, l: f.l ?? 0, h: f.h ?? 0 };
  });
  const libre = (x: number, y: number) => boites.every((b) => x + l <= b.x || x >= b.x + b.l || y + h <= b.y || y >= b.y + b.h);
  for (const y of [0, hauteur - h]) for (let x = largeur - l - 8; x >= 0; x -= 8) if (libre(x, y)) return { x, y, l, h };
  return { x: largeur - l, y: 0, l, h };
}

export const createStationPixelScene = (params: Parameters<FabriqueScene>[0], extras?: ExtrasScene) => {
  const { Phaser, pont, grille, k, pret, placer } = params;

  type Perso = {
    acteur: ActeurStation;
    signature: string;
    pos: Emplacement;
    /** La dernière position relevée par le miroir (un point du chemin, jamais une position d'image). */
    pub: Emplacement;
    chemin: Emplacement[];
    /** Le nombre de points du chemin franchis depuis le départ (le miroir en relève un sur deux, et toujours le dernier). */
    n: number;
    /** Les points déjà franchis par le sprite que le miroir n'a pas encore relevés : ils le sont un par un, dans l'ordre. */
    file: Emplacement[];
    /** Vrai tant qu'un relevé est annoncé (le vidage de `file` est en cours). */
    vidage: boolean;
    dist: number;
    cle: string;
    image: PhaserType.GameObjects.Image;
    halo: PhaserType.GameObjects.Rectangle | null;
    etincelle: PhaserType.GameObjects.Rectangle | null;
  };

  class StationScene extends Phaser.Scene {
    private desabonner: (() => void) | null = null;
    private persos = new Map<string, Perso>();
    /** La signature de ce que la scène traite (sans les bulles, qui sont du texte HTML) : un changement de bulle seul ne réveille pas la boucle. */
    private derniere = "";
    private calme = 0;
    private decor: PhaserType.GameObjects.Image | null = null;
    private planche: HTMLCanvasElement | null = null;
    private nuitDessinee: boolean | null = null;
    private antenne: PhaserType.GameObjects.Graphics | null = null;
    private toursVus = 0;
    private tourDebut: number | null = null;
    private tourDemande = false;

    constructor() {
      super("station-pixel-scene");
    }

    create() {
      // Le dessin se fait sur la grille logique ; le zoom entier k l'agrandit sans lissage (pixelArt, roundPixels).
      this.cameras.main.setBackgroundColor(PIXEL_PALETTE[0]);
      this.cameras.main.setZoom(k);
      this.cameras.main.centerOn(grille.largeur / 2, grille.hauteur / 2);
      if (extras) {
        this.synchroniserNuit();
        this.antenne = this.add.graphics().setDepth(10);
        this.tracerAntenne(0);
        this.toursVus = extras.etat.tours;
        extras.suivi.poserAntenne({ zone: zoneAntenne(extras.monde), tourne: false });
        extras.etat.reveiller = () => this.reveil();
      }
      this.traiter();
      this.desabonner = pont.subscribe(() => {
        const s = pont.getState().acteurs.map((a) => [a.salle, a.motif, a.nom, a.couleur, a.avatar].join("|")).join(";");
        if (s === this.derniere) return;
        this.reveil();
        this.traiter();
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.desabonner?.();
        this.desabonner = null;
        if (extras && extras.etat.reveiller) extras.etat.reveiller = null;
        extras?.suivi.poserAntenne({ tourne: false });
      });
      pret(this.game.canvas);
    }

    private reveil() {
      this.calme = 0;
      this.game.loop.wake();
    }

    update(temps: number, delta: number) {
      let actif = false;
      if (extras) {
        this.synchroniserNuit();
        actif = this.animerAntenne(temps) || actif;
        actif = this.marcher(Math.min(delta, DELTA_MAX_MS) / 1000) || actif;
      }
      // La boucle ne tourne que le temps de peindre : après quelques images sans changement, plus aucune image n'est dessinée.
      this.calme = actif ? 0 : this.calme + 1;
      if (this.calme >= IMAGES_DE_CALME) this.game.loop.sleep();
    }

    // ── Le décor : peint sans aucune donnée, redessiné SEULEMENT quand `carte.nuit` change ─────────────────────────────────────
    private synchroniserNuit() {
      if (!extras) return;
      const nuit = extras.etat.nuit === true;
      if (nuit === this.nuitDessinee) return;
      this.nuitDessinee = nuit;
      this.dessinerDecor(nuit);
    }

    private dessinerDecor(nuit: boolean) {
      if (!extras) return;
      const { carte } = extras.monde;
      const { width, height } = carte.canvas;
      if (!this.planche) {
        this.planche = document.createElement("canvas");
        this.planche.width = width;
        this.planche.height = height;
      }
      const c = this.planche.getContext("2d");
      if (!c) return;
      const jeton = (nom: string, defaut: string) => carte.palette?.[nom as keyof typeof carte.palette] ?? defaut;
      c.clearRect(0, 0, width, height);
      c.fillStyle = nuit ? "#05070b" : jeton("--mc-fond", "#101418");
      c.fillRect(0, 0, width, height);
      for (const e of carte.emplacements) {
        const f = e.forme;
        c.beginPath();
        if (f.type === "polygone") (f.points ?? []).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        else c.rect(f.x ?? 0, f.y ?? 0, f.l ?? 0, f.h ?? 0);
        c.closePath();
        c.fillStyle = nuit ? "#10141c" : carte.teintes[e.cle] ?? e.teinte;
        c.fill();
        c.strokeStyle = e.reservee ? "#8a8f98" : jeton("--mc-mur", "#596673");
        c.stroke();
        c.fillStyle = jeton("--mc-porte", "#c8d0d8");
        c.fillRect(e.porte.x - 2, e.porte.y - 1, 4, 2);
      }
      if (this.textures.exists("decor")) {
        (this.textures.get("decor") as PhaserType.Textures.CanvasTexture).refresh();
      } else {
        this.textures.addCanvas("decor", this.planche);
        this.decor = this.add.image(0, 0, "decor").setOrigin(0, 0).setDepth(0);
      }
      const cadre = this.game.canvas?.closest<HTMLElement>("[data-station-carte]");
      if (cadre) cadre.dataset.nuit = nuit ? "oui" : "non";
    }

    // ── L'antenne : un tour de 2 s par bulle NOUVELLE du Radar ou du Veilleur, jamais autrement ───────────────────────────────
    private tracerAntenne(angle: number) {
      if (!extras || !this.antenne) return;
      const z = extras.suivi.antenne.zone ?? zoneAntenne(extras.monde);
      const cx = z.x + Math.floor(z.l / 2), cy = z.y + Math.floor(z.h / 2);
      const g = this.antenne;
      g.clear();
      g.fillStyle(0x9aa3b2, 1);
      g.fillRect(cx - 1, cy - 1, 2, 2);
      g.fillStyle(0xe8ecf5, 1);
      for (let i = 2; i <= 5; i += 1) g.fillRect(Math.round(cx + Math.cos(angle) * i), Math.round(cy + Math.sin(angle) * i), 1, 1);
    }

    private animerAntenne(temps: number): boolean {
      if (!extras) return false;
      if (extras.etat.tours !== this.toursVus) {
        this.toursVus = extras.etat.tours;
        // Mouvement réduit : le tour est demandé et compté, jamais joué.
        if (!extras.etat.reduit) { this.tourDebut = temps; this.tourDemande = true; }
      }
      if (this.tourDebut === null) return false;
      const part = (temps - this.tourDebut) / TOUR_MS;
      if (part >= 1) {
        this.tourDebut = null;
        this.tracerAntenne(0);
        extras.suivi.poserAntenne({ tourne: false });
        return false;
      }
      if (this.tourDemande) { this.tourDemande = false; extras.suivi.poserAntenne({ tourne: true }); }
      this.tracerAntenne(part * Math.PI * 4);
      return true;
    }

    // ── Les acteurs : ce qui a changé, et seulement cela ───────────────────────────────────────────────────────────────────────
    /** Où un acteur se pose : le poste de sa salle, la porte pour le motif `porte` ; null sans salle ou sans emplacement. */
    private destination(acteur: ActeurStation, rang: number): Emplacement | null {
      if (!acteur.salle) return null;
      if (!extras) return placer(acteur, rang);
      const { carte } = extras.monde;
      const porte = carte.portes[acteur.salle], poste = carte.postes[acteur.salle];
      const p = acteur.motif === "porte" || !poste ? porte : poste;
      return p ? { x: p.x, y: p.y } : null;
    }

    private texture(acteur: ActeurStation): string | null {
      const cle = `st_agent_${acteur.nom}_${acteur.avatar}_${acteur.couleur}`;
      if (this.textures.exists(cle)) return cle;
      const planche = drawAgentSheet(createDefaultAgentAvatarProfile(acteur.avatar || acteur.nom), acteur.couleur);
      if (!planche) return null;
      const texture = this.textures.addCanvas(cle, planche);
      for (let image = 0; image < AGENT_FRAMES; image += 1) texture?.add(image, 0, image * AGENT_FW, 0, AGENT_FW, AGENT_FH);
      return cle;
    }

    private retirer(nom: string) {
      const p = this.persos.get(nom);
      if (!p) return;
      p.image.destroy();
      p.halo?.destroy();
      p.etincelle?.destroy();
      this.persos.delete(nom);
      extras?.suivi.retirer(nom);
    }

    private poser(p: Perso, x: number, y: number) {
      p.pos = { x, y };
      p.image.setPosition(Math.round(x), Math.round(y));
      p.halo?.setPosition(Math.round(x), Math.round(y));
      p.etincelle?.setPosition(Math.round(x) + 6, Math.round(y) - 14);
    }

    /** Le halo (tâche) et l'étincelle (panne) : posés une fois sous l'agent, FIXES ; rien ne vacille ni ne pulse. */
    private effets(p: Perso, acteur: ActeurStation) {
      const veutHalo = acteur.motif === "tache", veutEtincelle = acteur.motif === "panne";
      if (veutHalo && !p.halo) p.halo = this.add.rectangle(p.pos.x, p.pos.y, 14, 1, 0x2fc6e0).setOrigin(0.5, 0).setDepth(20);
      if (!veutHalo && p.halo) { p.halo.destroy(); p.halo = null; }
      if (veutEtincelle && !p.etincelle) p.etincelle = this.add.rectangle(p.pos.x + 6, p.pos.y - 14, 2, 2, 0xff4d6d).setDepth(41);
      if (!veutEtincelle && p.etincelle) { p.etincelle.destroy(); p.etincelle = null; }
      p.halo?.setPosition(Math.round(p.pos.x), Math.round(p.pos.y));
      p.etincelle?.setPosition(Math.round(p.pos.x) + 6, Math.round(p.pos.y) - 14);
    }

    private publier(p: Perso, etat: "marche" | "arrive") {
      if (!extras || !p.acteur.salle) return;
      extras.suivi.publier({ nom: p.acteur.nom, salle: p.acteur.salle, motif: p.acteur.motif, etat, x: Math.round(p.pub.x), y: Math.round(p.pub.y) });
    }

    /** Ce que le pont a posé : les acteurs dont la signature change sont seuls traités. */
    private traiter() {
      const { acteurs } = pont.getState();
      this.derniere = acteurs.map((a) => [a.salle, a.motif, a.nom, a.couleur, a.avatar].join("|")).join(";");
      const parSalle = new Map<string, number>();
      const vus = new Set<string>();
      for (const acteur of acteurs) {
        if (!acteur.salle) continue;
        const rang = parSalle.get(acteur.salle) ?? 0;
        parSalle.set(acteur.salle, rang + 1);
        const but = this.destination(acteur, rang);
        if (!but) continue;
        vus.add(acteur.nom);
        const signature = [acteur.salle, acteur.motif, acteur.nom, acteur.couleur, acteur.avatar].join("|");
        const connu = this.persos.get(acteur.nom);
        if (connu && connu.signature === signature) { connu.acteur = acteur; continue; }

        const cle = this.texture(acteur);
        if (!cle) { if (connu) this.retirer(acteur.nom); continue; }
        if (!connu) {
          // Un acteur qui paraît (premier relevé, ou salle jusque-là inconnue) est posé à sa place, sans marche.
          const image = this.add.image(but.x, but.y, cle, 0).setOrigin(0.5, 1).setDepth(30);
          const p: Perso = { acteur, signature, pos: { x: but.x, y: but.y }, pub: { x: but.x, y: but.y }, chemin: [], file: [], vidage: false, n: 0, dist: 0, cle, image, halo: null, etincelle: null };
          this.persos.set(acteur.nom, p);
          this.partir(p, acteur, but, false);
          continue;
        }
        const aChange = connu.acteur.salle !== acteur.salle || connu.acteur.motif !== acteur.motif;
        if (connu.cle !== cle) { connu.image.setTexture(cle, 0); connu.cle = cle; }
        connu.acteur = acteur;
        connu.signature = signature;
        this.effets(connu, acteur);
        if (aChange) this.partir(connu, acteur, but, true);
        else this.publier(connu, connu.chemin.length || connu.file.length ? "marche" : "arrive");
      }
      for (const nom of [...this.persos.keys()]) if (!vus.has(nom)) this.retirer(nom);
    }

    /** Le vrai changement d'un acteur : une marche (A*, une fois) vers sa destination, ou la pose directe (premier relevé, mouvement réduit). */
    private partir(p: Perso, acteur: ActeurStation, but: Emplacement, avecMarche: boolean) {
      const direct = !avecMarche || !extras || extras.etat.reduit;
      p.file = [];
      if (direct) p.chemin = [];
      else { p.chemin = cheminVers(extras.monde.marche, p.pos, but); p.dist = 0; p.n = 0; }
      if (!p.chemin.length) {
        this.poser(p, but.x, but.y);
        p.pub = { x: but.x, y: but.y };
        p.image.setFrame(0);
        this.effets(p, acteur);
        this.publier(p, "arrive");
      } else {
        this.effets(p, acteur);
        this.publier(p, "marche");
      }
    }

    /** Relève les points franchis d'un personnage, un par tâche (setTimeout 0), jusqu'à vider sa file ; le dernier dit « arrive ». */
    private vider(p: Perso) {
      if (p.vidage || !p.file.length) return;
      p.vidage = true;
      setTimeout(() => {
        p.vidage = false;
        if (this.persos.get(p.acteur.nom) !== p) return;
        const suivant = p.file.shift();
        if (suivant) {
          p.pub = { x: suivant.x, y: suivant.y };
          this.publier(p, p.chemin.length || p.file.length ? "marche" : "arrive");
        }
        this.vider(p);
      }, 0);
    }

    /** Un pas de marche pour chaque personnage en route ; rend vrai tant qu'il en reste un (en route, ou à relever). */
    private marcher(dt: number): boolean {
      let enRoute = false;
      for (const p of this.persos.values()) {
        if (!p.chemin.length && !p.file.length) continue;
        if (p.chemin.length) {
          const r = avancer(p.pos, p.chemin, VITESSE * dt);
          this.poser(p, r.pos.x, r.pos.y);
          p.dist += r.parcouru;
          // Un point sur deux est relevé (le dernier toujours) : assez pour suivre le chemin, deux fois moins de relevés à tenir quand les images tardent.
          r.croises.forEach((c, i) => { p.n += 1; if (p.n % 2 === 0 || (!p.chemin.length && i === r.croises.length - 1)) p.file.push(c); });
          p.image.setFrame(p.chemin.length ? 1 + (Math.floor(p.dist / PAS_D_IMAGE) % 2) : 0);
        }
        // Le miroir relève les points UN par UN, dans l'ordre, chacun dans sa propre tâche du navigateur : la suite des positions est celle
        // du chemin, ni la cadence des images ni leur nombre ne la changent, et une machine chargée ne ralentit pas ce qui se voit.
        this.vider(p);
        if (!p.chemin.length) {
          p.image.setFrame(0);
          this.effets(p, p.acteur);
        }
        if (p.chemin.length || p.file.length || p.vidage) enRoute = true;
      }
      return enRoute;
    }
  }

  return new StationScene();
};
