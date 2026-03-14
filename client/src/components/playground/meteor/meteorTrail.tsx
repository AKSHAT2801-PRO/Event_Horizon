import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MAX_TRAIL_POINTS = 100;
const POINTS_PER_SCALE = 25;
const MIN_TRAIL_POINTS = 0;

interface MeteorTrailProps {
  meteorRef: React.RefObject<THREE.Mesh | null>;
  color?: string;
}

export function MeteorTrail({
  meteorRef,
  color = "#ff6a00",
}: MeteorTrailProps) {
  const posBuffer = useRef<THREE.Vector3[]>([]);
  const trailRef = useRef<THREE.Mesh | null>(null);
  const smoothedMaxRef = useRef<number>(MIN_TRAIL_POINTS);

  const worldPos = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const ribbonAxis = new THREE.Vector3();
  const segDir = new THREE.Vector3();
  const toCamera = new THREE.Vector3();

  useEffect(() => {
    const vertexCount = MAX_TRAIL_POINTS * 2;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3),
    );

    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(vertexCount * 4), 4),
    );

    const indices: number[] = [];
    for (let i = 0; i < MAX_TRAIL_POINTS - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      indices.push(a, b, c, b, d, c);
    }

    geo.setIndex(indices);
    geo.setDrawRange(0, 0);

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    trailRef.current = new THREE.Mesh(geo, mat);
    trailRef.current.matrixAutoUpdate = false;
    trailRef.current.matrix.identity();
    trailRef.current.matrixWorld.identity();
    trailRef.current.frustumCulled = false;

    return () => {
      geo.dispose();
      mat.dispose();
      trailRef.current = null;
    };
  }, []);

  useFrame(({ scene, camera }) => {
    const trail = trailRef.current;
    const meteor = meteorRef.current;

    if (!trail || !meteor) return;

    if (!trail.parent && meteor.parent) {
      meteor.parent.add(trail);
    }

    meteor.updateWorldMatrix(true, false);

    worldPos.setFromMatrixPosition(meteor.matrixWorld);

    // convert world -> parent local
    meteor.parent?.worldToLocal(worldPos);

    if (worldPos.lengthSq() < 0.001) return;

    const currentScale = meteor.scale.x;

    let dynamicMax = Math.round(
      THREE.MathUtils.clamp(
        currentScale * POINTS_PER_SCALE,
        MIN_TRAIL_POINTS,
        MAX_TRAIL_POINTS,
      ),
    );

    // Hard cutoff when meteor is tiny
    if (currentScale < 0.05) dynamicMax = 0;

    // If meteor fully burned up, clear trail instantly
    if (dynamicMax === 0) {
      posBuffer.current.length = 0;
      smoothedMaxRef.current = 0;
      trail.geometry.setDrawRange(0, 0);
      return;
    }

    posBuffer.current.unshift(worldPos.clone());

    smoothedMaxRef.current = THREE.MathUtils.lerp(
      smoothedMaxRef.current,
      dynamicMax,
      0.08,
    );

    const smoothedMax = Math.round(smoothedMaxRef.current);

    while (posBuffer.current.length > smoothedMax) {
      posBuffer.current.pop();
    }

    const n = posBuffer.current.length;
    if (n < 2) return;

    const posAttr = trail.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = trail.geometry.attributes.color as THREE.BufferAttribute;

    const base = new THREE.Color(color);

    camera.getWorldPosition(camPos);

    const sphereGeo = meteor.geometry as THREE.SphereGeometry;
    const HEAD_WIDTH = sphereGeo.parameters.radius * meteor.scale.x * 2;

    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const width = HEAD_WIDTH * (1 - t);

      if (i === 0) {
        segDir.copy(posBuffer.current[0]).sub(posBuffer.current[1]);
      } else if (i === n - 1) {
        segDir.copy(posBuffer.current[n - 2]).sub(posBuffer.current[n - 1]);
      } else {
        segDir.copy(posBuffer.current[i - 1]).sub(posBuffer.current[i + 1]);
      }

      if (segDir.lengthSq() < 0.0001) segDir.set(0, 1, 0);

      segDir.normalize();

      toCamera.copy(camPos).sub(posBuffer.current[i]).normalize();

      ribbonAxis.crossVectors(segDir, toCamera);

      if (ribbonAxis.lengthSq() < 0.0001) {
        ribbonAxis.crossVectors(segDir, camera.up);
      }

      ribbonAxis.normalize().multiplyScalar(width * 0.5);

      const p = posBuffer.current[i];

      posAttr.setXYZ(
        i * 2,
        p.x - ribbonAxis.x,
        p.y - ribbonAxis.y,
        p.z - ribbonAxis.z,
      );

      posAttr.setXYZ(
        i * 2 + 1,
        p.x + ribbonAxis.x,
        p.y + ribbonAxis.y,
        p.z + ribbonAxis.z,
      );

      const intensity = Math.pow(1 - t, 1.2);
      const alpha = Math.pow(1 - t, 0.6);

      colAttr.setXYZW(
        i * 2,
        base.r * intensity,
        base.g * intensity,
        base.b * intensity,
        alpha,
      );

      colAttr.setXYZW(
        i * 2 + 1,
        base.r * intensity,
        base.g * intensity,
        base.b * intensity,
        alpha,
      );
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    trail.geometry.setDrawRange(0, (n - 1) * 6);
  });

  return null;
}
