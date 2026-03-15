import { IMeteorTrajectory } from "@/types/api/meteor";
import { apiClient } from "../apiClient";
import { MeteorEvent } from "@/data/meteorEvents";

export const getMeteorTrajectory = async (
  id?: string,
): Promise<IMeteorTrajectory | null> => {
  try {
    const response = await apiClient.get("/trajectory", {
      params: {
        ...(id && { event_id: id }),
      },
    });

    console.log(response.data);
    return response.data as IMeteorTrajectory;
  } catch (e) {
    console.error(e);
  }

  return null;
};

export const getRandomMeteorTrajectory =
  async (): Promise<IMeteorTrajectory | null> => {
    try {
      const response = await apiClient.get("/trajectory/random");

      console.log(response.data);
      return {
        ...response.data,
        _id: response.data.traj_id,
      } as IMeteorTrajectory;
    } catch (e) {
      console.error(e);
    }

    return null;
  };

export const getEventRegions = async (): Promise<string[] | null> => {
  try {
    const response = await apiClient.get("/event/regions");

    console.log(response.data);
    return response.data as string[];
  } catch (e) {
    console.error(e);
  }

  return null;
};

export const getEventShowers = async (): Promise<string[] | null> => {
  try {
    const response = await apiClient.get("/event/showers");

    console.log(response.data);
    return response.data as string[];
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
    dateTo?: string;
    dateFrom?: string;
  };
}
export const getMeteorEvents = async ({
  page = 1,
  searchString,
  filters = {
    shower: "All",
    region: "All",
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
      }),
    ) as MeteorEvent[];
  } catch (e) {
    console.error(e);
  }
  return null;
};
