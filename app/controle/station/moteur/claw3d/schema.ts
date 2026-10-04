// Types de carte et de zone de Claw3D (src/lib/office/schema.ts, lignes 1 à 183, commit 0565b78, MIT, voir PROVENANCE.md), dont les zones
// en polygone (OfficePolygon, OfficeZone, OfficeCollision). Seuls les types sont gardés : les normalisateurs et les cartes d'exemple
// (createEmptyOfficeMap, createStarterOfficeMap, normalizeOfficeMap) ne sont pas copiés.

export type OfficeLayerId =
  | "floor"
  | "walls"
  | "furniture"
  | "decor"
  | "lighting"
  | "agents";

export type OfficeZoneType =
  | "desk_zone"
  | "meeting_room"
  | "lounge"
  | "game_room"
  | "hallway"
  | "coffee_area";

export type OfficeAgentState = "idle" | "working" | "meeting" | "error";

export type OfficeLightPreset =
  | "ceiling_lamp"
  | "desk_monitor"
  | "tv_glow"
  | "meeting_spotlight"
  | "emergency_error";

export type OfficeLightAnimationPreset =
  | "steady"
  | "soft_flicker"
  | "breathing_pulse"
  | "error_strobe_subtle";

export type OfficeAmbiencePreset =
  | "coffee_steam"
  | "window_dust"
  | "game_sparkle"
  | "plant_pollen";

export type OfficeInteractionKind =
  | "couch_sit"
  | "arcade_stand"
  | "tv_watch"
  | "desk_seat"
  | "window_stand";

export type OfficeVector = {
  x: number;
  y: number;
};

export type OfficePolygon = {
  points: OfficeVector[];
};

export type OfficeLayer = {
  id: OfficeLayerId;
  visible: boolean;
  locked: boolean;
  opacity: number;
  parallax: number;
};

export type OfficeMapObject = {
  id: string;
  assetId: string;
  layerId: OfficeLayerId;
  x: number;
  y: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  zIndex: number;
  tags: string[];
};

export type OfficeLightBinding = {
  agentId?: string;
  zoneId?: string;
  deskObjectId?: string;
  state?: OfficeAgentState;
};

export type OfficeFlickerProfile = {
  speed: number;
  amplitude: number;
};

export type OfficeLightObject = {
  id: string;
  preset: OfficeLightPreset;
  animationPreset: OfficeLightAnimationPreset;
  x: number;
  y: number;
  radius: number;
  baseIntensity: number;
  spriteAssetId?: string;
  flicker?: OfficeFlickerProfile;
  binding?: OfficeLightBinding;
  roomId?: string;
  enabled: boolean;
};

export type OfficeAmbienceEmitter = {
  id: string;
  preset: OfficeAmbiencePreset;
  zoneId: string;
  maxParticles: number;
  spawnRate: number;
  enabled: boolean;
};

export type OfficeInteractionPoint = {
  id: string;
  kind: OfficeInteractionKind;
  x: number;
  y: number;
  zoneId?: string;
  facingDegrees?: number;
  tags: string[];
};

export type OfficeZone = {
  id: string;
  type: OfficeZoneType;
  name: string;
  shape: OfficePolygon;
  capacity?: number;
  interactionPointIds?: string[];
  ambienceTags?: string[];
};

export type OfficeCollision = {
  id: string;
  shape: OfficePolygon;
  blocked: boolean;
};

export type OfficeSpawnPoint = {
  id: string;
  x: number;
  y: number;
};

export type OfficeDeskAssignment = {
  deskObjectId: string;
  seatAnchor: OfficeVector;
  facingDegrees: number;
};

export type OfficeTheme = {
  mood: "neutral" | "focus" | "cozy" | "night";
  enableThoughtBubbles: boolean;
};

export type OfficeLightingOverlay = {
  enabled: boolean;
  baseDarkness: number;
  roomDarkness: Record<string, number>;
};

export type OfficeCanvas = {
  width: number;
  height: number;
  tileSize: number;
  backgroundColor: string;
};

export type OfficeMap = {
  mapVersion: number;
  workspaceId: string;
  officeVersionId: string;
  canvas: OfficeCanvas;
  layers: OfficeLayer[];
  objects: OfficeMapObject[];
  zones: OfficeZone[];
  collisions: OfficeCollision[];
  spawnPoints: OfficeSpawnPoint[];
  deskAssignments: Record<string, OfficeDeskAssignment>;
  lightingOverlay?: OfficeLightingOverlay;
  lights?: OfficeLightObject[];
  ambienceEmitters?: OfficeAmbienceEmitter[];
  interactionPoints?: OfficeInteractionPoint[];
  theme?: OfficeTheme;
};
