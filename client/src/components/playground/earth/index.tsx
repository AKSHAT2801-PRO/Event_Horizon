import { Gltf } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Markers, MarkerData } from "./markers";
import { EarthContext } from "@/context/EarthContext";
import { useFrame } from "@react-three/fiber";

const EARTH_TILT = ((-23.4 * Math.PI) / 180) * 2;

const DEFAULT_MARKERS: MarkerData[] = [
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Sri Lanka", lat: 8.036409, lng: 80.575488 },
];

interface EarthProps {
  markers?: MarkerData[];
  animate?: boolean;
  children?: React.ReactNode;
}

export default function Earth({
  markers = DEFAULT_MARKERS,
  animate,
  children,
}: EarthProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupRef = useRef<any>(null);
  const [earthRadius, setEarthRadius] = useState<number>(0);

  useEffect(() => {
    if (ref.current) {
      const box = new THREE.Box3().setFromObject(ref.current);
      const size = box.getSize(new THREE.Vector3());
      setEarthRadius(size.x / 2);
      console.log("Earth radius:", size.x / 2);
    }
  }, []);

  useFrame((_, delta) => {
    if (animate && ref.current) {
      const speed = 0.05; // radians per second
      groupRef.current.rotation.y += speed * delta;
    }
  });

  return (
    <EarthContext value={{ ref, radius: earthRadius }}>
      <group ref={groupRef} rotation={[EARTH_TILT, 0, 0]}>
        <Gltf ref={ref} src="/assets/playground/models/earth.glb" />
        <Markers markers={markers} />
        {/* Only render children once radius is known */}
        {earthRadius > 0 && children}
      </group>
    </EarthContext>
  );
}
