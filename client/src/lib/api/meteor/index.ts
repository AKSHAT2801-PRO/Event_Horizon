import { IMeteorTrajectory } from "@/types/api/meteor";
import { apiClient } from "../apiClient";

export const getMeteorTrajectory = async (
  id = "EVT_20250314_001",
): Promise<IMeteorTrajectory | null> => {
  try {
    const response = await apiClient.get("/meteor/trajectory", {
      params: {
        event_id: id,
      },
    });
    return response.data as IMeteorTrajectory;
  } catch (e) {
    console.error(e);
  }
  return null;
};
