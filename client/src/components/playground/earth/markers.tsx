import { useEarthContext } from "@/context/EarthContext";
import * as THREE from "three";

const SURFACE_OFFSET = 1.01;
const LNG_OFFSET = 90;

export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = ((lng + LNG_OFFSET) * Math.PI) / 180;
  const r = radius * SURFACE_OFFSET;
  return new THREE.Vector3(
    r * Math.cos(latRad) * Math.sin(lngRad),
    r * Math.sin(latRad),
    r * Math.cos(latRad) * Math.cos(lngRad),
  );
}

export interface MarkerData {
  name: string;
  lat: number;
  lng: number;
  color?: string;
  size?: number;
}

interface MarkersProps {
  markers: MarkerData[];
}

export function Markers({ markers }: MarkersProps) {
  const { radius } = useEarthContext();
  return (
    <>
      {markers.map(({ name, lat, lng, color = "red", size = 0.5 }) => {
        const pos = latLngToVector3(lat, lng, radius);
        return (
          <mesh key={name} position={pos}>
            <sphereGeometry args={[size, 8, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}
    </>
  );
}
