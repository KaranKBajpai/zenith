// Small helpers that turn raw API data into what the screens show.

// "2026-10-30T05:05:39Z" in "America/Denver" -> "11:05pm"
export function formatTime(iso: string, timeZone: string): string {
    const text = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone,
    }).format(new Date(iso));

    return text.replace(" ", "").toLowerCase();
}

// "America/Denver" -> "MDT" (or "MST" in winter).
export function timeZoneAbbreviation(timeZone: string, at: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "short",
    }).formatToParts(at);

    // formatToParts splits the output into labelled pieces.
    // Only timeZoneName is needed.
    const zone = parts.find((part) => part.type === "timeZoneName");
    return zone ? zone.value : timeZone;
}

// 0 = North, 90 = east, ... -> one of 16 compass points
const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export function compassDirection(degrees: number): string {
    // 360 degrees / 16 points = 22.5 degrees per point
    // % 16 wraps 360 back to "N".
    const index = Math.round(degrees / 22.5) % 16;
    return COMPASS_POINTS[index];
}

export function durationMinutes(startIso: string, endIso: string): number {
    const milliseconds = Date.parse(endIso) - Date.parse(startIso);
    return Math.round(milliseconds / 60_000);
}

// Brightness -> label. Lower magnitude = brighter.
export function qualityLabel(magnitude: number | null): string | null {
    if (magnitude === null) {
        return null; // No data. The screen shows no label
    }
    if (magnitude <= -2.0) {
        return "Excellent";
    }
    if (magnitude <= 0.0) {
        return "Good";
    }
    return "Fair";
}

// "2026-10-30" -> { weekday: "Friday", monthDay: "Oct 30" }
export function formatDayHeading(dateString: string): { weekday: string; monthDay: string } {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    const weekday = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "UTC",
    }).format(date);

    const monthDay = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    }).format(date);

    return { weekday, monthDay };
}

// Today's date in a timezone, as "YYYY-MM-DD", to match Day.date.
// "en-CA" (Canadian English) happens to format dates as YYYY-MM-DD.
export function todayIn(timeZone: string): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

// "In 9h 10m" style countdown to an ISO time. Returns "Now" if it has started
export function timeUntil (iso: string): string {
    const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000);
    if (minutes <= 0) {
        return "now";
    }
    const hours = Math.floor(minutes / 60);
    if (hours >= 24) {
        return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    }
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

// 45.52, -122.68 -> "45.5200° N, 122.6800° W"
export function formatCoordinates(latitude: number, longitude: number): string {
    const northSouth = latitude >= 0 ? "N" : "S";
    const eastWest = longitude >= 0 ? "E" : "W";
    return `${Math.abs(latitude).toFixed(4)}° ${northSouth}, ${Math.abs(longitude).toFixed(4)}° ${eastWest}`;
}

export function plural(count: number, word: string): string {
    if (count === 1) {
        return `${count} ${word}`;
    }
    return `${count} ${word}${word.endsWith("s") ? "es" : "s"}`;
}

// "2026-11-04T04:50:00Z" in "America/Los_Angeles" -> "Tue"
// No date trap here: this is a full moment in time, so showing it in the
// location's timezone gives the right day.
export function formatWeekdayShort(iso: string, timeZone: string): string {
    return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(
        new Date(iso)
    );
}