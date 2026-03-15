import { MeteorPathInput } from "./useMeteorPath";

export interface MeteorData extends MeteorPathInput {
  id: string;
}

export function velToward(
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
 * Derives a color from meteor mass (kg).
 *
 * Mass scale (approximate):
 *   < 1e-3  kg  — tiny/dust   → cool blue-white  #a0d8ff
 *   1e-3–1  kg  — small       → yellow-white      #ffe680
 *   1–1000  kg  — medium      → orange            #ff8c00
 *   > 1000  kg  — large/major → deep red          #ff1a1a
 */
export function massToColor(m0: number): string {
  const log = Math.log10(Math.max(m0, 1e-12));

  // Gradient stops: [log10(mass), r, g, b]
  const stops: [number, number, number, number][] = [
    [-6, 160, 216, 255], // blue-white
    [-3, 255, 230, 128], // yellow
    [0, 255, 160, 64], // orange
    [2, 255, 69, 0], // deep orange-red
    [3, 255, 26, 26], // red
  ];

  // Clamp to range
  if (log <= stops[0][0])
    return rgbToHex(stops[0][1], stops[0][2], stops[0][3]);
  if (log >= stops[stops.length - 1][0]) {
    const last = stops[stops.length - 1];
    return rgbToHex(last[1], last[2], last[3]);
  }

  // Find surrounding stops and interpolate
  for (let i = 0; i < stops.length - 1; i++) {
    const [l0, r0, g0, b0] = stops[i];
    const [l1, r1, g1, b1] = stops[i + 1];
    if (log >= l0 && log <= l1) {
      const t = (log - l0) / (l1 - l0);
      return rgbToHex(
        Math.round(r0 + t * (r1 - r0)),
        Math.round(g0 + t * (g1 - g0)),
        Math.round(b0 + t * (b1 - b0)),
      );
    }
  }

  return "#ff6a00";
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export const METEOR_DATA: MeteorData[] = [
  // ── REAL EVENT ─────────────────────────────────────────────────────────────
  {
    id: "2019010209_1919",
    startLat: 34.182484,
    startLng: -107.79249,
    startAltKm: 98.5712,
    endLat: 34.300408,
    endLng: -107.698611,
    endAltKm: 83.9707,
    ...velToward(
      34.182484,
      -107.79249,
      98.5712,
      34.300408,
      -107.698611,
      83.9707,
      33.4824,
    ),
    m0: 8.83e-5,
  },

  // ── IMPACTORS ──────────────────────────────────────────────────────────────
  {
    id: "chelyabinsk",
    startLat: 62.0,
    startLng: 68.0,
    startAltKm: 5000,
    endLat: 54.8,
    endLng: 61.1,
    endAltKm: 0,
    ...velToward(62.0, 68.0, 5000, 54.8, 61.1, 0, 18.6),
    m0: 100,
  },
  {
    id: "tunguska",
    startLat: 72.0,
    startLng: 50.0,
    startAltKm: 6000,
    endLat: 60.9,
    endLng: 101.9,
    endAltKm: 0,
    ...velToward(72.0, 50.0, 6000, 60.9, 101.9, 0, 27.0),
    m0: 200,
  },
  {
    id: "kpg",
    startLat: 35.0,
    startLng: -115.0,
    startAltKm: 8000,
    endLat: 21.4,
    endLng: -89.5,
    endAltKm: 0,
    ...velToward(35.0, -115.0, 8000, 21.4, -89.5, 0, 20.0),
    m0: 500,
  },

  // ── FLY-BY ─────────────────────────────────────────────────────────────────
  {
    id: "flyby-2023dw",
    startLat: 25.0,
    startLng: -85.0,
    startAltKm: 5000,
    endLat: -15.0,
    endLng: -30.0,
    endAltKm: 4000,
    ...velToward(25.0, -85.0, 5000, -15.0, -30.0, 4000, 22.0),
    m0: 80,
  },

  // ── EARTH-GRAZERS ──────────────────────────────────────────────────────────
  {
    id: "grazer-1972",
    startLat: 35.0,
    startLng: -120.0,
    startAltKm: 4000,
    endLat: 52.0,
    endLng: -110.0,
    endAltKm: 3000,
    ...velToward(35.0, -120.0, 4000, 52.0, -110.0, 3000, 15.0),
    m0: 70,
  },
  {
    id: "grazer-deep",
    startLat: 28.0,
    startLng: -65.0,
    startAltKm: 4500,
    endLat: 42.0,
    endLng: -15.0,
    endAltKm: 3500,
    ...velToward(28.0, -65.0, 4500, 42.0, -15.0, 3500, 12.0),
    m0: 90,
  },
];
