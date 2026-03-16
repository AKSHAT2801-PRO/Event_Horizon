/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  MeteorData,
  velToward,
} from "@/components/playground/meteor/meteorData";
import { Canvas, useThree } from "@react-three/fiber";
import { Stats, OrbitControls, Loader } from "@react-three/drei";
import { GroundProvider } from "@/context/GroundContext";
import Earth from "@/components/playground/earth";
import { Meteor } from "@/components/playground/meteor";
import { massToColor } from "@/components/playground/meteor/meteorData";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import {
  getMeteorTrajectory,
  getMeteorTrajectoryByTrajId,
  getRandomMeteorTrajectory,
  MeteorTrajByIdResponse,
  MeteorTrajResponse,
} from "@/lib/api/meteor";
import { IMeteorTrajectory } from "@/types/api/meteor";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  SlidersHorizontal,
  Pause,
  Play,
  Crosshair,
  Globe,
} from "lucide-react";
import { MeteorSimProvider, useMeteorSim } from "@/context/MeteorSimContext";
import * as THREE from "three";
import { AreaChart, Area, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const ALT_SCALE = 50;

interface TrackedMeteor {
  uid: string;
  trajId: string;
  data: IMeteorTrajectory;
}

interface HitInfo {
  trajId: string;
  mass: number;
  color: string;
  screenX: number;
  screenY: number;
}

export function trajectoryToMeteorData(t: IMeteorTrajectory): MeteorData {
  return {
    id: t._id,
    startLat: t.startLat,
    startLng: t.startLng,
    startAltKm: t.startAltKm * ALT_SCALE,
    endLat: t.endLat,
    endLng: t.endLng,
    endAltKm: t.endAltKm * ALT_SCALE,
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

// ─── Slider ──────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  onReset: () => void;
  action?: React.ReactNode;
}

function SimSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  onReset,
  action,
}: SliderProps) {
  const display = format ? format(value) : value.toFixed(2);
  const pct = Math.min(((value - min) / (max - min)) * 100, 100);
  const isDefault = value === 1;

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60 font-mono">{label}</span>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="text-[10px] text-blue-400/70 hover:text-blue-400 font-mono transition"
            >
              reset
            </button>
          )}
          {action}
          <span className="text-xs text-white font-mono tabular-nums w-10 text-right">
            {display}
          </span>
        </div>
      </div>

      <div className="relative h-1.5 w-full rounded-full bg-white/10">
        <div
          className="absolute h-full rounded-full bg-blue-400/80 transition-[width]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(value, max)}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex justify-between text-[10px] text-white/20 font-mono">
        <span>{min}×</span>
        <span>{value > max ? `${value.toFixed(1)}×` : `${max}×`}</span>
      </div>
    </div>
  );
}

// ─── Raycaster (inside Canvas) ───────────────────────────────────────────────

interface RaycasterProps {
  meteorData: MeteorData[];
  trackedMeteors: TrackedMeteor[];
  onHit: (info: HitInfo | null) => void;
}

function SceneRaycaster({ meteorData, trackedMeteors, onHit }: RaycasterProps) {
  const { camera, scene, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    const canvas = gl.domElement;

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      // Collect all sphere meshes tagged as meteors
      const targets: THREE.Object3D[] = [];
      scene.traverse((obj) => {
        if ((obj as any).userData?.isMeteor) targets.push(obj);
      });

      const hits = raycaster.current.intersectObjects(targets, true);

      if (hits.length > 0) {
        const hit = hits[0];
        const userData = (hit.object as any).userData;
        onHit({
          trajId: userData.meteorId ?? "unknown",
          mass: userData.mass ?? 0,
          color: userData.color ?? "#ffffff",
          screenX: e.clientX,
          screenY: e.clientY,
        });
      } else {
        onHit(null);
      }
    };

    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [camera, scene, gl, onHit]);

  return null;
}

const chartConfig = {
  v: { label: "Velocity", color: "rgba(96,165,250,0.8)" },
} satisfies ChartConfig;

