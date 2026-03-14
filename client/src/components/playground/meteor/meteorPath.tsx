import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useMeteorPath, MeteorPathInput } from "./useMeteorPath";

interface MeteorPathProps extends MeteorPathInput {
  color?: string;
  opacity?: number;
  fade?: boolean;
}

export function MeteorPath({
  color = "#ff6a00",
  opacity = 0.4,
  fade = true,
  ...pathInput
}: MeteorPathProps) {
  const { points } = useMeteorPath(pathInput);

  const vertexColors = useMemo<THREE.Color[]>(() => {
    if (!fade) return [];
    const base = new THREE.Color(color);
    return points.map((_, i) => {
      const t = i / (points.length - 1);
      return new THREE.Color(base.r * t, base.g * t, base.b * t);
    });
  }, [points, color, fade]);

  return (
    <Line
      points={points}
      color={fade ? "white" : color}
      vertexColors={fade ? vertexColors : undefined}
      transparent
      opacity={opacity}
      lineWidth={1}
    />
  );
}
