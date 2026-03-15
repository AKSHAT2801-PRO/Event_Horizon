import type { MeteorEvent } from "./meteorEvents";

// Approximate orbital elements derived from meteor parameters
export interface OrbitalElements {
  semiMajorAxis: number;  // a (AU)
  eccentricity: number;   // e
  inclination: number;    // i (degrees)
  perihelion: number;     // q (AU)
  aphelion: number;       // Q (AU)
  argPerihelion: number;  // ω (degrees)
  longAscNode: number;    // Ω (degrees)
}

// Rough geocentric radiant estimate from lat/lng and velocity
export function estimateRadiant(event: MeteorEvent): { ra: number; dec: number } {
  // Simplified: use known radiants for shower members, estimate for sporadics
  const showerRadiants: Record<string, { ra: number; dec: number }> = {
    "Geminids": { ra: 112, dec: 33 },
    "Perseids": { ra: 48, dec: 58 },
    "Leonids": { ra: 152, dec: 22 },
    "Quadrantids": { ra: 230, dec: 49 },
    "Draconids": { ra: 262, dec: 54 },
    "Eta Aquariids": { ra: 338, dec: -1 },
  };

  if (showerRadiants[event.shower]) {
    // Add slight scatter for realism
    const s = showerRadiants[event.shower];
    const hash = event.id.charCodeAt(event.id.length - 1);
    return { ra: s.ra + (hash % 5) - 2, dec: s.dec + (hash % 3) - 1 };
  }

  // Sporadic: derive from entry geometry (simplified)
  const ra = ((event.lng + 180) * 360 / 360 + event.velocity * 1.5) % 360;
  const dec = Math.max(-90, Math.min(90, event.lat * 0.6 + (event.velocity - 30) * 0.3));
  return { ra: Math.round(ra * 10) / 10, dec: Math.round(dec * 10) / 10 };
}

// Approximate orbital elements from velocity and altitude
export function computeOrbitalElements(event: MeteorEvent): OrbitalElements {
  const vInf = event.velocity; // km/s at infinity approx
  const vEarth = 29.78; // km/s Earth orbital velocity
  const mu = 132712440018; // km³/s² Sun gravitational parameter
  const AU = 149597870.7; // km
  const rEarth = 1.0; // AU

  // Vis-viva: v² = mu*(2/r - 1/a) → a = 1/(2/r - v²/(mu/AU))
  const vRatio = vInf / vEarth;
  const energy = (vInf * vInf) / 2 - (mu / (rEarth * AU));
  const a = Math.abs(-mu / (2 * energy)) / AU;
  const cappedA = Math.min(a, 50); // cap for near-parabolic

  // Perihelion from approximate geometry
  const q = Math.max(0.1, rEarth * (1 - vRatio * 0.15));
  const e = Math.min(0.999, 1 - q / cappedA);
  const Q = cappedA * (1 + e);

  // Inclination from velocity and latitude
  const i = Math.abs(event.lat * 0.4 + (vInf - 30) * 0.8);
  const cappedI = Math.min(170, Math.max(2, i));

  // Arguments from position
  const omega = (event.lng + 180 + event.velocity * 2) % 360;
  const Omega = (event.lng + 90) % 360;

  return {
    semiMajorAxis: Math.round(cappedA * 1000) / 1000,
    eccentricity: Math.round(e * 10000) / 10000,
    inclination: Math.round(cappedI * 10) / 10,
    perihelion: Math.round(q * 1000) / 1000,
    aphelion: Math.round(Q * 100) / 100,
    argPerihelion: Math.round(omega * 10) / 10,
    longAscNode: Math.round(Omega * 10) / 10,
  };
}

// Generate velocity profile (altitude vs velocity during entry)
export function generateVelocityProfile(event: MeteorEvent): { altitude: number; velocity: number }[] {
  const points: { altitude: number; velocity: number }[] = [];
  const startAlt = event.altitude + 40;
  const endAlt = Math.max(10, event.altitude - 30);
  const steps = 20;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const alt = startAlt - t * (startAlt - endAlt);
    // Deceleration curve — exponential drag
    const dragFactor = Math.exp(-t * 2.5 * (event.mass < 1000 ? 1.5 : 0.5));
    const vel = event.velocity * dragFactor;
    points.push({
      altitude: Math.round(alt * 10) / 10,
      velocity: Math.round(vel * 100) / 100,
    });
  }

  return points;
}
