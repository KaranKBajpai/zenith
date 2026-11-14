import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { apiGet, errorText } from "./api";
import type { PassDetailResponse } from "./types";
import {
    compassDirection,
    compassName,
    dayWord,
    durationMinutes,
    formatCoordinates,
    formatTime,
    plural,
    qualityLabel,
    timeAgo,
    timeUntil,
    timeZoneAbbreviation,
} from "./format";
import "./PassDetail.css";

// How high it gets, in words, for the "Go outside at..." sentence.
function heightPhrase(maxAltitude: number): string {
    if (maxAltitude >= 60) return "climbs high overhead";
    if (maxAltitude >= 35) return "climbs partway up the sky";
    return "stays low in the sky";
}

function PassDetail () {
    // Reads ":id" from the URL. /passes/42 -> { id: "42" } (always text).
    const { id } = useParams();
    const [data, setData] = useState<PassDetailResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // [id], not []: tapping a pass under "Also this week" changes the URL
    // but keeps this same page on screen, so we must refetch when id changes.
    useEffect(() => {
        setData(null); // show "Loading…" instead of the old pass
        setError(null);
        window.scrollTo(0, 0); // the browser won't do this for us
        apiGet<PassDetailResponse>(`/api/passes/${id}`)
            .then(setData)
            .catch((err) => setError(errorText(err)));
    }, [id]);

    if (error) {
        return (
            <main className="page">
                <Link to="/" className="back-link">← Your week</Link>
                <p className="message">Couldn't load this pass: {error}</p>
            </main>
        );
    }

    if (data === null) {
        return (
            <main className="page">
                <p className="message">Loading pass…</p>
            </main>
        );
    }

    const { pass_info: pass, location, computed_at, also_this_week } = data;
    const tz = location.timezone;

    const zone = timeZoneAbbreviation(tz, new Date(pass.appear_time));
    const appearClock = formatTime(pass.appear_time, tz);
    const fadeClock = formatTime(pass.fade_time, tz);
    const minutes = durationMinutes(pass.appear_time, pass.fade_time);

   // One decimal for the chip: 6.4 min
    const exactMinutes = (
        (Date.parse(pass.fade_time) - Date.parse(pass.appear_time)) / 60_000
    ).toFixed(1);
    const peak = Math.round(pass.max_altitude);
    const quality = qualityLabel(pass.magnitude);

    // Before, during, or after the pass.
    const now = Date.now();
    let status: string;
    if (Date.parse(pass.fade_time) < now) {
        status = "This pass is over";
    } else if (Date.parse(pass.appear_time) <= now) {
        status = "Up now";
    } else {
        status = `In ${timeUntil(pass.appear_time)}`;
    }

    // Faded more than 30 s before dropping below 10°? Then it went into
    // Earth's shadow mid-sky instead of sinking to the horizon.
    const fadesMidSky = Date.parse(pass.fade_time) < Date.parse(pass.set_time) - 30_000;

    // Same rule as Home: only mention the clock if it differs from the device's.
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const showTzNote = deviceTz !== tz;

    return (
        <main className="page">
            <div className="detail-top">
                <Link to="/" className="back-link">← Your week</Link>
                <span className="detail-tag">Satellite pass</span>
            </div>

            <div className="detail-title-row">
                <h1 className="detail-title">{pass.satellite.name}</h1>
                {quality && <span className="detail-badge">{quality}</span>}
            </div>
            <p className="detail-when">
                {dayWord(pass.appear_time, tz)} · {appearClock} to {fadeClock} {zone}
            </p>
            <p className="detail-status">• {status}</p>

            <p className="detail-lead">
                Go outside at {appearClock} and face {compassName(pass.appear_azimuth)}.{" "}
                {pass.satellite.name} {heightPhrase(pass.max_altitude)} and crosses to the{" "}
                {compassName(pass.fade_azimuth)} over about {plural(minutes, "minute")}.
            </p>

            {showTzNote && (
                <p className="detail-tz-note">
                    That's {zone}, the clock where you'll be standing, not your device's{" "}
                    {timeZoneAbbreviation(deviceTz)}.
                </p>
            )}

            {/* The pass card */}
            <section className="detail-card">
                <div className="detail-card-head">
                    <span className="section-title">The pass</span>
                    <span>
                        {appearClock} – {fadeClock} {zone} · {minutes} min visible
                    </span>
                </div>
                <div className="detail-cols">
                    <div className="detail-col">
                        <span className="detail-col-label">Appears</span>
                        <span className="detail-col-time">{appearClock}</span>
                        <span className="detail-col-sub">{compassDirection(pass.appear_azimuth)}</span>
                    </div>
                    <div className="detail-col peak">
                        <span className="detail-col-label">Peak</span>
                        <span className="detail-col-time">{formatTime(pass.culminate_time, tz)}</span>
                        <span className="detail-col-sub">
                            {compassDirection(pass.culminate_azimuth)} {peak}°
                        </span>
                    </div>
                    <div className="detail-col">
                        <span className="detail-col-label">Fades</span>
                        <span className="detail-col-time">{fadeClock}</span>
                        <span className="detail-col-sub">{compassDirection(pass.fade_azimuth)}</span>
                    </div>
                </div>
                <div className="detail-chips">
                    <span className="detail-chip">{exactMinutes} min</span>
                    {pass.magnitude !== null && (
                        <span className="detail-chip">mag {pass.magnitude.toFixed(1)}</span>
                    )}
                    <span className="detail-chip">peak {peak}°</span>
                </div>
            </section>

            {/* How to watch it */}
            <div className="section-heading">
                <span className="section-title">How to watch it</span>
            </div>
            <ol className="detail-steps">
                <li>
                    Get somewhere with a clear view toward the {compassName(pass.appear_azimuth)}.
                    Buildings and trees low on the horizon can hide the start of the pass.
                </li>
                <li>
                    Be outside two or three minutes early and let your eyes adjust. Don't look at
                    your phone once you're set.
                </li>
                <li>
                    Watch for a steady white dot moving as fast as a plane, with no blinking
                    lights.{" "}
                    {pass.max_altitude >= 60
                        ? "At its peak it passes almost straight over you."
                        : `At its peak it's ${peak}° up, toward the ${compassName(pass.culminate_azimuth)}.`}
                </li>
                <li>
                    {fadesMidSky
                        ? "It fades rather than sets: once it flies into Earth's shadow, sunlight stops reflecting off it and it vanishes mid-sky."
                        : `It sinks toward the ${compassName(pass.fade_azimuth)} horizon and drops out of view.`}
                </li>
            </ol>

            {/* Where you're watching from */}
            <section className="detail-section">
                <div className="section-heading">
                    <span className="section-title">Where you're watching from</span>
                </div>
                <p className="detail-place">{location.nickname}</p>
                <p className="location-meta">
                    {formatCoordinates(location.latitude, location.longitude)} · {zone}
                </p>
                <p className="detail-small">
                    Worked out {timeAgo(computed_at)} from the latest orbit data. Times can shift
                    by a second or two as fresher data arrives.
                </p>
            </section>

            {/* Also this week */}
            {also_this_week.length > 0 && (
                <section className="detail-section">
                    <div className="section-heading">
                        <span className="section-title">Also this week</span>
                    </div>
                    {also_this_week.map((other) => {
                        const otherQuality = qualityLabel(other.magnitude);
                        return (
                            <Link key={other.id} to={`/passes/${other.id}`} className="other-pass">
                                <span className="other-main">
                                    <span className="pass-name">{other.satellite.name}</span>
                                    <span className="other-sub">
                                        {otherQuality && `${otherQuality} · `}peaks{" "}
                                        {Math.round(other.max_altitude)}°{" "}
                                        {compassDirection(other.culminate_azimuth)}
                                    </span>
                                </span>
                                <span className="other-time">
                                    <span className="pass-clock">{formatTime(other.appear_time, tz)}</span>
                                    <span className="other-sub">{dayWord(other.appear_time, tz)}</span>
                                </span>
                                <span className="other-chevron">›</span>
                            </Link>
                        );
                    })}
                </section>
            )}
        </main>
    );
}

export default PassDetail;