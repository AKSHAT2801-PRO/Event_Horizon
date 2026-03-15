"use client";

import { Canvas } from "@react-three/fiber";
import { Stats, OrbitControls } from "@react-three/drei";
import { GroundProvider } from "@/context/GroundContext";
import Earth from "@/components/playground/earth";
import { Meteor } from "@/components/playground/meteor";
import { METEOR_DATA } from "@/components/playground/meteor/meteorData";
import { Leva, useControls } from "leva";
import { useEffect, useState } from "react";
import { getMeteorTrajectory } from "@/lib/api/meteor";
import { IMeteorTrajectory } from "@/types/api/meteor";

export default function PlayGround() {
  const { useMockData } = useControls({
    useMockData: true,
  });
  const [meteorData, setMeteorData] = useState<IMeteorTrajectory[] | null>(
    null,
  );

  useEffect(() => {
    console.log(process.env.NEXT_PUBLIC_BASE_API_URL);
    const load = async () => {
      const data = await getMeteorTrajectory();
      if (data) {
        setMeteorData([data]);
        console.log(data);
      }
    };
    if (useMockData) {
      load();
    } else {
    }
  }, [useMockData]);

  return (
    <div className="w-screen h-screen">
      <Leva collapsed />
      <Canvas
        camera={{
          fov: 45,
          position: [100, 50, -70],
          near: 0.1,
          far: 1000,
          zoom: 2.5,
        }}
        shadows
      >
        <GroundProvider>
          {process.env.NODE_ENV === "development" && (
            <>
              <Stats />
              <axesHelper args={[10]} />
            </>
          )}
          <ambientLight intensity={0.01} />
          <directionalLight position={[0, 0, -30]} />
          <OrbitControls
            maxDistance={200}
            // minDistance={100}
            target={[0, 40, 0]}
            // maxPolarAngle={Math.PI / 2}
          />
          <Earth animate>
            {METEOR_DATA.map(({ id, ...props }) => (
              <Meteor key={id} {...props} loop />
            ))}
          </Earth>
        </GroundProvider>
      </Canvas>
    </div>
  );
}
