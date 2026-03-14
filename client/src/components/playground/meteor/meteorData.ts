import { MeteorPathInput } from "./useMeteorPath";

export interface MeteorData extends MeteorPathInput {
  id: string;
  label: string;
  type: "impactor" | "flyby" | "grazer";
  description: string;
  color: string;
}

function velToward(
  fromLat: number,
  fromLng: number,
  fromAlt: number,
  toLat: number,
  toLng: number,
  toAlt: number,
  speed: number,
  R = 6371,
  LNG_OFFSET = 90,
): { vx: number; vy: number; vz: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  function toXYZ(lat: number, lng: number, alt: number) {
    const latR = toRad(lat);
    const lngR = toRad(lng + LNG_OFFSET);
    const r = R + alt;
    return {
      x: r * Math.cos(latR) * Math.sin(lngR),
      y: r * Math.sin(latR),
      z: r * Math.cos(latR) * Math.cos(lngR),
    };
  }
  const from = toXYZ(fromLat, fromLng, fromAlt);
  const to = toXYZ(toLat, toLng, toAlt);
  const dx = to.x - from.x,
    dy = to.y - from.y,
    dz = to.z - from.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return {
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    vz: (dz / len) * speed,
  };
}

/**
 * Altitude reference:
 *   ~100 km   — Kármán line (edge of atmosphere), where meteors glow
 *   ~500 km   — Low Earth Orbit
 *   ~2000 km  — clearly visible in space above Earth
 *   ~10000 km — very far out, dramatic approach
 *
 * Use 3000–8000 km for cinematic spawn distances.
 * endAltKm = 0 for impactors, 200–500 for fly-bys/grazers.
 */
export const METEOR_DATA: MeteorData[] = [
  // ── IMPACTORS ──────────────────────────────────────────────────────────────
  {
    id: "chelyabinsk",
    label: "Chelyabinsk (2013)",
    type: "impactor",
    description:
      "18m asteroid, ~500kt airburst over Russia. Real speed: 18.6 km/s.",
    startLat: 62.0,
    startLng: 68.0,
    startAltKm: 5000, // spawn far in space
    endLat: 54.8,
    endLng: 61.1,
    endAltKm: 0, // hits Chelyabinsk
    ...velToward(62.0, 68.0, 5000, 54.8, 61.1, 0, 18.6),
    m0: 100,
    k: 0.08,
    color: "#ff8c00",
    willImpact: true,
  },
  {
    id: "tunguska",
    label: "Tunguska (1908)",
    type: "impactor",
    description:
      "50–80m bolide, 10–15Mt airburst over Siberia. Real speed: 27 km/s.",
    startLat: 72.0,
    startLng: 50.0,
    startAltKm: 6000,
    endLat: 60.9,
    endLng: 101.9,
    endAltKm: 0,
    ...velToward(72.0, 50.0, 6000, 60.9, 101.9, 0, 27.0),
    m0: 200,
    k: 0.12,
    color: "#ff4500",
    willImpact: true,
  },
  {
    id: "kpg",
    label: "K-Pg Impactor (~66 Ma)",
    type: "impactor",
    description: "~10km asteroid, ended Cretaceous. Yucatan peninsula impact.",
    startLat: 35.0,
    startLng: -115.0,
    startAltKm: 8000,
    endLat: 21.4,
    endLng: -89.5,
    endAltKm: 0,
    ...velToward(35.0, -115.0, 8000, 21.4, -89.5, 0, 20.0),
    m0: 500,
    k: 0.02,
    color: "#ff0044",
    willImpact: true,
  },

  // ── FLY-BY ─────────────────────────────────────────────────────────────────
  {
    id: "flyby-2023dw",
    label: "2023 DW Fly-by",
    type: "flyby",
    description:
      "Near-Earth asteroid, passed at ~0.1 AU. Clean miss at 22 km/s.",
    startLat: 25.0,
    startLng: -85.0,
    startAltKm: 5000,
    endLat: -15.0,
    endLng: -30.0,
    endAltKm: 4000, // exits high — clean miss
    ...velToward(25.0, -85.0, 5000, -15.0, -30.0, 4000, 22.0),
    m0: 80,
    k: 0.0,
    color: "#00cfff",
    willImpact: false,
  },

  // ── EARTH-GRAZERS ──────────────────────────────────────────────────────────
  {
    id: "grazer-1972",
    label: "1972 Great Daylight Fireball",
    type: "grazer",
    description:
      "~4m object skipped off atmosphere at 58km over North America.",
    startLat: 35.0,
    startLng: -120.0,
    startAltKm: 4000,
    endLat: 52.0,
    endLng: -110.0,
    endAltKm: 3000, // exits at altitude
    ...velToward(35.0, -120.0, 4000, 52.0, -110.0, 3000, 15.0),
    m0: 70,
    k: 0.04,
    color: "#aaff00",
    willImpact: false,
  },
  {
    id: "grazer-deep",
    label: "Deep Grazer (Hypothetical)",
    type: "grazer",
    description: "Deeper skim over Atlantic — enters atmosphere, barely exits.",
    startLat: 28.0,
    startLng: -65.0,
    startAltKm: 4500,
    endLat: 42.0,
    endLng: -15.0,
    endAltKm: 3500,
    ...velToward(28.0, -65.0, 4500, 42.0, -15.0, 3500, 12.0),
    m0: 90,
    k: 0.06,
    color: "#88ffcc",
    willImpact: false,
  },
];

export const IMPACTORS = METEOR_DATA.filter((m) => m.type === "impactor");
export const FLYBYS = METEOR_DATA.filter((m) => m.type === "flyby");
export const GRAZERS = METEOR_DATA.filter((m) => m.type === "grazer");
