// Typescript shapes for what the backend sends back.
// Each one mirrors a Pydantic schema in backend/app/schemas.py

export type Satellite = {
    id: number;
    norad_id: number;
    name: string;
};

export type Pass = {
    id: number;
    satellite: Satellite;

    // The full pass, above 10 degrees
    rise_time: string;
    set_time: string;
    rise_azimuth: number;
    set_azimuth: number;

    // The part you can actually see
    appear_time: string;
    fade_time: string;
    appear_azimuth: number;
    fade_azimuth: number;

    // Highest point while visible
    culminate_time: string;
    culminate_azimuth: number;
    max_altitude: number;

    // Lower = brighter. null if the satellite has no magnitude data.
    magnitude: number | null;
};

export type Day = {
    date: string; // "2026-10-30", a calender date in the location's timezone
    passes: Pass[]; // empty = nothing visible that day
}

export type Location = {
    id: number;
    nickname: string;
    latitude: number;
    longitude: number;
    place_name: string | null;
    timezone: string; // IANA name. Ex: "America/Los_Angeles"
    created_at: string;
}

// GET /api/passes
export type PassesResponse = {
    location: Location;
    days: Day[];
};

// GET /api/satellites
export type SatelliteListItem = Satellite & {
    is_followed: boolean; // "&" = everything in Satellite, plus this
};

export type SatelliteListResponse = {
    satellites: SatelliteListItem[];
};

// GET /api/locations
export type LocationListItem = Location & {
    is_active: boolean;
    passes_this_week: number;
};

export type LocationListResponse = {
    locations: LocationListItem[];
};