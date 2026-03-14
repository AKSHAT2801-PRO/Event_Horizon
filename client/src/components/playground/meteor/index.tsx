import { MeteorPath } from "./meteorPath";
import { MeteorBody } from "./meteorBody";
import { MeteorPathInput } from "./useMeteorPath";

export interface MeteorProps extends MeteorPathInput {
  color?: string;
  showPath?: boolean;
  speedMultiplier?: number;
  /**
   * loop=false (default) — meteor travels start→end once at its real velocity, then stops.
   * loop=true            — repeats continuously (useful for demos).
   */
  loop?: boolean;
}

export function Meteor({
  color = "#ff6a00",
  showPath = true,
  speedMultiplier = 1,
  loop = false,
  ...pathInput
}: MeteorProps) {
  return (
    <group>
      {showPath && (
        <MeteorPath {...pathInput} color={color} fade opacity={0.4} />
      )}
      <MeteorBody
        {...pathInput}
        color={color}
        speedMultiplier={speedMultiplier}
        loop={loop}
      />
    </group>
  );
}
