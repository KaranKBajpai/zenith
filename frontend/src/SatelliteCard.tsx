import { useState } from "react";
import type { Pass, Satellite } from "./types";
import {
    compassDirection,
    durationMinutes,
    formatTime,
    formatWeekdayShort,
    plural,
    qualityLabel,
} from "./format";

type SatelliteCardProps = {
    satellite: Satellite;
    passes: Pass[]; // only THIS satellite's passes, earliest first
    timeZone: string;
    busy: boolean; // true while an unfollow request is running
    onUnfollow: () => void; // asks the page to unfollow this satellite
};

function SatelliteCard({ satellite, passes, timeZone, busy, onUnfollow }: SatelliteCardProps) {
    // Each card remembers on its own whether it's open.
    const [expanded, setExpanded] = useState(false);

    const nextPass = passes[0];

    // Highest point across this week's passes. "..." spreads the list into
    // separate values: Math.max(77, 60, 43), not Math.max([77, 60, 43]).
    const bestHeight =
        passes.length > 0 ? Math.max(...passes.map((p) => p.max_altitude)) : null;

    // Brightest = LOWEST magnitude. Skip passes with no magnitude data.
    const magnitudes = passes.map((p) => p.magnitude).filter((m) => m !== null);
    const brightest = magnitudes.length > 0 ? Math.min(...magnitudes) : null;
    const quality = qualityLabel(brightest);

    return (
        <article className="sat-card">
            {/* The top of the card is a button: click to open or close */}
            <button type="button" className="sat-head" onClick={() => setExpanded(!expanded)}>
                <div>
                    <div className="pass-title">
                        <span className="pass-name">{satellite.name}</span>
                        <span className="pass-tag">Satellite</span>
                    </div>
                    <div className="pass-details">
                        {nextPass
                            ? `${formatWeekdayShort(nextPass.appear_time, timeZone)} at ${formatTime(
                                  nextPass.appear_time,
                                  timeZone
                              )} · appears ${compassDirection(nextPass.appear_azimuth)}`
                            : "No visible passes this week"}
                    </div>
                </div>
                <span className="chevron">{expanded ? "▴" : "▾"}</span>
            </button>

            {/* The three stats */}
            <div className="sat-stats">
                <div>
                    <div className="stat-label">This week</div>
                    <div>{plural(passes.length, "pass")}</div>
                </div>
                <div>
                    <div className="stat-label">Best height</div>
                    <div>
                        {bestHeight === null ? "-" : `${Math.round(bestHeight)}°`}
                        {quality && ` · ${quality}`}
                    </div>
                </div>
                <div>
                    <div className="stat-label">Brightness</div>
                    <div>{brightest === null ? "-" : `mag ${brightest.toFixed(1)}`}</div>
                </div>
            </div>

            {/* Only drawn when the card is open */}
            {expanded && (
                <div className="sat-expanded">
                    <div className="stat-label">Passes this week</div>

                    {passes.length === 0 ? (
                        <p className="message">None visible from here this week.</p>
                    ) : (
                        passes.map((p) => (
                            <div key={p.id} className="pass-row">
                                <span className="pass-row-day">
                                    {formatWeekdayShort(p.appear_time, timeZone)}
                                </span>
                                <span>
                                    {formatTime(p.appear_time, timeZone)} · peaks{" "}
                                    {Math.round(p.max_altitude)}°{" "}
                                    {compassDirection(p.culminate_azimuth)} ·{" "}
                                    {durationMinutes(p.appear_time, p.fade_time)} min
                                </span>
                            </div>
                        ))
                    )}

                    <div className="sat-card-footer">
                        <span className="message">NORAD {satellite.norad_id}</span>
                        <button
                            type="button"
                            className="unfollow-button"
                            onClick={onUnfollow}
                            disabled={busy}
                        >
                            {busy ? "Unfollowing…" : "Unfollow"}
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
}

export default SatelliteCard;