// ─── Hit info tooltip ─────────────────────────────────────────────────────────
function HitTooltip({
  hit,
  onClose,
  trajectoryId,
}: {
  hit: HitInfo;
  onClose: () => void;
  trajectoryId?: string;
}) {
  const [state, setState] = useState<{
    data: MeteorTrajByIdResponse | null;
    loading: boolean;
  }>({ data: null, loading: true });

  const { data, loading } = state;

  useEffect(() => {
    let cancelled = false;

    console.log(hit.trajId);
    console.log(trajectoryId);
    const fetchId = trajectoryId ?? hit.trajId;
    getMeteorTrajectoryByTrajId(fetchId).then((data) => {
      if (!cancelled) setState({ data, loading: false });
    });

    return () => {
      cancelled = true;
    };
  }, [hit.trajId, trajectoryId]);

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{ left: hit.screenX + 12, top: hit.screenY - 8 }}
    >
      <div className="pointer-events-auto bg-black/80 border border-white/20 rounded-lg px-3 py-2.5 backdrop-blur min-w-44 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[10px] text-white/50 font-mono">meteor</span>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/80 transition"
          >
            <X size={11} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 size={14} className="animate-spin text-white/40" />
          </div>
        ) : !data ? (
          <span className="text-[10px] text-red-400 font-mono">not found</span>
        ) : (
          <div className="space-y-1">
            <Row label="id" value={`${data.event_id}`} />
            <Row label="mass" value={`${data.mass.toExponential(2)} kg`} />
            <Row
              label="velocity"
              value={`${data.initial_velocity.toFixed(2)} km/s`}
            />
            <Row label="lat" value={`${data.startLat.toFixed(2)}°`} />
            <Row label="lng" value={`${data.startLng.toFixed(2)}°`} />
            <Row label="alt" value={`${data.startAltKm.toFixed(1)} km`} />
            <div className="mt-2 border-t border-white/10 pt-2">
              <span className="text-[10px] text-white/40 font-mono">
                velocity time curve
              </span>
              <ChartContainer
                config={chartConfig}
                className="h-16 w-full mt-1 aspect-auto"
              >
                <AreaChart
                  data={data.velocity_curve}
                  margin={{ top: 2, right: 2, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgba(96,165,250,0.3)" />
                      <stop offset="95%" stopColor="rgba(96,165,250,0)" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(v) => [
                          `${Number(v).toFixed(2)} km/s`,
                          "velocity",
                        ]}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="rgba(96,165,250,0.8)"
                    strokeWidth={1.5}
                    fill="url(#vGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[10px] text-white/40 font-mono">{label}</span>
      <span className="text-[10px] text-white font-mono truncate max-w-28">
        {value}
      </span>
    </div>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

function PlayGroundInner() {
  const {
    timeScale,
    sizeScale,
    paused,
    setTimeScale,
    setSizeScale,
    togglePause,
  } = useMeteorSim();

  const [meteorData, setMeteorData] = useState<MeteorData[]>([]);
  const [trackedMeteors, setTrackedMeteors] = useState<TrackedMeteor[]>([]);
  const [loadingCount, setLoadingCount] = useState(0);
  const [isListOpen, setIsListOpen] = useState(true);
  const [isSimOpen, setIsSimOpen] = useState(true);
  const [hitInfo, setHitInfo] = useState<HitInfo | null>(null);
  const [animateEarth, setAnimateEarth] = useState(true);
  const [currentTrajectory, setCurrentTrajectory] =
    useState<MeteorTrajResponse | null>(null);

  const searchParams = useSearchParams();
  const eventId = searchParams.get("event") ?? undefined;
  const hasEventId = !!eventId;

  useEffect(() => {
    const load = async () => {
      if (hasEventId) {
        const data = await getMeteorTrajectory(eventId);
        setCurrentTrajectory(data);
        if (data)
          setMeteorData((prev) => [...prev, trajectoryToMeteorData(data)]);
      } else {
        setCurrentTrajectory(null);
      }
    };
    load();
  }, [eventId, hasEventId]);

  const handleAddMeteor = useCallback(async () => {
    setLoadingCount((c) => c + 1);
    try {
      const traj = await getRandomMeteorTrajectory();
      if (traj) {
        const uid = `${traj._id}-${Date.now()}`;
        setTrackedMeteors((prev) => [
          ...prev,
          { uid, trajId: traj._id, data: traj },
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
      if (target)
        setMeteorData((d) => d.filter((m) => m.id !== target.data._id));
      return prev.filter((m) => m.uid !== uid);
    });
  }, []);

  const handleHit = useCallback((info: HitInfo | null) => {
    setHitInfo(info);
  }, []);

  const isLoading = loadingCount > 0;
  const simIsDefault = timeScale === 1 && sizeScale === 1;

  return (
    <div className="w-screen h-screen bg-black">
      <Loader />

      {/* ── Hit tooltip ── */}
      {hitInfo && (
        <HitTooltip
          hit={hitInfo}
          onClose={() => setHitInfo(null)}
          trajectoryId={currentTrajectory?.traj_id}
        />
      )}

      {/* ── Overlay UI ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 min-w-64 max-w-sm w-full px-2">
        {/* Controls only when no eventId */}
        {!hasEventId && (
          <>
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

            {isLoading && (
              <div className="w-full h-0.5 bg-white/10 rounded overflow-hidden">
                <div className="h-full bg-blue-400 animate-[loading_1s_ease-in-out_infinite]" />
              </div>
            )}

            {trackedMeteors.length > 0 && (
              <div className="w-full bg-black/60 border border-white/15 rounded-lg backdrop-blur overflow-hidden">
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

                {isListOpen && (
                  <ul className="divide-y divide-white/10 max-h-56 overflow-y-auto">
                    {trackedMeteors.map((m) => (
                      <li
                        key={m.uid}
                        className="flex items-center justify-between px-3 py-2 text-white/80 text-xs"
                      >
                        <span className="font-mono truncate">{m.trajId}</span>
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
          </>
        )}

        {/* ── Sim controls — always visible ── */}
        <div className="w-full bg-black/60 border border-white/15 rounded-lg backdrop-blur overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setIsSimOpen((o) => !o)}
            className="flex items-center justify-between w-full px-3 py-2 text-white/70 hover:text-white text-xs font-medium transition group"
          >
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal
                size={12}
                className="opacity-50 group-hover:opacity-100 transition"
              />
              <span>Simulation</span>
              {paused && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono">
                  paused
                </span>
              )}
              {!paused && !simIsDefault && !isSimOpen && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-mono">
                  modified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Pause/Resume button */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  togglePause();
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition ${
                  paused
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                    : "bg-white/5 border-white/10 text-white/50 hover:text-white/90 hover:bg-white/10"
                }`}
                title={paused ? "Resume" : "Pause"}
              >
                {paused ? <Play size={10} /> : <Pause size={10} />}
                {paused ? "resume" : "pause"}
              </div>

              {!simIsDefault && isSimOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTimeScale(1);
                    setSizeScale(1);
                  }}
                  className="text-[10px] text-white/30 hover:text-blue-400 font-mono transition"
                >
                  reset all
                </button>
              )}
              {isSimOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </div>
          </button>

          {isSimOpen && (
            <div className="border-t border-white/10 divide-y divide-white/5">
              <SimSlider
                label="Time Scale"
                value={timeScale}
                min={0.1}
                max={2}
                step={0.1}
                format={(v) => `${v.toFixed(1)}×`}
                onChange={setTimeScale}
                onReset={() => setTimeScale(1)}
                action={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTimeScale(parseFloat((timeScale * 0.5).toFixed(2)));
                    }}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/90 text-[10px] font-mono transition"
                    title="Half speed"
                  >
                    ×0.5
                  </button>
                }
              />
              <SimSlider
                label="Size Scale"
                value={sizeScale}
                min={0.1}
                max={50}
                step={0.1}
                format={(v) => `${v.toFixed(1)}×`}
                onChange={setSizeScale}
                onReset={() => setSizeScale(1)}
                action={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSizeScale(parseFloat((sizeScale + 10).toFixed(1)));
                    }}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/90 text-[10px] font-mono transition"
                    title="+10 size"
                  >
                    +10
                  </button>
                }
              />
              <div className="w-full flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnimateEarth((a) => !a);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition ${
                    !animateEarth
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white/90 hover:bg-white/10"
                  }`}
                >
                  <Globe size={10} />
                  {!animateEarth ? "rotate earth" : "stop rotate earth"}
                </button>
              </div>

              {/* Raycast hint */}
              <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-white/25 font-mono">
                <Crosshair size={10} />
                click a meteor to inspect
              </div>
            </div>
          )}
        </div>
      </div>

      <Canvas
        camera={{
          fov: 45,
          position: [100, 50, -70],
          near: 0.1,
          far: 10000,
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
            minDistance={100}
            maxDistance={700}
            target={[0, 40, 0]}
          />
          <Suspense fallback={null}>
            <Earth animate={!paused && animateEarth}>
              {meteorData.map(({ id, ...props }) => (
                <Meteor
                  id={id}
                  key={id}
                  {...props}
                  color={massToColor(props.m0)}
                  loop
                />
              ))}
            </Earth>
          </Suspense>

          {/* Raycaster lives inside Canvas to access camera/scene */}
          <SceneRaycaster
            meteorData={meteorData}
            trackedMeteors={trackedMeteors}
            onHit={handleHit}
          />
        </GroundProvider>
      </Canvas>
    </div>
  );
}

export default function PlayGround() {
  return (
    <MeteorSimProvider>
      <PlayGroundInner />
    </MeteorSimProvider>
  );
}
