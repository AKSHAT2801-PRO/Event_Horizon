import { IMeteorTrajectory } from "@/types/api/meteor";
import { apiClient } from "../apiClient";
import { MeteorEvent } from "@/data/meteorEvents";

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

interface MeteorEventsProps {
  page?: number;
  searchString?: string;
  filters?: {
    shower: string;
    region: string;
    network: string;
    dateTo?: string;
    dateFrom?: string;
  };
}
export const getMeteorEvents = async ({
  page = 0,
  searchString,
  filters = {
    shower: "All",
    region: "All",
    network: "All",
    dateFrom: "",
    dateTo: "",
  },
}: MeteorEventsProps = {}): Promise<MeteorEvent[] | null> => {
  try {
    const response = await apiClient.get("/event/", {
      params: {
        page,
        searchQuery: searchString,
        ...filters,
      },
    });
    if (response.data) {
      console.log(response.data);
    }
    return (response.data as (MeteorEvent & { _id: string })[]).map(
      (meteorEvent) => ({
        ...meteorEvent,
        date: new Date(meteorEvent.date).toLocaleDateString(undefined, {
          dateStyle: "medium",
        }),
        id: meteorEvent._id,
      }),
    ) as MeteorEvent[];
  } catch (e) {
    console.error(e);
  }
  return null;
};
