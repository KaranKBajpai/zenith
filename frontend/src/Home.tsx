import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiGet } from "./api";
import type { PassesResponse, SatelliteListResponse } from "./types";
import {
    compassDirection,
    formatCoordinates,
    formatDayHeading,
    plural,
    timeUntil,
    timeZoneAbbreviation,
    todayIn,
} from "./format";
import PassCard from "./PassCard";
import "./Home.css";

function Home() {
    const [passes, setPasses] = useState<PassesResponse | null>(null);
    const [followedCount, setFollowedCount] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Runs once when the page appears. Promise.all fires both requests
    // at the same time and waits until BOTH come back.
    useEffect(() => {
        Promise.all([
            apiGet<PassesResponse>("/api/passes"),
            apiGet<SatelliteListResponse>("/api/satellites"),
        ])
            .then(([passesData, satellitesData]) => {
                setPasses(passesData);
                setFollowedCount(
                    satellitesData.satellites.filter((s) => s.is_followed).length
                );
            })
            .catch((err) => setError(String(err)));
    }, []);

    if (error) {
        return (
            <main className="page">
                <p className="message">Couldn't load passes: {error}</p>
            </main>
        );
    }

    if (passes === null) {
        return (
            <main className="page">
                <p className="message">Loading passes…</p>
            </main>
        );
    }

    const { location, days } = passes;
    const tz = location.timezone;

    // Every pass this week in one list. The backend already sorted
    // them earliest first, so [0] is the next one.
    const allPasses = days.flatMap((day) => day.passes);
    const nextPass = allPasses[0];
    const daysWithPasses = days.filter((day) => day.passes.length > 0).length;

    const today = todayIn(tz);
    // ?. = "if a day for today exists", ?? 0 = "otherwise use 0"
    const passesToday = days.find((day) => day.date === today)?.passes.length ?? 0;

    // Only show the timezone banner when the location's clock differs
    // from this device's clock.
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const showTimezoneBanner = deviceTz !== tz;

    return (
        <main className="page">
            {/* The header is the way into Saved Locations */}
            <Link to="/locations" className="location-link">
                <p className="eyebrow">Saved place</p>
                <h1 className="location-name">{location.nickname}</h1>
            </Link>
            <p className="location-meta">
                {formatCoordinates(location.latitude, location.longitude)} ·{" "}
                {timeZoneAbbreviation(tz)}
            </p>

            {/* Summary sentence */}
            <p className="summary">
                {plural(passesToday, "pass")} visible today · {daysWithPasses} of the
                next 7 days have something.
            </p>

            {/* The very next pass, if there is one */}
            {nextPass ? (
                <p className="next-pass">
                    • {nextPass.satellite.name}{" "}
                    {timeUntil(nextPass.appear_time) === "now"
                        ? "is up now"
                        : `in ${timeUntil(nextPass.appear_time)}`}{" "}
                    · look {compassDirection(nextPass.appear_azimuth)}, peaking{" "}
                    {Math.round(nextPass.max_altitude)}°{" "}
                    {compassDirection(nextPass.culminate_azimuth)}
                </p>
            ) : (
                <p className="next-pass">No visible passes in the next 7 days.</p>
            )}

            {showTimezoneBanner && (
                <div className="tz-banner">
                    All times below are local to {location.nickname}, not your
                    device's time.
                </div>
            )}

            {/* The week */}
            <div className="section-heading">
                <span className="section-title">Next 7 days</span>
                <span>
                    {plural(allPasses.length, "pass")} · {plural(daysWithPasses, "day")}
                </span>
            </div>

            {days.map((day) => {
                const { weekday, monthDay } = formatDayHeading(day.date);
                const isToday = day.date === today;

                return (
                    <section key={day.date} className="day">
                        <div className="day-heading">
                            <span>
                                <span className={isToday ? "day-name today" : "day-name"}>
                                    {isToday ? "Today" : weekday}
                                </span>
                                {monthDay}
                            </span>
                            {day.passes.length > 0 && (
                                <span>{plural(day.passes.length, "pass")}</span>
                            )}
                        </div>

                        {day.passes.length === 0 ? (
                            <p className="empty">Nothing visible this night.</p>
                        ) : (
                            day.passes.map((p) => (
                                <PassCard key={p.id} pass={p} timeZone={tz} />
                            ))
                        )}
                    </section>
                );
            })}

            {/* Footer: how many satellites you follow */}
            {followedCount !== null && (
                <div className="footer">
                    <span>Following {plural(followedCount, "satellite")}</span>
                    <Link to="/satellites" className="footer-link">
                        Manage satellites
                    </Link>
                </div>
            )}
        </main>
    );
}

export default Home;