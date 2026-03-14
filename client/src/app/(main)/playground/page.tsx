"use client";

import { Canvas } from "@react-three/fiber";
import { Stats, OrbitControls } from "@react-three/drei";
import { GroundProvider } from "@/context/GroundContext";
import Earth from "@/components/playground/earth";
import { Meteor } from "@/components/playground/meteor";
import { METEOR_DATA } from "@/components/playground/meteor/meteorData";

export default function PlayGround() {
  return (
    <div className="w-screen h-screen">
      <Canvas
        camera={{
          fov: 45,
          position: [100, 50, 10],
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
          <directionalLight position={[0, 20, -30]} />
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
