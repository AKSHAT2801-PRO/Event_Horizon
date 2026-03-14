import React, { createContext, useContext, RefObject } from "react";
import * as THREE from "three";

interface IEarthContext {
  ref: RefObject<THREE.Mesh | null>;
  radius: number;
}

export const EarthContext = createContext<IEarthContext | null>(null);

export function useEarthContext() {
  const earthContext = useContext(EarthContext);
  if (!earthContext) {
    throw new Error(
      "useEarthContext must be used inside EarthContext.Provider",
    );
  }
  return earthContext;
}
