import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiDelete, apiGet, apiPut } from "./api";
import type { PassesResponse, SatelliteListResponse } from "./types";
import { plural } from "./format";
import SatelliteCard from "./SatelliteCard";
import AddSatellites from "./AddSatellites";
import "./Satellites.css";

function Satellites() {
    const [passes, setPasses] = useState<PassesResponse | null>(null);
    const [satellites, setSatellites] = useState<SatelliteListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Which satellite has a request running right now (null = none).
    // Its button is disabled, so a double-click can't send two requests.
    const [busyId, setBusyId] = useState<number | null>(null);

    // Bumping this number makes the useEffect below run again (refetch).
    const [reloadKey, setReloadKey] = useState(0);

    // true = show the Add panel instead of the list
    const [showAdd, setShowAdd] = useState(false);

    // Runs on the first draw AND again whenever reloadKey changes.
    useEffect(() => {
        Promise.all([
            apiGet<PassesResponse>("/api/passes"),
            apiGet<SatelliteListResponse>("/api/satellites"),
        ])
            .then(([passesData, satellitesData]) => {
                setPasses(passesData);
                setSatellites(satellitesData);
            })
            .catch((err) => setError(String(err)));
    }, [reloadKey]);

    // Follow (true) or unfollow (false), then refetch so the screen
    // shows what the server actually saved.
    async function setFollow(satelliteId: number, follow: boolean) {
        setBusyId(satelliteId);
        try {
            if (follow) {
                await apiPut(`/api/satellites/${satelliteId}/follow`);
            } else {
                await apiDelete(`/api/satellites/${satelliteId}/follow`);
            }
            setReloadKey((key) => key + 1);
        } catch (err) {
            setError(String(err));
        } finally {
            // Runs whether it worked or failed: re-enable the buttons.
            setBusyId(null);
        }
    }

    if (error) {
        return (
            <main className="page">
                <p className="message">Something went wrong: {error}</p>
            </main>
        );
    }

    if (passes === null || satellites === null) {
        return (
            <main className="page">
                <p className="message">Loading satellites…</p>
            </main>
        );
    }

    const tz = passes.location.timezone;
    const followed = satellites.satellites.filter((s) => s.is_followed);
    const allPasses = passes.days.flatMap((day) => day.passes);

    // The Add panel replaces the list while it's open.
    if (showAdd) {
        return (
            <main className="page">
                <AddSatellites
                    satellites={satellites.satellites}
                    busyId={busyId}
                    // Ticked -> unfollow, unticked -> follow
                    onToggle={(s) => setFollow(s.id, !s.is_followed)}
                    onClose={() => setShowAdd(false)}
                />
            </main>
        );
    }

    return (
        <main className="page">
            <Link to="/" className="back-link">
                ← Your week
            </Link>

            <div className="page-header">
                <div>
                    <h1 className="page-title">Followed satellites</h1>
                    <p className="location-meta">
                        {plural(followed.length, "satellite")} · passes shown for{" "}
                        {passes.location.nickname}
                    </p>
                </div>
                <button type="button" className="add-button" onClick={() => setShowAdd(true)}>
                    + Add
                </button>
            </div>

            <div className="section-heading list-heading">
                <span className="section-title">Your list</span>
                <span>{plural(allPasses.length, "pass")} in the next 7 days</span>
            </div>

            {followed.length === 0 ? (
                <p className="message">You're not following any satellites yet.</p>
            ) : (
                followed.map((s) => (
                    <SatelliteCard
                        key={s.id}
                        satellite={s}
                        // Just this satellite's passes
                        passes={allPasses.filter((p) => p.satellite.id === s.id)}
                        timeZone={tz}
                        busy={busyId === s.id}
                        onUnfollow={() => setFollow(s.id, false)}
                    />
                ))
            )}

            <p className="message note">
                Tap a satellite to see every pass it makes this week. Times are local to
                the place you're watching from.
            </p>
        </main>
    );
}

export default Satellites;