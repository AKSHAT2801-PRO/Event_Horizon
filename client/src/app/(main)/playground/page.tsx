"use client";

import {
  MeteorData,
  velToward,
} from "@/components/playground/meteor/meteorData";
import { Canvas } from "@react-three/fiber";
import { Stats, OrbitControls, Loader } from "@react-three/drei";
import { GroundProvider } from "@/context/GroundContext";
import Earth from "@/components/playground/earth";
import { Meteor } from "@/components/playground/meteor";
import {
  METEOR_DATA,
  massToColor,
} from "@/components/playground/meteor/meteorData";
import { METEOR_EVENTS } from "@/components/playground/meteor/meteorEvents";
import { Leva, useControls } from "leva";
import { Suspense, useEffect, useState, useCallback } from "react";
import {
  getMeteorTrajectory,
  getRandomMeteorTrajectory,
} from "@/lib/api/meteor";
import { IMeteorTrajectory } from "@/types/api/meteor";
import { useSearchParams } from "next/navigation";
import { Plus, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

const ALT_SCALE = 50;

interface TrackedMeteor {
  uid: string; // local unique key
  eventId: string;
  data: IMeteorTrajectory;
}

export function trajectoryToMeteorData(t: IMeteorTrajectory): MeteorData {
  return {
    id: t._id,
    startLat: t.startLat,
    startLng: t.startLng,
    startAltKm: t.startAltKm * ALT_SCALE, // scale up
    endLat: t.endLat,
    endLng: t.endLng,
    endAltKm: t.endAltKm * ALT_SCALE, // scale up

    ...velToward(
      t.startLat,
      t.startLng,
      t.startAltKm * ALT_SCALE,
      t.endLat,
      t.endLng,
      t.endAltKm * ALT_SCALE,
      t.initial_velocity,
    ),

    m0: t.mass,
  };
}

export default function PlayGround() {
  const { useMockData } = useControls({
    useMockData: true,
  });

  const [meteorData, setMeteorData] = useState<MeteorData[]>([]);
  const [trackedMeteors, setTrackedMeteors] = useState<TrackedMeteor[]>([]);
  const [loadingCount, setLoadingCount] = useState(0); // how many fetches in flight
  const [isListOpen, setIsListOpen] = useState(true);

  const searchParams = useSearchParams();
  const eventId = searchParams.get("event") ?? undefined;
  const hasEventId = !!eventId;

  useEffect(() => {
    const load = async () => {
      // const data = await getMeteorTrajectory(eventId);
      const data = METEOR_DATA;
      if (data) {
        // setMeteorData(data);
      }
    };
    if (useMockData) {
      load();
    }
  }, [useMockData, eventId]);

  const handleAddMeteor = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const traj = await getRandomMeteorTrajectory();

      if (traj) {
        const uid = `${traj._id}-${Date.now()}`;

        setTrackedMeteors((prev) => [
          ...prev,
          {
            uid,
            eventId: traj._id,
            data: traj,
          },
        ]);

        setMeteorData((prev) => [...prev, trajectoryToMeteorData(traj)]);
      }
    } finally {
      setLoadingCount((c) => c - 1);
    }
  }, []);

  const handleRemoveMeteor = useCallback((uid: string) => {
    setTrackedMeteors((prev) => {
      const target = prev.find((m) => m.uid === uid);
      if (target) {
        setMeteorData((d) => d.filter((m) => m.id !== target.data._id));
      }
      return prev.filter((m) => m.uid !== uid);
    });
  }, []);

  const isLoading = loadingCount > 0;

  return (
    <div className="w-screen h-screen bg-black">
      <Loader />
      <Leva collapsed />

      {/* ── Overlay UI (only when no eventId in URL) ── */}
      {!hasEventId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 min-w-64 max-w-sm w-full px-2">
          {/* Add button */}
          <button
            onClick={handleAddMeteor}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium backdrop-blur transition disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            Request Random Meteor
          </button>

          {/* Loading bar */}
          {isLoading && (
            <div className="w-full h-0.5 bg-white/10 rounded overflow-hidden">
              <div className="h-full bg-blue-400 animate-[loading_1s_ease-in-out_infinite]" />
            </div>
          )}

          {/* Collapsible list */}
          {trackedMeteors.length > 0 && (
            <div className="w-full bg-black/60 border border-white/15 rounded-lg backdrop-blur overflow-hidden">
              {/* List header / toggle */}
              <button
                onClick={() => setIsListOpen((o) => !o)}
                className="flex items-center justify-between w-full px-3 py-2 text-white/70 hover:text-white text-xs font-medium transition"
              >
                <span>Active meteors ({trackedMeteors.length})</span>
                {isListOpen ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>

              {/* Items */}
              {isListOpen && (
                <ul className="divide-y divide-white/10 max-h-56 overflow-y-auto">
                  {trackedMeteors.map((m) => (
                    <li
                      key={m.uid}
                      className="flex items-center justify-between px-3 py-2 text-white/80 text-xs"
                    >
                      <span className="font-mono truncate">{m.eventId}</span>
                      <button
                        onClick={() => handleRemoveMeteor(m.uid)}
                        className="ml-2 p-1 rounded hover:bg-white/10 text-white/50 hover:text-red-400 transition shrink-0"
                        title="Remove"
                      >
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <Canvas
        camera={{
          fov: 45,
          position: [100, 50, -70],
          near: 0.1,
          far: 1000000,
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
          <ambientLight intensity={0.05} />
          <directionalLight position={[0, 0, -30]} />
          <OrbitControls
            // maxDistance={300}
            // minDistance={10}
            target={[0, 40, 0]}
          />
          <Suspense fallback={null}>
            <Earth>
              {/* Fixed mock meteors */}
              {/* {meteorData.map(({ id, ...props }) => (
                <Meteor
                  key={id}
                  {...props}
                  color={massToColor(props.m0)}
                  loop
                />
              ))} */}
              {/* Dynamically added meteors */}
              {meteorData.map(({ id, ...props }) => (
                <Meteor
                  key={id}
                  {...props}
                  color={massToColor(props.m0)}
                  loop
                />
              ))}
            </Earth>
          </Suspense>
        </GroundProvider>
      </Canvas>
    </div>
  );
}
