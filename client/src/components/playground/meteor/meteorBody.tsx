import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMeteorPath, MeteorPathInput } from "./useMeteorPath";
import { MeteorTrail } from "./meteorTrail";
import { useMeteorSim } from "@/context/MeteorSimContext";

interface MeteorBodyProps extends MeteorPathInput {
  id?: string;
  color?: string;
  emissiveIntensity?: number;
  massToRadius?: (mass: number) => number;
  /**
   * If true, meteor loops back to start after reaching end.
   * If false (default), it stops at the end position.
   */
  loop?: boolean;
}

const defaultMassToRadius = (mass: number) => Math.cbrt(Math.abs(mass)) * 0.3;

export function MeteorBody({
  id,
  color = "#ff4500",
  emissiveIntensity = 2,
  massToRadius = defaultMassToRadius,
  loop = false,
  ...pathInput
}: MeteorBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const tRef = useRef(0);
  const elapsedRef = useRef(0);
  const doneRef = useRef(false);

  const { timeScale, sizeScale, paused } = useMeteorSim();

  const { positionAt, impactT, hasImpact, tEnd } = useMeteorPath(pathInput);

  const loopEnd = hasImpact && impactT !== null ? impactT : tEnd;

  const initRadius = defaultMassToRadius(pathInput.m0);

  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.userData.isMeteor = true;
    meshRef.current.userData.meteorId = id ?? "unknown";
    meshRef.current.userData.mass = pathInput.m0;
    meshRef.current.userData.color = color;
  }, [id, pathInput.m0, color]);

  useFrame((_, delta) => {
    if (!meshRef.current || doneRef.current) return;

    const dt = paused ? 0 : delta * timeScale;
    tRef.current += dt;
    elapsedRef.current += dt;

    if (tRef.current >= loopEnd) {
      if (loop) {
        tRef.current = 0;
        elapsedRef.current = 0;
      } else {
        tRef.current = loopEnd;
        doneRef.current = true;
      }
    }

    const pos = positionAt(tRef.current);
    meshRef.current.position.copy(pos);
    glowRef.current?.position.copy(pos);

    const progress = THREE.MathUtils.clamp(tRef.current / loopEnd, 0, 1);
    const mass = THREE.MathUtils.lerp(pathInput.m0, 0, progress);

    const pulse = 1 + 0.06 * Math.sin(Date.now() * 0.005);
    const r = Math.max(massToRadius(mass) * pulse * sizeScale, 0.05);

    meshRef.current.scale.setScalar(r);
    glowRef.current?.scale.setScalar(r * 1.5);

    if (lightRef.current) {
      lightRef.current.position.copy(pos);
      lightRef.current.intensity = mass * 0.1;
    }
  });

  return (
    <>
      <MeteorTrail meteorRef={meshRef} color={color} />

      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      <mesh ref={glowRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity * 0.3}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        color={color}
        distance={initRadius * 30}
        decay={2}
      />
    </>
  );
}
