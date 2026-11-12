import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { apiDelete, apiGet, apiPatch, apiPut, errorText } from "./api";
import type { Location, LocationListResponse } from "./types";
import { formatCoordinates, plural } from "./format";
import PlaceEditPanel from "./PlaceEditPanel";
import AddPlacePanel from "./AddPlacePanel";
import "./Locations.css";

function Locations() {
    const [data, setData] = useState<LocationListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    // Which place's pencil panel is open. null = none. One at a time.
    const [editingId, setEditingId] = useState<number | null>(null);
    // Error from a failed rename/remove, shown inside the panel
    // instead of replacing the whole page.
    const [editError, setEditError] = useState<string | null>(null);
    // Bumping this number reruns the effect below, which refetches the list.
    const [reloadKey, setReloadKey] = useState(0);
    const [adding, setAdding] = useState(false);
    const navigate = useNavigate();

    // Runs after the first draw, and again every time reloadKey changes.
    useEffect(() => {
        apiGet<LocationListResponse>("/api/locations")
            .then(setData)
            .catch((err) => setError(errorText(err)));
    }, [reloadKey]);

    async function switchTo(locationId: number) {
        setBusyId(locationId);
        try {
            await apiPut(`/api/locations/${locationId}/active`);
            // Success: we leave the page, so no need to reset busyId.
            navigate("/");
        } catch (err) {
            setError(errorText(err));
            setBusyId(null);
        }
    }

    // Open a place's panel (or close it if it's already open).
    function toggleEditing(locationId: number) {
        setEditingId(editingId === locationId ? null : locationId);
        setEditError(null);
    }

    function stopEditing() {
        setEditingId(null);
        setEditError(null);
    }

    async function rename(locationId: number, nickname: string) {
        setBusyId(locationId);
        setEditError(null);
        try {
            // Sends {"nickname": "..."}, which FastAPI reads as LocationUpdate.
            await apiPatch<Location>(`/api/locations/${locationId}`, { nickname });
            setEditingId(null);
            // (k) => k + 1 means "one more than whatever it is now".
            setReloadKey((k) => k + 1);
        } catch (err) {
            // Panel stays open so the user can fix it and try again.
            setEditError(errorText(err));
        } finally {
            // finally runs after try OR catch. We stay on this page either
            // way, so the buttons always need unlocking.
            setBusyId(null);
        }
    }

    async function remove(locationId: number) {
        setBusyId(locationId);
        setEditError(null);
        try {
            await apiDelete(`/api/locations/${locationId}`);
            setEditingId(null);
            // If this was the active place, the backend already picked
            // a new one. The refetch shows which.
            setReloadKey((k) => k + 1);
        } catch (err) {
            setEditError(errorText(err));
        } finally {
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
                // One wrapper per place: the row line, plus its panel when open.
                <div key={location.id} className="place-item">
                    {/* A button can't hold another button, so the row and the
                        pencil sit side by side in this wrapper. */}
                    <div className="place-line">
                        <button
                            className={location.is_active ? "place-row active" : "place-row"}
                            onClick={() =>
                                location.is_active ? navigate("/") : switchTo(location.id)
                            }
                            disabled={busyId !== null}
                        >
                            <span className="place-check">{location.is_active && "✓"}</span>
                            <span className="place-info">
                                <span className="place-title">
                                    <span className="place-name">{location.nickname}</span>
                                    {location.is_active && (
                                        <span className="pass-tag">Watching from here</span>
                                    )}
                                </span>
                                <span className="place-sub">
                                    {location.place_name ??
                                        formatCoordinates(location.latitude, location.longitude)}
                                </span>
                                <span className="place-sub">
                                    {busyId === location.id && editingId === null
                                        ? "Switching…"
                                        : `${plural(location.passes_this_week, "pass")} this week`}
                                </span>
                            </span>
                        </button>

                        <button
                            className="place-edit"
                            // Screen readers read this, since ✎ alone means nothing.
                            aria-label={`Edit ${location.nickname}`}
                            onClick={() => toggleEditing(location.id)}
                            disabled={busyId !== null}
                        >
                            ✎
                        </button>
                    </div>

                    {editingId === location.id && (
                        <PlaceEditPanel
                            location={location}
                            canRemove={locations.length > 1}
                            busy={busyId === location.id}
                            error={editError}
                            onSave={(nickname) => rename(location.id, nickname)}
                            onRemove={() => remove(location.id)}
                            onCancel={stopEditing}
                        />
                    )}
                </div>
            ))}

            {adding ? (
                <AddPlacePanel
                    onAdded={() => {
                        setAdding(false);
                        // Refetch so the new place shows up in the list.
                        setReloadKey((k) => k + 1);
                    }}
                    onCancel={() => setAdding(false)}
                />
            ) : (
                <button
                    className="add-place"
                    onClick={() => {
                        setAdding(true);
                        stopEditing(); // close any open pencil panel
                    }}
                    disabled={busyId !== null}
                >
                    + Add a place
                </button>
            )}
            
            <p className="message note">
                Switching places changes your whole week. Times are always local to the
                place you're watching from.
            </p>
        </main>
    );
}

export default Locations;
