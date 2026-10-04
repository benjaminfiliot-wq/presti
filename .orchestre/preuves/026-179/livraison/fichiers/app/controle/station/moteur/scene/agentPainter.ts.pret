// Personnage en pixel art dessiné par code : 16 × 24 px par image, 3 images
// (au repos, pas gauche, pas droit), vue de face. Partagé par les rendus A (3D) et B (2D).
// Les couleurs viennent du profil d'avatar de Claw3D ; l'insigne prend la couleur propre de l'agent.

import type { AgentAvatarProfile } from "../claw3d/profile";

export const AGENT_FW = 16;
export const AGENT_FH = 24;
export const AGENT_FRAMES = 3;
const OUTLINE: [number, number, number] = [0x1b, 0x0b, 0x33];

const shade = (hex: string, factor: number) => {
  const value = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = Math.min(255, Math.round(((value >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((value >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((value & 255) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

type Painter = (x: number, y: number, w: number, h: number, color: string) => void;

const paintFrame = (
  rect: Painter,
  frame: number,
  profile: AgentAvatarProfile,
  accent: string,
) => {
  const skin = profile.body.skinTone;
  const hair = profile.hair.color;
  const top = profile.clothing.topColor;
  const bottom = profile.clothing.bottomColor;
  const shoes = profile.clothing.shoesColor;
  const bob = frame === 0 ? 0 : 1; // le corps descend d'un pixel pendant le pas

  // jambes (image 1 : jambe gauche en avant ; image 2 : jambe droite)
  const legTop = 16 + bob;
  const leftLegH = frame === 1 ? 5 : 6;
  const rightLegH = frame === 2 ? 5 : 6;
  const legColor = profile.clothing.bottomStyle === "shorts" ? skin : bottom;
  rect(5, legTop, 3, leftLegH, legColor);
  rect(8, legTop, 3, rightLegH, legColor);
  if (profile.clothing.bottomStyle === "shorts") rect(5, legTop, 6, 2, bottom);
  rect(5, legTop + leftLegH, 3, 1, shoes);
  rect(8, legTop + rightLegH, 3, 1, shoes);

  // buste et bras
  const torsoTop = 10 + bob;
  rect(4, torsoTop, 8, 6, top);
  rect(4, torsoTop + 5, 8, 1, shade(top, 0.7));
  const armSwing = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  rect(3, torsoTop + 1 + armSwing, 1, 4, shade(top, 0.8));
  rect(12, torsoTop + 1 - armSwing, 1, 4, shade(top, 0.8));
  rect(3, torsoTop + 5 + armSwing, 1, 1, skin);
  rect(12, torsoTop + 5 - armSwing, 1, 1, skin);
  if (profile.clothing.topStyle === "hoodie") rect(6, torsoTop, 4, 1, shade(top, 0.75));
  if (profile.clothing.topStyle === "jacket") rect(7, torsoTop, 2, 6, shade(top, 0.6));
  rect(9, torsoTop + 2, 2, 2, accent); // insigne : couleur propre de l'agent

  // tête (de face)
  const headTop = 2 + bob;
  rect(4, headTop, 8, 8, skin);
  rect(4, headTop, 8, 2, hair);
  rect(4, headTop + 2, 1, 3, hair);
  rect(11, headTop + 2, 1, 3, hair);
  if (profile.hair.style === "spiky") {
    rect(5, headTop - 1, 1, 1, hair);
    rect(8, headTop - 1, 1, 1, hair);
    rect(10, headTop - 1, 1, 1, hair);
  }
  if (profile.hair.style === "bun") rect(6, headTop - 2, 4, 2, hair);
  if (profile.accessories.hatStyle === "cap") {
    rect(4, headTop - 1, 8, 2, accent);
    rect(10, headTop + 1, 3, 1, shade(accent, 0.7));
  }
  if (profile.accessories.hatStyle === "beanie") rect(4, headTop - 1, 8, 3, shade(accent, 0.8));
  rect(6, headTop + 4, 1, 2, "#1b0b33");
  rect(9, headTop + 4, 1, 2, "#1b0b33");
  rect(7, headTop + 7, 2, 1, shade(skin, 0.7));
  if (profile.accessories.glasses) rect(5, headTop + 4, 6, 1, "#1b0b33");
  if (profile.accessories.headset) {
    rect(3, headTop + 3, 1, 3, "#2fc6e0");
    rect(12, headTop + 3, 1, 3, "#2fc6e0");
  }
};

/** Planche 48 × 24 (3 images), avec un contour d'un pixel autour de la silhouette. */
export const drawAgentSheet = (
  profile: AgentAvatarProfile,
  accent: string,
): HTMLCanvasElement | null => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = AGENT_FW * AGENT_FRAMES;
  canvas.height = AGENT_FH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  for (let frame = 0; frame < AGENT_FRAMES; frame += 1) {
    const ox = frame * AGENT_FW;
    paintFrame(
      (x, y, w, h, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(ox + x, y, w, h);
      },
      frame,
      profile,
      accent,
    );
  }
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const alphaAt = (x: number, y: number) => image.data[(y * canvas.width + x) * 4 + 3];
  const toSet: number[] = [];
  for (let y = 0; y < AGENT_FH; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (alphaAt(x, y) > 0) continue;
      const fx = x % AGENT_FW;
      const near =
        (fx > 0 && alphaAt(x - 1, y) > 0) ||
        (fx < AGENT_FW - 1 && alphaAt(x + 1, y) > 0) ||
        (y > 0 && alphaAt(x, y - 1) > 0) ||
        (y < AGENT_FH - 1 && alphaAt(x, y + 1) > 0);
      if (near) toSet.push((y * canvas.width + x) * 4);
    }
  }
  for (const index of toSet) {
    image.data[index] = OUTLINE[0];
    image.data[index + 1] = OUTLINE[1];
    image.data[index + 2] = OUTLINE[2];
    image.data[index + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
};
