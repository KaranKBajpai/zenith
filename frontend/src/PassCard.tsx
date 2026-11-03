import type { Pass } from "./types";
import {
    compassDirection,
    durationMinutes,
    formatTime,
    qualityLabel,
    timeZoneAbbreviation,
} from "./format";

// Props = the inputs this component receives, like a function's arguments.
type PassCardProps = {
    pass: Pass;
    timeZone: string; // the location's timezone, not the device's
};

function PassCard({ pass, timeZone }: PassCardProps) {
    const quality = qualityLabel(pass.magnitude);

    // Where to look when it appears, and the highest point you'll see it.
    const appearsFrom = compassDirection(pass.appear_azimuth);
    const peakHeight = Math.round(pass.max_altitude);
    const peakDirection = compassDirection(pass.culminate_azimuth);

    const zone = timeZoneAbbreviation(timeZone, new Date(pass.appear_time));
    const minutes = durationMinutes(pass.appear_time, pass.fade_time);

    return (
        <article className="pass-card">
            <div>
                <div className="pass-title">
                    <span className="pass-name">{pass.satellite.name}</span>
                    <span className="pass-tag">Satellite</span>
                </div>
                <div className="pass-details">
                    {/* Only shown if there's a label (no magnitude = no label) */}
                    {quality && (
                        <span className={`quality-${quality.toLowerCase()}`}>{quality} · </span>
                    )}
                    appears {appearsFrom}, peaks {peakHeight}° {peakDirection}
                </div>
            </div>
            <div className="pass-time">
                <div className="pass-clock">{formatTime(pass.appear_time, timeZone)}</div>
                <div className="pass-meta">
                    {zone} · {minutes} min
                </div>
            </div>
        </article>
    );
}

export default PassCard;