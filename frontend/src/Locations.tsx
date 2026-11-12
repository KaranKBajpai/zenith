import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { apiGet, apiPut } from "./api";
import type { LocationListResponse } from "./types";
import { formatCoordinates, plural } from "./format"; 
import "./Locations.css"

function Locations() {
    const [data, setData] = useState<LocationListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Which place is being switched to (null = none). Disables the rows.
    const [busyId, setBusyId] = useState<number | null>(null);

    // Navigate("/") = go to Home, the code version of clicking a link
    const navigate = useNavigate();

    // Runs once when the page appears
    useEffect(() => {
        apiGet<LocationListResponse>("/api/locations")
        .then(setData)
        .catch((err) => setError(String(err)));
    }, []);

    // Make a place active, then go back to the week view
    async function switchTo(locationId: number) {
        setBusyId(locationId);
        try {
            await apiPut(`/api/locations/${locationId}/active`);
            navigate("/");
        } catch (err) {
            setError(String(err));
            setBusyId(null); // only needed on failure: on success we've left the page
        }
    }

    if (error) {
        return (
            <main className="page">
                <p className="message">Something went wrong: {error}</p>
            </main>
        );
    }

    if (data === null) {
        return (
            <main className="page">
                <p className="message">Loading places...</p>
            </main>
        )
    }

    const locations = data.locations;
    const active = locations.find((location) => location.is_active);

    return (
        <main className="page">
            <Link to="/" className="back-link">
                ← Your week
            </Link>

            <h1 className="page-title">Saved locations</h1>
            <p className="location-meta">
                {plural(locations.length, "place")}
                {active && ` · watching from ${active.nickname}`}
            </p>

            <div className="section-heading list-heading">
                <span className="section-title">Watching from</span>
                <span>Tap a place to switch</span>
            </div>

            {locations.map((location) => (
                <button
                    key={location.id}
                    type="button"
                    className={location.is_active ? "place-row active" : "place-row"}
                    // Already active? Just go back. Otherwise switch first.
                    onClick={() =>
                        location.is_active ? navigate("/") : switchTo(location.id)
                    }
                    disabled={busyId !== null}
                >
                    <span className="place-check">{location.is_active ? "✓" : ""}</span>

                    <span className="place-info">
                        <span className="place-title">
                            <span className="place-name">{location.nickname}</span>
                            {location.is_active && (
                                <span className="pass-tag">Watching from here</span>
                            )}
                        </span>

                        {/* ?? = use place_name, unless it's empty, then the coordinates */}
                        <span className="place-sub">
                            {location.place_name ??
                                formatCoordinates(location.latitude, location.longitude)}
                        </span>

                        <span className="place-sub">
                            {busyId === location.id
                                ? "Switching…"
                                : `${plural(location.passes_this_week, "pass")} this week`}
                        </span>
                    </span>
                </button>
            ))}

            <p className="message note">
                Switching places changes your whole week. Times are always local to the
                place you're watching from.
            </p>
        </main>
    );
}

export default Locations;
