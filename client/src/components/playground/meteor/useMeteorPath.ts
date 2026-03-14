import { useEarthContext } from "@/context/EarthContext";
import { useMemo } from "react";
import * as THREE from "three";

const REAL_EARTH_RADIUS_KM = 6371;
const TIME_SCALE = 100;
const LNG_OFFSET = 90;

export function kmpsToModelUnits(v_kmps: number, modelRadius: number): number {
  return v_kmps * (modelRadius / REAL_EARTH_RADIUS_KM) * TIME_SCALE;
}

/**
 * Convert real-world lat/lng/altitude to model-space 3D position.
 * altitude in km above Earth surface.
 */
export function geoToModel(
  lat: number,
  lng: number,
  altitudeKm: number,
  modelRadius: number,
): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = ((lng + LNG_OFFSET) * Math.PI) / 180;
  // Convert altitude from km to model units, add to model radius
  const r = modelRadius + altitudeKm * (modelRadius / REAL_EARTH_RADIUS_KM);
  return new THREE.Vector3(
    r * Math.cos(latRad) * Math.sin(lngRad),
    r * Math.sin(latRad),
    r * Math.cos(latRad) * Math.cos(lngRad),
  );
}

export interface MeteorPathInput {
  // ── From backend ──────────────────────────────────────────────────────────
  /** Start position from backend */
  startLat: number;
  startLng: number;
  startAltKm: number; // km above surface

  /** Velocity vector in km/s */
  vx: number;
  vy: number;
  vz: number;

  /** End position from backend (used to compute tEnd automatically) */
  endLat: number;
  endLng: number;
  endAltKm: number;

  /** Initial mass — used as size placeholder */
  m0: number;
  /** Mass decay rate: m(t) = m0 * e^(-k*t). k=0 = no decay */
  k?: number;

  // ── Client config ─────────────────────────────────────────────────────────
  steps?: number;
  willImpact?: boolean;
}

export interface MeteorPathResult {
  points: THREE.Vector3[];
  impactT: number | null;
  tEnd: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  positionAt: (t: number) => THREE.Vector3;
  massAt: (elapsed: number) => number;
  hasImpact: boolean;
  /** Velocity magnitude in model units/sec — faster km/s = larger value */
  modelSpeed: number;
}

function findImpactT(
  ax: number,
  ay: number,
  az: number,
  sx: number,
  sy: number,
  sz: number,
  earthRadius: number,
): number | null {
  const A = ax * ax + ay * ay + az * az;
  const B = 2 * (ax * sx + ay * sy + az * sz);
  const C = sx * sx + sy * sy + sz * sz - earthRadius * earthRadius;

  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;

  const sqrtD = Math.sqrt(disc);
  const t1 = (-B - sqrtD) / (2 * A);
  const t2 = (-B + sqrtD) / (2 * A);

  const candidates = [t1, t2].filter((t) => t > 0.001);
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

export function useMeteorPath({
  startLat,
  startLng,
  startAltKm,
  vx,
  vy,
  vz,
  endLat,
  endLng,
  endAltKm,
  m0,
  k = 0,
  steps = 150,
  willImpact,
}: MeteorPathInput): MeteorPathResult {
  const { radius: earthRadius } = useEarthContext();

  return useMemo(() => {
    // Convert geo positions to model space
    const startPos = geoToModel(startLat, startLng, startAltKm, earthRadius);
    const endPos = geoToModel(endLat, endLng, endAltKm, earthRadius);

    // Convert velocity km/s → model units/sec
    const ax = kmpsToModelUnits(vx, earthRadius);
    const ay = kmpsToModelUnits(vy, earthRadius);
    const az = kmpsToModelUnits(vz, earthRadius);

    // P(t) = velocity * t + startPos
    const positionAt = (t: number): THREE.Vector3 =>
      new THREE.Vector3(
        ax * t + startPos.x,
        ay * t + startPos.y,
        az * t + startPos.z,
      );

    // m(elapsed) = m0 * e^(-k * elapsed)
    const massAt = (elapsed: number): number => m0 * Math.exp(-k * elapsed);

    // Compute tEnd: how long to reach endPos from startPos at given velocity
    // Use the axis with the largest velocity component for stability
    const speed = Math.sqrt(ax * ax + ay * ay + az * az);
    const dist = startPos.distanceTo(endPos);
    const tEnd = speed > 0.0001 ? dist / speed : 30;

    // Check for Earth surface intersection
    const surfaceT = findImpactT(
      ax,
      ay,
      az,
      startPos.x,
      startPos.y,
      startPos.z,
      earthRadius,
    );
    const hasImpact = willImpact ?? surfaceT !== null;
    const resolvedEnd =
      hasImpact && surfaceT !== null ? Math.min(surfaceT, tEnd) : tEnd;

    // Sample path points
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * resolvedEnd;
      points.push(positionAt(t));
    }

    return {
      points,
      impactT: hasImpact ? resolvedEnd : null,
      tEnd: resolvedEnd,
      startPos,
      endPos,
      positionAt,
      massAt,
      hasImpact,
      modelSpeed: speed,
    };
  }, [
    startLat,
    startLng,
    startAltKm,
    vx,
    vy,
    vz,
    endLat,
    endLng,
    endAltKm,
    m0,
    k,
    steps,
    willImpact,
    earthRadius,
  ]);
}
